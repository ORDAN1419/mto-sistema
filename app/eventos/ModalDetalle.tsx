import { X, FileText, CheckCircle, Edit3, Trash2, Activity, Package, Clock, Settings, MapPin } from 'lucide-react';

const ModalDetalle = ({
    verEvento,
    setVerEvento,
    darAltaEquipo,
    actualizandoEstatus,
    prepararEdicion,
    eliminarRegistro,
    repuestosCargados
}: any) => {
    if (!verEvento) return null;

    return (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md">
            <div className="bg-white w-full max-w-5xl rounded-[2.5rem] shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200 border border-slate-200">

                {/* 1. Cabecera con Badge de Estatus */}
                <div className="flex justify-between items-center p-6 bg-slate-50 border-b border-slate-100">
                    <div className="flex items-center gap-4">
                        <div className="bg-blue-600 p-3 rounded-2xl text-white shadow-blue-200 shadow-lg">
                            <FileText size={24} />
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <h2 className="text-2xl font-black text-slate-800 uppercase tracking-tighter">{verEvento.placa}</h2>
                                <span className={`px-2 py-0.5 rounded-md text-[9px] font-black uppercase ${verEvento.tipoTrabajo === 'MTTO. CORRECTIVO' ? 'bg-rose-100 text-rose-600' : 'bg-blue-100 text-blue-600'}`}>
                                    {verEvento.tipoTrabajo}
                                </span>
                            </div>
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest italic flex items-center gap-1">
                                <Clock size={10} /> Registrado el {new Date(verEvento.fecha_evento).toLocaleDateString()}
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                        <button
                            onClick={darAltaEquipo}
                            disabled={actualizandoEstatus}
                            className="flex items-center gap-2 px-5 py-2.5 bg-emerald-500 text-white rounded-xl font-black text-[10px] uppercase hover:bg-emerald-600 transition-all shadow-lg shadow-emerald-100 disabled:opacity-50"
                        >
                            {actualizandoEstatus ? <Activity size={14} className="animate-spin" /> : <CheckCircle size={14} />}
                            Dar de Alta
                        </button>
                        <div className="h-8 w-[1px] bg-slate-200 mx-2" />
                        <button onClick={prepararEdicion} className="p-2.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all" title="Editar"><Edit3 size={20} /></button>
                        <button onClick={() => eliminarRegistro(verEvento.id)} className="p-2.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all" title="Eliminar"><Trash2 size={20} /></button>
                        <button onClick={() => setVerEvento(null)} className="p-2.5 text-slate-400 hover:text-slate-800 transition-all"><X size={26} /></button>
                    </div>
                </div>

                <div className="p-8">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">

                        {/* Columna Izquierda: Detalles Técnicos */}
                        <div className="space-y-6">
                            <section>
                                <h3 className="text-[11px] font-black text-slate-800 uppercase mb-4 flex items-center gap-2">
                                    <Settings size={14} className="text-blue-500" /> Componentes
                                </h3>
                                <div className="space-y-3">
                                    <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                                        <p className="text-[9px] font-bold text-slate-400 uppercase">Sistema</p>
                                        <p className="text-xs font-black text-slate-700">{verEvento.sistema || 'NO ESPECIFICADO'}</p>
                                    </div>
                                    <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                                        <p className="text-[9px] font-bold text-slate-400 uppercase">Subsistema</p>
                                        <p className="text-xs font-black text-slate-700">{verEvento.subsistema || '---'}</p>
                                    </div>
                                    <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                                        <p className="text-[9px] font-bold text-slate-400 uppercase">Técnico Responsable</p>
                                        <div className="flex items-center gap-2 mt-1">
                                            <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center text-[10px] font-bold text-blue-600 text-center">
                                                {verEvento.tecnico?.charAt(0).toUpperCase()}
                                            </div>
                                            <p className="text-xs font-black text-slate-700">{verEvento.tecnico || 'PENDIENTE'}</p>
                                        </div>
                                    </div>
                                </div>
                            </section>
                        </div>

                        {/* Columna Central: Tiempos y Uso */}
                        <div className="space-y-6">
                            <section>
                                <h3 className="text-[11px] font-black text-slate-800 uppercase mb-4 flex items-center gap-2">
                                    <Activity size={14} className="text-blue-500" /> Rendimiento y Horas
                                </h3>
                                <div className="grid grid-cols-2 gap-3 mb-3">
                                    <div className="bg-blue-50/50 p-3 rounded-xl border border-blue-100">
                                        <p className="text-[9px] font-bold text-blue-600 uppercase">Horómetro</p>
                                        <p className="text-lg font-black text-blue-700 font-mono">{verEvento.horometro}</p>
                                    </div>
                                    <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                                        <p className="text-[9px] font-bold text-slate-400 uppercase">Duración</p>
                                        <p className="text-lg font-black text-slate-700 font-mono">{verEvento.duracion}h</p>
                                    </div>
                                </div>
                                <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 space-y-3">
                                    <div className="flex justify-between items-center text-[10px]">
                                        <span className="text-slate-400 font-bold uppercase">Hora Inicio:</span>
                                        <span className="font-black text-slate-700">{verEvento.H_inicial || '--:--'}</span>
                                    </div>
                                    <div className="flex justify-between items-center text-[10px]">
                                        <span className="text-slate-400 font-bold uppercase">Hora Final:</span>
                                        <span className="font-black text-slate-700">{verEvento.H_final || '--:--'}</span>
                                    </div>
                                    <div className="pt-2 border-t border-slate-200 flex justify-between items-center text-[10px]">
                                        <span className="text-slate-400 font-bold uppercase flex items-center gap-1"><MapPin size={10} /> Ubicación:</span>
                                        <span className="font-black text-slate-700">{verEvento.ubic || 'PATIO CENTRAL'}</span>
                                    </div>
                                </div>
                            </section>
                        </div>

                        {/* Columna Derecha: Repuestos */}
                        <div className="space-y-6">
                            <section className="h-full flex flex-col">
                                <h3 className="text-[11px] font-black text-slate-800 uppercase mb-4 flex items-center gap-2">
                                    <Package size={14} className="text-blue-500" /> Repuestos Utilizados
                                </h3>
                                <div className="flex-grow bg-slate-50/50 rounded-2xl border border-dashed border-slate-200 p-4 max-h-[250px] overflow-y-auto custom-scrollbar">
                                    {repuestosCargados && repuestosCargados.length > 0 ? (
                                        <div className="space-y-2">
                                            {repuestosCargados.map((r: any, i: number) => (
                                                <div
                                                    key={i}
                                                    className="flex justify-between bg-white p-3 rounded-xl border border-slate-100 shadow-sm animate-in slide-in-from-right-2 duration-300"
                                                    style={{
                                                        animationDelay: `${i * 50}ms`,
                                                        animationFillMode: 'both'
                                                    }}
                                                >
                                                    <span className="text-[10px] font-bold text-slate-700 uppercase leading-tight">{r.descripcion}</span>
                                                    <span className="bg-blue-600 text-white px-2 py-0.5 rounded-lg text-[10px] font-black ml-2">x{r.cantidad}</span>
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <div className="h-full flex flex-col items-center justify-center text-slate-300 py-10">
                                            <Package size={30} strokeWidth={1} />
                                            <p className="text-[9px] font-bold uppercase mt-2 tracking-tighter">Sin materiales</p>
                                        </div>
                                    )}
                                </div>
                            </section>
                        </div>
                    </div>

                    {/* Descripción Ampliada al final */}
                    <div className="mt-8 pt-6 border-t border-slate-100">
                        <h3 className="text-[11px] font-black text-slate-800 uppercase mb-3 tracking-widest">Relato Detallado del Evento</h3>
                        <div className="bg-blue-50/30 p-6 rounded-[2rem] border border-blue-50 relative">
                            <p className="text-sm text-slate-600 italic leading-relaxed whitespace-pre-wrap relative z-10">
                                "{verEvento.evento}"
                            </p>
                            <span className="absolute top-2 left-4 text-6xl text-blue-100 font-serif opacity-50 select-none">“</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ModalDetalle;