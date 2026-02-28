import { ChevronRight, Activity, Calendar, Hash, Wrench, User, ExternalLink } from 'lucide-react';

interface RegistroEvento {
    id: string;
    fecha_evento: string;
    placa: string;
    sistema: string;
    subsistema: string;
    horometro: number | string;
    tecnico: string;
    tipoTrabajo: string;
}

export const TablaEventos = ({ registros, cargando, onVerDetalle }: any) => {

    const formatearFechaSinSalto = (fechaStr: string) => {
        if (!fechaStr) return "---";
        const soloFecha = fechaStr.split('T')[0];
        const partes = soloFecha.split('-');
        if (partes.length !== 3) return fechaStr;
        return `${partes[2]}/${partes[1]}/${partes[0]}`;
    };

    // ✅ Colores semánticos estándar de SAP Fiori
    const getEstiloTipo = (tipo: string) => {
        const t = tipo?.toUpperCase();
        if (t.includes('CORRECTIVO') || t.includes('ACCIDENTE')) return 'bg-[#fff4f4] text-[#bb0000] border-[#ffbbbb]'; // Error/Negative
        if (t.includes('PREVENTIVO') || t.includes('PROGRAMADO')) return 'bg-[#fff8f0] text-[#e6600d] border-[#f3d3b6]'; // Warning/Critical
        if (t.includes('INSPECCION') || t.includes('INSPECCIÓN')) return 'bg-[#f5faff] text-[#0064d1] border-[#b0ccf0]'; // Information/Neutral
        return 'bg-[#f4f4f4] text-[#6a6d70] border-[#d3d7d9]';
    };

    if (cargando) return (
        <div className="flex flex-col items-center justify-center py-20 space-y-3 bg-white">
            <div className="h-10 w-10 border-4 border-[#ebedee] border-t-[#0070b1] rounded-full animate-spin"></div>
            <p className="text-[11px] font-bold text-[#6a6d70] uppercase tracking-wider">Cargando datos maestros...</p>
        </div>
    );

    return (
        <div className="overflow-x-auto bg-white border border-[#d3d7d9]">
            <table className="w-full border-collapse text-left">
                <thead>
                    <tr className="bg-[#f2f4f5] border-b border-[#d3d7d9] text-[10px] font-bold text-[#6a6d70] uppercase tracking-tight">
                        <th className="px-4 py-3 border-r border-[#d3d7d9] w-28">
                            <div className="flex items-center gap-2"><Calendar size={12} /> Fecha</div>
                        </th>
                        <th className="px-4 py-3 border-r border-[#d3d7d9] w-32">
                            <div className="flex items-center gap-2"><Hash size={12} /> Objeto Tecn.</div>
                        </th>
                        <th className="px-4 py-3 border-r border-[#d3d7d9]">
                            <div className="flex items-center gap-2"><Wrench size={12} /> Sistema / Conjunto</div>
                        </th>
                        <th className="px-4 py-3 border-r border-[#d3d7d9] w-40">
                            <div className="flex items-center gap-2"><Activity size={12} /> Categoría</div>
                        </th>
                        <th className="px-4 py-3 border-r border-[#d3d7d9] w-28 text-right">
                            <div className="flex items-center justify-end gap-2"><Activity size={12} /> Lectura</div>
                        </th>
                        <th className="px-4 py-3 w-20 text-center text-[#0070b1]">Acción</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-[#ebeef0]">
                    {registros.length === 0 ? (
                        <tr>
                            <td colSpan={6} className="text-center py-16">
                                <p className="text-xs font-medium text-[#6a6d70] italic">No se han encontrado documentos para los criterios seleccionados</p>
                            </td>
                        </tr>
                    ) : (
                        registros.map((item: RegistroEvento) => (
                            <tr
                                key={item.id}
                                className="group hover:bg-[#f7f9fa] transition-colors duration-150"
                            >
                                <td className="px-4 py-2 border-r border-[#ebeef0]">
                                    <span className="text-[11px] font-mono text-[#32363a]">
                                        {formatearFechaSinSalto(item.fecha_evento)}
                                    </span>
                                </td>

                                <td className="px-4 py-2 border-r border-[#ebeef0]">
                                    <span className="text-[11px] font-bold text-[#0070b1] hover:underline cursor-default">
                                        {item.placa}
                                    </span>
                                </td>

                                <td className="px-4 py-2 border-r border-[#ebeef0]">
                                    <div className="flex flex-col leading-tight">
                                        <span className="text-[11px] font-bold text-[#32363a] uppercase">
                                            {item.sistema}
                                        </span>
                                        <span className="text-[10px] text-[#6a6d70] italic">
                                            {item.subsistema || 'General'}
                                        </span>
                                    </div>
                                </td>

                                <td className="px-4 py-2 border-r border-[#ebeef0]">
                                    <span className={`inline-block px-2 py-0.5 rounded-sm text-[9px] font-bold border uppercase tracking-tight ${getEstiloTipo(item.tipoTrabajo)}`}>
                                        {item.tipoTrabajo || '---'}
                                    </span>
                                </td>

                                <td className="px-4 py-2 border-r border-[#ebeef0] text-right">
                                    <div className="flex flex-col items-end">
                                        <span className="text-[11px] font-mono font-bold text-[#32363a]">
                                            {item.horometro}
                                        </span>
                                        <span className="text-[8px] font-bold text-[#6a6d70]">HRS</span>
                                    </div>
                                </td>

                                <td className="px-2 py-2 text-center">
                                    <button
                                        onClick={() => onVerDetalle(item)}
                                        className="p-1.5 text-[#0070b1] hover:bg-[#e7f0f7] border border-transparent hover:border-[#b0ccf0] rounded-sm transition-all active:bg-[#d0e1f3]"
                                        title="Abrir detalles del documento"
                                    >
                                        <ExternalLink size={16} />
                                    </button>
                                </td>
                            </tr>
                        ))
                    )}
                </tbody>
            </table>
            {/* Footer técnico SAP */}
            <div className="bg-[#f2f4f5] px-4 py-1 border-t border-[#d3d7d9] flex justify-between items-center text-[9px] font-bold text-[#6a6d70] uppercase">
                <span>Total de registros: {registros.length}</span>
                <span>Sistema Cloud Synchronized</span>
            </div>
        </div>
    );
};