import React, { useState, useEffect } from 'react';
// ✅ IMPORTACIÓN CORREGIDA: Incluye PenTool para evitar errores de compilación
import { X, Wrench, Plus, Save, Activity, Clock, AlertTriangle, PenTool, User, Settings, Search, Database } from 'lucide-react';
import { supabase } from '@/lib/supabase';

export const ModalFormulario = ({
    showModal,
    setShowModal,
    isEditing,
    form,
    setForm,
    especificarSistema,
    setEspecificarSistema,
    nuevoRepuesto,
    setNuevoRepuesto,
    agregarRepuestoALista,
    repuestos,
    setRepuestos,
    guardarEvento,
    enviando
}: any) => {
    const [sugerencias, setSugerencias] = useState<any[]>([]);
    const [sugerenciasRep, setSugerenciasRep] = useState<any[]>([]);
    const [showNuevoRepForm, setShowNuevoRepForm] = useState(false);

    // Estado local para información del equipo actual
    const [equipoInfo, setEquipoInfo] = useState({ marca: '', modelo: '', horometroActual: '' });

    // Lógica Predictiva: PLACAS + Carga de Marca/Modelo/Horómetro
    useEffect(() => {
        const buscarPlacas = async () => {
            if (!form.placa || form.placa.length < 1) {
                setSugerencias([]);
                setEquipoInfo({ marca: '', modelo: '', horometroActual: '' });
                return;
            }
            // ✅ MODIFICADO: Ahora también traemos horometroMayor para el auto-relleno
            const { data } = await supabase.from('maestroEquipos')
                .select('placaRodaje, codigoEquipo, marca, modelo, horometroMayor')
                .or(`placaRodaje.ilike.%${form.placa}%,codigoEquipo.ilike.%${form.placa}%`)
                .limit(5);

            if (data) {
                setSugerencias(data);
                const exacto = data.find(d => d.placaRodaje.toUpperCase() === form.placa.toUpperCase());
                if (exacto) {
                    setEquipoInfo({
                        marca: exacto.marca || '',
                        modelo: exacto.modelo || '',
                        horometroActual: exacto.horometroMayor || ''
                    });
                }
            }
        };
        const timeoutId = setTimeout(buscarPlacas, 150);
        return () => clearTimeout(timeoutId);
    }, [form.placa]);

    // Lógica Predictiva: REPUESTOS
    useEffect(() => {
        const buscarRepuestos = async () => {
            if (!nuevoRepuesto.descripcion || nuevoRepuesto.descripcion.length < 2) { setSugerenciasRep([]); return; }
            const { data } = await supabase.from('base_repuestos')
                .select('id, codigo_almacen, numero_parte, descripcion_repuesto, marca, modelo')
                .or(`descripcion_repuesto.ilike.%${nuevoRepuesto.descripcion}%,codigo_almacen.ilike.%${nuevoRepuesto.descripcion}%,numero_parte.ilike.%${nuevoRepuesto.descripcion}%`)
                .limit(6);
            if (data) setSugerenciasRep(data);
        };
        const timeoutId = setTimeout(buscarRepuestos, 150);
        return () => clearTimeout(timeoutId);
    }, [nuevoRepuesto.descripcion]);

    // Auto-relleno de marca y modelo al abrir el form de nuevo repuesto
    useEffect(() => {
        if (showNuevoRepForm) {
            setNuevoRepuesto((prev: any) => ({
                ...prev,
                marca: equipoInfo.marca,
                modelo: equipoInfo.modelo
            }));
        }
    }, [showNuevoRepForm, equipoInfo]);

    const guardarNuevoRepuestoBase = async () => {
        if (!nuevoRepuesto.descripcion) return alert("Mínimo requiere descripción");
        const { data, error } = await supabase.from('base_repuestos').insert([{
            descripcion_repuesto: nuevoRepuesto.descripcion.toUpperCase(),
            codigo_almacen: nuevoRepuesto.codigo_almacen?.toUpperCase() || null,
            numero_parte: nuevoRepuesto.numero_parte?.toUpperCase() || null,
            marca: nuevoRepuesto.marca?.toUpperCase() || null,
            modelo: nuevoRepuesto.modelo?.toUpperCase() || null,
            sistema: form.sistema || 'GENERAL'
        }]).select().single();

        if (!error && data) {
            alert("✅ Repuesto guardado en Base de Datos");
            setNuevoRepuesto({
                ...nuevoRepuesto,
                id: data.id,
                descripcion: data.descripcion_repuesto,
                codigo_almacen: data.codigo_almacen,
                numero_parte: data.numero_parte
            });
            setShowNuevoRepForm(false);
            setSugerenciasRep([]);
        }
    };

    if (!showModal) return null;

    const establecerFechaHoy = () => {
        const fechaLocal = new Date();
        const offset = fechaLocal.getTimezoneOffset() * 60000;
        const fechaAjustada = new Date(fechaLocal.getTime() - offset);
        const hoy = fechaAjustada.toISOString().split('T')[0];
        setForm({ ...form, fecha_evento: hoy });
    };

    return (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
            <div className="bg-white w-full max-w-6xl rounded-[2.5rem] shadow-2xl overflow-hidden p-8 animate-in zoom-in duration-200 border border-slate-100 max-h-[95vh] overflow-y-auto">

                {/* Cabecera */}
                <div className="flex justify-between items-center mb-6 border-b border-slate-50 pb-4">
                    <div className="flex items-center gap-3">
                        <div className="bg-blue-600 p-2 rounded-xl text-white shadow-lg shadow-blue-100"><Wrench size={18} /></div>
                        <h3 className="text-lg font-black text-slate-800 uppercase tracking-tight">
                            {isEditing ? `Editando Reporte: ${form.placa}` : "Nuevo Registro Técnico"}
                        </h3>
                    </div>
                    <button onClick={() => setShowModal(false)} className="p-2 text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded-full transition-all">
                        <X size={24} />
                    </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    {/* Columna 1: Equipo y Tiempos */}
                    <div className="space-y-4">
                        <div className="bg-slate-50 p-5 rounded-[1.5rem] border border-slate-100 space-y-4">
                            <div className="grid grid-cols-2 gap-3">
                                <div className="space-y-1 relative">
                                    <label className="text-[9px] font-bold text-blue-600 uppercase ml-1">Placa</label>
                                    <div className="relative">
                                        <input
                                            value={form.placa || ''}
                                            onChange={e => setForm({ ...form, placa: e.target.value.toUpperCase() })}
                                            placeholder="BUSCAR..."
                                            className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-[11px] font-black outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-50"
                                        />
                                        {sugerencias.length > 0 && (
                                            <div className="absolute top-full left-0 right-0 bg-white border border-slate-200 rounded-xl mt-1 shadow-xl z-50 overflow-hidden">
                                                {sugerencias.map((item) => (
                                                    <div key={item.placaRodaje} className="px-3 py-2 hover:bg-blue-50 cursor-pointer border-b border-slate-50 last:border-0"
                                                        onClick={() => {
                                                            // ✅ MODIFICADO: Rellena placa y horómetro actual automáticamente
                                                            setForm({
                                                                ...form,
                                                                placa: item.placaRodaje,
                                                                horometro: item.horometroMayor || ''
                                                            });
                                                            setEquipoInfo({ marca: item.marca, modelo: item.modelo, horometroActual: item.horometroMayor });
                                                            setSugerencias([]);
                                                        }}>
                                                        <p className="text-[10px] font-black text-slate-700">{item.placaRodaje}</p>
                                                        <p className="text-[8px] text-slate-400 font-bold uppercase">{item.codigoEquipo || 'Sin código'}</p>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[9px] font-bold text-blue-600 uppercase ml-1">Horómetro</label>
                                    <input type="number" value={form.horometro || ''} onChange={e => setForm({ ...form, horometro: e.target.value })} className="w-full px-3 py-2 border border-slate-200 rounded-xl text-[11px] font-black font-mono outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-50" />
                                </div>
                            </div>

                            <div className="pt-2 border-t border-slate-200 space-y-3">
                                <div className="flex justify-between items-center">
                                    <p className="text-[9px] font-black text-slate-400 uppercase flex items-center gap-2"><Clock size={12} /> Control de Tiempos</p>
                                    {!form.fecha_evento && <button onClick={establecerFechaHoy} className="text-[8px] bg-blue-100 text-blue-600 px-2 py-1 rounded-md font-bold hover:bg-blue-200">USAR FECHA HOY</button>}
                                </div>
                                <div className="grid grid-cols-2 gap-3">
                                    <div className="space-y-1">
                                        <label className="text-[9px] font-bold text-slate-500 ml-1">INICIO (24H)</label>
                                        {/* ✅ MODIFICADO: Lang="en-GB" fuerza el formato 24h en la mayoría de navegadores */}
                                        <input type="time" lang="en-GB" value={form.H_inicial || ''} onChange={e => setForm({ ...form, H_inicial: e.target.value })} className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-[11px] font-bold outline-none focus:border-blue-500" />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-[9px] font-bold text-slate-500 ml-1">FIN (24H)</label>
                                        <input type="time" lang="en-GB" value={form.H_final || ''} onChange={e => setForm({ ...form, H_final: e.target.value })} className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-[11px] font-bold outline-none focus:border-blue-500" />
                                    </div>
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[9px] font-bold text-slate-500 ml-1">FECHA EVENTO</label>
                                    <input type="date" value={form.fecha_evento || ''} onChange={e => setForm({ ...form, fecha_evento: e.target.value })} className="w-full px-4 py-2 bg-white border border-slate-200 rounded-xl text-[11px] font-bold outline-none focus:border-blue-500" />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Columna 2: Clasificación */}
                    <div className="space-y-4">
                        <div className="space-y-1">
                            <label className="text-[9px] font-bold text-slate-400 uppercase ml-1 flex items-center gap-1"><Settings size={10} /> Tipo de Trabajo</label>
                            <select value={form.tipoTrabajo || ""} onChange={e => setForm({ ...form, tipoTrabajo: e.target.value })} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-100 rounded-xl text-[11px] font-black outline-none focus:bg-white focus:border-blue-500 transition-all cursor-pointer">
                                <option value="">SELECCIONAR TIPO...</option>
                                <option value="INSPECCION">🔍 INSPECCION (EQUIPO OPERATIVO)</option>
                                <option value="MTTO. PREV">🛡️ MTTO. PREVENTIVO (INOPERATIVO)</option>
                                <option value="MTTO. PROG">📅 MTTO. PROGRAMADO (INOPERATIVO)</option>
                                <option value="MTTO. CORRECTIVO">🛠️ MTTO. CORRECTIVO (INOPERATIVO)</option>
                                <option value="ACCIDENTE">⚠️ ACCIDENTE (INOPERATIVO)</option>
                            </select>
                        </div>
                        <div className="space-y-1">
                            <label className="text-[9px] font-bold text-slate-400 uppercase ml-1">Sistema</label>
                            <select value={especificarSistema ? "OTRO" : (form.sistema || "")} onChange={e => { if (e.target.value === "OTRO") { setEspecificarSistema(true); setForm({ ...form, sistema: "" }); } else { setEspecificarSistema(false); setForm({ ...form, sistema: e.target.value }); } }} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-100 rounded-xl text-[11px] font-black outline-none focus:bg-white focus:border-blue-500 cursor-pointer">
                                <option value="">SISTEMA...</option>
                                <option value="MOTOR">MOTOR</option><option value="TRANSMISIÓN">TRANSMISIÓN</option><option value="SIST. ELÉCTRICO">SIST. ELÉCTRICO</option><option value="HIDRÁULICO">HIDRÁULICO</option><option value="FRENOS">FRENOS</option><option value="ESTRUCTURA">ESTRUCTURA</option><option value="OTRO">➕ OTRO...</option>
                            </select>
                        </div>
                        {especificarSistema && <input placeholder="ESCRIBIR SISTEMA NUEVO" value={form.sistema || ''} onChange={e => setForm({ ...form, sistema: e.target.value.toUpperCase() })} className="w-full px-4 py-2 bg-blue-50 border border-blue-200 rounded-xl text-[11px] font-black text-blue-700 outline-none animate-in slide-in-from-top-1" />}
                        <div className="space-y-1">
                            <label className="text-[9px] font-bold text-slate-400 uppercase ml-1">Subsistema</label>
                            <input placeholder="Ej. INYECTORES, BOMBA..." value={form.subsistema || ''} onChange={e => setForm({ ...form, subsistema: e.target.value.toUpperCase() })} className="w-full px-4 py-2 bg-slate-50 border border-slate-100 rounded-xl text-[11px] font-bold outline-none focus:bg-white focus:border-blue-500" />
                        </div>
                        <div className="space-y-1">
                            <label className="text-[9px] font-bold text-slate-400 uppercase ml-1 flex items-center gap-1"><User size={10} /> Técnico Responsable</label>
                            <input placeholder="NOMBRE DEL TÉCNICO" value={form.tecnico || ''} onChange={e => setForm({ ...form, tecnico: e.target.value.toUpperCase() })} className="w-full px-4 py-2 bg-slate-50 border border-slate-100 rounded-xl text-[11px] font-bold outline-none focus:bg-white focus:border-blue-500" />
                        </div>
                    </div>

                    {/* Columna 3: Relato y Repuestos Predictivos */}
                    <div className="flex flex-col space-y-4">
                        <div className="space-y-1">
                            <label className="text-[9px] font-bold text-slate-400 uppercase ml-1 flex items-center gap-1"><PenTool size={10} /> Descripción del Evento</label>
                            <textarea value={form.evento || ''} onChange={e => setForm({ ...form, evento: e.target.value })} className="w-full h-[100px] p-4 bg-slate-50 border border-slate-100 rounded-[1.5rem] text-[11px] italic resize-none outline-none focus:bg-white focus:border-blue-500 transition-all shadow-inner" placeholder="Relato detallado..." />
                        </div>

                        <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 relative">
                            <div className="flex justify-between items-center mb-2">
                                <p className="text-[9px] font-black text-slate-400 uppercase flex items-center gap-1"><Database size={12} /> Repuestos</p>
                                <button onClick={() => setShowNuevoRepForm(!showNuevoRepForm)} className="text-[8px] bg-white border border-slate-200 text-blue-600 px-2 py-1 rounded-md font-black hover:bg-blue-600 hover:text-white transition-all">
                                    {showNuevoRepForm ? "X CERRAR" : "+ CREAR NUEVO"}
                                </button>
                            </div>

                            {!showNuevoRepForm ? (
                                <div className="space-y-2 relative">
                                    <div className="flex gap-2">
                                        <input
                                            placeholder="Descripción, Almacén o Parte..."
                                            value={nuevoRepuesto.descripcion || ''}
                                            onChange={e => setNuevoRepuesto({ ...nuevoRepuesto, descripcion: e.target.value.toUpperCase() })}
                                            className="flex-grow px-3 py-2 bg-white border border-slate-200 rounded-lg text-[10px] font-bold outline-none focus:border-blue-500"
                                        />
                                        <input type="number" className="w-12 px-1 py-2 bg-white border border-slate-200 rounded-lg text-[10px] font-bold text-center" value={nuevoRepuesto.cantidad || 1} onChange={e => setNuevoRepuesto({ ...nuevoRepuesto, cantidad: Number(e.target.value) })} />
                                        <button onClick={agregarRepuestoALista} className="p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 shadow-md transition-all"><Plus size={14} /></button>
                                    </div>
                                    {sugerenciasRep.length > 0 && (
                                        <div className="absolute top-full left-0 right-0 bg-white border border-slate-200 rounded-xl mt-1 shadow-2xl z-50 max-h-48 overflow-y-auto">
                                            {sugerenciasRep.map((rep, idx) => (
                                                <div key={rep.id || idx} className="p-2 hover:bg-blue-50 cursor-pointer border-b border-slate-50 last:border-0 transition-colors"
                                                    onClick={() => {
                                                        setNuevoRepuesto({
                                                            ...nuevoRepuesto,
                                                            id: rep.id,
                                                            descripcion: rep.descripcion_repuesto,
                                                            codigo_almacen: rep.codigo_almacen,
                                                            numero_parte: rep.numero_parte
                                                        });
                                                        setSugerenciasRep([]);
                                                    }}>
                                                    <p className="text-[10px] font-black text-blue-600">{rep.descripcion_repuesto}</p>
                                                    <div className="flex flex-wrap gap-2 text-[7px] text-slate-400 font-bold mt-0.5 uppercase">
                                                        <span className="bg-slate-100 px-1 rounded text-slate-600">📦 {rep.codigo_almacen || '---'}</span>
                                                        <span className="bg-slate-100 px-1 rounded text-slate-600">⚙️ {rep.numero_parte || '---'}</span>
                                                        <span className="text-slate-500">{rep.marca} {rep.modelo}</span>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <div className="space-y-2 bg-white p-3 rounded-xl border border-blue-100 shadow-sm animate-in slide-in-from-top-1">
                                    <p className="text-[8px] font-black text-blue-600 mb-1">REGISTRAR EN BASE DE DATOS</p>
                                    <input placeholder="DESCRIPCIÓN *" value={nuevoRepuesto.descripcion} onChange={e => setNuevoRepuesto({ ...nuevoRepuesto, descripcion: e.target.value.toUpperCase() })} className="w-full px-2 py-1.5 border rounded-md text-[9px] font-bold" />
                                    <div className="grid grid-cols-2 gap-2">
                                        <input placeholder="CÓD. ALMACÉN" value={nuevoRepuesto.codigo_almacen || ''} onChange={e => setNuevoRepuesto({ ...nuevoRepuesto, codigo_almacen: e.target.value.toUpperCase() })} className="px-2 py-1.5 border rounded-md text-[9px]" />
                                        <input placeholder="N° PARTE" value={nuevoRepuesto.numero_parte || ''} onChange={e => setNuevoRepuesto({ ...nuevoRepuesto, numero_parte: e.target.value.toUpperCase() })} className="px-2 py-1.5 border rounded-md text-[9px]" />
                                        <input placeholder="MARCA" value={nuevoRepuesto.marca || ''} onChange={e => setNuevoRepuesto({ ...nuevoRepuesto, marca: e.target.value.toUpperCase() })} className="px-2 py-1.5 border rounded-md text-[9px]" />
                                        <input placeholder="MODELO" value={nuevoRepuesto.modelo || ''} onChange={e => setNuevoRepuesto({ ...nuevoRepuesto, modelo: e.target.value.toUpperCase() })} className="px-2 py-1.5 border rounded-md text-[9px]" />
                                    </div>
                                    <button onClick={guardarNuevoRepuestoBase} className="w-full bg-blue-600 text-white py-2 rounded-md text-[9px] font-black uppercase hover:bg-blue-700 transition-colors">GUARDAR EN MAESTRO</button>
                                </div>
                            )}

                            <div className="mt-3 max-h-32 overflow-y-auto space-y-1 pr-1 custom-scrollbar">
                                {repuestos.map((r: any, i: number) => (
                                    <div key={i} className="flex justify-between items-center bg-white p-2.5 rounded-xl border border-slate-100 text-[9px] font-black uppercase shadow-sm">
                                        <div className="flex flex-col">
                                            <span className="text-slate-700">{r.cantidad}x {r.descripcion_repuesto || r.descripcion}</span>
                                            <div className="flex gap-2 text-[6px] text-slate-400">
                                                <span>P/N: {r.numero_parte || 'N/A'}</span>
                                                <span>CÓD: {r.codigo_almacen || 'N/A'}</span>
                                            </div>
                                        </div>
                                        <button onClick={() => setRepuestos(repuestos.filter((_: any, idx: number) => idx !== i))} className="text-rose-400 hover:text-rose-600 p-1"><X size={12} /></button>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {form.tipoTrabajo && form.tipoTrabajo !== "INSPECCION" && (
                            <div className="flex items-center gap-2 p-2.5 bg-amber-50 border border-amber-100 rounded-xl text-amber-700 text-[10px] font-bold italic animate-pulse">
                                <AlertTriangle size={14} /> El equipo se marcará como INOPERATIVO
                            </div>
                        )}

                        <button onClick={guardarEvento} disabled={enviando}
                            className={`w-full py-4 rounded-xl font-black uppercase text-[10px] tracking-widest shadow-lg flex items-center justify-center gap-2 transition-all disabled:opacity-50 ${form.tipoTrabajo && form.tipoTrabajo !== "INSPECCION" ? 'bg-amber-600 hover:bg-amber-700 text-white' : 'bg-[#0F172A] hover:bg-black text-white'}`}>
                            {enviando ? <Activity className="animate-spin" size={14} /> : <><Save size={14} /> {isEditing ? "ACTUALIZAR" : "GUARDAR REPORTE"}</>}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};