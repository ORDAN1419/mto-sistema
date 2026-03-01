"use client"
import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { AlertOctagon, RefreshCw, Trash2, ArrowLeftRight, CheckCircle2, Search, Save } from 'lucide-react'

export default function GestionEstadosPage() {
    const [serieBusqueda, setSerieBusqueda] = useState('')
    const [neumatico, setNeumatico] = useState<any>(null)
    const [loading, setLoading] = useState(false)

    const buscarNeumatico = async () => {
        setLoading(true)
        const { data, error } = await supabase
            .from('neumaticos_maestro')
            .select('*')
            .eq('serie', serieBusqueda.toUpperCase())
            .single()

        if (data) setNeumatico(data)
        else alert("Neumático no encontrado")
        setLoading(false)
    }

    const actualizarEstado = async (nuevoEstado: string, motivo: string) => {
        if (!confirm(`¿Confirmar cambio a estado: ${nuevoEstado}?`)) return

        // 1. Actualizar el maestro
        const { error: errorMaestro } = await supabase
            .from('neumaticos_maestro')
            .update({
                estado: nuevoEstado,
                reencauches: nuevoEstado === 'REENCAUCHE' ? neumatico.reencauches + 1 : neumatico.reencauches
            })
            .eq('id', neumatico.id)

        // 2. Si se da de baja o reencauche, debemos "liberar" la posición en el camión
        if (['BAJA', 'REENCAUCHE', 'STOCK'].includes(nuevoEstado)) {
            await supabase
                .from('neumaticos_asignacion')
                .update({ activo: false })
                .eq('id_neumatico', neumatico.id)
        }

        if (!errorMaestro) {
            alert("Estado actualizado correctamente");
            setNeumatico(null);
            setSerieBusqueda('');
        }
    }

    return (
        <main className="min-h-screen bg-[#f7f9fa] p-6 font-sans">
            <div className="max-w-2xl mx-auto space-y-6">

                {/* Buscador de Neumático */}
                <div className="bg-white border border-[#d3d7d9] p-6 shadow-sm rounded-sm">
                    <h2 className="text-xs font-bold text-[#6a6d70] uppercase mb-4 tracking-widest">Control de Ciclo de Vida</h2>
                    <div className="flex gap-2">
                        <input
                            type="text"
                            placeholder="INGRESE SERIE DEL NEUMÁTICO..."
                            className="flex-1 p-3 border-2 border-[#b0b3b5] rounded-sm text-sm font-black uppercase focus:border-[#0070b1] outline-none"
                            value={serieBusqueda}
                            onChange={(e) => setSerieBusqueda(e.target.value)}
                        />
                        <button
                            onClick={buscarNeumatico}
                            className="bg-[#354a5f] text-white px-6 rounded-sm font-bold text-xs uppercase hover:bg-[#2a3a4a] transition-all"
                        >
                            <Search size={18} />
                        </button>
                    </div>
                </div>

                {neumatico && (
                    <div className="bg-white border border-[#d3d7d9] shadow-xl rounded-sm overflow-hidden animate-in fade-in zoom-in duration-300">
                        {/* Cabecera del Neumático Encontrado */}
                        <div className="bg-[#0070b1] p-4 text-white flex justify-between items-center">
                            <div>
                                <p className="text-[10px] uppercase font-bold opacity-80">Serie Seleccionada</p>
                                <h3 className="text-xl font-black">{neumatico.serie}</h3>
                            </div>
                            <div className="text-right">
                                <p className="text-[10px] uppercase font-bold opacity-80">Estado Actual</p>
                                <span className="bg-white text-[#0070b1] px-2 py-0.5 rounded-sm text-[10px] font-black uppercase">
                                    {neumatico.estado}
                                </span>
                            </div>
                        </div>

                        <div className="p-8 grid grid-cols-1 gap-4">
                            <p className="text-[11px] font-bold text-[#6a6d70] uppercase border-b border-[#f2f4f5] pb-2">Acciones Disponibles</p>

                            <div className="grid grid-cols-2 gap-3">
                                {/* Botón Reencauche */}
                                <button
                                    onClick={() => actualizarEstado('REENCAUCHE', 'Envío a planta')}
                                    className="flex items-center gap-4 p-4 border border-[#d3d7d9] hover:bg-blue-50 hover:border-blue-300 transition-all group"
                                >
                                    <div className="bg-blue-100 p-3 rounded-sm text-blue-600 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                                        <RefreshCw size={24} />
                                    </div>
                                    <div className="text-left">
                                        <span className="block font-black text-xs uppercase">Enviar a Reencauche</span>
                                        <span className="text-[9px] text-slate-400 uppercase">Suma +1 al contador de renovado</span>
                                    </div>
                                </button>

                                {/* Botón Dar de Baja */}
                                <button
                                    onClick={() => actualizarEstado('BAJA', 'Daño irreparable')}
                                    className="flex items-center gap-4 p-4 border border-[#d3d7d9] hover:bg-red-50 hover:border-red-300 transition-all group"
                                >
                                    <div className="bg-red-100 p-3 rounded-sm text-red-600 group-hover:bg-red-600 group-hover:text-white transition-colors">
                                        <AlertOctagon size={24} />
                                    </div>
                                    <div className="text-left">
                                        <span className="block font-black text-xs uppercase text-red-600">Dar de Baja</span>
                                        <span className="text-[9px] text-slate-400 uppercase">Reventón / Corte / Fin de vida</span>
                                    </div>
                                </button>

                                {/* Botón Regresar a Almacén */}
                                <button
                                    onClick={() => actualizarEstado('STOCK', 'Desmontaje preventivo')}
                                    className="flex items-center gap-4 p-4 border border-[#d3d7d9] hover:bg-slate-50 transition-all group"
                                >
                                    <div className="bg-slate-100 p-3 rounded-sm text-slate-600 group-hover:bg-slate-600 group-hover:text-white transition-colors">
                                        <ArrowLeftRight size={24} />
                                    </div>
                                    <div className="text-left">
                                        <span className="block font-black text-xs uppercase">Enviar a Stock</span>
                                        <span className="text-[9px] text-slate-400 uppercase">Para uso en otra unidad</span>
                                    </div>
                                </button>

                                {/* Botón Reparación */}
                                <button
                                    onClick={() => actualizarEstado('REPARACIÓN', 'Parche o vulcanizado')}
                                    className="flex items-center gap-4 p-4 border border-[#d3d7d9] hover:bg-orange-50 transition-all group"
                                >
                                    <div className="bg-orange-100 p-3 rounded-sm text-orange-600 group-hover:bg-orange-600 group-hover:text-white transition-colors">
                                        <CheckCircle2 size={24} />
                                    </div>
                                    <div className="text-left">
                                        <span className="block font-black text-xs uppercase">En Reparación</span>
                                        <span className="text-[9px] text-slate-400 uppercase">Corte menor / Vulcanizado</span>
                                    </div>
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </main>
    )
}