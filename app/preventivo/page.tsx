"use client"
import React, { useEffect, useState, Suspense } from 'react'
import { supabase } from '@/lib/supabase'
import {
    ChevronLeft, Download, Truck, AlertTriangle,
    TrendingUp, Activity, LayoutDashboard, Gauge,
    History, Timer, Info, X, Wrench, Search, FileX, CheckCircle2
} from 'lucide-react'
import { useRouter } from 'next/navigation'
import {
    BarChart as ReBarChart, Bar, XAxis, YAxis, CartesianGrid,
    Tooltip, ResponsiveContainer, Cell, PieChart, Pie, Legend
} from 'recharts'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'

// ✅ FECHA LOCAL PARA REPORTES
const obtenerFechaHoyLocal = () => {
    const ahora = new Date();
    return ahora.toLocaleDateString('sv-SE');
};

export default function AnalisisPreventivoPage() {
    return (
        <Suspense fallback={<div className="min-h-screen flex items-center justify-center bg-[#F8FAFC]"><Activity className="animate-spin text-blue-600" size={48} /></div>}>
            <AnalisisContent />
        </Suspense>
    )
}

function AnalisisContent() {
    const router = useRouter()
    const [equiposReales, setEquiposReales] = useState<any[]>([])
    const [conteoNull, setConteoNull] = useState(0)
    const [loading, setLoading] = useState(true)

    const [eventoSeleccionado, setEventoSeleccionado] = useState<any>(null)
    const [isModalDetalleOpen, setIsModalDetalleOpen] = useState(false)

    const fetchAnalisis = async () => {
        try {
            setLoading(true)
            const { data: res, error } = await supabase
                .from('maestroEquipos')
                .select('*')
                .order('placaRodaje', { ascending: true })

            if (!error && res) {
                // ✅ FILTRADO: Separamos lo real de lo que está vacío (NULL)
                const conDatos = res.filter(eq => eq.horometroMayor !== null && eq.horometroMayor > 0);
                const sinDatos = res.filter(eq => eq.horometroMayor === null || eq.horometroMayor === 0);

                setConteoNull(sinDatos.length);

                const procesados = conDatos.map(eq => {
                    const actual = Number(eq.horometroMayor || 0)
                    const meta = Number(eq.ProxHoroKmMp || 0)
                    const desfaseReal = Number(eq.desface ?? (meta - actual))

                    let estado = 'NORMAL'
                    if (desfaseReal <= 0) estado = 'VENCIDO'
                    else if (desfaseReal <= 50) estado = 'CRÍTICO'
                    else if (desfaseReal <= 100) estado = 'PRÓXIMO'

                    return { ...eq, actual, meta, desfaseReal, estado }
                })
                setEquiposReales(procesados)
            }
        } catch (e) { console.error(e) }
        finally { setLoading(false) }
    }

    useEffect(() => { fetchAnalisis() }, [])

    const totalVencidos = equiposReales.filter(e => e.desfaseReal <= 0).length
    const totalCriticos = equiposReales.filter(e => e.desfaseReal > 0 && e.desfaseReal <= 50).length
    const cumplimientoFlota = equiposReales.length > 0
        ? (((equiposReales.length - totalVencidos) / equiposReales.length) * 100).toFixed(1)
        : "0"

    const dataPie = [
        { name: 'Vencidos', value: totalVencidos, color: '#e11d48' },
        { name: 'Críticos', value: totalCriticos, color: '#f59e0b' },
        { name: 'Al día', value: equiposReales.length - (totalVencidos + totalCriticos), color: '#10b981' }
    ]

    // ✅ EXPORTAR PDF GERENCIAL CON INDICADORES VISUALES
    const exportarPDF = () => {
        const doc = new jsPDF('l', 'mm', 'a4');
        const pageWidth = doc.internal.pageSize.getWidth();

        // Encabezado
        doc.setFillColor(15, 23, 42);
        doc.rect(0, 0, pageWidth, 40, 'F');
        doc.setFontSize(22);
        doc.setTextColor(255, 255, 255);
        doc.text("ESTADO MAESTRO DE MANTENIMIENTO PREVENTIVO", 14, 22);
        doc.setFontSize(10);
        doc.setTextColor(200, 200, 200);
        doc.text(`FECHA: ${new Date().toLocaleString()} | GH.COIN.S.A.C.`, 14, 30);

        // Panel KPIs
        doc.setFillColor(245, 247, 250);
        doc.roundedRect(14, 45, pageWidth - 28, 20, 3, 3, 'F');
        doc.setTextColor(51, 65, 85);
        doc.setFontSize(9);
        doc.text(`CUMPLIMIENTO: ${cumplimientoFlota}%`, 25, 57);
        doc.text(`VENCIDOS: ${totalVencidos}`, 90, 57);
        doc.text(`ACTIVOS: ${equiposReales.length}`, 155, 57);
        doc.text(`PENDIENTES ACT: ${conteoNull}`, 220, 57);

        const tableData = equiposReales.map(e => [
            e.placaRodaje, e.actual, `${e.kmHodoUltiMp || 0} (${e.tipoMpUlt || 'N/A'})`,
            `${e.meta} (${e.tipoProxMp || 'N/A'})`, `${e.desfaseReal}h`, e.estado
        ]);

        autoTable(doc, {
            startY: 70,
            head: [['PLACA', 'HORO. ACTUAL', 'ULT. MP', 'PROX. MP (META)', 'DESFASE', 'ESTADO']],
            body: tableData,
            theme: 'striped',
            headStyles: { fillColor: [15, 23, 42], fontSize: 9 },
            styles: { fontSize: 8 },
            didParseCell: (data) => {
                if (data.column.index === 4 && parseInt(data.cell.raw as string) <= 0) data.cell.styles.textColor = [225, 29, 72];
                if (data.column.index === 5) {
                    if (data.cell.raw === 'VENCIDO') data.cell.styles.textColor = [225, 29, 72];
                    if (data.cell.raw === 'CRÍTICO') data.cell.styles.textColor = [245, 158, 11];
                }
            },
            // Dibujar barrita visual de desfase en el PDF
            didDrawCell: (data) => {
                if (data.column.index === 5 && data.cell.section === 'body') {
                    const desfase = equiposReales[data.row.index].desfaseReal;
                    const w = 15; const h = 2;
                    const x = data.cell.x + (data.cell.width / 2) - (w / 2);
                    const y = data.cell.y + data.cell.height - 4;
                    doc.setFillColor(220, 220, 220); doc.rect(x, y, w, h, 'F');
                    if (desfase <= 0) doc.setFillColor(225, 29, 72);
                    else if (desfase <= 50) doc.setFillColor(245, 158, 11);
                    else doc.setFillColor(16, 185, 129);
                    const progress = Math.max(0, Math.min(w, (desfase / 250) * w));
                    doc.rect(x, y, progress, h, 'F');
                }
            }
        });
        doc.save(`Informe_Preventivo_${obtenerFechaHoyLocal()}.pdf`);
    }

    return (
        <main className="min-h-screen bg-[#F8FAFC] p-4 md:p-8 text-slate-900 font-sans">
            <div className="max-w-[1600px] mx-auto space-y-6">

                {/* HEADER */}
                <div className="flex flex-col lg:flex-row justify-between items-center gap-6 bg-white p-6 rounded-[2rem] shadow-sm border border-slate-200">
                    <div className="flex items-center gap-4">
                        <button onClick={() => router.push('/rendimiento')} className="p-3 hover:bg-slate-100 rounded-xl text-slate-400 transition-colors"><ChevronLeft /></button>
                        <h1 className="text-2xl font-black uppercase tracking-tight text-slate-800">Control Real de Preventivos</h1>
                    </div>
                    <button onClick={exportarPDF} className="bg-slate-900 text-white px-8 py-4 rounded-2xl flex items-center gap-3 text-xs font-black uppercase shadow-xl hover:bg-blue-600 transition-all">
                        <Download size={18} /> Exportar Reporte PDF
                    </button>
                </div>

                {/* KPIs */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <AnalisisCard label="Cumplimiento Real" val={`${cumplimientoFlota}%`} icon={<Gauge />} color="text-blue-600" bg="bg-blue-50" />
                    <AnalisisCard label="Vencidos" val={totalVencidos} icon={<AlertTriangle />} color="text-rose-600" bg="bg-rose-50" />
                    <AnalisisCard label="Unidades con Datos" val={equiposReales.length} icon={<CheckCircle2 />} color="text-emerald-600" bg="bg-emerald-50" />
                    <AnalisisCard label="Pendientes Actualizar" val={conteoNull} icon={<FileX />} color="text-slate-400" bg="bg-slate-100" border="border-dashed border-2 border-slate-300" />
                </div>

                {/* GRÁFICAS */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <div className="lg:col-span-2 bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-200 h-[450px]">
                        <h3 className="text-xs font-black uppercase text-slate-400 mb-6 flex items-center gap-2"><TrendingUp size={14} /> Ranking de Desfase (Horas)</h3>
                        <ResponsiveContainer width="100%" height="90%">
                            <ReBarChart data={equiposReales.sort((a, b) => a.desfaseReal - b.desfaseReal).slice(0, 10)} layout="vertical">
                                <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#f1f5f9" />
                                <XAxis type="number" hide />
                                <YAxis dataKey="placaRodaje" type="category" axisLine={false} tickLine={false} fontSize={10} fontStyle="bold" width={80} />
                                <Tooltip cursor={{ fill: '#f8fafc' }} />
                                <Bar dataKey="desfaseReal" radius={[0, 4, 4, 0]} barSize={20}>
                                    {equiposReales.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={entry.desfaseReal <= 0 ? '#e11d48' : '#f59e0b'} />
                                    ))}
                                </Bar>
                            </ReBarChart>
                        </ResponsiveContainer>
                    </div>

                    <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-200 flex flex-col items-center justify-center">
                        <h3 className="text-xs font-black uppercase text-slate-400 mb-6 text-center">Estado de Salud de Flota Activa</h3>
                        <ResponsiveContainer width="100%" height={250}>
                            <PieChart>
                                <Pie data={dataPie} innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value">
                                    {dataPie.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.color} />)}
                                </Pie>
                                <Tooltip />
                                <Legend verticalAlign="bottom" height={36} />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* TABLA MAESTRA */}
                <div className="bg-white rounded-[2.5rem] shadow-sm border border-slate-200 overflow-hidden">
                    <div className="p-6 border-b bg-slate-50/50">
                        <h2 className="text-xs font-black uppercase text-slate-800 tracking-widest flex items-center gap-2">
                            <Truck size={16} className="text-blue-600" /> Unidades con Seguimiento de Horómetro
                        </h2>
                    </div>
                    <div className="overflow-x-auto p-4">
                        <table className="w-full text-[10px]">
                            <thead>
                                <tr className="bg-slate-900 text-white uppercase font-black text-center">
                                    <th className="px-4 py-4 text-left rounded-l-2xl">Unidad</th>
                                    <th className="px-2 py-4">Horo. Actual</th>
                                    <th className="px-2 py-4">Último MP</th>
                                    <th className="px-2 py-4">Próx. MP</th>
                                    <th className="px-2 py-4">Desfase</th>
                                    <th className="px-4 py-4">Estado</th>
                                    <th className="px-4 py-4 rounded-r-2xl">Info</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 font-bold">
                                {equiposReales.map((eq, idx) => (
                                    <tr key={idx} className="hover:bg-slate-50 transition-colors">
                                        <td className="px-4 py-4">
                                            <p className="text-slate-800 uppercase font-black">{eq.placaRodaje}</p>
                                            <p className="text-[8px] text-slate-400 uppercase">{eq.marca} {eq.modelo}</p>
                                        </td>
                                        <td className="px-2 py-4 text-center font-mono">{eq.actual}</td>
                                        <td className="px-2 py-4 text-center">{eq.kmHodoUltiMp || '---'} ({eq.tipoMpUlt || 'N/A'})</td>
                                        <td className="px-2 py-4 text-center text-blue-600">{eq.meta} ({eq.tipoProxMp || 'N/A'})</td>
                                        <td className={`px-2 py-4 text-center font-mono font-black ${eq.desfaseReal <= 0 ? 'text-rose-600' : 'text-emerald-600'}`}>{eq.desfaseReal}h</td>
                                        <td className="px-4 py-4 text-center">
                                            <span className={`px-3 py-1 rounded-full text-[8px] font-black uppercase ${eq.estado === 'VENCIDO' ? 'bg-rose-100 text-rose-600' :
                                                eq.estado === 'CRÍTICO' ? 'bg-amber-100 text-amber-600' : 'bg-emerald-100 text-emerald-600'
                                                }`}>{eq.estado}</span>
                                        </td>
                                        <td className="px-4 py-4 text-center">
                                            <button onClick={() => { setEventoSeleccionado(eq); setIsModalDetalleOpen(true); }} className="p-2 text-blue-500 hover:bg-blue-50 rounded-full transition-all"><Info size={16} /></button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* MODAL DE VISTA DETALLADA */}
                {isModalDetalleOpen && eventoSeleccionado && (
                    <div className="fixed inset-0 z-[120] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
                        <div className="bg-white w-full max-w-lg rounded-[2.5rem] shadow-2xl overflow-hidden">
                            <div className="bg-slate-900 p-6 flex justify-between items-center text-white">
                                <div className="flex items-center gap-3"><Wrench size={20} className="text-blue-400" /><h2 className="font-black uppercase text-sm tracking-widest leading-none">Ficha Técnica: {eventoSeleccionado.placaRodaje}</h2></div>
                                <button onClick={() => setIsModalDetalleOpen(false)}><X size={24} /></button>
                            </div>
                            <div className="p-8 space-y-4">
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="p-3 bg-slate-50 rounded-xl border text-center"><p className="text-[9px] font-black text-slate-400 uppercase mb-1">Horómetro Actual</p><p className="font-black text-blue-600 text-lg">{eventoSeleccionado.horometroMayor}</p></div>
                                    <div className="p-3 bg-slate-50 rounded-xl border text-center"><p className="text-[9px] font-black text-slate-400 uppercase mb-1">Frecuencia MP</p><p className="font-black text-slate-800 text-lg">{eventoSeleccionado.frecuencia} h</p></div>
                                </div>
                                <div className="space-y-3 p-5 bg-blue-50/30 rounded-2xl border border-blue-100">
                                    <div className="flex justify-between text-[11px]"><span className="text-slate-500 font-bold uppercase">Último Mantenimiento:</span><span className="font-black">{eventoSeleccionado.kmHodoUltiMp} h</span></div>
                                    <div className="flex justify-between text-[11px]"><span className="text-slate-500 font-bold uppercase">Tipo Realizado:</span><span className="font-black">{eventoSeleccionado.tipoMpUlt || '---'}</span></div>
                                    <div className="flex justify-between text-[11px] border-t pt-3 mt-2 border-blue-100"><span className="text-blue-600 font-black uppercase">Próximo Objetivo:</span><span className="font-black text-blue-700">{eventoSeleccionado.ProxHoroKmMp} h</span></div>
                                    <div className="flex justify-between text-[11px]"><span className="text-rose-600 font-black uppercase">Desfase Actual:</span><span className={`font-black px-2 py-0.5 rounded ${eventoSeleccionado.desfaseReal <= 0 ? 'text-rose-600 bg-rose-50' : 'text-emerald-600 bg-emerald-50'}`}>{eventoSeleccionado.desfaseReal} Horas</span></div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </main>
    )
}

function AnalisisCard({ label, val, icon, color, bg, border }: any) {
    return (
        <div className={`bg-white p-6 rounded-[2.5rem] shadow-sm border border-slate-200 flex flex-col justify-between hover:shadow-md transition-all ${border || ''}`}>
            <div className="flex items-center gap-4 mb-4">
                <div className={`p-3 ${bg} ${color} rounded-2xl shadow-sm`}>{icon}</div>
                <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest leading-none">{label}</p>
            </div>
            <h3 className={`text-3xl font-black ${color} tracking-tighter`}>{val}</h3>
        </div>
    )
}