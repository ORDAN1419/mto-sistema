'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import {
    ChevronDown,
    ChevronUp,
    Clock,
    Package,
    Search,
    CheckCircle2,
    ListFilter,
    FilterX,
    Plus,
    X,
    Save,
    Trash2,
    RotateCw,
    Pencil,
    Calendar,
    History,
    AlertCircle,
    Wrench,
    Database,
    LayoutDashboard
} from 'lucide-react';

// --- TIPADOS ---
interface Repuesto {
    id: string;
    codigo_almacen: string;
    codigo_fabricante: string;
    descripcion: string;
    status: 'Creado' | 'Enviado' | 'Pedido' | 'Concluido' | 'Instalado';
    criticidad: 'Alta' | 'Media' | 'Baja';
    fecha_pedido: string;
    cantidad?: number;
    falla_general?: string;
    es_servicio?: boolean;
}

interface GrupoEquipo {
    id_grupo: string;
    placa: string;
    fecha: string;
    codigo_interno: string;
    falla_grupo: string;
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
    status: 'Creado' | 'Enviado' | 'Pedido' | 'Concluido' | 'Instalado';
    es_servicio?: boolean;
}

export default function SeguimientoRepuestosPage() {
    const router = useRouter();
    const inputBusquedaRef = useRef<HTMLInputElement>(null);

    // --- ESTADOS DE UI ---
    const [busqueda, setBusqueda] = useState('');
    const [todosAbiertos, setTodosAbiertos] = useState(false);
    const [ocultarCompletados, setOcultarCompletados] = useState(false);
    const [mostrarHistorial, setMostrarHistorial] = useState(false);
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
    const [motivoPedido, setMotivoPedido] = useState('');
    const [criticidadGeneral, setCriticidadGeneral] = useState<'Alta' | 'Media' | 'Baja'>('Media');

    const getFechaLocal = () => {
        const d = new Date();
        const offset = d.getTimezoneOffset() * 60000;
        return (new Date(d.getTime() - offset)).toISOString().slice(0, 10);
    };

    const [fechaGeneral, setFechaGeneral] = useState(getFechaLocal());
    const [listaItems, setListaItems] = useState<ItemFormulario[]>([]);
    const [tempItem, setTempItem] = useState<any>({
        codigoalmacen: '',
        codigo_repuesto: '',
        descripcion: '',
        cantidad: 1,
        status: 'Creado'
    });

    // ✅ NUEVO: LÓGICA DE ATAJOS DE TECLADO
    useEffect(() => {
        const manejarAtajos = (e: KeyboardEvent) => {
            // CTRL + 0 -> Equipos
            if (e.ctrlKey && e.key === '0') {
                e.preventDefault();
                router.push('/equipos');
            }
            // CTRL + 1 -> Historial Horómetro
            if (e.ctrlKey && e.key === '1') {
                e.preventDefault();
                router.push('/historial-horometro');
            }
            // ALT + S -> Seleccionar Buscador
            if (e.altKey && e.key.toLowerCase() === 's') {
                e.preventDefault();
                inputBusquedaRef.current?.focus();
            }
            // ALT + X -> Borrar filtros
            if (e.altKey && e.key.toLowerCase() === 'x') {
                e.preventDefault();
                setBusqueda('');
                setOcultarCompletados(false);
                setMostrarHistorial(false);
            }
        };

        window.addEventListener('keydown', manejarAtajos);
        return () => window.removeEventListener('keydown', manejarAtajos);
    }, [router]);

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

    const procesarDatosParaVista = (): GrupoEquipo[] => {
        const grupos: { [key: string]: GrupoEquipo } = {};
        const terminos = busqueda.toLowerCase().trim().split(/\s+/);

        registrosRaw.forEach(reg => {
            const placaMatch = reg.descripcion.match(/\[(.*?)\]/);
            const fallaMatch = reg.descripcion.match(/\{(.*?)\}/);

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
                falla_general: falla,
                es_servicio: reg.es_servicio
            };

            if (!mostrarHistorial && item.status === 'Instalado') return;
            if (ocultarCompletados && (item.status === 'Concluido' || item.status === 'Instalado')) return;

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

    const prepararEdicion = (repuesto: Repuesto, placa: string) => {
        setPlacaSeleccionada(placa);
        setMotivoPedido(repuesto.falla_general || '');
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
                    descripcion: `[${placaSeleccionada}] {${motivoPedido.toUpperCase()}} ${item.descripcion}`,
                    cantidad: item.cantidad,
                    status: item.status,
                    criticidad: criticidadGeneral
                };

                const itemId = (item as any).id;

                if (modoEdicion && itemId) {
                    await supabase.from('repuestos_utilizados').update(payload).eq('id', itemId);
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
        <main className="min-h-screen bg-[#f7f9fa] text-[#32363a] font-sans">
            {/* --- SAP SHELL BAR --- */}
            <nav className="bg-[#354a5f] text-white h-12 flex items-center px-4 justify-between shadow-md sticky top-0 z-50">
                <div className="flex items-center gap-4">
                    <div className="bg-[#0070b1] p-1.5 rounded-sm cursor-pointer hover:bg-[#005a8e]" onClick={() => router.push('/equipos')}>
                        <LayoutDashboard size={18} className="text-white" />
                    </div>
                    <div className="flex flex-col leading-none text-left">
                        <span className="font-bold text-xs tracking-tight uppercase">Logística: Seguimiento de Repuestos</span>
                        <span className="text-[10px] opacity-60 font-mono uppercase tracking-tighter">S/4HANA Asset Management</span>
                    </div>
                </div>
                <div className="flex items-center gap-4">
                    <div className={`flex items-center gap-1.5 px-2 py-1 rounded-sm border ${dbStatus === 'online' ? 'border-green-500/30 bg-green-500/10' : 'border-red-500/30 bg-red-500/10'}`}>
                        <div className={`w-2 h-2 rounded-full ${dbStatus === 'online' ? 'bg-green-500' : 'bg-red-500'} animate-pulse`} />
                        <span className="text-[9px] font-bold uppercase">{dbStatus === 'online' ? 'En Línea' : 'Error Sync'}</span>
                    </div>
                    <button onClick={cargarDatos} className="hover:bg-white/10 p-2 rounded-sm transition-colors" title="Sincronizar [ALT+Q]">
                        <RotateCw size={18} className={loading ? "animate-spin" : ""} />
                    </button>
                </div>
            </nav>

            <div className="max-w-[1600px] mx-auto p-4 md:p-6 space-y-4">
                {/* --- BARRA DE HERRAMIENTAS (SAP TOOLBAR) --- */}
                <div className="bg-white border border-[#d3d7d9] p-2 flex flex-col md:flex-row justify-between items-center gap-4 shadow-sm">
                    <div className="flex flex-wrap gap-2">
                        <button onClick={() => { setModoEdicion(false); setListaItems([]); setPlacaSeleccionada(''); setMotivoPedido(''); setFechaGeneral(getFechaLocal()); setIsModalOpen(true); }}
                            className="bg-[#0070b1] hover:bg-[#005a8e] text-white px-4 py-1.5 rounded-sm text-xs font-bold uppercase transition-all shadow-sm flex items-center gap-2">
                            <Plus size={14} /> Nuevo Requerimiento
                        </button>
                        <div className="h-8 w-px bg-[#d3d7d9] mx-1 hidden md:block" />
                        <label className="flex items-center gap-2 px-3 py-1.5 rounded-sm border border-[#d3d7d9] cursor-pointer hover:bg-slate-50 transition-colors">
                            <input type="checkbox" checked={mostrarHistorial} onChange={(e) => setMostrarHistorial(e.target.checked)} className="w-3.5 h-3.5 accent-[#0070b1]" />
                            <span className="text-[11px] font-bold text-[#6a6d70] uppercase">Mostrar Instalados</span>
                        </label>
                        <button onClick={() => setOcultarCompletados(!ocultarCompletados)}
                            className={`flex items-center gap-2 px-3 py-1.5 rounded-sm border transition-all text-[11px] font-bold uppercase ${ocultarCompletados ? 'bg-[#eff4f9] border-[#0070b1] text-[#0070b1]' : 'border-[#d3d7d9] text-[#6a6d70]'}`}>
                            {ocultarCompletados ? <FilterX size={14} /> : <ListFilter size={14} />} {ocultarCompletados ? 'Solo Pendientes' : 'Ver Todos'}
                        </button>
                    </div>

                    <div className="relative w-full md:w-80">
                        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#6a6d70]" size={14} />
                        <input
                            ref={inputBusquedaRef}
                            type="text"
                            placeholder="Buscar por placa, repuesto... [ALT+S]"
                            className="w-full pl-9 pr-4 py-1.5 border border-[#b0b3b5] hover:border-[#0070b1] focus:border-[#0070b1] rounded-sm text-xs outline-none transition-all font-medium"
                            value={busqueda}
                            onChange={(e) => setBusqueda(e.target.value)}
                        />
                    </div>
                </div>

                {/* --- LISTADO DE REGISTROS --- */}
                <div className="space-y-3">
                    <div className="flex justify-between items-center px-1">
                        <span className="text-[10px] font-bold text-[#6a6d70] uppercase tracking-tighter">Documentos encontrados: {equiposFiltrados.length}</span>
                        <button onClick={toggleTodos} className="text-[10px] text-[#0070b1] font-bold uppercase hover:underline">{todosAbiertos ? 'Contraer todo' : 'Expandir todo'}</button>
                    </div>

                    {loading ? (
                        <div className="bg-white border border-[#d3d7d9] py-20 flex flex-col items-center justify-center gap-4">
                            <RotateCw className="animate-spin text-[#0070b1]" size={32} />
                            <p className="text-[11px] font-bold text-[#6a6d70] uppercase tracking-widest leading-none">Accediendo a base de datos SAP...</p>
                        </div>
                    ) : (
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
                    )}
                </div>
            </div>

            {/* --- MODAL FORMULARIO --- */}
            {isModalOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-[#354a5f]/60 backdrop-blur-sm p-4 leading-none">
                    <div className="bg-white w-full max-w-2xl rounded-sm shadow-2xl overflow-hidden flex flex-col max-h-[95vh] border border-[#d3d7d9]">
                        <div className="bg-[#354a5f] p-3 flex justify-between items-center text-white">
                            <span className="text-xs font-bold uppercase tracking-wider">{modoEdicion ? 'Actualizar Documento' : 'Crear Nuevo Requerimiento Técnico'}</span>
                            <button onClick={() => setIsModalOpen(false)} className="hover:opacity-70"><X size={20} /></button>
                        </div>

                        <div className="p-6 overflow-y-auto space-y-6 bg-white text-left leading-none">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-[#f7f9fa] p-4 border border-[#d3d7d9]">
                                <div className="space-y-1.5 text-left leading-none">
                                    <label className="text-[10px] font-bold text-[#6a6d70] uppercase leading-none">Objeto Técnico (Placa)</label>
                                    <input list="listaEquipos" className="w-full p-2 border border-[#b0b3b5] focus:border-[#0070b1] outline-none text-xs font-bold uppercase" value={placaSeleccionada} onChange={(e) => setPlacaSeleccionada(e.target.value.toUpperCase())} />
                                    <datalist id="listaEquipos">{equiposMaster.map((eq) => (<option key={eq.placaRodaje} value={eq.placaRodaje}>{eq.codigoEquipo}</option>))}</datalist>
                                </div>
                                <div className="space-y-1.5 text-left leading-none">
                                    <label className="text-[10px] font-bold text-[#6a6d70] uppercase leading-none">Prioridad de Atención</label>
                                    <select className="w-full p-2 border border-[#b0b3b5] focus:border-[#0070b1] outline-none text-xs font-bold" value={criticidadGeneral} onChange={(e) => setCriticidadGeneral(e.target.value as any)}>
                                        <option value="Baja">Baja</option><option value="Media">Media</option><option value="Alta">Alta</option>
                                    </select>
                                </div>
                                <div className="md:col-span-2 space-y-1.5 text-left leading-none">
                                    <label className="text-[10px] font-bold text-[#6a6d70] uppercase leading-none">Descripción de la Anomalía / Motivo</label>
                                    <input className="w-full p-2 border border-[#b0b3b5] focus:border-[#0070b1] outline-none text-xs font-bold uppercase" value={motivoPedido} onChange={(e) => setMotivoPedido(e.target.value)} />
                                </div>
                            </div>

                            <div className="space-y-4 p-4 border border-[#d3d7d9] rounded-sm text-left leading-none">
                                <h3 className="text-[10px] font-black text-[#0070b1] uppercase flex items-center gap-2 border-b pb-2 leading-none"><Plus size={14} /> Añadir Ítems al Documento</h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-left leading-none">
                                    <div className="md:col-span-2 space-y-1 text-left leading-none">
                                        <label className="text-[9px] font-bold text-slate-400 uppercase leading-none">Descripción Técnica del Repuesto</label>
                                        <input className="w-full p-2 border border-[#b0b3b5] text-xs font-medium outline-none focus:border-[#0070b1]" value={modoEdicion ? (listaItems[0]?.descripcion || '') : tempItem.descripcion} onChange={(e) => modoEdicion ? setListaItems([{ ...listaItems[0], descripcion: e.target.value }]) : setTempItem({ ...tempItem, descripcion: e.target.value })} />
                                    </div>
                                    <div className="space-y-1 text-left leading-none">
                                        <label className="text-[9px] font-bold text-slate-400 uppercase leading-none">Cód. Almacén</label>
                                        <input className="w-full p-2 border border-[#b0b3b5] text-xs font-mono uppercase outline-none focus:border-[#0070b1]" value={modoEdicion ? (listaItems[0]?.codigoalmacen || '') : tempItem.codigoalmacen} onChange={(e) => modoEdicion ? setListaItems([{ ...listaItems[0], codigoalmacen: e.target.value.toUpperCase() }]) : setTempItem({ ...tempItem, codigoalmacen: e.target.value.toUpperCase() })} />
                                    </div>
                                    <div className="space-y-1 text-left leading-none">
                                        <label className="text-[9px] font-bold text-slate-400 uppercase leading-none">Nº de Parte</label>
                                        <input className="w-full p-2 border border-[#b0b3b5] text-xs font-mono uppercase outline-none focus:border-[#0070b1]" value={modoEdicion ? (listaItems[0]?.codigo_repuesto || '') : tempItem.codigo_repuesto} onChange={(e) => modoEdicion ? setListaItems([{ ...listaItems[0], codigo_repuesto: e.target.value.toUpperCase() }]) : setTempItem({ ...tempItem, codigo_repuesto: e.target.value.toUpperCase() })} />
                                    </div>
                                    <div className="md:col-span-2 flex gap-3 text-left leading-none items-end">
                                        <div className="w-24 space-y-1 leading-none">
                                            <label className="text-[9px] font-bold text-slate-400 uppercase leading-none">Cantidad</label>
                                            <input type="number" className="w-full p-2 border border-[#b0b3b5] text-xs font-black outline-none focus:border-[#0070b1]" value={modoEdicion ? (listaItems[0]?.cantidad || 1) : tempItem.cantidad} onChange={(e) => modoEdicion ? setListaItems([{ ...listaItems[0], cantidad: parseInt(e.target.value) }]) : setTempItem({ ...tempItem, cantidad: parseInt(e.target.value) })} />
                                        </div>
                                        <div className="flex-grow space-y-1 leading-none">
                                            <label className="text-[9px] font-bold text-slate-400 uppercase leading-none">Estado de Línea</label>
                                            <select className="w-full p-2 border border-[#b0b3b5] text-xs font-bold outline-none focus:border-[#0070b1]" value={modoEdicion ? (listaItems[0]?.status || 'Creado') : tempItem.status} onChange={(e) => modoEdicion ? setListaItems([{ ...listaItems[0], status: e.target.value as any }]) : setTempItem({ ...tempItem, status: e.target.value as any })}>
                                                <option value="Creado">Creado</option><option value="Enviado">Enviado</option><option value="Pedido">Pedido</option><option value="Concluido">Recibido</option><option value="Instalado">Instalado</option>
                                            </select>
                                        </div>
                                        {!modoEdicion && (
                                            <button onClick={agregarItemALista} className="bg-[#0070b1] text-white px-4 py-2 rounded-sm hover:bg-[#005a8e] transition-colors"><Plus size={16} /></button>
                                        )}
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-1 max-h-40 overflow-y-auto leading-none">
                                {listaItems.map((item) => (
                                    <div key={item.id_temp} className="flex items-center justify-between p-2 border-b border-[#f2f4f5] bg-white hover:bg-[#f7f9fa] leading-none text-left">
                                        <div className="flex items-center gap-3">
                                            <span className="text-[10px] font-black text-[#0070b1] leading-none">{item.cantidad} UN</span>
                                            <p className="text-[11px] font-bold text-[#32363a] uppercase leading-none">{item.descripcion}</p>
                                        </div>
                                        {!modoEdicion && <button onClick={() => setListaItems(listaItems.filter(i => i.id_temp !== item.id_temp))} className="text-[#bb0000] hover:bg-red-50 p-1 rounded-sm transition-colors leading-none"><Trash2 size={14} /></button>}
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="p-4 bg-[#f2f4f5] border-t flex justify-end gap-3 leading-none">
                            <button onClick={() => setIsModalOpen(false)} className="px-6 py-2 border border-[#b0b3b5] bg-white rounded-sm font-bold text-[11px] uppercase hover:bg-slate-50 transition-all leading-none">Cancelar</button>
                            <button onClick={handleGuardarTodo} className="px-8 py-2 bg-[#0070b1] hover:bg-[#005a8e] text-white rounded-sm font-bold text-[11px] uppercase shadow-md transition-all flex items-center gap-2 leading-none">
                                <Save size={14} /> {modoEdicion ? 'Actualizar Transacción' : 'Contabilizar Pedido'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </main>
    );
}

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

    const getStatusColor = (status: string) => {
        const colors = { 'Creado': 'bg-slate-400', 'Enviado': 'bg-orange-500', 'Pedido': 'bg-blue-600', 'Concluido': 'bg-emerald-600', 'Instalado': 'bg-green-700' };
        return colors[status as keyof typeof colors] || 'bg-slate-300';
    };

    return (
        <div className="bg-white border border-[#d3d7d9] shadow-sm overflow-hidden text-left leading-none">
            <button onClick={onToggle} className={`w-full flex flex-col md:flex-row md:items-center justify-between p-3 hover:bg-[#f7f9fa] transition-colors gap-4 border-l-4 ${itemsConcluidos === totalItems ? 'border-l-green-600' : 'border-l-[#0070b1]'} ${isOpen ? 'bg-[#f7f9fa]' : ''}`}>
                <div className="flex flex-wrap items-center gap-6">
                    <div className="bg-[#354a5f] text-white font-bold px-3 py-1.5 text-base font-mono tracking-tighter leading-none">{equipo.placa}</div>
                    <div className="flex-1 min-w-[200px] leading-none">
                        <p className="text-[9px] text-[#0070b1] uppercase font-bold mb-1 leading-none">Falla / Motivo Pedido</p>
                        <p className="text-[#32363a] font-bold text-[13px] uppercase truncate max-w-sm leading-none">{equipo.falla_grupo}</p>
                    </div>
                    <div className="flex items-center gap-2 bg-[#eff4f9] px-2 py-1 rounded-sm border border-[#b0ccf0] leading-none">
                        <Calendar size={12} className="text-[#0070b1]" />
                        <span className="text-[11px] font-bold text-[#0070b1] leading-none">{equipo.fecha.split('-').reverse().join('/')}</span>
                    </div>
                    <div className="leading-none">
                        <p className="text-[9px] text-[#6a6d70] uppercase font-bold mb-1 leading-none">Espera Logística</p>
                        <div className={`flex items-center gap-1.5 font-bold text-[11px] leading-none ${dias > 15 ? 'text-[#bb0000]' : 'text-[#32363a]'}`}>
                            <Clock size={12} /> <span>{dias <= 0 ? 'Hoy' : `${dias} Días`}</span>
                        </div>
                    </div>
                    <div className="leading-none text-right">
                        <p className="text-[9px] text-[#6a6d70] uppercase font-bold mb-1 leading-none text-right">Cumplimiento</p>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-sm border uppercase ${itemsConcluidos === totalItems ? 'text-green-700 bg-green-50 border-green-200' : 'text-[#0070b1] bg-blue-50 border-[#b0ccf0]'}`}>
                            {itemsConcluidos === totalItems ? 'Completo' : `${itemsConcluidos}/${totalItems}`}
                        </span>
                    </div>
                </div>
                <ChevronDown size={18} className={`text-[#6a6d70] transition-transform ${isOpen ? 'rotate-180' : ''}`} />
            </button>

            {isOpen && (
                <div className="p-4 border-t border-[#d3d7d9] bg-white animate-in slide-in-from-top duration-300 leading-none">
                    <div className="overflow-x-auto leading-none">
                        <table className="w-full text-xs leading-none">
                            <thead className="bg-[#f2f4f5] leading-none text-left">
                                <tr className="text-[#6a6d70] text-[10px] uppercase border-b border-[#d3d7d9] font-bold leading-none">
                                    <th className="p-3 text-left leading-none">Datos Almacén</th>
                                    <th className="p-3 text-left leading-none">Material / Servicio</th>
                                    <th className="p-3 text-center leading-none">Prioridad</th>
                                    <th className="p-3 text-left leading-none w-56">Estado Transaccional</th>
                                    <th className="p-3 text-right leading-none">Acciones</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-[#ebeef0] leading-none">
                                {equipo.repuestos.map((r: any) => (
                                    <tr key={r.id} className={`hover:bg-[#f7f9fa] ${r.status === 'Instalado' ? 'opacity-50 grayscale-[0.3]' : ''} leading-none text-left`}>
                                        <td className="p-3 leading-none text-left">
                                            <div className="font-mono text-[11px] font-bold text-[#0070b1] uppercase leading-none">{r.codigo_almacen}</div>
                                            <div className="font-mono text-[9px] text-[#6a6d70] mt-1 uppercase leading-none tracking-tighter">{r.codigo_fabricante}</div>
                                        </td>
                                        <td className="p-3 font-bold text-[#32363a] uppercase leading-none text-left">
                                            <div className="flex items-center gap-2 leading-none text-left">
                                                {r.es_servicio ? <Wrench size={12} className="text-[#e6600d]" /> : <Package size={12} className="text-[#0070b1]" />}
                                                {r.descripcion} <span className="text-[#0070b1] font-black ml-1 leading-none text-left">x{r.cantidad}</span>
                                            </div>
                                        </td>
                                        <td className="p-3 text-center leading-none">
                                            <span className={`px-2 py-0.5 rounded-sm text-[9px] font-bold border uppercase ${r.criticidad === 'Alta' ? 'bg-[#fff4f4] text-[#bb0000] border-[#ffbbbb]' : r.criticidad === 'Media' ? 'bg-[#fff8f0] text-[#e6600d] border-[#f3d3b6]' : 'bg-[#f4f4f4] text-[#6a6d70] border-[#d3d7d9]'}`}>
                                                {r.criticidad}
                                            </span>
                                        </td>
                                        <td className="p-3 leading-none text-left">
                                            <div className="flex flex-col gap-1.5 leading-none text-left">
                                                <select value={r.status} onChange={(e) => onUpdateStatus(r.id, e.target.value)} className="text-[10px] font-bold uppercase bg-transparent outline-none cursor-pointer text-[#0070b1] hover:underline leading-none text-left">
                                                    <option value="Creado">Creado</option><option value="Enviado">Enviado</option><option value="Pedido">Pedido</option><option value="Concluido">Recibido</option><option value="Instalado">Instalado</option>
                                                </select>
                                                <div className="h-1 w-full bg-[#f2f4f5] border border-[#d3d7d9] rounded-sm overflow-hidden leading-none">
                                                    <div style={{ width: r.status === 'Instalado' ? '100%' : r.status === 'Concluido' ? '85%' : r.status === 'Pedido' ? '60%' : '20%' }}
                                                        className={`h-full transition-all duration-700 ${getStatusColor(r.status)}`} />
                                                </div>
                                            </div>
                                        </td>
                                        <td className="p-3 text-right leading-none">
                                            <div className="flex justify-end gap-1 leading-none">
                                                <button onClick={() => onEditItem(r)} className="p-1.5 text-[#0070b1] hover:bg-[#eff4f9] rounded-sm transition-all leading-none"><Pencil size={14} /></button>
                                                <button onClick={() => onDeleteItem(r.id)} className="p-1.5 text-[#bb0000] hover:bg-red-50 rounded-sm transition-all leading-none"><Trash2 size={14} /></button>
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

//