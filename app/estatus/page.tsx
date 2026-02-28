"use client"
import { useEffect, useState, useMemo, useCallback, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import * as XLSX from 'xlsx'
import {
    LayoutGrid, Search, Filter, Download, ArrowLeft, Loader2,
    ClipboardList, Clock, Truck, MoreHorizontal,
    FileText, CheckCircle2, AlertCircle, Calendar, RefreshCw, HelpCircle, X
} from 'lucide-react'

interface ReporteConductor {
    id: string;
    placaRodaje: string;
    codigoEquipo: string;
    descripcionEquipo: string;
    fechaReporte: string;
    horometroInicial: number;
    horometroFinal: number;
    detalleReporte: string;
    statusReporte: string;
    turno: string;
}

export default function SapReportesPage() {
    const router = useRouter()
    const [reportes, setReportes] = useState<ReporteConductor[]>([])
    const [loading, setLoading] = useState(true)
    const [busqueda, setBusqueda] = useState('')
    const [isHelpModalOpen, setIsHelpModalOpen] = useState(false)
    const inputSearchRef = useRef<HTMLInputElement>(null)

    // --- 1. CARGA DE DATOS ---
    const fetchReportes = useCallback(async () => {
        try {
            setLoading(true)
            const { data, error } = await supabase
                .from('reportesConductor')
                .select('*')
                .order('fechaReporte', { ascending: false })

            if (error) throw error
            setReportes(data || [])
        } catch (err) {
            console.error("SAP System Error:", err)
        } finally {
            setLoading(false)
        }
    }, [])

    useEffect(() => { fetchReportes() }, [fetchReportes])

    // --- 2. ATAJOS DE TECLADO ---
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            // Navegación CTRL
            if (e.ctrlKey && e.key === '1') { e.preventDefault(); router.push('/rendimiento'); }
            if (e.ctrlKey && e.key === '2') { e.preventDefault(); router.push('/bdrepuestos'); }
            if (e.ctrlKey && e.key === '3') { e.preventDefault(); router.push('/estatus'); }
            if (e.ctrlKey && e.key === '4') { e.preventDefault(); router.push('/repuestos'); }

            // Operativos ALT
            if (e.altKey && e.key.toLowerCase() === 's') { e.preventDefault(); inputSearchRef.current?.focus(); }
            if (e.altKey && e.key.toLowerCase() === 'x') { e.preventDefault(); setBusqueda(''); alert("🧹 Filtros de búsqueda borrados"); }
            if (e.altKey && e.key.toLowerCase() === 'q') { e.preventDefault(); fetchReportes(); }
            if (e.altKey && e.key.toLowerCase() === 'h') { e.preventDefault(); setIsHelpModalOpen(p => !p); }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [router, fetchReportes]);

    // --- 3. LÓGICA DE TABLA ---
    const filtrados = useMemo(() => {
        const q = busqueda.toLowerCase().trim();
        return reportes.filter(r =>
            String(r.placaRodaje).toLowerCase().includes(q) ||
            String(r.codigoEquipo).toLowerCase().includes(q) ||
            String(r.statusReporte).toLowerCase().includes(q) ||
            String(r.turno).toLowerCase().includes(q)
        )
    }, [reportes, busqueda])

    const exportToExcel = () => {
        const ws = XLSX.utils.json_to_sheet(filtrados)
        const wb = XLSX.utils.book_new()
        XLSX.utils.book_append_sheet(wb, ws, "SAP_Report")
        XLSX.writeFile(wb, `SAP_Export_${new Date().toISOString().split('T')[0]}.xlsx`)
    }

    if (loading) return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-[#f7f9fa]">
            <Loader2 className="animate-spin text-[#0070b1]" size={40} />
            <p className="mt-4 text-sm font-semibold text-[#6a6d70] tracking-tight">SAP Cloud Data Integrator...</p>
        </div>
    )

    return (
        <main className="min-h-screen bg-[#f7f9fa] text-[#32363a] font-sans text-sm">
            {/* SAP BLUE HEADER */}
            <header className="bg-[#354a5f] text-white p-3 shadow-md flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <button onClick={() => router.back()} className="hover:bg-white/10 p-1.5 rounded transition-all active:scale-90">
                        <ArrowLeft size={20} />
                    </button>
                    <div className="h-6 w-px bg-white/20 mx-2" />
                    <h1 className="font-bold text-lg tracking-tight uppercase italic">REPORTES</h1>
                </div>
                <div className="flex items-center gap-4">
                    <span className="text-[10px] opacity-70 font-mono tracking-tighter">Instance: ERP_PAITA</span>
                    <div className="w-8 h-8 rounded bg-white/20 flex items-center justify-center font-black text-xs">AD</div>
                </div>
            </header>

            {/* SAP FIORI TOOLBAR */}
            <div className="m-4 bg-white border border-[#d3d7d9] shadow-sm rounded">
                <div className="p-4 flex flex-col md:flex-row gap-4 justify-between items-center">
                    <div className="flex flex-col leading-none text-left">
                        <span className="text-[10px] text-slate-400 font-bold uppercase mb-1">Database View</span>
                        <h2 className="text-xl font-light text-[#0070b1]">Consola de Reportes Conductor</h2>
                    </div>

                    <div className="flex items-center gap-2 w-full md:w-auto">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300" size={14} />
                            <input
                                ref={inputSearchRef}
                                value={busqueda}
                                onChange={(e) => setBusqueda(e.target.value)}
                                placeholder="Filtrar placa o código [ALT+S]..."
                                className="w-full md:w-80 pl-9 pr-4 py-2 border border-[#b0b3b5] focus:border-[#0070b1] outline-none rounded bg-[#f7f9fa] text-xs font-medium"
                            />
                        </div>
                        <button onClick={fetchReportes} className="p-2 border border-[#b0b3b5] hover:bg-[#ebeef0] rounded transition-all" title="Refrescar [ALT+Q]">
                            <RefreshCw size={16} className="text-[#0070b1]" />
                        </button>
                        <button onClick={exportToExcel} className="flex items-center gap-2 px-4 py-2 bg-[#0070b1] hover:bg-[#005a8e] text-white rounded font-semibold text-xs transition-colors shadow-sm">
                            <Download size={14} /> Excel
                        </button>
                        <button onClick={() => setIsHelpModalOpen(true)} className="p-2 border border-[#b0b3b5] hover:bg-[#ebeef0] rounded">
                            <HelpCircle size={16} />
                        </button>
                    </div>
                </div>

                {/* SAP DENSE TABLE */}
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-t border-[#d3d7d9]">
                        <thead>
                            <tr className="bg-[#f2f4f5] text-[#6a6d70] border-b border-[#d3d7d9]">
                                <th className="p-3 font-semibold text-[11px] uppercase tracking-wider text-left">Log ID / Placa</th>
                                <th className="p-3 font-semibold text-[11px] uppercase tracking-wider text-left">Time Stamp</th>
                                <th className="p-3 font-semibold text-[11px] uppercase tracking-wider text-left">H. Inicial</th>
                                <th className="p-3 font-semibold text-[11px] uppercase tracking-wider text-left">H. Final</th>
                                <th className="p-3 font-semibold text-[11px] uppercase tracking-wider text-center text-[#0070b1]">Delta</th>
                                <th className="p-3 font-semibold text-[11px] uppercase tracking-wider min-w-[200px] text-left">Logs del Conductor</th>
                                <th className="p-3 font-semibold text-[11px] uppercase tracking-wider text-left">SAP Status</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-[#d3d7d9]">
                            {filtrados.map((item) => {
                                const delta = (item.horometroFinal - item.horometroInicial).toFixed(2);
                                const isPending = item.statusReporte?.toUpperCase() === 'PENDIENTE';

                                return (
                                    <tr key={item.id} className="hover:bg-[#e7f0f7] transition-colors cursor-default group">
                                        <td className="p-3 border-r border-slate-100 text-left">
                                            <div className="flex flex-col leading-tight">
                                                <span className="font-bold text-[#0070b1] font-mono tracking-tighter uppercase">{item.placaRodaje}</span>
                                                <span className="text-[10px] text-slate-400 font-bold uppercase">{item.codigoEquipo || 'N/A'}</span>
                                            </div>
                                        </td>
                                        <td className="p-3 text-left">
                                            <div className="flex flex-col">
                                                <span className="flex items-center gap-1 text-xs font-semibold"><Calendar size={10} /> {item.fechaReporte}</span>
                                                <span className="text-[10px] font-black text-[#6a6d70] uppercase">{item.turno}</span>
                                            </div>
                                        </td>
                                        <td className="p-3 font-mono text-slate-500 text-left">{item.horometroInicial.toLocaleString()}</td>
                                        <td className="p-3 font-mono text-slate-500 text-left">{item.horometroFinal.toLocaleString()}</td>
                                        <td className="p-3 text-center">
                                            <span className="bg-[#e7f0f7] text-[#0070b1] px-3 py-1 rounded font-black text-xs font-mono border border-[#0070b1]/10">
                                                {delta}
                                            </span>
                                        </td>
                                        <td className="p-3 text-left">
                                            <p className="text-[11px] line-clamp-2 text-slate-600 italic">
                                                {item.detalleReporte || '--- System: No novedades reported ---'}
                                            </p>
                                        </td>
                                        <td className="p-3 text-left">
                                            <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded border font-bold text-[10px] uppercase
                                                ${isPending
                                                    ? 'bg-[#fff4e5] text-[#b7791f] border-[#fbd38d]'
                                                    : 'bg-[#e6fffa] text-[#2c7a7b] border-[#81e6d9]'}`}
                                            >
                                                {isPending ? <AlertCircle size={10} /> : <CheckCircle2 size={10} />}
                                                {item.statusReporte || 'CERRADO'}
                                            </div>
                                        </td>
                                    </tr>
                                )
                            })}
                        </tbody>
                    </table>
                </div>

                {/* FOOTER BAR */}
                <div className="bg-[#f2f4f5] p-2 px-4 border-t border-[#d3d7d9] flex justify-between items-center text-[10px] text-[#6a6d70] font-bold uppercase tracking-widest">
                    <span>Entries found: {filtrados.length}</span>
                    <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                        <span>SAP S/4HANA Connection Active</span>
                    </div>
                </div>
            </div>

            {/* MODAL AYUDA (ALT+H) */}
            {isHelpModalOpen && (
                <div className="fixed inset-0 z-[200] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
                    <div className="bg-white w-full max-w-sm rounded-lg shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 border border-[#d3d7d9]">
                        <div className="bg-[#354a5f] p-4 flex justify-between items-center text-white">
                            <div className="flex items-center gap-2 text-left"><HelpCircle size={18} /><h3 className="font-bold text-xs uppercase tracking-widest leading-none">SAP Command Center</h3></div>
                            <button onClick={() => setIsHelpModalOpen(false)}><X size={20} /></button>
                        </div>
                        <div className="p-6 space-y-3">
                            <ShortcutRow keys="CTRL + 1" label="Módulo Rendimiento" />
                            <ShortcutRow keys="CTRL + 2" label="Base Repuestos" />
                            <ShortcutRow keys="CTRL + 3" label="Monitor Estatus" />
                            <ShortcutRow keys="CTRL + 4" label="Inventario" />
                            <div className="h-px bg-slate-100 my-2" />
                            <ShortcutRow keys="ALT + S" label="Filtro Rápido Placa" />
                            <ShortcutRow keys="ALT + X" label="Resetear Filtros" />
                            <ShortcutRow keys="ALT + Q" label="Refresh Server" />
                            <ShortcutRow keys="ALT + H" label="Mostrar Ayuda" />
                        </div>
                    </div>
                </div>
            )}
        </main>
    )
}

function ShortcutRow({ keys, label }: { keys: string, label: string }) {
    return (
        <div className="flex justify-between items-center text-left">
            <span className="text-[10px] font-bold text-slate-400 uppercase">{label}</span>
            <span className="bg-slate-100 text-slate-800 px-2 py-1 rounded text-[10px] font-black font-mono border border-slate-200">{keys}</span>
        </div>
    )
}