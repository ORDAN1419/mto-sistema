"use client"
import { useEffect, useState, useMemo, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import {
    Package, MapPin, CheckCircle2, Search,
    X, ShoppingCart, ChevronRight, ChevronDown, Loader2, Layers, BarChart3, Filter, FileText,
    Truck
} from 'lucide-react'

export default function PlanificadorMantenimiento() {
    const router = useRouter()
    const searchInputRef = useRef<HTMLInputElement>(null)
    const [equipos, setEquipos] = useState<any[]>([])
    const [insumosMaestros, setInsumosMaestros] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [busqueda, setBusqueda] = useState("")
    const [actualizandoPlaca, setActualizandoPlaca] = useState<string | null>(null)
    const [expandidos, setExpandidos] = useState<string[]>([])
    const [modalDetalle, setModalDetalle] = useState<{ visible: boolean, titulo: string, equipos: any[] }>({
        visible: false, titulo: "", equipos: []
    })

    // ✅ LÓGICA DE ATAJOS GLOBAL (SAP STYLE)
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.altKey && e.key.toLowerCase() === 's') { e.preventDefault(); searchInputRef.current?.focus(); }
            if (e.altKey && e.key.toLowerCase() === 'x') { e.preventDefault(); setBusqueda(""); }
            if (e.ctrlKey && e.key === '1') { e.preventDefault(); router.push('/historial-horometro'); }
            if (e.ctrlKey && e.key === '0' && !e.altKey) { e.preventDefault(); router.push('/equipos'); }
            if (e.ctrlKey && e.altKey && e.key === '0') { e.preventDefault(); router.push('/consolidado'); }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [router]);

    const fetchData = async () => {
        setLoading(true)
        const { data: eq } = await supabase.from('maestroEquipos').select('*').order('desface', { ascending: true })
        const { data: ins } = await supabase.from('insumosmp_maestros').select('*')
        if (eq) setEquipos(eq)
        if (ins) setInsumosMaestros(ins)
        setLoading(false)
    }
    useEffect(() => { fetchData() }, [])

    // Lógica visual para la pantalla (filtra por buscador)
    const planFiltradoPantalla = useMemo(() => {
        const term = busqueda.toUpperCase().trim();
        return equipos.filter(eq => {
            const cumpleBusqueda = term === "" ? true :
                (eq.placaRodaje?.includes(term) || eq.codigoEquipo?.toUpperCase().includes(term) ||
                    eq.descripcionEquipo?.toUpperCase().includes(term) || eq.modelo?.toUpperCase().includes(term));
            const filtroBase = term !== "" ? true : (eq.desface !== null && eq.desface <= 80);
            return cumpleBusqueda && filtroBase;
        })
    }, [equipos, busqueda])

    const resumenCargaTrabajo = useMemo(() => {
        const grupos: Record<string, any> = {};
        planFiltradoPantalla.forEach(eq => {
            const llave = `${eq.marca} ${eq.modelo}`;
            const mp = eq.tipoProxMp || 'POR DEFINIR';
            if (!grupos[llave]) grupos[llave] = { marca: eq.marca, modelo: eq.modelo, mantenimientos: {}, totalSeleccionados: 0, totalEnBase: 0 };
            if (!grupos[llave].mantenimientos[mp]) grupos[llave].mantenimientos[mp] = { count: 0, equipos: [] };
            grupos[llave].mantenimientos[mp].equipos.push(eq);
            grupos[llave].totalEnBase += 1;
            if (eq.en_planificacion) { grupos[llave].mantenimientos[mp].count += 1; grupos[llave].totalSeleccionados += 1; }
        });
        return Object.values(grupos);
    }, [planFiltradoPantalla])

    const consolidadoInsumos = useMemo(() => {
        const resumen: Record<string, any> = {}
        equipos.filter(eq => eq.en_planificacion).forEach(eq => {
            const llaveBusqueda = `${eq.marca} - ${eq.modelo}:${eq.tipoProxMp}`
            insumosMaestros.filter(ins => ins.aplicacion_pms?.includes(llaveBusqueda)).forEach(r => {
                const key = r.nro_almacen || r.nro_parte || r.descripcion;
                if (resumen[key]) resumen[key].cant += Number(r.cantidad_base)
                else resumen[key] = { desc: r.descripcion, cant: Number(r.cantidad_base), unidad: r.unidad, nroParte: r.nro_parte }
            })
        })
        return Object.values(resumen).sort((a: any, b: any) => b.cant - a.cant);
    }, [equipos, insumosMaestros])

    // ✅ FUNCIÓN GENERADORA DE PDF CORREGIDA (Ignora el buscador, toma todo lo marcado)
    const descargarReportePDF = () => {
        const doc = new jsPDF();
        const fecha = new Date().toLocaleDateString();
        const hora = new Date().toLocaleTimeString();

        // 1. PÁGINA 1: CONSOLIDADO LOGÍSTICO
        doc.setFillColor(53, 74, 95);
        doc.rect(0, 0, 210, 40, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(20);
        doc.text("REQUERIMIENTO GLOBAL DE INSUMOS", 15, 22);
        doc.setFontSize(9);
        doc.text(`SGM Planner - Alejandro Aponte | Generado: ${fecha} ${hora}`, 15, 30);

        doc.setTextColor(0, 0, 0);
        doc.setFontSize(13);
        doc.text("Resumen de Picking para Almacén", 15, 52);

        autoTable(doc, {
            startY: 58,
            head: [['Descripción del Material', 'Nro Parte / Almacén', 'Cant. Total', 'Und']],
            body: consolidadoInsumos.map((ins: any) => [ins.desc, ins.nroParte || 'S/N', ins.cant, ins.unidad]),
            headStyles: { fillColor: [0, 112, 177] },
            styles: { fontSize: 8 },
            margin: { bottom: 20 }
        });

        // 2. PÁGINAS SIGUIENTES: CARTILLAS TÉCNICAS (Lógica independiente del buscador)
        const equiposParaCartillas = equipos.filter(e => e.en_planificacion);

        // Agrupamos por Modelo + MP para crear una cartilla por cada combinación
        const cartillas: Record<string, { equipos: any[], marca: string, modelo: string, mp: string }> = {};

        equiposParaCartillas.forEach(eq => {
            const key = `${eq.marca}-${eq.modelo}-${eq.tipoProxMp}`;
            if (!cartillas[key]) {
                cartillas[key] = { equipos: [], marca: eq.marca, modelo: eq.modelo, mp: eq.tipoProxMp };
            }
            cartillas[key].equipos.push(eq);
        });

        Object.values(cartillas).forEach((cartilla) => {
            doc.addPage();

            // Encabezado Azul SAP
            doc.setFillColor(0, 112, 177);
            doc.rect(0, 0, 210, 25, 'F');
            doc.setTextColor(255, 255, 255);
            doc.setFontSize(16);
            doc.setFont("helvetica", "bold");
            doc.text(`CARTILLA TÉCNICA: ${cartilla.modelo} - ${cartilla.mp}`, 15, 17);

            doc.setTextColor(0, 0, 0);
            doc.setFontSize(10);
            doc.text("UNIDADES SELECCIONADAS PARA INTERVENCIÓN:", 15, 35);

            autoTable(doc, {
                startY: 40,
                head: [['Placa', 'Código', 'Ubicación', 'Desfase']],
                body: cartilla.equipos.map(e => [e.placaRodaje, e.codigoEquipo, e.ubic || 'PATIO', `${e.desface} H`]),
                theme: 'grid',
                headStyles: { fillColor: [100, 100, 100] },
                styles: { fontSize: 9 }
            });

            const finalYPlacas = (doc as any).lastAutoTable.finalY;
            doc.setFontSize(10);
            doc.text("LISTA DE REPUESTOS Y FILTROS POR UNIDAD:", 15, finalYPlacas + 10);

            const llaveBusqueda = `${cartilla.marca} - ${cartilla.modelo}:${cartilla.mp}`;
            const insumosCartilla = insumosMaestros.filter(ins => ins.aplicacion_pms?.includes(llaveBusqueda));

            autoTable(doc, {
                startY: finalYPlacas + 15,
                head: [['Insumo', 'Nro Parte', 'Cant. Unitaria', 'Und']],
                body: insumosCartilla.map(i => [i.descripcion, i.nro_part, i.cantidad_base, i.unidad]),
                headStyles: { fillColor: [53, 74, 95] },
                styles: { fontSize: 8 },
            });

            const finalYInsumos = (doc as any).lastAutoTable.finalY;
            if (finalYInsumos < 260) {
                doc.setFontSize(7);
                doc.setTextColor(150);
                doc.text("__________________________", 15, 275);
                doc.text("Firma Responsable Taller", 15, 280);
                doc.text("__________________________", 140, 275);
                doc.text("Firma Recepción Almacén", 140, 280);
            }
        });

        doc.save(`REPORTE_PLANNER_SGM_${fecha.replace(/\//g, '-')}.pdf`);
    }

    const togglePlanificacion = async (placa: string, estadoActual: boolean) => {
        setActualizandoPlaca(placa);
        const { error } = await supabase.from('maestroEquipos').update({ en_planificacion: !estadoActual }).eq('placaRodaje', placa);
        if (!error) {
            setEquipos(prev => prev.map(e => e.placaRodaje === placa ? { ...e, en_planificacion: !estadoActual } : e));
            setModalDetalle(prev => ({ ...prev, equipos: prev.equipos.map(e => e.placaRodaje === placa ? { ...e, en_planificacion: !estadoActual } : e) }));
        }
        setActualizandoPlaca(null);
    }

    if (loading) return <div className="min-h-screen flex items-center justify-center font-black text-[#0070b1] animate-pulse uppercase italic">Cargando S/4HANA Logistics...</div>

    return (
        <main className="min-h-screen bg-[#f4f6f8] font-sans text-[#32363a] antialiased pb-12">
            {/* Header SAP STYLE */}
            <nav className="bg-[#354a5f] text-white p-2 shadow-lg sticky top-0 z-[100] border-b-4 border-[#0070b1]">
                <div className="max-w-[1800px] mx-auto flex justify-between items-center px-4 h-14">
                    <div className="flex items-center gap-6">
                        <div className="flex items-center gap-2 pr-6 border-r border-white/10">
                            <Layers className="text-blue-300" size={20} />
                            <h1 className="text-sm font-black uppercase tracking-tighter">Planner Logistics SGM</h1>
                        </div>
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                            <input
                                ref={searchInputRef}
                                type="text"
                                value={busqueda}
                                onChange={(e) => setBusqueda(e.target.value)}
                                placeholder="BUSCAR EQUIPO [Alt+S]"
                                className="w-[450px] pl-10 pr-10 py-2 bg-white/10 hover:bg-white/15 focus:bg-white focus:text-slate-800 outline-none rounded-sm font-bold text-xs uppercase transition-all placeholder:text-white/30"
                            />
                            {busqueda && <X onClick={() => setBusqueda("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 cursor-pointer hover:text-white" size={14} />}
                        </div>
                    </div>
                    <div className="flex items-center gap-5">
                        <div className="text-right leading-none border-l border-white/10 pl-5">
                            <p className="text-[16px] font-mono font-black text-white">{consolidadoInsumos.reduce((a, b) => a + b.cant, 0)}</p>
                            <p className="text-[7px] text-blue-200 font-black uppercase">Materiales en Orden</p>
                        </div>
                        <ShoppingCart size={22} className="text-blue-300" />
                    </div>
                </div>
            </nav>

            <div className="p-6 grid grid-cols-1 xl:grid-cols-4 gap-6 max-w-[1800px] mx-auto">
                {/* LISTA DE ACORDEONES */}
                <div className="xl:col-span-3 space-y-2">
                    {resumenCargaTrabajo.map((grupo, idx) => {
                        const idGrupo = `${grupo.marca}-${grupo.modelo}`;
                        const isExpanded = expandidos.includes(idGrupo);
                        return (
                            <div key={idx} className="bg-white border border-slate-300 rounded-sm shadow-sm overflow-hidden transition-all duration-200">
                                <div onClick={() => setExpandidos(prev => prev.includes(idGrupo) ? prev.filter(i => i !== idGrupo) : [...prev, idGrupo])} className={`p-3 flex justify-between items-center cursor-pointer ${isExpanded ? 'bg-slate-50 border-b border-slate-200' : 'hover:bg-slate-50'}`}>
                                    <div className="flex items-center gap-4 text-left">
                                        <div className={`transition-transform duration-200 ${isExpanded ? 'rotate-90 text-[#0070b1]' : 'text-slate-300'}`}><ChevronRight size={20} /></div>
                                        <div>
                                            <p className="text-[8px] font-black text-[#0070b1] uppercase leading-none mb-1">{grupo.marca}</p>
                                            <h3 className="text-xs font-black text-slate-700 uppercase tracking-tight">{grupo.modelo}</h3>
                                        </div>
                                    </div>
                                    <div className="text-right pr-4">
                                        <span className={`text-sm font-mono font-black ${grupo.totalSeleccionados > 0 ? 'text-[#0070b1]' : 'text-slate-300'}`}>{grupo.totalSeleccionados} / {grupo.totalEnBase}</span>
                                        <p className="text-[7px] font-bold text-slate-400 uppercase">Confirmados</p>
                                    </div>
                                </div>
                                <div className={`overflow-hidden transition-all ${isExpanded ? 'max-h-[800px]' : 'max-h-0'}`}>
                                    <div className="p-4 grid grid-cols-1 md:grid-cols-3 gap-2 bg-[#f8f9fa]">
                                        {Object.entries(grupo.mantenimientos).map(([mp, data]: any) => (
                                            <button key={mp} onClick={(e) => { e.stopPropagation(); setModalDetalle({ visible: true, titulo: `${grupo.modelo} - ${mp}`, equipos: data.equipos }); }} className={`flex justify-between items-center p-3 border rounded-sm transition-all active:scale-95 ${data.count > 0 ? 'bg-white border-[#0070b1] border-l-4 shadow-sm' : 'bg-slate-100 opacity-60'}`}>
                                                <span className="text-[9px] font-black text-slate-600 uppercase italic">{mp}</span>
                                                <span className={`text-xs font-mono font-black ${data.count > 0 ? 'text-[#0070b1]' : 'text-slate-400'}`}>x{data.count}</span>
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>

                {/* PICKING LIST LATERAL */}
                <div className="xl:col-span-1">
                    <div className="bg-[#354a5f] rounded-sm shadow-2xl sticky top-[80px] overflow-hidden border border-[#354a5f]">
                        <div className="p-4 flex justify-between items-center text-white bg-[#2a3a4b]">
                            <h2 className="font-black text-xs uppercase tracking-widest flex items-center gap-2"><Package size={18} /> Requerimiento</h2>
                            <button onClick={descargarReportePDF} className="bg-emerald-600 hover:bg-emerald-700 p-2 rounded transition-colors" title="Exportar Reporte">
                                <FileText size={16} />
                            </button>
                        </div>
                        <div className="p-0 max-h-[calc(100vh-250px)] overflow-y-auto bg-white">
                            {consolidadoInsumos.map((ins, i) => (
                                <div key={i} className="flex justify-between items-center p-3 border-b border-slate-100">
                                    <div className="text-left leading-tight">
                                        <p className="font-black text-[9px] text-slate-700 uppercase mb-1">{ins.desc}</p>
                                        <p className="text-[8px] font-mono text-[#0070b1] font-bold tracking-tighter uppercase">P/N: {ins.nroParte || 'S/N'}</p>
                                    </div>
                                    <div className="bg-[#354a5f] text-white px-2 py-1 rounded-sm text-[10px] font-mono font-black">x{ins.cant}</div>
                                </div>
                            ))}
                            {consolidadoInsumos.length === 0 && <div className="p-20 text-center text-slate-300 uppercase font-black italic text-[10px]">Sin selecciones en el plan</div>}
                        </div>
                        <div className="p-3 bg-slate-50 border-t">
                            <button onClick={descargarReportePDF} className="w-full bg-[#0070b1] hover:bg-[#0a6ed1] text-white py-3 rounded-sm font-black text-[10px] uppercase flex items-center justify-center gap-2 transition-all">
                                <BarChart3 size={14} /> Descargar Reporte PDF
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* MODAL DETALLE SELECCIÓN */}
            {modalDetalle.visible && (
                <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-slate-900/80 backdrop-blur-md p-4 animate-in fade-in duration-200">
                    <div className="bg-white w-full max-w-lg rounded-sm shadow-2xl border-t-8 border-[#0070b1] overflow-hidden">
                        <div className="p-5 border-b flex justify-between items-center bg-[#f8f9fa] text-left">
                            <div className="flex items-center gap-3">
                                <Truck size={20} className="text-[#0070b1]" />
                                <div>
                                    <h3 className="font-black text-sm text-slate-700 uppercase leading-none mb-1">{modalDetalle.titulo}</h3>
                                    <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest">Confirmar Unidades para taller</p>
                                </div>
                            </div>
                            <X className="cursor-pointer text-slate-400 hover:text-rose-500" onClick={() => setModalDetalle({ ...modalDetalle, visible: false })} />
                        </div>
                        <div className="p-4 max-h-[50vh] overflow-y-auto space-y-2 bg-[#f0f2f5]">
                            {modalDetalle.equipos.map((eq) => {
                                const activo = eq.en_planificacion;
                                return (
                                    <div key={eq.placaRodaje} onClick={() => togglePlanificacion(eq.placaRodaje, eq.en_planificacion)} className={`flex items-center justify-between p-3 border rounded-sm cursor-pointer transition-all active:scale-[0.98] shadow-sm ${activo ? 'bg-white border-[#0070b1] border-l-8' : 'bg-white/50 opacity-60 grayscale'}`}>
                                        <div className="flex items-center gap-3 text-left leading-none">
                                            <div className={`w-5 h-5 border-2 rounded flex items-center justify-center ${activo ? 'bg-[#0070b1] border-[#0070b1]' : 'border-slate-300 bg-white'}`}>
                                                {actualizandoPlaca === eq.placaRodaje ? <Loader2 size={10} className="animate-spin text-white" /> : activo && <CheckCircle2 size={14} className="text-white" />}
                                            </div>
                                            <div>
                                                <p className={`font-black text-xs ${activo ? 'text-slate-800' : 'text-slate-500'}`}>{eq.placaRodaje}</p>
                                                <p className="text-[8px] font-black text-slate-400 uppercase tracking-tighter mt-1">{eq.codigoEquipo} | {eq.ubic || 'PATIO'}</p>
                                            </div>
                                        </div>
                                        <p className={`font-mono font-black text-xs ${eq.desface <= 0 ? 'text-rose-600' : 'text-emerald-600'}`}>{eq.desface}H</p>
                                    </div>
                                )
                            })}
                        </div>
                        <div className="p-4 bg-white border-t flex justify-end"><button onClick={() => setModalDetalle({ ...modalDetalle, visible: false })} className="bg-[#354a5f] text-white px-10 py-3 rounded-sm text-[10px] font-black uppercase shadow-lg transition-transform active:scale-95">Aceptar</button></div>
                    </div>
                </div>
            )}

            {/* BARRA DE ATAJOS INFORMATIVA */}
            <div className="fixed bottom-0 left-0 right-0 bg-[#354a5f] border-t border-white/10 px-6 py-1.5 text-white/40 text-[8px] font-black uppercase tracking-[0.2em] flex justify-center gap-8 z-50">
                <span className="flex items-center gap-1"><kbd className="bg-white/10 px-1 rounded text-white">ALT+S</kbd> BUSCAR</span>
                <span className="flex items-center gap-1"><kbd className="bg-white/10 px-1 rounded text-white">ALT+X</kbd> LIMPIAR</span>
                <span className="flex items-center gap-1"><kbd className="bg-white/10 px-1 rounded text-white">CTRL+1</kbd> HOROMETRO</span>
                <span className="flex items-center gap-1"><kbd className="bg-white/10 px-1 rounded text-white">CTRL+0</kbd> EQUIPOS</span>
                <span className="flex items-center gap-1"><kbd className="bg-white/10 px-1 rounded text-white">C+A+0</kbd> CONSOLIDADO</span>
            </div>
        </main>
    )
}