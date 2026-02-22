import { X, FileText, CheckCircle, Edit3, Trash2, Activity, Package } from 'lucide-react';

// 1. Definimos el componente como una constante normal
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
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
            <div className="bg-white w-full max-w-4xl rounded-[2rem] shadow-2xl overflow-hidden p-8 animate-in fade-in zoom-in duration-200">
                <div className="flex justify-between items-start mb-6">
                    <div className="flex items-center gap-4">
                        <div className="bg-blue-600 p-2.5 rounded-xl text-white shadow-lg"><FileText size={20} /></div>
                        <div>
                            <h2 className="text-xl font-black text-slate-800 uppercase tracking-tighter">{verEvento.placa}</h2>
                            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest italic">Reporte Técnico</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={darAltaEquipo}
                            disabled={actualizandoEstatus}
                            className="flex items-center gap-2 px-4 py-2 bg-emerald-50 text-emerald-600 rounded-xl font-black text-[9px] uppercase hover:bg-emerald-600 hover:text-white transition-all disabled:opacity-50"
                        >
                            {actualizandoEstatus ? <Activity size={12} className="animate-spin" /> : <CheckCircle size={14} />}
                            Dar de Alta
                        </button>
                        <button onClick={prepararEdicion} className="p-2 text-slate-300 hover:text-blue-600 transition-colors"><Edit3 size={18} /></button>
                        <button onClick={() => eliminarRegistro(verEvento.id)} className="p-2 text-slate-300 hover:text-rose-600 transition-colors"><Trash2 size={18} /></button>
                        <button onClick={() => setVerEvento(null)} className="p-2 text-slate-300 hover:text-slate-600 transition-colors"><X size={22} /></button>
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-4 mb-6 text-center">
                    <div className="bg-slate-50/50 p-4 rounded-2xl border border-slate-100">
                        <p className="text-[9px] font-bold text-blue-600 uppercase mb-1 tracking-widest">Horómetro</p>
                        <p className="text-xl font-black text-slate-700 font-mono">{verEvento.horometro} HRS</p>
                    </div>
                    <div className="bg-slate-50/50 p-4 rounded-2xl border border-slate-100">
                        <p className="text-[9px] font-bold text-blue-600 uppercase mb-1 tracking-widest">Ubicación</p>
                        <p className="text-sm font-black text-slate-700 uppercase">{verEvento.ubic || '---'}</p>
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-6 mb-6">
                    <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm">
                        <p className="text-[9px] font-bold text-slate-400 uppercase mb-3 border-b pb-2 tracking-tight">Intervención: {verEvento.sistema}</p>
                        <p className="text-xs text-slate-500 italic leading-relaxed whitespace-pre-wrap">"{verEvento.evento}"</p>
                    </div>
                    <div className="bg-slate-50/30 border border-slate-100 rounded-2xl p-5">
                        <p className="text-[9px] font-black text-slate-400 uppercase mb-3 flex items-center gap-2">
                            <Package size={14} /> Repuestos Utilizados
                        </p>
                        <div className="space-y-2 max-h-[140px] overflow-y-auto pr-2 custom-scrollbar">
                            {repuestosCargados && repuestosCargados.length > 0 ? (
                                repuestosCargados.map((r: any, i: number) => (
                                    <div key={i} className="flex justify-between bg-white p-2 rounded-lg border border-slate-100 text-[10px] shadow-sm">
                                        <span className="font-bold text-slate-700 uppercase">{r.descripcion}</span>
                                        <span className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded font-black">x{r.cantidad}</span>
                                    </div>
                                ))
                            ) : (
                                <p className="text-[9px] text-slate-300 italic text-center py-6 uppercase font-bold tracking-widest">Sin repuestos registrados</p>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

// 2. EXPORTACIÓN POR DEFECTO (Esto soluciona el error de Build)
export default ModalDetalle;