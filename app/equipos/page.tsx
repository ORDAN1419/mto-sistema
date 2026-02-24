"use client"
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import {
  Truck, Settings, MapPin, Search,
  Activity, AlertTriangle, Gauge, LogOut,
  ChevronDown, Info, ClipboardList, X, Check, Save, Calendar, Eye, Clock, Wrench, ShieldCheck
} from 'lucide-react'

// --- INTERFAZ COMPLETA ---
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

  const [form, setForm] = useState({
    inicio: '',
    final: '',
    fecha: new Date().toISOString().split('T')[0]
  })
  const [enviando, setEnviando] = useState(false)

  useEffect(() => {
    fetchEquipos()
  }, [])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

  const fetchEquipos = async () => {
    try {
      setLoading(true)
      const { data: maestro, error: errM } = await supabase
        .from('maestroEquipos')
        .select('*')
        .order('codigoEquipo')

      if (errM) throw errM

      const { data: reportes, error: errR } = await supabase
        .from('reporte_diario')
        .select('*')

      const procesados = maestro.map((eq: any) => {
        const misReportes = reportes?.filter(r => r.placa_rodaje === eq.placaRodaje) || []

        const horasOp = misReportes.reduce((acc, r) => acc + (Number(r.horometro_final) - Number(r.horometro_inicial)), 0)
        const horasParada = misReportes.reduce((acc, r) => acc + (Number(r.horas_parada) || 0), 0)
        const fallas = misReportes.filter(r => r.tipo_parada === 'Correctivo').length

        const disp = (horasOp + horasParada) > 0 ? (horasOp / (horasOp + horasParada)) * 100 : 100
        const tpef = fallas > 0 ? horasOp / fallas : horasOp
        const tppr = fallas > 0 ? horasParada / fallas : 0

        return {
          ...eq,
          ultima_fecha: eq.ultima_fecha
            ? new Date(eq.ultima_fecha).toLocaleDateString('es-PE')
            : '---',
          disponibilidad: disp,
          tpef: tpef,
          tppr: tppr
        }
      })

      setEquipos(procesados)
    } catch (err) {
      console.error("Error fetching:", err)
    } finally {
      setLoading(false)
    }
  }

  const abrirModal = (e: React.MouseEvent, equipo: Equipo) => {
    e.stopPropagation()
    setEquipoSel(equipo)
    setForm({
      inicio: equipo.horometroMayor?.toString() || '0',
      final: '',
      fecha: new Date().toISOString().split('T')[0]
    })
    setShowModal(true)
  }

  const guardarLectura = async () => {
    const hInicio = Number(form.inicio)
    const hFinal = Number(form.final)

    if (!form.final || hFinal <= hInicio) {
      alert("La nueva lectura debe ser mayor a la anterior")
      return
    }
    setEnviando(true)

    try {
      const ts = new Date().toISOString();

      await supabase.from('horometro').insert([{
        placaRodaje: equipoSel?.placaRodaje,
        horaInicio: hInicio,
        horaFinal: hFinal,
        horasOperacion: hFinal - hInicio,
        horometroMayor: hFinal,
        created_at: ts
      }])

      await supabase.from('reporte_diario').insert([{
        placa_rodaje: equipoSel?.placaRodaje,
        fecha: form.fecha,
        horometro_inicial: hInicio,
        horometro_final: hFinal,
        descripcion: 'Actualización desde Maestro de Equipos'
      }])

      await supabase.from('maestroEquipos')
        .update({
          horometroMayor: hFinal,
          ultima_fecha: ts
        })
        .eq('placaRodaje', equipoSel?.placaRodaje)

      setEquipos(prev => prev.map(eq =>
        eq.placaRodaje === equipoSel?.placaRodaje
          ? {
            ...eq,
            horometroMayor: hFinal,
            ultima_fecha: new Date().toLocaleDateString('es-PE')
          }
          : eq
      ))

      setShowModal(false)
      alert("✅ Horómetro sincronizado")
    } catch (err) {
      console.error(err)
      alert("Error al guardar")
    } finally { setEnviando(false) }
  }

  const toggleAcordeon = (placa: string) => {
    setAbierto(abierto === placa ? null : placa)
  }

  // --- LÓGICA DE BÚSQUEDA COMPLETA (RESTAURADA) ---
  const filtrados = equipos.filter(e => {
    const q = busqueda.toLowerCase()
    return (
      (e.placaRodaje?.toLowerCase() || "").includes(q) ||
      (e.codigoEquipo?.toLowerCase() || "").includes(q) ||
      (e.marca?.toLowerCase() || "").includes(q) ||
      (e.modelo?.toLowerCase() || "").includes(q) ||
      (e.status?.toLowerCase() || "").includes(q) ||
      (e.obs?.toLowerCase() || "").includes(q)
    )
  })

  if (loading) return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[#F8FAFC]">
      <Activity className="animate-spin text-blue-600 mb-4" size={40} />
      <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Sincronizando Flota...</p>
    </div>
  )

  return (
    <main className="min-h-screen bg-[#F8FAFC] p-6 md:p-12 font-sans text-slate-900 relative">
      <div className="max-w-7xl mx-auto space-y-8">

        {/* --- HEADER --- */}
        <header className="flex flex-col xl:flex-row justify-between items-center gap-6 bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-100">
          <div className="flex items-center gap-4">
            <div className="bg-blue-600 p-4 rounded-3xl text-white shadow-lg shadow-blue-100"><Truck size={24} /></div>
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-black text-slate-800 tracking-tight">Maestro de Equipos</h1>
                <button onClick={handleLogout} className="p-2 text-slate-300 hover:text-rose-500 transition-all"><LogOut size={18} /></button>
              </div>
              <p className="text-xs font-medium text-slate-400 italic">Gestión de Flota</p>
            </div>
          </div>

          <div className="flex flex-col md:flex-row items-center gap-3 flex-1 md:justify-end w-full">

            {/* BOTÓN MANTENIMIENTO AÑADIDO */}
            <button
              onClick={() => router.push('/repuestos')}
              className="flex items-center gap-2 px-6 py-3.5 bg-orange-500 text-white rounded-2xl font-bold text-[11px] uppercase tracking-widest hover:bg-orange-600 shadow-lg shadow-orange-100 active:scale-95 whitespace-nowrap"
            >
              <Settings size={18} /> repuestos
            </button>

            <button
              onClick={() => router.push('/estatus')}
              className="flex items-center gap-2 px-6 py-3.5 bg-emerald-600 text-white rounded-2xl font-bold text-[11px] uppercase tracking-widest hover:bg-emerald-700 shadow-lg shadow-emerald-100 active:scale-95 whitespace-nowrap"
            >
              <ShieldCheck size={18} /> Estatus
            </button>
            <button onClick={() => router.push('/rendimiento')} className="flex items-center gap-2 px-6 py-3.5 bg-blue-600 text-white rounded-2xl font-bold text-[11px] uppercase tracking-widest hover:bg-blue-700 shadow-lg shadow-blue-100 active:scale-95 whitespace-nowrap">
              <Activity size={18} /> Rendimiento
            </button>
            <button onClick={() => router.push('/historial-horometro')} className="flex items-center gap-2 px-6 py-3.5 bg-slate-800 text-white rounded-2xl font-bold text-[11px] uppercase tracking-widest hover:bg-slate-700 shadow-md active:scale-95 whitespace-nowrap">
              <ClipboardList size={18} /> Historial
            </button>
            <div className="relative w-full md:w-64">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
              <input
                onChange={(e) => setBusqueda(e.target.value)}
                placeholder="Buscar placa, código, marca..."
                className="w-full pl-12 pr-6 py-3.5 bg-slate-50 border-none rounded-2xl text-sm font-medium focus:ring-2 focus:ring-blue-500 outline-none transition-all shadow-inner italic"
              />
            </div>
          </div>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 items-start">
          {filtrados.map((equipo) => {
            const isExpanded = abierto === equipo.placaRodaje;
            return (
              <div key={equipo.placaRodaje} className={`bg-white rounded-[2.5rem] p-8 border transition-all duration-300 ease-in-out h-fit group ${isExpanded ? 'shadow-xl border-blue-100 scale-[1.02]' : 'shadow-sm border-slate-100'}`}>
                <div className="flex justify-between items-start mb-6">
                  <div className="space-y-1">
                    <span className="text-[10px] font-bold text-blue-600 uppercase tracking-widest bg-blue-50 px-3 py-1 rounded-full">{equipo.codigoEquipo || 'SIN COD'}</span>
                    <h2 className="text-xl font-black text-slate-800 font-mono uppercase tracking-tighter">{equipo.placaRodaje}</h2>
                    <p className="text-[11px] font-bold text-slate-400 italic">{equipo.descripcionEquipo}</p>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={(e) => abrirModal(e, equipo)} className="p-2.5 bg-blue-50 text-blue-600 rounded-2xl hover:bg-blue-600 hover:text-white transition-all shadow-sm"><Gauge size={20} /></button>
                    <button onClick={() => toggleAcordeon(equipo.placaRodaje)} className={`p-2 rounded-2xl transition-all ${isExpanded ? 'bg-blue-600 text-white rotate-180' : 'bg-slate-50 text-slate-400 hover:text-blue-600'}`}><ChevronDown size={20} /></button>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div className="bg-slate-50/80 p-4 rounded-3xl border border-blue-50 flex flex-col justify-between">
                    <div>
                      <p className="text-[9px] font-bold text-slate-400 uppercase italic leading-none mb-1">Horómetro Act.</p>
                      <p className="text-base font-black text-slate-700 font-mono">{equipo.horometroMayor || 0} <span className="text-[10px] text-blue-400 italic">HRS</span></p>
                    </div>
                    <div className="mt-2 pt-2 border-t border-slate-200/60 flex items-center gap-1.5">
                      <Calendar size={10} className="text-blue-500" />
                      <div className="flex flex-col">
                        <span className="text-[8px] font-bold text-slate-400 uppercase leading-none">Actualizado:</span>
                        <span className="text-[9px] font-black text-slate-600 font-mono">{equipo.ultima_fecha}</span>
                      </div>
                    </div>
                  </div>
                  <div className="bg-slate-50/50 p-4 rounded-3xl">
                    <p className="text-[9px] font-bold text-slate-400 uppercase italic mb-1">Disponibilidad</p>
                    <p className={`text-lg font-black ${equipo.disponibilidad! < 85 ? 'text-rose-600' : 'text-emerald-600'}`}>{equipo.disponibilidad?.toFixed(1)}%</p>
                    <div className="flex items-center gap-1.5 mt-1">
                      <div className={`w-1.5 h-1.5 rounded-full ${equipo.status?.toLowerCase() === 'operativo' ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                      <p className="text-[8px] font-black uppercase text-slate-500">{equipo.status}</p>
                    </div>
                  </div>
                </div>

                <div className={`overflow-hidden transition-all duration-500 ease-in-out ${isExpanded ? 'max-h-[1200px] opacity-100 mt-6' : 'max-h-0 opacity-0'}`}>
                  <div className="pt-6 border-t border-dashed border-slate-100 space-y-6">
                    <div className="grid grid-cols-2 gap-3">
                      <div className="bg-blue-50/50 p-4 rounded-3xl border border-blue-100">
                        <div className="flex items-center gap-2 mb-1 text-blue-600"><Clock size={14} /><span className="text-[9px] font-bold uppercase">TPEF</span></div>
                        <p className="text-sm font-black text-slate-700">{equipo.tpef?.toFixed(1)} <span className="text-[8px] font-normal">h/falla</span></p>
                      </div>
                      <div className="bg-amber-50/50 p-4 rounded-3xl border border-amber-100">
                        <div className="flex items-center gap-2 mb-1 text-amber-600"><Wrench size={14} /><span className="text-[9px] font-bold uppercase">TPPR</span></div>
                        <p className="text-sm font-black text-slate-700">{equipo.tppr?.toFixed(1)} <span className="text-[8px] font-normal">h/rep</span></p>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-y-4 text-[11px]">
                      <div><p className="font-bold text-slate-400 uppercase">Marca / Modelo</p><p className="font-semibold text-slate-700">{equipo.marca} - {equipo.modelo}</p></div>
                      <div><p className="font-bold text-slate-400 uppercase">Año / Capacidad</p><p className="font-semibold text-slate-700">{equipo.year} / {equipo.cap}</p></div>
                      <div><p className="font-bold text-slate-400 uppercase">Serie Motor</p><p className="font-semibold text-slate-700 font-mono">{equipo.serieMotor || '---'}</p></div>
                      <div><p className="font-bold text-slate-400 uppercase">Propietario</p><p className="font-semibold text-slate-700">{equipo.propietario}</p></div>
                    </div>
                    <div className="bg-slate-50 p-4 rounded-3xl space-y-3">
                      <div className="flex items-start gap-3 text-slate-500">
                        <MapPin size={16} className="text-blue-500 mt-0.5" />
                        <div><p className="text-[10px] font-bold text-slate-400 uppercase">Ubicación Actual</p><p className="text-xs font-medium">{equipo.ubic} — {equipo.proyecto}</p></div>
                      </div>
                      {equipo.obs && (
                        <div className="flex items-start gap-3 text-slate-500 border-t border-slate-200 pt-3">
                          <ClipboardList size={16} className="text-amber-500 mt-0.5" />
                          <div><p className="text-[10px] font-bold text-slate-400 uppercase">Observaciones</p><p className="text-xs italic">{equipo.obs}</p></div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <button onClick={() => {
                  const params = new URLSearchParams({
                    placa: equipo.placaRodaje,
                    codigo: equipo.codigoEquipo || '',
                    desc: equipo.descripcionEquipo || '',
                    ubic: equipo.ubic || '',
                    horo: (equipo.horometroMayor || 0).toString(),
                    openModal: 'true'
                  });
                  router.push(`/eventos?${params.toString()}`);
                }}
                  className="w-full mt-6 py-4 rounded-3xl font-bold text-xs uppercase tracking-widest bg-slate-900 text-white hover:bg-blue-600 transition-all flex items-center justify-center gap-2 shadow-lg shadow-slate-200"
                >
                  <Wrench size={14} /> Registrar Evento Técnico
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {/* --- MODAL --- */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-white/70 backdrop-blur-md" onClick={() => setShowModal(false)} />
          <div className="relative bg-white w-full max-w-sm rounded-[3rem] shadow-2xl border border-slate-100 p-10">
            <button onClick={() => setShowModal(false)} className="absolute right-8 top-8 text-slate-300 hover:text-slate-600"><X size={24} /></button>
            <div className="text-center mb-8">
              <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-3xl flex items-center justify-center mx-auto mb-4"><Gauge size={32} /></div>
              <h3 className="text-2xl font-black text-slate-800 uppercase font-mono">{equipoSel?.placaRodaje}</h3>
              <p className="text-[10px] font-bold text-slate-400 uppercase mt-1">Actualizar Lectura</p>
            </div>
            <div className="space-y-6">
              <input type="date" value={form.fecha} onChange={(e) => setForm({ ...form, fecha: e.target.value })} className="w-full p-4 bg-slate-50 border-none rounded-2xl text-sm font-bold text-slate-700 outline-none focus:ring-2 focus:ring-blue-500 transition-all" />
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2 text-center">
                  <label className="text-[10px] font-bold text-slate-400 uppercase italic">Anterior</label>
                  <div className="p-4 bg-slate-50 rounded-2xl font-bold text-slate-400 font-mono">{form.inicio}</div>
                </div>
                <div className="space-y-2 text-center">
                  <label className="text-[10px] font-bold text-blue-600 uppercase italic">Nueva</label>
                  <input type="number" step="0.1" value={form.final} onChange={(e) => setForm({ ...form, final: e.target.value })} className="w-full p-4 bg-blue-50 border-none rounded-2xl text-center font-bold text-blue-700 outline-none focus:ring-2 focus:ring-blue-500 transition-all font-mono" />
                </div>
              </div>
              <button onClick={guardarLectura} disabled={enviando} className="w-full bg-blue-600 text-white py-5 rounded-2xl font-black uppercase text-[11px] shadow-xl flex items-center justify-center gap-2">
                {enviando ? <Activity className="animate-spin" size={18} /> : <><Save size={18} /> Guardar Registro</>}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  )
}