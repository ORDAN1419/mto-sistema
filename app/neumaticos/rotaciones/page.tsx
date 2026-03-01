"use client"
import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { ArrowRightLeft, AlertCircle, Search, RefreshCw } from 'lucide-react'

export default function RotacionesPage() {
    const [placa, setPlaca] = useState('')
    const [llantas, setLlantas] = useState<any[]>([])
    const [seleccionadas, setSeleccionadas] = useState<any[]>([])
    const [loading, setLoading] = useState(false)

    const cargarLlantas = async () => {
        if (!placa) return
        setLoading(true)
        const { data, error } = await supabase
            .from('v_neumaticos_estado_actual')
            .select('*')
            .eq('placa', placa.toUpperCase().trim())

        if (error) {
            console.error("Error:", error)
        } else {
            setLlantas(data || [])
        }
        setLoading(false)
    }

    const toggleSeleccion = (llanta: any) => {
        const estaSeleccionada = seleccionadas.find(s => s.id_neumatico === llanta.id_neumatico)
        if (estaSeleccionada) {
            setSeleccionadas(seleccionadas.filter(s => s.id_neumatico !== llanta.id_neumatico))
        } else if (seleccionadas.length < 2) {
            setSeleccionadas([...seleccionadas, llanta])
        }
    }

    const ejecutarRotacion = async () => {
        if (seleccionadas.length !== 2) return
        setLoading(true)

        try {
            const [l1, l2] = seleccionadas

            // 1. Desactivar asignaciones actuales
            await supabase.from('neumaticos_asignacion').update({ activo: false }).eq('id_neumatico', l1.id_neumatico)
            await supabase.from('neumaticos_asignacion').update({ activo: false }).eq('id_neumatico', l2.id_neumatico)

            // 2. Insertar nuevas posiciones cruzadas
            const { error } = await supabase.from('neumaticos_asignacion').insert([
                { placa: placa.toUpperCase(), id_neumatico: l1.id_neumatico, posicion: l2.posicion, activo: true },
                { placa: placa.toUpperCase(), id_neumatico: l2.id_neumatico, posicion: l1.posicion, activo: true }
            ])

            if (error) throw error

            alert("🔄 Rotación exitosa: Posiciones intercambiadas.")
            setSeleccionadas([])
            cargarLlantas()
        } catch (err: any) {
            alert("Error: " + err.message)
        } finally {
            setLoading(false)
        }
    }

    return (
        <main className="min-h-screen bg-[#f7f9fa] p-6 text-left leading-none">
            <div className="max-w-4xl mx-auto space-y-6">
                <div className="bg-[#354a5f] p-6 rounded-sm text-white shadow-lg">
                    <h2 className="text-[10px] font-black uppercase tracking-widest mb-4 opacity-70">Gestión de Rotaciones</h2>
                    <div className="flex gap-2">
                        <input
                            className="flex-1 p-3 text-slate-900 font-black uppercase rounded-sm outline-none"
                            placeholder="INGRESE PLACA..."
                            value={placa}
                            onChange={e => setPlaca(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && cargarLlantas()}
                        />
                        <button onClick={cargarLlantas} className="bg-[#0070b1] px-6 font-bold uppercase text-xs rounded-sm hover:bg-[#005a8e] flex items-center gap-2">
                            {loading ? <RefreshCw className="animate-spin" size={14} /> : <Search size={14} />} Cargar
                        </button>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="bg-white border border-[#d3d7d9] p-4 rounded-sm shadow-sm">
                        <h3 className="text-[10px] font-black uppercase text-slate-500 mb-4 italic">Listado de Neumáticos Montados</h3>
                        <div className="space-y-2">
                            {llantas.map((l, index) => (
                                <div
                                    // SOLUCIÓN AL ERROR: Key única garantizada
                                    key={`${l.id_neumatico || 'null'}-${l.posicion || index}`}
                                    onClick={() => toggleSeleccion(l)}
                                    className={`p-4 border cursor-pointer transition-all flex justify-between items-center rounded-sm ${seleccionadas.find(s => s.id_neumatico === l.id_neumatico)
                                        ? 'border-[#0070b1] bg-blue-50 ring-1 ring-[#0070b1]' : 'border-slate-100 hover:border-slate-300'
                                        }`}
                                >
                                    <div>
                                        <p className="text-[10px] font-black text-[#0070b1] uppercase">Pos: {l.posicion}</p>
                                        <p className="text-sm font-black uppercase text-slate-700">{l.serie || 'SIN SERIE'}</p>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-xs font-bold text-slate-600">{l.mm_actual || 0} mm</p>
                                        <p className="text-[8px] uppercase opacity-50 font-bold">Remanente</p>
                                    </div>
                                </div>
                            ))}
                            {llantas.length === 0 && !loading && (
                                <p className="text-center py-10 text-slate-400 font-bold uppercase text-[10px]">No hay llantas activas para esta unidad</p>
                            )}
                        </div>
                    </div>

                    <div className="bg-[#f2f4f5] border border-[#d3d7d9] p-8 rounded-sm flex flex-col items-center justify-center min-h-[300px]">
                        {seleccionadas.length === 2 ? (
                            <div className="space-y-6 w-full animate-in fade-in zoom-in duration-300">
                                <div className="text-center space-y-2">
                                    <p className="text-[10px] font-black text-slate-400 uppercase">Intercambio propuesto</p>
                                    <div className="flex items-center justify-around bg-white p-6 rounded-sm shadow-sm border border-blue-100">
                                        <div className="text-center">
                                            <span className="block text-[9px] font-bold text-slate-400 uppercase">De</span>
                                            <span className="font-black text-xl text-[#0070b1]">{seleccionadas[0].posicion}</span>
                                        </div>
                                        <ArrowRightLeft className="text-[#0070b1]" size={32} />
                                        <div className="text-center">
                                            <span className="block text-[9px] font-bold text-slate-400 uppercase">A</span>
                                            <span className="font-black text-xl text-[#0070b1]">{seleccionadas[1].posicion}</span>
                                        </div>
                                    </div>
                                </div>

                                {Math.abs((seleccionadas[0].mm_actual || 0) - (seleccionadas[1].mm_actual || 0)) > 2 && (
                                    <div className="p-3 bg-amber-50 border border-amber-200 text-amber-700 text-[9px] font-bold uppercase flex items-center gap-2 rounded-sm">
                                        <AlertCircle size={16} />
                                        <span>Alerta: Diferencia de desgaste ({Math.abs(seleccionadas[0].mm_actual - seleccionadas[1].mm_actual).toFixed(1)}mm)</span>
                                    </div>
                                )}

                                <button
                                    onClick={ejecutarRotacion}
                                    disabled={loading}
                                    className="w-full bg-[#0070b1] hover:bg-[#005a8e] text-white py-4 font-black uppercase text-xs rounded-sm shadow-lg transition-all active:scale-95 flex justify-center items-center gap-2"
                                >
                                    {loading ? <RefreshCw className="animate-spin" size={16} /> : "Ejecutar Rotación"}
                                </button>
                            </div>
                        ) : (
                            <div className="text-center opacity-40">
                                <ArrowRightLeft size={48} className="mx-auto mb-4" />
                                <p className="text-[10px] font-black uppercase max-w-[200px] mx-auto">Seleccione dos neumáticos para iniciar el análisis de rotación</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </main>
    )
}