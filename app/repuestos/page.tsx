'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import {
    ChevronDown,
    AlertTriangle,
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
    Truck
} from 'lucide-react';

// --- TIPADOS ---
interface Repuesto {
    id: string;
    codigo_almacen: string;
    codigo_fabricante: string;
    descripcion: string;
    status: 'Creado' | 'Enviado' | 'Pedido' | 'Concluido';
    criticidad: 'Alta' | 'Media' | 'Baja';
    fecha_pedido: string;
}

interface GrupoEquipo {
    placa: string;
    codigo_interno: string;
    repuestos: Repuesto[];
}

interface MasterEquipo {
    placaRodaje: string;
    codigoEquipo: string;
}

interface ItemFormulario {
    id_temp: string;
    codigoalmacen: string;
    codigo_repuesto: string;
    descripcion: string;
    cantidad: number;
    status: 'Creado' | 'Enviado' | 'Pedido' | 'Concluido';
}

export default function SeguimientoRepuestosPage() {
    const [busqueda, setBusqueda] = useState('');
    const [todosAbiertos, setTodosAbiertos] = useState(false);
    const [ocultarCompletados, setOcultarCompletados] = useState(false);
    const [abiertosIndividuales, setAbiertosIndividuales] = useState<{ [key: string]: boolean }>({});

    // --- ESTADOS DATOS ---
    const [registrosRaw, setRegistrosRaw] = useState<any[]>([]);
    const [equiposMaster, setEquiposMaster] = useState<MasterEquipo[]>([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);

    // --- ESTADO FORMULARIO MULTI-ITEM ---
    const [placaSeleccionada, setPlacaSeleccionada] = useState('');
    const [criticidadGeneral, setCriticidadGeneral] = useState<'Alta' | 'Media' | 'Baja'>('Media');
    const [fechaGeneral, setFechaGeneral] = useState(new Date().toISOString().split('T')[0]);
    const [listaItems, setListaItems] = useState<ItemFormulario[]>([]);

    const [tempItem, setTempItem] = useState({
        codigoalmacen: '',
        codigo_repuesto: '',
        descripcion: '',
        cantidad: 1,
        status: 'Creado' as any
    });

    const cargarDatos = useCallback(async () => {
        setLoading(true);
        try {
            const { data: repuestos, error: errorRep } = await supabase
                .from('repuestos_utilizados')
                .select('*')
                .order('fecha_cambio', { ascending: false });

            const { data: master, error: errorMaster } = await supabase
                .from('maestroEquipos')
                .select('placaRodaje, codigoEquipo');

            if (errorRep) throw errorRep;
            if (errorMaster) throw errorMaster;

            setRegistrosRaw(repuestos || []);
            setEquiposMaster(master || []);
        } catch (error: any) {
            console.error("Error cargando datos:", error.message);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { cargarDatos() }, [cargarDatos]);

    // ACTUALIZAR STATUS INDIVIDUAL
    const actualizarStatusRepuesto = async (id: string, nuevoStatus: string) => {
        try {
            const { error } = await supabase
                .from('repuestos_utilizados')
                .update({ status: nuevoStatus })
                .eq('id', id);

            if (error) throw error;

            // Actualización optimista
            setRegistrosRaw(prev => prev.map(reg =>
                reg.id === id ? { ...reg, status: nuevoStatus } : reg
            ));
        } catch (error: any) {
            alert("Error al actualizar: " + error.message);
        }
    };

    const procesarDatosParaVista = (): GrupoEquipo[] => {
        const grupos: { [key: string]: GrupoEquipo } = {};

        registrosRaw.forEach(reg => {
            const placaMatch = reg.descripcion.match(/\[(.*?)\]/);
            const placa = placaMatch ? placaMatch[1] : 'S/P';
            const descLimpia = reg.descripcion.replace(/\[.*?\]/, '').trim();

            const item: Repuesto = {
                id: reg.id,
                codigo_almacen: reg.codigoalmacen || 'N/A',
                codigo_fabricante: reg.codigo_repuesto || 'VER DETALLE',
                descripcion: descLimpia,
                status: reg.status || 'Creado',
                criticidad: reg.criticidad || 'Media',
                fecha_pedido: reg.fecha_cambio
            };

            if (ocultarCompletados && item.status === 'Concluido') return;

            if (!grupos[placa]) {
                const infoMaster = equiposMaster.find(m => m.placaRodaje === placa);
                grupos[placa] = {
                    placa,
                    codigo_interno: infoMaster ? infoMaster.codigoEquipo : 'EQUIPO ' + placa,
                    repuestos: []
                };
            }
            grupos[placa].repuestos.push(item);
        });

        return Object.values(grupos).filter(e =>
            e.placa.toLowerCase().includes(busqueda.toLowerCase()) ||
            e.codigo_interno.toLowerCase().includes(busqueda.toLowerCase())
        );
    };

    const agregarItemALista = () => {
        if (!tempItem.descripcion) return;
        const nuevoItem: ItemFormulario = {
            ...tempItem,
            id_temp: Math.random().toString(36).substr(2, 9)
        };
        setListaItems([...listaItems, nuevoItem]);
        setTempItem({ codigoalmacen: '', codigo_repuesto: '', descripcion: '', cantidad: 1, status: 'Creado' });
    };

    const eliminarItemDeLista = (id: string) => {
        setListaItems(listaItems.filter(i => i.id_temp !== id));
    };

    const handleGuardarTodo = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!placaSeleccionada) return alert("Selecciona una placa");
        if (listaItems.length === 0) return alert("Agrega al menos un repuesto");

        try {
            const payloads = listaItems.map(item => ({
                fecha_cambio: fechaGeneral,
                codigo_repuesto: item.codigo_repuesto,
                codigoalmacen: item.codigoalmacen,
                descripcion: `[${placaSeleccionada}] ${item.descripcion}`,
                cantidad: item.cantidad,
                status: item.status,
                criticidad: criticidadGeneral
            }));

            const { error } = await supabase.from('repuestos_utilizados').insert(payloads);
            if (error) throw error;

            setIsModalOpen(false);
            setListaItems([]);
            setPlacaSeleccionada('');
            cargarDatos();
        } catch (error: any) { alert(error.message); }
    };

    const equiposFiltrados = procesarDatosParaVista();

    const toggleTodos = () => {
        const nuevoEstado = !todosAbiertos;
        setTodosAbiertos(nuevoEstado);
        const mapeo: { [key: string]: boolean } = {};
        equiposFiltrados.forEach(e => { mapeo[e.placa] = nuevoEstado; });
        setAbiertosIndividuales(mapeo);
    };

    const toggleIndividual = (placa: string) => {
        setAbiertosIndividuales(prev => ({ ...prev, [placa]: !prev[placa] }));
    };

    return (
        <div className="min-h-screen bg-[#F8FAFC] p-4 md:p-8">
            <div className="max-w-7xl mx-auto">
                {/* Header Section */}
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-10">
                    <div>
                        <div className="flex items-center gap-3 mb-2">
                            <div className="bg-blue-600 p-2 rounded-xl shadow-lg shadow-blue-200">
                                <Package className="text-white" size={28} />
                            </div>
                            <h1 className="text-3xl font-black text-slate-800 tracking-tight">
                                Seguimiento de Repuestos
                            </h1>
                        </div>
                        <p className="text-slate-500 font-medium flex items-center gap-2">
                            <Truck size={16} /> Central de Gestión de Pedidos y Logística
                        </p>
                    </div>

                    <div className="flex flex-wrap gap-3">
                        <button
                            onClick={() => setIsModalOpen(true)}
                            className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-xl font-bold text-sm flex items-center gap-2 transition-all shadow-md active:scale-95"
                        >
                            <Plus size={18} /> NUEVO PEDIDO
                        </button>

                        <button
                            onClick={() => setOcultarCompletados(!ocultarCompletados)}
                            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border-2 transition-all font-bold text-sm ${ocultarCompletados
                                ? 'bg-orange-50 border-orange-200 text-orange-600'
                                : 'bg-white border-slate-200 text-slate-600'
                                }`}
                        >
                            {ocultarCompletados ? <FilterX size={18} /> : <ListFilter size={18} />}
                            {ocultarCompletados ? 'Solo Pendientes' : 'Todos los items'}
                        </button>

                        <div className="relative group">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 transition-colors" size={18} />
                            <input
                                type="text"
                                placeholder="Buscar placa..."
                                className="pl-10 pr-4 py-2.5 border-2 border-slate-200 rounded-xl w-full md:w-64 focus:outline-none focus:border-blue-500 bg-white transition-all font-medium"
                                value={busqueda}
                                onChange={(e) => setBusqueda(e.target.value)}
                            />
                        </div>
                    </div>
                </div>

                {/* Main Content */}
                <div className="space-y-4">
                    <div className="flex justify-between items-center px-2">
                        <span className="text-xs font-black text-slate-400 uppercase tracking-widest">
                            Resultados: {equiposFiltrados.length} equipos
                        </span>
                        <button onClick={toggleTodos} className="text-xs font-bold text-blue-600 hover:underline">
                            {todosAbiertos ? 'Contraer todo' : 'Expandir todo'}
                        </button>
                    </div>

                    {loading ? (
                        <div className="flex flex-col items-center justify-center py-24 bg-white rounded-3xl border border-slate-100 shadow-sm">
                            <RefreshCw className="animate-spin text-blue-600 mb-4" size={48} />
                            <p className="text-slate-400 font-bold animate-pulse">Sincronizando con almacén...</p>
                        </div>
                    ) : equiposFiltrados.length > 0 ? (
                        equiposFiltrados.map((equipo) => (
                            <AcordeonEquipo
                                key={equipo.placa}
                                equipo={equipo}
                                isOpen={!!abiertosIndividuales[equipo.placa]}
                                onToggle={() => toggleIndividual(equipo.placa)}
                                onUpdateStatus={actualizarStatusRepuesto}
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

            {/* Modal Formulario */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-md p-4">
                    <div className="bg-white w-full max-w-2xl rounded-[2rem] shadow-2xl overflow-hidden flex flex-col max-h-[90vh] border border-white/20">
                        <div className="p-6 bg-slate-50/50 border-b border-slate-100 flex justify-between items-center">
                            <div>
                                <h2 className="text-xl font-black text-slate-800">REGISTRAR REQUERIMIENTO</h2>
                                <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">Múltiples repuestos por equipo</p>
                            </div>
                            <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-white rounded-full transition-colors text-slate-400 shadow-sm"><X /></button>
                        </div>

                        <div className="p-6 overflow-y-auto space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-blue-50/50 p-5 rounded-2xl border border-blue-100">
                                <div className="space-y-1">
                                    <label className="text-[10px] font-black uppercase text-blue-600">Unidad / Placa</label>
                                    <input
                                        list="listaEquipos"
                                        className="w-full p-2.5 rounded-xl border-2 border-white font-bold text-sm focus:border-blue-400 outline-none shadow-sm"
                                        value={placaSeleccionada}
                                        onChange={(e) => setPlacaSeleccionada(e.target.value.toUpperCase())}
                                        placeholder="Ej: ABC-123"
                                    />
                                    <datalist id="listaEquipos">
                                        {equiposMaster.map((eq) => (
                                            <option key={eq.placaRodaje} value={eq.placaRodaje}>{eq.codigoEquipo}</option>
                                        ))}
                                    </datalist>
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[10px] font-black uppercase text-blue-600">Prioridad</label>
                                    <select
                                        className="w-full p-2.5 rounded-xl border-2 border-white font-bold text-sm shadow-sm outline-none"
                                        value={criticidadGeneral}
                                        onChange={(e) => setCriticidadGeneral(e.target.value as any)}
                                    >
                                        <option value="Baja">🟢 Baja</option>
                                        <option value="Media">🟡 Media</option>
                                        <option value="Alta">🔴 Alta</option>
                                    </select>
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[10px] font-black uppercase text-blue-600">Fecha Pedido</label>
                                    <input
                                        type="date"
                                        className="w-full p-2.5 rounded-xl border-2 border-white font-bold text-sm shadow-sm outline-none"
                                        value={fechaGeneral}
                                        onChange={(e) => setFechaGeneral(e.target.value)}
                                    />
                                </div>
                            </div>

                            <div className="space-y-3 p-5 bg-white border-2 border-dashed border-slate-200 rounded-3xl">
                                <h3 className="text-xs font-black text-slate-800 flex items-center gap-2">
                                    <Plus size={14} className="text-blue-500" /> AGREGAR ARTÍCULO
                                </h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                    <input
                                        placeholder="Descripción detallada del repuesto..."
                                        className="md:col-span-2 p-3 bg-slate-50 rounded-xl text-sm font-semibold border-transparent border focus:border-blue-200 outline-none transition-all"
                                        value={tempItem.descripcion}
                                        onChange={(e) => setTempItem({ ...tempItem, descripcion: e.target.value })}
                                    />
                                    <input placeholder="Cód. Almacén (Opcional)" className="p-3 bg-slate-50 rounded-xl text-sm font-mono" value={tempItem.codigoalmacen} onChange={(e) => setTempItem({ ...tempItem, codigoalmacen: e.target.value.toUpperCase() })} />
                                    <input placeholder="Referencia / Parte" className="p-3 bg-slate-50 rounded-xl text-sm font-mono" value={tempItem.codigo_repuesto} onChange={(e) => setTempItem({ ...tempItem, codigo_repuesto: e.target.value.toUpperCase() })} />
                                    <div className="flex gap-2 md:col-span-2">
                                        <div className="flex items-center bg-slate-100 rounded-xl px-2">
                                            <span className="text-[10px] font-black px-2">CANT:</span>
                                            <input type="number" className="w-16 p-3 bg-transparent text-sm font-black" value={tempItem.cantidad} onChange={(e) => setTempItem({ ...tempItem, cantidad: parseInt(e.target.value) })} />
                                        </div>
                                        <select className="flex-1 p-3 bg-slate-50 rounded-xl text-sm font-bold" value={tempItem.status} onChange={(e) => setTempItem({ ...tempItem, status: e.target.value as any })}>
                                            <option value="Creado">Creado</option>
                                            <option value="Enviado">Enviado por correo</option>
                                            <option value="Pedido">Pedido (En camino)</option>
                                            <option value="Concluido">Recibido</option>
                                        </select>
                                        <button onClick={agregarItemALista} className="bg-blue-600 text-white px-5 rounded-xl hover:bg-blue-700 transition-colors shadow-lg shadow-blue-100 active:scale-90">
                                            <Plus size={20} />
                                        </button>
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-400 uppercase ml-2">Items en lista ({listaItems.length})</label>
                                {listaItems.length === 0 && <p className="text-center py-4 text-slate-300 italic text-sm">No hay repuestos agregados aún</p>}
                                <div className="space-y-2">
                                    {listaItems.map((item) => (
                                        <div key={item.id_temp} className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100 group">
                                            <div className="flex-1">
                                                <div className="flex items-center gap-2">
                                                    <span className="w-6 h-6 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-[10px] font-black">{item.cantidad}</span>
                                                    <p className="text-sm font-bold text-slate-700">{item.descripcion}</p>
                                                </div>
                                                <p className="text-[10px] text-slate-400 font-mono mt-1 ml-8">
                                                    {item.codigoalmacen || 'SIN CÓD.'} • REF: {item.codigo_repuesto || 'N/A'}
                                                </p>
                                            </div>
                                            <button onClick={() => eliminarItemDeLista(item.id_temp)} className="text-slate-300 hover:text-red-500 p-2 transition-colors"><Trash2 size={18} /></button>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>

                        <div className="p-6 bg-slate-50/50 border-t border-slate-100">
                            <button onClick={handleGuardarTodo} className="w-full bg-[#1E293B] hover:bg-green-600 text-white py-4 rounded-2xl font-black uppercase text-xs tracking-widest transition-all shadow-xl flex items-center justify-center gap-3 active:scale-[0.98]">
                                <Save size={18} /> CONFIRMAR Y GUARDAR PEDIDO
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

// Componente Acordeon
function AcordeonEquipo({ equipo, isOpen, onToggle, onUpdateStatus }: { equipo: GrupoEquipo, isOpen: boolean, onToggle: () => void, onUpdateStatus: (id: string, status: any) => void }) {
    const calcularDiasTotales = () => {
        const fechas = equipo.repuestos.map(r => new Date(r.fecha_pedido).getTime());
        if (fechas.length === 0) return 0;
        const fechaMasAntigua = Math.min(...fechas);
        const hoy = new Date().getTime();
        return Math.floor((hoy - fechaMasAntigua) / (1000 * 60 * 60 * 24));
    };

    const totalItems = equipo.repuestos.length;
    const itemsConcluidos = equipo.repuestos.filter(r => r.status === 'Concluido').length;
    const dias = calcularDiasTotales();

    const resumen = itemsConcluidos === totalItems && totalItems > 0
        ? { etiqueta: 'Completado', color: 'text-green-600 bg-green-50 border-green-100' }
        : { etiqueta: `${itemsConcluidos}/${totalItems} Recibidos`, color: 'text-blue-600 bg-blue-50 border-blue-100' };

    const getProgressWidth = (status: string) => {
        switch (status) {
            case 'Creado': return '25%';
            case 'Enviado': return '50%';
            case 'Pedido': return '75%';
            case 'Concluido': return '100%';
            default: return '0%';
        }
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'Creado': return 'bg-slate-300';
            case 'Enviado': return 'bg-orange-400';
            case 'Pedido': return 'bg-blue-500';
            case 'Concluido': return 'bg-green-500';
            default: return 'bg-slate-200';
        }
    }

    return (
        <div className="bg-white rounded-[1.5rem] shadow-sm border border-slate-200/60 overflow-hidden transition-all duration-300">
            <button
                onClick={onToggle}
                className={`w-full flex flex-col md:flex-row md:items-center justify-between p-5 hover:bg-slate-50 transition-colors text-left gap-4 ${isOpen ? 'bg-slate-50/80' : ''}`}
            >
                <div className="flex flex-wrap items-center gap-4 md:gap-8">
                    <div className="bg-slate-900 text-white font-black px-4 py-2 rounded-xl text-lg tracking-tighter shadow-sm">
                        {equipo.placa}
                    </div>
                    <div>
                        <p className="text-[9px] text-slate-400 uppercase font-black tracking-widest">Código Equipo</p>
                        <p className="text-slate-700 font-black text-sm">{equipo.codigo_interno}</p>
                    </div>
                    <div>
                        <p className="text-[9px] text-slate-400 uppercase font-black tracking-widest">Tiempo de Espera</p>
                        <div className={`flex items-center gap-1.5 font-bold text-sm ${dias > 15 ? 'text-red-500' : 'text-slate-600'}`}>
                            <Clock size={14} /> <span>{dias} días</span>
                        </div>
                    </div>
                    <div>
                        <p className="text-[9px] text-slate-400 uppercase font-black tracking-widest">Progreso</p>
                        <span className={`text-[10px] font-black px-3 py-1 rounded-full border ${resumen.color} uppercase`}>
                            {resumen.etiqueta}
                        </span>
                    </div>
                </div>
                <div className={`p-2 rounded-full transition-all ${isOpen ? 'bg-blue-100 text-blue-600 rotate-180' : 'bg-slate-100 text-slate-400'}`}>
                    <ChevronDown size={20} />
                </div>
            </button>

            {isOpen && (
                <div className="p-6 border-t border-slate-100 bg-white animate-in slide-in-from-top duration-300">
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="text-slate-400 text-[10px] uppercase tracking-[0.15em] border-b border-slate-100">
                                    <th className="pb-4 pl-2 font-black text-left">Logística</th>
                                    <th className="pb-4 font-black text-left">Repuesto</th>
                                    <th className="pb-4 font-black text-center">Prioridad</th>
                                    <th className="pb-4 font-black text-left">Estado del Pedido</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50">
                                {equipo.repuestos.map((r) => (
                                    <tr key={r.id} className="group hover:bg-slate-50/50 transition-colors">
                                        <td className="py-4 pl-2">
                                            <div className="font-mono text-[11px] font-bold text-blue-600">{r.codigo_almacen}</div>
                                            <div className="font-mono text-[10px] text-slate-400 mt-1">{r.codigo_fabricante}</div>
                                        </td>
                                        <td className="py-4">
                                            <div className="font-bold text-slate-700 capitalize">{r.descripcion}</div>
                                            <div className="text-[10px] text-slate-400 flex items-center gap-1 mt-1 font-medium">
                                                <Clock size={10} /> Pedido el {new Date(r.fecha_pedido).toLocaleDateString()}
                                            </div>
                                        </td>
                                        <td className="py-4 text-center">
                                            <span className={`px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-wider ${r.criticidad === 'Alta' ? 'bg-red-50 text-red-600 border border-red-100' :
                                                r.criticidad === 'Media' ? 'bg-amber-50 text-amber-600 border border-amber-100' :
                                                    'bg-slate-50 text-slate-500 border border-slate-100'
                                                }`}>
                                                {r.criticidad}
                                            </span>
                                        </td>
                                        <td className="py-4 pr-2">
                                            <div className="w-56">
                                                <div className="flex justify-between items-center mb-1.5">
                                                    <select
                                                        value={r.status}
                                                        onChange={(e) => onUpdateStatus(r.id, e.target.value)}
                                                        className={`text-[9px] font-black uppercase tracking-tighter bg-transparent border-none focus:ring-0 cursor-pointer ${r.status === 'Concluido' ? 'text-green-600' : 'text-slate-500'
                                                            }`}
                                                    >
                                                        <option value="Creado">Creado</option>
                                                        <option value="Enviado">Enviado por correo</option>
                                                        <option value="Pedido">Pedido (En camino)</option>
                                                        <option value="Concluido">✓ Recibido</option>
                                                    </select>
                                                    {r.status === 'Concluido' && <CheckCircle2 size={12} className="text-green-500" />}
                                                </div>
                                                <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden shadow-inner">
                                                    <div
                                                        style={{ width: getProgressWidth(r.status) }}
                                                        className={`h-full transition-all duration-700 ease-out shadow-sm ${getStatusColor(r.status)}`}
                                                    />
                                                </div>
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