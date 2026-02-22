"use client"
import { useEffect, useState, Suspense, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import * as XLSX from 'xlsx'
import { 
  Calendar, ChevronLeft, LayoutDashboard, AlertTriangle, 
  CheckCircle2, RefreshCcw, Clock, Settings, Plus, X, Trash2, Search, Gauge, Upload, Download
} from 'lucide-react'
import { useRouter } from 'next/navigation'

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
  const [loading, setLoading] = useState(true)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [mesSeleccionado, setMesSeleccionado] = useState(new Date().toISOString().split('-').slice(0, 2).join('-'))
  const [filtroPlaca, setFiltroPlaca] = useState('')

  const initialFormState = {
    fecha: new Date().toISOString().split('T')[0],
    placa_rodaje: '',
    horometro_inicial: 0,
    horometro_final: 0,
    inspeccion: 0,
    manto_prev: 0,
    manto_prog: 0,
    manto_ctvo: 0,
    repara_acc: 0,
    stand_by: 0,
    n_fallas: 0,
    descripcion: ''
  }

  const [formData, setFormData] = useState(initialFormState)

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
          let f = fila.DATE || fila.fecha || fila.FECHA;
          if (typeof f === 'number') {
            const d = new Date(Math.round((f - 25569) * 86400 * 1000));
            f = d.toISOString().split('T')[0];
          } else if (f instanceof Date) {
            f = f.toISOString().split('T')[0];
          }

          return {
            fecha: f,
            placa_rodaje: String(fila.PLACA || fila.placa_rodaje || '').toUpperCase(),
            horometro_inicial: Number(fila['H. INICIAL'] || fila.horometro_inicial || 0),
            horometro_final: Number(fila['H. FINAL'] || fila.horometro_final || 0),
            inspeccion: Number(fila.INSP || fila.inspeccion || 0),
            manto_prev: Number(fila.PREV || fila.manto_prev || 0),
            manto_prog: Number(fila.PROG || fila.manto_prog || 0),
            manto_ctvo: Number(fila.CTVO || fila.manto_ctvo || 0),
            repara_acc: Number(fila.ACC || fila.repara_acc || 0),
            stand_by: Number(fila.STBY || fila.stand_by || 0),
            n_fallas: Number(fila.FALLAS || fila['N° FALLAS'] || 0),
            descripcion: String(fila.DESCRIPCION || fila.descripcion || '')
          };
        });
        
        if (confirm(`¿Importar ${jsonProcesado.length} registros?`)) {
          const { error } = await supabase.from('reporte_diario').insert(jsonProcesado);
          if (error) throw error;
          fetchRendimiento();
          alert("Importado con éxito");
        }
      } catch (err: any) { alert("Error: " + err.message) }
      finally { if (fileInputRef.current) fileInputRef.current.value = "" }
    };
    reader.readAsBinaryString(file);
  };
  // AQUÍ TERMINA EL PEGADO


  // --- LÓGICA DE CÁLCULO PARA TARJETAS (INDICADORES TOTALES) ---
  const totalHorasTrabajo = data.reduce((acc, item) => acc + (Number(item.horometro_final) - Number(item.horometro_inicial)), 0);
  const totalFallas = data.reduce((acc, item) => acc + Number(item.n_fallas), 0);
  const totalCtvo = data.reduce((acc, item) => acc + Number(item.manto_ctvo), 0);
  
  const totalParadasManto = data.reduce((acc, item) => 
    acc + Number(item.inspeccion) + Number(item.manto_prev) + Number(item.manto_prog) + Number(item.manto_ctvo), 0);

  const horasTotalesPeriodo = data.length * 24;

  const tpef = totalFallas > 0 ? (totalHorasTrabajo / totalFallas).toFixed(2) : "0.00";
  const tppr = totalFallas > 0 ? (totalCtvo / totalFallas).toFixed(2) : "0.00";
  
  const dmValue = horasTotalesPeriodo > 0 
    ? (((horasTotalesPeriodo - totalParadasManto) / horasTotalesPeriodo) * 100).toFixed(2) 
    : "0.00";

  const denominadorUtil = horasTotalesPeriodo - totalParadasManto;
  const utilValue = denominadorUtil > 0 
    ? ((totalHorasTrabajo / denominadorUtil) * 100).toFixed(2) 
    : "0.00";

  // --- FETCH DATA ---
  const fetchRendimiento = async () => {
    try {
      setLoading(true);
      const [year, month] = mesSeleccionado.split('-').map(Number);
      let query = supabase.from('reporte_diario').select('*')
        .gte('fecha', `${mesSeleccionado}-01`)
        .lt('fecha', month === 12 ? `${year + 1}-01-01` : `${year}-${String(month + 1).padStart(2, '0')}-01`)
        .order('fecha', { ascending: true });

      if (filtroPlaca) query = query.ilike('placa_rodaje', `%${filtroPlaca}%`);

      const { data: res, error } = await query;
      if (error) throw error;
      setData(res || []);
    } catch (err: any) { console.error(err.message) } finally { setLoading(false) }
  }

  useEffect(() => { fetchRendimiento() }, [mesSeleccionado, filtroPlaca])

  // --- LÓGICA EXCEL: DESCARGAR CON FORMATO CORPORATIVO AZUL ---
const descargarExcelPorPlacas = () => {
    if (data.length === 0) return alert("No hay datos para exportar.");
    
    const wb = XLSX.utils.book_new();
    const placasUnicas = Array.from(new Set(data.map(item => item.placa_rodaje)));

    // --- BLOQUE 1: CREAR E INSERTAR EL HISTORIAL PRIMERO (Para que sea la pestaña #1) ---
    const headerHistorial = [
      ["HISTORIAL GENERAL DE HORÓMETROS"],
      ["PERIODO:", mesSeleccionado],
      [],
      ["FECHA", "PLACA", "H_ INICIO", "H_FINAL", "H_OPE"]
    ];

    const historialOrdenado = [...data].sort((a, b) => new Date(a.fecha).getTime() - new Date(b.fecha).getTime());

    const bodyHistorial = historialOrdenado.map((item) => [
      item.fecha, 
      item.placa_rodaje, 
      item.horometro_inicial,
      item.horometro_final, 
      (Number(item.horometro_final) - Number(item.horometro_inicial)).toFixed(2) || "0.00"
    ]);

    const wsHistorial = XLSX.utils.aoa_to_sheet([...headerHistorial, ...bodyHistorial]);
    // AL INSERTARLO AQUÍ, QUEDA EN LA PRIMERA POSICIÓN
    XLSX.utils.book_append_sheet(wb, wsHistorial, "HISTORIAL_HOROMETROS");


    // --- BLOQUE 2: LUEGO INSERTAR LAS PESTAÑAS POR PLACA ---
    placasUnicas.forEach(placa => {
      const registros = data.filter(item => item.placa_rodaje === placa);
      
      const p_horasTrabajo = registros.reduce((acc, item) => acc + (Number(item.horometro_final) - Number(item.horometro_inicial)), 0);
      const p_fallas = registros.reduce((acc, item) => acc + Number(item.n_fallas), 0);
      const p_ctvo = registros.reduce((acc, item) => acc + Number(item.manto_ctvo), 0);
      const p_mantoTotal = registros.reduce((acc, item) => 
        acc + Number(item.inspeccion) + Number(item.manto_prev) + Number(item.manto_prog) + Number(item.manto_ctvo), 0);
      const p_horasPeriodo = registros.length * 24;

      const p_dm = p_horasPeriodo > 0 ? (((p_horasPeriodo - p_mantoTotal) / p_horasPeriodo) * 100).toFixed(2) : "0.00";
      const p_util = (p_horasPeriodo - p_mantoTotal) > 0 ? ((p_horasTrabajo / (p_horasPeriodo - p_mantoTotal)) * 100).toFixed(2) : "0.00";
      const p_tpef = p_fallas > 0 ? (p_horasTrabajo / p_fallas).toFixed(2) : "0.00";
      const p_tppr = p_fallas > 0 ? (p_ctvo / p_fallas).toFixed(2) : "0.00";

      const headerRend = [
        ["RENDIMIENTO DEL EQUIPO"],
        ["CLIENTE:", "MISKIMAYO", "UNIDAD:", "BAYOVAR", "PLACA:", placa],
        [],
        ["DATE", "H. INICIAL", "H. FINAL", "HRS TRAB", "INSP", "PREV", "PROG", "CTVO", "ACC", "STBY", "D.M.", "% UTIL", "FALLAS", "DESCRIPCION"]
      ];

      const bodyRend = registros.map(item => {
        const hT = Number(item.horometro_final - item.horometro_inicial);
        const hM = Number(item.inspeccion + item.manto_prev + item.manto_prog + item.manto_ctvo);
        return [
          item.fecha, item.horometro_inicial, item.horometro_final, hT,
          item.inspeccion, item.manto_prev, item.manto_prog, item.manto_ctvo,
          item.repara_acc, item.stand_by, 
          (((24 - hM) / 24) * 100).toFixed(2) + "%", 
          (24 - hM) > 0 ? ((hT / (24 - hM)) * 100).toFixed(2) + "%" : "0%",
          item.n_fallas, item.descripcion || ""
        ];
      });

      const footerRend = [
        [],
        ["INDICADORES RESUMEN - " + placa],
        ["DISP. MECÁNICA (DM)", p_dm + "%"],
        ["UTILIZACIÓN (% UTIL)", p_util + "%"],
        ["TPEF (CONFIABILIDAD)", p_tpef + " Hrs"],
        ["TPPR (MANTENIBILIDAD)", p_tppr + " Hrs"],
        ["TOTAL FALLAS", p_fallas]
      ];

      const wsRend = XLSX.utils.aoa_to_sheet([...headerRend, ...bodyRend, ...footerRend]);
      XLSX.utils.book_append_sheet(wb, wsRend, `${placa.slice(0, 25)}`);
    });

    XLSX.writeFile(wb, `Reporte_Equipos_${mesSeleccionado}.xlsx`);
};

  const handleEdit = (item: any) => {
    setFormData({ ...item });
    setSelectedId(item.id);
    setIsEditing(true);
    setIsModalOpen(true);
  }

  const closeAndReset = () => {
    setIsModalOpen(false);
    setIsEditing(false);
    setSelectedId(null);
    setFormData(initialFormState);
  }

  const handleGuardar = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (isEditing && selectedId) {
        const { error } = await supabase.from('reporte_diario').update(formData).eq('id', selectedId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('reporte_diario').insert([formData]);
        if (error) throw error;
      }
      closeAndReset();
      fetchRendimiento();
    } catch (err: any) { alert(err.message) }
  }

  const handleEliminar = async () => {
    if (!selectedId || !confirm("¿Eliminar reporte?")) return;
    try {
      const { error } = await supabase.from('reporte_diario').delete().eq('id', selectedId);
      if (error) throw error;
      closeAndReset();
      fetchRendimiento();
    } catch (err: any) { alert(err.message) }
  }

  return (
    <main className="min-h-screen bg-[#F8FAFC] p-4 md:p-8 text-slate-900">
      <div className="max-w-[1600px] mx-auto space-y-6">
        
        {/* HEADER */}
        <div className="flex flex-col lg:flex-row justify-between items-center gap-6 bg-white p-6 rounded-[2rem] shadow-sm border border-slate-200">
          <div className="flex items-center gap-4">
            <button onClick={() => router.push('/equipos')} className="p-3 hover:bg-slate-100 rounded-xl text-slate-400 transition-colors"><ChevronLeft /></button>
            <div>
              <h1 className="text-xl font-black uppercase tracking-tight leading-none">Rendimiento Operativo</h1>
              <p className="text-[10px] font-bold text-slate-400 mt-1 uppercase tracking-widest">Indicadores de Gestión de Flota</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
              <input type="text" placeholder="BUSCAR PLACA..." value={filtroPlaca} onChange={(e) => setFiltroPlaca(e.target.value.toUpperCase())}
                className="pl-10 pr-4 py-3 bg-slate-50 border border-slate-100 rounded-xl text-xs font-bold focus:ring-2 ring-blue-500 outline-none w-44 transition-all" />
            </div>
            
            <input type="month" value={mesSeleccionado} onChange={(e) => setMesSeleccionado(e.target.value)} className="p-3 bg-slate-50 border border-slate-100 rounded-xl text-sm font-bold outline-none cursor-pointer" />
            
            <div className="flex items-center gap-2">
              <button onClick={descargarExcelPorPlacas} title="Descargar Reporte por Pestañas" className="p-3 bg-blue-50 text-blue-600 border border-blue-100 rounded-xl hover:bg-blue-600 hover:text-white transition-all shadow-sm">
                <Download size={20} />
              </button>

              <input type="file" ref={fileInputRef} className="hidden" accept=".xlsx, .xls" onChange={handleFileUpload} />
              <button onClick={() => fileInputRef.current?.click()} title="Subir Excel" className="p-3 bg-emerald-50 text-emerald-600 border border-emerald-100 rounded-xl hover:bg-emerald-600 hover:text-white transition-all shadow-sm">
                <Upload size={20} />
              </button>
            </div>

            <button onClick={() => { setIsEditing(false); setFormData(initialFormState); setIsModalOpen(true); }} className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-3 rounded-xl flex items-center gap-2 text-xs font-bold uppercase tracking-widest transition-all shadow-lg shadow-blue-200">
              <Plus size={18} /> Nuevo Registro
            </button>
          </div>
        </div>

        {/* PANEL DE INDICADORES (6 TARJETAS) */}
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
          <div className="bg-white p-4 rounded-[1.5rem] shadow-sm border border-slate-200 flex flex-col justify-between hover:shadow-md transition-all">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-blue-50 text-blue-600 rounded-lg"><Clock size={18} /></div>
              <p className="text-[9px] font-black uppercase text-slate-400 tracking-widest">TPEF (ENTRE FALLAS)</p>
            </div>
            <h3 className="text-xl font-black text-slate-900">{tpef} <span className="text-[10px] text-slate-400 uppercase">Hrs</span></h3>
          </div>

          <div className="bg-white p-4 rounded-[1.5rem] shadow-sm border border-slate-200 flex flex-col justify-between hover:shadow-md transition-all">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-rose-50 text-rose-600 rounded-lg"><AlertTriangle size={18} /></div>
              <p className="text-[9px] font-black uppercase text-slate-400 tracking-widest">TPPR (REPARACIÓN)</p>
            </div>
            <h3 className="text-xl font-black text-slate-900">{tppr} <span className="text-[10px] text-slate-400 uppercase">Hrs</span></h3>
          </div>

          <div className="bg-white p-4 rounded-[1.5rem] shadow-sm border border-slate-200 flex flex-col justify-between border-b-4 border-b-emerald-500 hover:shadow-md transition-all">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg"><Settings size={18} /></div>
              <p className="text-[9px] font-black uppercase text-slate-400 tracking-widest">DISP. MECÁNICA</p>
            </div>
            <h3 className="text-xl font-black text-emerald-600">{dmValue}%</h3>
          </div>

          <div className="bg-white p-4 rounded-[1.5rem] shadow-sm border border-slate-200 flex flex-col justify-between border-b-4 border-b-indigo-500 hover:shadow-md transition-all">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg"><Gauge size={18} /></div>
              <p className="text-[9px] font-black uppercase text-slate-400 tracking-widest">% UTILIZACIÓN</p>
            </div>
            <h3 className="text-xl font-black text-indigo-600">{utilValue}%</h3>
          </div>

          <div className="bg-white p-4 rounded-[1.5rem] shadow-sm border border-slate-200 flex flex-col justify-between hover:shadow-md transition-all">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-amber-50 text-amber-600 rounded-lg"><LayoutDashboard size={18} /></div>
              <p className="text-[9px] font-black uppercase text-slate-400 tracking-widest">TOTAL FALLAS</p>
            </div>
            <h3 className="text-xl font-black text-slate-900">{totalFallas}</h3>
          </div>

          <div className="bg-white p-4 rounded-[1.5rem] shadow-sm border border-slate-200 flex flex-col justify-between hover:shadow-md transition-all">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-slate-50 text-slate-600 rounded-lg"><CheckCircle2 size={18} /></div>
              <p className="text-[9px] font-black uppercase text-slate-400 tracking-widest">HORAS OPERACIÓN</p>
            </div>
            <h3 className="text-xl font-black text-slate-900">{totalHorasTrabajo.toFixed(2)}</h3>
          </div>
        </div>

        {/* TABLA PRINCIPAL */}
        <div className="bg-white rounded-[2rem] shadow-sm border border-slate-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-[11px]">
              <thead>
                <tr className="bg-slate-900 text-white uppercase font-black tracking-wider">
                  <th className="px-4 py-4">FECHA</th>
                  <th className="px-4 py-4">UNIDAD</th>
                  <th className="px-4 py-4 text-center">H. INICIAL</th>
                  <th className="px-4 py-4 text-center">H. FINAL</th>
                  <th className="px-4 py-4 text-center bg-blue-800">HRS TRAB</th>
                  <th className="px-2 py-4 text-center">INSP</th>
                  <th className="px-2 py-4 text-center">PREV</th>
                  <th className="px-2 py-4 text-center">PROG</th>
                  <th className="px-2 py-4 text-center text-rose-300">CTVO</th>
                  <th className="px-2 py-4 text-center">ACC</th>
                  <th className="px-2 py-4 text-center">S.BY</th>
                  <th className="px-4 py-4 text-center bg-emerald-800">D.M.%</th>
                  <th className="px-4 py-4 text-center bg-indigo-800">% UTIL</th>
                  <th className="px-4 py-4 text-center">OPC</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-bold text-slate-600">
                {data.map((item, idx) => {
                  const hrsT = Number(item.horometro_final) - Number(item.horometro_inicial);
                  const hrsM = Number(item.inspeccion) + Number(item.manto_prev) + Number(item.manto_prog) + Number(item.manto_ctvo);
                  const dmP = (((24 - hrsM) / 24) * 100).toFixed(2);
                  const utP = (24 - hrsM) > 0 ? ((hrsT / (24 - hrsM)) * 100).toFixed(2) : "0.00";

                  return (
                    <tr key={idx} className="hover:bg-slate-50 transition-colors">
                      <td className="px-4 py-3">{item.fecha}</td>
                      <td className="px-4 py-3">
                        <span className="bg-slate-100 px-2 py-1 rounded text-slate-900 border border-slate-200 uppercase">{item.placa_rodaje}</span>
                      </td>
                      <td className="px-4 py-3 text-center">{item.horometro_inicial}</td>
                      <td className="px-4 py-3 text-center">{item.horometro_final}</td>
                      <td className="px-4 py-3 text-center bg-blue-50 text-blue-700 font-black">{hrsT.toFixed(2)}</td>
                      <td className="px-2 py-3 text-center">{item.inspeccion}</td>
                      <td className="px-2 py-3 text-center">{item.manto_prev}</td>
                      <td className="px-2 py-3 text-center">{item.manto_prog}</td>
                      <td className="px-2 py-3 text-center text-rose-500">{item.manto_ctvo}</td>
                      <td className="px-2 py-3 text-center">{item.repara_acc}</td>
                      <td className="px-2 py-3 text-center">{item.stand_by}</td>
                      <td className="px-4 py-3 text-center text-emerald-600 font-black">{dmP}%</td>
                      <td className="px-4 py-3 text-center text-indigo-600 font-black">{utP}%</td>
                      <td className="px-4 py-3 text-center">
                         <button onClick={() => handleEdit(item)} className="p-2 text-slate-400 hover:text-blue-600 transition-colors"><Settings size={14}/></button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* MODAL */}
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
            <div className="bg-white w-full max-w-3xl rounded-[2rem] shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
              <div className="bg-slate-900 p-6 flex justify-between items-center text-white">
                <h2 className="font-black uppercase text-sm tracking-widest flex items-center gap-2">
                  {isEditing ? <RefreshCcw size={16} className="text-blue-400" /> : <Plus size={16} />}
                  {isEditing ? `Editar: ${formData.placa_rodaje}` : 'Nuevo Registro Operativo'}
                </h2>
                <button onClick={closeAndReset} className="hover:rotate-90 transition-transform"><X /></button>
              </div>
              <form onSubmit={handleGuardar} className="p-8 grid grid-cols-4 gap-4">
                <div className="col-span-2 space-y-1">
                  <label className="text-[10px] font-bold uppercase text-slate-400">Unidad (Placa)</label>
                  <input required type="text" value={formData.placa_rodaje} onChange={(e) => setFormData({...formData, placa_rodaje: e.target.value.toUpperCase()})} className="w-full p-3 bg-slate-50 border border-slate-100 rounded-xl font-bold outline-none focus:ring-2 ring-blue-500 transition-all" />
                </div>
                <div className="col-span-2 space-y-1">
                  <label className="text-[10px] font-bold uppercase text-slate-400">Fecha</label>
                  <input required type="date" value={formData.fecha} onChange={(e) => setFormData({...formData, fecha: e.target.value})} className="w-full p-3 bg-slate-50 border border-slate-100 rounded-xl font-bold outline-none" />
                </div>
                <div className="col-span-2 space-y-1">
                  <label className="text-[10px] font-bold uppercase text-slate-400">Horómetro Inicial</label>
                  <input required type="number" step="0.01" value={formData.horometro_inicial} onChange={(e) => setFormData({...formData, horometro_inicial: Number(e.target.value)})} className="w-full p-3 bg-slate-50 border border-slate-100 rounded-xl font-bold outline-none" />
                </div>
                <div className="col-span-2 space-y-1">
                  <label className="text-[10px] font-bold uppercase text-slate-400">Horómetro Final</label>
                  <input required type="number" step="0.01" value={formData.horometro_final} onChange={(e) => setFormData({...formData, horometro_final: Number(e.target.value)})} className="w-full p-3 bg-blue-50 border-blue-200 rounded-xl font-bold outline-none" />
                </div>
                
                <div className="grid grid-cols-6 col-span-4 gap-2 bg-slate-50 p-4 rounded-2xl border border-slate-100">
                   {['inspeccion', 'manto_prev', 'manto_prog', 'manto_ctvo', 'repara_acc', 'stand_by'].map((field) => (
                     <div key={field} className="space-y-1">
                       <label className="text-[9px] font-bold uppercase text-slate-500">{field.replace('manto_', '').slice(0, 4)}</label>
                       <input type="number" step="0.01" className="w-full p-2 border border-slate-200 rounded-lg text-center font-bold text-xs focus:bg-white transition-colors outline-none" 
                        value={(formData as any)[field]} onChange={(e) => setFormData({...formData, [field]: Number(e.target.value)})} />
                     </div>
                   ))}
                </div>

                <div className="col-span-2 space-y-1">
                  <label className="text-[10px] font-bold uppercase text-slate-400">N° Fallas</label>
                  <input type="number" value={formData.n_fallas} onChange={(e) => setFormData({...formData, n_fallas: Number(e.target.value)})} className="w-full p-3 bg-slate-50 border border-slate-100 rounded-xl font-bold outline-none focus:ring-2 ring-amber-500 transition-all" />
                </div>
                
                <div className="col-span-4 space-y-1">
                  <label className="text-[10px] font-bold uppercase text-slate-400">Observaciones</label>
                  <textarea value={formData.descripcion || ''} onChange={(e) => setFormData({...formData, descripcion: e.target.value})} className="w-full p-3 bg-slate-50 border border-slate-100 rounded-xl text-xs h-16 outline-none focus:bg-white transition-colors" />
                </div>
                
                <div className="col-span-4 flex gap-3 mt-4">
                  {isEditing && (
                    <button type="button" onClick={handleEliminar} className="flex-1 bg-rose-50 text-rose-600 p-4 rounded-xl font-black uppercase text-xs hover:bg-rose-600 hover:text-white transition-all flex items-center justify-center gap-2">
                      <Trash2 size={16}/> Eliminar
                    </button>
                  )}
                  <button type="submit" className="flex-[2] bg-slate-900 text-white p-4 rounded-xl font-black uppercase text-xs hover:bg-blue-600 transition-all shadow-lg">
                    {isEditing ? 'Actualizar Cambios' : 'Guardar Reporte'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </main>
  )
}