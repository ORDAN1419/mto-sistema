"use client"
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
// Se agregó RefreshCw a la lista de imports
import {
    LayoutGrid,
    AlertTriangle,
    CheckCircle2,
    Truck,
    Download,
    RefreshCw
} from 'lucide-react'

export default function HeatmapFlotaPage() {
    const [datos, setDatos] = useState<any[]>([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        fetchData()
    }, [])

    const fetchData = async () => {
        setLoading(true)
        try {
            // Consulta a la vista de Supabase
            const { data, error } = await supabase
                .from('v_neumaticos_estado_actual')
                .select('*')

            if (error) throw error;

            if (data) {
                // Agrupamos por placa para armar las filas del heatmap
                const agrupado = data.reduce((acc: any, item: any) => {
                    if (!acc[item.placa]) acc[item.placa] = { placa: item.placa, llantas: [] };
                    acc[item.placa].llantas.push(item);
                    return acc;
                }, {});
                setDatos(Object.values(agrupado));
            }
        } catch (error) {
            console.error("Error cargando datos:", error);
            alert("No se pudieron cargar los datos de la flota.");
        } finally {
            setLoading(false)
        }
    }

    const getColorClass = (alerta: string) => {
        switch (alerta) {
            case 'ROJO': return 'bg-rose-500 text-white';
            case 'NARANJA': return 'bg-orange-400 text-white';
            case 'AMARILLO': return 'bg-amber-300 text-slate-800';
            case 'VERDE': return 'bg-emerald-500 text-white';
            default: return 'bg-slate-100 text-slate-400';
        }
    }

    return (
        <main className="min-h-screen bg-[#f7f9fa] p-6 font-sans text-left leading-none">
            <div className="max-w-[1600px] mx-auto space-y-4">
                {/* Header de Reporte */}
                <div className="bg-white border border-[#d3d7d9] p-6 shadow-sm flex justify-between items-center">
                    <div className="flex items-center gap-4">
                        <div className="bg-[#354a5f] p-3 rounded-sm text-white">
                            <LayoutGrid size={24} />
                        </div>
                        <div>
                            <h1 className="text-xl font-black text-[#32363a] uppercase tracking-tighter">Monitor de Remanentes Críticos</h1>
                            <p className="text-[10px] font-bold text-slate-400 uppercase mt-1">Mapa de calor de desgaste de flota en tiempo real</p>
                        </div>
                    </div>
                    <div className="flex gap-2">
                        <button className="flex items-center gap-2 px-4 py-2 bg-white border border-[#d3d7d9] rounded-sm text-[10px] font-black uppercase hover:bg-slate-50 transition-all">
                            <Download size={14} /> Exportar Excel
                        </button>
                        <button
                            onClick={fetchData}
                            disabled={loading}
                            className="flex items-center gap-2 px-4 py-2 bg-[#0070b1] text-white rounded-sm text-[10px] font-black uppercase hover:bg-[#005a8e] transition-all shadow-md disabled:opacity-50"
                        >
                            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
                            {loading ? 'Cargando...' : 'Actualizar Datos'}
                        </button>
                    </div>
                </div>

                {/* Resumen de Alertas (Valores ejemplo, podrías calcularlos del estado 'datos') */}
                <div className="grid grid-cols-4 gap-4 text-left">
                    <div className="bg-white border-l-4 border-rose-500 p-4 shadow-sm">
                        <span className="text-[9px] font-black text-slate-400 uppercase">Llantas en Crítico</span>
                        <p className="text-2xl font-black text-rose-600 mt-1">12</p>
                    </div>
                    <div className="bg-white border-l-4 border-orange-400 p-4 shadow-sm">
                        <span className="text-[9px] font-black text-slate-400 uppercase">Próximos Retiros</span>
                        <p className="text-2xl font-black text-orange-500 mt-1">24</p>
                    </div>
                    <div className="bg-white border-l-4 border-emerald-500 p-4 shadow-sm">
                        <span className="text-[9px] font-black text-slate-400 uppercase">Estado Óptimo</span>
                        <p className="text-2xl font-black text-emerald-600 mt-1">156</p>
                    </div>
                    <div className="bg-white border-l-4 border-[#0070b1] p-4 shadow-sm">
                        <span className="text-[9px] font-black text-slate-400 uppercase tracking-tighter leading-none">Última Inspección</span>
                        <p className="text-sm font-black text-[#32363a] mt-2 leading-none uppercase tracking-tighter italic opacity-80">En vivo</p>
                    </div>
                </div>

                {/* EL HEATMAP */}
                <div className="bg-white border border-[#d3d7d9] shadow-sm overflow-x-auto">
                    <table className="w-full text-left border-collapse min-w-[1000px]">
                        <thead>
                            <tr className="bg-[#f2f4f5] border-b border-[#d3d7d9]">
                                <th className="p-4 text-[10px] font-black uppercase text-slate-500 w-48 border-r">Unidad / Placa</th>
                                <th className="p-4 text-[10px] font-black uppercase text-slate-500 text-center" colSpan={2}>Eje 1 (Dir)</th>
                                <th className="p-4 text-[10px] font-black uppercase text-slate-500 text-center border-l" colSpan={4}>Eje 2 (Trac)</th>
                                <th className="p-4 text-[10px] font-black uppercase text-slate-500 text-center border-l" colSpan={4}>Eje 3 (Trac)</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-[#ebeef0]">
                            {datos.map((unidad) => (
                                <tr key={unidad.placa} className="hover:bg-slate-50 transition-colors group">
                                    <td className="p-4 border-r bg-[#fcfcfc]">
                                        <div className="flex items-center gap-3">
                                            <div className="p-2 bg-slate-100 rounded-sm text-slate-400 group-hover:bg-[#354a5f] group-hover:text-white transition-all">
                                                <Truck size={16} />
                                            </div>
                                            <span className="font-black text-sm text-[#354a5f] tracking-tighter">{unidad.placa}</span>
                                        </div>
                                    </td>

                                    {/* Mapeo de posiciones */}
                                    {["1I", "1D", "2IE", "2II", "2DI", "2DE", "3IE", "3II", "3DI", "3DE"].map((pos) => {
                                        const llanta = unidad.llantas.find((l: any) => l.posicion === pos);
                                        return (
                                            <td key={pos} className="p-1 text-center min-w-[60px]">
                                                {llanta ? (
                                                    <div className={`py-3 px-1 rounded-sm text-[11px] font-black shadow-inner border border-black/5 group/tip relative cursor-help ${getColorClass(llanta.alerta_color)}`}>
                                                        {Math.round(llanta.mm_actual)}
                                                        <span className="block text-[7px] opacity-60 font-bold uppercase">{llanta.posicion}</span>

                                                        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover/tip:block bg-slate-900 text-white p-2 rounded-sm text-[9px] w-28 z-50 shadow-2xl leading-tight border border-white/20">
                                                            <p className="font-black text-blue-400 uppercase">{llanta.serie}</p>
                                                            <p className="mt-1 opacity-70">Vida útil: {llanta.otr_porcentaje}%</p>
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <div className="h-10 bg-slate-50/50 border border-dashed border-slate-200 rounded-sm" />
                                                )}
                                            </td>
                                        );
                                    })}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </main>
    )
}