"use client"
import { useEffect, useState, useMemo, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import {
    Package, MapPin, CheckCircle2, Search,
    X, ShoppingCart, ChevronRight, ChevronDown, Loader2, Layers, BarChart3, Filter, Truck, HardHat
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

    // ✅ LÓGICA DE ATAJOS DE TECLADO
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            // Alt + S: Buscar
            if (e.altKey && e.key.toLowerCase() === 's') {
                e.preventDefault();
                searchInputRef.current?.focus();
            }
            // Alt + X: Limpiar
            if (e.altKey && e.key.toLowerCase() === 'x') {
                e.preventDefault();
                setBusqueda("");
            }
            // Ctrl + 1: Historial Horometro
            if (e.ctrlKey && e.key === '1') {
                e.preventDefault();
                router.push('/historial-horometro');
            }
            // Ctrl + 0: Equipos
            if (e.ctrlKey && e.key === '0' && !e.altKey) {
                e.preventDefault();
                router.push('/equipos');
            }
            // Ctrl + Alt + 0: Consolidado
            if (e.ctrlKey && e.altKey && e.key === '0') {
                e.preventDefault();
                router.push('/consolidado');
            }
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

    const planFiltrado = useMemo(() => {
        const term = busqueda.toUpperCase().trim();
        return equipos.filter(eq => {
            const cumpleBusqueda = term === "" ? true :
                (eq.placaRodaje?.includes(term) ||
                    eq.codigoEquipo?.toUpperCase().includes(term) ||
                    eq.descripcionEquipo?.toUpperCase().includes(term) ||
                    eq.modelo?.toUpperCase().includes(term));

            const filtroBase = term !== "" ? true : (eq.desface !== null && eq.desface <= 80);
            return cumpleBusqueda && filtroBase;
        })
    }, [equipos, busqueda])

    const resumenCargaTrabajo = useMemo(() => {
        const grupos: Record<string, any> = {};
        planFiltrado.forEach(eq => {
            const llave = `${eq.marca} ${eq.modelo}`;
            const mp = eq.tipoProxMp || 'POR DEFINIR';
            if (!grupos[llave]) {
                grupos[llave] = { marca: eq.marca, modelo: eq.modelo, mantenimientos: {}, totalSeleccionados: 0, totalEnBase: 0 };
            }
            if (!grupos[llave].mantenimientos[mp]) {
                grupos[llave].mantenimientos[mp] = { count: 0, equipos: [] };
            }
            grupos[llave].mantenimientos[mp].equipos.push(eq);
            grupos[llave].totalEnBase += 1;
            if (eq.en_planificacion) {
                grupos[llave].mantenimientos[mp].count += 1;
                grupos[llave].totalSeleccionados += 1;
            }
        });
        return Object.values(grupos);
    }, [planFiltrado])

    const consolidadoInsumos = useMemo(() => {
        const resumen: Record<string, { desc: string, cant: number, unidad: string, nroParte: string }> = {}
        const equiposActivos = equipos.filter(eq => eq.en_planificacion);

        equiposActivos.forEach(eq => {
            const llaveBusqueda = `${eq.marca} - ${eq.modelo}:${eq.tipoProxMp}`
            const requeridos = insumosMaestros.filter(ins => ins.aplicacion_pms?.includes(llaveBusqueda))
            requeridos.forEach(r => {
                const key = r.nro_almacen || r.nro_parte || r.descripcion;
                if (resumen[key]) resumen[key].cant += Number(r.cantidad_base)
                else resumen[key] = { desc: r.descripcion, cant: Number(r.cantidad_base), unidad: r.unidad, nroParte: r.nro_parte }
            })
        })
        return Object.values(resumen).sort((a, b) => b.cant - a.cant);
    }, [equipos, insumosMaestros])

    const togglePlanificacion = async (placa: string, estadoActual: boolean) => {
        setActualizandoPlaca(placa);
        const nuevoEstado = !estadoActual;
        const { error } = await supabase.from('maestroEquipos').update({ en_planificacion: nuevoEstado }).eq('placaRodaje', placa);

        if (!error) {
            setEquipos(prev => prev.map(e => e.placaRodaje === placa ? { ...e, en_planificacion: nuevoEstado } : e));
            setModalDetalle(prev => ({
                ...prev,
                equipos: prev.equipos.map(e => e.placaRodaje === placa ? { ...e, en_planificacion: nuevoEstado } : e)
            }));
        }
        setActualizandoPlaca(null);
    }

    if (loading) return <div className="min-h-screen flex items-center justify-center font-black text-[#0070b1] animate-pulse uppercase italic">Iniciando S/4HANA Hub...</div>

    return (
        <main className="min-h-screen bg-[#f4f6f8] font-sans text-[#32363a] antialiased">

            {/* Header Estilo SAP Fiori */}
            <nav className="bg-[#354a5f] text-white p-2 shadow-lg sticky top-0 z-[100] border-b-4 border-[#0070b1]">
                <div className="max-w-[1800px] mx-auto flex justify-between items-center px-4 h-14">
                    <div className="flex items-center gap-6">
                        <div className="flex items-center gap-2 border-r border-white/10 pr-6">
                            <Layers className="text-blue-300" size={20} />
                            <h1 className="text-sm font-black uppercase tracking-tighter">Planner Logistics</h1>
                        </div>
                        <div className="relative group">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                            <input
                                ref={searchInputRef}
                                type="text"
                                value={busqueda}
                                onChange={(e) => setBusqueda(e.target.value)}
                                placeholder="Buscar [Alt+S]"
                                className="w-[400px] pl-10 pr-10 py-2 bg-white/10 hover:bg-white/20 focus:bg-white focus:text-[#32363a] border-none outline-none rounded-sm font-bold text-xs uppercase transition-all shadow-inner placeholder:text-white/40"
                            />
                        </div>
                    </div>

                    <div className="flex items-center gap-6 text-[10px] font-black uppercase tracking-widest text-blue-200">
                        <div className="flex flex-col items-end leading-none">
                            <span className="text-white text-sm font-mono">{consolidadoInsumos.reduce((a, b) => a + b.cant, 0)}</span>
                            <span>Items en Picking</span>
                        </div>
                        <div className="h-8 w-px bg-white/10" />
                        <ShoppingCart size={20} className="text-white/50" />
                    </div>
                </div>
            </nav>

            <div className="p-6 grid grid-cols-1 xl:grid-cols-4 gap-6 max-w-[1800px] mx-auto">

                {/* ACORDEONES CENTRALES */}
                <div className="xl:col-span-3 space-y-2">
                    {resumenCargaTrabajo.map((grupo, idx) => {
                        const idGrupo = `${grupo.marca}-${grupo.modelo}`;
                        const isExpanded = expandidos.includes(idGrupo);

                        return (
                            <div key={idx} className="bg-white border border-slate-300 rounded-sm shadow-sm overflow-hidden transition-all duration-200">
                                <div
                                    onClick={() => setExpandidos(prev => prev.includes(idGrupo) ? prev.filter(i => i !== idGrupo) : [...prev, idGrupo])}
                                    className={`p-3 flex justify-between items-center cursor-pointer ${isExpanded ? 'bg-slate-50 border-b border-slate-200' : 'hover:bg-slate-50/50'}`}
                                >
                                    <div className="flex items-center gap-4">
                                        <div className={`transition-transform duration-200 ${isExpanded ? 'rotate-90 text-[#0070b1]' : 'text-slate-300'}`}>
                                            <ChevronRight size={20} />
                                        </div>
                                        <div className="text-left">
                                            <p className="text-[8px] font-black text-[#0070b1] uppercase leading-none">{grupo.marca}</p>
                                            <h3 className="text-xs font-black text-slate-700 uppercase tracking-tight">{grupo.modelo}</h3>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-10 pr-4">
                                        <div className="flex flex-col items-end">
                                            <span className={`text-sm font-mono font-black ${grupo.totalSeleccionados > 0 ? 'text-[#0070b1]' : 'text-slate-300'}`}>
                                                {grupo.totalSeleccionados} <span className="text-slate-300 font-normal">/ {grupo.totalEnBase}</span>
                                            </span>
                                            <span className="text-[7px] font-bold text-slate-400 uppercase tracking-tighter">Unidades en Plan</span>
                                        </div>
                                    </div>
                                </div>

                                <div className={`transition-all duration-300 overflow-hidden ${isExpanded ? 'max-h-[500px] opacity-100' : 'max-h-0 opacity-0'}`}>
                                    <div className="p-4 grid grid-cols-1 md:grid-cols-3 gap-2 bg-[#f8f9fa]">
                                        {Object.entries(grupo.mantenimientos).map(([mp, data]: any) => (
                                            <button
                                                key={mp}
                                                onClick={() => setModalDetalle({ visible: true, titulo: `${grupo.modelo} - ${mp}`, equipos: data.equipos })}
                                                className={`flex justify-between items-center p-3 border rounded-sm transition-all active:scale-95 ${data.count > 0 ? 'bg-white border-[#0070b1] border-l-4 shadow-sm' : 'bg-slate-100/50 border-slate-200 opacity-60'}`}
                                            >
                                                <span className="text-[9px] font-black text-slate-600 uppercase italic">{mp}</span>
                                                <div className="flex items-center gap-2">
                                                    <span className={`text-xs font-mono font-black ${data.count > 0 ? 'text-[#0070b1]' : 'text-slate-400'}`}>x{data.count}</span>
                                                    <ChevronRight size={12} className="text-[#0070b1]" />
                                                </div>
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>

                {/* PICKING LIST (SIDEBAR) */}
                <div className="xl:col-span-1">
                    <div className="bg-[#354a5f] rounded-sm shadow-2xl sticky top-[80px] overflow-hidden border border-[#354a5f]">
                        <div className="p-4 flex justify-between items-center text-white border-b border-white/10 bg-[#2a3a4b]">
                            <div className="flex items-center gap-3">
                                <Package size={18} className="text-blue-300" />
                                <h2 className="font-black text-xs uppercase tracking-widest">Requerimiento</h2>
                            </div>
                            <ShoppingCart size={16} className="opacity-20" />
                        </div>
                        <div className="p-0 max-h-[calc(100vh-250px)] overflow-y-auto bg-white">
                            {consolidadoInsumos.map((ins, i) => (
                                <div key={i} className="flex justify-between items-center p-3 border-b border-slate-100 hover:bg-amber-50/10">
                                    <div className="text-left leading-tight">
                                        <p className="font-black text-[9px] text-slate-700 uppercase mb-1">{ins.desc}</p>
                                        <p className="text-[8px] font-mono text-[#0070b1] font-bold tracking-tighter">P/N: {ins.nroParte || 'S/N'}</p>
                                    </div>
                                    <div className="bg-[#354a5f] text-white px-2 py-1 rounded-sm text-[10px] font-mono font-black">x{ins.cant}</div>
                                </div>
                            ))}
                            {consolidadoInsumos.length === 0 && <div className="p-20 text-center text-slate-300 uppercase font-black italic text-[10px]">Sin selecciones</div>}
                        </div>
                        <div className="p-3 bg-slate-50 border-t border-slate-200">
                            <button onClick={() => window.print()} className="w-full bg-[#0070b1] hover:bg-[#0a6ed1] text-white py-3 rounded-sm font-black text-[10px] uppercase shadow-md flex items-center justify-center gap-2">
                                <BarChart3 size={14} /> Imprimir Guía Picking
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* MODAL DETALLE ENRIQUECIDO */}
            {modalDetalle.visible && (
                <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-slate-900/80 backdrop-blur-md p-4 animate-in fade-in duration-200">
                    <div className="bg-white w-full max-w-lg rounded-sm shadow-2xl border-t-8 border-[#0070b1] overflow-hidden">
                        <div className="p-5 border-b flex justify-between items-center bg-[#f8f9fa] text-left">
                            <div className="flex items-center gap-3">
                                <Truck size={20} className="text-[#0070b1]" />
                                <div>
                                    <h3 className="font-black text-sm text-slate-700 uppercase leading-none mb-1">{modalDetalle.titulo}</h3>
                                    <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest">Sincronización de uniddades</p>
                                </div>
                            </div>
                            <button onClick={() => setModalDetalle({ ...modalDetalle, visible: false })} className="p-1 hover:bg-slate-200 rounded-full transition-all">
                                <X className="text-slate-400" size={20} />
                            </button>
                        </div>
                        <div className="p-4 max-h-[50vh] overflow-y-auto space-y-2 bg-[#f0f2f5]">
                            {modalDetalle.equipos.map((eq) => {
                                const activo = eq.en_planificacion;
                                return (
                                    <div
                                        key={eq.placaRodaje}
                                        onClick={() => togglePlanificacion(eq.placaRodaje, eq.en_planificacion)}
                                        className={`flex items-center justify-between p-3 border rounded-sm cursor-pointer transition-all active:scale-[0.98] shadow-sm ${activo ? 'bg-white border-[#0070b1] border-l-8' : 'bg-white/50 border-slate-200 opacity-60 grayscale'}`}
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className={`w-5 h-5 border-2 rounded-sm flex items-center justify-center ${activo ? 'bg-[#0070b1] border-[#0070b1]' : 'border-slate-300 bg-white'}`}>
                                                {actualizandoPlaca === eq.placaRodaje ? <Loader2 size={10} className="animate-spin text-white" /> : activo && <CheckCircle2 size={14} className="text-white" />}
                                            </div>
                                            <div className="text-left leading-none">
                                                <div className="flex items-center gap-2 mb-1">
                                                    <span className={`font-black text-xs ${activo ? 'text-slate-800' : 'text-slate-500'}`}>{eq.placaRodaje}</span>
                                                    <span className="text-[7px] px-1.5 py-0.5 bg-slate-100 text-slate-500 rounded font-black border border-slate-200 uppercase">{eq.codigoEquipo}</span>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <div className="flex items-center gap-1 text-[8px] font-black text-slate-400 uppercase">
                                                        <MapPin size={8} className="text-orange-500" /> {eq.ubic || 'PATIO'}
                                                    </div>
                                                    <div className="flex items-center gap-1 text-[8px] font-black uppercase">
                                                        <div className={`w-1 h-1 rounded-full ${eq.status === 'OPERATIVO' ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                                                        <span className="text-slate-400">{eq.status}</span>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="text-right border-l pl-3 border-slate-100 min-w-[60px]">
                                            <p className={`font-mono font-black text-xs ${eq.desface <= 0 ? 'text-rose-600' : 'text-emerald-600'}`}>{eq.desface}H</p>
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                        <div className="p-4 bg-white border-t flex justify-end">
                            <button onClick={() => setModalDetalle({ ...modalDetalle, visible: false })} className="bg-[#354a5f] text-white px-10 py-3 rounded-sm text-[10px] font-black uppercase shadow-lg active:scale-95 transition-transform">Cerrar</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Barra de Atajos (Footer Informativo) */}
            <div className="fixed bottom-0 left-0 right-0 bg-[#354a5f] border-t border-white/10 px-6 py-1.5 text-white/40 text-[8px] font-black uppercase tracking-[0.2em] flex justify-center gap-8">
                <span className="flex items-center gap-1.5"><kbd className="bg-white/10 px-1 rounded text-white">ALT+S</kbd> BUSCAR</span>
                <span className="flex items-center gap-1.5"><kbd className="bg-white/10 px-1 rounded text-white">ALT+X</kbd> LIMPIAR</span>
                <span className="flex items-center gap-1.5"><kbd className="bg-white/10 px-1 rounded text-white">CTRL+1</kbd> HISTORIAL</span>
                <span className="flex items-center gap-1.5"><kbd className="bg-white/10 px-1 rounded text-white">CTRL+0</kbd> EQUIPOS</span>
            </div>
        </main>
    )
}