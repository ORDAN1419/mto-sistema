"use client"
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import * as XLSX from 'xlsx' // Asegúrate de instalarlo: npm install xlsx
import {
    Truck, Activity, MapPin, AlertTriangle, CheckCircle2, XCircle,
    ArrowLeft, Loader2, ClipboardList, Search, Filter, Percent,
    Edit3, Trash2, X, Save, Download
} from 'lucide-react'

interface Equipo {
    marca: any
    codigoEquipo: string;
    placaRodaje: string;
    descripcionEquipo: string;
    ubic: string;
    status: string;
    obs: string;
    proyecto: string;
}

export default function ResumenEstatusPage() {
    const router = useRouter()
    const [equipos, setEquipos] = useState<Equipo[]>([])
    const [loading, setLoading] = useState(true)
    const [busqueda, setBusqueda] = useState('')

    // Estados para el Modal de Edición
    const [showEditModal, setShowEditModal] = useState(false)
    const [equipoAEditar, setEquipoAEditar] = useState<Equipo | null>(null)
    const [formEdit, setFormEdit] = useState({ ubic: '', status: '', obs: '' })
    const [guardando, setGuardando] = useState(false)

    useEffect(() => { fetchEquipos() }, [])

    const fetchEquipos = async () => {
        try {
            setLoading(true)
            const { data, error } = await supabase
                .from('maestroEquipos')
                .select('*')
                .order('status')
            if (error) throw error
            setEquipos(data || [])
        } catch (err) { console.error(err) } finally { setLoading(false) }
    }

    // --- ACCIÓN: EXCEL ---
    const descargarExcel = () => {
        const resumen = [
            ["REPORTE DE ESTADO DE FLOTA"],
            ["Fecha:", new Date().toLocaleDateString()],
            [],
            ["INDICADORES"],
            ["Total Unidades", total],
            ["Operativos", operativos],
            ["Inoperativos", inoperativos],
            ["Disponibilidad", `${disponibilidad.toFixed(1)}%`],
            [],
            ["DETALLE DE EQUIPOS"]
        ];

        const datosTabla = filtrados.map(eq => ({
            "PLACA": eq.placaRodaje,
            "CÓDIGO": eq.codigoEquipo,
            "ESTATUS": eq.status,
            "UBICACIÓN": eq.ubic || '---',
            "OBSERVACIONES": eq.obs || '---',

        }));

        const wb = XLSX.utils.book_new();
        const ws = XLSX.utils.aoa_to_sheet(resumen);
        XLSX.utils.sheet_add_json(ws, datosTabla, { origin: "A11" });

        // Ajuste de anchos
        ws['!cols'] = [{ wch: 15 }, { wch: 15 }, { wch: 15 }, { wch: 25 }, { wch: 50 }];

        XLSX.utils.book_append_sheet(wb, ws, "Resumen");
        XLSX.writeFile(wb, `Estado_Flota_${new Date().toISOString().split('T')[0]}.xlsx`);
    }

    // --- ACCIONES DE EDICIÓN ---
    const handleEditClick = (eq: Equipo) => {
        setEquipoAEditar(eq)
        setFormEdit({ ubic: eq.ubic || '', status: eq.status || '', obs: eq.obs || '' })
        setShowEditModal(true)
    }

    const handleUpdate = async () => {
        if (!equipoAEditar) return

        // Validación: Si es inoperativo, debe tener observación
        if (formEdit.status !== 'OPERATIVO' && !formEdit.obs.trim()) {
            alert("⚠️ Por favor, ingresa una observación para equipos no operativos.")
            return
        }

        setGuardando(true)
        try {
            const { error } = await supabase
                .from('maestroEquipos')
                .update({
                    ubic: formEdit.ubic,
                    status: formEdit.status,
                    obs: formEdit.obs
                })
                .eq('placaRodaje', equipoAEditar.placaRodaje)

            if (error) throw error
            setEquipos(prev => prev.map(e => e.placaRodaje === equipoAEditar.placaRodaje ? { ...e, ...formEdit } : e))
            setShowEditModal(false)
        } catch (err) { alert("Error al actualizar") } finally { setGuardando(false) }
    }

    const handleDelete = async (placa: string) => {
        if (!confirm(`¿Estás seguro de eliminar la unidad ${placa}?`)) return
        try {
            const { error } = await supabase.from('maestroEquipos').delete().eq('placaRodaje', placa)
            if (error) throw error
            setEquipos(prev => prev.filter(e => e.placaRodaje !== placa))
        } catch (err) { alert("Error al eliminar. Verifique si tiene datos vinculados.") }
    }

    const filtrados = equipos.filter(e => {
        // Si el buscador está vacío, mostramos todos
        if (!busqueda.trim()) return true;

        // Convertimos la búsqueda en un array de palabras (separadas por espacio)
        // Ejemplo: "Paita motor" -> ["paita", "motor"]
        const terminos = busqueda.toLowerCase().split(/\s+/).filter(t => t.length > 0);

        // Verificamos que CADA palabra del buscador esté en ALGÚN campo del equipo
        return terminos.every(termino => {
            return (
                (e.placaRodaje?.toLowerCase() || "").includes(termino) ||
                (e.codigoEquipo?.toLowerCase() || "").includes(termino) ||
                (e.status?.toLowerCase() || "").includes(termino) ||
                (e.ubic?.toLowerCase() || "").includes(termino) ||
                (e.obs?.toLowerCase() || "").includes(termino) ||
                (e.proyecto?.toLowerCase() || "").includes(termino) ||
                (e.descripcionEquipo?.toLowerCase() || "").includes(termino) ||
                (e.marca?.toLowerCase() || "").includes(termino)

            );
        });
    })

    const total = equipos.length
    const operativos = equipos.filter(e => e.status?.toLowerCase() === 'operativo').length
    const inoperativos = total - operativos
    const disponibilidad = total > 0 ? (operativos / total) * 100 : 0

    if (loading) return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-[#F8FAFC]">
            <Loader2 className="animate-spin text-blue-600 mb-4" size={40} />
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Sincronizando...</p>
        </div>
    )

    return (
        <main className="min-h-screen bg-[#F8FAFC] p-4 md:p-10 font-sans text-slate-900 relative">
            <div className="max-w-7xl mx-auto space-y-6">

                {/* HEADER */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm">
                    <div className="flex items-center gap-4">
                        <button onClick={() => router.back()} className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-400 hover:text-blue-600 transition-all"><ArrowLeft size={18} /></button>
                        <div>
                            <h1 className="text-xl font-black text-slate-800 tracking-tight uppercase">Resumen de Estatus</h1>
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Panel de Control</p>
                        </div>
                    </div>
                    <div className="flex flex-col sm:flex-row items-center gap-3 w-full md:w-auto">
                        <div className="relative w-full sm:w-64">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={16} />
                            <input onChange={(e) => setBusqueda(e.target.value)} placeholder="Buscar unidad..." className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border-none rounded-xl text-xs font-bold focus:ring-2 focus:ring-blue-500 outline-none transition-all shadow-inner" />
                        </div>
                        <button
                            onClick={descargarExcel}
                            className="flex items-center gap-2 px-5 py-2.5 bg-emerald-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-emerald-700 transition-all shadow-lg active:scale-95"
                        >
                            <Download size={16} /> Excel
                        </button>
                    </div>
                </div>

                {/* KPIs */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm flex items-center gap-4">
                        <div className="bg-blue-50 p-3 rounded-2xl text-blue-600"><Truck size={20} /></div>
                        <div><p className="text-[9px] font-black text-slate-400 uppercase leading-none">Total</p><p className="text-xl font-black text-slate-800">{total}</p></div>
                    </div>
                    <div className="bg-white p-5 rounded-3xl border border-emerald-50 shadow-sm flex items-center gap-4">
                        <div className="bg-emerald-50 p-3 rounded-2xl text-emerald-600"><CheckCircle2 size={20} /></div>
                        <div><p className="text-[9px] font-black text-emerald-600 uppercase leading-none">Operativos</p><p className="text-xl font-black text-slate-800">{operativos}</p></div>
                    </div>
                    <div className="bg-white p-5 rounded-3xl border border-rose-50 shadow-sm flex items-center gap-4">
                        <div className="bg-rose-50 p-3 rounded-2xl text-rose-600"><XCircle size={20} /></div>
                        <div><p className="text-[9px] font-black text-rose-600 uppercase leading-none">Inoperativos</p><p className="text-xl font-black text-slate-800">{inoperativos}</p></div>
                    </div>
                    <div className={`p-5 rounded-3xl border shadow-sm flex items-center gap-4 ${disponibilidad >= 85 ? 'bg-white border-emerald-100' : 'bg-amber-50 border-amber-200'}`}>
                        <div className={`p-3 rounded-2xl ${disponibilidad >= 85 ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-100 text-amber-600'}`}><Percent size={20} /></div>
                        <div><p className="text-[9px] font-black uppercase leading-none">Disponibilidad</p><p className="text-xl font-black text-slate-800">{disponibilidad.toFixed(1)}%</p></div>
                    </div>
                </div>

                {/* TABLA */}
                <section className="bg-white rounded-[2rem] shadow-sm border border-slate-100 overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-slate-50/50">
                                    <th className="p-5 text-[9px] font-black text-slate-400 uppercase tracking-widest">Unidad</th>
                                    <th className="p-5 text-[9px] font-black text-slate-400 uppercase tracking-widest">Estatus</th>
                                    <th className="p-5 text-[9px] font-black text-slate-400 uppercase tracking-widest">Ubicación</th>
                                    <th className="p-5 text-[9px] font-black text-slate-400 uppercase tracking-widest min-w-[250px]">Observaciones / Motivo</th>
                                    <th className="p-5 text-[9px] font-black text-slate-400 uppercase tracking-widest text-center">Acciones</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50">
                                {filtrados.map((eq) => {
                                    const isOp = eq.status?.toLowerCase() === 'operativo';
                                    return (
                                        <tr key={eq.placaRodaje} className="hover:bg-slate-50/30 transition-colors group align-top">
                                            <td className="p-5">
                                                <p className="text-sm font-black text-slate-700 font-mono leading-none">{eq.placaRodaje}</p>
                                                <span className="text-[9px] font-bold text-blue-500 uppercase">{eq.codigoEquipo}</span>
                                            </td>
                                            <td className="p-5">
                                                <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-[9px] font-black uppercase ${isOp ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
                                                    <div className={`w-1 h-1 rounded-full ${isOp ? 'bg-emerald-500' : 'bg-rose-500 animate-pulse'}`} />
                                                    {eq.status}
                                                </div>
                                            </td>
                                            <td className="p-5">
                                                <div className="flex items-start gap-2 pt-1">
                                                    <MapPin size={12} className="text-slate-300 mt-0.5" />
                                                    <p className="text-[11px] font-bold text-slate-600 uppercase leading-tight">{eq.ubic || '---'}</p>
                                                </div>
                                            </td>
                                            <td className="p-5 w-[300px]">
                                                <div className="group/obs relative pt-1">
                                                    <div className="max-h-[80px] overflow-y-auto scrollbar-hide hover:scrollbar-default pr-2">
                                                        <p className={`text-[11px] font-medium leading-relaxed whitespace-pre-wrap break-words ${!isOp ? 'text-rose-600 italic font-semibold' : 'text-slate-500'}`}>
                                                            {eq.obs || '---'}
                                                        </p>
                                                    </div>
                                                    {eq.obs && eq.obs.length > 80 && (
                                                        <div className="absolute bottom-0 right-0 bg-gradient-to-l from-white via-white/80 to-transparent px-1">
                                                            <span className="text-[7px] text-slate-300 font-bold uppercase tracking-tighter">↓ scroll</span>
                                                        </div>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="p-5">
                                                <div className="flex items-center justify-center gap-2">
                                                    <button onClick={() => handleEditClick(eq)} className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all"><Edit3 size={16} /></button>
                                                    <button onClick={() => handleDelete(eq.placaRodaje)} className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all"><Trash2 size={16} /></button>
                                                </div>
                                            </td>
                                        </tr>
                                    )
                                })}
                            </tbody>
                        </table>
                    </div>
                </section>
            </div>

            {/* MODAL DE EDICIÓN */}
            {showEditModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/20 backdrop-blur-sm">
                    <div className="bg-white w-full max-w-md rounded-[2.5rem] shadow-2xl p-8 border border-slate-100 animate-in fade-in zoom-in duration-200">
                        <div className="flex justify-between items-center mb-6">
                            <div>
                                <h3 className="text-xl font-black text-slate-800 uppercase tracking-tight">Editar Unidad</h3>
                                <p className="text-[10px] font-bold text-blue-600 uppercase tracking-widest">{equipoAEditar?.placaRodaje} - {equipoAEditar?.codigoEquipo}</p>
                            </div>
                            <button onClick={() => setShowEditModal(false)} className="p-2 text-slate-300 hover:text-slate-500"><X size={20} /></button>
                        </div>

                        <div className="space-y-4">
                            <div className="space-y-1">
                                <label className="text-[9px] font-black text-slate-400 uppercase ml-2 tracking-widest">Estado</label>
                                <select
                                    value={formEdit.status}
                                    onChange={(e) => setFormEdit({ ...formEdit, status: e.target.value })}
                                    className="w-full p-3.5 bg-slate-50 border-none rounded-2xl text-xs font-bold outline-none focus:ring-2 focus:ring-blue-500 transition-all uppercase"
                                >
                                    <option value="OPERATIVO">OPERATIVO</option>
                                    <option value="INOPERATIVO">INOPERATIVO</option>
                                    <option value="STAND BY">STAND BY</option>
                                    <option value="MANTENIMIENTO">MANTENIMIENTO</option>
                                </select>
                            </div>

                            <div className="space-y-1">
                                <label className="text-[9px] font-black text-slate-400 uppercase ml-2 tracking-widest">Ubicación</label>
                                <input
                                    value={formEdit.ubic}
                                    onChange={(e) => setFormEdit({ ...formEdit, ubic: e.target.value.toUpperCase() })}
                                    className="w-full p-3.5 bg-slate-50 border-none rounded-2xl text-xs font-bold outline-none focus:ring-2 focus:ring-blue-500 transition-all uppercase"
                                />
                            </div>

                            <div className="space-y-1">
                                <label className="text-[9px] font-black text-slate-400 uppercase ml-2 tracking-widest">Observación / Motivo</label>
                                <textarea
                                    rows={4}
                                    value={formEdit.obs}
                                    onChange={(e) => setFormEdit({ ...formEdit, obs: e.target.value })}
                                    className="w-full p-3.5 bg-slate-50 border-none rounded-2xl text-xs font-medium outline-none focus:ring-2 focus:ring-blue-500 transition-all italic"
                                    placeholder="Indique el motivo del estatus..."
                                />
                            </div>

                            <button
                                onClick={handleUpdate}
                                disabled={guardando}
                                className="w-full bg-slate-900 text-white py-4 rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-lg flex items-center justify-center gap-2 hover:bg-blue-600 transition-all active:scale-95"
                            >
                                {guardando ? <Loader2 className="animate-spin" size={16} /> : <><Save size={16} /> Guardar Cambios</>}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </main>
    )
}