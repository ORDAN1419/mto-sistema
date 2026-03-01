"use client"
import { useEffect, useState, useMemo, useRef, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import {
    Package, Search, Plus, Trash2, Edit3, X, Save,
    Image as ImageIcon, Loader2, ChevronDown, ChevronUp, Tag, Folder, Database, Info, Layers, Filter, Truck, Maximize2, RefreshCw
} from 'lucide-react'

// --- INTERFAZ FIEL A TU SQL ---
interface Repuesto {
    id: string;
    clase_vehiculo: string | null;
    modelo: string | null;
    marca: string | null;
    year_fabricacion: string | null;
    codigo_almacen: string | null;
    numero_parte: string | null;
    descripcion_repuesto: string | null;
    info_tecnica: string | null;
    urls_fotos: string[];
    sistema: string | null;
    created_at?: string;
}

interface MaestroEquipo {
    codigoEquipo: string | null;
    placaRodaje: string;
    marca: string | null;
    modelo: string | null;
    year: string | null;
    categoria: string | null;
}

export default function RepuestosPage() {
    const router = useRouter()
    const inputBusquedaPrincipalRef = useRef<HTMLInputElement>(null)

    const [items, setItems] = useState<Repuesto[]>([])
    const [loading, setLoading] = useState(true)
    const [isOnline, setIsOnline] = useState(false)
    const [showModal, setShowModal] = useState(false)
    const [subiendo, setSubiendo] = useState(false)
    const [busqueda, setBusqueda] = useState('')
    const [filtroSistema, setFiltroSistema] = useState<string | null>(null)
    const [expandedId, setExpandedId] = useState<string | null>(null)
    const [openNodes, setOpenNodes] = useState<string[]>([]);
    const [editId, setEditId] = useState<string | null>(null)
    const [zoomImg, setZoomImg] = useState<string | null>(null)
    const [busquedaEquipo, setBusquedaEquipo] = useState('')
    const [sugerenciasEquipo, setSugerenciasEquipo] = useState<MaestroEquipo[]>([])
    const [buscandoEquipo, setBuscandoEquipo] = useState(false)

    const [form, setForm] = useState({
        clase_vehiculo: '',
        modelo: '',
        marca: '',
        year_fabricacion: '',
        codigo_almacen: '',
        numero_parte: '',
        descripcion_repuesto: '',
        info_tecnica: '',
        sistema: 'GENERAL'
    })

    const [files, setFiles] = useState<File[]>([])
    const [existingPhotos, setExistingPhotos] = useState<string[]>([])

    // ✅ NUEVO: LÓGICA DE ATAJOS DE TECLADO
    useEffect(() => {
        const manejarAtajos = (e: KeyboardEvent) => {
            // Rutas CTRL
            if (e.ctrlKey && e.key === '0') { e.preventDefault(); router.push('/equipos'); }
            if (e.ctrlKey && e.key === '1') { e.preventDefault(); router.push('/historial-horometro'); }

            // Acciones ALT
            if (e.altKey && e.key.toLowerCase() === 's') {
                e.preventDefault();
                inputBusquedaPrincipalRef.current?.focus();
            }
            if (e.altKey && e.key.toLowerCase() === 'x') {
                e.preventDefault();
                setBusqueda('');
                setFiltroSistema(null);
            }
        };
        window.addEventListener('keydown', manejarAtajos);
        return () => window.removeEventListener('keydown', manejarAtajos);
    }, [router]);

    useEffect(() => {
        checkConnection();
        fetchRepuestos();
    }, [])

    useEffect(() => {
        const delayDebounceFn = setTimeout(() => {
            if (busquedaEquipo.length > 1) {
                buscarEquipos(busquedaEquipo)
            } else {
                setSugerenciasEquipo([])
            }
        }, 300)
        return () => clearTimeout(delayDebounceFn)
    }, [busquedaEquipo])

    async function buscarEquipos(termino: string) {
        setBuscandoEquipo(true)
        try {
            const { data, error } = await supabase
                .from('maestroEquipos')
                .select('placaRodaje, codigoEquipo, marca, modelo, year, categoria')
                .or(`placaRodaje.ilike.%${termino}%,codigoEquipo.ilike.%${termino}%`)
                .limit(5)
            if (error) throw error
            setSugerenciasEquipo(data || [])
        } catch (error) {
            console.error("Error buscando equipo:", error)
        } finally {
            setBuscandoEquipo(false)
        }
    }

    const seleccionarEquipo = (equipo: MaestroEquipo) => {
        setForm({
            ...form,
            clase_vehiculo: equipo.categoria || '',
            marca: equipo.marca || '',
            modelo: equipo.modelo || '',
            year_fabricacion: equipo.year || ''
        })
        setBusquedaEquipo(`${equipo.placaRodaje} - ${equipo.codigoEquipo || ''}`)
        setSugerenciasEquipo([])
    }

    async function checkConnection() {
        try {
            const { error } = await supabase.from('base_repuestos').select('id').limit(1);
            setIsOnline(!error);
        } catch { setIsOnline(false); }
    }

    async function fetchRepuestos() {
        setLoading(true)
        try {
            const { data, error } = await supabase
                .from('base_repuestos')
                .select('*')
                .order('created_at', { ascending: false })
            if (error) throw error
            if (data) setItems(data)
        } catch (error: any) {
            console.error("Error:", error.message)
        } finally {
            setLoading(false)
        }
    }

    const toggleNode = (nodePath: string) => {
        setOpenNodes(prev => prev.includes(nodePath) ? prev.filter(n => n !== nodePath) : [...prev, nodePath]);
    };

    const sistemasUnicos = useMemo(() => Array.from(new Set(items.map(i => i.sistema || 'GENERAL'))), [items]);

    const filtradosYAgrupados = useMemo(() => {
        const terminos = busqueda.toLowerCase().trim().split(/\s+/);
        const coincidencias = items.filter(i => {
            const contenidoFila = `${i.descripcion_repuesto} ${i.codigo_almacen} ${i.marca} ${i.modelo} ${i.sistema}`.toLowerCase();
            const cumpleBusqueda = terminos.every(termino => contenidoFila.includes(termino));
            const cumpleFiltro = filtroSistema ? i.sistema === filtroSistema : true;
            return cumpleBusqueda && cumpleFiltro;
        });

        const tree: any = {};
        coincidencias.forEach(item => {
            const sistema = item.sistema || 'GENERAL';
            const clase = item.clase_vehiculo || 'OTRO';
            const marca = item.marca || 'GENERICO';
            if (!tree[sistema]) tree[sistema] = { _count: 0, clases: {} };
            if (!tree[sistema].clases[clase]) tree[sistema].clases[clase] = { _count: 0, marcas: {} };
            if (!tree[sistema].clases[clase].marcas[marca]) tree[sistema].clases[clase].marcas[marca] = [];
            tree[sistema].clases[clase].marcas[marca].push(item);
            tree[sistema]._count++;
            tree[sistema].clases[clase]._count++;
        });
        return tree;
    }, [items, busqueda, filtroSistema]);

    const resetForm = () => {
        setForm({
            clase_vehiculo: '', modelo: '', marca: '', year_fabricacion: '',
            codigo_almacen: '', numero_parte: '', descripcion_repuesto: '',
            info_tecnica: '', sistema: 'GENERAL'
        })
        setBusquedaEquipo('')
        setFiles([]); setExistingPhotos([]); setEditId(null); setShowModal(false);
    }

    async function handleGuardar() {
        if (!form.descripcion_repuesto || !form.codigo_almacen) {
            alert("Faltan campos obligatorios (Descripción y Código)"); return;
        }
        setSubiendo(true)
        let nuevasUrls: string[] = [...existingPhotos]
        try {
            for (const file of files) {
                const fileExt = file.name.split('.').pop()
                const fileName = `${Math.random()}-${Date.now()}.${fileExt}`
                const { error: uploadError } = await supabase.storage.from('repuestos').upload(fileName, file)
                if (uploadError) throw uploadError
                const { data: { publicUrl } } = supabase.storage.from('repuestos').getPublicUrl(fileName)
                nuevasUrls.push(publicUrl)
            }
            const payload = { ...form, urls_fotos: nuevasUrls }
            if (editId) {
                const { error } = await supabase.from('base_repuestos').update(payload).eq('id', editId)
                if (error) throw error
            } else {
                const { error } = await supabase.from('base_repuestos').insert([payload])
                if (error) throw error
            }
            alert("¡Guardado correctamente!");
            resetForm();
            fetchRepuestos();
        } catch (error: any) {
            alert("Error al guardar: " + error.message)
        } finally {
            setSubiendo(false)
        }
    }

    async function eliminarRepuesto(id: string) {
        if (!confirm("¿Eliminar este repuesto permanentemente?")) return;
        try {
            const { error } = await supabase.from('base_repuestos').delete().eq('id', id);
            if (error) throw error;
            fetchRepuestos();
        } catch (error: any) { alert(error.message); }
    }

    return (
        <main className="min-h-screen bg-[#f7f9fa] text-[#32363a] font-sans">
            {/* --- BARRA SUPERIOR SAP --- */}
            <nav className="bg-[#354a5f] text-white h-12 flex items-center px-4 justify-between shadow-md sticky top-0 z-50">
                <div className="flex items-center gap-4">
                    <div className="bg-[#0070b1] p-1.5 rounded-sm cursor-pointer hover:bg-[#005a8e]" onClick={() => router.push('/equipos')}>
                        <Package size={18} />
                    </div>
                    <div className="flex flex-col leading-none text-left">
                        <span className="font-bold text-xs tracking-tight uppercase">Datos Maestros: Repuestos</span>
                        <span className="text-[10px] opacity-60 font-mono uppercase tracking-tighter">S/4HANA Asset Management</span>
                    </div>
                </div>
                <div className="flex items-center gap-4">
                    <div className={`flex items-center gap-1.5 px-2 py-1 rounded-sm border ${isOnline ? 'border-green-500/30 bg-green-500/10' : 'border-red-500/30 bg-red-500/10'}`}>
                        <div className={`w-2 h-2 rounded-full ${isOnline ? 'bg-green-500' : 'bg-red-500'} animate-pulse`} />
                        <span className="text-[9px] font-bold uppercase">{isOnline ? 'En Línea' : 'Sin Conexión'}</span>
                    </div>
                    <button onClick={() => setShowModal(true)} className="bg-[#0070b1] hover:bg-[#005a8e] px-4 py-1.5 rounded-sm text-xs font-bold uppercase transition-all shadow-sm flex items-center gap-2">
                        <Plus size={14} /> Nueva Entrada
                    </button>
                </div>
            </nav>

            <div className="max-w-[1400px] mx-auto p-4 md:p-6 space-y-4">
                {/* --- BARRA DE BÚSQUEDA Y FILTROS --- */}
                <div className="bg-white border border-[#d3d7d9] p-4 shadow-sm space-y-4">
                    <div className="flex flex-col md:flex-row gap-4 items-center">
                        <div className="relative flex-1 group w-full">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[#6a6d70]" size={16} />
                            <input
                                ref={inputBusquedaPrincipalRef}
                                type="text" value={busqueda}
                                onChange={(e) => setBusqueda(e.target.value)}
                                placeholder="Buscar por descripción, código de almacén, marca... [Alt+S]"
                                className="w-full pl-10 pr-4 py-2 border border-[#b0b3b5] hover:border-[#0070b1] focus:border-[#0070b1] rounded-sm text-sm outline-none transition-all"
                            />
                        </div>
                        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar w-full md:w-auto">
                            <Filter size={14} className="text-[#6a6d70]" />
                            <button
                                onClick={() => setFiltroSistema(null)}
                                className={`px-4 py-1.5 rounded-sm text-[10px] font-bold uppercase border transition-all whitespace-nowrap ${!filtroSistema ? 'bg-[#eff4f9] border-[#0070b1] text-[#0070b1]' : 'border-[#d3d7d9] text-[#6a6d70] hover:bg-slate-50'}`}
                            >
                                Todos los Sistemas [Alt+X]
                            </button>
                            {sistemasUnicos.map(s => (
                                <button
                                    key={s}
                                    onClick={() => setFiltroSistema(s)}
                                    className={`px-4 py-1.5 rounded-sm text-[10px] font-bold uppercase border transition-all whitespace-nowrap ${filtroSistema === s ? 'bg-[#eff4f9] border-[#0070b1] text-[#0070b1]' : 'border-[#d3d7d9] text-[#6a6d70] hover:bg-slate-50'}`}
                                >
                                    {s}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                {/* --- LISTADO JERÁRQUICO --- */}
                <div className="space-y-2">
                    {loading ? (
                        <div className="bg-white border border-[#d3d7d9] py-20 flex flex-col items-center justify-center gap-4 text-left leading-none">
                            <RefreshCw className="animate-spin text-[#0070b1]" size={32} />
                            <p className="text-[10px] font-bold text-[#6a6d70] uppercase tracking-widest leading-none">Sincronizando Base de Datos...</p>
                        </div>
                    ) : (
                        Object.entries(filtradosYAgrupados).map(([sistema, data]: [string, any]) => (
                            <div key={sistema} className="border border-[#d3d7d9] bg-white overflow-hidden shadow-sm">
                                <button onClick={() => toggleNode(sistema)} className="w-full flex items-center gap-3 p-3 bg-[#f2f4f5] border-b border-[#d3d7d9] hover:bg-[#ebeef0] transition-colors leading-none">
                                    <Layers size={14} className="text-[#6a6d70]" />
                                    <span className="font-bold uppercase text-[11px] text-[#32363a] leading-none">SISTEMA: {sistema}</span>
                                    <span className="bg-[#d3d7d9] text-[#6a6d70] text-[9px] px-1.5 py-0.5 rounded-sm font-bold ml-2 leading-none">{data._count} ÍTEMS</span>
                                    {openNodes.includes(sistema) ? <ChevronUp className="ml-auto" size={16} /> : <ChevronDown className="ml-auto" size={16} />}
                                </button>

                                {openNodes.includes(sistema) && (
                                    <div className="p-2 space-y-2 text-left leading-none">
                                        {Object.entries(data.clases).map(([clase, claseData]: [string, any]) => (
                                            <div key={clase} className="ml-2 border-l border-[#d3d7d9] text-left leading-none">
                                                <button onClick={() => toggleNode(`${sistema}-${clase}`)} className="w-full flex items-center gap-3 p-2 hover:bg-[#eff4f9] group transition-colors leading-none text-left">
                                                    <Folder className="text-[#0070b1] opacity-50" size={14} />
                                                    <span className="font-bold text-[#6a6d70] text-[10px] uppercase leading-none">CLASE: {clase}</span>
                                                    <span className="text-[9px] text-[#b0b3b5] font-bold leading-none">({claseData._count})</span>
                                                    {openNodes.includes(`${sistema}-${clase}`) ? <ChevronUp className="ml-auto opacity-30" size={14} /> : <ChevronDown className="ml-auto opacity-30" size={14} />}
                                                </button>

                                                {openNodes.includes(`${sistema}-${clase}`) && (
                                                    <div className="ml-6 py-2 space-y-4 text-left leading-none">
                                                        {Object.entries(claseData.marcas).map(([marca, repuestos]: [string, any]) => (
                                                            <div key={marca} className="space-y-1 text-left leading-none">
                                                                <div className="flex items-center gap-2 px-2 border-b border-[#f2f4f5] pb-1 text-left leading-none">
                                                                    <Tag size={10} className="text-[#b0b3b5]" />
                                                                    <span className="text-[9px] font-black text-[#b0b3b5] uppercase leading-none">{marca}</span>
                                                                </div>
                                                                <div className="grid grid-cols-1 gap-2 p-1 text-left leading-none">
                                                                    {repuestos.map((item: Repuesto) => (
                                                                        <div key={item.id} className="bg-white border border-[#ebeef0] hover:border-[#0070b1] transition-all text-left leading-none shadow-sm">
                                                                            <div onClick={() => setExpandedId(expandedId === item.id ? null : item.id)} className="p-3 cursor-pointer flex items-center justify-between text-left leading-none">
                                                                                <div className="flex items-center gap-4 text-left leading-none">
                                                                                    <div className="bg-[#f2f4f5] text-[#32363a] text-[10px] font-mono font-bold px-2 py-0.5 border border-[#d3d7d9] leading-none">
                                                                                        {item.codigo_almacen}
                                                                                    </div>
                                                                                    <h3 className="font-bold text-[#32363a] uppercase text-[11px] leading-none tracking-tight text-left">{item.descripcion_repuesto}</h3>
                                                                                </div>
                                                                                {expandedId === item.id ? <ChevronUp size={16} className="text-[#b0b3b5]" /> : <ChevronDown size={16} className="text-[#b0b3b5]" />}
                                                                            </div>

                                                                            {expandedId === item.id && (
                                                                                <div className="px-3 pb-3 pt-2 border-t border-[#f2f4f5] bg-[#f7f9fa] text-left leading-none">
                                                                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-left leading-none">
                                                                                        <div className="flex gap-2 overflow-x-auto pb-1 text-left leading-none">
                                                                                            {item.urls_fotos?.length > 0 ? item.urls_fotos.map((url, idx) => (
                                                                                                <div key={idx} className="relative group shrink-0 leading-none">
                                                                                                    <img src={url} onClick={() => setZoomImg(url)} className="h-32 w-32 object-cover border border-[#d3d7d9] rounded-sm cursor-zoom-in hover:brightness-90 transition-all shadow-sm" />
                                                                                                    <Maximize2 size={12} className="absolute bottom-1 right-1 text-white opacity-0 group-hover:opacity-100 pointer-events-none" />
                                                                                                </div>
                                                                                            )) : <div className="h-32 w-32 bg-white border border-[#d3d7d9] flex items-center justify-center text-[#d3d7d9] leading-none"><ImageIcon size={24} /></div>}
                                                                                        </div>
                                                                                        <div className="space-y-3 text-left leading-none">
                                                                                            <div className="grid grid-cols-2 gap-1.5 text-left leading-none">
                                                                                                <SapDataField label="NÚMERO DE PARTE" value={item.numero_parte || 'N/A'} />
                                                                                                <SapDataField label="MODELO" value={item.modelo || 'N/A'} />
                                                                                                <SapDataField label="AÑO FABRICACIÓN" value={item.year_fabricacion || 'N/A'} />
                                                                                                <SapDataField label="CATEGORÍA" value={item.clase_vehiculo || 'N/A'} />
                                                                                            </div>
                                                                                            {item.info_tecnica && (
                                                                                                <div className="bg-[#354a5f] p-2 border-l-2 border-[#0070b1] text-white text-[9px] leading-tight text-left">
                                                                                                    <div className="flex items-center gap-1.5 mb-1 text-[#34ebff] font-bold uppercase leading-none">
                                                                                                        <Info size={10} /> Documentación Técnica
                                                                                                    </div>
                                                                                                    {item.info_tecnica}
                                                                                                </div>
                                                                                            )}
                                                                                            <div className="flex gap-2 pt-1 border-t border-[#d3d7d9] leading-none">
                                                                                                <button onClick={() => {
                                                                                                    setEditId(item.id);
                                                                                                    setForm({ ...item, sistema: item.sistema || 'GENERAL', clase_vehiculo: item.clase_vehiculo || '', marca: item.marca || '', modelo: item.modelo || '', year_fabricacion: item.year_fabricacion || '', codigo_almacen: item.codigo_almacen || '', numero_parte: item.numero_parte || '', descripcion_repuesto: item.descripcion_repuesto || '', info_tecnica: item.info_tecnica || '' });
                                                                                                    setExistingPhotos(item.urls_fotos || []);
                                                                                                    setShowModal(true);
                                                                                                }} className="flex-1 py-1.5 border border-[#b0b3b5] hover:bg-[#eff4f9] hover:text-[#0070b1] hover:border-[#0070b1] rounded-sm font-bold text-[9px] uppercase flex items-center justify-center gap-2 transition-all leading-none"><Edit3 size={12} /> Editar</button>
                                                                                                <button onClick={() => eliminarRepuesto(item.id)} className="flex-1 py-1.5 border border-rose-200 text-rose-600 hover:bg-rose-50 rounded-sm font-bold text-[9px] uppercase flex items-center justify-center gap-2 transition-all leading-none"><Trash2 size={12} /> Eliminar</button>
                                                                                            </div>
                                                                                        </div>
                                                                                    </div>
                                                                                </div>
                                                                            )}
                                                                        </div>
                                                                    ))}
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        ))
                    )}
                </div>
            </div>

            {/* ✅ ZOOM DE IMAGEN */}
            {zoomImg && (
                <div className="fixed inset-0 z-[100] bg-[#354a5f]/95 backdrop-blur-sm flex items-center justify-center p-4 leading-none" onClick={() => setZoomImg(null)}>
                    <button className="absolute top-5 right-5 text-white hover:bg-white/10 p-2 rounded-full transition-all leading-none"><X size={32} /></button>
                    <img src={zoomImg} className="max-w-full max-h-[90vh] object-contain border-4 border-white shadow-2xl rounded-sm leading-none" onClick={(e) => e.stopPropagation()} />
                </div>
            )}

            {/* --- MODAL DE FORMULARIO --- */}
            {showModal && (
                <div className="fixed inset-0 z-[60] bg-[#354a5f]/60 backdrop-blur-sm flex items-center justify-center p-4 leading-none">
                    <div className="bg-white w-full max-w-3xl rounded-sm shadow-2xl overflow-hidden flex flex-col max-h-[95vh] border border-[#d3d7d9] leading-none">
                        <div className="px-6 py-3 border-b bg-[#f2f4f5] flex justify-between items-center text-left leading-none">
                            <div className="flex items-center gap-2 leading-none text-left">
                                <Database size={16} className="text-[#0070b1]" />
                                <h2 className="text-sm font-black text-[#32363a] uppercase tracking-wider leading-none text-left">{editId ? 'Mantenimiento: Editar Repuesto' : 'Almacén: Registro Nuevo'}</h2>
                            </div>
                            <button onClick={resetForm} className="text-[#6a6d70] hover:text-[#32363a] leading-none"><X size={20} /></button>
                        </div>

                        <div className="p-6 overflow-y-auto space-y-6 bg-white text-left leading-none">
                            <div className="bg-[#eff4f9] p-4 border border-[#b0ccf0] relative text-left leading-none">
                                <label className="text-[10px] font-black text-[#0070b1] uppercase block mb-2 flex items-center gap-2 text-left leading-none">
                                    <Truck size={12} /> Referencia del Equipo (Placa/Código)
                                </label>
                                <div className="relative leading-none">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[#b0b3b5]" size={16} />
                                    <input
                                        type="text" value={busquedaEquipo}
                                        onChange={(e) => setBusquedaEquipo(e.target.value)}
                                        className="w-full pl-10 pr-4 py-2 border border-[#b0b3b5] focus:border-[#0070b1] text-sm outline-none bg-white uppercase font-bold text-left leading-none"
                                        placeholder="Escriba Placa o ID de Equipo..."
                                    />
                                    {buscandoEquipo && <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 animate-spin text-[#0070b1]" size={16} />}
                                </div>
                                {sugerenciasEquipo.length > 0 && (
                                    <div className="absolute left-0 right-0 mt-1 bg-white border border-[#b0b3b5] shadow-xl z-50 max-h-48 overflow-y-auto text-left leading-none">
                                        {sugerenciasEquipo.map((equipo) => (
                                            <button key={equipo.placaRodaje} onClick={() => seleccionarEquipo(equipo)} className="w-full p-2 text-left hover:bg-[#eff4f9] border-b border-[#f2f4f5] text-[10px] flex flex-col leading-none">
                                                <span className="font-bold text-[#32363a] text-left leading-none">{equipo.placaRodaje} — {equipo.codigoEquipo}</span>
                                                <span className="text-[#6a6d70] uppercase opacity-70 text-left leading-none mt-1">{equipo.marca} {equipo.modelo}</span>
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4 text-left leading-none">
                                <SapInputField label="Descripción del Repuesto *" value={form.descripcion_repuesto || ''} onChange={v => setForm({ ...form, descripcion_repuesto: v })} placeholder="Nombre técnico..." />
                                <SapInputField label="Código de Almacén *" value={form.codigo_almacen || ''} onChange={v => setForm({ ...form, codigo_almacen: v })} placeholder="Código de ubicación (Estante)" mono />
                                <SapInputField label="Categoría de Sistema" value={form.sistema || ''} onChange={v => setForm({ ...form, sistema: v })} placeholder="Ej: MOTOR, FRENOS" />
                                <SapInputField label="Clase de Vehículo" value={form.clase_vehiculo || ''} onChange={v => setForm({ ...form, clase_vehiculo: v })} placeholder="Ej: VOLQUETE, CAMIONETA" />
                                <SapInputField label="Marca" value={form.marca || ''} onChange={v => setForm({ ...form, marca: v })} placeholder="Fabricante OEM" />
                                <SapInputField label="Modelo" value={form.modelo || ''} onChange={v => setForm({ ...form, modelo: v })} placeholder="Modelo específico" />
                                <SapInputField label="Año" value={form.year_fabricacion || ''} onChange={v => setForm({ ...form, year_fabricacion: v })} placeholder="Año de fabricación" />
                                <SapInputField label="Número de Parte" value={form.numero_parte || ''} onChange={v => setForm({ ...form, numero_parte: v })} placeholder="Serial del fabricante" mono />
                            </div>

                            <div className="space-y-2 text-left leading-none">
                                <label className="text-[10px] font-bold text-[#6a6d70] uppercase text-left leading-none">Especificaciones Técnicas</label>
                                <textarea
                                    value={form.info_tecnica || ''}
                                    onChange={e => setForm({ ...form, info_tecnica: e.target.value })}
                                    className="w-full p-3 border border-[#b0b3b5] hover:border-[#0070b1] focus:border-[#0070b1] outline-none text-xs bg-[#fdfdfd] text-left leading-none"
                                    rows={3}
                                />
                            </div>

                            <div className="space-y-2 text-left leading-none">
                                <label className="text-[10px] font-bold text-[#6a6d70] uppercase block text-left leading-none">Galería de Imágenes</label>
                                <div className="grid grid-cols-4 md:grid-cols-8 gap-2 text-left leading-none">
                                    {existingPhotos.map((url, i) => (
                                        <div key={i} className="relative aspect-square border border-[#d3d7d9] group leading-none">
                                            <img src={url} className="w-full h-full object-cover leading-none" />
                                            <button onClick={() => setExistingPhotos(prev => prev.filter((_, idx) => idx !== i))} className="absolute top-0 right-0 bg-[#bb0000] text-white p-0.5 opacity-0 group-hover:opacity-100 leading-none"><X size={10} /></button>
                                        </div>
                                    ))}
                                    <label className="aspect-square bg-[#f2f4f5] border-2 border-dashed border-[#b0b3b5] flex flex-col items-center justify-center text-[#6a6d70] cursor-pointer hover:bg-[#eff4f9] hover:border-[#0070b1] transition-all leading-none">
                                        <Plus size={20} />
                                        <input type="file" multiple className="hidden" onChange={e => e.target.files && setFiles(prev => [...prev, ...Array.from(e.target.files!)])} />
                                    </label>
                                </div>
                            </div>
                        </div>

                        <div className="p-4 bg-[#f2f4f5] border-t flex justify-end gap-2 text-left leading-none">
                            <button onClick={resetForm} className="px-6 py-1.5 border border-[#b0b3b5] bg-white rounded-sm font-bold text-[11px] uppercase hover:bg-slate-50 transition-all leading-none">Cancelar</button>
                            <button onClick={handleGuardar} disabled={subiendo} className="px-8 py-1.5 bg-[#0070b1] hover:bg-[#005a8e] text-white rounded-sm font-bold text-[11px] uppercase transition-all shadow-md flex items-center gap-2 disabled:opacity-50 leading-none">
                                {subiendo ? <Loader2 className="animate-spin" size={14} /> : <Save size={14} />}
                                {editId ? 'Ejecutar Actualización' : 'Contabilizar en Base de Datos'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </main>
    )
}

// --- COMPONENTE DE CAMPOS DE DATOS SAP ---
function SapDataField({ label, value }: { label: string, value: string }) {
    return (
        <div className="bg-white p-1.5 border border-[#d3d7d9] flex flex-col text-left leading-none">
            <span className="text-[7px] font-black text-[#b0b3b5] uppercase leading-none mb-1 tracking-tighter text-left">CAMPO: {label}</span>
            <span className="text-[10px] font-bold text-[#32363a] uppercase truncate leading-none text-left">{value || '---'}</span>
        </div>
    )
}

function SapInputField({ label, value, onChange, placeholder, mono = false }: { label: string, value: string, onChange: (v: string) => void, placeholder: string, mono?: boolean }) {
    return (
        <div className="flex flex-col gap-1 text-left leading-none">
            <label className="text-[10px] font-bold text-[#6a6d70] uppercase ml-0.5 tracking-tight leading-none text-left">{label}</label>
            <input
                type="text"
                placeholder={placeholder}
                value={value}
                onChange={e => onChange(e.target.value.toUpperCase())}
                className={`p-2 border border-[#b0b3b5] hover:border-[#0070b1] focus:border-[#0070b1] text-xs transition-all outline-none bg-white uppercase font-medium text-left leading-none ${mono ? 'font-mono' : ''}`}
            />
        </div>
    )
}