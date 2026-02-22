"use client"
import { useEffect, useState, useMemo } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import * as XLSX from 'xlsx'
import { 
  ArrowLeft, Search, Calendar, Gauge, 
  Truck, Activity, ClipboardList, AlertCircle, 
  CheckCircle2, X, Save, Loader2, Download, History, FileSpreadsheet, Layers
} from 'lucide-react'

interface EquipoEstado {
  placaRodaje: string;
  codigoEquipo: string;
  descripcionEquipo: string;
  horometroMayor: number;
  ultima_fecha: string | null;
}

interface HistorialRegistro {
  id: number;
  horaInicio: number;
  horaFinal: number;
  horasOperacion: number;
  created_at: string;
}

export default function EstadoGeneralPage() {
  const router = useRouter()
  const [equipos, setEquipos] = useState<EquipoEstado[]>([])
  const [loading, setLoading] = useState(true)
  const [busqueda, setBusqueda] = useState('')
  const [filtroEstado, setFiltroEstado] = useState<'TODOS' | 'AL DÍA' | 'POR ACTUALIZAR' | 'DESACTUALIZADO' | 'SIN REGISTRO'>('TODOS')
  
  // Estados para el Modal y Formulario
  const [equipoSeleccionado, setEquipoSeleccionado] = useState<EquipoEstado | null>(null)
  const [nuevoHorometro, setNuevoHorometro] = useState<string>('')
  const [fechaRegistro, setFechaRegistro] = useState<string>(new Date().toISOString().split('T')[0])
  const [enviando, setEnviando] = useState(false)

  // Estados para el Historial y Exportaciones
  const [historial, setHistorial] = useState<HistorialRegistro[]>([])
  const [loadingHistorial, setLoadingHistorial] = useState(false)
  const [exportandoHistorial, setExportandoHistorial] = useState(false)
  const [exportandoTodo, setExportandoTodo] = useState(false)

  useEffect(() => {
    fetchEstadoActual()
  }, [])

  useEffect(() => {
    if (equipoSeleccionado) {
      fetchHistorial(equipoSeleccionado.placaRodaje)
    } else {
      setHistorial([])
    }
  }, [equipoSeleccionado])

  const fetchEstadoActual = async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('maestroEquipos')
        .select('placaRodaje, codigoEquipo, descripcionEquipo, horometroMayor, ultima_fecha')
      
      if (error) throw error

      // Lógica de prioridad: Sin registro > Desactualizados > Por actualizar > Al día
      const dataOrdenada = (data || []).sort((a, b) => {
        const getPrioridad = (fecha: string | null) => {
          if (!fecha) return 4;
          const dif = (new Date().getTime() - new Date(fecha).getTime()) / (1000 * 60 * 60 * 24);
          if (dif > 3) return 3;
          if (dif > 1) return 2;
          return 1;
        };
        return getPrioridad(a.ultima_fecha) - getPrioridad(b.ultima_fecha);
      });

      setEquipos(dataOrdenada)
    } catch (err) {
      console.error("Error cargando equipos:", err)
    } finally {
      setLoading(false)
    }
  }

  const fetchHistorial = async (placa: string) => {
    try {
      setLoadingHistorial(true)
      const { data, error } = await supabase
        .from('horometro')
        .select('id, horaInicio, horaFinal, horasOperacion, created_at')
        .eq('placaRodaje', placa)
        .order('created_at', { ascending: false })
        .limit(5)
      
      if (error) throw error
      setHistorial(data || [])
    } catch (err) {
      console.error("Error cargando historial:", err)
    } finally {
      setLoadingHistorial(false)
    }
  }

  // --- LÓGICA DE EXPORTACIÓN ---

  const exportarExcelGeneral = () => {
    const datosAExportar = filtrados.map(eq => ({
      'Estado': obtenerAlerta(eq.ultima_fecha).texto,
      'Placa / Unidad': eq.placaRodaje,
      'Código Interno': eq.codigoEquipo,
      'Descripción': eq.descripcionEquipo,
      'Lectura Horómetro': eq.horometroMayor,
      'Fecha Último Registro': eq.ultima_fecha ? new Date(eq.ultima_fecha).toLocaleString('es-PE') : 'Sin Datos'
    }));

    const ws = XLSX.utils.json_to_sheet(datosAExportar);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Resumen Flota");
    XLSX.writeFile(wb, `Estado_Flota_${new Date().toISOString().split('T')[0]}.xlsx`);
  }

  const exportarTodoElHistorial = async () => {
    try {
      setExportandoTodo(true);
      const { data, error } = await supabase
        .from('horometro')
        .select('created_at, placaRodaje, horaInicio, horaFinal, horasOperacion')
        .order('created_at', { ascending: false });

      if (error) throw error;

      const datosExcel = data.map(reg => ({
        'Fecha Registro': new Date(reg.created_at).toLocaleDateString('es-PE'),
        'Hora': new Date(reg.created_at).toLocaleTimeString('es-PE'),
        'Placa / Unidad': reg.placaRodaje,
        'Horómetro Inicial': reg.horaInicio,
        'Horómetro Final': reg.horaFinal,
        'Horas Trabajadas': reg.horasOperacion
      }));

      const ws = XLSX.utils.json_to_sheet(datosExcel);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Historial Completo");
      XLSX.writeFile(wb, `Historial_General_Flota.xlsx`);
    } catch (err) {
      alert("Error al descargar historial masivo");
    } finally {
      setExportandoTodo(false);
    }
  }

  const exportarHistorialEquipo = async () => {
    if (!equipoSeleccionado) return;
    try {
      setExportandoHistorial(true);
      const { data, error } = await supabase
        .from('horometro')
        .select('created_at, horaInicio, horaFinal, horasOperacion')
        .eq('placaRodaje', equipoSeleccionado.placaRodaje)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const ws = XLSX.utils.json_to_sheet(data.map(reg => ({
        'Fecha': new Date(reg.created_at).toLocaleDateString('es-PE'),
        'Hora': new Date(reg.created_at).toLocaleTimeString('es-PE'),
        'H. Inicial': reg.horaInicio,
        'H. Final': reg.horaFinal,
        'Hrs. Operación': reg.horasOperacion
      })));
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Hoja de Vida");
      XLSX.writeFile(wb, `Historial_${equipoSeleccionado.placaRodaje}.xlsx`);
    } catch (err) {
      alert("Error");
    } finally {
      setExportandoHistorial(false);
    }
  }

  // --- UTILIDADES ---

  const obtenerAlerta = (fechaIso: string | null) => {
    if (!fechaIso) return { texto: 'SIN REGISTRO', clase: 'text-indigo-700 bg-indigo-50 border border-indigo-100', colorIcono: 'text-indigo-300' };
    const diferenciaDias = (new Date().getTime() - new Date(fechaIso).getTime()) / (1000 * 60 * 60 * 24);
    if (diferenciaDias > 3) return { texto: 'DESACTUALIZADO', clase: 'text-white bg-rose-600 shadow-lg shadow-rose-100', colorIcono: 'text-rose-500' };
    if (diferenciaDias > 1) return { texto: 'POR ACTUALIZAR', clase: 'text-amber-700 bg-amber-50 border border-amber-100', colorIcono: 'text-amber-500' };
    return { texto: 'AL DÍA', clase: 'text-emerald-700 bg-emerald-50 border border-emerald-100', colorIcono: 'text-emerald-500' };
  }

  const conteos = useMemo(() => {
    const stats = { TODOS: equipos.length, 'AL DÍA': 0, 'POR ACTUALIZAR': 0, DESACTUALIZADO: 0, 'SIN REGISTRO': 0 };
    equipos.forEach(eq => {
      const estado = obtenerAlerta(eq.ultima_fecha).texto as keyof typeof stats;
      if (stats[estado] !== undefined) stats[estado]++;
    });
    return stats;
  }, [equipos]);

  const filtrados = equipos.filter(e => {
    const cumpleTexto = e.placaRodaje?.toLowerCase().includes(busqueda.toLowerCase()) || 
                       e.codigoEquipo?.toLowerCase().includes(busqueda.toLowerCase());
    if (filtroEstado === 'TODOS') return cumpleTexto;
    return cumpleTexto && obtenerAlerta(e.ultima_fecha).texto === filtroEstado;
  });

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!equipoSeleccionado || !nuevoHorometro) return;

    // --- NUEVA VALIDACIÓN: NO PERMITIR VALORES MENORES ---
    const valorHorometro = parseFloat(nuevoHorometro);
    const horometroAnterior = equipoSeleccionado.horometroMayor || 0;

    if (valorHorometro < horometroAnterior) {
      alert(`Error: El nuevo horómetro (${valorHorometro}) no puede ser menor al valor actual (${horometroAnterior}). El horómetro debe ser creciente.`);
      return; // Detiene la ejecución aquí
    }

    try {
      setEnviando(true);
      const horasOp = valorHorometro - horometroAnterior;

      await supabase.from('horometro').insert([{
        placaRodaje: equipoSeleccionado.placaRodaje,
        horaInicio: horometroAnterior,
        horaFinal: valorHorometro,
        horasOperacion: horasOp,
        created_at: new Date(fechaRegistro).toISOString()
      }]);

      await supabase.from('maestroEquipos').update({ 
          horometroMayor: valorHorometro,
          ultima_fecha: new Date(fechaRegistro).toISOString()
      }).eq('placaRodaje', equipoSeleccionado.placaRodaje);

      setEquipoSeleccionado(null);
      setNuevoHorometro('');
      fetchEstadoActual();
    } catch (err) {
      alert("Error al guardar");
    } finally {
      setEnviando(false);
    }
  };

  if (loading) return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[#F8FAFC]">
      <Activity className="animate-spin text-blue-600 mb-4" size={40} />
      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest italic">Cargando flota...</p>
    </div>
  )

  return (
    <main className="min-h-screen bg-[#F8FAFC] p-6 md:p-12 font-sans text-slate-900 relative">
      <div className="max-w-7xl mx-auto space-y-6">
        
        {/* BOTÓN VOLVER */}
        <button onClick={() => router.back()} className="flex items-center gap-2 text-slate-400 hover:text-blue-600 transition-colors font-bold text-[10px] uppercase tracking-[0.2em]">
          <ArrowLeft size={14} /> Volver al Maestro
        </button>

        <header className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-100 flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-4">
            <div className="bg-slate-900 p-4 rounded-3xl text-white shadow-lg"><ClipboardList size={24} /></div>
            <div>
              <h1 className="text-2xl font-black text-slate-800 tracking-tight lowercase first-letter:uppercase">Control de horometros</h1>
              <p className="text-xs font-medium text-slate-400 italic">Estado actual de la flota</p>
            </div>
          </div>

          <div className="flex flex-wrap gap-3 w-full md:w-auto">
            <div className="relative flex-1 md:w-64">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
              <input onChange={(e) => setBusqueda(e.target.value)} placeholder="Buscar unidad..." className="w-full pl-12 pr-6 py-4 bg-slate-50 border-none rounded-2xl text-sm font-medium focus:ring-2 focus:ring-blue-500 outline-none transition-all shadow-inner" />
            </div>
            
            <button 
              onClick={exportarExcelGeneral}
              className="bg-emerald-500 hover:bg-emerald-600 text-white px-6 py-4 rounded-2xl flex items-center justify-center gap-2 transition-all shadow-lg shadow-emerald-100 active:scale-95 group"
            >
              <Download size={20} />
              <span className="font-black text-[10px] uppercase tracking-widest">Exportar horometros</span>
            </button>

            <button 
              onClick={exportarTodoElHistorial}
              disabled={exportandoTodo}
              className="bg-slate-800 hover:bg-slate-900 text-white px-6 py-4 rounded-2xl flex items-center justify-center gap-2 transition-all shadow-lg shadow-slate-200 active:scale-95 disabled:opacity-50"
            >
              {exportandoTodo ? <Loader2 size={20} className="animate-spin" /> : <Layers size={20} />}
              <span className="font-black text-[10px] uppercase tracking-widest">exportar Historial</span>
            </button>
          </div>
        </header>

        {/* TABS CON CONTADORES */}
        <div className="bg-slate-200/50 p-1.5 rounded-[1.8rem] flex flex-wrap gap-1 w-fit border border-slate-200/60 shadow-inner">
          {(['TODOS', 'AL DÍA', 'POR ACTUALIZAR', 'DESACTUALIZADO', 'SIN REGISTRO'] as const).map((f) => (
            <button key={f} onClick={() => setFiltroEstado(f)} className={`px-5 py-2.5 rounded-[1.2rem] text-[10px] font-black transition-all uppercase tracking-tighter flex items-center gap-2 ${filtroEstado === f ? 'bg-white text-blue-600 shadow-md scale-[1.02]' : 'text-slate-500'}`}>
              {f} <span className={`px-2 py-0.5 rounded-full text-[9px] ${filtroEstado === f ? 'bg-blue-600 text-white' : 'bg-slate-300/50 text-slate-500'}`}>{conteos[f]}</span>
            </button>
          ))}
        </div>

        {/* TABLA PRINCIPAL */}
        <div className="bg-white rounded-[2.5rem] shadow-sm border border-slate-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/50 border-b border-slate-100">
                  <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Estado</th>
                  <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Unidad / Placa</th>
                  <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Horómetro</th>
                  <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Última Fecha</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {filtrados.map((eq) => {
                  const alerta = obtenerAlerta(eq.ultima_fecha);
                  return (
                    <tr key={eq.placaRodaje} onClick={() => setEquipoSeleccionado(eq)} className="hover:bg-blue-50/40 transition-all cursor-pointer group">
                      <td className="px-8 py-5">
                        <span className={`px-4 py-1.5 rounded-full text-[9px] font-black tracking-widest uppercase flex items-center gap-2 w-fit ${alerta.clase}`}>
                          {alerta.texto === 'AL DÍA' ? <CheckCircle2 size={12} /> : <AlertCircle size={12} />} {alerta.texto}
                        </span>
                      </td>
                      <td className="px-8 py-5">
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-slate-50 rounded-xl text-slate-300 group-hover:bg-white group-hover:text-blue-500 transition-all shadow-sm"><Truck size={18} /></div>
                          <div className="flex flex-col">
                            <span className="font-mono font-black text-slate-800 text-lg tracking-tighter uppercase">{eq.placaRodaje}</span>
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tight">{eq.codigoEquipo}</span>
                          </div>
                        </div>
                      </td>
                      <td className="px-8 py-5">
                        <div className="flex items-center gap-2 font-mono font-black text-slate-700 italic">
                          <Gauge size={16} className={alerta.colorIcono} />
                          {eq.horometroMayor?.toLocaleString()} <span className="text-[10px] text-slate-300 font-bold">HRS</span>
                        </div>
                      </td>
                      <td className="px-8 py-5">
                        <div className="flex flex-col italic">
                          <span className="text-xs font-bold text-slate-600">{eq.ultima_fecha ? new Date(eq.ultima_fecha).toLocaleDateString('es-PE') : '---'}</span>
                          <span className="text-[10px] text-slate-300 font-bold uppercase">{eq.ultima_fecha ? new Date(eq.ultima_fecha).toLocaleTimeString('es-PE', {hour:'2-digit', minute:'2-digit'}) : 'Sin datos'}</span>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* MODAL EXPANDIDO */}
      {equipoSeleccionado && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-[2px] z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-[3rem] w-full max-w-[850px] flex flex-col md:flex-row overflow-hidden shadow-2xl relative animate-in fade-in zoom-in duration-200">
            
            <button onClick={() => setEquipoSeleccionado(null)} className="absolute right-8 top-8 z-10 text-slate-300 hover:text-slate-500 transition-colors"><X size={24}/></button>

            {/* IZQUIERDA: FORMULARIO */}
            <div className="p-10 border-r border-slate-100 bg-white w-full md:w-[45%] flex flex-col items-center text-center">
              <div className="bg-blue-50 p-5 rounded-3xl text-blue-600 mb-6 shadow-sm"><Gauge size={32} strokeWidth={2.5}/></div>
              <h3 className="text-3xl font-black text-slate-800 tracking-tighter uppercase mb-1">{equipoSeleccionado.placaRodaje}</h3>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-10 italic">Actualizar Lectura</p>
              
              <form onSubmit={handleUpdate} className="w-full space-y-6">
                <div className="text-left space-y-2">
                  <label className="text-[9px] font-black text-slate-400 uppercase ml-4 tracking-widest">Fecha</label>
                  <input type="date" value={fechaRegistro} onChange={(e) => setFechaRegistro(e.target.value)} className="w-full p-5 bg-slate-50 border-none rounded-2xl font-bold text-slate-700 outline-none" />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center space-y-2">
                    <label className="text-[9px] font-black text-slate-300 uppercase tracking-widest italic">Anterior</label>
                    <div className="p-5 bg-slate-50 rounded-2xl font-mono font-black text-slate-300 text-xl italic">{equipoSeleccionado.horometroMayor || 0}</div>
                  </div>
                  <div className="text-center space-y-2">
                    <label className="text-[9px] font-black text-blue-600 uppercase tracking-widest italic">Nueva</label>
                    <input autoFocus required type="number" step="0.1" value={nuevoHorometro} onChange={(e) => setNuevoHorometro(e.target.value)} className="w-full p-5 bg-white border-2 border-blue-500 rounded-2xl font-mono font-black text-blue-600 text-xl text-center outline-none shadow-inner" />
                  </div>
                </div>

                <button disabled={enviando} type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white p-6 rounded-2xl font-black uppercase text-xs tracking-[0.2em] flex items-center justify-center gap-3 transition-all shadow-xl shadow-blue-100 mt-4 active:scale-95">
                  {enviando ? <Loader2 className="animate-spin" /> : <Save size={18}/>}
                  {enviando ? 'Guardando...' : 'Confirmar Registro'}
                </button>
              </form>
            </div>

            {/* DERECHA: HISTORIAL + BOTÓN EXPORTAR */}
            <div className="p-10 bg-slate-50/50 w-full md:w-[55%] flex flex-col">
              <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-3">
                  <div className="bg-white p-3 rounded-2xl text-slate-400 shadow-sm"><History size={20}/></div>
                  <h4 className="text-sm font-black text-slate-800 uppercase tracking-widest">Historial</h4>
                </div>
                
                <button 
                  onClick={exportarHistorialEquipo}
                  disabled={exportandoHistorial || historial.length === 0}
                  className="bg-white hover:bg-emerald-50 text-emerald-600 border border-emerald-100 px-4 py-2.5 rounded-2xl shadow-sm transition-all active:scale-95 flex items-center gap-2 group"
                >
                  {exportandoHistorial ? <Loader2 size={14} className="animate-spin" /> : <FileSpreadsheet size={14} />}
                  <span className="text-[10px] font-black uppercase tracking-widest">Exportar</span>
                </button>
              </div>

              <div className="flex-1 space-y-4">
                {loadingHistorial ? (
                  <div className="flex justify-center py-20"><Loader2 className="animate-spin text-slate-300" /></div>
                ) : historial.length > 0 ? (
                  historial.map((reg) => (
                    <div key={reg.id} className="bg-white p-5 rounded-[1.5rem] border border-slate-100 flex justify-between items-center shadow-sm">
                      <div className="flex flex-col">
                        <span className="text-[10px] font-black text-slate-400 uppercase italic mb-1">
                          {new Date(reg.created_at).toLocaleDateString('es-PE')}
                        </span>
                        <div className="font-mono font-black text-slate-700 text-lg">
                          {reg.horaFinal.toLocaleString()} <span className="text-[9px] text-slate-300">HRS</span>
                        </div>
                      </div>
                      <div className="text-[9px] font-black text-emerald-500 bg-emerald-50 px-3 py-1.5 rounded-full border border-emerald-100">
                        +{reg.horasOperacion.toFixed(1)} <span className="opacity-50 italic">Δ</span>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-20 text-slate-300 text-xs italic">No hay registros previos.</div>
                )}
              </div>
            </div>

          </div>
        </div>
      )}
    </main>
  )
}