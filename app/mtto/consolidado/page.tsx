"use client"
import { useEffect, useState, useMemo, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import {
    Calendar as CalendarIcon,
    ChevronLeft,
    ChevronRight,
    Truck,
    Clock,
    Search,
    AlertCircle,
    RotateCw,
    XCircle,
    Keyboard,
    CalendarDays,
    FileDown,
    Activity
} from 'lucide-react'
import { format, addMonths, subMonths, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, startOfWeek, endOfWeek, isToday, parseISO, isAfter, isValid, isWithinInterval } from 'date-fns'
import { es } from 'date-fns/locale'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'

// Interfaz estricta con todos los campos de la vista
interface ProgramaMtto {
    codigoEquipo: string;
    placaRodaje: string;
    marca: string;
    modelo: string;
    descripcionEquipo: string;
    horometraje_actual: number;
    horometro_objetivo_mtto: number; // Campo del horómetro proyectado
    horas_restantes: number;
    promedio_horas_dia: number;
    dias_para_mtto: number;
    tipoProxMp: string;
    fecha_estimada_mtto: string;
    estado_alerta: 'VENCIDO' | 'URGENTE' | 'PROGRAMADO';
}

export default function CalendarioMttoPage() {
    const router = useRouter();
    const [currentMonth, setCurrentMonth] = useState(new Date())
    const [programacion, setProgramacion] = useState<ProgramaMtto[]>([])
    const [loading, setLoading] = useState(true)
    const [busqueda, setBusqueda] = useState('')
    const [fechaInicio, setFechaInicio] = useState('')
    const [fechaFin, setFechaFin] = useState('')

    const searchInputRef = useRef<HTMLInputElement>(null);

    const fetchProgramacion = async () => {
        setLoading(true)
        try {
            const { data, error } = await supabase
                .from('v_programa_mantenimiento_preventivo')
                .select('*')
            if (error) throw error;
            setProgramacion(data || [])
        } catch (err) {
            console.error("Error cargando vista:", err)
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => { fetchProgramacion() }, [])

    // ✅ Lógica de filtrado inteligente (Placa, Marca, Modelo, Descripción, Alerta)
    const dataFiltrada = useMemo(() => {
        const term = busqueda.toLowerCase();
        return programacion.filter(p => {
            const cumpleBusqueda =
                (p.placaRodaje || "").toLowerCase().includes(term) ||
                (p.codigoEquipo || "").toLowerCase().includes(term) ||
                (p.marca || "").toLowerCase().includes(term) ||
                (p.modelo || "").toLowerCase().includes(term) ||
                (p.descripcionEquipo || "").toLowerCase().includes(term) ||
                (p.estado_alerta || "").toLowerCase().includes(term);

            let cumpleRango = true;
            if (fechaInicio && fechaFin) {
                try {
                    const pFecha = parseISO(p.fecha_estimada_mtto);
                    const dInicio = parseISO(fechaInicio);
                    const dFin = parseISO(fechaFin);
                    if (isValid(dInicio) && isValid(dFin)) {
                        cumpleRango = isWithinInterval(pFecha, { start: dInicio, end: dFin });
                    }
                } catch (e) { cumpleRango = false; }
            }
            return cumpleBusqueda && cumpleRango;
        });
    }, [programacion, busqueda, fechaInicio, fechaFin]);

    // ✅ Reporte PDF con Horómetro Objetivo y Firma Alejandro Aponte
    const exportarPDF = () => {
        const doc = new jsPDF('l', 'mm', 'a4');
        doc.setFontSize(16);
        doc.setTextColor(53, 74, 95);
        doc.text("GH COIN - REPORTE DE MANTENIMIENTO PREVENTIVO", 14, 15);
        doc.setFontSize(9);
        doc.setTextColor(100);
        doc.text(`Generado: ${format(new Date(), 'dd/MM/yyyy HH:mm')} | @AvNetworkk`, 14, 22);

        autoTable(doc, {
            startY: 28,
            head: [['COD.', 'PLACA', 'DESCRIPCIÓN', 'MARCA/MODELO', 'TIPO MP', 'H. ACTUAL', 'H. PROG.', 'DESFACE', 'FECHA EST.']],
            body: dataFiltrada.map(p => [
                p.codigoEquipo,
                p.placaRodaje,
                p.descripcionEquipo,
                `${p.marca} ${p.modelo}`,
                p.tipoProxMp,
                `${Number(p.horometraje_actual || 0).toLocaleString()} H`,
                `${Number(p.horometro_objetivo_mtto || 0).toLocaleString()} H`, // ✅ Solo Horómetro Objetivo
                `${Number(p.horas_restantes).toFixed(1)} H`,
                p.estado_alerta
            ]),
            headStyles: { fillColor: [53, 74, 95], fontSize: 8 },
            styles: { fontSize: 7 },
            alternateRowStyles: { fillColor: [245, 245, 245] }
        });

        const finalY = (doc as any).lastAutoTable.finalY + 15;
        doc.setFontSize(10); doc.setFont("helvetica", "bold");
        doc.text("____________________________________________________", 14, finalY);
        doc.text("Alejandro Aponte V.", 14, finalY + 7);
        doc.setFont("helvetica", "normal");
        doc.text("Analista de mantenimiento GH COIN MINADO", 14, finalY + 12);

        doc.text("aaponte@cip.org.pe", 14, finalY);

        doc.save(`Reporte_Preventivo_${format(new Date(), 'yyyyMMdd')}.pdf`);
    };

    // ✅ Atajos de Teclado (Alt+S, Q, X, P | Ctrl+0, Ctrl+1)
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.altKey && e.key.toLowerCase() === 's') { e.preventDefault(); searchInputRef.current?.focus(); }
            if (e.altKey && e.key.toLowerCase() === 'q') { e.preventDefault(); fetchProgramacion(); }
            if (e.altKey && e.key.toLowerCase() === 'x') { e.preventDefault(); setBusqueda(''); setFechaInicio(''); setFechaFin(''); }
            if (e.altKey && e.key.toLowerCase() === 'p') { e.preventDefault(); exportarPDF(); }
            if (e.ctrlKey && e.key === '0') { e.preventDefault(); router.push('/equipos'); }
            if (e.ctrlKey && e.key === '1') { e.preventDefault(); router.push('/historial-horometro'); }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [dataFiltrada, fechaInicio, fechaFin, router]);

    const days = useMemo(() => {
        const dInicio = parseISO(fechaInicio);
        const dFin = parseISO(fechaFin);
        if (fechaInicio && fechaFin && isValid(dInicio) && isValid(dFin)) {
            if (isAfter(dFin, dInicio) || isSameDay(dFin, dInicio)) {
                try {
                    const diff = Math.ceil((dFin.getTime() - dInicio.getTime()) / (1000 * 60 * 60 * 24));
                    if (diff < 100) return eachDayOfInterval({ start: dInicio, end: dFin });
                } catch (e) { return [] }
            }
        }
        return eachDayOfInterval({
            start: startOfWeek(startOfMonth(currentMonth), { weekStartsOn: 1 }),
            end: endOfWeek(endOfMonth(currentMonth), { weekStartsOn: 1 })
        });
    }, [currentMonth, fechaInicio, fechaFin]);

    const getStatusStyles = (estado: string) => {
        if (estado === 'VENCIDO') return 'bg-[#ffebed] text-[#b00020] border-l-4 border-l-[#b00020] shadow-sm';
        if (estado === 'URGENTE') return 'bg-[#fff4e5] text-[#e9730c] border-l-4 border-l-[#e9730c] shadow-sm';
        return 'bg-[#e7f4ff] text-[#0070d2] border-l-4 border-l-[#0070d2] shadow-sm';
    };

    const modoRango = fechaInicio && fechaFin && days.length < 100;

    return (
        <div className="min-h-screen bg-[#f3f4f6] text-[#32363a] font-sans text-left leading-none selection:bg-blue-100">
            <header className="bg-[#354a5f] text-white p-3 flex items-center justify-between shadow-lg sticky top-0 z-50">
                <div className="flex items-center gap-4">
                    <div className="bg-white/10 p-2 rounded text-white"><CalendarIcon size={20} /></div>
                    <div className="text-left text-white">
                        <h1 className="text-sm font-black uppercase tracking-widest leading-none">Cronograma PREVENTIVOS | GH COIN</h1>
                        <div className="flex gap-3 mt-1 text-[8px] font-bold opacity-60 uppercase">
                            <span>Alt+S: Buscar</span> <span>Alt+Q: Refresh</span> <span>Alt+X: Limpiar</span> <span>Alt+P: PDF</span>
                        </div>
                    </div>
                </div>
                {!modoRango && (
                    <div className="flex items-center gap-2 bg-white/10 rounded-sm p-1">
                        <button onClick={() => setCurrentMonth(subMonths(currentMonth, 1))} className="p-1 hover:bg-white/20 rounded text-white"><ChevronLeft size={20} /></button>
                        <span className="text-xs font-bold w-40 text-center uppercase tracking-tighter text-white">{format(currentMonth, 'MMMM yyyy', { locale: es })}</span>
                        <button onClick={() => setCurrentMonth(addMonths(currentMonth, 1))} className="p-1 hover:bg-white/20 rounded text-white"><ChevronRight size={20} /></button>
                    </div>
                )}
            </header>

            <div className="bg-white border-b border-[#d8dce3] p-4 flex flex-wrap gap-4 items-end shadow-sm">
                <div className="flex flex-col gap-1 text-left flex-1 max-w-xl">
                    <label className="text-[10px] font-bold text-[#6a6d70] uppercase tracking-wider">Buscador Inteligente (Placa, Modelo, Descripción...)</label>
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[#6a6d70]" size={16} />
                        <input
                            ref={searchInputRef}
                            type="text"
                            placeholder="Buscar..."
                            className="w-full pl-10 pr-4 py-2 bg-[#f3f4f6] border border-[#d8dce3] rounded-sm text-sm outline-none focus:border-[#0070d2] focus:bg-white transition-all font-bold uppercase"
                            value={busqueda || ''}
                            onChange={(e) => setBusqueda(e.target.value)}
                        />
                    </div>
                </div>
                <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-bold text-[#6a6d70] uppercase">Desde</label>
                    <input type="date" className="p-2 bg-[#f3f4f6] border border-[#d8dce3] rounded-sm text-xs font-bold outline-none focus:border-[#0070d2]" value={fechaInicio} onChange={(e) => setFechaInicio(e.target.value)} />
                </div>
                <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-bold text-[#6a6d70] uppercase">Hasta</label>
                    <input type="date" className="p-2 bg-[#f3f4f6] border border-[#d8dce3] rounded-sm text-xs font-bold outline-none focus:border-[#0070d2]" value={fechaFin} onChange={(e) => setFechaFin(e.target.value)} />
                </div>
                <div className="flex gap-1.5">
                    <button onClick={fetchProgramacion} className="p-2.5 bg-white border border-[#d8dce3] rounded-sm hover:bg-slate-50 text-[#0070d2] shadow-sm transition-all"><RotateCw size={18} className={loading ? 'animate-spin' : ''} /></button>
                    <button onClick={exportarPDF} className="p-2.5 bg-[#107e3e] border border-[#0d6b35] rounded-sm hover:bg-[#0d6b35] text-white flex items-center gap-2 font-bold text-[11px] uppercase shadow-sm"><FileDown size={18} /> Exportar PDF</button>
                    <button onClick={() => { setBusqueda(''); setFechaInicio(''); setFechaFin(''); }} className="p-2.5 bg-white border border-[#d8dce3] rounded-sm hover:bg-slate-50 text-rose-600 shadow-sm"><XCircle size={18} /></button>
                </div>
            </div>

            <main className="p-4 overflow-x-auto text-left">
                <div className="min-w-[1200px] bg-white rounded-sm shadow-md border border-[#d8dce3]">
                    <div className={`grid ${modoRango ? (days.length === 1 ? 'grid-cols-1' : 'grid-cols-4') : 'grid-cols-7'} border-b border-[#d8dce3] bg-[#f9f9fa]`}>
                        {modoRango ? (
                            <div className="p-3 text-left pl-6 text-[10px] font-black text-[#6a6d70] uppercase tracking-widest col-span-full flex items-center gap-2">
                                <CalendarDays size={14} /> Reporte Programado: {fechaInicio} al {fechaFin}
                            </div>
                        ) : (
                            ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'].map(day => (
                                <div key={day} className="p-3 text-center text-[10px] font-black text-[#6a6d70] uppercase border-r border-[#d8dce3] last:border-0">{day}</div>
                            ))
                        )}
                    </div>
                    <div className={`grid ${modoRango ? (days.length === 1 ? 'grid-cols-1' : 'grid-cols-4') : 'grid-cols-7'} auto-rows-[minmax(220px,auto)]`}>
                        {days.map((day: Date, idx: number) => {
                            const dateStr = format(day, 'yyyy-MM-dd')
                            const mttos = dataFiltrada.filter(p => p.fecha_estimada_mtto === dateStr)

                            return (
                                <div key={idx} className={`border-r border-b border-[#d8dce3] p-2 overflow-hidden flex flex-col transition-colors ${(!fechaInicio && !isSameDay(startOfMonth(day), startOfMonth(currentMonth))) ? 'bg-slate-50 opacity-40' : ''} ${isToday(day) ? 'bg-blue-50/40' : ''}`}>
                                    <div className="flex justify-between items-center mb-3">
                                        <div className="flex flex-col text-left">
                                            <span className={`text-sm font-black w-8 h-8 flex items-center justify-center rounded-full ${isToday(day) ? 'bg-[#0070b1] text-white shadow-md' : 'text-slate-500'}`}>{format(day, 'd')}</span>
                                            {fechaInicio && <span className="text-[9px] font-bold text-slate-400 uppercase mt-1 text-left">{format(day, 'EEEE dd MMM', { locale: es })}</span>}
                                        </div>
                                        {mttos.length > 0 && <span className="text-[11px] font-black bg-slate-800 px-3 py-1 rounded-full text-white">{mttos.length} Equipos</span>}
                                    </div>
                                    <div className="flex-1 space-y-2 overflow-y-auto custom-scrollbar pr-0.5 text-left">
                                        {mttos.map((mtto) => (
                                            <div key={mtto.placaRodaje} className={`p-3 rounded-sm transition-all hover:scale-[1.01] border border-black/5 ${getStatusStyles(mtto.estado_alerta)} shadow-sm`}>
                                                <div className="flex justify-between items-start mb-1 gap-1">
                                                    <span className="text-[11px] font-black uppercase truncate">{mtto.placaRodaje}</span>
                                                    <span className="text-[8px] font-black bg-white/40 px-1.5 rounded uppercase border border-black/5">{mtto.tipoProxMp}</span>
                                                </div>
                                                <div className="text-[9px] font-bold uppercase opacity-90 truncate mb-1 text-left border-b border-black/5 pb-1">{mtto.descripcionEquipo}</div>
                                                <div className="flex flex-col gap-1 mt-1 text-left">
                                                    <div className="flex items-center gap-1 text-[8px] font-bold uppercase opacity-70"><Truck size={10} /> <span>{mtto.marca} {mtto.modelo}</span></div>

                                                    {/* ✅ Visualización Comparativa en la Tarjeta */}
                                                    <div className="flex flex-col gap-0.5 bg-black/5 p-1 rounded-sm">
                                                        <div className="flex justify-between text-[8px] font-medium text-slate-600">
                                                            <span>Actual:</span>
                                                            <span className="font-bold">{Number(mtto.horometraje_actual || 0).toLocaleString()} H</span>
                                                        </div>
                                                        <div className="flex justify-between text-[8px] font-medium text-slate-600">
                                                            <span>Objetivo:</span>
                                                            <span className="font-bold text-blue-700">{Number(mtto.horometro_objetivo_mtto || 0).toLocaleString()} H</span>
                                                        </div>
                                                    </div>

                                                    <div className="flex justify-between items-center mt-1 border-t border-black/5 pt-1">
                                                        <div className="flex items-center gap-1 text-[10px] font-black uppercase"><Clock size={10} /><span>{Number(mtto.horas_restantes).toFixed(1)} H</span></div>
                                                        {mtto.estado_alerta === 'VENCIDO' && <AlertCircle size={14} className="text-[#b00020]" />}
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                </div>
            </main>

            <style jsx global>{`
                .custom-scrollbar::-webkit-scrollbar { width: 4px; }
                .custom-scrollbar::-webkit-scrollbar-thumb { background: #ced4da; border-radius: 10px; }
            `}</style>
        </div>
    )
}