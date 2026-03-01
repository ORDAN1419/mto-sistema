"use client"
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { TrendingDown, Calendar, DollarSign, BarChart3, Loader2 } from 'lucide-react'

export default function ProyeccionesPage() {
    const [proyecciones, setProyecciones] = useState<any[]>([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        const fetchProyecciones = async () => {
            setLoading(true)
            try {
                const { data, error } = await supabase.from('v_neumaticos_estado_actual').select('*')

                if (error) throw error

                // Simulación técnica de proyección basada en desgaste estándar (0.05mm/día)
                const procesados = data?.map(l => ({
                    ...l,
                    dias_restantes: l.mm_actual > 0 ? Math.round(l.mm_actual / 0.05) : 0,
                    fecha_cambio: l.mm_actual > 0
                        ? new Date(Date.now() + (l.mm_actual / 0.05) * 86400000).toLocaleDateString('es-PE')
                        : 'CAMBIO URGENTE'
                }))
                setProyecciones(procesados || [])
            } catch (err) {
                console.error("Error en proyecciones:", err)
            } finally {
                setLoading(false)
            }
        }
        fetchProyecciones()
    }, [])

    return (
        <main className="min-h-screen bg-[#f7f9fa] p-8 text-left leading-none">
            <div className="max-w-6xl mx-auto space-y-6">
                <div className="flex justify-between items-end border-b-2 border-[#354a5f] pb-4">
                    <div>
                        <h1 className="text-2xl font-black text-[#32363a] uppercase tracking-tighter italic">Proyección de Compras y CPK</h1>
                        <p className="text-[10px] font-bold text-slate-400 uppercase mt-2 tracking-widest">Planificación estratégica de inventario S/4HANA Style</p>
                    </div>
                    <BarChart3 className="text-[#354a5f]" size={40} />
                </div>

                {/* Tarjetas de Resumen Financiero */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="bg-white p-6 shadow-sm border-t-4 border-[#0070b1]">
                        <div className="flex justify-between text-slate-400 mb-2">
                            <span className="text-[9px] font-black uppercase">Gasto Proyectado (Próx. 30d)</span>
                            <DollarSign size={14} />
                        </div>
                        <p className="text-2xl font-black text-slate-800 tracking-tighter">
                            $ {loading ? '...' : (proyecciones.filter(p => p.dias_restantes < 30).length * 450).toLocaleString()}
                        </p>
                    </div>
                    <div className="bg-white p-6 shadow-sm border-t-4 border-rose-500">
                        <div className="flex justify-between text-slate-400 mb-2">
                            <span className="text-[9px] font-black uppercase">Alertas de Cambio</span>
                            <TrendingDown size={14} />
                        </div>
                        <p className="text-2xl font-black text-rose-600">
                            {proyecciones.filter(p => p.alerta_color === 'ROJO').length} Unidades
                        </p>
                    </div>
                    <div className="bg-white p-6 shadow-sm border-t-4 border-emerald-500">
                        <div className="flex justify-between text-slate-400 mb-2">
                            <span className="text-[9px] font-black uppercase">Eficiencia CPK Promedio</span>
                            <Calendar size={14} />
                        </div>
                        <p className="text-2xl font-black text-emerald-600">0.024 <span className="text-xs">$/KM</span></p>
                    </div>
                </div>

                {/* Tabla de Predicción de Desgaste */}
                <div className="bg-white border border-[#d3d7d9] shadow-sm overflow-hidden">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-[#f2f4f5] text-[10px] font-black uppercase text-slate-500 border-b">
                                <th className="p-4 border-r">Nº Serie</th>
                                <th className="p-4">Unidad</th>
                                <th className="p-4">Vida Útil (OTR)</th>
                                <th className="p-4">Días Est.</th>
                                <th className="p-4 text-right">Fecha Tentativa Cambio</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 text-sm">
                            {loading ? (
                                <tr>
                                    <td colSpan={5} className="p-10 text-center">
                                        <Loader2 className="animate-spin mx-auto text-slate-300" size={32} />
                                    </td>
                                </tr>
                            ) : proyecciones.map((p, idx) => (
                                // SOLUCIÓN: Key única combinada
                                <tr key={`${p.id_neumatico || 'null'}-${p.serie || idx}`} className="hover:bg-slate-50 transition-colors">
                                    <td className="p-4 font-black text-[#0070b1] border-r">{p.serie}</td>
                                    <td className="p-4">
                                        <div className="flex flex-col">
                                            <span className="font-bold uppercase">{p.placa}</span>
                                            <span className="text-[9px] text-slate-400 font-bold">{p.posicion}</span>
                                        </div>
                                    </td>
                                    <td className="p-4">
                                        <div className="flex items-center gap-2">
                                            <div className="w-20 bg-slate-100 h-2 rounded-full overflow-hidden border border-slate-200">
                                                <div
                                                    className={`h-full ${p.otr_porcentaje < 20 ? 'bg-rose-500' : 'bg-emerald-500'}`}
                                                    style={{ width: `${p.otr_porcentaje}%` }}
                                                />
                                            </div>
                                            <span className="text-[10px] font-black text-slate-500">{Math.round(p.otr_porcentaje)}%</span>
                                        </div>
                                    </td>
                                    <td className="p-4 font-black text-slate-700">{p.dias_restantes} <span className="text-[9px] uppercase opacity-50">Días</span></td>
                                    <td className="p-4 text-right font-black text-rose-600 uppercase italic tracking-tighter">
                                        {p.fecha_cambio}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </main>
    )
}