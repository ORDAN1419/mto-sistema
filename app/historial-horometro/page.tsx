"use client"
import { useEffect, useState, useMemo, useRef, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import * as XLSX from 'xlsx'
import jsPDF from 'jspdf'
import {
  ArrowLeft, Search, Gauge, Truck, X, Save, Loader2, History,
  ChevronRight, ArrowUpCircle, Clock, Wrench, ShieldCheck, ShieldAlert,
  LayoutGrid, RefreshCw, Box, Activity, Target, AlertOctagon, CheckCircle2,
  MapPin, ClipboardList, Construction, LogOut, FileText, HelpCircle,
  Settings2, CalendarDays, Zap, Settings, Layers, Calendar, ListFilter
} from 'lucide-react'

// ... (obtenerFechaHoyLocal e interfaces se mantienen igual)
const obtenerFechaHoyLocal = () => {
  const ahora = new Date();
  const anio = ahora.getFullYear();
  const mes = String(ahora.getMonth() + 1).padStart(2, '0');
  const dia = String(ahora.getDate()).padStart(2, '0');
  return `${anio}-${mes}-${dia}`;
};

interface EquipoEstado {
  kmHodoUltiMp: string
  FechUltMp: any
  placaRodaje: string;
  codigoEquipo: string;
  descripcionEquipo: string;
  marca: string;
  modelo: string;
  serieMotor: string;
  year: string;
  cap: string;
  propietario: string;
  proyecto: string;
  ubic: string;
  horometroMayor: number;
  ultima_fecha: string | null;
  ProxHoroKmMp: number | null;
  tipoProxMp: string | null;
  tipoMpUlt: string | null;
  frecuencia: number | null;
  desface: number | null;
  status: string | null;
  obs: string;
  configuracion_ejes?: string | null;
  disponibilidad?: number;
  tpef?: number;
  tppr?: number;
}

export default function EstadoGeneralPage() {
  const router = useRouter()
  const inputBusquedaRef = useRef<HTMLInputElement>(null)
  const inputNuevaLecturaRef = useRef<HTMLInputElement>(null)

  const [equipos, setEquipos] = useState<EquipoEstado[]>([])
  const [loading, setLoading] = useState(true)
  const [busqueda, setBusqueda] = useState('')
  const [filtroKPI, setFiltroKPI] = useState<'TODOS' | 'SALUDABLE' | 'CUMPLIMIENTO' | 'RIESGO'>('TODOS')
  const [equipoSeleccionado, setEquipoSeleccionado] = useState<EquipoEstado | null>(null)
  const [form, setForm] = useState({ inicio: '', final: '', fecha: obtenerFechaHoyLocal() })
  const [enviando, setEnviando] = useState(false)
  const [historialModal, setHistorialModal] = useState<any[]>([])
  const [isHelpModalOpen, setIsHelpModalOpen] = useState(false)
  const [showVencidosModal, setShowVencidosModal] = useState(false);
  const [showEjesModal, setShowEjesModal] = useState(false)
  const [nuevaConfigEjes, setNuevaConfigEjes] = useState('')
  const [nuevaFrecuencia, setNuevaFrecuencia] = useState<string>('')
  const [nuevaUbicacion, setNuevaUbicacion] = useState('')
  const [showVisualLlantas, setShowVisualLlantas] = useState(false)
  const [montajeVisual, setMontajeVisual] = useState<any[]>([])

  const fetchEstadoActual = useCallback(async () => {
    try {
      setLoading(true)
      const { data: maestro, error: errM } = await supabase.from('maestroEquipos').select('*').order('codigoEquipo')
      const { data: reportes } = await supabase.from('reporte_diario').select('*')
      if (errM) throw errM

      const procesados = maestro.map((eq: any) => {
        const misReportes = reportes?.filter(r => r.placa_rodaje === eq.placaRodaje) || []
        const horasOp = misReportes.reduce((acc, r) => acc + (Number(r.horometro_final) - Number(r.horometro_inicial)), 0)
        const horasParada = misReportes.reduce((acc, r) => acc + (Number(r.horas_parada) || 0), 0)
        const fallas = misReportes.filter(r => r.tipo_parada === 'Correctivo').length
        return {
          ...eq,
          disponibilidad: (horasOp + horasParada) > 0 ? (horasOp / (horasOp + horasParada)) * 100 : 100,
          tpef: fallas > 0 ? horasOp / fallas : horasOp,
          tppr: fallas > 0 ? horasParada / fallas : 0
        }
      })
      setEquipos(procesados)
    } catch (err) { console.error(err) } finally { setLoading(false) }
  }, [])

  // ✅ NUEVA FUNCIÓN PARA CAMBIAR ESTADO RÁPIDAMENTE
  const toggleEstado = async (equipo: EquipoEstado) => {
    const nuevoEstado = equipo.status?.toLowerCase() === 'operativo' ? 'INOPERATIVO' : 'OPERATIVO';

    // Actualización optimista en interfaz
    setEquipos(prev => prev.map(e => e.placaRodaje === equipo.placaRodaje ? { ...e, status: nuevoEstado } : e));
    if (equipoSeleccionado?.placaRodaje === equipo.placaRodaje) {
      setEquipoSeleccionado(prev => prev ? { ...prev, status: nuevoEstado } : null);
    }

    try {
      const { error } = await supabase
        .from('maestroEquipos')
        .update({ status: nuevoEstado })
        .eq('placaRodaje', equipo.placaRodaje);

      if (error) throw error;
    } catch (err) {
      alert("Error al actualizar estado");
      fetchEstadoActual(); // Revertir si falla
    }
  };

  const fetchHistorial = useCallback(async (placa: string) => {
    const { data } = await supabase.from('horometro').select('*').eq('placaRodaje', placa).order('created_at', { ascending: false }).limit(3)
    setHistorialModal(data || [])
  }, [])

  const abrirVisualizacionLlantas = async () => {
    if (!equipoSeleccionado) return;
    setLoading(true);
    const { data } = await supabase.from('v_neumaticos_estado_actual').select('*').eq('placa', equipoSeleccionado.placaRodaje);
    setMontajeVisual(data || []);
    setShowVisualLlantas(true);
    setLoading(false);
  }

  const guardarConfigMaestro = async () => {
    if (!equipoSeleccionado) return;
    setEnviando(true);
    try {
      const { error } = await supabase.from('maestroEquipos').update({
        configuracion_ejes: nuevaConfigEjes,
        frecuencia: nuevaFrecuencia ? parseInt(nuevaFrecuencia) : equipoSeleccionado.frecuencia,
        ubic: nuevaUbicacion
      }).eq('placaRodaje', equipoSeleccionado.placaRodaje);
      if (error) throw error;
      alert("✅ Datos maestros actualizados");
      setShowEjesModal(false);
      fetchEstadoActual();
    } catch (err) { alert("Error al actualizar maestro"); } finally { setEnviando(false); }
  }

  const equiposFiltradosActuales = useMemo(() => {
    const q = busqueda.toLowerCase().trim();
    return equipos.filter(e => {
      let pasaKPI = true;
      if (filtroKPI === 'SALUDABLE') pasaKPI = e.desface !== null && e.desface > 24;
      if (filtroKPI === 'CUMPLIMIENTO') pasaKPI = e.desface !== null && e.desface > 0;
      if (filtroKPI === 'RIESGO') pasaKPI = e.desface !== null && e.desface <= 0;
      const matchBusqueda = !q || e.placaRodaje?.toLowerCase().includes(q) || e.codigoEquipo?.toLowerCase().includes(q) || e.descripcionEquipo?.toLowerCase().includes(q);
      return pasaKPI && matchBusqueda;
    });
  }, [equipos, filtroKPI, busqueda]);

  useEffect(() => { fetchEstadoActual() }, [fetchEstadoActual])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.altKey && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        if (equiposFiltradosActuales.length > 0) {
          setEquipoSeleccionado(equiposFiltradosActuales[0]);
          setTimeout(() => inputNuevaLecturaRef.current?.focus(), 150);
        }
      }
      if (e.ctrlKey && e.key === '1') { e.preventDefault(); router.push('/rendimiento'); }
      if (e.ctrlKey && e.key === '2') { e.preventDefault(); router.push('/bdrepuestos'); }
      if (e.ctrlKey && e.key === '3') { e.preventDefault(); router.push('/estatus'); }
      if (e.ctrlKey && e.key === '4') { e.preventDefault(); router.push('/repuestos'); }
      if (e.ctrlKey && e.key === '0') { e.preventDefault(); router.push('/equipos'); }
      if (e.ctrlKey && e.key === 'm') { e.preventDefault(); router.push('/mtto/consolidado'); }
      if (e.altKey && e.key.toLowerCase() === 's') { e.preventDefault(); inputBusquedaRef.current?.focus(); }
      if (e.altKey && e.key.toLowerCase() === 'h') { e.preventDefault(); setIsHelpModalOpen(p => !p); }
      if (e.altKey && e.key.toLowerCase() === 'x') {
        e.preventDefault();
        setBusqueda('');
        setFiltroKPI('TODOS');
        if (inputBusquedaRef.current) inputBusquedaRef.current.value = '';
      }
      if (e.altKey && e.key.toLowerCase() === 'q') { e.preventDefault(); fetchEstadoActual(); }
      if ((e.key === 'Enter' || e.key === 'Escape') && showVisualLlantas) setShowVisualLlantas(false);
      if (e.key === 'Escape' && showVencidosModal) setShowVencidosModal(false);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [router, fetchEstadoActual, showVisualLlantas, showVencidosModal, equiposFiltradosActuales]);

  useEffect(() => {
    if (equipoSeleccionado) {
      fetchHistorial(equipoSeleccionado.placaRodaje);
      setForm({ inicio: equipoSeleccionado.horometroMayor?.toString() || '0', final: '', fecha: obtenerFechaHoyLocal() })
      setNuevaConfigEjes(equipoSeleccionado.configuracion_ejes || '')
      setNuevaFrecuencia(equipoSeleccionado.frecuencia?.toString() || '')
      setNuevaUbicacion(equipoSeleccionado.ubic || '')
    }
  }, [equipoSeleccionado, fetchHistorial])

  const kpiSalud = useMemo(() => {
    const gestionados = equipos.filter(e => e.desface !== null);
    if (gestionados.length === 0) return { saludable: 0, cumplimiento: 0, confiabilidad: 0, vencidos: 0 };
    return {
      saludable: Math.round((gestionados.filter(e => e.desface! > 24).length / gestionados.length) * 100),
      cumplimiento: Math.round(((gestionados.length - gestionados.filter(e => e.desface! <= 0).length) / gestionados.length) * 100),
      confiabilidad: Math.round((equipos.filter(e => e.status?.toLowerCase() === 'operativo').length / equipos.length) * 100),
      vencidos: gestionados.filter(e => e.desface! <= 0).length
    };
  }, [equipos]);

  const equiposAgrupados = useMemo(() => {
    const grupos: Record<string, EquipoEstado[]> = {};
    equiposFiltradosActuales.filter(e => e.desface !== null).forEach(eq => {
      const cat = (eq.descripcionEquipo || 'OTROS').toUpperCase();
      if (!grupos[cat]) grupos[cat] = [];
      grupos[cat].push(eq);
    });
    Object.keys(grupos).forEach(key => { grupos[key].sort((a, b) => (a.desface || 0) - (b.desface || 0)); });
    return grupos;
  }, [equiposFiltradosActuales]);

  const reporteAgrupadoVencidos = useMemo(() => {
    const vencidos = equipos.filter(e => e.desface !== null && e.desface <= 0)
      .sort((a, b) => (a.desface || 0) - (b.desface || 0));

    const grupos: Record<string, EquipoEstado[]> = {};
    vencidos.forEach(eq => {
      const cat = (eq.descripcionEquipo || 'OTROS').toUpperCase();
      if (!grupos[cat]) grupos[cat] = [];
      grupos[cat].push(eq);
    });
    return grupos;
  }, [equipos]);

  const guardarLectura = async () => {
    if (!equipoSeleccionado) return;
    const hFinal = Number(form.final);
    if (!form.final || hFinal <= Number(form.inicio)) { alert("La nueva lectura debe ser mayor a la anterior"); return; }
    setEnviando(true);
    try {
      const ts = new Date().toISOString();
      await supabase.from('horometro').insert([{ placaRodaje: equipoSeleccionado.placaRodaje, horaInicio: Number(form.inicio), horaFinal: hFinal, horasOperacion: hFinal - Number(form.inicio), horometroMayor: hFinal, created_at: ts }]);
      await supabase.from('maestroEquipos').update({ horometroMayor: hFinal, ultima_fecha: ts }).eq('placaRodaje', equipoSeleccionado.placaRodaje);
      await fetchEstadoActual();
      setEquipoSeleccionado(null);
      alert("✅ Horómetro sincronizado");
    } catch (err) { alert("Error al guardar") } finally { setEnviando(false) }
  }

  return (
    <main className="min-h-screen bg-[#f7f9fa] text-[#32363a] font-sans text-left leading-none">
      <nav className="bg-[#354a5f] text-white h-12 flex items-center px-4 justify-between shadow-md sticky top-0 z-40">
        <div className="flex items-center gap-4 text-left leading-none">
          <ArrowLeft size={18} onClick={() => router.back()} className="cursor-pointer hover:opacity-70" />
          <div className="h-6 w-px bg-white/20" />
          <span className="font-bold text-xs tracking-wider uppercase italic leading-none">Monitor de las unidades</span>
        </div>
        <div className="flex items-center gap-4 text-left leading-none">
          <button
            onClick={() => setShowVencidosModal(true)}
            className="flex items-center gap-2 bg-rose-600 hover:bg-rose-700 text-white px-3 py-1.5 rounded-sm text-[10px] font-black uppercase transition-all shadow-lg active:scale-95"
          >
            <ListFilter size={14} />
            Reporte Crítico
          </button>
          <div className="relative">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 text-white/50" size={14} />
            <input ref={inputBusquedaRef} value={busqueda} onChange={(e) => setBusqueda(e.target.value)} className="bg-white/10 border border-white/20 rounded-sm py-1 pl-8 pr-2 text-xs outline-none focus:bg-white focus:text-slate-900 transition-all w-64 font-bold" placeholder="Buscar Placa o Grupo..." />
          </div>
          <HelpCircle size={18} className="cursor-pointer opacity-80 hover:opacity-100" onClick={() => setIsHelpModalOpen(true)} />
        </div>
      </nav>

      <div className="p-4 flex gap-4">
        <div className={`transition-all duration-300 ${equipoSeleccionado ? 'w-2/3' : 'w-full'} space-y-4`}>
          <div className="grid grid-cols-4 gap-2">
            <SapKpiTile label="Índice Salud" value={`${kpiSalud.saludable}%`} color="emerald" active={filtroKPI === 'SALUDABLE'} onClick={() => setFiltroKPI('SALUDABLE')} />
            <SapKpiTile label="Cumplimiento" value={`${kpiSalud.cumplimiento}%`} color="blue" active={filtroKPI === 'CUMPLIMIENTO'} onClick={() => setFiltroKPI('CUMPLIMIENTO')} />
            <div className="bg-white border border-[#d3d7d9] p-3 rounded-sm shadow-sm text-left">
              <p className="text-[10px] font-bold text-[#6a6d70] uppercase leading-none mb-1">Disponibilidad</p>
              <p className="text-xl font-light text-[#0070b1] font-mono">{kpiSalud.confiabilidad}%</p>
            </div>
            <SapKpiTile label="Vencidos" value={kpiSalud.vencidos} color="rose" active={filtroKPI === 'RIESGO'} onClick={() => setFiltroKPI('RIESGO')} />
          </div>

          <div className="bg-white border border-[#d3d7d9] shadow-sm rounded-sm">
            <div className="bg-[#f2f4f5] border-b border-[#d3d7d9] px-4 py-2 flex justify-between items-center leading-none">
              <div className="flex items-center gap-2 text-[#6a6d70] text-left leading-none">
                <LayoutGrid size={14} />
                <span className="text-[11px] font-bold uppercase tracking-tight leading-none">Visión General de Flota</span>
              </div>
              <button onClick={() => { setFiltroKPI('TODOS'); setBusqueda(''); }} className="text-[10px] text-[#0070b1] font-bold hover:underline uppercase leading-none">Reiniciar Filtros</button>
            </div>

            <div className="p-4 max-h-[calc(100vh-220px)] overflow-y-auto space-y-6 text-left bg-white">
              {Object.entries(equiposAgrupados).map(([grupo, lista]) => (
                <div key={grupo} className="space-y-2">
                  <div className="flex items-center gap-2 border-b border-slate-100 pb-1 leading-none">
                    <Box size={12} className="text-slate-300" />
                    <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">{grupo}</h3>
                    <div className="h-px flex-grow border-b border-dashed border-slate-300/60" />
                  </div>
                  <div className="grid grid-cols-4 md:grid-cols-6 lg:grid-cols-10 gap-1">
                    {lista.map(eq => {
                      const color = eq.desface! <= 0 ? 'bg-rose-600' : eq.desface! <= 24 ? 'bg-amber-500' : 'bg-emerald-600';
                      return (
                        <button key={eq.placaRodaje} onClick={() => setEquipoSeleccionado(eq)} className={`flex flex-col border border-[#d3d7d9] rounded-sm overflow-hidden hover:border-[#0070b1] transition-all group ${equipoSeleccionado?.placaRodaje === eq.placaRodaje ? 'ring-2 ring-[#0070b1]' : ''}`}>
                          <div className="bg-[#f7f9fa] py-1 text-[8px] font-bold text-[#6a6d70] truncate px-1 uppercase leading-none">{eq.codigoEquipo}</div>
                          <div className={`${color} py-1 text-[10px] font-mono font-bold text-white leading-none text-center`}>{eq.desface?.toFixed(1)}</div>
                        </button>
                      )
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {equipoSeleccionado && (
          <div className="w-1/3 bg-white border border-[#d3d7d9] shadow-xl rounded-sm flex flex-col animate-in slide-in-from-right duration-300">
            <div className="p-4 border-b border-[#d3d7d9] bg-[#f7f9fa] flex justify-between items-center text-left leading-none">
              <div className="leading-none text-left flex flex-col gap-1">
                <h2 className="text-xl font-light text-[#0070b1] uppercase tracking-tight leading-none mb-1 font-sans antialiased">{equipoSeleccionado.placaRodaje}</h2>
                <div className="flex items-center gap-3">
                  <span className="text-[10px] font-black text-slate-500 uppercase tracking-wider bg-slate-100 px-1.5 py-0.5 rounded-sm">{equipoSeleccionado.codigoEquipo}</span>
                  <div className="w-px h-3 bg-slate-300" />
                  {/* ✅ ETIQUETA DE STATUS CLICKABLE EN PANEL DETALLE */}
                  <div
                    onClick={() => toggleEstado(equipoSeleccionado)}
                    className="flex items-center gap-1.5 cursor-pointer hover:opacity-70 transition-all active:scale-95"
                  >
                    <div className={`w-2 h-2 rounded-full ${equipoSeleccionado.status?.toLowerCase() === 'operativo' ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                    <span className={`text-[10px] font-bold uppercase tracking-tight ${equipoSeleccionado.status?.toLowerCase() === 'operativo' ? 'text-emerald-700' : 'text-rose-700'}`}>
                      {equipoSeleccionado.status || 'SIN ESTADO'}
                    </span>
                  </div>
                </div>
              </div>
              <X className="cursor-pointer text-[#6a6d70] hover:text-rose-500" onClick={() => setEquipoSeleccionado(null)} />
            </div>

            <div className="p-5 space-y-6 overflow-y-auto">
              <div className="space-y-3 bg-[#eff4f9] p-4 border border-[#b0ccf0] rounded-sm text-left">
                <div className="flex justify-between items-center border-b border-[#b0ccf0] pb-2 mb-3">
                  <h4 className="text-[10px] font-black text-[#0070b1] uppercase flex items-center gap-2 leading-none"><Settings2 size={12} /> Planificación</h4>
                  <button onClick={() => setShowEjesModal(true)} className="p-1 hover:bg-[#0070b1] hover:text-white rounded-sm text-[#0070b1] transition-all"><Settings size={14} /></button>
                </div>
                <div className="grid grid-cols-2 gap-4 text-left leading-none border-b border-[#b0ccf0]/50 pb-3">
                  <div className="flex flex-col items-start text-left">
                    <p className="text-[9px] font-bold text-[#6a6d70] uppercase mb-1 leading-none tracking-wide">Último MP Ejecutado</p>
                    <div className="flex items-center gap-2 text-[#32363a] font-bold text-xs tracking-tight">
                      <Zap size={12} className="text-emerald-600 fill-emerald-600/10" />
                      <span className="font-sans antialiased uppercase">{equipoSeleccionado.tipoMpUlt || 'N/A'}</span>
                    </div>
                  </div>
                  <div>
                    <p className="text-[9px] font-bold text-[#6a6d70] uppercase mb-1">Frecuencia</p>
                    <div className="flex items-center gap-2 text-[#32363a] font-black text-xs uppercase italic tracking-tight leading-none"><CalendarDays size={12} className="text-blue-600" /> {equipoSeleccionado.frecuencia ? `${equipoSeleccionado.frecuencia} h` : 'N/A'}</div>
                  </div>
                  <div>
                    <p className="text-[9px] font-bold text-[#6a6d70] uppercase mb-1">Ubicación</p>
                    <div className="flex items-center gap-2 text-[#32363a] font-black text-xs uppercase tracking-tight leading-none"><MapPin size={12} className="text-orange-600" /> {equipoSeleccionado.ubic || 'N/A'}</div>
                  </div>
                </div>
                <div className="mt-2 py-2 border-b border-[#b0ccf0]/50">
                  <p className="text-[9px] font-bold text-[#6a6d70] uppercase mb-1">Estado Último MP</p>
                  <div className="flex items-center gap-2 text-[#32363a]">
                    <Calendar size={12} className="text-[#0070b1]" />
                    <span className="text-[11px] font-black font-mono">
                      {equipoSeleccionado.FechUltMp ? `${new Date(equipoSeleccionado.FechUltMp).toLocaleDateString('es-PE', { day: '2-digit', month: '2-digit', year: 'numeric', timeZone: 'UTC' })}` : '---'}
                      {equipoSeleccionado.kmHodoUltiMp ? ` | ${equipoSeleccionado.kmHodoUltiMp} H` : ''}
                    </span>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2 mt-2">
                  <div className="p-3 bg-white border border-[#d3d7d9] rounded-sm flex flex-col items-center justify-center text-center">
                    <p className="text-[9px] font-bold text-[#6a6d70] uppercase mb-1 flex items-center gap-1 leading-none"><Clock size={10} /> Próx. {equipoSeleccionado.tipoProxMp || 'MP'}</p>
                    <p className="text-sm font-black text-slate-700 font-mono leading-none">{equipoSeleccionado.ProxHoroKmMp || 'N/A'}</p>
                  </div>
                  <div className={`p-3 border rounded-sm flex flex-col items-center justify-center text-center ${equipoSeleccionado.desface! <= 0 ? 'bg-rose-50 border-rose-200' : 'bg-emerald-50 border-emerald-200'}`}>
                    <p className="text-[9px] font-bold text-[#6a6d70] uppercase mb-1 leading-none tracking-tighter">Estado Desfase</p>
                    <p className={`text-sm font-black font-mono leading-none ${equipoSeleccionado.desface! <= 0 ? 'text-rose-600' : 'text-emerald-700'}`}>{equipoSeleccionado.desface?.toFixed(1)} h</p>
                  </div>
                </div>
              </div>

              <div className="space-y-4 bg-white p-4 border-2 border-[#0070b1] rounded-sm text-center shadow-lg leading-none">
                <h4 className="text-[10px] font-black text-[#0070b1] uppercase border-b border-slate-100 pb-1 flex items-center gap-2 text-left leading-none font-sans"><RefreshCw size={12} /> Entrada de Horómetro</h4>
                <div className="space-y-3 text-left">
                  <div className="grid grid-cols-2 gap-3 leading-none">
                    <div><label className="text-[9px] font-bold text-slate-400 uppercase leading-none">Anterior</label><div className="bg-slate-100 p-2 text-sm font-mono font-bold text-slate-500 border rounded-sm text-center leading-none">{equipoSeleccionado.horometroMayor}</div></div>
                    <div>
                      <label className="text-[9px] font-bold text-[#0070b1] uppercase font-black leading-none italic underline">Nueva (Enter)</label>
                      <input
                        ref={inputNuevaLecturaRef}
                        type="number" step="0.1"
                        value={form.final}
                        onChange={(e) => setForm({ ...form, final: e.target.value })}
                        onKeyDown={(e) => { if (e.key === 'Enter') guardarLectura(); }}
                        className="w-full border-2 border-[#0070b1] p-2 text-sm font-mono font-black text-[#0070b1] outline-none rounded-sm bg-[#f0f9ff] text-center"
                        placeholder="0.0"
                      />
                    </div>
                  </div>
                  <button onClick={guardarLectura} disabled={enviando} className="w-full bg-[#0070b1] hover:bg-[#005a8e] text-white py-3 text-xs font-black uppercase rounded-sm transition-all flex items-center justify-center gap-2 active:scale-95 leading-none">
                    {enviando ? <Loader2 className="animate-spin" size={16} /> : <><Save size={16} /> Contabilizar (Enter)</>}
                  </button>
                </div>
              </div>

              <div onClick={abrirVisualizacionLlantas} className="bg-white p-4 border border-[#d3d7d9] rounded-sm shadow-sm space-y-3 cursor-pointer hover:border-[#0070b1] transition-all group text-left leading-none">
                <div className="flex justify-between items-center border-b border-slate-100 pb-2"><h4 className="text-[10px] font-black text-slate-500 uppercase flex items-center gap-2 leading-none"><Layers size={12} className="text-[#0070b1]" /> Configuración de Neumáticos</h4><ChevronRight size={14} className="text-slate-300 group-hover:text-[#0070b1]" /></div>
                <div className="flex justify-between items-end leading-none"><div><p className="text-[9px] font-bold text-slate-400 uppercase mb-1 leading-none">Esquema Actual</p><p className="text-xs font-black text-[#32363a] uppercase">{equipoSeleccionado.configuracion_ejes || 'PENDIENTE'}</p></div><div className="bg-[#f2f4f5] px-2 py-1 text-[8px] font-black text-[#0070b1] border border-[#d3d7d9]">VER DETALLE</div></div>
              </div>

              <button onClick={() => router.push(`/eventos?placa=${equipoSeleccionado.placaRodaje}`)} className="w-full py-3 border-2 border-slate-800 text-slate-800 rounded-sm font-black text-[10px] uppercase flex items-center justify-center gap-3 hover:bg-slate-800 hover:text-white transition-all tracking-widest leading-none">
                <Construction size={16} /> Crear Orden Intervención
              </button>
            </div>
          </div>
        )}
      </div>

      {showVencidosModal && (
        <div className="fixed inset-0 z-[300] flex items-center justify-center bg-slate-900/60 backdrop-blur-md p-4 animate-in fade-in duration-300">
          <div className="bg-white w-full max-w-5xl rounded-sm shadow-2xl border border-rose-300 overflow-hidden flex flex-col max-h-[95vh] text-left">
            <div className="bg-rose-700 p-5 flex justify-between items-center text-white shadow-xl">
              <div className="flex items-center gap-4"><AlertOctagon size={28} className="animate-pulse" /><div><h3 className="font-black text-lg uppercase tracking-tight leading-none mb-1">Reporte Ejecutivo: Unidades Fuera de Rango</h3><p className="text-[11px] opacity-80 font-bold uppercase tracking-wider">Flota en Alerta de Mantenimiento | SAP Sync</p></div></div>
              <button onClick={() => setShowVencidosModal(false)} className="hover:bg-white/20 p-2 rounded-full transition-all active:scale-90"><X size={30} /></button>
            </div>
            <div className="flex-grow overflow-auto p-6 bg-[#f7f9fa] space-y-8">
              {Object.entries(reporteAgrupadoVencidos).map(([grupo, lista]) => (
                <div key={grupo} className="bg-white border border-slate-200 rounded-sm shadow-sm overflow-hidden">
                  <div className="bg-slate-100 px-4 py-2 border-b flex items-center gap-2"><Box size={14} className="text-slate-500" /><h4 className="font-black text-[11px] text-slate-600 uppercase tracking-widest">{grupo}</h4><span className="bg-rose-600 text-white text-[9px] font-black px-2 py-0.5 rounded-full">{lista.length}</span></div>
                  <table className="w-full text-left">
                    <thead>
                      <tr className="text-[10px] font-black text-slate-400 uppercase bg-slate-50/50">
                        <th className="px-6 py-3">Placa</th>
                        <th className="px-6 py-3">ID Equipo</th>
                        <th className="px-6 py-3 text-center">Desfase (Hrs)</th>
                        <th className="px-6 py-3 text-center">Plan Prev.</th>
                        <th className="px-6 py-3">Estatus</th>
                      </tr>
                    </thead>
                    <tbody className="text-[11px] divide-y divide-slate-100">
                      {lista.map((eq) => (
                        <tr key={eq.placaRodaje} className="hover:bg-rose-50/30 transition-colors">
                          <td className="px-6 py-3 font-black text-[#0070b1] font-mono border-l-4 border-rose-500 uppercase">{eq.placaRodaje}</td>
                          <td className="px-6 py-3 font-bold text-slate-500 uppercase italic">{eq.codigoEquipo}</td>
                          <td className="px-6 py-3 text-center"><span className="bg-rose-100 text-rose-700 px-3 py-1 rounded-sm font-black font-mono border border-rose-200">{eq.desface?.toFixed(1)} h</span></td>
                          <td className="px-6 py-3 text-center font-bold text-slate-600">{eq.frecuencia || 'N/A'} h</td>
                          <td className="px-6 py-3">
                            {/* ✅ ETIQUETA CLICKABLE DENTRO DE LA TABLA DEL MODAL */}
                            <div
                              onClick={() => toggleEstado(eq)}
                              className="flex items-center gap-2 font-black text-rose-600 uppercase italic text-[9px] cursor-pointer hover:bg-rose-100 p-1 rounded transition-all"
                            >
                              <ShieldAlert size={14} /> {eq.status || 'SERVICIO EXCEDIDO'}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ... (Resto de los modales MiniTireVisual, SapKpiTile, ShortcutRow se mantienen igual) */}
      {showVisualLlantas && equipoSeleccionado && (
        <div className="fixed inset-0 z-[250] flex items-center justify-center bg-slate-900/80 backdrop-blur-md p-4 animate-in zoom-in-95 leading-none">
          <div className="bg-white w-full max-w-2xl rounded-sm shadow-2xl overflow-hidden border-4 border-[#354a5f] leading-none">
            <div className="bg-[#354a5f] p-4 flex justify-between items-center text-white text-left leading-none">
              <div className="flex items-center gap-3 text-left leading-none"><Truck size={24} /><div className="text-left leading-none"><h3 className="font-black text-sm uppercase tracking-tighter leading-none mb-1">{equipoSeleccionado.placaRodaje}</h3><p className="text-[10px] uppercase opacity-70 font-bold leading-none">{equipoSeleccionado.descripcionEquipo}</p></div></div>
              <X className="cursor-pointer hover:text-rose-500" size={24} onClick={() => setShowVisualLlantas(false)} />
            </div>
            <div className="p-12 bg-white flex flex-col items-center gap-10 overflow-y-auto max-h-[70vh]">
              {equipoSeleccionado.configuracion_ejes?.split('-').map((llantasEnEje, ejeIdx) => {
                const numLlantas = parseInt(llantasEnEje);
                return (
                  <div key={ejeIdx} className="flex flex-col items-center gap-2 leading-none">
                    <span className="text-[8px] font-black text-slate-300 uppercase tracking-widest">Eje {ejeIdx + 1}</span>
                    <div className="flex items-center gap-24 relative">
                      <div className="flex gap-1.5">{Array.from({ length: numLlantas / 2 }).map((_, i) => {
                        const pos = numLlantas === 2 ? `${ejeIdx + 1}I` : `${ejeIdx + 1}I${i === 0 ? 'E' : 'I'}`;
                        return <MiniTireVisual key={pos} pos={pos} info={montajeVisual.find(m => m.posicion === pos)} />;
                      })}</div>
                      <div className="absolute left-1/2 -translate-x-1/2 w-40 h-2 bg-[#f2f4f5] -z-10 rounded-full" />
                      <div className="flex gap-1.5">{Array.from({ length: numLlantas / 2 }).map((_, i) => {
                        const pos = numLlantas === 2 ? `${ejeIdx + 1}D` : `${ejeIdx + 1}D${i === (numLlantas / 2 - 1) ? 'E' : 'I'}`;
                        return <MiniTireVisual key={pos} pos={pos} info={montajeVisual.find(m => m.posicion === pos)} />;
                      })}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {showEjesModal && equipoSeleccionado && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 text-left animate-in zoom-in-95 leading-none">
          <div className="bg-white w-full max-w-xs rounded-sm shadow-2xl overflow-hidden border border-[#d3d7d9]">
            <div className="bg-[#354a5f] p-3 flex justify-between items-center text-white text-left">
              <h3 className="font-bold text-[10px] uppercase tracking-widest leading-none">Ajustes Maestro</h3>
              <X size={16} className="cursor-pointer" onClick={() => setShowEjesModal(false)} />
            </div>
            <div className="p-5 space-y-4 bg-white text-left">
              <div className="space-y-1 text-left leading-none">
                <label className="text-[9px] font-black text-slate-500 uppercase leading-none">Esquema Neumáticos</label>
                <select value={nuevaConfigEjes} onChange={(e) => setNuevaConfigEjes(e.target.value)} className="w-full border p-2 text-xs rounded-sm font-bold bg-[#f8f9fa] outline-none">
                  <option value="">Seleccionar...</option>
                  <option value="2-4-4">Tracto 6x4 (2-4-4)</option>
                  <option value="2-2-4-4">Volvo 8x4 (2-2-4-4)</option>
                  <option value="2-2-2">Motoniveladora (2-2-2)</option>
                  <option value="2-4">Camión 4x2 (2-4)</option>
                  <option value="2-2">Camioneta (2-2)</option>
                  <option value="4-4-4">Carreta S3 (4-4-4)</option>
                </select>
              </div>
              <div className="space-y-1 text-left leading-none">
                <label className="text-[9px] font-black text-[#0070b1] uppercase leading-none">Frecuencia MP (Hrs)</label>
                <input type="number" value={nuevaFrecuencia} onChange={(e) => setNuevaFrecuencia(e.target.value)} className="w-full border-2 border-[#0070b1]/20 p-2 text-xs rounded-sm outline-none font-bold" />
              </div>
              <div className="space-y-1 text-left leading-none">
                <label className="text-[9px] font-black text-[#0070b1] uppercase leading-none">Ubicación Actual</label>
                <input type="text" value={nuevaUbicacion} onChange={(e) => setNuevaUbicacion(e.target.value.toUpperCase())} className="w-full border-2 border-[#0070b1]/20 p-2 text-xs rounded-sm outline-none font-bold" placeholder="EJ: TALLER / MINA" />
              </div>
              <button onClick={guardarConfigMaestro} disabled={enviando} className="w-full bg-[#0070b1] text-white py-2.5 text-[10px] font-black uppercase rounded-sm flex items-center justify-center gap-2 active:scale-95 disabled:opacity-50 transition-all leading-none">
                {enviando ? <Loader2 className="animate-spin" size={14} /> : <><Save size={14} /> Actualizar Maestro</>}
              </button>
            </div>
          </div>
        </div>
      )}

      {isHelpModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 text-left leading-none">
          <div className="bg-white w-full max-sm rounded-sm shadow-2xl p-6 space-y-3 relative border border-[#d3d7d9]">
            <h3 className="font-bold text-xs uppercase tracking-widest text-[#354a5f] border-b pb-2 mb-4 leading-none text-left">Atajos de Teclado SAP</h3>
            <ShortcutRow keys="ALT + K" label="Horómetro Rápido (Selección Auto)" />
            <ShortcutRow keys="ALT + S" label="Foco Buscador Principal" />
            <ShortcutRow keys="ALT + X" label="Limpiar Filtros y Búsqueda" />
            <ShortcutRow keys="ALT + Q" label="Refrescar Datos" />
            <X size={20} className="absolute top-4 right-4 cursor-pointer text-slate-400" onClick={() => setIsHelpModalOpen(false)} />
          </div>
        </div>
      )}
    </main>
  )
}

function MiniTireVisual({ pos, info }: any) {
  const colors: any = { 'VERDE': 'bg-emerald-500', 'AMARILLO': 'bg-amber-400', 'NARANJA': 'bg-orange-500', 'ROJO': 'bg-rose-600' }
  return (
    <div className="flex flex-col items-center gap-1 leading-none text-left">
      <span className="text-[8px] font-black text-slate-400 uppercase leading-none text-left">{pos}</span>
      <div className={`w-10 h-16 ${info ? colors[info.alerta_color] || 'bg-slate-800' : 'bg-slate-100 border-2 border-dashed border-slate-200'} rounded-sm flex flex-col items-center justify-center text-white border border-black/10 shadow-lg group relative transition-transform hover:scale-105 leading-none`}>
        {info ? (
          <><span className="text-[11px] font-black leading-none text-left">{Math.round(info.otr_porcentaje)}%</span>
            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-3 hidden group-hover:block bg-slate-900 text-white p-3 rounded-sm text-[10px] w-44 z-[250] shadow-2xl border border-white/20 text-left leading-none"><p className="text-blue-400 font-black mb-1 border-b border-white/10 pb-1 text-left leading-none">{info.serie}</p><p className="text-[8px] uppercase text-slate-400 mb-2 font-bold text-left leading-none">{info.marca} {info.modelo}</p><div className="space-y-1 font-mono text-[9px] text-left leading-none"><div className="flex justify-between leading-none text-left"><span>R1:</span><span className="text-emerald-400 font-black">{info.mm_izq}mm</span></div><div className="flex justify-between leading-none text-left"><span>R2:</span><span className="text-emerald-400 font-black">{info.mm_cen}mm</span></div><div className="flex justify-between leading-none text-left"><span>R3:</span><span className="text-emerald-400 font-black">{info.mm_der}mm</span></div></div></div></>
        ) : (<span className="text-[7px] text-slate-300 font-black uppercase italic leading-none text-left">Vacío</span>)}
      </div>
    </div>
  )
}

function SapKpiTile({ label, value, color, active, onClick }: any) {
  const styles: any = {
    emerald: active ? 'bg-emerald-600border-emerald-700 text-white shadow-md' : 'bg-white border-[#d3d7d9] text-[#32363a] hover:bg-emerald-50',
    blue: active ? 'bg-[#0070b1] border-[#005a8e] text-white shadow-md' : 'bg-white border-[#d3d7d9] text-[#32363a] hover:bg-blue-50',
    rose: active ? 'bg-rose-600 border-rose-700 text-white shadow-md' : 'bg-white border-[#d3d7d9] text-[#32363a] hover:bg-rose-50',
  }
  return (<button onClick={onClick} className={`p-3 border rounded-sm text-left transition-all active:scale-95 shadow-sm leading-none ${styles[color]} text-left leading-none`}><p className={`text-[10px] font-bold uppercase mb-1 leading-none ${active ? 'text-white' : 'text-[#6a6d70]'} text-left leading-none`}>{label}</p><p className="text-xl font-light font-mono leading-none text-left leading-none">{value}</p></button>)
}

function ShortcutRow({ keys, label }: { keys: string, label: string }) {
  return (<div className="flex justify-between items-center text-left leading-none text-[10px] font-bold text-slate-600 text-left leading-none"><span>{label}</span><span className="bg-[#f2f4f5] px-2 py-1 rounded-sm font-mono border border-[#d3d7d9] leading-none text-left leading-none">{keys}</span></div>)
}