'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import {
    ChevronDown,
    Clock,
    Package,
    Search,
    CheckCircle2,
    ListFilter,
    FilterX,
    Plus,
    X,
    Save,
    RefreshCw,
    Trash2,
    RotateCw,
    Pencil,
    Calendar,
    History, // ✅ Nuevo
    AlertCircle // ✅ Nuevo
} from 'lucide-react';

// --- TIPADOS ---
interface Repuesto {
    id: string;
    codigo_almacen: string;
    codigo_fabricante: string;
    descripcion: string;
    status: 'Creado' | 'Enviado' | 'Pedido' | 'Concluido' | 'Instalado'; // ✅ Instalado añadido
    criticidad: 'Alta' | 'Media' | 'Baja';
    fecha_pedido: string;
    cantidad?: number;
    falla_general?: string; // ✅ Campo virtual
}

interface GrupoEquipo {
    id_grupo: string;
    placa: string;
    fecha: string;
    codigo_interno: string;
    falla_grupo: string; // ✅ Nuevo
    repuestos: Repuesto[];
}

interface MasterEquipo {
    placaRodaje: string;
    codigoEquipo: string;
}

interface ItemFormulario {
    id?: string;
    id_temp: string;
    codigoalmacen: string;
    codigo_repuesto: string;
    descripcion: string;
    cantidad: number;
    status: 'Creado' | 'Enviado' | 'Pedido' | 'Concluido' | 'Instalado'; // ✅ Instalado añadido
}

export default function SeguimientoRepuestosPage() {
    // --- ESTADOS DE UI ---
    const [busqueda, setBusqueda] = useState('');
    const [todosAbiertos, setTodosAbiertos] = useState(false);
    const [ocultarCompletados, setOcultarCompletados] = useState(false);
    const [mostrarHistorial, setMostrarHistorial] = useState(false); // ✅ Nuevo Checkbox
    const [abiertosIndividuales, setAbiertosIndividuales] = useState<{ [key: string]: boolean }>({});
    const [dbStatus, setDbStatus] = useState<'online' | 'offline' | 'checking'>('checking');
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [modoEdicion, setModoEdicion] = useState(false);

    // --- ESTADOS DE DATOS ---
    const [registrosRaw, setRegistrosRaw] = useState<any[]>([]);
    const [equiposMaster, setEquiposMaster] = useState<MasterEquipo[]>([]);

    // --- ESTADO FORMULARIO ---
    const [placaSeleccionada, setPlacaSeleccionada] = useState('');
    const [motivoPedido, setMotivoPedido] = useState(''); // ✅ Nuevo motivo
    const [criticidadGeneral, setCriticidadGeneral] = useState<'Alta' | 'Media' | 'Baja'>('Media');

    // Función para obtener fecha local sin desfase
    const getFechaLocal = () => {
        const d = new Date();
        const offset = d.getTimezoneOffset() * 60000;
        return (new Date(d.getTime() - offset)).toISOString().slice(0, 10);
    };

    const [fechaGeneral, setFechaGeneral] = useState(getFechaLocal());
    const [listaItems, setListaItems] = useState<ItemFormulario[]>([]);
    const [tempItem, setTempItem] = useState({
        codigoalmacen: '',
        codigo_repuesto: '',
        descripcion: '',
        cantidad: 1,
        status: 'Creado' as any
    });

    // --- CARGA DE DATOS ---
    const cargarDatos = useCallback(async () => {
        setLoading(true);
        setDbStatus('checking');
        try {
            const { data: repuestos, error: errorRep } = await supabase
                .from('repuestos_utilizados')
                .select('*')
                .order('fecha_cambio', { ascending: false });

            const { data: master, error: errorMaster } = await supabase
                .from('maestroEquipos')
                .select('placaRodaje, codigoEquipo');

            if (errorRep || errorMaster) throw new Error("Error de conexión");

            setRegistrosRaw(repuestos || []);
            setEquiposMaster(master || []);
            setDbStatus('online');
        } catch (error: any) {
            console.error("Error:", error.message);
            setDbStatus('offline');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { cargarDatos() }, [cargarDatos]);

    // --- LÓGICA DE FILTRADO INTELIGENTE ---
    const procesarDatosParaVista = (): GrupoEquipo[] => {
        const grupos: { [key: string]: GrupoEquipo } = {};
        const terminos = busqueda.toLowerCase().trim().split(/\s+/);

        registrosRaw.forEach(reg => {
            const placaMatch = reg.descripcion.match(/\[(.*?)\]/);
            const fallaMatch = reg.descripcion.match(/\{(.*?)\}/); // ✅ Extraer motivo de {}

            const placa = placaMatch ? placaMatch[1] : 'S/P';
            const falla = fallaMatch ? fallaMatch[1] : 'SIN MOTIVO ESPECIFICADO';
            const fecha = reg.fecha_cambio;
            const idGrupo = `${placa}-${fecha}`;

            const descLimpia = reg.descripcion.replace(/\[.*?\]/, '').replace(/\{.*?\}/, '').trim();

            const infoMaster = equiposMaster.find(m => m.placaRodaje === placa);
            const codInt = infoMaster ? infoMaster.codigoEquipo : 'EQUIPO ' + placa;

            const item: Repuesto = {
                id: reg.id,
                codigo_almacen: reg.codigoalmacen || 'N/A',
                codigo_fabricante: reg.codigo_repuesto || 'VER DETALLE',
                descripcion: descLimpia,
                status: reg.status || 'Creado',
                criticidad: reg.criticidad || 'Media',
                fecha_pedido: fecha,
                cantidad: reg.cantidad || 1,
                falla_general: falla
            };

            // ✅ LÓGICA DE VISIBILIDAD SOLICITADA
            if (!mostrarHistorial && item.status === 'Instalado') return;
            if (ocultarCompletados && (item.status === 'Concluido' || item.status === 'Instalado')) return;

            // Filtro Multi-término
            const contenidoBusqueda = `${placa} ${codInt} ${item.descripcion} ${falla}`.toLowerCase();
            const coincide = terminos.every(t => contenidoBusqueda.includes(t));

            if (coincide) {
                if (!grupos[idGrupo]) {
                    grupos[idGrupo] = { id_grupo: idGrupo, placa, fecha, codigo_interno: codInt, repuestos: [], falla_grupo: falla };
                }
                grupos[idGrupo].repuestos.push(item);
            }
        });

        return Object.values(grupos);
    };

    // --- ACCIONES ---
    const prepararEdicion = (repuesto: Repuesto, placa: string) => {
        setPlacaSeleccionada(placa);
        setMotivoPedido(repuesto.falla_general || ''); // ✅ Cargar motivo
        setFechaGeneral(repuesto.fecha_pedido);
        setCriticidadGeneral(repuesto.criticidad);
        setListaItems([{
            id: repuesto.id,
            id_temp: Math.random().toString(36).substr(2, 9),
            codigoalmacen: repuesto.codigo_almacen,
            codigo_repuesto: repuesto.codigo_fabricante,
            descripcion: repuesto.descripcion,
            cantidad: repuesto.cantidad || 1,
            status: repuesto.status
        }]);
        setModoEdicion(true);
        setIsModalOpen(true);
    };

    const actualizarStatusRepuesto = async (id: string, nuevoStatus: string) => {
        try {
            const { error } = await supabase.from('repuestos_utilizados').update({ status: nuevoStatus }).eq('id', id);
            if (error) throw error;
            setRegistrosRaw(prev => prev.map(reg => reg.id === id ? { ...reg, status: nuevoStatus } : reg));
        } catch (error: any) { alert("Error: " + error.message); }
    };

    const borrarRepuesto = async (id: string) => {
        if (!window.confirm("¿Eliminar este registro?")) return;
        try {
            const { error } = await supabase.from('repuestos_utilizados').delete().eq('id', id);
            if (error) throw error;
            setRegistrosRaw(prev => prev.filter(reg => reg.id !== id));
        } catch (error: any) { alert("Error: " + error.message); }
    };

    const agregarItemALista = () => {
        if (!tempItem.descripcion) return;
        setListaItems([...listaItems, { ...tempItem, id_temp: Math.random().toString(36).substr(2, 9) }]);
        setTempItem({ codigoalmacen: '', codigo_repuesto: '', descripcion: '', cantidad: 1, status: 'Creado' });
    };

    const handleGuardarTodo = async () => {
        if (!placaSeleccionada || !motivoPedido || (modoEdicion ? listaItems.length === 0 : (listaItems.length === 0 && !tempItem.descripcion))) return alert("Complete Placa, Motivo e Ítems");
        try {
            const itemsToSave = modoEdicion ? listaItems : (listaItems.length > 0 ? listaItems : [{ ...tempItem }]);
            for (const item of itemsToSave) {
                const payload = {
                    fecha_cambio: fechaGeneral,
                    codigo_repuesto: item.codigo_repuesto,
                    codigoalmacen: item.codigoalmacen,
                    // ✅ FORMATO: [PLACA] {MOTIVO} DESCRIPCION
                    descripcion: `[${placaSeleccionada}] {${motivoPedido.toUpperCase()}} ${item.descripcion}`,
                    cantidad: item.cantidad,
                    status: item.status,
                    criticidad: criticidadGeneral
                };
                if (modoEdicion && item.id) {
                    await supabase.from('repuestos_utilizados').update(payload).eq('id', item.id);
                } else {
                    await supabase.from('repuestos_utilizados').insert([payload]);
                }
            }
            setIsModalOpen(false);
            setModoEdicion(false);
            setListaItems([]);
            cargarDatos();
        } catch (error: any) { alert(error.message); }
    };

    const equiposFiltrados = procesarDatosParaVista();

    const toggleTodos = () => {
        const nuevoEstado = !todosAbiertos;
        setTodosAbiertos(nuevoEstado);
        const mapeo: { [key: string]: boolean } = {};
        equiposFiltrados.forEach(e => { mapeo[e.id_grupo] = nuevoEstado; });
        setAbiertosIndividuales(mapeo);
    };

    return (
        <div className="min-h-screen bg-[#F8FAFC] p-4 md:p-8">
            <div className="max-w-7xl mx-auto">
                {/* HEADER */}
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-10">
                    <div>
                        <div className="flex items-center gap-3 mb-2">
                            <div className="bg-blue-600 p-2 rounded-xl shadow-lg">
                                <Package className="text-white" size={28} />
                            </div>
                            <h1 className="text-3xl font-black text-slate-800 tracking-tight">Seguimiento de Repuestos</h1>
                        </div>
                        <div className="flex items-center gap-3 ml-1">
                            <div className={`w-2.5 h-2.5 rounded-full ${dbStatus === 'online' ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`} />
                            <p className="text-slate-500 font-black text-[10px] uppercase tracking-widest">
                                {dbStatus === 'online' ? 'Base de datos en línea' : 'Error de Conexión'}
                            </p>
                        </div>
                    </div>

                    <div className="flex flex-wrap gap-3 items-center">
                        {/* ✅ CHECKBOX HISTORIAL */}
                        <label className="flex items-center gap-2 bg-white px-4 py-2.5 rounded-xl border-2 border-slate-200 cursor-pointer hover:bg-slate-50 transition-all shadow-sm">
                            <input type="checkbox" checked={mostrarHistorial} onChange={(e) => setMostrarHistorial(e.target.checked)} className="w-4 h-4 text-blue-600 rounded" />
                            <div className="flex items-center gap-2">
                                <History size={16} className="text-slate-500" />
                                <span className="text-sm font-bold text-slate-600">Ver Historial</span>
                            </div>
                        </label>

                        <button onClick={cargarDatos} className="bg-white border-2 border-slate-200 text-slate-600 px-4 py-2.5 rounded-xl font-bold text-sm flex items-center gap-2 hover:bg-slate-50 transition-all active:scale-95">
                            <RotateCw size={18} className={loading ? "animate-spin" : ""} /> Sincronizar
                        </button>
                        <button onClick={() => { setModoEdicion(false); setListaItems([]); setPlacaSeleccionada(''); setMotivoPedido(''); setFechaGeneral(getFechaLocal()); setIsModalOpen(true); }} className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-xl font-bold text-sm flex items-center gap-2 transition-all shadow-md active:scale-95">
                            <Plus size={18} /> NUEVO PEDIDO
                        </button>
                        <button onClick={() => setOcultarCompletados(!ocultarCompletados)} className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border-2 transition-all font-bold text-sm ${ocultarCompletados ? 'bg-orange-50 border-orange-200 text-orange-600' : 'bg-white border-slate-200 text-slate-600'}`}>
                            {ocultarCompletados ? <FilterX size={18} /> : <ListFilter size={18} />} {ocultarCompletados ? 'Pend.' : 'Todos'}
                        </button>
                        <div className="relative group">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500" size={18} />
                            <input type="text" placeholder="Buscar placa, repuesto, código..." className="pl-10 pr-4 py-2.5 border-2 border-slate-200 rounded-xl w-full md:w-80 focus:outline-none focus:border-blue-500 transition-all font-medium" value={busqueda} onChange={(e) => setBusqueda(e.target.value)} />
                        </div>
                    </div>
                </div>

                {/* RESULTADOS */}
                <div className="space-y-4">
                    <div className="flex justify-between items-center px-2">
                        <span className="text-xs font-black text-slate-400 uppercase tracking-widest">Resultados: {equiposFiltrados.length} Registros</span>
                        <button onClick={toggleTodos} className="text-xs font-bold text-blue-600 hover:underline">{todosAbiertos ? 'Contraer todo' : 'Expandir todo'}</button>
                    </div>

                    {loading ? (
                        <div className="flex flex-col items-center justify-center py-24 bg-white rounded-3xl border border-slate-100 shadow-sm">
                            <RefreshCw className="animate-spin text-blue-600 mb-4" size={48} />
                            <p className="text-slate-400 font-bold animate-pulse">Sincronizando con almacén...</p>
                        </div>
                    ) : equiposFiltrados.length > 0 ? (
                        equiposFiltrados.map((grupo) => (
                            <AcordeonEquipo
                                key={grupo.id_grupo}
                                equipo={grupo}
                                isOpen={!!abiertosIndividuales[grupo.id_grupo]}
                                onToggle={() => setAbiertosIndividuales(prev => ({ ...prev, [grupo.id_grupo]: !prev[grupo.id_grupo] }))}
                                onUpdateStatus={actualizarStatusRepuesto}
                                onDeleteItem={borrarRepuesto}
                                onEditItem={(r: any) => prepararEdicion(r, grupo.placa)}
                            />
                        ))
                    ) : (
                        <div className="text-center py-20 bg-white rounded-3xl border-2 border-dashed border-slate-200">
                            <Package className="mx-auto text-slate-200 mb-4" size={64} />
                            <p className="text-slate-400 font-medium">No se encontraron registros activos.</p>
                        </div>
                    )}
                </div>
            </div>

            {/* MODAL FORMULARIO */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-md p-4">
                    <div className="bg-white w-full max-w-2xl rounded-[2rem] shadow-2xl overflow-hidden flex flex-col max-h-[90vh] border border-white/20">
                        <div className="p-6 bg-slate-50/50 border-b border-slate-100 flex justify-between items-center">
                            <div>
                                <h2 className="text-xl font-black text-slate-800 uppercase tracking-tighter">{modoEdicion ? 'MODIFICAR PEDIDO' : 'REGISTRAR REQUERIMIENTO'}</h2>
                                <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest">Múltiples repuestos por equipo</p>
                            </div>
                            <button onClick={() => { setIsModalOpen(false); setModoEdicion(false); }} className="p-2 hover:bg-slate-100 rounded-full text-slate-400 transition-colors"><X /></button>
                        </div>

                        <div className="p-6 overflow-y-auto space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-blue-50/50 p-5 rounded-2xl border border-blue-100 shadow-inner">
                                <div className="space-y-1">
                                    <label className="text-[10px] font-black uppercase text-blue-600 ml-1">Unidad</label>
                                    <input list="listaEquipos" className="w-full p-2.5 rounded-xl border-2 border-white font-bold text-sm focus:border-blue-400 outline-none shadow-sm" value={placaSeleccionada} onChange={(e) => setPlacaSeleccionada(e.target.value.toUpperCase())} placeholder="ABC-123" />
                                    <datalist id="listaEquipos">{equiposMaster.map((eq) => (<option key={eq.placaRodaje} value={eq.placaRodaje}>{eq.codigoEquipo}</option>))}</datalist>
                                </div>
                                <div className="md:col-span-2 space-y-1">
                                    <label className="text-[10px] font-black uppercase text-blue-600 ml-1">Motivo / Descripción de Falla</label>
                                    <input className="w-full p-2.5 rounded-xl border-2 border-white font-bold text-sm focus:border-blue-400 outline-none shadow-sm uppercase" value={motivoPedido} onChange={(e) => setMotivoPedido(e.target.value)} placeholder="EJ: FUGA DE AIRE POR NIPLE" />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[10px] font-black uppercase text-blue-600 ml-1">Prioridad</label>
                                    <select className="w-full p-2.5 rounded-xl border-2 border-white font-bold text-sm outline-none shadow-sm" value={criticidadGeneral} onChange={(e) => setCriticidadGeneral(e.target.value as any)}>
                                        <option value="Baja">🟢 Baja</option>
                                        <option value="Media">🟡 Media</option>
                                        <option value="Alta">🔴 Alta</option>
                                    </select>
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[10px] font-black uppercase text-blue-600 ml-1">Fecha Pedido</label>
                                    <input type="date" className="w-full p-2.5 rounded-xl border-2 border-white font-bold text-sm outline-none shadow-sm" value={fechaGeneral} onChange={(e) => setFechaGeneral(e.target.value)} />
                                </div>
                            </div>

                            <div className="space-y-3 p-5 bg-white border-2 border-dashed border-slate-200 rounded-3xl">
                                <div className="flex justify-between items-center"><h3 className="text-xs font-black text-slate-800 flex items-center gap-2 uppercase tracking-tighter"><Plus size={14} className="text-blue-500" /> Nuevo Artículo</h3></div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                    <input placeholder="Descripción detallada..." className="md:col-span-2 p-3 bg-slate-50 rounded-xl text-sm font-semibold border-transparent focus:border-blue-200 outline-none transition-all shadow-inner" value={modoEdicion ? (listaItems[0]?.descripcion || '') : tempItem.descripcion} onChange={(e) => modoEdicion ? setListaItems([{ ...listaItems[0], descripcion: e.target.value }]) : setTempItem({ ...tempItem, descripcion: e.target.value })} />
                                    <input placeholder="Cód. Almacén" className="p-3 bg-slate-50 rounded-xl text-sm font-mono uppercase" value={modoEdicion ? (listaItems[0]?.codigoalmacen || '') : tempItem.codigoalmacen} onChange={(e) => modoEdicion ? setListaItems([{ ...listaItems[0], codigoalmacen: e.target.value.toUpperCase() }]) : setTempItem({ ...tempItem, codigoalmacen: e.target.value.toUpperCase() })} />
                                    <input placeholder="Referencia / Parte" className="p-3 bg-slate-50 rounded-xl text-sm font-mono uppercase" value={modoEdicion ? (listaItems[0]?.codigo_repuesto || '') : tempItem.codigo_repuesto} onChange={(e) => modoEdicion ? setListaItems([{ ...listaItems[0], codigo_repuesto: e.target.value.toUpperCase() }]) : setTempItem({ ...tempItem, codigo_repuesto: e.target.value.toUpperCase() })} />
                                    <div className="flex gap-2 md:col-span-2">
                                        <div className="flex items-center bg-slate-100 rounded-xl px-2">
                                            <span className="text-[10px] font-black px-2 opacity-50">CANT:</span>
                                            <input type="number" className="w-16 p-3 bg-transparent text-sm font-black outline-none" value={modoEdicion ? (listaItems[0]?.cantidad || 1) : tempItem.cantidad} onChange={(e) => modoEdicion ? setListaItems([{ ...listaItems[0], cantidad: parseInt(e.target.value) }]) : setTempItem({ ...tempItem, cantidad: parseInt(e.target.value) })} />
                                        </div>
                                        <select className="flex-1 p-3 bg-slate-50 rounded-xl text-sm font-bold outline-none" value={modoEdicion ? (listaItems[0]?.status || 'Creado') : tempItem.status} onChange={(e) => modoEdicion ? setListaItems([{ ...listaItems[0], status: e.target.value as any }]) : setTempItem({ ...tempItem, status: e.target.value as any })}>
                                            <option value="Creado">Creado</option>
                                            <option value="Enviado">Enviado</option>
                                            <option value="Pedido">Pedido</option>
                                            <option value="Concluido">Recibido</option>
                                            <option value="Instalado">✅ Instalado</option>
                                        </select>
                                        {!modoEdicion && (
                                            <button onClick={agregarItemALista} className="bg-blue-600 text-white px-5 rounded-xl hover:bg-blue-700 active:scale-90 transition-all shadow-md"><Plus size={20} /></button>
                                        )}
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-2">
                                {listaItems.map((item) => (
                                    <div key={item.id_temp} className="flex items-center justify-between p-4 rounded-2xl border bg-slate-50 shadow-sm">
                                        <div className="flex items-center gap-3">
                                            <span className="w-6 h-6 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-[10px] font-black">{item.cantidad}</span>
                                            <p className="text-sm font-bold text-slate-700 uppercase tracking-tighter">{item.descripcion}</p>
                                        </div>
                                        {!modoEdicion && <button onClick={() => setListaItems(listaItems.filter(i => i.id_temp !== item.id_temp))} className="text-slate-300 hover:text-red-500 transition-colors"><Trash2 size={18} /></button>}
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="p-6 bg-slate-50/50 border-t border-slate-100">
                            <button onClick={handleGuardarTodo} className="w-full bg-[#1E293B] hover:bg-green-600 text-white py-4 rounded-2xl font-black uppercase text-xs tracking-widest transition-all shadow-xl flex items-center justify-center gap-3 active:scale-[0.98]">
                                <Save size={18} /> {modoEdicion ? 'ACTUALIZAR REGISTRO' : 'CONFIRMAR Y GUARDAR PEDIDO'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

// --- SUBCOMPONENTE ACORDEON ---
function AcordeonEquipo({ equipo, isOpen, onToggle, onUpdateStatus, onDeleteItem, onEditItem }: any) {
    const calcularDiasTotales = () => {
        const partes = equipo.fecha.split('-');
        const date = new Date(parseInt(partes[0]), parseInt(partes[1]) - 1, parseInt(partes[2]));
        const hoy = new Date();
        hoy.setHours(0, 0, 0, 0);
        return Math.floor((hoy.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
    };

    const totalItems = equipo.repuestos.length;
    const itemsConcluidos = equipo.repuestos.filter((r: any) => r.status === 'Concluido' || r.status === 'Instalado').length;
    const dias = calcularDiasTotales();

    const getProgressWidth = (status: string) => {
        const steps = { 'Creado': '20%', 'Enviado': '40%', 'Pedido': '60%', 'Concluido': '85%', 'Instalado': '100%' };
        return steps[status as keyof typeof steps] || '0%';
    };

    const getStatusColor = (status: string) => {
        const colors = { 'Creado': 'bg-slate-300', 'Enviado': 'bg-orange-400', 'Pedido': 'bg-blue-500', 'Concluido': 'bg-emerald-500', 'Instalado': 'bg-green-600' };
        return colors[status as keyof typeof colors] || 'bg-slate-200';
    };

    return (
        <div className="bg-white rounded-[1.5rem] shadow-sm border border-slate-200/60 overflow-hidden transition-all duration-300">
            <button onClick={onToggle} className={`w-full flex flex-col md:flex-row md:items-center justify-between p-5 hover:bg-slate-50 transition-colors text-left gap-4 ${isOpen ? 'bg-slate-50/80' : ''}`}>
                <div className="flex flex-wrap items-center gap-4 md:gap-8">
                    <div className="bg-slate-900 text-white font-black px-4 py-2 rounded-xl text-lg tracking-tighter shadow-sm">{equipo.placa}</div>

                    {/* ✅ MOTIVO VISIBLE SIN EXPANDIR */}
                    <div className="flex-1 min-w-[200px]">
                        <p className="text-[9px] text-blue-500 uppercase font-black tracking-widest mb-1">Motivo del Pedido</p>
                        <p className="text-slate-800 font-black text-sm uppercase truncate max-w-sm">{equipo.falla_grupo}</p>
                    </div>

                    <div className="flex items-center gap-2 bg-blue-50 px-3 py-1.5 rounded-lg border border-blue-100">
                        <Calendar size={14} className="text-blue-500" />
                        <span className="text-sm font-black text-blue-700">{equipo.fecha.split('-').reverse().join('/')}</span>
                    </div>
                    <div>
                        <p className="text-[9px] text-slate-400 uppercase font-black tracking-widest leading-tight">Cod. Equipo</p>
                        <p className="text-slate-700 font-black text-sm tracking-tighter">{equipo.codigo_interno}</p>
                    </div>
                    <div>
                        <p className="text-[9px] text-slate-400 uppercase font-black tracking-widest leading-tight">Espera</p>
                        <div className={`flex items-center gap-1.5 font-bold text-sm ${dias > 15 ? 'text-red-500' : 'text-slate-600'}`}>
                            <Clock size={14} /> <span>{dias <= 0 ? 'Hoy' : `${dias} d`}</span>
                        </div>
                    </div>
                    <div>
                        <p className="text-[9px] text-slate-400 uppercase font-black tracking-widest leading-tight">Status Pedido</p>
                        <span className={`text-[10px] font-black px-3 py-1 rounded-full border uppercase tracking-tighter ${itemsConcluidos === totalItems ? 'text-green-600 bg-green-50 border-green-100' : 'text-blue-600 bg-blue-50 border-blue-100'}`}>
                            {itemsConcluidos === totalItems ? 'PROCESADO' : `${itemsConcluidos}/${totalItems} Recibidos`}
                        </span>
                    </div>
                </div>
                <div className={`p-2 rounded-full transition-all ${isOpen ? 'bg-blue-600 text-white rotate-180 shadow-lg' : 'bg-slate-100 text-slate-400'}`}>
                    <ChevronDown size={20} />
                </div>
            </button>

            {isOpen && (
                <div className="p-6 border-t border-slate-100 bg-white animate-in slide-in-from-top duration-300">
                    {/* ✅ BANNER DE MOTIVO EN ABIERTO */}
                    <div className="mb-6 flex items-start gap-3 bg-slate-50 p-4 rounded-2xl border border-slate-100 shadow-inner">
                        <AlertCircle className="text-blue-500 mt-1 shrink-0" size={20} />
                        <div>
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 leading-none">Descripción técnica / Falla</p>
                            <p className="text-slate-700 font-bold text-base uppercase leading-tight">{equipo.falla_grupo}</p>
                        </div>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="text-slate-400 text-[10px] uppercase border-b border-slate-100 font-black tracking-widest">
                                    <th className="pb-4 text-left">Código Logístico</th>
                                    <th className="pb-4 text-left">Ítem / Repuesto</th>
                                    <th className="pb-4 text-center">Prioridad</th>
                                    <th className="pb-4 text-left">Línea de Estado</th>
                                    <th className="pb-4 text-right">Acción</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50">
                                {equipo.repuestos.map((r: any) => (
                                    <tr key={r.id} className={`group hover:bg-slate-50/50 ${r.status === 'Instalado' ? 'opacity-60 grayscale-[0.5]' : ''}`}>
                                        <td className="py-4">
                                            <div className="font-mono text-[11px] font-bold text-blue-600 uppercase">{r.codigo_almacen}</div>
                                            <div className="font-mono text-[10px] text-slate-400 mt-1 uppercase tracking-tighter">{r.codigo_fabricante}</div>
                                        </td>
                                        <td className="py-4 font-bold text-slate-700 uppercase tracking-tighter">
                                            <div className="flex items-center gap-2">
                                                {r.es_servicio ? <Wrench size={14} className="text-orange-500" /> : <Package size={14} className="text-blue-500" />}
                                                {r.descripcion} <span className="text-blue-500 font-black ml-1">x{r.cantidad}</span>
                                            </div>
                                            <div className="text-[9px] text-slate-400 flex items-center gap-2 mt-1 font-bold tracking-widest">
                                                <span className={r.es_servicio ? 'text-orange-600' : 'text-blue-600'}>{r.es_servicio ? 'SERVICIO' : 'REPUESTO'}</span>
                                            </div>
                                        </td>
                                        <td className="py-4 text-center">
                                            <span className={`px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-wider ${r.criticidad === 'Alta' ? 'bg-red-50 text-red-600 border border-red-100' : r.criticidad === 'Media' ? 'bg-amber-50 text-amber-600 border border-amber-100' : 'bg-slate-50 text-slate-500'}`}>
                                                {r.criticidad}
                                            </span>
                                        </td>
                                        <td className="py-4">
                                            <div className="w-48">
                                                <div className="flex justify-between items-center mb-1.5 px-1">
                                                    <select value={r.status} onChange={(e) => onUpdateStatus(r.id, e.target.value)} className="text-[10px] font-black uppercase bg-transparent outline-none cursor-pointer hover:text-blue-600 transition-colors">
                                                        <option value="Creado">Creado</option><option value="Enviado">Enviado</option><option value="Pedido">Pedido</option><option value="Concluido">Recibido</option><option value="Instalado">✅ Instalado</option>
                                                    </select>
                                                    {r.status === 'Instalado' && <CheckCircle2 size={12} className="text-green-600" />}
                                                </div>
                                                <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden shadow-inner">
                                                    <div style={{ width: getProgressWidth(r.status) }} className={`h-full transition-all duration-700 shadow-sm ${getStatusColor(r.status)}`} />
                                                </div>
                                            </div>
                                        </td>
                                        <td className="py-4 text-right">
                                            <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <button onClick={() => onEditItem(r)} className="p-2 text-slate-300 hover:text-blue-500 hover:bg-blue-50 rounded-lg transition-all"><Pencil size={16} /></button>
                                                <button onClick={() => onDeleteItem(r.id)} className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"><Trash2 size={16} /></button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    );
}