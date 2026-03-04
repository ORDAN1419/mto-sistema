"use client"
import React, { useEffect, useState, Suspense, useRef, useCallback, useMemo } from 'react'
import { supabase } from '@/lib/supabase'
import * as XLSX from 'xlsx'
import {
  Calendar, ChevronLeft, LayoutDashboard, AlertTriangle, ChevronDown, ChevronUp,
  CheckCircle2, RefreshCcw, Clock, Settings, Plus, X, Trash2, Search, Gauge, Truck, Save, Lock, Unlock, ClipboardList, HelpCircle, ArrowLeft
} from 'lucide-react'
import { useRouter } from 'next/navigation'

const obtenerFechaHoyLocal = () => {
  const ahora = new Date();
  const anio = ahora.getFullYear();
  const mes = String(ahora.getMonth() + 1).padStart(2, '0');
  const dia = String(ahora.getDate()).padStart(2, '0');
  return `${anio}-${mes}-${dia}`;
};

interface MaestroEquipo {
  placaRodaje: string;
  codigoEquipo: string | null;
  descripcionEquipo?: string | null;
}

export default function RendimientoPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center bg-[#f7f9fa]"><RefreshCcw className="animate-spin text-[#0070b1]" size={48} /></div>}>
      <RendimientoContent />
    </Suspense>
  )
}

function RendimientoContent() {
  const router = useRouter()
  const inputPlacaConductorRef = useRef<HTMLInputElement>(null)
  const inputBusquedaPrincipalRef = useRef<HTMLInputElement>(null)

  // --- 1. ESTADOS ---
  const [data, setData] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [expandedRow, setExpandedRow] = useState<string | null>(null)
  const [isConductorModalOpen, setIsConductorModalOpen] = useState(false)
  const [isHelpModalOpen, setIsHelpModalOpen] = useState(false)
  const [busquedaPlacaConductor, setBusquedaPlacaConductor] = useState('')
  const [sugerenciasConductor, setSugerenciasConductor] = useState<MaestroEquipo[]>([])
  const [indexSelConductor, setIndexSelConductor] = useState(-1)

  const [formConductor, setFormConductor] = useState({
    placaRodaje: '', codigoEquipo: '', descripcionEquipo: '', horometroInicial: '',
    horometroFinal: '', detalleReporte: '', fechaReporte: obtenerFechaHoyLocal(), turno: 'T.D'
  })

  const [mesSeleccionado, setMesSeleccionado] = useState(obtenerFechaHoyLocal().slice(0, 7))
  const [diaSeleccionado, setDiaSeleccionado] = useState('')
  const [filtroGeneral, setFiltroGeneral] = useState('')
  const [fechaPrefijada, setFechaPrefijada] = useState(obtenerFechaHoyLocal())
  const [usarFechaPrefijada, setUsarFechaPrefijada] = useState(false)

  // --- 2. MEMOS Y CÁLCULOS ---
  const fechaCalculada = useMemo(() => usarFechaPrefijada ? fechaPrefijada : obtenerFechaHoyLocal(), [usarFechaPrefijada, fechaPrefijada]);
  const duracionConductorNum = useMemo(() => {
    const ini = parseFloat(formConductor.horometroInicial);
    const fin = parseFloat(formConductor.horometroFinal);
    return (!isNaN(ini) && !isNaN(fin)) ? fin - ini : 0;
  }, [formConductor.horometroInicial, formConductor.horometroFinal]);
  const duracionConductorStr = useMemo(() => duracionConductorNum.toFixed(2), [duracionConductorNum]);

  const totalHorasTrabajo = useMemo(() => data.reduce((acc, item) => acc + Number(item.horas_trabajo || 0), 0), [data]);
  const totalFallas = useMemo(() => data.reduce((acc, item) => acc + Number(item.n_fallas || 0), 0), [data]);
  const totalCtvo = useMemo(() => data.reduce((acc, item) => acc + Number(item.manto_ctvo || 0), 0), [data]);
  const totalParadasManto = useMemo(() => data.reduce((acc, item) =>
    acc + Number(item.inspeccion || 0) + Number(item.manto_prev || 0) + Number(item.manto_prog || 0) + Number(item.manto_ctvo || 0), 0), [data]);

  const horasTotalesPeriodo = data.length * 24;
  const tpef = totalFallas > 0 ? (totalHorasTrabajo / totalFallas).toFixed(2) : "0.00";
  const tppr = totalFallas > 0 ? (totalCtvo / totalFallas).toFixed(2) : "0.00";
  const dmValue = horasTotalesPeriodo > 0 ? (((horasTotalesPeriodo - totalParadasManto) / horasTotalesPeriodo) * 100).toFixed(2) : "0.00";
  const utilValue = (horasTotalesPeriodo - totalParadasManto) > 0 ? ((totalHorasTrabajo / (horasTotalesPeriodo - totalParadasManto)) * 100).toFixed(2) : "0.00";

  // --- 3. FUNCIONES LÓGICA ---
  const fetchRendimiento = useCallback(async (silencioso = false) => {
    try {
      if (!silencioso) setLoading(true);
      const [year, month] = mesSeleccionado.split('-').map(Number);
      let query = supabase.from('vista_rendimiento_acumulado').select('*');
      if (diaSeleccionado) { query = query.eq('fecha', diaSeleccionado); }
      else { query = query.gte('fecha', `${mesSeleccionado}-01`).lt('fecha', month === 12 ? `${year + 1}-01-01` : `${year}-${String(month + 1).padStart(2, '0')}-01`); }
      if (filtroGeneral) {
        const tLimpio = filtroGeneral.toUpperCase().replace(/[\s-]/g, '');
        query = query.or(`placa_rodaje.ilike.%${filtroGeneral}%,codigo_equipo.ilike.%${filtroGeneral}%,placa_rodaje.ilike.%${tLimpio}%,codigo_equipo.ilike.%${tLimpio}%`);
      }
      const { data: res, error } = await query.order('fecha', { ascending: true });
      if (error) throw error;
      setData(res || []);
    } catch (err: any) { console.error(err.message) }
    finally { setLoading(false) }
  }, [mesSeleccionado, diaSeleccionado, filtroGeneral]);

  const handleSelectConductor = useCallback((eq: MaestroEquipo) => {
    setFormConductor(prev => ({ ...prev, placaRodaje: eq.placaRodaje, codigoEquipo: eq.codigoEquipo || '', descripcionEquipo: eq.descripcionEquipo || '' }));
    setBusquedaPlacaConductor(eq.placaRodaje);
    setSugerenciasConductor([]);
    setIndexSelConductor(-1);
  }, []);

  const handleGuardarConductor = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (duracionConductorNum > 24) return;
    try {
      const { error } = await supabase.from('reportesConductor').insert([{
        ...formConductor,
        horometroInicial: parseFloat(formConductor.horometroInicial),
        horometroFinal: parseFloat(formConductor.horometroFinal)
      }]);
      if (error) throw error;
      setFormConductor({ placaRodaje: '', codigoEquipo: '', descripcionEquipo: '', horometroInicial: '', horometroFinal: '', detalleReporte: '', fechaReporte: fechaCalculada, turno: 'T.D' });
      setBusquedaPlacaConductor('');
      setIsConductorModalOpen(false);
      fetchRendimiento(true);
      alert("✅ Transacción registrada.");
    } catch (err: any) { alert(err.message) }
  };

  // --- 4. EFECTOS ---
  useEffect(() => { fetchRendimiento() }, [fetchRendimiento]);

  useEffect(() => {
    const timer = setTimeout(async () => {
      if (!busquedaPlacaConductor) { setSugerenciasConductor([]); return; }
      const t = busquedaPlacaConductor.replace(/[\s-]/g, '').toUpperCase();
      const { data } = await supabase.from('maestroEquipos').select('placaRodaje, codigoEquipo, descripcionEquipo').or(`placaRodaje.ilike.%${t}%,codigoEquipo.ilike.%${t}%`).limit(5);
      if (data) setSugerenciasConductor(data);
    }, 150);
    return () => clearTimeout(timer);
  }, [busquedaPlacaConductor]);

  useEffect(() => {
    if (isConductorModalOpen) {
      setTimeout(() => inputPlacaConductorRef.current?.focus(), 100);
    }
  }, [isConductorModalOpen]);

  useEffect(() => {
    setFormConductor(prev => ({ ...prev, fechaReporte: fechaCalculada }));
  }, [fechaCalculada]);

  // --- 5. ATAJOS ---
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.key === '1') { e.preventDefault(); router.push('/historial-horometro'); }
      if (e.ctrlKey && e.key === '2') { e.preventDefault(); router.push('/bdrepuestos'); }
      if (e.ctrlKey && e.key === '3') { e.preventDefault(); router.push('/estatus'); }
      if (e.ctrlKey && e.key === '4') { e.preventDefault(); router.push('/repuestos'); }
      if (e.ctrlKey && e.key === '0') { e.preventDefault(); router.push('/equipos'); }
      if (e.ctrlKey && e.key === 'm') { e.preventDefault(); router.push('/mtto/consolidado'); }

      if (e.altKey && e.key === '1') { e.preventDefault(); setIsConductorModalOpen(p => !p); }
      if (e.altKey && e.key === '2') { if (isConductorModalOpen) { e.preventDefault(); document.getElementById('btnGuardarConductor')?.click(); } }
      if (e.altKey && e.key.toLowerCase() === 'q') { e.preventDefault(); fetchRendimiento(true); }
      if (e.altKey && e.key.toLowerCase() === 's') { e.preventDefault(); inputBusquedaPrincipalRef.current?.focus(); }

      // ✅ ALT + X CORREGIDO: Solo limpia filtros, no los datos cargados.
      if (e.altKey && e.key.toLowerCase() === 'x') {
        e.preventDefault();
        setFiltroGeneral('');
        setDiaSeleccionado('');
        setMesSeleccionado(obtenerFechaHoyLocal().slice(0, 7));
      }

      if (e.altKey && e.key.toLowerCase() === 'h') { e.preventDefault(); setIsHelpModalOpen(p => !p); }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isConductorModalOpen, fechaCalculada, fetchRendimiento, router]);

  const toggleRow = (id: string) => setExpandedRow(expandedRow === id ? null : id);

  return (
    <main className="min-h-screen bg-[#f7f9fa] text-[#32363a] font-sans">

      {/* SAP SHELL BAR */}
      <nav className="bg-[#354a5f] h-12 flex items-center px-4 justify-between shadow-md sticky top-0 z-50">
        <div className="flex items-center gap-4 text-white">
          <ArrowLeft size={18} onClick={() => router.back()} className="cursor-pointer hover:opacity-70" />
          <div className="h-6 w-px bg-white/20" />
          <span className="font-bold text-xs tracking-wider uppercase italic leading-none">Rendimiento Operativo | SAP S/4HANA</span>
        </div>
        <div className="flex items-center gap-4">
          <HelpCircle size={20} className="text-white opacity-80 cursor-pointer hover:opacity-100" onClick={() => setIsHelpModalOpen(true)} />
          <div className="w-8 h-8 rounded bg-white/10 flex items-center justify-center font-bold text-white text-[10px] border border-white/20 uppercase">AD</div>
        </div>
      </nav>

      <div className="p-4 space-y-4">

        {/* SAP FILTER BAR */}
        <div className="bg-white border border-[#d3d7d9] p-4 flex flex-col md:flex-row items-end gap-6 shadow-sm rounded-sm">
          <div className="flex items-center gap-3 border-r border-[#d3d7d9] pr-6">
            <button onClick={() => setUsarFechaPrefijada(!usarFechaPrefijada)} className={`p-2.5 rounded-sm border transition-all ${usarFechaPrefijada ? 'bg-[#0070b1] text-white border-[#005a8e]' : 'bg-white text-slate-400 border-[#d3d7d9]'}`}>
              {usarFechaPrefijada ? <Lock size={16} /> : <Unlock size={16} />}
            </button>
            <div className="flex flex-col text-left leading-none">
              <span className="text-[10px] font-bold text-[#6a6d70] uppercase mb-1">Pre-fijar Fecha</span>
              <input type="date" value={fechaPrefijada} onChange={(e) => setFechaPrefijada(e.target.value)} className={`bg-transparent text-xs font-black outline-none border-b border-transparent focus:border-[#0070b1] ${!usarFechaPrefijada && 'opacity-30 pointer-events-none'}`} disabled={!usarFechaPrefijada} />
            </div>
          </div>

          <div className="flex-grow flex flex-col gap-2 w-full text-left">
            <label className="text-[11px] font-bold text-[#6a6d70] uppercase leading-none">Búsqueda Global</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[#0070b1]" size={16} />
              <input
                ref={inputBusquedaPrincipalRef}
                value={filtroGeneral}
                onChange={(e) => setFiltroGeneral(e.target.value.toUpperCase())}
                placeholder="Filtrar por Placa o Código [ALT+S]..."
                className="w-full border-b border-[#b0b3b5] focus:border-[#0070b1] outline-none pl-10 py-1.5 text-sm transition-all bg-transparent"
              />
            </div>
          </div>

          <div className="flex gap-4">
            <div className="flex flex-col gap-1 text-left leading-none">
              <span className="text-[10px] font-bold text-[#6a6d70] uppercase">MES</span>
              <input type="month" value={mesSeleccionado} onChange={(e) => setMesSeleccionado(e.target.value)} className="border border-[#b0b3b5] p-1 text-xs rounded-sm outline-none focus:border-[#0070b1] bg-white font-bold" />
            </div>
            <div className="flex flex-col gap-1 text-left leading-none">
              <span className="text-[10px] font-bold text-[#6a6d70] uppercase">DÍA</span>
              <input type="date" value={diaSeleccionado} onChange={(e) => setDiaSeleccionado(e.target.value)} className="border border-[#b0b3b5] p-1 text-xs rounded-sm outline-none focus:border-[#0070b1] bg-white font-bold" />
            </div>
          </div>

          <button onClick={() => setIsConductorModalOpen(true)} className="bg-[#0070b1] text-white px-5 py-2.5 rounded-sm text-xs font-bold uppercase shadow-sm hover:bg-[#005a8e] transition-all flex items-center gap-2 active:scale-95">
            <ClipboardList size={16} /> Checklist Diario [ALT+1]
          </button>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          <SapKpiCard label="TPEF (Hrs)" val={tpef} icon={<Clock size={16} />} color="blue" />
          <SapKpiCard label="TPPR (Hrs)" val={tppr} icon={<AlertTriangle size={16} />} color="rose" />
          <SapKpiCard label="DISP. MEC (%)" val={`${dmValue}%`} icon={<Settings size={16} />} color="emerald" />
          <SapKpiCard label="UTIL (%)" val={`${utilValue}%`} icon={<Gauge size={16} />} color="indigo" />
          <SapKpiCard label="FALLAS TOTAL" val={totalFallas} icon={<LayoutDashboard size={16} />} color="amber" />
          <SapKpiCard label="HRS OPERATIVAS" val={totalHorasTrabajo.toFixed(2)} icon={<CheckCircle2 size={16} />} color="slate" />
        </div>

        {/* TABLA PRINCIPAL */}
        <div className="bg-white border border-[#d3d7d9] shadow-sm rounded-sm overflow-hidden text-center">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-[#f2f4f5] text-[#6a6d70] border-b border-[#d3d7d9] font-bold uppercase tracking-tighter">
                  <th className="p-3 text-center w-12 tracking-tighter">REF</th>
                  <th className="p-3">FECHA</th>
                  <th className="p-3">UNIDAD LOGÍSTICA</th>
                  <th className="p-3 text-right">LECT. INICIAL</th>
                  <th className="p-3 text-right">LECT. FINAL</th>
                  <th className="p-3 text-center bg-[#e7f0f7] text-[#0070b1]">HRS OPER.</th>
                  <th className="p-2 text-center">INSP</th>
                  <th className="p-2 text-center">PREV</th>
                  <th className="p-2 text-center">PROG</th>
                  <th className="p-2 text-center text-rose-600">CTVO</th>
                  <th className="p-2 text-center text-emerald-600 font-bold tracking-tighter">DISP %</th>
                  <th className="p-2 text-center text-indigo-600 font-bold tracking-tighter">UTIL %</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#d3d7d9]">
                {data.map((item, idx) => (
                  <tr key={idx} className="hover:bg-[#f2f9ff] transition-colors border-b border-[#f2f4f5]">
                    <td className="p-2 text-center text-[#0070b1] cursor-pointer" onClick={() => setExpandedRow(expandedRow === item.id ? null : item.id)}>
                      {expandedRow === item.id ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                    </td>
                    <td className="p-3 whitespace-nowrap font-mono text-[11px] text-left">{item.fecha}</td>
                    <td className="p-3 text-left">
                      <div className="flex flex-col leading-tight">
                        <span className="font-bold text-[#32363a] uppercase tracking-tighter leading-none mb-1">{item.placa_rodaje}</span>
                        <span className="text-[10px] text-slate-400 font-bold uppercase leading-none">{item.codigo_equipo || 'ID_LOG_NULL'}</span>
                      </div>
                    </td>
                    <td className="p-3 text-right font-mono text-slate-500">{item.horometro_inicial}</td>
                    <td className="p-3 text-right font-mono text-slate-500">{item.horometro_final}</td>
                    <td className="p-3 text-center bg-[#f2f9ff] text-[#0070b1] font-bold font-mono">{Number(item.horas_trabajo).toFixed(2)}</td>
                    <td className="p-2 text-center text-[#6a6d70]">{item.inspeccion}</td>
                    <td className="p-2 text-center text-[#6a6d70]">{item.manto_prev}</td>
                    <td className="p-2 text-center text-[#6a6d70]">{item.manto_prog}</td>
                    <td className="p-2 text-center text-rose-500 font-bold">{item.manto_ctvo}</td>
                    <td className="p-2 text-center text-emerald-600 font-black font-mono">{item.dm_porcentaje}%</td>
                    <td className="p-2 text-center text-indigo-600 font-black font-mono">{item.util_porcentaje}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="bg-[#f2f4f5] p-2 px-4 border-t border-[#d3d7d9] flex justify-between text-[10px] font-bold text-[#6a6d70]">
            <span>ENTRADAS ENCONTRADAS: {data.length}</span>
            <span className="uppercase tracking-widest italic text-right">SAP S/4HANA Public Cloud System</span>
          </div>
        </div>

        {/* MODAL CONDUCTOR */}
        {isConductorModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-[#354a5f]/60 backdrop-blur-sm p-4 text-left leading-none">
            <div className="bg-white w-full max-w-lg rounded-sm shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 border border-[#d3d7d9]">
              <div className="bg-[#354a5f] p-4 flex justify-between items-center text-white">
                <div className="flex items-center gap-3 leading-none text-left">
                  <ClipboardList size={20} />
                  <h3 className="font-bold uppercase text-xs tracking-widest leading-none text-left">Registrar Entrada Logística</h3>
                </div>
                <X size={24} className="cursor-pointer hover:opacity-70" onClick={() => setIsConductorModalOpen(false)} />
              </div>
              <form onSubmit={handleGuardarConductor} className="p-6 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex flex-col gap-2 relative text-left">
                    <label className="text-[10px] font-bold text-[#6a6d70] uppercase leading-none">Unidad de Transporte (Placa)</label>
                    <input
                      ref={inputPlacaConductorRef}
                      required
                      value={busquedaPlacaConductor}
                      onChange={(e) => { setBusquedaPlacaConductor(e.target.value.toUpperCase()); setIndexSelConductor(-1); }}
                      onKeyDown={(e) => {
                        if (e.key === 'ArrowDown') { setIndexSelConductor(p => Math.min(p + 1, sugerenciasConductor.length - 1)); e.preventDefault(); }
                        if (e.key === 'ArrowUp') { setIndexSelConductor(p => Math.max(p - 1, -1)); e.preventDefault(); }
                        if (e.key === 'Enter' && indexSelConductor >= 0) { handleSelectConductor(sugerenciasConductor[indexSelConductor]); e.preventDefault(); }
                      }}
                      className="border border-[#b0b3b5] p-2 text-sm rounded-sm outline-none focus:border-[#0070b1] uppercase font-mono bg-slate-50 focus:bg-white"
                      placeholder="Ingrese Placa..."
                    />
                    {sugerenciasConductor.length > 0 && (
                      <div className="absolute top-full left-0 right-0 bg-white border border-[#d3d7d9] shadow-xl z-[110] rounded-sm overflow-hidden text-left">
                        {sugerenciasConductor.map((eq, i) => (
                          <div key={i} onClick={() => handleSelectConductor(eq)} className={`p-2 cursor-pointer text-xs uppercase border-b border-[#f2f4f5] text-left ${indexSelConductor === i ? 'bg-[#0070b1] text-white' : 'hover:bg-[#f2f9ff]'}`}>
                            <b>{eq.placaRodaje}</b> - <span className="opacity-70">{eq.codigoEquipo}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="flex flex-col gap-2 text-left leading-none">
                    <label className="text-[10px] font-bold text-[#6a6d70] uppercase leading-none">Turno Operativo</label>
                    <select value={formConductor.turno} onChange={(e) => setFormConductor({ ...formConductor, turno: e.target.value })} className="border border-[#b0b3b5] p-2 text-sm rounded-sm outline-none focus:border-[#0070b1] bg-slate-50 cursor-pointer">
                      <option value="T.D">SOLAR (T.D)</option><option value="T.N">LUNAR (T.N)</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="flex flex-col gap-2 text-center">
                    <label className="text-[10px] font-bold text-[#6a6d70] uppercase leading-none">Lectura Inicial</label>
                    <input required type="number" step="any" value={formConductor.horometroInicial} onChange={(e) => setFormConductor({ ...formConductor, horometroInicial: e.target.value })} className="border border-[#b0b3b5] p-2 text-lg text-center rounded-sm font-mono font-bold outline-none focus:border-[#0070b1] bg-white shadow-inner" />
                  </div>
                  <div className="flex flex-col gap-2 text-center">
                    <label className="text-[10px] font-bold text-[#6a6d70] uppercase leading-none">Lectura Final</label>
                    <input required type="number" step="any" value={formConductor.horometroFinal} onChange={(e) => setFormConductor({ ...formConductor, horometroFinal: e.target.value })} className="border border-[#b0b3b5] p-2 text-lg text-center rounded-sm font-mono font-bold outline-none focus:border-[#0070b1] bg-white shadow-inner" />
                  </div>
                </div>

                <div className={`p-4 border rounded-sm flex justify-between items-center ${duracionConductorNum > 24 ? 'bg-[#fff4f5] border-rose-200 animate-pulse' : 'bg-[#e7f0f7] border-[#0070b1]/10'}`}>
                  <span className="text-[10px] font-bold uppercase text-[#6a6d70] leading-none text-left">Delta Transacción:</span>
                  <span className={`text-xl font-black font-mono leading-none ${duracionConductorNum > 24 ? 'text-rose-600' : 'text-[#0070b1]'}`}>{duracionConductorStr} Hrs</span>
                </div>

                <div className="flex flex-col gap-2 text-left leading-none">
                  <label className="text-[10px] font-bold text-[#6a6d70] uppercase leading-none text-left">Notas / Comentarios</label>
                  <textarea value={formConductor.detalleReporte} onChange={(e) => setFormConductor({ ...formConductor, detalleReporte: e.target.value.toUpperCase() })} className="border border-[#b0b3b5] p-2 text-xs h-20 rounded-sm outline-none focus:border-[#0070b1] resize-none uppercase bg-slate-50 text-left" placeholder="SIN NOVEDADES..." />
                </div>

                <div className="flex flex-col gap-2 text-left leading-none">
                  <label className="text-[10px] font-bold text-[#6a6d70] uppercase leading-none text-left">Fecha Contable</label>
                  <input required type="date" value={formConductor.fechaReporte} onChange={(e) => setFormConductor({ ...formConductor, fechaReporte: e.target.value })} className="border border-[#b0b3b5] p-2 text-xs rounded-sm outline-none focus:border-[#0070b1] font-bold bg-slate-50" />
                </div>

                <button id="btnGuardarConductor" type="submit" disabled={duracionConductorNum > 24} className={`w-full py-4 rounded-sm font-black uppercase text-xs tracking-widest transition-all active:scale-95 shadow-md ${duracionConductorNum > 24 ? 'bg-slate-200 text-slate-400 cursor-not-allowed' : 'bg-[#0070b1] text-white hover:bg-[#005a8e]'}`}>
                  Sincronizar [ALT+2]
                </button>
              </form>
            </div>
          </div>
        )}

        {/* SAP HELP MODAL */}
        {isHelpModalOpen && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center bg-[#354a5f]/60 backdrop-blur-sm p-4 text-left leading-none">
            <div className="bg-white w-full max-w-sm rounded-sm shadow-2xl border border-[#d3d7d9] animate-in zoom-in-95 leading-none">
              <div className="bg-[#354a5f] p-4 flex justify-between items-center text-white text-left leading-none">
                <span className="font-bold text-xs uppercase tracking-widest leading-none text-left">Comandos del Sistema</span>
                <X size={20} className="cursor-pointer" onClick={() => setIsHelpModalOpen(false)} />
              </div>
              <div className="p-6 space-y-4 text-left leading-none">
                <ShortcutRow keys="CTRL + 1" label="Horómetros" />
                <ShortcutRow keys="CTRL + 2" label="Repuestos" />
                <ShortcutRow keys="CTRL + 3" label="Estatus Flota" />
                <div className="h-px bg-slate-100" />
                <ShortcutRow keys="ALT + 1" label="Abrir Checklist" />
                <ShortcutRow keys="ALT + S" label="Enfocar Filtro" />
                <ShortcutRow keys="ALT + Q" label="Refrescar Servidor" />
                <ShortcutRow keys="ALT + X" label="Borrar Filtros" />
                <ShortcutRow keys="ALT + H" label="Menú Ayuda" />
              </div>
            </div>
          </div>
        )}
      </div>
    </main>
  )
}

function SapKpiCard({ label, val, icon, color }: any) {
  const borderColors: any = { blue: 'border-l-4 border-l-[#0070b1]', rose: 'border-l-4 border-l-rose-500', emerald: 'border-l-4 border-l-emerald-500', indigo: 'border-l-4 border-l-indigo-500', amber: 'border-l-4 border-l-amber-500', slate: 'border-l-4 border-l-slate-400' }
  return (
    <div className={`bg-white p-3 border border-[#d3d7d9] rounded-sm shadow-sm flex items-center gap-3 ${borderColors[color]}`}>
      <div className="text-[#6a6d70]">{icon}</div>
      <div className="flex flex-col text-left leading-none">
        <span className="text-[9px] font-bold text-[#6a6d70] uppercase tracking-tighter mb-1 leading-none text-left">{label}</span>
        <span className="text-base font-bold text-[#32363a] font-mono leading-none text-left">{val}</span>
      </div>
    </div>
  )
}

function ShortcutRow({ keys, label }: { keys: string, label: string }) {
  return (
    <div className="flex justify-between items-center text-left leading-none mb-1">
      <span className="text-[10px] font-bold text-[#6a6d70] uppercase leading-none text-left">{label}</span>
      <span className="bg-[#f2f4f5] text-[#354a5f] px-2 py-1 rounded-sm text-[10px] font-black font-mono border border-[#d3d7d9] leading-none">{keys}</span>
    </div>
  )
}