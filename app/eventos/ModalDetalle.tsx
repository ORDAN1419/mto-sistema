import {
    X, FileText, CheckCircle, Edit3, Trash2, Activity, Package,
    Clock, Settings, MapPin, Hash, Inbox, PenTool, User, Wrench,
    Truck, Calendar, RefreshCw // ✅ Íconos faltantes agregados
} from 'lucide-react';

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
            {/* SAP S/4HANA Container */}
            <div className="bg-[#f7f9fa] w-full max-w-5xl rounded-sm shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200 border border-[#d3d7d9]">

                {/* SAP Dynamic Page Header */}
                <div className="bg-white border-b border-[#d3d7d9] p-6">
                    <div className="flex justify-between items-start">
                        <div className="flex gap-5">
                            {/* Avatar del objeto técnico */}
                            <div className="bg-[#eff4f9] w-16 h-16 rounded-sm border border-[#b0b3b5] flex items-center justify-center text-[#0070b1]">
                                <Truck size={32} />
                            </div>
                            <div className="space-y-1">
                                <div className="flex items-center gap-3">
                                    <h2 className="text-2xl font-light text-[#32363a] uppercase tracking-tight">
                                        {verEvento.placa}
                                    </h2>
                                    <span className={`px-2 py-0.5 rounded-sm text-[10px] font-bold border ${verEvento.tipoTrabajo === 'MTTO. CORRECTIVO'
                                        ? 'bg-rose-50 text-rose-700 border-rose-200'
                                        : 'bg-[#e7f0f7] text-[#0070b1] border-[#b0ccf0]'
                                        }`}>
                                        {verEvento.tipoTrabajo}
                                    </span>
                                </div>
                                <div className="flex items-center gap-4 text-[#6a6d70] text-[11px] font-medium uppercase tracking-wider">
                                    <span className="flex items-center gap-1.5 text-left"><Calendar size={12} /> {new Date(verEvento.fecha_evento).toLocaleDateString()}</span>
                                    <span className="w-px h-3 bg-[#d3d7d9]"></span>
                                    <span className="flex items-center gap-1.5 text-left"><Clock size={12} /> ID LOG: {verEvento.id?.slice(0, 8)}</span>
                                </div>
                            </div>
                        </div>

                        {/* SAP Action Bar */}
                        <div className="flex items-center gap-2">
                            <button
                                onClick={darAltaEquipo}
                                disabled={actualizandoEstatus}
                                className="flex items-center gap-2 px-4 py-2 bg-[#0854a0] hover:bg-[#0a6ed1] text-white rounded-sm font-bold text-xs uppercase transition-all shadow-sm disabled:opacity-50"
                            >
                                {actualizandoEstatus ? <RefreshCw size={14} className="animate-spin" /> : <CheckCircle size={14} />}
                                Finalizar Intervención
                            </button>
                            <div className="h-8 w-[1px] bg-[#d3d7d9] mx-2" />
                            <button onClick={prepararEdicion} className="p-2 text-[#0070b1] hover:bg-[#eff4f9] rounded-sm transition-all border border-transparent hover:border-[#b0ccf0]" title="Editar"><Edit3 size={18} /></button>
                            <button onClick={() => eliminarRegistro(verEvento.id)} className="p-2 text-rose-600 hover:bg-rose-50 rounded-sm transition-all" title="Eliminar"><Trash2 size={18} /></button>
                            <button onClick={() => setVerEvento(null)} className="ml-2 p-2 text-[#32363a] hover:bg-[#f2f2f2] rounded-sm transition-all"><X size={22} /></button>
                        </div>
                    </div>
                </div>

                {/* SAP Content Area */}
                <div className="p-0 overflow-y-auto max-h-[75vh]">

                    {/* Header Facets */}
                    <div className="grid grid-cols-4 border-b border-[#d3d7d9] bg-white">
                        <FacetItem label="Lectura Horómetro" value={`${verEvento.horometro} h`} icon={<Activity size={14} />} color="text-[#0070b1]" />
                        <FacetItem label="Duración Real" value={`${verEvento.duracion} h`} icon={<Clock size={14} />} />
                        <FacetItem label="Técnico a Cargo" value={verEvento.tecnico || 'N/A'} icon={<User size={14} />} />
                        <FacetItem label="Emplazamiento" value={verEvento.ubic || 'PATIO'} icon={<MapPin size={14} />} />
                    </div>

                    <div className="p-8 grid grid-cols-1 lg:grid-cols-3 gap-8">

                        <div className="space-y-6">
                            <section>
                                <h3 className="text-[12px] font-bold text-[#6a6d70] uppercase mb-4 border-b border-[#d3d7d9] pb-2 text-left leading-none">Estructura Técnica</h3>
                                <div className="space-y-4">
                                    <SapDataField label="Sistema / Conjunto" value={verEvento.sistema} icon={<Settings />} />
                                    <SapDataField label="Subsistema / Nodo" value={verEvento.subsistema} icon={<Wrench />} />
                                    <div className="pt-4 text-left">
                                        <label className="text-[11px] font-bold text-[#6a6d70] uppercase block mb-2 leading-none">Ventana de Tiempo</label>
                                        <div className="flex gap-4">
                                            <div className="flex-1 bg-white border border-[#d3d7d9] p-2 rounded-sm text-center">
                                                <span className="text-[9px] text-slate-400 block uppercase font-bold leading-none mb-1">Inicio</span>
                                                <span className="text-xs font-mono font-bold text-slate-700 leading-none">{verEvento.H_inicial || '--:--'}</span>
                                            </div>
                                            <div className="flex-1 bg-white border border-[#d3d7d9] p-2 rounded-sm text-center">
                                                <span className="text-[9px] text-slate-400 block uppercase font-bold leading-none mb-1">Término</span>
                                                <span className="text-xs font-mono font-bold text-slate-700 leading-none">{verEvento.H_final || '--:--'}</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </section>
                        </div>

                        <div className="lg:col-span-2 space-y-6">
                            <section>
                                <h3 className="text-[12px] font-bold text-[#6a6d70] uppercase mb-4 border-b border-[#d3d7d9] pb-2 flex justify-between items-center leading-none">
                                    <span>Lista de Materiales y Repuestos</span>
                                    <span className="text-[10px] bg-[#eff4f9] text-[#0070b1] px-2 py-0.5 rounded-full border border-[#b0ccf0]">Items: {repuestosCargados?.length || 0}</span>
                                </h3>

                                <div className="bg-white border border-[#d3d7d9] min-h-[150px]">
                                    {repuestosCargados && repuestosCargados.length > 0 ? (
                                        <table className="w-full text-left text-xs border-collapse">
                                            <thead className="bg-[#f2f4f5] text-[#6a6d70] border-b border-[#d3d7d9] font-bold uppercase text-[10px]">
                                                <tr>
                                                    <th className="p-3 text-left">Descripción Material</th>
                                                    <th className="p-3 text-left">N° Parte</th>
                                                    <th className="p-3 text-left">Almacén</th>
                                                    <th className="p-3 text-right">Cant.</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-[#ebeef0]">
                                                {repuestosCargados.map((r: any, i: number) => (
                                                    <tr key={i} className="hover:bg-[#f7f9fa] transition-colors">
                                                        <td className="p-3 font-bold text-[#32363a] uppercase text-left leading-tight">{r.descripcion_repuesto || r.descripcion}</td>
                                                        <td className="p-3 font-mono text-slate-500 text-left leading-none">{r.numero_parte || 'N/A'}</td>
                                                        <td className="p-3 font-medium text-left leading-none">{r.codigo_almacen || '---'}</td>
                                                        <td className="p-3 text-right leading-none"><span className="bg-[#e7f0f7] text-[#0070b1] px-2 py-1 rounded-sm font-black">x{r.cantidad}</span></td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    ) : (
                                        <div className="py-12 flex flex-col items-center justify-center text-slate-400 opacity-60">
                                            <Package size={32} strokeWidth={1} />
                                            <span className="text-[10px] font-bold uppercase mt-2">No se han registrado movimientos de mercancía</span>
                                        </div>
                                    )}
                                </div>
                            </section>

                            <section>
                                <h3 className="text-[12px] font-bold text-[#6a6d70] uppercase mb-4 border-b border-[#d3d7d9] pb-2 text-left leading-none">Diagnóstico Técnico del Evento</h3>
                                <div className="bg-[#f2f4f5] p-5 border-l-4 border-[#0070b1] relative text-left">
                                    <p className="text-sm text-[#32363a] leading-relaxed whitespace-pre-wrap font-medium">
                                        {verEvento.evento}
                                    </p>
                                    <PenTool className="absolute bottom-2 right-2 text-slate-300 opacity-20" size={24} />
                                </div>
                            </section>
                        </div>
                    </div>
                </div>

                {/* SAP Footer Bar */}
                <div className="bg-[#354a5f] p-2 px-6 flex justify-between items-center text-white/60 text-[10px] font-mono tracking-tighter">
                    <span>STATUS: {verEvento.isAlta ? 'DOCUMENTO CERRADO' : 'INTERVENCIÓN ABIERTA'}</span>
                    <span>SISTEMA DE GESTIÓN DE ACTIVOS 2026</span>
                </div>
            </div>
        </div>
    );
};

// --- SAP Sub-components ---

function FacetItem({ label, value, icon, color = "text-[#32363a]" }: any) {
    return (
        <div className="p-4 border-r border-[#d3d7d9] last:border-0 hover:bg-[#f7f9fa] transition-colors text-left">
            <p className="text-[10px] font-bold text-[#6a6d70] uppercase mb-1 leading-none">{label}</p>
            <div className={`flex items-center gap-2 font-bold ${color} leading-none`}>
                <span className="opacity-50">{icon}</span>
                <span className="text-sm truncate uppercase">{value}</span>
            </div>
        </div>
    )
}

function SapDataField({ label, value, icon }: any) {
    return (
        <div className="flex items-start gap-3 text-left">
            <div className="text-slate-300 mt-1">{icon}</div>
            <div>
                <label className="text-[10px] font-bold text-[#6a6d70] uppercase block leading-none mb-1">{label}</label>
                <p className="text-xs font-black text-[#32363a] uppercase leading-tight">{value || 'No especificado'}</p>
            </div>
        </div>
    )
}

export default ModalDetalle;