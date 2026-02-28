"use client"
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import {
  Truck, Settings, MapPin, Search,
  Activity, AlertTriangle, Gauge, LogOut,
  ChevronDown, Info, ClipboardList, X, Check, Save, Calendar, Eye, Clock, Wrench, ShieldCheck,
  Database, PackageSearch, BarChart3, Construction
} from 'lucide-react'

// ✅ FUNCIÓN PARA OBTENER FECHA LOCAL REAL (Evita que salga 28/02 si es 27/02)
const obtenerFechaHoyLocal = () => {
  const ahora = new Date();
  const anio = ahora.getFullYear();
  const mes = String(ahora.getMonth() + 1).padStart(2, '0');
  const dia = String(ahora.getDate()).padStart(2, '0');
  return `${anio}-${mes}-${dia}`;
};

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
    fecha: obtenerFechaHoyLocal() // ✅ Corregido para usar fecha local real
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
      fecha: obtenerFechaHoyLocal() // ✅ Corregido aquí también
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

  // --- ✅ LÓGICA DE BÚSQUEDA ROBUSTA (Normalización de caracteres corregida) ---
  const filtrados = equipos.filter(e => {
    const q = busqueda.toLowerCase().trim()

    // Función que elimina guiones, espacios y puntos para comparar
    const normalizar = (texto: string) => texto.replace(/[\s\.\-]/g, '').toLowerCase()

    const queryNormalizada = normalizar(q)
    const placaNormalizada = normalizar(e.placaRodaje || "")
    const codigoNormalizado = normalizar(e.codigoEquipo || "")

    return (
      placaNormalizada.includes(queryNormalizada) ||
      codigoNormalizado.includes(queryNormalizada) ||
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
    <main className="min-h-screen bg-[#F8FAFC] p-4 md:p-8 font-sans text-slate-900">
      <div className="max-w-[1600px] mx-auto space-y-6">

        {/* --- HEADER --- */}
        <header className="flex flex-col xl:flex-row justify-between items-center gap-6 bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-100">
          <div className="flex items-center gap-5">
            <div className="bg-blue-600 p-5 rounded-3xl text-white shadow-xl shadow-blue-100/50 flex-shrink-0">
              <Truck size={28} />
            </div>
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-3xl font-black text-slate-800 tracking-tight">Maestro de Equipos</h1>
                <button onClick={handleLogout} className="p-2 text-slate-300 hover:text-rose-500 transition-colors">
                  <LogOut size={20} />
                </button>
              </div>
              <p className="text-sm font-bold text-slate-400 uppercase tracking-wider">Gestión Centralizada de Flota</p>
            </div>
          </div>

          <div className="flex flex-col gap-4 w-full xl:w-auto">
            <div className="flex flex-wrap items-center gap-2 justify-center xl:justify-end">
              <NavButton onClick={() => router.push('/bdrepuestos')} color="indigo" icon={<Database size={16} />}>BD Repuestos</NavButton>
              <NavButton onClick={() => router.push('/repuestos')} color="orange" icon={<PackageSearch size={16} />}>Gestión Almacén</NavButton>
              <NavButton onClick={() => router.push('/estatus')} color="emerald" icon={<ShieldCheck size={16} />}>Estatus</NavButton>
              <NavButton onClick={() => router.push('/rendimiento')} color="blue" icon={<BarChart3 size={16} />}>Rendimiento</NavButton>
              <NavButton onClick={() => router.push('/historial-horometro')} color="slate" icon={<ClipboardList size={16} />}>Historial</NavButton>
            </div>

            <div className="relative w-full xl:max-w-md ml-auto">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input
                onChange={(e) => setBusqueda(e.target.value)}
                placeholder="BUSCAR PLACA (CAB-705 o CAB 705)..."
                className="w-full pl-12 pr-6 py-4 bg-slate-50 border-2 border-transparent focus:border-blue-500 rounded-2xl text-[10px] font-black uppercase tracking-widest outline-none transition-all shadow-inner"
              />
            </div>
          </div>
        </header>

        {/* --- GRID DE EQUIPOS --- */}
        <div className="grid grid-cols-1 md:grid-cols-2 2xl:grid-cols-3 gap-6 items-start">
          {filtrados.map((equipo) => {
            const isExpanded = abierto === equipo.placaRodaje;
            const isCritical = (equipo.disponibilidad ?? 100) < 85;
            const isOperativo = equipo.status?.toLowerCase() === 'operativo';

            return (
              <div key={equipo.placaRodaje} className={`bg-white rounded-[2.5rem] overflow-hidden border transition-all duration-300 ${isExpanded ? 'shadow-2xl border-blue-200 ring-4 ring-blue-50' : 'shadow-sm border-slate-100 hover:border-blue-200'}`}>
                <div className="p-8">
                  <div className="flex justify-between items-start mb-6">
                    <div className="space-y-1">
                      <span className="text-[10px] font-black text-blue-600 uppercase tracking-[0.2em] bg-blue-50 px-3 py-1 rounded-lg">
                        {equipo.codigoEquipo || 'SIN COD'}
                      </span>
                      <h2 className="text-2xl font-black text-slate-800 font-mono tracking-tighter uppercase">{equipo.placaRodaje}</h2>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={(e) => abrirModal(e, equipo)} className="p-3 bg-slate-50 text-slate-400 rounded-2xl hover:bg-blue-600 hover:text-white transition-all">
                        <Gauge size={22} />
                      </button>
                      <button onClick={() => toggleAcordeon(equipo.placaRodaje)} className={`p-3 rounded-2xl transition-all ${isExpanded ? 'bg-blue-600 text-white rotate-180 shadow-lg' : 'bg-slate-50 text-slate-400 hover:bg-slate-100'}`}>
                        <ChevronDown size={22} />
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-slate-50/80 p-5 rounded-[2rem] border border-slate-100">
                      <div className="flex items-center gap-2 mb-2 text-slate-400">
                        <Activity size={14} />
                        <span className="text-[9px] font-black uppercase tracking-widest">Horómetro</span>
                      </div>
                      <p className="text-xl font-black text-slate-700 font-mono">
                        {equipo.horometroMayor || 0} <span className="text-xs text-blue-500 font-bold ml-1">h</span>
                      </p>
                      <p className="text-[9px] font-bold text-slate-400 mt-1 uppercase italic">{equipo.ultima_fecha}</p>
                    </div>

                    <div className={`p-5 rounded-[2rem] border ${isCritical ? 'bg-rose-50 border-rose-100' : 'bg-emerald-50 border-emerald-100'}`}>
                      <div className="flex items-center gap-2 mb-2 text-slate-400">
                        <ShieldCheck size={14} />
                        <span className="text-[9px] font-black uppercase tracking-widest">Disponibilidad</span>
                      </div>
                      <p className={`text-xl font-black ${isCritical ? 'text-rose-600' : 'text-emerald-600'}`}>
                        {equipo.disponibilidad?.toFixed(1)}%
                      </p>
                      <div className="flex items-center gap-1.5 mt-1">
                        <div className={`w-1.5 h-1.5 rounded-full ${isOperativo ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'}`} />
                        <span className="text-[9px] font-black uppercase text-slate-500">{equipo.status}</span>
                      </div>
                    </div>
                  </div>

                  <div className={`transition-all duration-500 ease-in-out ${isExpanded ? 'max-h-[1000px] opacity-100 mt-6' : 'max-h-0 opacity-0 overflow-hidden'}`}>
                    <div className="pt-6 border-t border-dashed border-slate-200 space-y-6">
                      <div className="grid grid-cols-2 gap-3">
                        <MetricBox label="TPEF (Horas/Falla)" value={equipo.tpef?.toFixed(1) || '0'} icon={<Clock size={14} />} color="blue" />
                        <MetricBox label="TPPR (Horas/Mant)" value={equipo.tppr?.toFixed(1) || '0'} icon={<Wrench size={14} />} color="amber" />
                      </div>

                      <div className="grid grid-cols-2 gap-y-5 text-[11px] bg-slate-50/50 p-6 rounded-[2rem]">
                        <DataField label="Modelo" value={`${equipo.marca} — ${equipo.modelo}`} />
                        <DataField label="Año / Capacidad" value={`${equipo.year} — ${equipo.cap}`} />
                        <DataField label="Serie Motor" value={equipo.serieMotor || '---'} mono />
                        <DataField label="Propietario" value={equipo.propietario} />
                        <div className="col-span-2">
                          <DataField label="Proyecto / Ubicación" value={`${equipo.proyecto} — ${equipo.ubic}`} icon={<MapPin size={12} className="text-blue-500" />} />
                        </div>
                      </div>

                      {equipo.obs && (
                        <div className="bg-amber-50 p-5 rounded-3xl border border-amber-100">
                          <div className="flex items-center gap-2 mb-2 text-amber-600">
                            <ClipboardList size={14} />
                            <span className="text-[10px] font-black uppercase tracking-widest">Observaciones</span>
                          </div>
                          <p className="text-xs text-amber-800 italic leading-relaxed font-medium">"{equipo.obs}"</p>
                        </div>
                      )}

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
                        className="w-full py-4 rounded-2xl font-black text-xs uppercase tracking-[0.2em] bg-slate-900 text-white hover:bg-blue-600 transition-all shadow-xl shadow-slate-200 flex items-center justify-center gap-3 active:scale-95"
                      >
                        <Construction size={16} /> Registrar Intervención
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* --- MODAL --- */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-md bg-slate-900/40">
          <div className="relative bg-white w-full max-w-sm rounded-[3rem] shadow-2xl border border-slate-100 p-10 animate-in zoom-in-95 duration-200">
            <button onClick={() => setShowModal(false)} className="absolute right-8 top-8 text-slate-300 hover:text-slate-600 transition-colors">
              <X size={24} />
            </button>
            <div className="text-center mb-10">
              <div className="w-20 h-20 bg-blue-50 text-blue-600 rounded-[2rem] flex items-center justify-center mx-auto mb-5 shadow-inner">
                <Gauge size={38} />
              </div>
              <h3 className="text-3xl font-black text-slate-800 uppercase font-mono tracking-tighter">{equipoSel?.placaRodaje}</h3>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-2">Sincronización de Lectura</p>
            </div>
            <div className="space-y-8">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4">Fecha de Lectura</label>
                <input type="date" value={form.fecha} onChange={(e) => setForm({ ...form, fecha: e.target.value })} className="w-full p-5 bg-slate-50 border-none rounded-2xl font-black text-slate-700 outline-none focus:ring-4 ring-blue-50 transition-all text-center" />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-3">
                  <label className="text-[10px] font-black text-slate-300 uppercase tracking-widest text-center block">Anterior</label>
                  <div className="p-5 bg-slate-50 rounded-2xl font-black text-slate-400 font-mono text-center text-lg">{form.inicio}</div>
                </div>
                <div className="space-y-3">
                  <label className="text-[10px] font-black text-blue-600 uppercase tracking-widest text-center block">Nueva Lectura</label>
                  <input type="number" step="0.1" value={form.final} onChange={(e) => setForm({ ...form, final: e.target.value })} className="w-full p-5 bg-blue-50 border-none rounded-2xl text-center font-black text-blue-700 outline-none focus:ring-4 ring-blue-100 transition-all font-mono text-lg" placeholder="0.0" />
                </div>
              </div>

              <button onClick={guardarLectura} disabled={enviando} className="w-full bg-slate-900 text-white py-6 rounded-2xl font-black uppercase text-xs tracking-widest shadow-2xl shadow-slate-200 flex items-center justify-center gap-3 transition-all hover:bg-blue-600 active:scale-95 disabled:opacity-50">
                {enviando ? <Activity className="animate-spin" size={20} /> : <><Save size={20} /> Sincronizar Horómetro</>}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  )
}

function NavButton({ children, onClick, color, icon }: any) {
  const colors: any = {
    indigo: 'bg-indigo-600 hover:bg-indigo-700 shadow-indigo-100',
    orange: 'bg-orange-500 hover:bg-orange-600 shadow-orange-100',
    emerald: 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-100',
    blue: 'bg-blue-600 hover:bg-blue-700 shadow-blue-100',
    slate: 'bg-slate-800 hover:bg-slate-900 shadow-slate-100',
  }
  return (
    <button onClick={onClick} className={`flex items-center gap-2 px-5 py-3.5 ${colors[color]} text-white rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-lg transition-all active:scale-95 whitespace-nowrap`}>
      {icon} {children}
    </button>
  )
}

function MetricBox({ label, value, icon, color }: any) {
  const base = color === 'blue' ? 'bg-blue-50/50 border-blue-100 text-blue-600' : 'bg-amber-50/50 border-amber-100 text-amber-600';
  return (
    <div className={`p-4 rounded-3xl border ${base}`}>
      <div className="flex items-center gap-2 mb-1 opacity-70">
        {icon} <span className="text-[9px] font-black uppercase tracking-widest">{label}</span>
      </div>
      <p className="text-sm font-black text-slate-700">{value} <span className="text-[8px] font-normal lowercase tracking-tight">h/mant</span></p>
    </div>
  )
}

function DataField({ label, value, mono, icon }: any) {
  return (
    <div className="space-y-1">
      <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{label}</p>
      <div className="flex items-center gap-2">
        {icon}
        <p className={`text-slate-700 font-bold ${mono ? 'font-mono' : ''}`}>{value || '---'}</p>
      </div>
    </div>
  )
}