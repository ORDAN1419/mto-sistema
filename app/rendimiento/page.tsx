"use client"
import React, { useEffect, useState, Suspense, useRef, useCallback } from 'react' // ✅ React agregado para Fragment
import { supabase } from '@/lib/supabase'
import * as XLSX from 'xlsx'
import {
  Calendar, ChevronLeft, LayoutDashboard, AlertTriangle, ChevronDown, ChevronUp,
  CheckCircle2, RefreshCcw, Clock, Settings, Plus, X, Trash2, Search, Gauge, Upload, Download, Truck, Save, Wrench, Info
} from 'lucide-react'
import { useRouter } from 'next/navigation'

// ✅ FUNCIÓN PARA OBTENER FECHA LOCAL REAL
const obtenerFechaHoyLocal = () => {
  const ahora = new Date();
  const anio = ahora.getFullYear();
  const mes = String(ahora.getMonth() + 1).padStart(2, '0');
  const dia = String(ahora.getDate()).padStart(2, '0');
  return `${anio}-${mes}-${dia}`;
};

// --- INTERFACES ---
interface MaestroEquipo {
  placaRodaje: string;
  codigoEquipo: string | null;
}

export default function RendimientoPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center bg-[#F8FAFC]"><RefreshCcw className="animate-spin text-blue-600" size={48} /></div>}>
      <RendimientoContent />
    </Suspense>
  )
}

function RendimientoContent() {
  const router = useRouter()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [data, setData] = useState<any[]>([])
  const [eventosDetalle, setEventosDetalle] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [expandedRow, setExpandedRow] = useState<string | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [selectedId, setSelectedId] = useState<string | null>(null)

  const [eventoSeleccionado, setEventoSeleccionado] = useState<any>(null)
  const [isDetalleEventoOpen, setIsDetalleEventoOpen] = useState(false)

  const [mesSeleccionado, setMesSeleccionado] = useState(obtenerFechaHoyLocal().slice(0, 7))
  const [filtroPlaca, setFiltroPlaca] = useState('')

  const [busquedaPlaca, setBusquedaPlaca] = useState('')
  const [sugerencias, setSugerencias] = useState<MaestroEquipo[]>([])

  const initialFormState = {
    fecha: obtenerFechaHoyLocal(),
    placa_rodaje: '',
    horometro_inicial: '' as any,
    horometro_final: '' as any,
    inspeccion: 0, manto_prev: 0, manto_prog: 0, manto_ctvo: 0, repara_acc: 0, stand_by: 0, n_fallas: 0, descripcion: ''
  }

  const [formData, setFormData] = useState(initialFormState)

  const fetchEventosDetalle = async () => {
    const { data: res } = await supabase.from('historial_eventos').select('*');
    if (res) setEventosDetalle(res);
  }

  const fetchRendimiento = async () => {
    try {
      setLoading(true);
      const [year, month] = mesSeleccionado.split('-').map(Number);
      let query = supabase.from('vista_rendimiento_acumulado').select('*')
        .gte('fecha', `${mesSeleccionado}-01`)
        .lt('fecha', month === 12 ? `${year + 1}-01-01` : `${year}-${String(month + 1).padStart(2, '0')}-01`)
        .order('fecha', { ascending: true });

      if (filtroPlaca) query = query.ilike('placa_rodaje', `%${filtroPlaca}%`);
      const { data: res, error } = await query;
      if (error) throw error;
      setData(res || []);
      await fetchEventosDetalle();
    } catch (err: any) { console.error(err.message) }
    finally { setLoading(false) }
  }

  useEffect(() => { fetchRendimiento() }, [mesSeleccionado, filtroPlaca])

  const toggleRow = (id: string) => {
    setExpandedRow(expandedRow === id ? null : id);
  }

  const abrirModalDetalle = (ev: any) => {
    setEventoSeleccionado(ev);
    setIsDetalleEventoOpen(true);
  }

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary', cellDates: true });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const rawJson: any[] = XLSX.utils.sheet_to_json(ws);
        const jsonProcesado = rawJson.map(fila => {
          let f = fila.FECHA || fila.fecha || fila.Date || fila.DATE;
          if (f instanceof Date) f = f.toISOString().split('T')[0];
          return {
            fecha: f,
            placa_rodaje: String(fila.PLACA || fila.placa || fila.placa_rodaje || '').toUpperCase().trim(),
            horometro_inicial: Number(fila.INICIAL || fila.h_inicial || fila.horometro_inicial || 0),
            horometro_final: Number(fila.FINAL || fila.h_final || fila.horometro_final || 0),
            inspeccion: 0, manto_prev: 0, manto_prog: 0, manto_ctvo: 0, repara_acc: 0, stand_by: 0, n_fallas: 0
          };
        }).filter(item => item.placa_rodaje !== "" && item.fecha);
        if (confirm(`¿Subir ${jsonProcesado.length} registros?`)) {
          const { error } = await supabase.from('reporte_diario').insert(jsonProcesado);
          if (error) throw error;
          fetchRendimiento();
        }
      } catch (err: any) { alert(err.message); }
      finally { if (fileInputRef.current) fileInputRef.current.value = ""; }
    };
    reader.readAsBinaryString(file);
  };

  const handleSelectEquipo = (equipo: MaestroEquipo) => {
    setFormData({ ...formData, placa_rodaje: equipo.placaRodaje });
    setBusquedaPlaca(equipo.placaRodaje);
    setSugerencias([]);
  }

  const handleEdit = (item: any, e: React.MouseEvent) => {
    e.stopPropagation();
    setFormData({ ...item });
    setBusquedaPlaca(item.placa_rodaje || '');
    setSelectedId(item.id);
    setIsEditing(true);
    setIsModalOpen(true);
  }

  const closeAndReset = () => {
    setIsModalOpen(false); setIsEditing(false); setSelectedId(null);
    setFormData(initialFormState); setBusquedaPlaca(''); setSugerencias([]);
  }

  const handleGuardar = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload = {
        ...formData,
        horometro_inicial: parseFloat(formData.horometro_inicial) || 0,
        horometro_final: parseFloat(formData.horometro_final) || 0
      };
      if (isEditing && selectedId) {
        const { error } = await supabase.from('reporte_diario').update(payload).eq('id', selectedId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('reporte_diario').insert([payload]);
        if (error) throw error;
      }
      closeAndReset(); fetchRendimiento();
    } catch (err: any) { alert(err.message) }
  }

  const handleEliminar = async () => {
    if (!selectedId || !confirm("¿Eliminar este registro de horómetro?")) return;
    try {
      const { error } = await supabase.from('reporte_diario').delete().eq('id', selectedId);
      if (error) throw error;
      closeAndReset(); fetchRendimiento();
    } catch (err: any) { alert(err.message) }
  }

  const buscarPlacas = useCallback(async (termino: string) => {
    if (!termino) { setSugerencias([]); return; }
    try {
      const { data: res, error } = await supabase.from('maestroEquipos').select('placaRodaje, codigoEquipo').or(`placaRodaje.ilike.%${termino}%,codigoEquipo.ilike.%${termino}%`).limit(6);
      if (!error && res) setSugerencias(res);
    } catch (e) { console.error(e) }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => buscarPlacas(busquedaPlaca), 200);
    return () => clearTimeout(timer);
  }, [busquedaPlaca, buscarPlacas]);

  const totalHorasTrabajo = data.reduce((acc, item) => acc + Number(item.horas_trabajo || 0), 0);
  const totalFallas = data.reduce((acc, item) => acc + Number(item.n_fallas || 0), 0);
  const totalCtvo = data.reduce((acc, item) => acc + Number(item.manto_ctvo || 0), 0);
  const totalParadasManto = data.reduce((acc, item) => acc + Number(item.inspeccion) + Number(item.manto_prev) + Number(item.manto_prog) + Number(item.manto_ctvo), 0);
  const horasTotalesPeriodo = data.length * 24;
  const tpef = totalFallas > 0 ? (totalHorasTrabajo / totalFallas).toFixed(2) : "0.00";
  const tppr = totalFallas > 0 ? (totalCtvo / totalFallas).toFixed(2) : "0.00";
  const dmValue = horasTotalesPeriodo > 0 ? (((horasTotalesPeriodo - totalParadasManto) / horasTotalesPeriodo) * 100).toFixed(2) : "0.00";
  const utilValue = (horasTotalesPeriodo - totalParadasManto) > 0 ? ((totalHorasTrabajo / (horasTotalesPeriodo - totalParadasManto)) * 100).toFixed(2) : "0.00";

  return (
    <main className="min-h-screen bg-[#F8FAFC] p-4 md:p-8 text-slate-900 font-sans">
      <div className="max-w-[1600px] mx-auto space-y-6">
        {/* HEADER */}
        <div className="flex flex-col lg:flex-row justify-between items-center gap-6 bg-white p-6 rounded-[2rem] shadow-sm border border-slate-200">
          <div className="flex items-center gap-4">
            <button onClick={() => router.push('/equipos')} className="p-3 hover:bg-slate-100 rounded-xl text-slate-400 transition-colors"><ChevronLeft /></button>
            <h1 className="text-xl font-black uppercase tracking-tight text-slate-800">Rendimiento Operativo</h1>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
              <input type="text" placeholder="BUSCAR PLACA..." value={filtroPlaca || ''} onChange={(e) => setFiltroPlaca(e.target.value.toUpperCase())}
                className="pl-10 pr-4 py-3 bg-slate-50 border border-slate-100 rounded-xl text-xs font-bold focus:ring-2 ring-blue-500 outline-none w-44" />
            </div>
            <input type="month" value={mesSeleccionado || ''} onChange={(e) => setMesSeleccionado(e.target.value)} className="p-3 bg-slate-50 border border-slate-100 rounded-xl text-sm font-bold outline-none cursor-pointer" />
            <input type="file" ref={fileInputRef} className="hidden" accept=".xlsx, .xls" onChange={handleFileUpload} />
            <button onClick={() => fileInputRef.current?.click()} title="Excel" className="p-3 bg-emerald-50 text-emerald-600 border border-emerald-100 rounded-xl hover:bg-emerald-600 hover:text-white transition-all shadow-sm"><Upload size={20} /></button>
            <button onClick={() => { setIsEditing(false); setFormData(initialFormState); setIsModalOpen(true); }} className="bg-slate-900 text-white px-6 py-3 rounded-xl flex items-center gap-2 text-xs font-bold uppercase tracking-widest active:scale-95 transition-all"><Plus size={18} /> Nuevo Registro</button>
          </div>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
          <DataCard label="TPEF (Hrs)" val={tpef} icon={<Clock />} color="text-blue-600" bg="bg-blue-50" />
          <DataCard label="TPPR (Hrs)" val={tppr} icon={<AlertTriangle />} color="text-rose-600" bg="bg-rose-50" />
          <DataCard label="DISP. MEC (%)" val={dmValue} icon={<Settings />} color="text-emerald-600" bg="bg-emerald-50" border="border-b-4 border-b-emerald-500" />
          <DataCard label="UTIL (%)" val={utilValue} icon={<Gauge />} color="text-indigo-600" bg="bg-indigo-50" border="border-b-4 border-b-indigo-500" />
          <DataCard label="FALLAS" val={totalFallas} icon={<LayoutDashboard />} color="text-amber-600" bg="bg-amber-50" />
          <DataCard label="HRS OPER" val={totalHorasTrabajo.toFixed(2)} icon={<CheckCircle2 />} color="text-slate-600" bg="bg-slate-50" />
        </div>

        {/* TABLA CON ACORDEÓN */}
        <div className="bg-white rounded-[2rem] shadow-sm border border-slate-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-[11px]">
              <thead>
                <tr className="bg-slate-900 text-white uppercase font-black tracking-wider text-center">
                  <th className="px-4 py-4 text-left">HIST.</th>
                  <th className="px-4 py-4 text-left">FECHA</th>
                  <th className="px-4 py-4 text-left">UNIDAD</th>
                  <th className="px-4 py-4">H. INI</th>
                  <th className="px-4 py-4">H. FIN</th>
                  <th className="px-4 py-4 bg-blue-800">HRS TRAB</th>
                  <th className="px-2 py-4">INSP</th>
                  <th className="px-2 py-4">PREV</th>
                  <th className="px-2 py-4">PROG</th>
                  <th className="px-2 py-4 text-rose-300">CTVO</th>
                  <th className="px-2 py-4">ACC</th>
                  <th className="px-2 py-4">S.BY</th>
                  <th className="px-4 py-4 bg-emerald-800">D.M.%</th>
                  <th className="px-4 py-4 bg-indigo-800">% UTIL</th>
                  <th className="px-4 py-4">OPC</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-bold text-slate-600">
                {data.map((item, idx) => {
                  const esExpandido = expandedRow === item.id;
                  const relacionados = eventosDetalle.filter(e => e.placa === item.placa_rodaje && e.fecha_evento === item.fecha);

                  return (
                    <React.Fragment key={idx}>
                      <tr onClick={() => toggleRow(item.id)} className={`cursor-pointer transition-colors ${esExpandido ? 'bg-blue-50/20' : 'hover:bg-slate-50'}`}>
                        <td className="px-4 py-3 text-center">{relacionados.length > 0 ? (esExpandido ? <ChevronUp size={16} /> : <ChevronDown size={16} />) : null}</td>
                        <td className="px-4 py-3 whitespace-nowrap">{item.fecha}</td>
                        <td className="px-4 py-3"><span className="bg-slate-100 px-2 py-1 rounded text-slate-900 border border-slate-200 uppercase">{item.placa_rodaje}</span></td>
                        <td className="px-4 py-3 text-center">{item.horometro_inicial}</td>
                        <td className="px-4 py-3 text-center">{item.horometro_final}</td>
                        <td className="px-4 py-3 text-center bg-blue-50 text-blue-700 font-black">{Number(item.horas_trabajo).toFixed(2)}</td>
                        <td className="px-2 py-3 text-center">{item.inspeccion}</td>
                        <td className="px-2 py-3 text-center">{item.manto_prev}</td>
                        <td className="px-2 py-3 text-center">{item.manto_prog}</td>
                        <td className="px-2 py-3 text-center text-rose-500">{item.manto_ctvo}</td>
                        <td className="px-2 py-3 text-center">{item.repara_acc}</td>
                        <td className="px-2 py-3 text-center">{item.stand_by}</td>
                        <td className="px-4 py-3 text-center text-emerald-600 font-black">{item.dm_porcentaje}%</td>
                        <td className="px-4 py-3 text-center text-indigo-600 font-black">{item.util_porcentaje}%</td>
                        <td className="px-4 py-3 text-center"><button onClick={(e) => handleEdit(item, e)} className="p-2 text-slate-400 hover:text-blue-600"><Settings size={14} /></button></td>
                      </tr>

                      {/* ✅ ACORDEÓN CON ALINEACIÓN PRECISA BAJO COLUMNAS */}
                      {esExpandido && (
                        <tr className="bg-slate-50/50">
                          <td colSpan={15} className="p-0 border-l-4 border-l-blue-600 shadow-inner">
                            <div className="px-6 py-2 space-y-1">
                              {relacionados.map((ev, i) => (
                                <div key={i} onClick={() => abrirModalDetalle(ev)} className="flex items-center text-[10px] bg-white border border-slate-200 rounded-lg p-2 shadow-sm hover:border-blue-400 cursor-pointer group">
                                  {/* Tipo de Trabajo - Calza bajo HIST/FECHA */}
                                  <div className="w-[18%] font-black text-blue-600 uppercase flex items-center gap-2"><div className="w-1.5 h-1.5 rounded-full bg-blue-500"></div>{ev.tipoTrabajo}</div>

                                  {/* Sistema y Evento - Calza bajo UNIDAD/H.INI/H.FIN */}
                                  <div className="flex-grow font-bold text-slate-600 uppercase truncate pr-4">[{ev.sistema}] {ev.evento}</div>

                                  {/* ✅ BLOQUE DE DURACIONES: Calza bajo INSP, PREV, PROG, CTVO, ACC */}
                                  <div className="flex w-[26%] justify-around items-center font-black">
                                    <div className={`w-8 text-center ${ev.tipoTrabajo === 'INSPECCION' ? 'text-blue-600 bg-blue-50 rounded' : 'text-slate-200'}`}>{ev.tipoTrabajo === 'INSPECCION' ? ev.duracion : '-'}</div>
                                    <div className={`w-8 text-center ${ev.tipoTrabajo === 'MTTO. PREV' ? 'text-blue-600 bg-blue-50 rounded' : 'text-slate-200'}`}>{ev.tipoTrabajo === 'MTTO. PREV' ? ev.duracion : '-'}</div>
                                    <div className={`w-8 text-center ${ev.tipoTrabajo === 'MTTO. PROG' ? 'text-blue-600 bg-blue-50 rounded' : 'text-slate-100'}`}>{ev.tipoTrabajo === 'MTTO. PROG' ? ev.duracion : '-'}</div>
                                    <div className={`w-8 text-center ${ev.tipoTrabajo === 'MTTO. CORRECTIVO' ? 'text-rose-600 bg-rose-50 rounded' : 'text-slate-100'}`}>{ev.tipoTrabajo === 'MTTO. CORRECTIVO' ? ev.duracion : '-'}</div>
                                    <div className={`w-8 text-center ${ev.tipoTrabajo === 'ACCIDENTE' ? 'text-rose-600 bg-rose-50 rounded' : 'text-slate-100'}`}>{ev.tipoTrabajo === 'ACCIDENTE' ? ev.duracion : '-'}</div>
                                  </div>
                                  <div className="w-[4%] flex justify-end"><Info size={14} className="text-slate-300 group-hover:text-blue-500" /></div>
                                </div>
                              ))}
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* ✅ MODAL DE INFORMACIÓN TÉCNICA RICA */}
        {isDetalleEventoOpen && eventoSeleccionado && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/80 backdrop-blur-md p-4 animate-in fade-in duration-200">
            <div className="bg-white w-full max-w-lg rounded-[2.5rem] shadow-2xl border border-slate-100 overflow-hidden">
              <div className="bg-slate-900 p-6 flex justify-between items-center text-white">
                <div className="flex items-center gap-3"><Wrench size={20} className="text-blue-400" /><h2 className="font-black uppercase text-sm tracking-widest leading-none">Información Detallada</h2></div>
                <button onClick={() => setIsDetalleEventoOpen(false)}><X size={24} /></button>
              </div>
              <div className="p-8 space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 shadow-inner">
                    <p className="text-[9px] font-black text-slate-400 uppercase mb-1">Unidad / Placa</p>
                    <p className="text-sm font-black text-slate-800 tracking-tighter">{eventoSeleccionado.placa}</p>
                  </div>
                  <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 shadow-inner">
                    <p className="text-[9px] font-black text-slate-400 uppercase mb-1">Horómetro Evento</p>
                    <p className="text-sm font-black text-blue-600 font-mono">{eventoSeleccionado.horometro}</p>
                  </div>
                </div>
                <div className="space-y-4">
                  <div>
                    <p className="text-[9px] font-black text-slate-400 uppercase ml-2 mb-1">Sistema y Clasificación</p>
                    <div className="flex gap-2">
                      <span className="px-3 py-1.5 bg-blue-600 text-white rounded-lg text-[10px] font-black uppercase">{eventoSeleccionado.tipoTrabajo}</span>
                      <span className="px-3 py-1.5 bg-slate-100 text-slate-800 rounded-lg text-[10px] font-black uppercase border border-slate-200">{eventoSeleccionado.sistema}</span>
                    </div>
                  </div>
                  <div>
                    <p className="text-[9px] font-black text-slate-400 uppercase ml-2 mb-1">Relato Técnico del Evento</p>
                    <div className="p-5 bg-blue-50/30 rounded-2xl text-xs text-slate-600 italic leading-relaxed border border-blue-50">"{eventoSeleccionado.evento}"</div>
                  </div>
                </div>
                <div className="flex justify-between items-center p-4 bg-slate-900 text-white rounded-2xl shadow-xl">
                  <div className="text-center flex-1 border-r border-slate-700">
                    <p className="text-[8px] font-black opacity-60 uppercase mb-1 tracking-widest">Técnico Resp.</p>
                    <p className="text-xs font-black uppercase tracking-tight">{eventoSeleccionado.tecnico}</p>
                  </div>
                  <div className="text-center flex-1">
                    <p className="text-[8px] font-black opacity-60 uppercase mb-1 tracking-widest">Duración Total</p>
                    <p className="text-xs font-black text-emerald-400">{eventoSeleccionado.duracion} Horas</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* MODAL DE EDICIÓN - PRESERVADO */}
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
            <div className="bg-white w-full max-w-md rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col">
              <div className="bg-slate-900 p-6 flex justify-between items-center text-white font-black uppercase text-xs tracking-widest leading-none">
                <div className="flex items-center gap-3"><Truck size={18} className="text-blue-400" /><span>{isEditing ? 'Actualizar' : 'Nuevo Registro'}</span></div>
                <button onClick={closeAndReset}><X size={20} /></button>
              </div>
              <form onSubmit={handleGuardar} className="p-8 space-y-6">
                <div className="space-y-1 relative">
                  <label className="text-[10px] font-black uppercase text-slate-400 ml-2 tracking-widest leading-none">Unidad</label>
                  <div className="relative group">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-blue-500 transition-colors" size={18} />
                    {/* ✅ FIX BUSCADOR: Al escribir llama a setBusquedaPlaca para activar el buscador predictivo */}
                    <input
                      required
                      type="text"
                      placeholder="Filtrar placa..."
                      value={busquedaPlaca || ''}
                      onChange={(e) => {
                        const val = e.target.value.toUpperCase();
                        setBusquedaPlaca(val);
                        setFormData({ ...formData, placa_rodaje: val });
                      }}
                      className="w-full pl-12 p-4 bg-slate-50 border-2 border-transparent focus:border-blue-500 focus:bg-white rounded-2xl font-black text-sm outline-none transition-all shadow-inner"
                    />
                  </div>
                  {sugerencias.length > 0 && (
                    <div className="absolute top-full left-0 right-0 bg-white border border-slate-200 rounded-2xl shadow-2xl z-[70] mt-2 overflow-hidden animate-in fade-in zoom-in-95">
                      {sugerencias.map((eq) => (
                        <div key={eq.placaRodaje} onClick={() => handleSelectEquipo(eq)} className="p-4 hover:bg-blue-50 cursor-pointer flex justify-between items-center border-b last:border-0 border-slate-100 transition-colors group">
                          <span className="font-black text-xs text-slate-700 group-hover:text-blue-600">{eq.placaRodaje}</span><span className="text-[9px] bg-slate-100 px-2 py-1 rounded-md font-bold text-slate-400 uppercase tracking-tighter">{eq.codigoEquipo || 'S/C'}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase text-slate-400 ml-2 tracking-widest leading-none">Fecha</label>
                  <input required type="date" value={formData.fecha || ''} onChange={(e) => setFormData({ ...formData, fecha: e.target.value })} className="w-full p-4 bg-slate-50 border-2 border-transparent focus:border-blue-500 focus:bg-white rounded-2xl font-bold text-sm outline-none shadow-inner" />
                </div>
                <div className="grid grid-cols-2 gap-4 bg-blue-50/50 p-5 rounded-[2rem] border border-blue-100 shadow-inner">
                  <div className="space-y-1 text-center">
                    <label className="text-[10px] font-black uppercase text-blue-600 mb-1 block tracking-widest leading-none">H. Inicial</label>
                    <input required type="number" step="any" placeholder="0.00" value={formData.horometro_inicial ?? ''} onChange={(e) => setFormData({ ...formData, horometro_inicial: e.target.value })} className="w-full p-4 bg-white border-2 border-transparent focus:border-blue-500 rounded-2xl font-black text-xl text-center outline-none text-blue-700 shadow-sm transition-all" />
                  </div>
                  <div className="space-y-1 text-center">
                    <label className="text-[10px] font-black uppercase text-blue-600 mb-1 block tracking-widest leading-none">H. Final</label>
                    <input required type="number" step="any" placeholder="0.00" value={formData.horometro_final ?? ''} onChange={(e) => setFormData({ ...formData, horometro_final: e.target.value })} className="w-full p-4 bg-white border-2 border-transparent focus:border-blue-500 rounded-2xl font-black text-xl text-center outline-none text-blue-700 shadow-sm transition-all" />
                  </div>
                </div>
                <div className="flex gap-4 pt-2">
                  <button type="submit" className="w-full bg-slate-900 text-white p-5 rounded-[1.5rem] font-black uppercase text-[10px] tracking-widest hover:bg-blue-600 transition-all shadow-xl flex items-center justify-center gap-3 active:scale-[0.98]"><Save size={18} /> {isEditing ? 'Actualizar' : 'Guardar'}</button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </main>
  )
}

function DataCard({ label, val, unit, icon, color, bg, border }: any) {
  return (
    <div className={`bg-white p-4 rounded-[1.5rem] shadow-sm border border-slate-200 flex flex-col justify-between hover:shadow-md transition-all ${border || ''}`}>
      <div className="flex items-center gap-3 mb-2">
        <div className={`p-2 ${bg} ${color} rounded-lg`}>{icon}</div>
        <p className="text-[9px] font-black uppercase text-slate-400 tracking-widest leading-none">{label}</p>
      </div>
      <h3 className={`text-xl font-black ${color}`}>{val} <span className="text-[10px] text-slate-400 uppercase font-bold">{unit}</span></h3>
    </div>
  )
}