"use client"
import { useEffect, useState, useMemo, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import * as XLSX from 'xlsx'
import jsPDF from 'jspdf'
import html2canvas from 'html2canvas'
import {
  ArrowLeft, Search, Gauge, Truck, X, Save, Loader2, Download, History,
  ChevronRight, ArrowUpCircle, Clock, Wrench, ShieldCheck, ShieldAlert,
  LayoutGrid, RefreshCw, Box, Activity, Target, AlertOctagon, CheckCircle2,
  MapPin, ClipboardList, Construction, LogOut, FileText
} from 'lucide-react'

// ✅ FUNCIÓN PARA OBTENER FECHA LOCAL REAL
const obtenerFechaHoyLocal = () => {
  const ahora = new Date();
  const anio = ahora.getFullYear();
  const mes = String(ahora.getMonth() + 1).padStart(2, '0');
  const dia = String(ahora.getDate()).padStart(2, '0');
  return `${anio}-${mes}-${dia}`;
};

interface EquipoEstado {
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
  desface: number | null;
  status: string | null;
  obs: string;
  // KPIs calculados
  disponibilidad?: number;
  tpef?: number;
  tppr?: number;
}

export default function EstadoGeneralPage() {
  const router = useRouter()
  const [equipos, setEquipos] = useState<EquipoEstado[]>([])
  const [loading, setLoading] = useState(true)
  const [busqueda, setBusqueda] = useState('')
  const [filtroKPI, setFiltroKPI] = useState<'TODOS' | 'SALUDABLE' | 'CUMPLIMIENTO' | 'RIESGO'>('TODOS')

  const [equipoSeleccionado, setEquipoSeleccionado] = useState<EquipoEstado | null>(null)
  const [form, setForm] = useState({ inicio: '', final: '', fecha: obtenerFechaHoyLocal() })
  const [enviando, setEnviando] = useState(false)
  const [generandoPDF, setGenerandoPDF] = useState(false)
  const [historialModal, setHistorialModal] = useState<any[]>([])

  useEffect(() => { fetchEstadoActual() }, [])

  useEffect(() => {
    if (equipoSeleccionado) {
      fetchHistorial(equipoSeleccionado.placaRodaje);
      setForm({
        inicio: equipoSeleccionado.horometroMayor?.toString() || '0',
        final: '',
        fecha: obtenerFechaHoyLocal()
      })
    }
  }, [equipoSeleccionado])

  const fetchEstadoActual = async () => {
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
  }

  const fetchHistorial = async (placa: string) => {
    const { data } = await supabase.from('horometro').select('*').eq('placaRodaje', placa).order('created_at', { ascending: false }).limit(3)
    setHistorialModal(data || [])
  }

  // ✅ REPORTE MURAL: FILTRADO ESTRICTO
  const exportarPDFMural = async () => {
    const unidadesCriticas = equipos
      .filter(e => e.desface !== null && e.desface !== 0)
      .sort((a, b) => (a.desface || 0) - (b.desface || 0));

    if (unidadesCriticas.length === 0) {
      alert("No hay unidades con desfase para el mural.");
      return;
    }

    setGenerandoPDF(true);
    const doc = new jsPDF();
    const hoy = obtenerFechaHoyLocal();

    doc.setFontSize(16);
    doc.text("REPORTE MURAL DE MANTENIMIENTO", 14, 20);
    doc.setFontSize(9);
    doc.text(`Fecha: ${hoy} | Solo unidades con desfase activo`, 14, 26);

    doc.setFillColor(30, 41, 59);
    doc.rect(14, 32, 182, 10, 'F');
    doc.setTextColor(255, 255, 255);
    doc.text("PLACA", 20, 38.5);
    doc.text("CÓDIGO", 65, 38.5);
    doc.text("DESFASE (H)", 115, 38.5);
    doc.text("ESTADO", 165, 38.5);

    doc.setTextColor(0, 0, 0);
    let y = 49;

    unidadesCriticas.forEach((eq) => {
      if (y > 280) { doc.addPage(); y = 20; }
      const dVal = eq.desface || 0;
      if (dVal < 0) doc.setTextColor(190, 18, 60);
      else if (dVal <= 24) doc.setTextColor(217, 119, 6);
      else doc.setTextColor(5, 150, 105);

      doc.text(eq.placaRodaje, 20, y);
      doc.text(eq.codigoEquipo || "---", 65, y);
      doc.text(dVal.toFixed(1).toString(), 115, y);
      doc.text(dVal < 0 ? "VENCIDA" : "POR VENCER", 165, y);
      doc.line(14, y + 2, 196, y + 2);
      y += 9;
    });

    doc.save(`Mural_Mantenimiento_${hoy}.pdf`);
    setGenerandoPDF(false);
  };

  const kpiSalud = useMemo(() => {
    const equiposGestionados = equipos.filter(e => e.desface !== null);
    const totalGestionados = equiposGestionados.length;
    if (totalGestionados === 0) return { saludable: 0, cumplimiento: 0, confiabilidad: 0, vencidos: 0 };
    const saludables = equiposGestionados.filter(e => e.desface! > 24).length;
    const vencidos = equiposGestionados.filter(e => e.desface! <= 0).length;
    const operativos = equipos.filter(e => e.status?.toLowerCase() === 'operativo').length;
    return {
      saludable: Math.round((saludables / totalGestionados) * 100),
      cumplimiento: Math.round(((totalGestionados - vencidos) / totalGestionados) * 100),
      confiabilidad: Math.round((operativos / equipos.length) * 100),
      vencidos: vencidos
    };
  }, [equipos]);

  const equiposAgrupados = useMemo(() => {
    const filtrados = equipos.filter(e => {
      let pasaKPI = true;
      if (filtroKPI === 'SALUDABLE') pasaKPI = e.desface !== null && e.desface > 24;
      if (filtroKPI === 'CUMPLIMIENTO') pasaKPI = e.desface !== null && e.desface > 0;
      if (filtroKPI === 'RIESGO') pasaKPI = e.desface !== null && e.desface <= 0;
      const txt = busqueda.toLowerCase();
      return pasaKPI && (!busqueda || e.placaRodaje?.toLowerCase().includes(txt) || e.codigoEquipo?.toLowerCase().includes(txt));
    });
    const grupos: Record<string, EquipoEstado[]> = {};
    filtrados.filter(e => e.desface !== null).forEach(eq => {
      const cat = (eq.descripcionEquipo || 'OTROS').toUpperCase();
      if (!grupos[cat]) grupos[cat] = [];
      grupos[cat].push(eq);
    });
    Object.keys(grupos).forEach(key => grupos[key].sort((a, b) => (a.desface || 0) - (b.desface || 0)));
    return grupos;
  }, [equipos, filtroKPI, busqueda]);

  const guardarLectura = async () => {
    if (!equipoSeleccionado) return;
    const hInicio = Number(form.inicio);
    const hFinal = Number(form.final);
    if (!form.final || hFinal <= hInicio) { alert("La nueva lectura debe ser mayor a la anterior"); return; }
    setEnviando(true)
    try {
      const ts = new Date().toISOString();
      await supabase.from('horometro').insert([{ placaRodaje: equipoSeleccionado.placaRodaje, horaInicio: hInicio, horaFinal: hFinal, horasOperacion: hFinal - hInicio, horometroMayor: hFinal, created_at: ts }]);
      await supabase.from('reporte_diario').insert([{ placa_rodaje: equipoSeleccionado.placaRodaje, fecha: form.fecha, horometro_inicial: hInicio, horometro_final: hFinal, descripcion: 'Actualización desde Salud de Flota' }]);
      await supabase.from('maestroEquipos').update({ horometroMayor: hFinal, ultima_fecha: ts }).eq('placaRodaje', equipoSeleccionado.placaRodaje);
      await fetchEstadoActual();
      setEquipoSeleccionado(null);
      alert("✅ Horómetro sincronizado");
    } catch (err) { alert("Error al guardar") } finally { setEnviando(false) }
  }

  const abrirModal = (equipo: EquipoEstado) => {
    setEquipoSeleccionado(equipo)
  }

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-white"><Loader2 className="animate-spin text-blue-600" size={32} /></div>

  return (
    <main className="min-h-screen bg-[#F8FAFC] text-slate-900 font-sans p-2">
      <div className="max-w-[1700px] mx-auto space-y-4">
        <nav className="flex justify-between items-center bg-white p-4 rounded-3xl border border-slate-100 shadow-sm">
          <div className="flex items-center gap-4">
            <button onClick={() => router.back()} className="p-2 text-slate-400 hover:text-blue-600 transition-all"><ArrowLeft size={20} /></button>
            <h1 className="text-xl font-black text-slate-800 uppercase">Panel de Salud</h1>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={exportarPDFMural} disabled={generandoPDF} className="flex items-center gap-2 bg-rose-600 hover:bg-rose-700 text-white px-4 py-2.5 rounded-2xl text-[10px] font-black uppercase transition-all shadow-lg shadow-rose-100">
              {generandoPDF ? <Loader2 size={14} className="animate-spin" /> : <FileText size={14} />} PDF Mural
            </button>
            <div className="relative w-80">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300" size={16} />
              <input onChange={(e) => setBusqueda(e.target.value)} placeholder="Unidad..." className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-100 rounded-2xl text-xs font-bold outline-none shadow-inner" />
            </div>
          </div>
        </nav>

        <div className="grid grid-cols-4 gap-3">
          <KPIButton label="Salud" value={`${kpiSalud.saludable}%`} active={filtroKPI === 'SALUDABLE'} onClick={() => setFiltroKPI('SALUDABLE')} color="emerald" />
          <KPIButton label="Plan" value={`${kpiSalud.cumplimiento}%`} active={filtroKPI === 'CUMPLIMIENTO'} onClick={() => setFiltroKPI('CUMPLIMIENTO')} color="blue" />
          <div className="p-4 bg-white rounded-3xl border border-slate-100 shadow-sm"><p className="text-[8px] font-black uppercase opacity-60">Flota OK</p><p className="text-xl font-black">{kpiSalud.confiabilidad}%</p></div>
          <KPIButton label="Vencidos" value={kpiSalud.vencidos} active={filtroKPI === 'RIESGO'} onClick={() => setFiltroKPI('RIESGO')} color="rose" />
        </div>

        <div className="bg-white rounded-[2rem] border border-slate-100 shadow-sm overflow-hidden">
          <div className="bg-slate-50 px-6 py-2 border-b border-slate-100 flex justify-between items-center">
            <div className="flex items-center gap-2"><LayoutGrid size={14} className="text-slate-400" /><span className="text-[10px] font-black text-slate-500 uppercase">Monitor de Flota</span></div>
            {filtroKPI !== 'TODOS' && <button onClick={() => setFiltroKPI('TODOS')} className="text-[9px] font-black text-blue-600 bg-blue-50 px-2 py-1 rounded-lg">Ver Todos</button>}
          </div>
          <div className="p-3 grid grid-cols-2 gap-3 bg-slate-50/20 max-h-[calc(100vh-200px)] overflow-y-auto">
            {Object.entries(equiposAgrupados).map(([descripcion, lista]) => (
              <div key={descripcion} className="bg-white p-3 rounded-[1.5rem] border border-slate-100 shadow-sm">
                <h3 className="text-[9px] font-black text-slate-400 uppercase mb-2 flex items-center gap-2 leading-none"><Box size={10} className="text-blue-500" /> {descripcion}</h3>
                <div className="grid grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-1">
                  {lista.map(eq => {
                    const color = eq.desface! <= 0 ? 'bg-rose-500' : eq.desface! <= 24 ? 'bg-amber-500' : 'bg-emerald-500';
                    return (
                      <button key={eq.placaRodaje} onClick={() => abrirModal(eq)} className="flex flex-col border border-slate-100 rounded-lg overflow-hidden active:scale-95 transition-all">
                        <div className="bg-slate-50 py-0.5 text-[7px] font-black text-slate-500 truncate px-1 uppercase">{eq.codigoEquipo}</div>
                        <div className={`${color} py-0.5 text-[9px] font-mono font-black text-white`}>{eq.desface?.toFixed(1)}</div>
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-md bg-slate-900/40">
          <div className="relative bg-white w-full max-w-4xl rounded-[3rem] shadow-2xl border border-slate-100 flex flex-col md:flex-row overflow-hidden animate-in zoom-in-95 duration-200">

            {/* LADO IZQUIERDO: EL MISMO CARD MAESTRO + INFO MP */}
            <div className="w-full md:w-1/2 p-10 bg-slate-50/50 border-r border-slate-100">
              <div className="flex justify-between items-start mb-6">
                <div className="space-y-1">
                  <span className="text-[10px] font-black text-blue-600 uppercase tracking-widest bg-blue-50 px-2 py-0.5 rounded-lg">{equipoSeleccionado.codigoEquipo}</span>
                  <h3 className="text-3xl font-black text-slate-800 font-mono tracking-tighter uppercase leading-none">{equipoSeleccionado.placaRodaje}</h3>
                </div>
                <button onClick={() => setEquipoSeleccionado(null)} className="md:hidden text-slate-300"><X /></button>
              </div>

              {/* INFO DE MANTENIMIENTO INTEGRADA */}
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div className="p-4 bg-white rounded-3xl border border-slate-100 shadow-sm text-center">
                  <p className="text-[8px] font-black text-blue-500 uppercase mb-1 flex items-center justify-center gap-1"><Target size={10} /> Próximo MP</p>
                  <p className="text-lg font-black text-slate-700 font-mono italic">{equipoSeleccionado.ProxHoroKmMp || '---'}</p>
                  <p className="text-[7px] font-bold text-slate-400 uppercase mt-0.5">{equipoSeleccionado.tipoProxMp}</p>
                </div>
                <div className={`p-4 rounded-3xl border shadow-sm text-center ${equipoSeleccionado.desface! <= 0 ? 'bg-rose-50 border-rose-100' : 'bg-emerald-50 border-emerald-100'}`}>
                  <p className={`text-[8px] font-black uppercase mb-1 ${equipoSeleccionado.desface! <= 0 ? 'text-rose-500' : 'text-emerald-500'}`}>Horas Restantes</p>
                  <p className={`text-lg font-black font-mono ${equipoSeleccionado.desface! <= 0 ? 'text-rose-600' : 'text-emerald-600'}`}>{equipoSeleccionado.desface?.toFixed(1)}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 mb-6">
                <MetricBox label="Horómetro" value={equipoSeleccionado.horometroMayor || 0} sub={equipoSeleccionado.ultima_fecha || '---'} icon={<Activity size={14} />} />
                <MetricBox label="Disponibilidad" value={`${equipoSeleccionado.disponibilidad?.toFixed(1)}%`} sub={equipoSeleccionado.status || '---'} icon={<ShieldCheck size={14} />} critical={equipoSeleccionado.disponibilidad! < 85} />
              </div>

              <div className="grid grid-cols-2 gap-3 mb-6">
                <MiniMetric label="TPEF" value={equipoSeleccionado.tpef?.toFixed(1) || '0'} icon={<Clock size={12} />} color="blue" />
                <MiniMetric label="TPPR" value={equipoSeleccionado.tppr?.toFixed(1) || '0'} icon={<Wrench size={12} />} color="amber" />
              </div>

              <div className="grid grid-cols-2 gap-y-4 text-[11px] mb-6 bg-white p-6 rounded-[2rem] border border-slate-100">
                <DataField label="Modelo" value={`${equipoSeleccionado.marca} ${equipoSeleccionado.modelo}`} />
                <DataField label="Serie" value={equipoSeleccionado.serieMotor} mono />
                <DataField label="Ubicación" value={equipoSeleccionado.ubic} icon={<MapPin size={12} className="text-blue-500" />} />
                <DataField label="Proyecto" value={equipoSeleccionado.proyecto} />
              </div>

              <button onClick={() => router.push(`/eventos?placa=${equipoSeleccionado.placaRodaje}`)} className="w-full py-4 bg-slate-900 text-white rounded-2xl font-black text-xs uppercase tracking-widest flex items-center justify-center gap-3 hover:bg-blue-600 transition-all shadow-xl">
                <Construction size={18} /> Registrar Intervención
              </button>
            </div>

            {/* LADO DERECHO: FORMULARIO DE SINCRONIZACIÓN */}
            <div className="w-full md:w-1/2 p-10 relative bg-white flex flex-col justify-center">
              <button onClick={() => setEquipoSeleccionado(null)} className="hidden md:block absolute right-8 top-8 text-slate-300 hover:text-rose-500 transition-all"><X size={28} /></button>
              <div className="text-center mb-8">
                <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-[1.5rem] flex items-center justify-center mx-auto mb-4 shadow-inner"><Gauge size={32} /></div>
                <h4 className="text-xs font-black text-slate-800 uppercase tracking-widest leading-none">Sincronización de Lectura</h4>
              </div>

              <div className="space-y-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4">Fecha de lectura</label>
                  <input type="date" value={form.fecha} onChange={(e) => setForm({ ...form, fecha: e.target.value })} className="w-full p-4 bg-slate-50 border-none rounded-2xl font-black text-slate-700 outline-none focus:ring-4 ring-blue-50 text-center" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center space-y-2">
                    <label className="text-[9px] font-black text-slate-300 uppercase">Anterior</label>
                    <div className="p-4 bg-slate-50 rounded-2xl font-black text-slate-400 font-mono text-xl">{form.inicio}</div>
                  </div>
                  <div className="text-center space-y-2">
                    <label className="text-[9px] font-black text-blue-600 uppercase">Nueva</label>
                    <input required type="number" step="0.1" value={form.final} onChange={(e) => setForm({ ...form, final: e.target.value })} className="w-full p-4 bg-blue-50 border-none rounded-2xl text-center font-black text-blue-700 outline-none focus:ring-4 ring-blue-100 font-mono text-xl" placeholder="0.0" />
                  </div>
                </div>
                <button onClick={guardarLectura} disabled={enviando} className="w-full bg-blue-600 text-white py-5 rounded-2xl font-black uppercase text-xs shadow-xl active:scale-95 transition-all flex items-center justify-center gap-3">
                  {enviando ? <Loader2 className="animate-spin" /> : <><Save size={18} /> Sincronizar Horómetro</>}
                </button>
                <div className="space-y-2">
                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2 leading-none"><History size={14} /> Últimos Movimientos</p>
                  {historialModal.map(h => (
                    <div key={h.id} className="flex justify-between items-center p-3 bg-slate-50 rounded-2xl border border-slate-100">
                      <div><p className="text-[10px] font-black text-slate-700 font-mono">{h.horaFinal} h</p><p className="text-[8px] font-bold text-slate-400 uppercase">{new Date(h.created_at).toLocaleDateString()}</p></div>
                      <div className="text-[10px] font-black text-emerald-500 bg-emerald-50 px-2 py-0.5 rounded-lg">+{h.horasOperacion} h</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </main>
  )
}

function KPIButton({ label, value, active, onClick, color }: any) {
  const themes: any = {
    emerald: active ? 'bg-emerald-600 text-white shadow-xl' : 'bg-white text-slate-800',
    blue: active ? 'bg-blue-600 text-white shadow-xl' : 'bg-white text-slate-800',
    rose: active ? 'bg-rose-600 text-white shadow-xl' : 'bg-white text-slate-800',
  }
  return (
    <button onClick={onClick} className={`p-4 rounded-3xl border border-slate-100 shadow-sm text-left transition-all ${themes[color]}`}>
      <p className="text-[8px] font-black uppercase opacity-60 mb-1">{label}</p>
      <p className="text-xl font-black">{value}</p>
    </button>
  )
}

function MetricBox({ label, value, sub, icon, critical }: any) {
  return (
    <div className={`p-5 rounded-[2rem] border ${critical ? 'bg-rose-50 border-rose-100' : 'bg-slate-50 border-slate-100'}`}>
      <div className="flex items-center gap-2 mb-2 text-slate-400">
        {icon} <span className="text-[9px] font-black uppercase tracking-widest">{label}</span>
      </div>
      <p className={`text-xl font-black ${critical ? 'text-rose-600' : 'text-slate-700'} font-mono`}>{value}</p>
      <p className="text-[8px] font-bold text-slate-400 uppercase mt-1 italic">{sub}</p>
    </div>
  )
}

function MiniMetric({ label, value, icon, color }: any) {
  const base = color === 'blue' ? 'bg-blue-50/50 border-blue-100 text-blue-600' : 'bg-amber-50/50 border-amber-100 text-amber-600';
  return (
    <div className={`p-3 rounded-2xl border ${base} flex flex-col justify-center`}>
      <div className="flex items-center gap-2 mb-1 opacity-70">
        {icon} <span className="text-[8px] font-black uppercase">{label}</span>
      </div>
      <p className="text-xs font-black text-slate-700">{value} <span className="text-[7px] font-normal lowercase tracking-tight">h/m</span></p>
    </div>
  )
}

function DataField({ label, value, mono, icon }: any) {
  return (
    <div className="space-y-1">
      <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none">{label}</p>
      <div className="flex items-center gap-2">
        {icon}
        <p className={`text-slate-700 font-bold text-[10px] ${mono ? 'font-mono' : ''}`}>{value || '---'}</p>
      </div>
    </div>
  )
}