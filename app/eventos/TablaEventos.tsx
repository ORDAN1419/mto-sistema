import { ChevronRight, Activity, Calendar, Hash, Wrench, User } from 'lucide-react';

interface RegistroEvento {
    id: string;
    fecha_evento: string;
    placa: string;
    sistema: string;
    subsistema: string;
    horometro: number | string;
    tecnico: string;
    tipoTrabajo: string; // ✅ Mantenemos la propiedad
}

export const TablaEventos = ({ registros, cargando, onVerDetalle }: any) => {

    const formatearFechaSinSalto = (fechaStr: string) => {
        if (!fechaStr) return "---";
        const soloFecha = fechaStr.split('T')[0];
        const partes = soloFecha.split('-');
        if (partes.length !== 3) return fechaStr;
        return `${partes[2]}/${partes[1]}/${partes[0]}`;
    };

    // ✅ Función para colores dinámicos del Tipo de Trabajo
    const getEstiloTipo = (tipo: string) => {
        const t = tipo?.toUpperCase();
        if (t === 'CORRECTIVO') return 'bg-red-50 text-red-600 border-red-100';
        if (t === 'PREVENTIVO') return 'bg-amber-50 text-amber-600 border-amber-100';
        if (t === 'INSPECCION' || t === 'INSPECCIÓN') return 'bg-blue-50 text-blue-600 border-blue-100';
        return 'bg-slate-50 text-slate-600 border-slate-100';
    };

    if (cargando) return (
        <div className="flex flex-col items-center justify-center py-24 space-y-4">
            <div className="relative">
                <div className="h-12 w-12 border-4 border-blue-100 border-t-blue-600 rounded-full animate-spin"></div>
                <Activity className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-blue-600" size={20} />
            </div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Sincronizando registros...</p>
        </div>
    );

    return (
        <div className="overflow-x-auto">
            <table className="w-full border-separate border-spacing-y-3 px-2">
                <thead>
                    <tr className="text-[10px] font-black text-slate-400 uppercase tracking-[0.15em]">
                        <th className="px-6 py-4 text-left">
                            <div className="flex items-center gap-2"><Calendar size={12} /> Fecha</div>
                        </th>
                        <th className="px-6 py-4 text-left">
                            <div className="flex items-center gap-2"><Hash size={12} /> Unidad</div>
                        </th>
                        <th className="px-6 py-4 text-left">
                            <div className="flex items-center gap-2"><Wrench size={12} /> Sistema / Componente</div>
                        </th>
                        {/* ✅ NUEVA COLUMNA: TIPO */}
                        <th className="px-6 py-4 text-left">
                            <div className="flex items-center gap-2"><Activity size={12} /> Tipo</div>
                        </th>
                        <th className="px-6 py-4 text-left">
                            <div className="flex items-center gap-2"><Activity size={12} /> Uso</div>
                        </th>
                        <th className="px-6 py-4 text-right">Acción</th>
                    </tr>
                </thead>
                <tbody>
                    {registros.length === 0 ? (
                        <tr>
                            <td colSpan={6} className="text-center py-20">
                                <p className="text-xs font-bold text-slate-300 uppercase tracking-widest">No hay registros disponibles</p>
                            </td>
                        </tr>
                    ) : (
                        registros.map((item: RegistroEvento) => (
                            <tr
                                key={item.id}
                                className="group bg-white hover:bg-slate-50/50 transition-all duration-300 shadow-[0_1px_3px_rgba(0,0,0,0.02)]"
                            >
                                <td className="px-6 py-4 first:rounded-l-[1.2rem] border-y border-l border-slate-100 group-hover:border-blue-200 relative overflow-hidden">
                                    <div className="absolute left-0 top-0 bottom-0 w-1 bg-blue-500 opacity-0 group-hover:opacity-100 transition-all"></div>
                                    <span className="text-xs font-bold text-slate-600">
                                        {formatearFechaSinSalto(item.fecha_evento)}
                                    </span>
                                </td>

                                <td className="px-6 py-4 border-y border-slate-100 group-hover:border-blue-200">
                                    <span className="inline-flex items-center justify-center px-3 py-1 bg-slate-900 text-white rounded-lg text-[10px] font-black tracking-wider shadow-sm">
                                        {item.placa}
                                    </span>
                                </td>

                                <td className="px-6 py-4 border-y border-slate-100 group-hover:border-blue-200">
                                    <div className="flex flex-col">
                                        <span className="text-[11px] font-black text-slate-800 uppercase leading-none mb-1">
                                            {item.sistema}
                                        </span>
                                        <span className="text-[10px] font-medium text-blue-500/80 italic tracking-tight">
                                            {item.subsistema || 'General'}
                                        </span>
                                    </div>
                                </td>

                                {/* ✅ CELDA NUEVA: TIPO DE TRABAJO */}
                                <td className="px-6 py-4 border-y border-slate-100 group-hover:border-blue-200">
                                    <span className={`px-2 py-1 rounded-md text-[9px] font-black border uppercase tracking-tighter ${getEstiloTipo(item.tipoTrabajo)}`}>
                                        {item.tipoTrabajo || '---'}
                                    </span>
                                </td>

                                <td className="px-6 py-4 border-y border-slate-100 group-hover:border-blue-200">
                                    <div className="flex flex-col gap-1">
                                        <div className="flex items-baseline gap-1">
                                            <span className="text-xs font-black text-slate-700">{item.horometro}</span>
                                            <span className="text-[9px] font-bold text-slate-400">HRS</span>
                                        </div>
                                        <div className="w-12 h-1 bg-slate-100 rounded-full overflow-hidden">
                                            <div className="h-full bg-blue-400 w-2/3"></div>
                                        </div>
                                    </div>
                                </td>

                                <td className="px-6 py-4 last:rounded-r-[1.2rem] border-y border-r border-slate-100 group-hover:border-blue-200 text-right">
                                    <button
                                        onClick={() => onVerDetalle(item)}
                                        className="inline-flex items-center gap-2 px-4 py-2 bg-slate-50 text-slate-500 rounded-xl group-hover:bg-blue-600 group-hover:text-white transition-all duration-300 shadow-sm active:scale-95"
                                    >
                                        <span className="text-[10px] font-black uppercase tracking-tighter hidden sm:block">Ver Ficha</span>
                                        <ChevronRight size={16} />
                                    </button>
                                </td>
                            </tr>
                        ))
                    )}
                </tbody>
            </table>
        </div>
    );
};