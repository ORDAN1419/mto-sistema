"use client"
import { useEffect, useState, useMemo, useRef, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import * as XLSX from 'xlsx'
import jsPDF from 'jspdf'
import {
  ArrowLeft, Search, Gauge, Truck, X, Save, Loader2, History,
  ChevronRight, ArrowUpCircle, Clock, Wrench, ShieldCheck, ShieldAlert,
  LayoutGrid, // ✅ IMPORTACIÓN CORREGIDA
  RefreshCw, Box, Activity, Target, AlertOctagon, CheckCircle2,
  MapPin, ClipboardList, Construction, LogOut, FileText, HelpCircle,
  Settings2, CalendarDays, Zap
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
  tipoMpUlt: string | null;
  frecuencia: number | null;
  desface: number | null;
  status: string | null;
  obs: string;
  disponibilidad?: number;
  tpef?: number;
  tppr?: number;
}

export default function EstadoGeneralPage() {
  const router = useRouter()
  const inputBusquedaRef = useRef<HTMLInputElement>(null)

  // --- 1. ESTADOS ---
  const [equipos, setEquipos] = useState<EquipoEstado[]>([])
  const [loading, setLoading] = useState(true)
  const [busqueda, setBusqueda] = useState('')
  const [filtroKPI, setFiltroKPI] = useState<'TODOS' | 'SALUDABLE' | 'CUMPLIMIENTO' | 'RIESGO'>('TODOS')
  const [equipoSeleccionado, setEquipoSeleccionado] = useState<EquipoEstado | null>(null)
  const [form, setForm] = useState({ inicio: '', final: '', fecha: obtenerFechaHoyLocal() })
  const [enviando, setEnviando] = useState(false)
  const [historialModal, setHistorialModal] = useState<any[]>([])
  const [isHelpModalOpen, setIsHelpModalOpen] = useState(false)

  // --- 2. FUNCIONES ---
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

  const fetchHistorial = useCallback(async (placa: string) => {
    const { data } = await supabase.from('horometro').select('*').eq('placaRodaje', placa).order('created_at', { ascending: false }).limit(3)
    setHistorialModal(data || [])
  }, [])

  // --- 3. EFFECTS ---
  useEffect(() => { fetchEstadoActual() }, [fetchEstadoActual])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.key === '1') { e.preventDefault(); router.push('/rendimiento'); }
      if (e.ctrlKey && e.key === '2') { e.preventDefault(); router.push('/bdrepuestos'); }
      if (e.ctrlKey && e.key === '3') { e.preventDefault(); router.push('/estatus'); }
      if (e.ctrlKey && e.key === '4') { e.preventDefault(); router.push('/repuestos'); }
      if (e.ctrlKey && e.key === '0') { e.preventDefault(); router.push('/equipos'); }
      if (e.altKey && e.key.toLowerCase() === 's') { e.preventDefault(); inputBusquedaRef.current?.focus(); }
      if (e.altKey && e.key.toLowerCase() === 'h') { e.preventDefault(); setIsHelpModalOpen(p => !p); }
      if (e.altKey && e.key.toLowerCase() === 'x') { e.preventDefault(); setBusqueda(''); setFiltroKPI('TODOS'); }
      if (e.altKey && e.key.toLowerCase() === 'q') { e.preventDefault(); fetchEstadoActual(); }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [router, fetchEstadoActual]);

  useEffect(() => {
    if (equipoSeleccionado) {
      fetchHistorial(equipoSeleccionado.placaRodaje);
      setForm({ inicio: equipoSeleccionado.horometroMayor?.toString() || '0', final: '', fecha: obtenerFechaHoyLocal() })
    }
  }, [equipoSeleccionado, fetchHistorial])

  // --- 4. LÓGICA DE FILTRADO Y AGRUPACIÓN ---
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
    const q = busqueda.toLowerCase().trim();
    const filtrados = equipos.filter(e => {
      let pasaKPI = true;
      if (filtroKPI === 'SALUDABLE') pasaKPI = e.desface !== null && e.desface > 24;
      if (filtroKPI === 'CUMPLIMIENTO') pasaKPI = e.desface !== null && e.desface > 0;
      if (filtroKPI === 'RIESGO') pasaKPI = e.desface !== null && e.desface <= 0;
      const matchBusqueda = !q || e.placaRodaje?.toLowerCase().includes(q) || e.codigoEquipo?.toLowerCase().includes(q) || e.descripcionEquipo?.toLowerCase().includes(q);
      return pasaKPI && matchBusqueda;
    });

    const grupos: Record<string, EquipoEstado[]> = {};
    filtrados.filter(e => e.desface !== null).forEach(eq => {
      const cat = (eq.descripcionEquipo || 'OTROS').toUpperCase();
      if (!grupos[cat]) grupos[cat] = [];
      grupos[cat].push(eq);
    });

    Object.keys(grupos).forEach(key => { grupos[key].sort((a, b) => (a.desface || 0) - (b.desface || 0)); });
    return grupos;
  }, [equipos, filtroKPI, busqueda]);

  const guardarLectura = async () => {
    if (!equipoSeleccionado) return;
    const hInicio = Number(form.inicio);
    const hFinal = Number(form.final);
    if (!form.final || hFinal <= hInicio) { alert("La nueva lectura debe ser mayor a la anterior"); return; }
    setEnviando(true);
    try {
      const ts = new Date().toISOString();
      await supabase.from('horometro').insert([{ placaRodaje: equipoSeleccionado.placaRodaje, horaInicio: hInicio, horaFinal: hFinal, horasOperacion: hFinal - hInicio, horometroMayor: hFinal, created_at: ts }]);
      await supabase.from('reporte_diario').insert([{ placa_rodaje: equipoSeleccionado.placaRodaje, fecha: form.fecha, horometro_inicial: hInicio, horometro_final: hFinal, descripcion: 'Actualización SAP Sync' }]);
      await supabase.from('maestroEquipos').update({ horometroMayor: hFinal, ultima_fecha: ts }).eq('placaRodaje', equipoSeleccionado.placaRodaje);
      await fetchEstadoActual();
      setEquipoSeleccionado(null);
      alert("✅ Horómetro sincronizado");
    } catch (err) { alert("Error al guardar") } finally { setEnviando(false) }
  }

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-[#f7f9fa]"><RefreshCw className="animate-spin text-[#0070b1]" size={40} /></div>

  return (
    <main className="min-h-screen bg-[#f7f9fa] text-[#32363a] font-sans text-left leading-none">
      <nav className="bg-[#354a5f] text-white h-12 flex items-center px-4 justify-between shadow-md sticky top-0 z-40">
        <div className="flex items-center gap-4 text-left leading-none">
          <ArrowLeft size={18} onClick={() => router.back()} className="cursor-pointer hover:opacity-70" />
          <div className="h-6 w-px bg-white/20" />
          <span className="font-bold text-xs tracking-wider uppercase italic leading-none">Monitor de Salud | SAP S/4HANA</span>
        </div>
        <div className="flex items-center gap-6 text-left leading-none">
          <div className="relative leading-none">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 text-white/50" size={14} />
            <input ref={inputBusquedaRef} onChange={(e) => setBusqueda(e.target.value)} className="bg-white/10 border border-white/20 rounded-sm py-1 pl-8 pr-2 text-xs outline-none focus:bg-white focus:text-slate-900 transition-all w-64 font-bold" placeholder="Buscar Placa o Grupo..." />
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
              <p className="text-xl font-light text-[#0070b1] leading-none font-mono">{kpiSalud.confiabilidad}%</p>
            </div>
            <SapKpiTile label="Vencidos" value={kpiSalud.vencidos} color="rose" active={filtroKPI === 'RIESGO'} onClick={() => setFiltroKPI('RIESGO')} />
          </div>

          <div className="bg-white border border-[#d3d7d9] shadow-sm rounded-sm">
            <div className="bg-[#f2f4f5] border-b border-[#d3d7d9] px-4 py-2 flex justify-between items-center leading-none">
              <div className="flex items-center gap-2 text-[#6a6d70] text-left leading-none">
                <LayoutGrid size={14} />
                <span className="text-[11px] font-bold uppercase tracking-tight leading-none">Visión General de Flota</span>
              </div>
              <button onClick={() => setFiltroKPI('TODOS')} className="text-[10px] text-[#0070b1] font-bold hover:underline uppercase leading-none">Reiniciar Filtros</button>
            </div>

            <div className="p-4 max-h-[calc(100vh-220px)] overflow-y-auto space-y-6 text-left bg-white">
              {Object.entries(equiposAgrupados).map(([grupo, lista]) => (
                <div key={grupo} className="space-y-2">
                  <div className="flex items-center gap-2 border-b border-[#f2f4f5] pb-1 leading-none">
                    <Box size={12} className="text-[#0070b1]" />
                    <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-widest leading-none">{grupo}</h3>
                    <div className="h-px flex-grow bg-[#f2f4f5]" />
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
              <div className="leading-none text-left">
                <h2 className="text-lg font-light text-[#0070b1] uppercase tracking-tighter mb-1 leading-none">{equipoSeleccionado.placaRodaje}</h2>
                <span className="text-[10px] font-bold text-slate-400 uppercase leading-none">{equipoSeleccionado.codigoEquipo}</span>
              </div>
              <X className="cursor-pointer text-[#6a6d70] hover:text-rose-500" onClick={() => setEquipoSeleccionado(null)} />
            </div>

            <div className="p-5 space-y-6 overflow-y-auto">
              {/* STATUS DE MANTENIMIENTO SAP */}
              <div className="space-y-3 bg-[#eff4f9] p-4 border border-[#b0ccf0] rounded-sm">
                <h4 className="text-[10px] font-black text-[#0070b1] uppercase flex items-center gap-2 border-b border-[#b0ccf0] pb-2 leading-none mb-3">
                  <Settings2 size={12} /> Planificación de Mantenimiento
                </h4>

                <div className="grid grid-cols-2 gap-4 text-left leading-none">
                  <div>
                    <p className="text-[9px] font-bold text-[#6a6d70] uppercase mb-1 leading-none">Último MP Ejecutado</p>
                    <div className="flex items-center gap-2 text-[#32363a]">
                      <Zap size={12} className="text-emerald-600" />
                      <span className="text-xs font-black uppercase">{equipoSeleccionado.tipoMpUlt || 'N/A'}</span>
                    </div>
                  </div>
                  <div>
                    <p className="text-[9px] font-bold text-[#6a6d70] uppercase mb-1 leading-none">Frecuencia Plan</p>
                    <div className="flex items-center gap-2 text-[#32363a]">
                      <CalendarDays size={12} className="text-blue-600" />
                      <span className="text-xs font-black uppercase">{equipoSeleccionado.frecuencia ? `${equipoSeleccionado.frecuencia} h` : 'N/A'}</span>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 mt-4 text-left leading-none">
                  <div className="p-3 bg-white border border-[#d3d7d9] rounded-sm">
                    <p className="text-[9px] font-bold text-[#6a6d70] uppercase mb-1 flex items-center gap-1 leading-none"><Clock size={10} /> Próx. {equipoSeleccionado.tipoProxMp || 'MP'}</p>
                    <p className="text-sm font-black text-slate-700 font-mono leading-none">{equipoSeleccionado.ProxHoroKmMp || 'N/A'}</p>
                  </div>
                  <div className={`p-3 border rounded-sm ${equipoSeleccionado.desface! <= 0 ? 'bg-rose-50 border-rose-200' : 'bg-emerald-50 border-emerald-200'}`}>
                    <p className="text-[9px] font-bold text-[#6a6d70] uppercase mb-1 leading-none text-left tracking-tighter">Estado Desfase</p>
                    <p className={`text-sm font-black font-mono leading-none text-left ${equipoSeleccionado.desface! <= 0 ? 'text-rose-600' : 'text-emerald-700'}`}>{equipoSeleccionado.desface?.toFixed(1)} h</p>
                  </div>
                </div>
              </div>

              {/* ENTRADA DE TRANSACCIÓN */}
              <div className="space-y-4 bg-[#f8f9fa] p-4 border border-[#d3d7d9] rounded-sm text-center leading-none">
                <h4 className="text-[10px] font-black text-[#6a6d70] uppercase border-b border-[#d3d7d9] pb-1 flex items-center gap-2 leading-none">
                  <RefreshCw size={12} /> Entrada de Horometro
                </h4>
                <div className="space-y-3">
                  <div className="text-left leading-none">
                    <label className="text-[10px] font-bold text-[#6a6d70] uppercase ml-1 leading-none">Fecha Sincronización</label>
                    <input type="date" value={form.fecha} onChange={(e) => setForm({ ...form, fecha: e.target.value })} className="w-full border border-[#b0b3b5] p-2 text-xs rounded-sm outline-none focus:border-[#0070b1] bg-white font-bold" />
                  </div>
                  <div className="grid grid-cols-2 gap-3 text-left leading-none">
                    <div>
                      <label className="text-[10px] font-bold text-[#6a6d70] uppercase ml-1 leading-none">H. Anterior</label>
                      <div className="bg-[#e9ecef] p-2 text-sm font-mono font-bold text-slate-500 border border-[#d3d7d9] rounded-sm text-center leading-none">{form.inicio}</div>
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-[#0070b1] uppercase ml-1 leading-none">H. Nueva</label>
                      <input type="number" step="0.1" value={form.final} onChange={(e) => setForm({ ...form, final: e.target.value })} className="w-full border-2 border-[#0070b1] p-2 text-sm font-mono font-black text-[#0070b1] outline-none rounded-sm bg-white text-center leading-none" placeholder="0.0" />
                    </div>
                  </div>
                  <button onClick={guardarLectura} disabled={enviando} className="w-full bg-[#0070b1] hover:bg-[#005a8e] text-white py-3 text-xs font-black uppercase rounded-sm transition-all flex items-center justify-center gap-2 active:scale-95 disabled:opacity-50 shadow-sm leading-none">
                    {enviando ? <Loader2 className="animate-spin" size={16} /> : <><Save size={16} /> Contabilizar</>}
                  </button>
                </div>
              </div>

              <div className="space-y-2 text-left leading-none">
                <h4 className="text-[10px] font-black text-[#6a6d70] uppercase flex items-center gap-2 px-1 leading-none"><History size={12} /> Registro de Cambios</h4>
                <div className="border border-[#d3d7d9] rounded-sm overflow-hidden shadow-sm leading-none">
                  <table className="w-full text-[10px] leading-none">
                    <thead className="bg-[#f2f4f5] text-[#6a6d70] border-b border-[#d3d7d9]">
                      <tr className="leading-none text-left">
                        <th className="p-2 font-bold uppercase text-left leading-none">Lectura</th>
                        <th className="p-2 font-bold uppercase text-left leading-none">Variación</th>
                        <th className="p-2 font-bold uppercase text-left leading-none">Fecha</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 bg-white text-left leading-none">
                      {historialModal.map(h => (
                        <tr key={h.id} className="hover:bg-[#f7f9fa] transition-all font-mono leading-none text-left">
                          <td className="p-2 text-[#0070b1] font-bold text-left leading-none">{h.horaFinal} h</td>
                          <td className="p-2 text-emerald-600 text-left leading-none">+{h.horasOperacion} h</td>
                          <td className="p-2 text-slate-400 text-left leading-none">{new Date(h.created_at).toLocaleDateString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <button onClick={() => router.push(`/eventos?placa=${equipoSeleccionado.placaRodaje}`)} className="w-full py-3 border-2 border-slate-800 text-slate-800 rounded-sm font-black text-[10px] uppercase flex items-center justify-center gap-3 hover:bg-slate-800 hover:text-white transition-all shadow-sm leading-none tracking-widest">
                <Construction size={16} /> Crear Orden Intervención
              </button>
            </div>
          </div>
        )}
      </div>

      {/* SAP HELP MODAL */}
      {isHelpModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 leading-none">
          <div className="bg-white w-full max-sm rounded-sm shadow-2xl overflow-hidden border border-[#d3d7d9] animate-in zoom-in-95 leading-none">
            <div className="bg-[#354a5f] p-4 flex justify-between items-center text-white text-left leading-none">
              <div className="flex items-center gap-2 leading-none text-left"><HelpCircle size={18} /><h3 className="font-bold text-xs uppercase tracking-widest leading-none">Atajos S/4HANA</h3></div>
              <X size={20} className="cursor-pointer hover:opacity-70" onClick={() => setIsHelpModalOpen(false)} />
            </div>
            <div className="p-6 space-y-3 leading-none text-left">
              <ShortcutRow keys="CTRL + 1" label="Módulo: Rendimiento" />
              <ShortcutRow keys="CTRL + 2" label="Módulo: DB Repuestos" />
              <ShortcutRow keys="CTRL + 3" label="Módulo: Monitor Estatus" />
              <ShortcutRow keys="CTRL + 4" label="Módulo: Inventario" />
              <ShortcutRow keys="ALT + S" label="Búsqueda Rápida [Foco]" />
              <ShortcutRow keys="ALT + Q" label="Refrescar Datos Servidor" />
            </div>
          </div>
        </div>
      )}
    </main>
  )
}

function SapKpiTile({ label, value, color, active, onClick }: any) {
  const styles: any = {
    emerald: active ? 'bg-emerald-600 border-emerald-700 text-white shadow-md' : 'bg-white border-[#d3d7d9] text-[#32363a] hover:bg-emerald-50',
    blue: active ? 'bg-[#0070b1] border-[#005a8e] text-white shadow-md' : 'bg-white border-[#d3d7d9] text-[#32363a] hover:bg-blue-50',
    rose: active ? 'bg-rose-600 border-rose-700 text-white shadow-md' : 'bg-white border-[#d3d7d9] text-[#32363a] hover:bg-rose-50',
  }
  return (
    <button onClick={onClick} className={`p-3 border rounded-sm text-left transition-all active:scale-95 shadow-sm leading-none ${styles[color]}`}>
      <p className={`text-[10px] font-bold uppercase mb-1 leading-none ${active ? 'text-white' : 'text-[#6a6d70]'}`}>{label}</p>
      <p className="text-xl font-light font-mono leading-none">{value}</p>
    </button>
  )
}

function ShortcutRow({ keys, label }: { keys: string, label: string }) {
  return (
    <div className="flex justify-between items-center text-left leading-none">
      <span className="text-[10px] font-bold text-[#6a6d70] uppercase leading-none">{label}</span>
      <span className="bg-[#f2f4f5] text-[#354a5f] px-2 py-1 rounded-sm text-[10px] font-black font-mono border border-[#d3d7d9] leading-none">{keys}</span>
    </div>
  )
}