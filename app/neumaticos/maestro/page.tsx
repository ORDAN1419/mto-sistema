"use client"
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import {
    Plus, Search, Save, X, Package,
    Database, RefreshCw, Trash2, ShieldCheck
} from 'lucide-react'

export default function MaestroNeumaticosPage() {
    const [loading, setLoading] = useState(true)
    const [items, setItems] = useState<any[]>([])
    const [showModal, setShowModal] = useState(false)
    const [busqueda, setBusqueda] = useState('')

    // Formulario
    const [form, setForm] = useState({
        serie: '', marca: '', modelo: '', medida: '',
        cocada_original: 25, punto_retiro: 3, estado: 'STOCK'
    })

    useEffect(() => {
        fetchNeumaticos()
    }, [])

    const fetchNeumaticos = async () => {
        setLoading(true)
        const { data, error } = await supabase
            .from('neumaticos_maestro')
            .select('*')
            .order('created_at', { ascending: false })
        if (!error) setItems(data || [])
        setLoading(false)
    }

    const handleGuardar = async (e: React.FormEvent) => {
        e.preventDefault()
        const { error } = await supabase.from('neumaticos_maestro').insert([form])
        if (error) {
            alert("Error al registrar: " + error.message)
        } else {
            setShowModal(false)
            setForm({ serie: '', marca: '', modelo: '', medida: '', cocada_original: 25, punto_retiro: 3, estado: 'STOCK' })
            fetchNeumaticos()
        }
    }

    const itemsFiltrados = items.filter(i =>
        i.serie.toLowerCase().includes(busqueda.toLowerCase()) ||
        i.marca.toLowerCase().includes(busqueda.toLowerCase())
    )

    return (
        <main className="min-h-screen bg-[#f7f9fa] text-[#32363a] font-sans">
            {/* SAP Header */}
            <nav className="bg-[#354a5f] text-white h-12 flex items-center px-4 justify-between shadow-md">
                <div className="flex items-center gap-4">
                    <div className="bg-[#0070b1] p-1.5 rounded-sm">
                        <Package size={18} />
                    </div>
                    <span className="font-bold text-sm uppercase tracking-tight">Gestión de Neumáticos | Maestro</span>
                </div>
                <button onClick={() => setShowModal(true)} className="bg-[#0070b1] hover:bg-[#005a8e] px-4 py-1.5 rounded-sm text-xs font-bold uppercase transition-all shadow-sm flex items-center gap-2">
                    <Plus size={14} /> Registrar Nuevo
                </button>
            </nav>

            <div className="max-w-[1600px] mx-auto p-4 space-y-4">
                {/* Filtros */}
                <div className="bg-white border border-[#d3d7d9] p-4 shadow-sm flex gap-4 items-center">
                    <div className="relative flex-1 max-w-md">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[#6a6d70]" size={16} />
                        <input
                            type="text"
                            placeholder="Buscar por Serie o Marca..."
                            className="w-full pl-10 pr-4 py-2 border border-[#b0b3b5] focus:border-[#0070b1] rounded-sm text-sm outline-none"
                            value={busqueda}
                            onChange={(e) => setBusqueda(e.target.value)}
                        />
                    </div>
                    <button onClick={fetchNeumaticos} className="p-2 hover:bg-slate-100 text-[#0070b1] rounded-sm transition-colors">
                        <RefreshCw size={20} className={loading ? 'animate-spin' : ''} />
                    </button>
                </div>

                {/* Tabla SAP Style */}
                <div className="bg-white border border-[#d3d7d9] shadow-sm overflow-hidden">
                    <table className="w-full text-left text-sm border-collapse">
                        <thead>
                            <tr className="bg-[#f2f4f5] text-[#6a6d70] border-b border-[#d3d7d9] uppercase text-[10px] font-bold">
                                <th className="px-4 py-3">Nº de Serie</th>
                                <th className="px-4 py-3">Marca / Modelo</th>
                                <th className="px-4 py-3">Medida</th>
                                <th className="px-4 py-3 text-center">Original (mm)</th>
                                <th className="px-4 py-3 text-center">Retiro (mm)</th>
                                <th className="px-4 py-3 text-center">Estado</th>
                                <th className="px-4 py-3 text-right">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-[#ebeef0]">
                            {itemsFiltrados.map((item) => (
                                <tr key={item.id} className="hover:bg-[#f7f9fa] transition-colors group">
                                    <td className="px-4 py-3 font-bold text-[#0070b1] font-mono">{item.serie}</td>
                                    <td className="px-4 py-3">
                                        <div className="flex flex-col">
                                            <span className="font-bold">{item.marca}</span>
                                            <span className="text-[10px] text-[#6a6d70] uppercase">{item.modelo}</span>
                                        </div>
                                    </td>
                                    <td className="px-4 py-3 text-[#6a6d70] font-medium">{item.medida}</td>
                                    <td className="px-4 py-3 text-center font-bold">{item.cocada_original.toFixed(1)}</td>
                                    <td className="px-4 py-3 text-center text-[#bb0000] font-bold">{item.punto_retiro.toFixed(1)}</td>
                                    <td className="px-4 py-3 text-center">
                                        <span className={`px-2 py-0.5 rounded-sm text-[9px] font-bold border uppercase ${item.estado === 'MONTADO' ? 'bg-blue-50 border-blue-200 text-blue-600' : 'bg-green-50 border-green-200 text-green-600'
                                            }`}>
                                            {item.estado}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3 text-right opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button className="text-slate-400 hover:text-red-600"><Trash2 size={16} /></button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Modal de Registro (SAP Fiori Dialog) */}
            {showModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
                    <div className="bg-white w-full max-w-md rounded-sm shadow-2xl overflow-hidden border border-[#d3d7d9]">
                        <div className="bg-[#354a5f] p-3 flex justify-between items-center text-white">
                            <span className="text-xs font-bold uppercase tracking-wider">Nuevo Neumático</span>
                            <button onClick={() => setShowModal(false)}><X size={20} /></button>
                        </div>
                        <form onSubmit={handleGuardar} className="p-6 space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="col-span-2 space-y-1">
                                    <label className="text-[10px] font-bold text-[#6a6d70] uppercase leading-none">Número de Serie (ID)</label>
                                    <input required className="w-full p-2 border border-[#b0b3b5] rounded-sm text-xs font-bold uppercase" value={form.serie} onChange={e => setForm({ ...form, serie: e.target.value })} />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[10px] font-bold text-[#6a6d70] uppercase leading-none">Marca</label>
                                    <input required className="w-full p-2 border border-[#b0b3b5] rounded-sm text-xs" value={form.marca} onChange={e => setForm({ ...form, marca: e.target.value })} />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[10px] font-bold text-[#6a6d70] uppercase leading-none">Modelo</label>
                                    <input required className="w-full p-2 border border-[#b0b3b5] rounded-sm text-xs" value={form.modelo} onChange={e => setForm({ ...form, modelo: e.target.value })} />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[10px] font-bold text-[#6a6d70] uppercase leading-none">Original (mm)</label>
                                    <input type="number" step="0.1" className="w-full p-2 border border-[#b0b3b5] rounded-sm text-xs font-black" value={form.cocada_original} onChange={e => setForm({ ...form, cocada_original: parseFloat(e.target.value) })} />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[10px] font-bold text-[#6a6d70] uppercase leading-none">Retiro (mm)</label>
                                    <input type="number" step="0.1" className="w-full p-2 border border-[#b0b3b5] rounded-sm text-xs font-black text-[#bb0000]" value={form.punto_retiro} onChange={e => setForm({ ...form, punto_retiro: parseFloat(e.target.value) })} />
                                </div>
                            </div>
                            <button type="submit" className="w-full bg-[#0070b1] hover:bg-[#005a8e] text-white py-2 rounded-sm font-bold text-xs uppercase shadow-md flex items-center justify-center gap-2">
                                <Save size={16} /> Contabilizar Entrada
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </main>
    )
}