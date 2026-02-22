import { X, Wrench, Plus, Save, Activity, Clock } from 'lucide-react';

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
    if (!showModal) return null;

    return (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
            <div className="bg-white w-full max-w-6xl rounded-[2.5rem] shadow-2xl overflow-hidden p-8 animate-in zoom-in duration-200">

                {/* Cabecera */}
                <div className="flex justify-between items-center mb-6 border-b border-slate-50 pb-4">
                    <div className="flex items-center gap-3">
                        <div className="bg-blue-600 p-2 rounded-xl text-white shadow-lg"><Wrench size={18} /></div>
                        <h3 className="text-lg font-black text-slate-800 uppercase tracking-tight">
                            {isEditing ? `Editando Reporte: ${form.placa}` : "Nuevo Registro Técnico"}
                        </h3>
                    </div>
                    <button onClick={() => setShowModal(false)} className="text-slate-300 hover:text-rose-500 transition-colors">
                        <X size={24} />
                    </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">

                    {/* Columna 1: Equipo y Tiempos */}
                    <div className="space-y-4">
                        <div className="bg-slate-50 p-5 rounded-[1.5rem] border border-slate-100 space-y-4">
                            <div className="grid grid-cols-2 gap-3">
                                <div className="space-y-1">
                                    <label className="text-[9px] font-bold text-blue-600 uppercase ml-1">Placa</label>
                                    <input value={form.placa} readOnly className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-[11px] font-black text-slate-400" />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[9px] font-bold text-blue-600 uppercase ml-1">Horómetro</label>
                                    <input type="number" value={form.horometro} onChange={e => setForm({ ...form, horometro: e.target.value })} className="w-full px-3 py-2 border border-slate-200 rounded-xl text-[11px] font-black font-mono outline-none" />
                                </div>
                            </div>

                            <div className="pt-2 border-t border-slate-200 space-y-3">
                                <p className="text-[9px] font-black text-slate-400 uppercase flex items-center gap-2"><Clock size={12} /> Control de Tiempos</p>
                                <div className="grid grid-cols-2 gap-3">
                                    <div className="space-y-1">
                                        <label className="text-[9px] font-bold text-slate-500 ml-1">H. INICIAL</label>
                                        <input type="time" value={form.H_inicial} onChange={e => setForm({ ...form, H_inicial: e.target.value })} className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-[11px] font-bold outline-none focus:border-blue-500" />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-[9px] font-bold text-slate-500 ml-1">H. FINAL</label>
                                        <input type="time" value={form.H_final} onChange={e => setForm({ ...form, H_final: e.target.value })} className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-[11px] font-bold outline-none focus:border-blue-500" />
                                    </div>
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[9px] font-bold text-slate-500 ml-1">FECHA EVENTO</label>
                                    <input type="date" value={form.fecha_evento} onChange={e => setForm({ ...form, fecha_evento: e.target.value })} className="w-full px-4 py-2 bg-white border border-slate-200 rounded-xl text-[11px] font-bold outline-none" />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Columna 2: Clasificación */}
                    <div className="space-y-4">
                        <div className="space-y-1">
                            <label className="text-[9px] font-bold text-slate-400 uppercase ml-1">Tipo de Trabajo</label>
                            <select
                                value={form.tipoTrabajo || ""}
                                onChange={e => setForm({ ...form, tipoTrabajo: e.target.value })}
                                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-100 rounded-xl text-[11px] font-black outline-none focus:bg-white focus:border-blue-500 transition-all"
                            >
                                <option value="">SELECCIONAR TIPO...</option>
                                <option value="INSPECCION">INSPECCION</option>
                                <option value="MTTO. PREV">MTTO. PREV.</option>
                                <option value="MTTO. PROG">MTTO. PROG.</option>
                                <option value="MTTO. CORRECTIVO">MTTO. CORRECTIVO</option>
                                <option value="ACCIDENTE">ACCIDENTE</option>
                            </select>
                        </div>

                        <div className="space-y-1">
                            <label className="text-[9px] font-bold text-slate-400 uppercase ml-1">Sistema</label>
                            <select
                                value={especificarSistema ? "OTRO" : form.sistema}
                                onChange={e => {
                                    if (e.target.value === "OTRO") { setEspecificarSistema(true); setForm({ ...form, sistema: "" }); }
                                    else { setEspecificarSistema(false); setForm({ ...form, sistema: e.target.value }); }
                                }}
                                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-100 rounded-xl text-[11px] font-black outline-none"
                            >
                                <option value="">SISTEMA...</option>
                                <option value="MOTOR">MOTOR</option>
                                <option value="TRANSMISIÓN">TRANSMISIÓN</option>
                                <option value="SIST. ELÉCTRICO">SIST. ELÉCTRICO</option>
                                <option value="HIDRÁULICO">HIDRÁULICO</option>
                                <option value="FRENOS">FRENOS</option>
                                <option value="ESTRUCTURA">ESTRUCTURA</option>
                                <option value="OTRO">➕ OTRO...</option>
                            </select>
                        </div>

                        {especificarSistema && <input placeholder="SISTEMA NUEVO" autoFocus value={form.sistema} onChange={e => setForm({ ...form, sistema: e.target.value.toUpperCase() })} className="w-full px-4 py-2 bg-blue-50 border border-blue-200 rounded-xl text-[11px] font-black text-blue-700 outline-none" />}

                        <div className="space-y-1">
                            <label className="text-[9px] font-bold text-slate-400 uppercase ml-1">Subsistema</label>
                            <input placeholder="Ej. INYECTORES, BOMBA..." value={form.subsistema} onChange={e => setForm({ ...form, subsistema: e.target.value.toUpperCase() })} className="w-full px-4 py-2 bg-slate-50 border border-slate-100 rounded-xl text-[11px] font-bold outline-none focus:bg-white" />
                        </div>

                        <div className="space-y-1">
                            <label className="text-[9px] font-bold text-slate-400 uppercase ml-1">Técnico</label>
                            <input placeholder="NOMBRE DEL TÉCNICO" value={form.tecnico} onChange={e => setForm({ ...form, tecnico: e.target.value.toUpperCase() })} className="w-full px-4 py-2 bg-slate-50 border border-slate-100 rounded-xl text-[11px] font-bold outline-none focus:bg-white" />
                        </div>
                    </div>

                    {/* Columna 3: Relato y Repuestos */}
                    <div className="flex flex-col space-y-4">
                        <div className="space-y-1">
                            <label className="text-[9px] font-bold text-slate-400 uppercase ml-1">Descripción del Evento</label>
                            <textarea value={form.evento} onChange={e => setForm({ ...form, evento: e.target.value })} className="w-full h-[100px] p-4 bg-slate-50 border border-slate-100 rounded-[1.5rem] text-[11px] italic resize-none outline-none focus:bg-white" placeholder="Relato detallado..." />
                        </div>

                        <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                            <p className="text-[9px] font-black text-slate-400 uppercase mb-2">Repuestos</p>
                            <div className="flex gap-2 mb-2">
                                <input placeholder="Repuesto" value={nuevoRepuesto.descripcion} onChange={e => setNuevoRepuesto({ ...nuevoRepuesto, descripcion: e.target.value })} className="flex-grow px-3 py-2 bg-white border border-slate-200 rounded-lg text-[10px] font-bold outline-none" />
                                <input type="number" className="w-12 px-1 py-2 bg-white border border-slate-200 rounded-lg text-[10px] font-bold text-center" value={nuevoRepuesto.cantidad} onChange={e => setNuevoRepuesto({ ...nuevoRepuesto, cantidad: Number(e.target.value) })} />
                                <button onClick={agregarRepuestoALista} className="p-2 bg-blue-600 text-white rounded-lg"><Plus size={14} /></button>
                            </div>
                            <div className="max-h-20 overflow-y-auto space-y-1 pr-1 custom-scrollbar">
                                {repuestos.map((r: any, i: number) => (
                                    <div key={i} className="flex justify-between items-center bg-white p-2 rounded-md border border-slate-100 text-[9px] font-black uppercase shadow-sm">
                                        <span>{r.cantidad}x {r.descripcion}</span>
                                        <button onClick={() => setRepuestos(repuestos.filter((_: any, idx: number) => idx !== i))} className="text-rose-400"><X size={12} /></button>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <button onClick={guardarEvento} disabled={enviando} className="w-full bg-[#0F172A] text-white py-4 rounded-xl font-black uppercase text-[10px] tracking-widest shadow-lg flex items-center justify-center gap-2 hover:bg-black transition-all disabled:opacity-50">
                            {enviando ? <Activity className="animate-spin" size={14} /> : <><Save size={14} /> {isEditing ? "ACTUALIZAR" : "GUARDAR REPORTE"}</>}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};