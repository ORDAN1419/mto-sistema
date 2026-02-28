import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
    X, Wrench, Plus, Save, Activity, Clock, AlertTriangle,
    PenTool, User, Settings, Search, Database, Package, Hash, Inbox, Calendar as LucideCalendar, RefreshCw
} from 'lucide-react';
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
    const [equipoInfo, setEquipoInfo] = useState({ marca: '', modelo: '', horometroActual: '' });

    // ✅ ESTADOS PARA NAVEGACIÓN POR TECLADO
    const [indexSel, setIndexSel] = useState(-1);
    const [indexSelRep, setIndexSelRep] = useState(-1);

    // ✅ REFERENCIA PARA AUTO-FOCO
    const inputPlacaRef = useRef<HTMLInputElement>(null);

    // Lógica de Duración (Mantenida)
    const duracionVisual = useMemo(() => {
        if (form.H_inicial && form.H_final) {
            const [h1, m1] = form.H_inicial.split(':').map(Number);
            const [h2, m2] = form.H_final.split(':').map(Number);
            const inicio = h1 + m1 / 60;
            const fin = h2 + m2 / 60;
            let diff = fin > inicio ? fin - inicio : (24 - inicio) + fin;
            return diff.toFixed(2);
        }
        return "0.00";
    }, [form.H_inicial, form.H_final]);

    // ✅ AUTO-FOCO AL ABRIR
    useEffect(() => {
        if (showModal) {
            setTimeout(() => inputPlacaRef.current?.focus(), 150);
        }
    }, [showModal]);

    // Búsqueda de Placas (Mantenida)
    useEffect(() => {
        const buscarPlacas = async () => {
            if (!form.placa || form.placa.length < 1) {
                setSugerencias([]);
                setEquipoInfo({ marca: '', modelo: '', horometroActual: '' });
                return;
            }
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

    // Búsqueda de Repuestos (Mantenida)
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

    const seleccionarEquipo = (item: any) => {
        setForm({ ...form, placa: item.placaRodaje, horometro: item.horometroMayor || '' });
        setEquipoInfo({ marca: item.marca, modelo: item.modelo, horometroActual: item.horometroMayor });
        setSugerencias([]);
        setIndexSel(-1);
    };

    const seleccionarRepuesto = (rep: any) => {
        setNuevoRepuesto({
            ...nuevoRepuesto,
            id: rep.id,
            descripcion: rep.descripcion_repuesto,
            codigo_almacen: rep.codigo_almacen,
            numero_parte: rep.numero_parte
        });
        setSugerenciasRep([]);
        setIndexSelRep(-1);
    };

    const establecerFechaHoy = () => {
        const hoy = new Date().toISOString().split('T')[0];
        setForm({ ...form, fecha_evento: hoy });
    };

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
            alert("✅ Registro maestro actualizado");
            setNuevoRepuesto({ ...nuevoRepuesto, id: data.id, descripcion: data.descripcion_repuesto });
            setShowNuevoRepForm(false);
            setSugerenciasRep([]);
        }
    };

    if (!showModal) return null;

    return (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm text-left leading-none">
            <div className="bg-[#f7f9fa] w-full max-w-6xl rounded-sm shadow-2xl overflow-hidden flex flex-col border border-[#d3d7d9] max-h-[95vh] animate-in zoom-in-95 duration-200">

                {/* SAP Header Bar */}
                <div className="bg-[#354a5f] p-4 flex justify-between items-center text-white">
                    <div className="flex items-center gap-3">
                        <Wrench size={18} className="text-[#34ebff]" />
                        <h3 className="text-sm font-bold uppercase tracking-widest leading-none">
                            {isEditing ? `Edición de Documento: ${form.placa}` : "Crear Documento Técnico de Mantenimiento"}
                        </h3>
                    </div>
                    <X size={24} className="cursor-pointer hover:bg-white/10 rounded-sm" onClick={() => setShowModal(false)} />
                </div>

                <div className="p-0 overflow-y-auto flex-grow bg-white text-left">
                    {/* SAP Object Header Facets */}
                    <div className="bg-[#fcfdfe] border-b border-[#d3d7d9] p-4 grid grid-cols-1 md:grid-cols-4 gap-4">
                        <FacetItem label="Objeto Técnico" value={form.placa || 'No definido'} icon={<Search size={14} />} />
                        <FacetItem label="Duración (Calculada)" value={`${duracionVisual} h`} icon={<Clock size={14} />} color="text-[#0070b1]" />
                        <FacetItem label="Fecha de Registro" value={form.fecha_evento || '---'} icon={<LucideCalendar size={14} />} />
                        <div className="flex items-center justify-end">
                            <button onClick={establecerFechaHoy} className="text-[10px] font-bold text-[#0070b1] border border-[#0070b1] px-3 py-1 rounded-sm hover:bg-[#e7f0f7] transition-colors uppercase">Fijar Hoy</button>
                        </div>
                    </div>

                    <div className="p-6 grid grid-cols-1 lg:grid-cols-3 gap-8">
                        {/* Columna 1: Equipo */}
                        <div className="space-y-6">
                            <SapSectionTitle title="Datos Maestros de Equipo" icon={<Settings />} />
                            <div className="space-y-4">
                                <div className="space-y-1 relative text-left">
                                    <label className="text-[11px] font-bold text-[#6a6d70] uppercase block leading-none">Unidad (Placa)</label>
                                    <input
                                        ref={inputPlacaRef}
                                        value={form.placa || ''}
                                        placeholder="BUSCAR ACTIVO..."
                                        onChange={(e) => { setForm({ ...form, placa: e.target.value.toUpperCase() }); setIndexSel(-1); }}
                                        onKeyDown={(e) => {
                                            if (e.key === 'ArrowDown') setIndexSel(p => Math.min(p + 1, sugerencias.length - 1));
                                            if (e.key === 'ArrowUp') setIndexSel(p => Math.max(p - 1, -1));
                                            if (e.key === 'Enter' && indexSel >= 0) { seleccionarEquipo(sugerencias[indexSel]); e.preventDefault(); }
                                        }}
                                        className="w-full border border-[#b0b3b5] focus:border-[#0070b1] outline-none p-1.5 text-xs rounded-sm font-bold uppercase"
                                    />
                                    {sugerencias.length > 0 && (
                                        <div className="absolute top-full left-0 right-0 bg-white border border-[#b0b3b5] shadow-2xl z-[60] mt-1 rounded-sm overflow-hidden text-left">
                                            {sugerencias.map((s, i) => (
                                                <div key={i} className={`p-2 cursor-pointer text-[10px] border-b border-[#f2f4f5] ${indexSel === i ? 'bg-[#0070b1] text-white' : 'hover:bg-[#e7f0f7]'}`} onClick={() => seleccionarEquipo(s)}>
                                                    <span className="font-bold">{s.placaRodaje}</span> <span className="ml-2 opacity-70 italic">{s.codigoEquipo}</span>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                                <SapInput label="Lectura Horómetro" type="number" value={form.horometro} onChange={(v: any) => setForm({ ...form, horometro: v })} />
                                <div className="grid grid-cols-2 gap-4">
                                    <SapInput label="Hora Inicio" type="time" value={form.H_inicial} onChange={(v: any) => setForm({ ...form, H_inicial: v })} />
                                    <SapInput label="Hora Término" type="time" value={form.H_final} onChange={(v: any) => setForm({ ...form, H_final: v })} />
                                </div>
                                <SapInput label="Fecha Técnica" type="date" value={form.fecha_evento} onChange={(v: any) => setForm({ ...form, fecha_evento: v })} />
                            </div>
                        </div>

                        {/* Columna 2: Clasificación */}
                        <div className="space-y-6">
                            <SapSectionTitle title="Mantenimiento y Control" icon={<Activity />} />
                            <div className="space-y-4 text-left">
                                <div className="space-y-1 text-left leading-none">
                                    <label className="text-[11px] font-bold text-[#6a6d70] uppercase block">Tipo de Intervención</label>
                                    <select value={form.tipoTrabajo || ""} onChange={(e) => setForm({ ...form, tipoTrabajo: e.target.value })} className="w-full border border-[#b0b3b5] focus:border-[#0070b1] outline-none p-1.5 text-xs rounded-sm font-bold bg-white cursor-pointer uppercase">
                                        <option value="">SELECCIONAR TIPO...</option>
                                        <option value="INSPECCION">🔍 INSPECCION (EQUIPO OPERATIVO)</option>
                                        <option value="MTTO. PREV">🛡️ MTTO. PREVENTIVO (INOPERATIVO)</option>
                                        <option value="MTTO. PROG">📅 MTTO. PROGRAMADO (INOPERATIVO)</option>
                                        <option value="MTTO. CORRECTIVO">🛠️ MTTO. CORRECTIVO (INOPERATIVO)</option>
                                        <option value="ACCIDENTE">⚠️ ACCIDENTE (INOPERATIVO)</option>
                                        <option value="INOPERATIVO">🚫 INOPERATIVO (FUERA DE SERVICIO)</option>
                                    </select>
                                </div>

                                <div className="space-y-1 text-left leading-none">
                                    <label className="text-[11px] font-bold text-[#6a6d70] uppercase block">Sistema Afectado</label>
                                    <select value={especificarSistema ? "OTRO" : (form.sistema || "")} onChange={(e) => { if (e.target.value === "OTRO") { setEspecificarSistema(true); setForm({ ...form, sistema: "" }); } else { setEspecificarSistema(false); setForm({ ...form, sistema: e.target.value }); } }} className="w-full border border-[#b0b3b5] focus:border-[#0070b1] outline-none p-1.5 text-xs rounded-sm font-bold bg-white cursor-pointer uppercase">
                                        <option value="">SELECCIONAR SISTEMA...</option>
                                        <option value="MOTOR">MOTOR</option><option value="TRANSMISIÓN">TRANSMISIÓN</option><option value="SIST. ELÉCTRICO">SIST. ELÉCTRICO</option><option value="HIDRÁULICO">HIDRÁULICO</option><option value="FRENOS">FRENOS</option><option value="ESTRUCTURA">ESTRUCTURA</option><option value="OTRO">➕ ESPECIFICAR OTRO...</option>
                                    </select>
                                </div>
                                {especificarSistema && <input className="w-full border-b-2 border-[#0070b1] outline-none text-xs p-1 bg-[#e7f0f7] font-bold" placeholder="Escriba sistema nuevo..." value={form.sistema} onChange={(e) => setForm({ ...form, sistema: e.target.value.toUpperCase() })} />}

                                <SapInput label="Subsistema / Nodo" value={form.subsistema} onChange={(v: any) => setForm({ ...form, subsistema: v.toUpperCase() })} />
                                <SapInput label="Técnico a Cargo" value={form.tecnico} onChange={(v: any) => setForm({ ...form, tecnico: v.toUpperCase() })} icon={<User size={12} />} />
                            </div>
                        </div>

                        {/* Columna 3: Notas y Repuestos */}
                        <div className="space-y-6">
                            <SapSectionTitle title="Notas y Suministros" icon={<Database />} />
                            <div className="space-y-4">
                                <div>
                                    <label className="text-[11px] font-bold text-[#6a6d70] uppercase block mb-1 leading-none">Informe Detallado</label>
                                    <textarea value={form.evento} onChange={(e) => setForm({ ...form, evento: e.target.value })} className="w-full h-24 border border-[#b0b3b5] p-2 text-xs outline-none focus:border-[#0070b1] resize-none italic bg-[#f9f9f9] text-left" placeholder="Relato técnico del evento..." />
                                </div>

                                <div className="border border-[#d3d7d9] p-3 bg-[#f7f9fa] relative text-left leading-none">
                                    <div className="flex justify-between items-center mb-3">
                                        <span className="text-[10px] font-bold text-[#6a6d70] uppercase">Materiales (BOM)</span>
                                        <button onClick={() => setShowNuevoRepForm(!showNuevoRepForm)} className="text-[9px] font-bold text-[#0070b1] uppercase underline">
                                            {showNuevoRepForm ? "Cerrar" : "+ Maestro de Materiales"}
                                        </button>
                                    </div>

                                    {!showNuevoRepForm ? (
                                        <div className="space-y-2 relative">
                                            <div className="flex gap-1">
                                                <input
                                                    placeholder="Buscar componente..."
                                                    value={nuevoRepuesto.descripcion}
                                                    onChange={(e) => { setNuevoRepuesto({ ...nuevoRepuesto, descripcion: e.target.value.toUpperCase() }); setIndexSelRep(-1); }}
                                                    onKeyDown={(e) => {
                                                        if (e.key === 'ArrowDown') setIndexSelRep(p => Math.min(p + 1, sugerenciasRep.length - 1));
                                                        if (e.key === 'ArrowUp') setIndexSelRep(p => Math.max(p - 1, -1));
                                                        if (e.key === 'Enter' && indexSelRep >= 0) { seleccionarRepuesto(sugerenciasRep[indexSelRep]); e.preventDefault(); }
                                                    }}
                                                    className="flex-grow border border-[#b0b3b5] p-1.5 text-xs outline-none focus:border-[#0070b1] font-bold uppercase"
                                                />
                                                <input type="number" className="w-12 border border-[#b0b3b5] text-center text-xs font-bold" value={nuevoRepuesto.cantidad || 1} onChange={(e) => setNuevoRepuesto({ ...nuevoRepuesto, cantidad: Number(e.target.value) })} />
                                                <button onClick={agregarRepuestoALista} className="bg-[#0070b1] text-white px-2 rounded-sm hover:bg-[#005a8e] transition-colors"><Plus size={16} /></button>
                                            </div>
                                            {sugerenciasRep.length > 0 && (
                                                <div className="absolute top-full left-0 right-0 bg-white border border-[#b0b3b5] shadow-2xl z-50 max-h-32 overflow-y-auto text-left">
                                                    {sugerenciasRep.map((rep, idx) => (
                                                        <div key={idx} className={`p-2 cursor-pointer text-[10px] border-b border-[#f2f4f5] ${indexSelRep === idx ? 'bg-[#0070b1] text-white' : 'hover:bg-[#e7f0f7]'}`} onClick={() => seleccionarRepuesto(rep)}>
                                                            <p className="font-bold uppercase leading-tight">{rep.descripcion_repuesto}</p>
                                                            <p className={`text-[8px] uppercase ${indexSelRep === idx ? 'text-white' : 'text-slate-400'}`}>P/N: {rep.numero_parte} | ALM: {rep.codigo_almacen}</p>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    ) : (
                                        <div className="space-y-2 bg-white p-2 border border-[#b0b3b5] animate-in fade-in duration-300">
                                            <input placeholder="DESCRIPCIÓN *" value={nuevoRepuesto.descripcion} onChange={(e) => setNuevoRepuesto({ ...nuevoRepuesto, descripcion: e.target.value.toUpperCase() })} className="w-full border p-1 text-[10px] outline-none font-bold" />
                                            <div className="grid grid-cols-2 gap-1">
                                                <input placeholder="N° PARTE" value={nuevoRepuesto.numero_parte} onChange={(e) => setNuevoRepuesto({ ...nuevoRepuesto, numero_parte: e.target.value.toUpperCase() })} className="border p-1 text-[10px] font-bold" />
                                                <input placeholder="ALMACÉN" value={nuevoRepuesto.codigo_almacen} onChange={(e) => setNuevoRepuesto({ ...nuevoRepuesto, codigo_almacen: e.target.value.toUpperCase() })} className="border p-1 text-[10px] font-bold" />
                                            </div>
                                            <button onClick={guardarNuevoRepuestoBase} className="w-full bg-[#354a5f] text-white text-[9px] py-1.5 font-bold uppercase tracking-widest">Registrar en Maestro</button>
                                        </div>
                                    )}

                                    <div className="mt-3 space-y-1 max-h-32 overflow-y-auto pr-1">
                                        {repuestos.map((r: any, i: number) => (
                                            <div key={i} className="flex justify-between items-center bg-white border border-[#d3d7d9] p-1.5 rounded-sm shadow-sm animate-in slide-in-from-right-1">
                                                <div className="flex flex-col leading-none">
                                                    <span className="text-[10px] font-bold text-[#32363a] uppercase">{r.cantidad}x {r.descripcion_repuesto || r.descripcion}</span>
                                                    <span className="text-[7px] text-slate-400 font-bold uppercase mt-1">P/N: {r.numero_parte || '---'} | ALM: {r.codigo_almacen || '---'}</span>
                                                </div>
                                                <X size={12} className="text-rose-500 cursor-pointer hover:scale-110" onClick={() => setRepuestos(repuestos.filter((_: any, idx: number) => idx !== i))} />
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Footer Action Bar */}
                <div className="bg-[#f7f9fa] border-t border-[#d3d7d9] p-4 flex justify-between items-center">
                    <div className="flex items-center gap-2">
                        {form.tipoTrabajo && form.tipoTrabajo !== "INSPECCION" && (
                            <div className="flex items-center gap-2 text-amber-600 font-bold text-[10px] uppercase animate-pulse leading-none">
                                <AlertTriangle size={14} /> Estatus de Activo: Inoperativo
                            </div>
                        )}
                    </div>
                    <div className="flex gap-2">
                        <button onClick={() => setShowModal(false)} className="px-6 py-2 border border-[#b0b3b5] text-[#32363a] text-xs font-bold hover:bg-[#ebeef0] rounded-sm transition-all uppercase">Cancelar</button>
                        <button onClick={guardarEvento} disabled={enviando} className={`px-8 py-2 rounded-sm font-bold text-xs uppercase shadow-sm transition-all flex items-center gap-2 ${form.tipoTrabajo && form.tipoTrabajo !== "INSPECCION" ? 'bg-amber-600 hover:bg-amber-700' : 'bg-[#0854a0] hover:bg-[#0a6ed1]'} text-white active:scale-95 disabled:opacity-50`}>
                            {enviando ? <RefreshCw size={14} className="animate-spin" /> : <><Save size={14} /> Post Transaction</>}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

// --- SAP UI HELPERS ---

function SapSectionTitle({ title, icon }: any) {
    return (
        <h3 className="text-[12px] font-bold text-[#6a6d70] uppercase mb-4 border-b border-[#d3d7d9] pb-1 flex items-center gap-2 leading-none text-left">
            <span className="text-[#0070b1]">{icon}</span> {title}
        </h3>
    );
}

function SapInput({ label, value, onChange, placeholder, type = "text", icon }: any) {
    return (
        <div className="space-y-1 relative text-left leading-none">
            <label className="text-[11px] font-bold text-[#6a6d70] uppercase block leading-none">{label}</label>
            <div className="relative">
                {icon && <div className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-300">{icon}</div>}
                <input
                    type={type}
                    value={value || ''}
                    onChange={(e: any) => onChange(e.target.value)}
                    placeholder={placeholder}
                    className={`w-full border border-[#b0b3b5] focus:border-[#0070b1] outline-none p-1.5 text-xs rounded-sm transition-all font-bold ${icon ? 'pl-7' : ''} uppercase`}
                />
            </div>
        </div>
    );
}

function FacetItem({ label, value, icon, color = "text-[#32363a]" }: any) {
    return (
        <div className="border-r border-[#d3d7d9] last:border-0 pr-4 text-left leading-none">
            <p className="text-[10px] font-bold text-[#6a6d70] uppercase mb-1 leading-none">{label}</p>
            <div className={`flex items-center gap-2 font-bold ${color} leading-none`}>
                <span className="opacity-40">{icon}</span>
                <span className="text-xs uppercase">{value}</span>
            </div>
        </div>
    );
}

// ✅ SUBCOMPONENTE SAP SELECT (Corregido TypeScript)
function SapSelect({ label, value, onChange, options }: any) {
    return (
        <div className="space-y-1 text-left leading-none">
            <label className="text-[11px] font-bold text-[#6a6d70] uppercase block leading-none">{label}</label>
            <select
                value={value || ""}
                onChange={(e: any) => onChange(e.target.value)}
                className="w-full border border-[#b0b3b5] focus:border-[#0070b1] outline-none p-1.5 text-xs rounded-sm font-bold bg-white cursor-pointer uppercase"
            >
                <option value="">Seleccione...</option>
                {options.map((o: any) => <option key={o.v} value={o.v}>{o.l}</option>)}
            </select>
        </div>
    );
}