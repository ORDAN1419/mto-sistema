"use client"
import { useEffect, useState, useRef } from 'react' // Añadido useRef
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import {
  Truck, Search, Activity, LogOut, ChevronDown, X, Save,
  Clock, Wrench, ShieldCheck, Database, PackageSearch,
  BarChart3, ClipboardList, Construction, RefreshCw,
  LayoutDashboard, AlertCircle, FileWarning, TimerOff, ClipboardCheck,
  CalendarCheck, LayoutGrid, Layers, RotateCw, Gauge // Nuevos iconos para neumáticos
} from 'lucide-react'

export default function MaestroEquiposPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)

  // --- ✅ ESTADO PARA MENÚ DE NEUMÁTICOS ---
  const [showNeumaticosMenu, setShowNeumaticosMenu] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  // --- INDICADORES ORIGINALES ---
  const [pendientesConductor, setPendientesConductor] = useState(0)
  const [preventivosVencidos, setPreventivosVencidos] = useState(0)
  const [totalControlados, setTotalControlados] = useState(0)
  const [porcentajeVencidos, setPorcentajeVencidos] = useState("0")

  // --- ✅ NUEVOS INDICADORES DE CUMPLIMIENTO EJECUTADO ---
  const [prevSemanales, setPrevSemanales] = useState(0)
  const [prevMensuales, setPrevMensuales] = useState(0)

  // Cerrar menú al hacer clic fuera
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowNeumaticosMenu(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // ✅ ATAJO DE TECLADO: CTRL + 1
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.key === '1') {
        e.preventDefault();
        router.push('/historial-horometro');
      }

      if (e.ctrlKey && e.key === '2') { e.preventDefault(); router.push('/rendimiento'); }
      if (e.ctrlKey && e.key === '5') { e.preventDefault(); router.push('/mtto/horometro'); }
      if (e.ctrlKey && e.key === 'm') { e.preventDefault(); router.push('/mtto/consolidado'); }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [router]);

  useEffect(() => {
    fetchIndicadores()
  }, [])

  const fetchIndicadores = async () => {
    try {
      setLoading(true)
      const { count: countPendientes } = await supabase
        .from('reportesConductor')
        .select('*', { count: 'exact', head: true })
        .eq('statusReporte', 'PENDIENTE')

      const { data: flota, error: errV } = await supabase
        .from('maestroEquipos')
        .select('desface')

      const hoy = new Date();
      const haceUnaSemana = new Date();
      haceUnaSemana.setDate(hoy.getDate() - 7);
      const inicioMes = new Date(hoy.getFullYear(), hoy.getMonth(), 1);

      const { count: countSemanal } = await supabase
        .from('historial_eventos')
        .select('*', { count: 'exact', head: true })
        .eq('tipoTrabajo', 'MTTO. PREV')
        .gte('fecha_evento', haceUnaSemana.toISOString().split('T')[0]);

      const { count: countMensual } = await supabase
        .from('historial_eventos')
        .select('*', { count: 'exact', head: true })
        .eq('tipoTrabajo', 'MTTO. PREV')
        .gte('fecha_evento', inicioMes.toISOString().split('T')[0]);

      if (countPendientes !== null) setPendientesConductor(countPendientes)
      if (countSemanal !== null) setPrevSemanales(countSemanal)
      if (countMensual !== null) setPrevMensuales(countMensual)

      if (!errV && flota) {
        const conDesface = flota.filter(eq => eq.desface !== null);
        const vencidos = conDesface.filter(eq => eq.desface < 0).length;
        setTotalControlados(conDesface.length);
        setPreventivosVencidos(vencidos);
        if (conDesface.length > 0) {
          const porc = ((vencidos / conDesface.length) * 100).toFixed(1);
          setPorcentajeVencidos(porc);
        }
      }
    } catch (err) {
      console.error("Error SAP Analytical Engine:", err)
    } finally {
      setLoading(false)
    }
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

  if (loading) return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[#f7f9fa]">
      <RefreshCw className="animate-spin text-[#0070b1] mb-4" size={40} />
      <p className="text-sm font-bold text-[#6a6d70] uppercase tracking-tight leading-none">Cargando Analytical Worklist...</p>
    </div>
  )

  return (
    <main className="min-h-screen bg-[#f7f9fa] text-[#32363a] font-sans text-left leading-none">

      <nav className="bg-[#354a5f] text-white h-12 flex items-center px-4 justify-between shadow-md sticky top-0 z-50">
        <div className="flex items-center gap-4">
          <div className="bg-[#0070b1] p-1.5 rounded-sm">
            <LayoutDashboard size={18} className="text-white" />
          </div>
          <span className="font-bold text-sm tracking-tight border-r border-white/20 pr-4 uppercase leading-none">Control Tower</span>
          <div className="hidden md:flex gap-4 text-xs font-medium opacity-80 uppercase leading-none">
            <span className="cursor-pointer hover:opacity-100" onClick={() => router.push('/rendimiento')}>Rendimiento</span>
            <span className="cursor-pointer hover:opacity-100" onClick={() => router.push('/estatus')}>Reportes</span>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <LogOut size={18} className="cursor-pointer hover:text-rose-400 transition-colors" onClick={handleLogout} />
        </div>
      </nav>

      <div className="bg-white border-b border-[#d3d7d9] p-6 mb-4">
        <div className="max-w-[1600px] mx-auto flex flex-col md:flex-row justify-between items-end gap-6">
          <div className="text-left leading-none">
            <h1 className="text-2xl font-light text-[#32363a]">Consola de Indicadores</h1>
            <p className="text-[11px] font-bold text-[#6a6d70] uppercase mt-2 tracking-wider">Gestión de Activos y Cumplimiento de Mantenimiento</p>
          </div>

          <div className="flex flex-wrap gap-2 relative" ref={menuRef}>
            {/* ✅ BOTÓN DE NEUMÁTICOS CON MENÚ DESPLEGABLE */}
            <div className="relative">
              <button
                onClick={() => setShowNeumaticosMenu(!showNeumaticosMenu)}
                className={`flex items-center gap-2 px-4 py-1.5 border border-[#b0b3b5] rounded-sm text-[10px] font-bold uppercase transition-all shadow-sm leading-none ${showNeumaticosMenu ? 'bg-[#0070b1] text-white' : 'bg-white text-[#0070b1] hover:bg-[#eff4f9]'}`}
              >
                <Layers size={14} /> Neumáticos <ChevronDown size={12} className={`transition-transform ${showNeumaticosMenu ? 'rotate-180' : ''}`} />
              </button>

              {showNeumaticosMenu && (
                <div className="absolute top-full right-0 mt-1 w-56 bg-white border border-[#d3d7d9] shadow-xl rounded-sm z-[100] animate-in fade-in slide-in-from-top-2 duration-200 overflow-hidden">
                  <div className="bg-[#f2f4f5] px-3 py-2 border-b border-[#d3d7d9]">
                    <span className="text-[9px] font-black text-[#6a6d70] uppercase tracking-widest">Gestión de Llantas</span>
                  </div>
                  <div className="flex flex-col">
                    <MenuLink onClick={() => router.push('/neumaticos/heatmap')} icon={<LayoutGrid size={14} />} label="Heatmap de Flota" />
                    <MenuLink onClick={() => router.push('/neumaticos/maestro')} icon={<Database size={14} />} label="Maestro de Llantas" />
                    <MenuLink onClick={() => router.push('/neumaticos/asignacion')} icon={<Truck size={14} />} label="Asignación / Montaje" />
                    <MenuLink onClick={() => router.push('/neumaticos/inspeccion')} icon={<Gauge size={14} />} label="Inspección R1-R2-R3" />
                    <MenuLink onClick={() => router.push('/neumaticos/rotaciones')} icon={<RotateCw size={14} />} label="Rotaciones" />
                    <MenuLink onClick={() => router.push('/neumaticos/proyecciones')} icon={<BarChart3 size={14} />} label="Proyecciones y CPK" />
                  </div>
                </div>
              )}
            </div>

            <SapButton onClick={() => router.push('/bdrepuestos')} icon={<Database size={14} />}>Maestro Repuestos</SapButton>
            <SapButton onClick={() => router.push('/repuestos')} icon={<PackageSearch size={14} />}>seg. logis</SapButton>
            <SapButton onClick={() => router.push('/historial-horometro')} icon={<ClipboardList size={14} />}>Mantenimiento</SapButton>
          </div>
        </div>
      </div>

      <div className="max-w-[1600px] mx-auto p-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 text-left leading-none">
          <div onClick={() => router.push('/rendimiento')} className="bg-white border border-[#d3d7d9] shadow-sm rounded-sm p-5 border-l-4 border-l-[#bb0000] hover:bg-[#fff4f4] transition-all cursor-pointer group leading-none">
            <div className="flex justify-between items-start mb-6 leading-none">
              <div className="space-y-1">
                <span className="text-[9px] font-bold text-[#6a6d70] uppercase tracking-wider">Validación</span>
                <h2 className="text-[11px] font-bold text-[#32363a] uppercase tracking-tight">Pendientes Conductor</h2>
              </div>
              <FileWarning size={18} className="text-[#bb0000] group-hover:scale-110 transition-transform" />
            </div>
            <div className="flex items-baseline gap-2 leading-none">
              <span className="text-4xl font-light text-[#32363a] tracking-tighter">{pendientesConductor}</span>
              <span className="text-[10px] font-bold text-[#bb0000] uppercase">Docs</span>
            </div>
          </div>

          <div onClick={() => router.push('/historial-horometro')} className="bg-white border border-[#d3d7d9] shadow-sm rounded-sm p-5 border-l-4 border-l-[#e6600d] hover:bg-[#fffcf5] transition-all cursor-pointer group leading-none">
            <div className="flex justify-between items-start mb-6 leading-none text-left">
              <div className="space-y-1">
                <span className="text-[9px] font-bold text-[#6a6d70] uppercase tracking-wider">Alertas</span>
                <h2 className="text-[11px] font-bold text-[#32363a] uppercase tracking-tight">Equipos con Atraso</h2>
              </div>
              <TimerOff size={18} className="text-[#e6600d] group-hover:scale-110 transition-transform" />
            </div>
            <div className="flex items-baseline gap-2 leading-none">
              <span className="text-4xl font-light text-[#32363a] tracking-tighter">{preventivosVencidos}</span>
              <span className="text-[10px] font-bold text-[#e6600d] uppercase">/ {porcentajeVencidos}%</span>
            </div>
          </div>

          <div className="bg-white border border-[#d3d7d9] shadow-sm rounded-sm p-5 border-l-4 border-l-[#0070b1] leading-none">
            <div className="flex justify-between items-start mb-6 leading-none text-left">
              <div className="space-y-1">
                <span className="text-[9px] font-bold text-[#6a6d70] uppercase tracking-wider">Universo</span>
                <h2 className="text-[11px] font-bold text-[#32363a] uppercase tracking-tight">Total Controlados</h2>
              </div>
              <ClipboardCheck size={18} className="text-[#0070b1]" />
            </div>
            <div className="flex items-baseline gap-2 leading-none">
              <span className="text-4xl font-light text-[#32363a] tracking-tighter">{totalControlados}</span>
              <span className="text-[10px] font-bold text-[#0070b1] uppercase">Unds</span>
            </div>
          </div>

          <div className="bg-white border border-[#d3d7d9] shadow-sm rounded-sm p-5 border-l-4 border-l-emerald-500 leading-none">
            <div className="flex justify-between items-start mb-6 leading-none text-left">
              <div className="space-y-1">
                <span className="text-[9px] font-bold text-[#6a6d70] uppercase tracking-wider">Semanal</span>
                <h2 className="text-[11px] font-bold text-[#32363a] uppercase tracking-tight">Prev. Ejecutados</h2>
              </div>
              <CalendarCheck size={18} className="text-emerald-500" />
            </div>
            <div className="flex items-baseline gap-2 leading-none">
              <span className="text-4xl font-light text-[#32363a] tracking-tighter">{prevSemanales}</span>
              <span className="text-[10px] font-bold text-emerald-600 uppercase">Realizados</span>
            </div>
          </div>

          <div className="bg-white border border-[#d3d7d9] shadow-sm rounded-sm p-5 border-l-4 border-l-emerald-700 leading-none">
            <div className="flex justify-between items-start mb-6 leading-none text-left">
              <div className="space-y-1">
                <span className="text-[9px] font-bold text-[#6a6d70] uppercase tracking-wider">Mensual</span>
                <h2 className="text-[11px] font-bold text-[#32363a] uppercase tracking-tight">Prev. Ejecutados</h2>
              </div>
              <ShieldCheck size={18} className="text-emerald-700" />
            </div>
            <div className="flex items-baseline gap-2 leading-none">
              <span className="text-4xl font-light text-[#32363a] tracking-tighter">{prevMensuales}</span>
              <span className="text-[10px] font-bold text-emerald-800 uppercase">Realizados</span>
            </div>
          </div>

          <div className="bg-white border border-[#d3d7d9] shadow-sm rounded-sm p-5 border-l-4 border-l-slate-800 leading-none">
            <div className="flex justify-between items-start mb-6 text-left leading-none">
              <div className="space-y-1">
                <span className="text-[9px] font-bold text-[#6a6d70] uppercase tracking-wider">Eficiencia</span>
                <h2 className="text-[11px] font-bold text-[#32363a] uppercase tracking-tight">Cumplimiento</h2>
              </div>
              <Activity size={18} className="text-slate-800" />
            </div>
            <div className="flex items-baseline gap-1 leading-none">
              <span className="text-4xl font-light text-[#32363a] tracking-tighter">
                {totalControlados > 0 ? (100 - parseFloat(porcentajeVencidos)).toFixed(1) : "100"}
              </span>
              <span className="text-[10px] font-bold text-slate-800 uppercase">%</span>
            </div>
          </div>
        </div>
      </div>
    </main>
  )
}

// ✅ COMPONENTE PARA LINKS DEL MENÚ DESPLEGABLE
function MenuLink({ icon, label, onClick }: any) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-3 px-4 py-3 text-[#32363a] hover:bg-[#eff4f9] hover:text-[#0070b1] transition-colors border-b border-[#f2f4f5] last:border-0 w-full text-left"
    >
      <span className="text-slate-400">{icon}</span>
      <span className="text-[10px] font-bold uppercase tracking-tight">{label}</span>
    </button>
  )
}

function SapButton({ children, onClick, icon }: any) {
  return (
    <button onClick={onClick} className="flex items-center gap-2 px-4 py-1.5 border border-[#b0b3b5] text-[#0070b1] bg-white rounded-sm text-[10px] font-bold uppercase hover:bg-[#eff4f9] transition-all active:scale-95 shadow-sm leading-none">
      {icon} {children}
    </button>
  )
}