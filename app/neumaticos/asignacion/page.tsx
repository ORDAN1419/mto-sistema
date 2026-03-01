"use client"
import { useEffect, useState, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { Truck, PlusCircle, Settings2, RefreshCw, X, Save, Search, Loader2 } from 'lucide-react'

export default function AsignacionNeumaticosPage() {
    const [busqueda, setBusqueda] = useState('')
    const [equipoInfo, setEquipoInfo] = useState<any>(null)
    const [montajeActual, setMontajeActual] = useState<any[]>([])
    const [loading, setLoading] = useState(false)

    // --- ESTADOS PARA FILTRO PREDICTIVO ---
    const [sugerencias, setSugerencias] = useState<any[]>([])
    const [mostrarSugerencias, setMostrarSugerencias] = useState(false)
    const [selectedIndex, setSelectedIndex] = useState(-1) // Nuevo: rastrea la selección
    const containerRef = useRef<HTMLDivElement>(null)

    // Estados para el Modal de Montaje
    const [showModal, setShowModal] = useState(false)
    const [posicionSeleccionada, setPosicionSeleccionada] = useState('')
    const [stock, setStock] = useState<any[]>([])
    const [filtroStock, setFiltroStock] = useState('')

    // 1. Lógica de búsqueda predictiva
    useEffect(() => {
        const buscarEquipos = async () => {
            if (busqueda.length < 2) {
                setSugerencias([]);
                setMostrarSugerencias(false);
                return;
            }
            const { data } = await supabase
                .from('maestroEquipos')
                .select('placaRodaje, codigoEquipo, configuracion_ejes')
                .or(`placaRodaje.ilike.%${busqueda}%,codigoEquipo.ilike.%${busqueda}%`)
                .limit(5);

            setSugerencias(data || []);
            setMostrarSugerencias(true);
            setSelectedIndex(-1); // Reiniciar selección al buscar
        };
        const timer = setTimeout(buscarEquipos, 300);
        return () => clearTimeout(timer);
    }, [busqueda]);

    // Cerrar sugerencias al hacer clic fuera
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setMostrarSugerencias(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const seleccionarEquipo = (equipo: any) => {
        setBusqueda(equipo.placaRodaje);
        setMostrarSugerencias(false);
        setSugerencias([]);
        setSelectedIndex(-1);
        cargarUnidad(equipo.placaRodaje);
    };

    // --- MANEJADOR DE TECLADO ---
    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (!mostrarSugerencias || sugerencias.length === 0) return;

        if (e.key === "ArrowDown") {
            e.preventDefault();
            setSelectedIndex(prev => (prev < sugerencias.length - 1 ? prev + 1 : prev));
        } else if (e.key === "ArrowUp") {
            e.preventDefault();
            setSelectedIndex(prev => (prev > 0 ? prev - 1 : 0));
        } else if (e.key === "Enter") {
            e.preventDefault();
            if (selectedIndex >= 0) {
                seleccionarEquipo(sugerencias[selectedIndex]);
            } else {
                // Si no hay nada seleccionado con flechas, buscar lo que esté escrito
                cargarUnidad(busqueda);
                setMostrarSugerencias(false);
            }
        } else if (e.key === "Escape") {
            setMostrarSugerencias(false);
        }
    };

    // 2. Cargar información de la unidad
    const cargarUnidad = async (placaFinal: string) => {
        if (!placaFinal) return;
        setLoading(true);
        try {
            const { data: eq } = await supabase
                .from('maestroEquipos')
                .select('placaRodaje, codigoEquipo, configuracion_ejes')
                .ilike('placaRodaje', placaFinal.trim())
                .single();

            setEquipoInfo(eq);

            if (eq) {
                const { data: montadas } = await supabase
                    .from('v_neumaticos_estado_actual')
                    .select('*')
                    .eq('placa', eq.placaRodaje);
                setMontajeActual(montadas || []);
            }
        } catch (error) {
            console.error("Error al cargar unidad:", error);
        } finally {
            setLoading(false);
        }
    };

    const abrirMontaje = async (pos: string) => {
        setPosicionSeleccionada(pos);
        const { data } = await supabase
            .from('neumaticos_maestro')
            .select('*')
            .eq('estado', 'STOCK');
        setStock(data || []);
        setShowModal(true);
    };

    const ejecutarMontaje = async (idNeumatico: string) => {
        setLoading(true);
        try {
            const { error: errorAsig } = await supabase.from('neumaticos_asignacion').insert({
                placa: equipoInfo.placaRodaje,
                id_neumatico: idNeumatico,
                posicion: posicionSeleccionada,
                activo: true
            });

            if (errorAsig) throw errorAsig;

            const { error: errorMaestro } = await supabase
                .from('neumaticos_maestro')
                .update({ estado: 'MONTADO' })
                .eq('id', idNeumatico);

            if (errorMaestro) throw errorMaestro;

            setShowModal(false);
            setFiltroStock('');
            await cargarUnidad(equipoInfo.placaRodaje);
        } catch (error: any) {
            alert("Error en la asignación: " + error.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <main className="min-h-screen bg-[#f7f9fa] p-6 font-sans text-left leading-none">
            {/* Buscador Predictivo */}
            <div className="bg-white border border-[#d3d7d9] p-4 mb-6 shadow-sm flex items-center gap-4 relative" ref={containerRef}>
                <div className="bg-[#354a5f] p-2 rounded-sm text-white"><Truck size={20} /></div>
                <div className="relative flex-1">
                    <input
                        className="w-full border border-[#b0b3b5] p-2 text-sm font-bold rounded-sm uppercase outline-none focus:border-[#0070b1]"
                        placeholder="BUSCAR PLACA O CÓDIGO DE EQUIPO..."
                        value={busqueda}
                        onChange={e => setBusqueda(e.target.value)}
                        onKeyDown={handleKeyDown} // Añadido manejador de teclado
                        onFocus={() => busqueda.length >= 2 && setMostrarSugerencias(true)}
                        autoComplete="off"
                    />
                    {/* Lista Desplegable Predictiva */}
                    {mostrarSugerencias && sugerencias.length > 0 && (
                        <div className="absolute top-full left-0 right-0 bg-white border border-[#d3d7d9] shadow-xl z-50 mt-1 rounded-sm overflow-hidden">
                            {sugerencias.map((s, index) => (
                                <div
                                    key={index}
                                    onClick={() => seleccionarEquipo(s)}
                                    className={`p-3 flex justify-between items-center cursor-pointer border-b last:border-0 transition-colors ${selectedIndex === index ? 'bg-[#eff4f9] text-[#0070b1]' : 'hover:bg-[#f7f9fa]'
                                        }`}
                                >
                                    <span className="font-black text-xs text-[#32363a]">{s.placaRodaje}</span>
                                    <span className="text-[10px] font-bold text-slate-400 uppercase">ID: {s.codigoEquipo}</span>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
                <button
                    onClick={() => cargarUnidad(busqueda)}
                    className="bg-[#0070b1] text-white px-6 py-2 text-xs font-bold uppercase rounded-sm hover:bg-[#005a8e] flex items-center gap-2"
                >
                    {loading ? <Loader2 size={14} className="animate-spin" /> : <Search size={14} />}
                    Gestionar
                </button>
            </div>

            {/* Gráfico del Vehículo */}
            {equipoInfo && (
                <div className="bg-white border border-[#d3d7d9] p-8 rounded-sm shadow-md animate-in fade-in duration-500">
                    <h2 className="text-sm font-black text-[#6a6d70] uppercase mb-10 border-b pb-2 flex items-center gap-2">
                        <Settings2 size={16} /> Configuración: {equipoInfo.configuracion_ejes}
                    </h2>

                    <div className="flex flex-col items-center gap-8 max-w-md mx-auto">
                        {equipoInfo.configuracion_ejes?.split('-').map((llantasEnEje: string, ejeIdx: number) => {
                            const numLlantas = parseInt(llantasEnEje);
                            return (
                                <div key={ejeIdx} className="flex items-center gap-20 relative">
                                    <div className="flex gap-1">
                                        {Array.from({ length: numLlantas / 2 }).map((_, i) => {
                                            const pos = `${ejeIdx + 1}I${numLlantas > 2 ? (i === 0 ? 'E' : 'I') : ''}`
                                            return <TireCell key={pos} pos={pos} info={montajeActual.find(m => m.posicion === pos)} onAdd={() => abrirMontaje(pos)} />
                                        })}
                                    </div>
                                    <div className="absolute left-1/2 -translate-x-1/2 w-32 h-1.5 bg-slate-200 -z-10" />
                                    <div className="flex gap-1">
                                        {Array.from({ length: numLlantas / 2 }).map((_, i) => {
                                            const pos = `${ejeIdx + 1}D${numLlantas > 2 ? (i === (numLlantas / 2 - 1) ? 'E' : 'I') : ''}`
                                            return <TireCell key={pos} pos={pos} info={montajeActual.find(m => m.posicion === pos)} onAdd={() => abrirMontaje(pos)} />
                                        })}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* Modal de Selección (Stock) */}
            {showModal && (
                <div className="fixed inset-0 bg-[#354a5f]/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white w-full max-w-lg rounded-sm shadow-2xl overflow-hidden border border-[#d3d7d9]">
                        <div className="bg-[#354a5f] p-3 flex justify-between items-center text-white font-bold text-xs">
                            <span>MONTAR EN POSICIÓN: {posicionSeleccionada}</span>
                            <button onClick={() => setShowModal(false)}><X size={18} /></button>
                        </div>
                        <div className="p-4 bg-[#f2f4f5] border-b">
                            <input
                                className="w-full p-2 text-xs rounded-sm border outline-none"
                                placeholder="Filtrar por serie..."
                                value={filtroStock}
                                onChange={e => setFiltroStock(e.target.value)}
                            />
                        </div>
                        <div className="max-h-80 overflow-y-auto divide-y">
                            {stock.filter(s => s.serie.includes(filtroStock.toUpperCase())).map(n => (
                                <div key={n.id} onClick={() => ejecutarMontaje(n.id)} className="p-4 hover:bg-[#eff4f9] cursor-pointer flex justify-between items-center group">
                                    <div>
                                        <p className="font-black text-[#0070b1] text-sm">{n.serie}</p>
                                        <p className="text-[10px] text-slate-400 font-bold uppercase">{n.marca} {n.modelo}</p>
                                    </div>
                                    <PlusCircle className="text-slate-300 group-hover:text-[#0070b1]" size={20} />
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}
        </main>
    )
}

function TireCell({ pos, info, onAdd }: any) {
    const colors: any = { 'VERDE': 'bg-emerald-500', 'AMARILLO': 'bg-amber-400', 'NARANJA': 'bg-orange-500', 'ROJO': 'bg-rose-600' }
    return (
        <div className="flex flex-col items-center gap-1">
            <span className="text-[8px] font-black text-slate-400 uppercase">{pos}</span>
            {info ? (
                <div className={`w-8 h-12 ${colors[info.alerta_color] || 'bg-slate-800'} rounded-sm flex items-center justify-center text-white border border-black/10 shadow-sm group relative`}>
                    <span className="text-[9px] font-black">{Math.round(info.otr_porcentaje)}%</span>
                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block bg-slate-900 text-white p-2 rounded-sm text-[10px] w-32 z-50 leading-tight">
                        <p className="text-blue-400 font-black mb-1">{info.serie}</p>
                        <div className="flex justify-between"><span>R1:</span><span>{info.mm_izq}mm</span></div>
                        <div className="flex justify-between"><span>R2:</span><span>{info.mm_cen}mm</span></div>
                        <div className="flex justify-between"><span>R3:</span><span>{info.mm_der}mm</span></div>
                    </div>
                </div>
            ) : (
                <button onClick={onAdd} className="w-8 h-12 bg-white border-2 border-dashed border-slate-300 rounded-sm flex items-center justify-center text-slate-300 hover:border-[#0070b1] hover:text-[#0070b1]">
                    <PlusCircle size={14} />
                </button>
            )}
        </div>
    )
}