"use client"
import { useEffect, useState, useMemo, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import {
    Search,
    ChevronRight,
    ShieldAlert,
    RefreshCw,
    XCircle,
    Clock,
    Keyboard,
    ExternalLink,
    AlertTriangle,
    Database,
    Truck // ✅ Icono agregado a la importación
} from 'lucide-react'
import { format, parseISO } from 'date-fns'
import { es } from 'date-fns/locale'

interface ControlActualizacion {
    codigoEquipo: string;
    placaRodaje: string;
    marca: string;
    modelo: string;
    horas_restantes: number;
    fecha_ultima_act: string;
    dias_sin_actualizar: number;
    motivo_alerta: string;
}

export default function ControlActualizacionPage() {
    const router = useRouter()
    const [data, setData] = useState<ControlActualizacion[]>([])
    const [loading, setLoading] = useState(true)
    const [busqueda, setBusqueda] = useState('')
    const searchRef = useRef<HTMLInputElement>(null)

    const fetchData = async () => {
        setLoading(true)
        try {
            const { data: result, error } = await supabase
                .from('v_control_actualizacion_diaria')
                .select('*')
            if (error) throw error
            setData(result || [])
        } catch (err) {
            console.error("Error cargando vista:", err)
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => { fetchData() }, [])

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.altKey && e.key.toLowerCase() === 's') {
                e.preventDefault()
                searchRef.current?.focus()
            }
            if (e.altKey && e.key.toLowerCase() === 'x') {
                e.preventDefault()
                setBusqueda('')
            }
            if (e.ctrlKey && e.key === '0') {
                e.preventDefault()
                router.push('/equipos')
            }
            if (e.ctrlKey && e.key === '1') {
                e.preventDefault()
                router.push('/historial-horometro')
            }
        }
        window.addEventListener('keydown', handleKeyDown)
        return () => window.removeEventListener('keydown', handleKeyDown)
    }, [router])

    const filteredData = useMemo(() => {
        const term = busqueda.toLowerCase().trim()
        return data.filter(item =>
            (item.placaRodaje || "").toLowerCase().includes(term) ||
            (item.codigoEquipo || "").toLowerCase().includes(term) ||
            (item.marca || "").toLowerCase().includes(term) ||
            (item.motivo_alerta || "").toLowerCase().includes(term)
        )
    }, [data, busqueda])

    return (
        <div className="min-h-screen bg-[#edf0f2] text-[#32363a] font-sans text-left selection:bg-blue-100 antialiased">
            <header className="bg-[#354a5f] text-white px-4 py-1 flex items-center justify-between shadow-sm sticky top-0 z-50">
                <div className="flex items-center gap-3">
                    <ShieldAlert size={14} className="text-orange-400" />
                    <span className="text-[9px] font-black uppercase tracking-[0.2em] opacity-90">
                        GH COIN | monitor de horometros
                    </span>
                </div>
                <div className="flex gap-4 text-[8px] font-bold opacity-50 uppercase tracking-tighter text-left">
                    <span>Alt+S: Buscar</span>
                    <span>Alt+X: Limpiar</span>
                    <span>Ctrl+0: Equipos</span>
                    <span>Ctrl+1: Historial</span>
                </div>
            </header>

            <div className="bg-white border-b border-[#d8dce3] px-6 py-2.5 shadow-sm">
                <div className="max-w-[1600px] mx-auto flex justify-between items-center">
                    <div className="flex items-center gap-3">
                        <Database size={18} className="text-[#354a5f]/50" />
                        <h1 className="text-sm font-black uppercase text-[#32363a] tracking-tight text-left">Integridad de Datos Diarios</h1>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="relative">
                            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#6a6d70]" size={12} />
                            <input
                                ref={searchRef}
                                type="text"
                                value={busqueda}
                                placeholder="Filtrar..."
                                className="pl-8 pr-4 py-1.5 bg-[#f4f6f8] border border-[#ced4da] rounded-sm text-[11px] focus:bg-white focus:border-[#0070d2] outline-none font-bold uppercase w-56 transition-all shadow-inner"
                                onChange={(e) => setBusqueda(e.target.value)}
                            />
                        </div>
                        <button onClick={fetchData} className="p-1.5 hover:bg-slate-100 rounded-sm text-[#0070d2] transition-all">
                            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
                        </button>
                    </div>
                </div>
            </div>

            <main className="max-w-[1600px] mx-auto p-4 mb-8">
                <div className="bg-white border border-[#d8dce3] rounded-sm shadow-sm overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse table-fixed">
                            <thead className="bg-[#f8f9fa] border-b border-[#d8dce3]">
                                <tr>
                                    <th className="w-12 p-2 text-[9px] font-black text-slate-400 uppercase text-center">St.</th>
                                    <th className="w-32 p-2 text-[9px] font-black text-slate-400 uppercase">Placa / ID</th>
                                    <th className="p-2 text-[9px] font-black text-slate-400 uppercase">Marca y Modelo</th>
                                    <th className="w-24 p-2 text-[9px] font-black text-slate-400 uppercase text-center">Retraso</th>
                                    <th className="w-40 p-2 text-[9px] font-black text-slate-400 uppercase">Último Reporte</th>
                                    <th className="w-28 p-2 text-[9px] font-black text-slate-400 uppercase text-right">Hrs Faltantes</th>
                                    <th className="w-64 p-2 text-[9px] font-black text-slate-400 uppercase text-left">Motivo de Alerta</th>
                                    <th className="w-20 p-2 text-[9px] font-black text-slate-400 uppercase text-center">Gestión</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-[#f1f3f5]">
                                {filteredData.map((item) => (
                                    <tr key={item.codigoEquipo} className="hover:bg-[#f0f4f8] transition-colors group">
                                        <td className="p-2 text-center">
                                            <div className={`w-2.5 h-2.5 rounded-full mx-auto shadow-sm ${item.dias_sin_actualizar >= 5 ? 'bg-rose-600 animate-pulse' : 'bg-orange-500'
                                                }`} />
                                        </td>
                                        <td className="p-2">
                                            <div className="flex flex-col leading-tight text-left">
                                                <span className="text-[11px] font-black text-[#0070d2] uppercase">{item.placaRodaje}</span>
                                                <span className="text-[8px] font-bold text-slate-400 uppercase">{item.codigoEquipo}</span>
                                            </div>
                                        </td>
                                        <td className="p-2 truncate text-[10px] font-bold text-[#555] uppercase text-left">
                                            {item.marca} {item.modelo}
                                        </td>
                                        <td className="p-2 text-center text-left">
                                            <span className={`text-[11px] font-black px-1.5 py-0.5 rounded-sm ${item.dias_sin_actualizar >= 5 ? 'text-rose-600 bg-rose-50' : 'text-orange-600 bg-orange-50'
                                                }`}>
                                                {item.dias_sin_actualizar}d
                                            </span>
                                        </td>
                                        <td className="p-2 text-[10px] font-medium text-slate-600 uppercase text-left">
                                            {item.fecha_ultima_act ? format(parseISO(item.fecha_ultima_act), 'dd MMM yyyy', { locale: es }) : 'N/A'}
                                        </td>
                                        <td className="p-2 text-right text-left text-right">
                                            <span className="text-[10px] font-black text-slate-700 font-mono">
                                                {Number(item.horas_restantes || 0).toFixed(1)}
                                            </span>
                                        </td>
                                        <td className="p-2 text-left">
                                            <span className={`text-[8px] font-black px-1.5 py-0.5 rounded-sm border uppercase leading-none block w-fit ${item.motivo_alerta.includes('OBLIGATORIA')
                                                ? 'bg-rose-600 text-white border-rose-600'
                                                : 'bg-white text-orange-600 border-orange-200'
                                                }`}>
                                                {item.motivo_alerta}
                                            </span>
                                        </td>
                                        <td className="p-2 text-center">
                                            <button
                                                onClick={() => router.push(`/historial-horometro?placa=${item.placaRodaje}`)}
                                                className="bg-slate-100 hover:bg-[#0070d2] hover:text-white p-1.5 rounded-sm text-[#0070d2] transition-all"
                                            >
                                                <ExternalLink size={12} />
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </main>

            <footer className="fixed bottom-0 w-full bg-[#354a5f] text-white px-6 py-1 flex justify-between items-center text-[9px] font-bold uppercase">
                <div className="flex gap-6">
                    <span className="flex items-center gap-1.5"><Truck size={10} /> Total: {data.length}</span>
                    <span className="flex items-center gap-1.5 text-orange-300"><AlertTriangle size={10} /> Filtrados: {filteredData.length}</span>
                </div>
                <div className="opacity-50">GH COIN MINADO - OPERACIONES</div>
            </footer>
        </div>
    )
}