"use client"
import { useEffect, useState, useMemo } from 'react'
import { supabase } from '@/lib/supabase'
import {
    Package, Search, Plus, Trash2, Edit3, X, Save,
    Image as ImageIcon, Loader2, ChevronDown, ChevronUp, Tag, Folder, Database, Info, Layers, Filter, Truck
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

// Interfaz para la tabla maestroEquipos
interface MaestroEquipo {
    codigoEquipo: string | null;
    placaRodaje: string;
    marca: string | null;
    modelo: string | null;
    year: string | null;
    categoria: string | null;
}

export default function RepuestosPage() {
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

    // --- ESTADOS PARA BÚSQUEDA DE EQUIPO ---
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

    useEffect(() => {
        checkConnection();
        fetchRepuestos();
    }, [])

    // Lógica para buscar equipos en tiempo real
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
                const { error: uploadError } = await supabase.storage
                    .from('repuestos')
                    .upload(fileName, file)

                if (uploadError) throw uploadError

                const { data: { publicUrl } } = supabase.storage
                    .from('repuestos')
                    .getPublicUrl(fileName)

                nuevasUrls.push(publicUrl)
            }

            const payload = {
                ...form,
                urls_fotos: nuevasUrls
            }

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
        <main className="min-h-screen bg-[#F8FAFC] p-4 md:p-8">
            <div className="max-w-5xl mx-auto space-y-6">

                {/* --- HEADER --- */}
                <div className="flex flex-col gap-6 bg-white p-6 rounded-[2rem] shadow-sm border border-slate-200">
                    <div className="flex flex-col md:flex-row justify-between items-center gap-4">
                        <div className="flex items-center gap-4">
                            <div className="bg-slate-900 p-3 rounded-2xl text-white relative">
                                <Package size={24} />
                                <div className={`absolute -top-1 -right-1 w-4 h-4 rounded-full border-2 border-white ${isOnline ? 'bg-green-500' : 'bg-red-500'}`} />
                            </div>
                            <div>
                                <h1 className="text-xl font-black text-slate-800 tracking-tight italic">MASTER-PART DB</h1>
                                <div className="flex items-center gap-2">
                                    <Database size={10} className={isOnline ? 'text-green-500' : 'text-red-500'} />
                                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{isOnline ? 'Conectado' : 'Desconectado'}</p>
                                </div>
                            </div>
                        </div>

                        <div className="flex items-center gap-3 w-full md:w-auto">
                            <div className="relative flex-1 md:w-80">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                                <input
                                    type="text" value={busqueda}
                                    onChange={(e) => setBusqueda(e.target.value)}
                                    placeholder="Buscar descripción, código, marca..."
                                    className="w-full pl-10 pr-4 py-3 bg-slate-50 border-none rounded-xl text-sm focus:ring-2 focus:ring-slate-900 outline-none"
                                />
                            </div>
                            <button onClick={() => setShowModal(true)} className="bg-slate-900 text-white p-4 rounded-xl hover:bg-blue-600 transition-all shadow-lg"><Plus size={20} /></button>
                        </div>
                    </div>

                    {/* --- FILTROS RÁPIDOS --- */}
                    <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-hide">
                        <Filter size={14} className="text-slate-400 shrink-0" />
                        <button
                            onClick={() => setFiltroSistema(null)}
                            className={`px-4 py-1.5 rounded-full text-[10px] font-bold uppercase transition-all shrink-0 ${!filtroSistema ? 'bg-slate-900 text-white shadow-md' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}
                        >
                            Todos
                        </button>
                        {sistemasUnicos.map(s => (
                            <button
                                key={s}
                                onClick={() => setFiltroSistema(s)}
                                className={`px-4 py-1.5 rounded-full text-[10px] font-bold uppercase transition-all shrink-0 ${filtroSistema === s ? 'bg-blue-600 text-white shadow-md' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}
                            >
                                {s}
                            </button>
                        ))}
                    </div>
                </div>

                {/* --- LISTADO JERÁRQUICO --- */}
                <div className="space-y-4">
                    {loading ? (
                        <div className="flex flex-col items-center justify-center py-20 gap-4">
                            <Loader2 className="animate-spin text-slate-400" size={40} />
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Sincronizando base de datos...</p>
                        </div>
                    ) : (
                        Object.entries(filtradosYAgrupados).map(([sistema, data]: [string, any]) => (
                            <div key={sistema} className="space-y-2">
                                <button onClick={() => toggleNode(sistema)} className="w-full flex items-center gap-3 p-5 bg-white text-slate-900 border border-slate-200 rounded-2xl shadow-sm hover:border-slate-400 transition-all group">
                                    <div className="bg-slate-900 p-2 rounded-lg text-white group-hover:scale-110 transition-transform">
                                        <Layers size={16} />
                                    </div>
                                    <span className="font-black uppercase text-xs tracking-wider">SISTEMA: {sistema}</span>
                                    <span className="bg-slate-100 text-slate-400 text-[9px] px-2 py-0.5 rounded-full font-bold">{data._count} ITEMS</span>
                                    {openNodes.includes(sistema) ? <ChevronUp className="ml-auto" size={18} /> : <ChevronDown className="ml-auto" size={18} />}
                                </button>

                                {openNodes.includes(sistema) && (
                                    <div className="ml-6 border-l-2 border-slate-200 pl-4 space-y-2 py-2">
                                        {Object.entries(data.clases).map(([clase, claseData]: [string, any]) => (
                                            <div key={clase}>
                                                <button onClick={() => toggleNode(`${sistema}-${clase}`)} className="w-full flex items-center gap-3 p-3 bg-white rounded-xl border border-slate-100 mb-2 hover:bg-slate-50 transition-colors">
                                                    <Folder className="text-blue-500" size={16} />
                                                    <span className="font-bold text-slate-600 text-[11px] uppercase">{clase}</span>
                                                    <span className="text-[9px] text-slate-300 font-bold">({claseData._count})</span>
                                                    {openNodes.includes(`${sistema}-${clase}`) ? <ChevronUp className="ml-auto text-slate-300" size={14} /> : <ChevronDown className="ml-auto text-slate-300" size={14} />}
                                                </button>

                                                {openNodes.includes(`${sistema}-${clase}`) && (
                                                    <div className="ml-4 border-l-2 border-blue-50 pl-4 space-y-4">
                                                        {Object.entries(claseData.marcas).map(([marca, repuestos]: [string, any]) => (
                                                            <div key={marca} className="space-y-2">
                                                                <div className="flex items-center gap-2 px-2">
                                                                    <Tag size={12} className="text-slate-400" />
                                                                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-tighter">{marca}</span>
                                                                </div>
                                                                <div className="grid grid-cols-1 gap-3">
                                                                    {repuestos.map((item: Repuesto) => (
                                                                        <div key={item.id} className="bg-white border border-slate-100 rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-shadow">
                                                                            <div onClick={() => setExpandedId(expandedId === item.id ? null : item.id)} className="p-4 cursor-pointer flex items-center justify-between">
                                                                                <div className="flex items-center gap-4">
                                                                                    <div className="bg-slate-50 text-slate-600 text-[10px] font-mono font-bold px-2 py-1 rounded border border-slate-100">
                                                                                        {item.codigo_almacen}
                                                                                    </div>
                                                                                    <h3 className="font-bold text-slate-800 uppercase text-xs tracking-tight">{item.descripcion_repuesto}</h3>
                                                                                </div>
                                                                                {expandedId === item.id ? <ChevronUp size={16} className="text-slate-300" /> : <ChevronDown size={16} className="text-slate-300" />}
                                                                            </div>

                                                                            {expandedId === item.id && (
                                                                                <div className="px-4 pb-4 pt-2 border-t border-slate-50 bg-slate-50/30">
                                                                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                                                                        <div className="flex gap-2 overflow-x-auto pb-2 snap-x">
                                                                                            {item.urls_fotos?.length > 0 ? item.urls_fotos.map((url, idx) => (
                                                                                                <img key={idx} src={url} className="h-40 w-40 object-cover rounded-xl border border-white shadow-md snap-center shrink-0" />
                                                                                            )) : <div className="h-40 w-40 bg-white rounded-xl border-2 border-dashed border-slate-200 flex items-center justify-center text-slate-300"><ImageIcon size={32} /></div>}
                                                                                        </div>
                                                                                        <div className="space-y-4">
                                                                                            <div className="grid grid-cols-2 gap-2">
                                                                                                <DataCard label="Nº PARTE" value={item.numero_parte || ''} mono />
                                                                                                <DataCard label="COD. ALMECEN" value={item.codigo_almacen || ''} mono />
                                                                                                <DataCard label="MODELO" value={item.modelo || ''} />
                                                                                                <DataCard label="AÑO" value={item.year_fabricacion || ''} />
                                                                                                <DataCard label="CLASE" value={item.clase_vehiculo || ''} />
                                                                                            </div>
                                                                                            {item.info_tecnica && (
                                                                                                <div className="bg-slate-900 p-3 rounded-xl text-white text-[10px] leading-relaxed shadow-inner">
                                                                                                    <div className="flex items-center gap-2 mb-1 text-blue-400 font-bold">
                                                                                                        <Info size={12} /> INFO TÉCNICA
                                                                                                    </div>
                                                                                                    {item.info_tecnica}
                                                                                                </div>
                                                                                            )}
                                                                                            <div className="flex gap-2 pt-2">
                                                                                                <button onClick={() => {
                                                                                                    setEditId(item.id);
                                                                                                    setForm({
                                                                                                        clase_vehiculo: item.clase_vehiculo || '',
                                                                                                        modelo: item.modelo || '',
                                                                                                        marca: item.marca || '',
                                                                                                        year_fabricacion: item.year_fabricacion || '',
                                                                                                        codigo_almacen: item.codigo_almacen || '',
                                                                                                        numero_parte: item.numero_parte || '',
                                                                                                        descripcion_repuesto: item.descripcion_repuesto || '',
                                                                                                        info_tecnica: item.info_tecnica || '',
                                                                                                        sistema: item.sistema || 'GENERAL'
                                                                                                    });
                                                                                                    setExistingPhotos(item.urls_fotos || []);
                                                                                                    setShowModal(true);
                                                                                                }} className="flex-1 py-2.5 bg-slate-900 text-white rounded-xl font-bold text-[9px] uppercase flex items-center justify-center gap-2 hover:bg-blue-600 transition-colors"><Edit3 size={12} /> Editar</button>
                                                                                                <button onClick={() => eliminarRepuesto(item.id)} className="flex-1 py-2.5 bg-rose-50 text-rose-600 rounded-xl font-bold text-[9px] uppercase flex items-center justify-center gap-2 hover:bg-rose-100 transition-colors"><Trash2 size={12} /> Borrar</button>
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

            {/* --- MODAL DE FORMULARIO --- */}
            {showModal && (
                <div className="fixed inset-0 z-[60] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
                    <div className="bg-white w-full max-w-3xl rounded-[2rem] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
                        <div className="p-6 border-b flex justify-between items-center bg-slate-50">
                            <h2 className="text-lg font-black text-slate-800 uppercase italic">{editId ? 'Modificar Registro' : 'Nuevo Repuesto'}</h2>
                            <button onClick={resetForm} className="p-2 hover:bg-slate-200 rounded-full transition-colors"><X size={20} /></button>
                        </div>

                        <div className="p-6 overflow-y-auto space-y-6">
                            {/* --- BUSCADOR INTELIGENTE DE PLACA/EQUIPO --- */}
                            <div className="bg-blue-50/50 p-4 rounded-2xl border border-blue-100 relative">
                                <label className="text-[10px] font-black text-blue-600 uppercase block mb-2 flex items-center gap-2">
                                    <Truck size={12} /> Autocompletar por Placa o Código de Equipo
                                </label>
                                <div className="relative">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-blue-400" size={16} />
                                    <input
                                        type="text"
                                        placeholder="Escribe Placa o Código (ej. ABC-123)..."
                                        value={busquedaEquipo}
                                        onChange={(e) => setBusquedaEquipo(e.target.value)}
                                        className="w-full pl-10 pr-4 py-3 bg-white rounded-xl border-2 border-transparent focus:border-blue-500 text-sm outline-none shadow-sm"
                                    />
                                    {buscandoEquipo && <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 animate-spin text-blue-400" size={16} />}
                                </div>

                                {/* Lista de sugerencias */}
                                {sugerenciasEquipo.length > 0 && (
                                    <div className="absolute left-4 right-4 mt-1 bg-white border border-slate-200 rounded-xl shadow-xl z-50 max-h-48 overflow-y-auto">
                                        {sugerenciasEquipo.map((equipo) => (
                                            <button
                                                key={equipo.placaRodaje}
                                                onClick={() => seleccionarEquipo(equipo)}
                                                className="w-full p-3 text-left hover:bg-slate-50 flex flex-col border-b last:border-0"
                                            >
                                                <span className="text-xs font-black text-slate-800">{equipo.placaRodaje} <span className="text-blue-500 ml-2">[{equipo.codigoEquipo}]</span></span>
                                                <span className="text-[10px] text-slate-500 uppercase">{equipo.marca} {equipo.modelo} - {equipo.categoria}</span>
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <InputField label="Nombre Repuesto *" value={form.descripcion_repuesto} onChange={v => setForm({ ...form, descripcion_repuesto: v })} placeholder="Filtro de Aire Primario" />
                                <InputField label="Código Almacén *" value={form.codigo_almacen} onChange={v => setForm({ ...form, codigo_almacen: v })} placeholder="ALM-001" mono />
                                <InputField label="Sistema (Categoría)" value={form.sistema} onChange={v => setForm({ ...form, sistema: v })} placeholder="MOTOR / FRENOS / CHASIS" />
                                <InputField label="Clase Vehículo" value={form.clase_vehiculo} onChange={v => setForm({ ...form, clase_vehiculo: v })} placeholder="Equipo Pesado" />
                                <InputField label="Marca" value={form.marca} onChange={v => setForm({ ...form, marca: v })} placeholder="Volvo / Scania" />
                                <InputField label="Modelo" value={form.modelo} onChange={v => setForm({ ...form, modelo: v })} placeholder="FMX 460" />
                                <InputField label="Año" value={form.year_fabricacion} onChange={v => setForm({ ...form, year_fabricacion: v })} placeholder="2024" />
                                <InputField label="Número de Parte" value={form.numero_parte} onChange={v => setForm({ ...form, numero_parte: v })} placeholder="PN-2024-X" mono />
                            </div>

                            <div>
                                <label className="text-[10px] font-black text-slate-400 uppercase block mb-2">Información Técnica</label>
                                <textarea
                                    value={form.info_tecnica}
                                    onChange={e => setForm({ ...form, info_tecnica: e.target.value })}
                                    className="w-full p-4 bg-slate-50 rounded-xl border-2 border-transparent focus:border-slate-900 outline-none text-sm"
                                    rows={3}
                                    placeholder="Especificaciones, medidas, compatibilidad..."
                                />
                            </div>

                            <div>
                                <label className="text-[10px] font-black text-slate-400 uppercase block mb-2">Galería de Imágenes</label>
                                <div className="grid grid-cols-4 md:grid-cols-6 gap-2">
                                    {existingPhotos.map((url, i) => (
                                        <div key={i} className="relative aspect-square rounded-lg overflow-hidden border">
                                            <img src={url} className="w-full h-full object-cover" />
                                            <button onClick={() => setExistingPhotos(prev => prev.filter((_, idx) => idx !== i))} className="absolute top-1 right-1 bg-red-500 text-white p-1 rounded-full"><X size={8} /></button>
                                        </div>
                                    ))}
                                    <label className="aspect-square bg-slate-50 rounded-lg border-2 border-dashed border-slate-200 flex flex-col items-center justify-center text-slate-400 cursor-pointer hover:bg-slate-100 transition-colors">
                                        <Plus size={20} />
                                        <input type="file" multiple className="hidden" onChange={e => e.target.files && setFiles(prev => [...prev, ...Array.from(e.target.files!)])} />
                                    </label>
                                </div>
                                {files.length > 0 && <p className="text-[9px] text-blue-500 mt-2 font-bold">{files.length} imágenes nuevas listas para subir</p>}
                            </div>
                        </div>

                        <div className="p-6 bg-slate-50 border-t flex gap-3">
                            <button onClick={resetForm} className="flex-1 py-3 bg-white rounded-xl font-bold text-xs uppercase border border-slate-200 hover:bg-slate-100 transition-colors">Cancelar</button>
                            <button onClick={handleGuardar} disabled={subiendo} className="flex-[2] py-3 bg-slate-900 text-white rounded-xl font-bold text-xs uppercase hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center gap-2 transition-all">
                                {subiendo ? <Loader2 className="animate-spin" size={16} /> : <Save size={16} />}
                                {editId ? 'Actualizar Repuesto' : 'Registrar en DB'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </main>
    )
}

// --- COMPONENTES AUXILIARES ---
function DataCard({ label, value, mono = false }: { label: string, value: string, mono?: boolean }) {
    return (
        <div className="bg-white p-2.5 rounded-xl border border-slate-100 shadow-sm">
            <p className="text-[7px] text-slate-400 font-black uppercase mb-0.5 tracking-tighter">{label}</p>
            <p className={`text-[10px] font-bold text-slate-700 truncate ${mono ? 'font-mono' : ''}`}>{value || '---'}</p>
        </div>
    )
}

function InputField({ label, value, onChange, placeholder, mono = false }: { label: string, value: string, onChange: (v: string) => void, placeholder: string, mono?: boolean }) {
    return (
        <div className="space-y-1">
            <label className="text-[10px] font-black text-slate-500 uppercase ml-1 tracking-tight">{label}</label>
            <input
                type="text"
                placeholder={placeholder}
                value={value}
                onChange={e => onChange(e.target.value)}
                className={`w-full p-3 bg-slate-50 rounded-xl border-2 border-transparent focus:border-slate-900 text-sm transition-all outline-none ${mono ? 'font-mono' : ''}`}
            />
        </div>
    )
}