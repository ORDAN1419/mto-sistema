"use client"
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import {
    Package, Search, Plus, Trash2, Edit3, X, Save,
    Image as ImageIcon, Loader2, ChevronLeft, ChevronRight,
    Info, Car, ChevronDown, ChevronUp, Eye, Tag, Settings, Calendar
} from 'lucide-react'

// --- INTERFACES ---
interface Repuesto {
    id: string;
    clase_vehiculo: string;
    modelo: string;
    marca: string;
    year_fabricacion: string;
    codigo_almacen: string;
    numero_parte: string;
    descripcion_repuesto: string;
    info_tecnica: string;
    urls_fotos: string[];
    created_at?: string;
}

export default function RepuestosPage() {
    // --- ESTADOS ---
    const [items, setItems] = useState<Repuesto[]>([])
    const [loading, setLoading] = useState(true)
    const [showModal, setShowModal] = useState(false)
    const [subiendo, setSubiendo] = useState(false)
    const [busqueda, setBusqueda] = useState('')
    const [expandedId, setExpandedId] = useState<string | null>(null)

    // Estados para Imagenes y Zoom
    const [fotoZoom, setFotoZoom] = useState<{ urls: string[], index: number } | null>(null)

    // Estados para Formulario
    const [editId, setEditId] = useState<string | null>(null)
    const [form, setForm] = useState({
        clase_vehiculo: '', // <--- Mantenido/Asegurado
        modelo: '',
        marca: '',
        year_fabricacion: '',
        codigo_almacen: '',
        numero_parte: '',
        descripcion_repuesto: '',
        info_tecnica: ''
    })
    const [files, setFiles] = useState<File[]>([])
    const [existingPhotos, setExistingPhotos] = useState<string[]>([])

    // --- CARGA DE DATOS ---
    useEffect(() => {
        fetchRepuestos()
    }, [])

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
            console.error("Error cargando datos:", error.message)
        } finally {
            setLoading(false)
        }
    }

    // --- LÓGICA DE FORMULARIO ---
    const resetForm = () => {
        setForm({
            clase_vehiculo: '', // <--- Reset incluido
            modelo: '', marca: '', marca: '', year_fabricacion: '',
            codigo_almacen: '', numero_parte: '', descripcion_repuesto: '', info_tecnica: ''
        })
        setFiles([])
        setExistingPhotos([])
        setEditId(null)
        setShowModal(false)
    }

    async function handleGuardar() {
        if (!form.descripcion_repuesto || !form.codigo_almacen) {
            alert("Por favor completa los campos obligatorios (Nombre y Código)");
            return;
        }

        setSubiendo(true)
        let nuevasUrls: string[] = [...existingPhotos]

        try {
            // 1. Subir archivos nuevos a Storage
            for (const file of files) {
                const fileExt = file.name.split('.').pop()
                const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`

                const { data: uploadData, error: uploadError } = await supabase.storage
                    .from('repuestos')
                    .upload(fileName, file)

                if (uploadError) throw new Error(`Error subiendo imagen: ${uploadError.message}`)

                if (uploadData) {
                    const { data: publicUrlData } = supabase.storage
                        .from('repuestos')
                        .getPublicUrl(fileName)
                    nuevasUrls.push(publicUrlData.publicUrl)
                }
            }

            // 2. Preparar Payload para Base de Datos
            const payload = { ...form, urls_fotos: nuevasUrls }

            if (editId) {
                const { error: updateError } = await supabase
                    .from('base_repuestos')
                    .update(payload)
                    .eq('id', editId)
                if (updateError) throw updateError
            } else {
                const { error: insertError } = await supabase
                    .from('base_repuestos')
                    .insert([payload])
                if (insertError) throw insertError
            }

            alert("Operación exitosa")
            resetForm()
            fetchRepuestos()
        } catch (error: any) {
            alert(error.message)
        } finally {
            setSubiendo(false)
        }
    }

    async function eliminarRepuesto(id: string, urls: string[]) {
        if (!confirm("¿Estás seguro de eliminar este repuesto? Esta acción no se puede deshacer.")) return

        try {
            const { error: dbError } = await supabase.from('base_repuestos').delete().eq('id', id)
            if (dbError) throw dbError

            if (urls && urls.length > 0) {
                const fileNames = urls.map(url => url.split('/').pop()).filter(Boolean) as string[]
                await supabase.storage.from('repuestos').remove(fileNames)
            }

            fetchRepuestos()
        } catch (error: any) {
            alert("Error al eliminar: " + error.message)
        }
    }

    const filtrados = items.filter(i =>
        Object.values(i).some(val =>
            String(val).toLowerCase().includes(busqueda.toLowerCase())
        )
    )

    return (
        <main className="min-h-screen bg-[#F8FAFC] p-4 md:p-8 font-sans text-slate-900">
            <div className="max-w-5xl mx-auto space-y-6">

                {/* --- HEADER & SEARCH --- */}
                <div className="flex flex-col md:flex-row justify-between items-center gap-4 bg-white p-6 rounded-[2rem] shadow-sm border border-slate-200">
                    <div className="flex items-center gap-4">
                        <div className="bg-slate-900 p-3 rounded-2xl text-white">
                            <Package size={24} />
                        </div>
                        <div>
                            <h1 className="text-xl font-black text-slate-800 tracking-tight italic">MASTER-PART</h1>
                            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Inventario Digital</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-3 w-full md:w-auto">
                        <div className="relative flex-1 md:w-80">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                            <input
                                type="text"
                                onChange={(e) => setBusqueda(e.target.value)}
                                placeholder="Buscar por marca, código o nombre..."
                                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border-none rounded-xl text-sm focus:ring-2 focus:ring-slate-900 outline-none transition-all"
                            />
                        </div>
                        <button
                            onClick={() => setShowModal(true)}
                            className="bg-slate-900 text-white p-3 rounded-xl hover:bg-blue-600 hover:scale-105 transition-all shadow-lg shadow-slate-200"
                        >
                            <Plus size={20} />
                        </button>
                    </div>
                </div>

                {/* --- LISTADO (ACORDEÓN) --- */}
                <div className="space-y-3">
                    {loading ? (
                        <div className="flex flex-col items-center justify-center py-20 gap-4">
                            <Loader2 className="animate-spin text-slate-400" size={40} />
                            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Sincronizando Base de Datos...</p>
                        </div>
                    ) : filtrados.length === 0 ? (
                        <div className="text-center py-20 bg-white rounded-[2.5rem] border border-dashed border-slate-200">
                            <p className="text-slate-400 font-medium">No se encontraron repuestos registrados.</p>
                        </div>
                    ) : filtrados.map(item => (
                        <div
                            key={item.id}
                            className={`bg-white border transition-all duration-300 ${expandedId === item.id
                                ? 'rounded-[2.5rem] shadow-xl border-slate-300'
                                : 'rounded-3xl shadow-sm border-slate-100 hover:border-slate-300'
                                }`}
                        >
                            {/* Cabecera Item */}
                            <div
                                onClick={() => setExpandedId(expandedId === item.id ? null : item.id)}
                                className="p-4 md:p-6 cursor-pointer flex items-center justify-between gap-4"
                            >
                                <div className="flex items-center gap-4 flex-1 min-w-0">
                                    <div className="hidden md:flex bg-slate-50 h-12 w-12 rounded-2xl items-center justify-center text-slate-400 shrink-0">
                                        <Tag size={20} />
                                    </div>
                                    <div className="truncate">
                                        <div className="flex items-center gap-2 mb-1">
                                            <span className="text-[10px] font-black bg-blue-600 text-white px-2 py-0.5 rounded-md uppercase">
                                                CÓD: {item.codigo_almacen}
                                            </span>
                                            <span className="text-[10px] font-bold text-slate-400 uppercase">
                                                CLASE: {item.clase_vehiculo || 'GENERAL'}
                                            </span>
                                        </div>
                                        <h3 className="font-bold text-slate-800 uppercase text-sm md:text-base truncate">
                                            <span className="text-slate-400 font-medium">REPUESTO: </span>{item.descripcion_repuesto}
                                        </h3>
                                    </div>
                                </div>

                                <div className="flex items-center gap-3">
                                    <div className="hidden sm:block text-right mr-4">
                                        <p className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter">MODELO VEHÍCULO</p>
                                        <p className="text-xs font-bold text-slate-600 uppercase">{item.modelo || 'N/A'}</p>
                                    </div>
                                    <div className={`p-2 rounded-full transition-colors ${expandedId === item.id ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-400'}`}>
                                        {expandedId === item.id ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                                    </div>
                                </div>
                            </div>

                            {/* Contenido Expandido */}
                            {expandedId === item.id && (
                                <div className="px-6 pb-8 animate-in fade-in slide-in-from-top-2 duration-300">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-4 border-t border-slate-50">

                                        {/* Galería */}
                                        <div className="space-y-3">
                                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                                <ImageIcon size={12} /> VISTA PREVIA DEL ARTÍCULO
                                            </p>
                                            <div className="flex gap-2 overflow-x-auto pb-2 custom-scrollbar">
                                                {item.urls_fotos && item.urls_fotos.length > 0 ? (
                                                    item.urls_fotos.map((url, idx) => (
                                                        <div key={idx} className="relative group shrink-0">
                                                            <img
                                                                src={url}
                                                                onClick={() => setFotoZoom({ urls: item.urls_fotos, index: idx })}
                                                                className="h-40 w-40 object-cover rounded-3xl cursor-zoom-in border border-slate-100 hover:scale-95 transition-transform shadow-sm"
                                                                alt="repuesto"
                                                            />
                                                            <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 bg-black/20 rounded-3xl pointer-events-none transition-opacity">
                                                                <Eye className="text-white" />
                                                            </div>
                                                        </div>
                                                    ))
                                                ) : (
                                                    <div className="h-40 w-full bg-slate-50 rounded-3xl flex flex-col items-center justify-center text-slate-300 border-2 border-dashed border-slate-100">
                                                        <ImageIcon size={32} />
                                                        <span className="text-[10px] font-bold mt-2 uppercase">Sin imágenes</span>
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        {/* Ficha Técnica */}
                                        <div className="flex flex-col justify-between">
                                            <div className="space-y-4">
                                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                                    <Settings size={12} /> FICHA TÉCNICA DETALLADA
                                                </p>
                                                <div className="grid grid-cols-2 gap-3">
                                                    <DataCard label="CLASE VEHÍCULO" value={item.clase_vehiculo} />
                                                    <DataCard label="MARCA" value={item.marca} />
                                                    <DataCard label="AÑO FABRICACIÓN" value={item.year_fabricacion} />
                                                    <DataCard label="NÚMERO DE PARTE" value={item.numero_parte} mono />
                                                    <DataCard label="ALMACÉN ID" value={item.codigo_almacen} />
                                                </div>
                                                {item.info_tecnica && (
                                                    <div className="bg-amber-50/50 p-4 rounded-2xl border border-amber-100">
                                                        <div className="flex items-center gap-2 mb-1 text-amber-600">
                                                            <Info size={14} />
                                                            <span className="text-[10px] font-black uppercase">Notas</span>
                                                        </div>
                                                        <p className="text-xs text-slate-600 italic leading-relaxed">{item.info_tecnica}</p>
                                                    </div>
                                                )}
                                            </div>

                                            <div className="flex gap-2 mt-6">
                                                <button
                                                    onClick={() => {
                                                        setEditId(item.id);
                                                        setForm(item as any);
                                                        setExistingPhotos(item.urls_fotos || []);
                                                        setShowModal(true);
                                                    }}
                                                    className="flex-1 flex items-center justify-center gap-2 py-3 bg-slate-900 text-white rounded-2xl font-bold text-xs hover:bg-blue-600 transition-all shadow-md"
                                                >
                                                    <Edit3 size={16} /> EDITAR
                                                </button>
                                                <button
                                                    onClick={() => eliminarRepuesto(item.id, item.urls_fotos || [])}
                                                    className="flex-1 flex items-center justify-center gap-2 py-3 bg-white text-rose-600 border border-rose-100 rounded-2xl font-bold text-xs hover:bg-rose-600 hover:text-white transition-all"
                                                >
                                                    <Trash2 size={16} /> ELIMINAR
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            </div>

            {/* --- LIGHTBOX FOTOS --- */}
            {fotoZoom && (
                <div className="fixed inset-0 z-[100] bg-slate-900/95 backdrop-blur-md flex items-center justify-center p-4">
                    <button onClick={() => setFotoZoom(null)} className="absolute top-6 right-6 text-white/50 hover:text-white transition-colors">
                        <X size={40} />
                    </button>
                    <div className="relative w-full max-w-4xl flex items-center justify-center">
                        {fotoZoom.urls.length > 1 && (
                            <button
                                onClick={() => setFotoZoom(prev => prev ? { ...prev, index: (prev.index - 1 + prev.urls.length) % prev.urls.length } : null)}
                                className="absolute -left-4 md:-left-16 bg-white/10 hover:bg-white/20 p-4 rounded-full text-white transition-all"
                            >
                                <ChevronLeft size={32} />
                            </button>
                        )}
                        <img src={fotoZoom.urls[fotoZoom.index]} className="max-w-full max-h-[85vh] object-contain rounded-lg shadow-2xl" alt="Zoom" />
                        {fotoZoom.urls.length > 1 && (
                            <button
                                onClick={() => setFotoZoom(prev => prev ? { ...prev, index: (prev.index + 1) % prev.urls.length } : null)}
                                className="absolute -right-4 md:-right-16 bg-white/10 hover:bg-white/20 p-4 rounded-full text-white transition-all"
                            >
                                <ChevronRight size={32} />
                            </button>
                        )}
                    </div>
                </div>
            )}

            {/* --- MODAL FORMULARIO --- */}
            {showModal && (
                <div className="fixed inset-0 z-[60] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
                    <div className="bg-white w-full max-w-2xl rounded-[2.5rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
                        <div className="p-6 border-b flex justify-between items-center bg-slate-50">
                            <div>
                                <h2 className="text-xl font-black text-slate-800 uppercase tracking-tight italic">
                                    {editId ? 'Actualizar Repuesto' : 'Nuevo Registro'}
                                </h2>
                                <p className="text-[10px] text-slate-400 font-bold uppercase">Gestión de Inventario</p>
                            </div>
                            <button onClick={resetForm} className="p-2 hover:bg-slate-200 rounded-full transition-colors"><X size={24} /></button>
                        </div>

                        <div className="p-8 max-h-[65vh] overflow-y-auto space-y-6 custom-scrollbar">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <InputField label="Nombre Repuesto *" value={form.descripcion_repuesto} onChange={v => setForm({ ...form, descripcion_repuesto: v })} placeholder="Ej: Disco de Freno" />
                                <InputField label="Código Almacén *" value={form.codigo_almacen} onChange={v => setForm({ ...form, codigo_almacen: v })} placeholder="Ej: ALM-001" mono />

                                {/* NUEVO CAMPO: CLASE VEHÍCULO */}
                                <InputField label="Clase Vehículo" value={form.clase_vehiculo} onChange={v => setForm({ ...form, clase_vehiculo: v })} placeholder="Ej: Camioneta, Sedan, etc." />

                                <InputField label="Marca" value={form.marca} onChange={v => setForm({ ...form, marca: v })} placeholder="Ej: Brembo" />
                                <InputField label="Modelo Vehículo" value={form.modelo} onChange={v => setForm({ ...form, modelo: v })} placeholder="Ej: Corolla 2023" />
                                <InputField label="Año Fab." value={form.year_fabricacion} onChange={v => setForm({ ...form, year_fabricacion: v })} placeholder="2023" />
                                <InputField label="Núm. Parte" value={form.numero_parte} onChange={v => setForm({ ...form, numero_parte: v })} placeholder="NP-900" />
                            </div>

                            <div className="space-y-1">
                                <label className="text-[10px] font-black text-slate-400 uppercase ml-2">Notas Técnicas</label>
                                <textarea
                                    rows={3}
                                    value={form.info_tecnica}
                                    onChange={e => setForm({ ...form, info_tecnica: e.target.value })}
                                    className="w-full p-4 bg-slate-50 rounded-2xl border-none focus:ring-2 focus:ring-slate-900 text-sm"
                                />
                            </div>

                            <div className="space-y-3">
                                <label className="text-[10px] font-black text-slate-400 uppercase ml-2">Imágenes del Producto</label>
                                <div className="grid grid-cols-4 gap-2">
                                    {existingPhotos.map((url, i) => (
                                        <div key={i} className="relative aspect-square rounded-xl overflow-hidden border group">
                                            <img src={url} className="w-full h-full object-cover" alt="" />
                                            <button
                                                onClick={() => setExistingPhotos(prev => prev.filter((_, idx) => idx !== i))}
                                                className="absolute top-1 right-1 bg-rose-500 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                                            >
                                                <X size={12} />
                                            </button>
                                        </div>
                                    ))}
                                    <label className="aspect-square bg-slate-50 rounded-xl border-2 border-dashed border-slate-200 flex flex-col items-center justify-center text-slate-400 cursor-pointer hover:bg-slate-100 transition-colors">
                                        <Plus size={24} />
                                        <span className="text-[8px] font-black mt-1 uppercase">Subir</span>
                                        <input
                                            type="file"
                                            multiple
                                            accept="image/*"
                                            className="hidden"
                                            onChange={e => setFiles(prev => [...prev, ...Array.from(e.target.files || [])])}
                                        />
                                    </label>
                                </div>
                                {files.length > 0 && (
                                    <div className="flex flex-wrap gap-2">
                                        {files.map((f, idx) => (
                                            <span key={idx} className="text-[9px] bg-blue-50 text-blue-600 px-2 py-1 rounded-lg font-bold">
                                                {f.name}
                                            </span>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="p-6 bg-slate-50 border-t flex gap-3">
                            <button onClick={resetForm} className="flex-1 py-4 bg-white text-slate-600 rounded-2xl font-black text-xs uppercase border border-slate-200 hover:bg-slate-100 transition-all">
                                Cancelar
                            </button>
                            <button
                                onClick={handleGuardar}
                                disabled={subiendo}
                                className="flex-[2] py-4 bg-slate-900 text-white rounded-2xl font-black text-xs uppercase hover:bg-blue-600 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                            >
                                {subiendo ? <Loader2 className="animate-spin" size={16} /> : <Save size={16} />}
                                {editId ? 'Guardar Cambios' : 'Registrar Repuesto'}
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
        <div className="bg-slate-50 p-3 rounded-2xl border border-slate-100">
            <p className="text-[9px] text-slate-400 font-bold uppercase">{label}</p>
            <p className={`text-sm font-bold text-slate-700 ${mono ? 'font-mono' : ''}`}>
                {value || '---'}
            </p>
        </div>
    )
}

function InputField({ label, value, onChange, placeholder, mono = false }: {
    label: string, value: string, onChange: (v: string) => void, placeholder: string, mono?: boolean
}) {
    return (
        <div className="space-y-1">
            <label className="text-[10px] font-black text-slate-400 uppercase ml-2">{label}</label>
            <input
                type="text"
                placeholder={placeholder}
                value={value}
                onChange={e => onChange(e.target.value)}
                className={`w-full p-3 bg-slate-50 rounded-2xl border-none focus:ring-2 focus:ring-slate-900 text-sm transition-all ${mono ? 'font-mono' : ''}`}
            />
        </div>
    )
}