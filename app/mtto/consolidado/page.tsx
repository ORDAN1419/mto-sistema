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

import {

    format, addMonths, subMonths, startOfMonth, endOfMonth,

    eachDayOfInterval, isSameDay, startOfWeek, endOfWeek,

    isToday, parseISO, isAfter, isValid, isWithinInterval,

    addDays, differenceInDays

} from 'date-fns'

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

    horometro_objetivo_mtto: number;

    horas_restantes: number;

    promedio_horas_dia: number;

    dias_para_mtto: number;

    tipoProxMp: string;

    fecha_estimada_mtto: string;

    estado_alerta: 'VENCIDO' | 'URGENTE' | 'PROGRAMADO';

    status: string; // ✅ NUEVA COLUMNA

    ubic: string; // ✅ NUEVA COLUMNA

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

                .select('*') // ✅ Asegúrate que la VISTA en la DB tenga la columna 'ubic'

            if (error) throw error;

            setProgramacion(data || [])

        } catch (err) {

            console.error("Error cargando vista:", err)

        } finally {

            setLoading(false)

        }

    }



    useEffect(() => { fetchProgramacion() }, [])



    // ✅ NUEVA LÓGICA: Redistribución de VENCIDOS por la semana actual sin alterar BD

    // ✅ NUEVA LÓGICA: Distribución fija en 7 días rodantes

    const programacionBalanceada = useMemo(() => {

        const hoy = new Date();

        // Definimos una ventana fija de 7 días a partir de hoy

        const diasDisponibles = 7;



        // Separamos vencidos de los demás y ordenamos por criticidad

        const vencidos = programacion.filter(p => p.estado_alerta === 'VENCIDO')

            .sort((a, b) => a.horas_restantes - b.horas_restantes);



        const otros = programacion.filter(p => p.estado_alerta !== 'VENCIDO');



        // Repartimos los vencidos en la ventana de 7 días

        const vencidosRedistribuidos = vencidos.map((p, index) => {

            // El offset ahora siempre cicla del 0 al 6 (7 días)

            const offset = index % diasDisponibles;

            // Sumamos los días a la fecha actual

            const nuevaFechaSugerida = format(addDays(hoy, offset), 'yyyy-MM-dd');



            return { ...p, fecha_estimada_mtto: nuevaFechaSugerida };

        });



        return [...vencidosRedistribuidos, ...otros];

    }, [programacion]);



    const dataFiltrada = useMemo(() => {
        // 1. Limpiamos el término y lo dividimos por espacios
        const palabrasBusqueda = busqueda.toLowerCase().split(' ').filter(p => p !== '');

        return programacionBalanceada.filter(p => {
            // ✅ FILTRO DE SEGURIDAD: Solo mostrar operativos o inoperativos
            const noEstaInmovilizada = p.status !== 'DESMOVILIZADO' && p.status !== 'INMOVILIZADAS';

            // 2. Lógica de "Cada palabra debe encontrarse en algún lugar"
            const cumpleBusqueda = palabrasBusqueda.every(palabra => {
                return (
                    (p.placaRodaje || "").toLowerCase().includes(palabra) ||
                    (p.codigoEquipo || "").toLowerCase().includes(palabra) ||
                    (p.marca || "").toLowerCase().includes(palabra) ||
                    (p.modelo || "").toLowerCase().includes(palabra) ||
                    (p.descripcionEquipo || "").toLowerCase().includes(palabra) ||
                    (p.estado_alerta || "").toLowerCase().includes(palabra) ||
                    (p.ubic || "").toLowerCase().includes(palabra)
                );
            });

            // 3. Filtro de Rango de Fechas (se mantiene igual)
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

            return noEstaInmovilizada && cumpleBusqueda && cumpleRango;
        });
    }, [programacionBalanceada, busqueda, fechaInicio, fechaFin]);


    // ✅ EXPORTACIÓN PDF AGRUPADA + COLORES DE ESTADO Y CONTEO POR GRUPO

    const exportarPDF = () => {

        const doc = new jsPDF('l', 'mm', 'a4');



        doc.setFontSize(16);

        doc.setTextColor(53, 74, 95);

        doc.text("GH COIN - REPORTE DE MANTENIMIENTO PREVENTIVO", 14, 15);

        doc.setFontSize(9);

        doc.setTextColor(100);

        doc.text(`Generado: ${format(new Date(), 'dd/MM/yyyy HH:mm')} | @AvNetworkk`, 14, 22);



        const grupos = dataFiltrada.reduce((acc: any, p) => {

            const cat = (p.descripcionEquipo || 'SIN CATEGORÍA').toUpperCase();

            if (!acc[cat]) acc[cat] = [];

            acc[cat].push(p);

            return acc;

        }, {});



        let currentY = 28;



        Object.keys(grupos).forEach((categoria, index) => {

            doc.setFontSize(11);

            doc.setFont("helvetica", "bold");

            doc.setTextColor(0, 112, 177);

            doc.text(`GRUPO: ${categoria}`, 14, currentY);



            autoTable(doc, {

                startY: currentY + 2,

                head: [['COD.', 'PLACA', 'MARCA/MODELO', 'TIPO MP', 'H. PROG.', 'DESFACE', 'H. ACTUAL', 'ESTADO']],

                body: grupos[categoria].map((p: ProgramaMtto) => [

                    p.codigoEquipo,

                    p.placaRodaje,

                    `${p.marca} ${p.modelo}`,

                    p.tipoProxMp,

                    `${Number(p.horometro_objetivo_mtto || 0).toLocaleString()} H`,

                    `${Number(p.horas_restantes).toFixed(1)} H`,

                    `${Number(p.horometraje_actual).toFixed(1)} H`,

                    p.estado_alerta,

                    p.ubic,

                ]),

                headStyles: { fillColor: [53, 74, 95], fontSize: 8 },

                styles: { fontSize: 7, valign: 'middle' },

                alternateRowStyles: { fillColor: [250, 250, 250] },

                margin: { left: 14, right: 14 },

                didParseCell: (data) => {

                    if (data.section === 'body') {

                        const estado = data.row.cells[7].text[0];

                        if (estado === 'VENCIDO') {

                            data.cell.styles.fillColor = [255, 235, 237];

                            data.cell.styles.textColor = [176, 0, 32];

                        } else if (estado === 'URGENTE') {

                            data.cell.styles.fillColor = [255, 244, 229];

                            data.cell.styles.textColor = [233, 115, 12];

                        } else if (estado === 'PROGRAMADO') {

                            data.cell.styles.fillColor = [231, 244, 255];

                            data.cell.styles.textColor = [0, 112, 210];

                        }

                    }

                }

            });



            currentY = (doc as any).lastAutoTable.finalY;

            doc.setFontSize(8);

            doc.setFont("helvetica", "bold");

            doc.setTextColor(85);

            doc.text(`Total ${categoria}: ${grupos[categoria].length} unidades`, 14, currentY + 5);



            currentY += 12;

            if (currentY > 185 && index !== Object.keys(grupos).length - 1) {

                doc.addPage();

                currentY = 20;

            }

        });



        const finalY = currentY + 15;

        doc.setFontSize(10); doc.setFont("helvetica", "bold");

        doc.setTextColor(0, 0, 0);

        doc.text("____________________________________________________", 14, finalY);

        doc.text("Alejandro Aponte V.", 14, finalY + 7);

        doc.setFont("helvetica", "normal");

        doc.text("Analista de mantenimiento GH COIN MINADO", 14, finalY + 12);

        doc.setFontSize(8);

        doc.text("aaponte@cip.org.pe", 14, finalY + 17);



        doc.save(`Reporte_Preventivo_Colores_${format(new Date(), 'yyyyMMdd')}.pdf`);

    };



    useEffect(() => {

        const handleKeyDown = (e: KeyboardEvent) => {

            if (e.altKey && e.key.toLowerCase() === 's') { e.preventDefault(); searchInputRef.current?.focus(); }

            if (e.altKey && e.key.toLowerCase() === 'q') { e.preventDefault(); fetchProgramacion(); }

            if (e.altKey && e.key.toLowerCase() === 'x') { e.preventDefault(); setBusqueda(''); setFechaInicio(''); setFechaFin(''); }

            if (e.altKey && e.key.toLowerCase() === 'p') { e.preventDefault(); exportarPDF(); }

            if (e.ctrlKey && e.key === '0') { e.preventDefault(); router.push('/equipos'); }

            if (e.ctrlKey && e.key === '1') { e.preventDefault(); router.push('/historial-horometro'); }

            if (e.ctrlKey && e.key === '5') { e.preventDefault(); router.push('/mtto/control-actualizacion'); }

        };

        window.addEventListener('keydown', handleKeyDown);

        return () => window.removeEventListener('keydown', handleKeyDown);

    }, [dataFiltrada, router]);



    const days = useMemo(() => {

        return eachDayOfInterval({

            start: startOfWeek(startOfMonth(currentMonth), { weekStartsOn: 1 }),

            end: endOfWeek(endOfMonth(currentMonth), { weekStartsOn: 1 })

        });

    }, [currentMonth]);



    const getStatusStyles = (estado: string) => {

        if (estado === 'VENCIDO') return 'bg-[#ffebed] text-[#b00020] border-l-4 border-l-[#b00020] shadow-sm';

        if (estado === 'URGENTE') return 'bg-[#fff4e5] text-[#e9730c] border-l-4 border-l-[#e9730c] shadow-sm';

        return 'bg-[#e7f4ff] text-[#0070d2] border-l-4 border-l-[#0070d2] shadow-sm';

    };



    const modoRango = fechaInicio && fechaFin && days.length < 100;



    return (

        <div className="min-h-screen bg-[#f3f4f6] text-[#32363a] font-sans text-left leading-none selection:bg-blue-100">

            <header className="bg-[#354a5f] text-white p-3 flex items-center justify-between shadow-lg sticky top-0 z-50">

                <div className="flex items-center gap-4 text-white">

                    <div className="bg-white/10 p-2 rounded text-white"><CalendarIcon size={20} /></div>

                    <div className="text-left text-white">

                        <h1 className="text-sm font-black uppercase tracking-widest leading-none text-white">Cronograma PREVENTIVOS | GH COIN</h1>

                        <div className="flex gap-3 mt-1 text-[8px] font-bold opacity-60 uppercase text-white leading-none">

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



            <div className="bg-white border-b border-[#d8dce3] p-4 flex flex-wrap gap-4 items-end shadow-sm leading-none">

                <div className="flex flex-col gap-1 text-left flex-1 max-w-xl leading-none">

                    <label className="text-[10px] font-bold text-[#6a6d70] uppercase tracking-wider">Buscador Inteligente</label>

                    <div className="relative leading-none">

                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[#6a6d70]" size={16} />

                        <input

                            ref={searchInputRef}

                            type="text"

                            placeholder="Buscar..."

                            className="w-full pl-10 pr-4 py-2 bg-[#f3f4f6] border border-[#d8dce3] rounded-sm text-sm outline-none focus:border-[#0070d2] focus:bg-white transition-all font-bold uppercase"

                            value={busqueda}

                            onChange={(e) => setBusqueda(e.target.value)}

                        />

                    </div>

                </div>

                <div className="flex flex-col gap-1 leading-none">

                    <label className="text-[10px] font-bold text-[#6a6d70] uppercase">Desde</label>

                    <input type="date" className="p-2 bg-[#f3f4f6] border border-[#d8dce3] rounded-sm text-xs font-bold outline-none focus:border-[#0070d2]" value={fechaInicio} onChange={(e) => setFechaInicio(e.target.value)} />

                </div>

                <div className="flex flex-col gap-1 leading-none">

                    <label className="text-[10px] font-bold text-[#6a6d70] uppercase">Hasta</label>

                    <input type="date" className="p-2 bg-[#f3f4f6] border border-[#d8dce3] rounded-sm text-xs font-bold outline-none focus:border-[#0070d2]" value={fechaFin} onChange={(e) => setFechaFin(e.target.value)} />

                </div>

                <div className="flex gap-1.5 leading-none">

                    <button onClick={fetchProgramacion} className="p-2.5 bg-white border border-[#d8dce3] rounded-sm hover:bg-slate-50 text-[#0070d2] shadow-sm transition-all"><RotateCw size={18} className={loading ? 'animate-spin' : ''} /></button>

                    <button onClick={exportarPDF} className="p-2.5 bg-[#107e3e] border border-[#0d6b35] rounded-sm hover:bg-[#0d6b35] text-white flex items-center gap-2 font-bold text-[11px] uppercase shadow-sm"><FileDown size={18} /> Exportar PDF</button>

                    <button onClick={() => { setBusqueda(''); setFechaInicio(''); setFechaFin(''); }} className="p-2.5 bg-white border border-[#d8dce3] rounded-sm hover:bg-slate-50 text-rose-600 shadow-sm"><XCircle size={18} /></button>

                </div>

            </div>



            <main className="p-4 overflow-x-auto text-left leading-none">

                <div className="min-w-[1200px] bg-white rounded-sm shadow-md border border-[#d8dce3]">

                    <div className={`grid ${modoRango ? 'grid-cols-4' : 'grid-cols-7'} border-b border-[#d8dce3] bg-[#f9f9fa]`}>

                        {['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'].map(day => (

                            <div key={day} className="p-3 text-center text-[10px] font-black text-[#6a6d70] uppercase border-r border-[#d8dce3] last:border-0 tracking-widest leading-none">{day}</div>

                        ))}

                    </div>

                    <div className="grid grid-cols-7 auto-rows-[minmax(220px,auto)]">

                        {days.map((day: Date, idx: number) => {

                            const dateStr = format(day, 'yyyy-MM-dd')

                            const mttos = dataFiltrada.filter(p => p.fecha_estimada_mtto === dateStr)



                            return (

                                <div key={idx} className={`border-r border-b border-[#d8dce3] p-2 overflow-hidden flex flex-col transition-colors ${(!fechaInicio && !isSameDay(startOfMonth(day), startOfMonth(currentMonth))) ? 'bg-slate-50 opacity-40' : ''} ${isToday(day) ? 'bg-blue-50/40' : ''}`}>

                                    <div className="flex justify-between items-center mb-3 leading-none">

                                        <div className="flex flex-col text-left leading-none">

                                            <span className={`text-sm font-black w-8 h-8 flex items-center justify-center rounded-full ${isToday(day) ? 'bg-[#0070b1] text-white shadow-md' : 'text-slate-500'}`}>{format(day, 'd')}</span>

                                            {fechaInicio && <span className="text-[9px] font-bold text-slate-400 uppercase mt-1 text-left leading-none">{format(day, 'EEEE dd MMM', { locale: es })}</span>}

                                        </div>

                                        {mttos.length > 0 && <span className="text-[10px] font-black bg-slate-800 px-2 py-0.5 rounded-full text-white leading-none">{mttos.length} Eq.</span>}

                                    </div>



                                    <div className="flex-1 space-y-2 overflow-y-auto custom-scrollbar pr-0.5 text-left leading-none">

                                        {mttos.map((mtto) => (

                                            <div key={mtto.placaRodaje} className={`p-2 rounded-sm transition-all hover:scale-[1.02] border border-black/5 ${getStatusStyles(mtto.estado_alerta)} shadow-sm`}>

                                                <div className="flex justify-between items-start mb-1 gap-1">

                                                    <span className="text-[11px] font-black uppercase truncate">{mtto.codigoEquipo}</span>

                                                    <span className="text-[8px] font-black bg-white/40 px-1.5 rounded uppercase border border-black/5">{mtto.tipoProxMp}</span>

                                                </div>

                                                <div className="text-[8px] font-bold uppercase opacity-90 truncate mb-1 text-left border-b border-black/5 pb-1">{mtto.descripcionEquipo}</div>

                                                <div className="flex flex-col gap-1 mt-1 text-left leading-none">

                                                    <div className="flex items-center gap-1 text-[8px] font-bold uppercase opacity-70"><Truck size={10} /> <span>{mtto.marca} {mtto.modelo}</span></div>



                                                    <div className="flex flex-col gap-0.5 bg-black/5 p-1 rounded-sm">

                                                        <div className="flex justify-between text-[8px] font-medium text-slate-600 leading-none"><span>Act:</span><span className="font-bold">{Number(mtto.horometraje_actual || 0).toLocaleString()}</span></div>

                                                        <div className="flex justify-between text-[8px] font-medium text-slate-600 leading-none"><span>Obj:</span><span className="font-bold text-blue-700">{Number(mtto.horometro_objetivo_mtto || 0).toLocaleString()}</span></div>

                                                        <div className="flex justify-between text-[8px] font-medium text-slate-600 leading-none mt-1 border-t border-black/5 pt-1">

                                                            <div className="flex justify-between text-[8px] font-medium text-slate-600 leading-none mt-1 border-t border-black/5 pt-1">

                                                                <span>Ubic:</span>

                                                                <span className="font-bold text-blue-700">

                                                                    {mtto.ubic ? mtto.ubic : 'SIN UBIC'}

                                                                </span>

                                                            </div>

                                                        </div>



                                                    </div>



                                                    <div className="flex justify-between items-center mt-1 border-t border-black/5 pt-1 leading-none">

                                                        <div className="flex items-center gap-1 text-[9px] font-black uppercase leading-none"><Clock size={10} /><span>{Number(mtto.horas_restantes).toFixed(1)} H</span></div>

                                                        {mtto.estado_alerta === 'VENCIDO' && <AlertCircle size={12} className="text-[#b00020]" />}

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