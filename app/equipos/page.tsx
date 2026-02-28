"use client"
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import {
  Truck, Settings, MapPin, Search,
  Activity, Gauge, LogOut,
  ChevronDown, X, Save, Eye, Clock, Wrench, ShieldCheck,
  Database, PackageSearch, BarChart3, ClipboardList, Construction, RefreshCw, Calendar
} from 'lucide-react'

const obtenerFechaHoyLocal = () => {
  const ahora = new Date();
  const anio = ahora.getFullYear();
  const mes = String(ahora.getMonth() + 1).padStart(2, '0');
  const dia = String(ahora.getDate()).padStart(2, '0');
  return `${anio}-${mes}-${dia}`;
};

interface Equipo {
  codigoEquipo: string;
  placaRodaje: string;
  descripcionEquipo: string;
  marca: string;
  modelo: string;
  serieEquipo: string;
  serieMotor: string;
  potencia: string;
  year: string;
  cap: string;
  propietario: string;
  categoria: string;
  condicion: string;
  proyecto: string;
  ubic: string;
  status: string;
  obs: string;
  horometroMayor?: number;
  ultima_fecha?: string;
  disponibilidad?: number;
  tpef?: number;
  tppr?: number;
}

export default function MaestroEquiposPage() {
  const router = useRouter()
  const [equipos, setEquipos] = useState<Equipo[]>([])
  const [loading, setLoading] = useState(true)
  const [busqueda, setBusqueda] = useState('')
  const [abierto, setAbierto] = useState<string | null>(null)
  const [showModal, setShowModal] = useState(false)
  const [equipoSel, setEquipoSel] = useState<Equipo | null>(null)
  const [form, setForm] = useState({ inicio: '', final: '', fecha: obtenerFechaHoyLocal() })
  const [enviando, setEnviando] = useState(false)

  useEffect(() => { fetchEquipos() }, [])

  const fetchEquipos = async () => {
    try {
      setLoading(true)
      const { data: maestro, error: errM } = await supabase.from('maestroEquipos').select('*').order('codigoEquipo')
      if (errM) throw errM
      const { data: reportes } = await supabase.from('reporte_diario').select('*')

      const procesados = maestro.map((eq: any) => {
        const misReportes = reportes?.filter(r => r.placa_rodaje === eq.placaRodaje) || []
        const horasOp = misReportes.reduce((acc, r) => acc + (Number(r.horometro_final) - Number(r.horometro_inicial)), 0)
        const horasParada = misReportes.reduce((acc, r) => acc + (Number(r.horas_parada) || 0), 0)
        const fallas = misReportes.filter(r => r.tipo_parada === 'Correctivo').length

        return {
          ...eq,
          ultima_fecha: eq.ultima_fecha ? new Date(eq.ultima_fecha).toLocaleDateString('es-PE') : '---',
          disponibilidad: (horasOp + horasParada) > 0 ? (horasOp / (horasOp + horasParada)) * 100 : 100,
          tpef: fallas > 0 ? horasOp / fallas : horasOp,
          tppr: fallas > 0 ? horasParada / fallas : 0
        }
      })
      setEquipos(procesados)
    } catch (err) { console.error(err) } finally { setLoading(false) }
  }

  const abrirModal = (e: React.MouseEvent, equipo: Equipo) => {
    e.stopPropagation()
    setEquipoSel(equipo)
    setForm({ inicio: equipo.horometroMayor?.toString() || '0', final: '', fecha: obtenerFechaHoyLocal() })
    setShowModal(true)
  }

  const guardarLectura = async () => {
    const hInicio = Number(form.inicio);
    const hFinal = Number(form.final);
    if (!form.final || hFinal <= hInicio) { alert("La nueva lectura debe ser mayor a la anterior"); return; }
    setEnviando(true)
    try {
      const ts = new Date().toISOString();
      await supabase.from('horometro').insert([{ placaRodaje: equipoSel?.placaRodaje, horaInicio: hInicio, horaFinal: hFinal, horasOperacion: hFinal - hInicio, horometroMayor: hFinal, created_at: ts }])
      await supabase.from('reporte_diario').insert([{ placa_rodaje: equipoSel?.placaRodaje, fecha: form.fecha, horometro_inicial: hInicio, horometro_final: hFinal, descripcion: 'Actualización SAP Sync' }])
      await supabase.from('maestroEquipos').update({ horometroMayor: hFinal, ultima_fecha: ts }).eq('placaRodaje', equipoSel?.placaRodaje)

      setEquipos(prev => prev.map(eq => eq.placaRodaje === equipoSel?.placaRodaje ? { ...eq, horometroMayor: hFinal, ultima_fecha: new Date().toLocaleDateString('es-PE') } : eq))
      setShowModal(false); alert("✅ Horómetro sincronizado");
    } catch (err) { alert("Error al guardar") } finally { setEnviando(false) }
  }

  const filtrados = equipos.filter(e => {
    const q = busqueda.toLowerCase().trim()
    const normalizar = (texto: string) => texto.replace(/[\s\.\-]/g, '').toLowerCase()
    return normalizar(e.placaRodaje || "").includes(normalizar(q)) || normalizar(e.codigoEquipo || "").includes(normalizar(q)) || (e.marca?.toLowerCase() || "").includes(q)
  })

  if (loading) return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[#f7f9fa]">
      <RefreshCw className="animate-spin text-[#0070b1] mb-4" size={40} />
      <p className="text-sm font-bold text-[#6a6d70] uppercase tracking-tight">Accediendo a SAP Data Services...</p>
    </div>
  )

  return (
    <main className="min-h-screen bg-[#f7f9fa] text-[#32363a] font-sans">

      {/* --- SAP SHELL BAR --- */}
      <nav className="bg-[#354a5f] text-white h-12 flex items-center px-4 justify-between shadow-md sticky top-0 z-50">
        <div className="flex items-center gap-4">
          <div className="bg-[#0070b1] p-1.5 rounded-sm">
            <Truck size={18} className="text-white" />
          </div>
          <span className="font-bold text-sm tracking-tight border-r border-white/20 pr-4 uppercase">Asset Master Data</span>
          <div className="hidden md:flex gap-4 text-xs font-medium opacity-80 uppercase">
            <span className="cursor-pointer hover:opacity-100" onClick={() => router.push('/rendimiento')}>Performance</span>
            <span className="cursor-pointer hover:opacity-100" onClick={() => router.push('/estatus')}>Reports</span>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="relative">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 text-white/50" size={14} />
            <input
              onChange={(e) => setBusqueda(e.target.value)}
              className="bg-white/10 border border-white/20 rounded-sm py-1 pl-8 pr-2 text-xs outline-none focus:bg-white focus:text-slate-900 transition-all w-64"
              placeholder="Search Asset..."
            />
          </div>
          <LogOut size={18} className="cursor-pointer hover:text-rose-400 transition-colors" onClick={() => { supabase.auth.signOut(); router.push('/login'); }} />
        </div>
      </nav>

      {/* --- SAP WORKLIST HEADER --- */}
      <div className="bg-white border-b border-[#d3d7d9] p-6 mb-4">
        <div className="max-w-[1600px] mx-auto flex flex-col md:flex-row justify-between items-end gap-6">
          <div>
            <h1 className="text-2xl font-light text-[#32363a]">Maestro de Equipos</h1>
            <p className="text-[11px] font-bold text-[#6a6d70] uppercase mt-1 tracking-wider">Flota de Maquinaria y Transporte Pesado</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <SapButton onClick={() => router.push('/bdrepuestos')} icon={<Database size={14} />}>Mastro Repuestos</SapButton>
            <SapButton onClick={() => router.push('/repuestos')} icon={<PackageSearch size={14} />}>Almacén</SapButton>
            <SapButton onClick={() => router.push('/historial-horometro')} icon={<ClipboardList size={14} />}>Mantenimiento</SapButton>
          </div>
        </div>
      </div>

      {/* --- ASSET LIST --- */}
      <div className="max-w-[1600px] mx-auto p-4 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-left">
          {filtrados.map((equipo) => {
            const isExpanded = abierto === equipo.placaRodaje;
            const isCritical = (equipo.disponibilidad ?? 100) < 85;

            return (
              <div key={equipo.placaRodaje} className="bg-white border border-[#d3d7d9] shadow-sm rounded-sm hover:border-[#0070b1] transition-all overflow-hidden group">
                {/* Status Bar */}
                <div className={`h-1 w-full ${equipo.status?.toLowerCase() === 'operativo' ? 'bg-emerald-500' : 'bg-rose-500'}`} />

                <div className="p-4">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <span className="text-[10px] font-bold text-[#0070b1] uppercase tracking-tighter">ID: {equipo.codigoEquipo || 'N/A'}</span>
                      <h2 className="text-lg font-bold text-[#32363a] font-mono leading-none">{equipo.placaRodaje}</h2>
                    </div>
                    <div className="flex gap-1">
                      <button onClick={(e) => abrirModal(e, equipo)} className="p-2 text-[#6a6d70] hover:bg-[#eff4f9] hover:text-[#0070b1] rounded-sm transition-all border border-transparent hover:border-[#b0ccf0]">
                        <Gauge size={18} />
                      </button>
                      <button onClick={() => setAbierto(isExpanded ? null : equipo.placaRodaje)} className={`p-2 text-[#6a6d70] hover:bg-[#f2f2f2] rounded-sm transition-all ${isExpanded ? 'rotate-180 bg-[#eff4f9] text-[#0070b1]' : ''}`}>
                        <ChevronDown size={18} />
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 mb-4">
                    <div className="bg-[#f7f9fa] border border-[#d3d7d9] p-3 rounded-sm">
                      <span className="text-[9px] font-bold text-[#6a6d70] uppercase block">Horómetro</span>
                      <span className="text-sm font-bold text-[#32363a] font-mono">{equipo.horometroMayor || 0} h</span>
                    </div>
                    <div className={`border p-3 rounded-sm ${isCritical ? 'bg-rose-50 border-rose-200' : 'bg-emerald-50 border-emerald-200'}`}>
                      <span className={`text-[9px] font-bold uppercase block ${isCritical ? 'text-rose-700' : 'text-emerald-700'}`}>Disponibilidad</span>
                      <span className={`text-sm font-bold font-mono ${isCritical ? 'text-rose-700' : 'text-emerald-700'}`}>{equipo.disponibilidad?.toFixed(1)}%</span>
                    </div>
                  </div>

                  {/* Expanded technical data */}
                  <div className={`transition-all duration-300 overflow-hidden ${isExpanded ? 'max-h-[800px] opacity-100' : 'max-h-0 opacity-0'}`}>
                    <div className="pt-4 border-t border-[#ebeef0] space-y-4">
                      <div className="grid grid-cols-2 gap-3">
                        <TechnicalFacet label="TPEF" value={`${equipo.tpef?.toFixed(1)} h/f`} icon={<Clock size={12} />} />
                        <TechnicalFacet label="TPPR" value={`${equipo.tppr?.toFixed(1)} h/m`} icon={<Wrench size={12} />} />
                      </div>

                      <div className="grid grid-cols-2 gap-y-3 bg-[#f2f4f5] p-4 border border-[#d3d7d9] rounded-sm">
                        <DataField label="Marca/Modelo" value={`${equipo.marca} ${equipo.modelo}`} />
                        <DataField label="Año Fabric." value={equipo.year} />
                        <DataField label="Proyecto" value={equipo.proyecto} icon={<MapPin size={10} className="text-[#0070b1]" />} />
                        <DataField label="Status SAP" value={equipo.status} />
                      </div>

                      <button
                        onClick={() => router.push(`/eventos?placa=${equipo.placaRodaje}&horo=${equipo.horometroMayor}`)}
                        className="w-full py-2 bg-[#0070b1] hover:bg-[#005a8e] text-white text-xs font-bold uppercase rounded-sm shadow-sm transition-all flex items-center justify-center gap-2 active:scale-95"
                      >
                        <Construction size={14} /> Registrar Intervención
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* --- SAP MODAL DIALOG --- */}
      {showModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
          <div className="bg-white w-full max-w-sm rounded-sm shadow-2xl overflow-hidden border border-[#d3d7d9] animate-in zoom-in-95 duration-200">
            <div className="bg-[#354a5f] p-3 flex justify-between items-center text-white">
              <span className="text-xs font-bold uppercase tracking-wider">Sync Horómetro</span>
              <X size={20} className="cursor-pointer hover:opacity-70" onClick={() => setShowModal(false)} />
            </div>

            <div className="p-6 space-y-6">
              <div className="text-center">
                <div className="bg-[#eff4f9] w-12 h-12 rounded-sm border border-[#b0b3b5] flex items-center justify-center mx-auto mb-2">
                  <Gauge size={24} className="text-[#0070b1]" />
                </div>
                <h3 className="text-lg font-bold text-[#32363a] font-mono leading-none">{equipoSel?.placaRodaje}</h3>
              </div>

              <div className="space-y-4">
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-bold text-[#6a6d70] uppercase">Fecha Contabilización</label>
                  <input type="date" value={form.fecha} onChange={(e) => setForm({ ...form, fecha: e.target.value })} className="border border-[#b0b3b5] p-2 text-xs rounded-sm outline-none focus:border-[#0070b1] font-bold" />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-bold text-[#6a6d70] uppercase">Lect. Anterior</label>
                    <div className="bg-[#e9ecef] border border-[#d3d7d9] p-2 text-xs font-mono font-bold text-slate-500 rounded-sm">{form.inicio}</div>
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-bold text-[#0070b1] uppercase">Nueva Lectura</label>
                    <input type="number" step="0.1" value={form.final} onChange={(e) => setForm({ ...form, final: e.target.value })} className="border border-[#0070b1] p-2 text-xs font-mono font-bold rounded-sm outline-none focus:ring-1 focus:ring-[#0070b1]" placeholder="0.0" />
                  </div>
                </div>
              </div>

              <button onClick={guardarLectura} disabled={enviando} className="w-full bg-[#0070b1] hover:bg-[#005a8e] text-white py-2.5 text-xs font-bold uppercase rounded-sm shadow-md transition-all flex items-center justify-center gap-2 disabled:opacity-50">
                {enviando ? <RefreshCw className="animate-spin" size={14} /> : <><Save size={14} /> Post Transaction</>}
              </button>
            </div>

            <div className="bg-[#f2f4f5] p-2 text-center border-t border-[#d3d7d9]">
              <span className="text-[9px] font-bold text-[#6a6d70] uppercase tracking-tighter italic">SAP S/4HANA Public Cloud Engine</span>
            </div>
          </div>
        </div>
      )}
    </main>
  )
}

function SapButton({ children, onClick, icon }: any) {
  return (
    <button onClick={onClick} className="flex items-center gap-2 px-4 py-1.5 border border-[#b0b3b5] text-[#0070b1] bg-white rounded-sm text-[11px] font-bold uppercase hover:bg-[#eff4f9] transition-all active:scale-95 shadow-sm">
      {icon} {children}
    </button>
  )
}

function TechnicalFacet({ label, value, icon }: any) {
  return (
    <div className="flex items-center gap-3 p-2 bg-[#f7f9fa] border border-[#d3d7d9] rounded-sm">
      <div className="text-[#6a6d70]">{icon}</div>
      <div className="text-left">
        <p className="text-[8px] font-bold text-[#6a6d70] uppercase leading-none">{label}</p>
        <p className="text-xs font-bold text-[#32363a] font-mono leading-none mt-1">{value}</p>
      </div>
    </div>
  )
}

function DataField({ label, value, icon }: any) {
  return (
    <div className="text-left">
      <p className="text-[8px] font-bold text-[#6a6d70] uppercase leading-none">{label}</p>
      <div className="flex items-center gap-1.5 mt-1">
        {icon}
        <p className="text-[10px] font-bold text-[#32363a] uppercase truncate">{value || '---'}</p>
      </div>
    </div>
  )
}