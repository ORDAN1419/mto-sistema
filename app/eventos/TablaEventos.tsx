import { ChevronRight, Activity } from 'lucide-react';

interface RegistroEvento {
    id: string; fecha_evento: string; placa: string; sistema: string;
    subsistema: string; horometro: number | string; tecnico: string;
}

export const TablaEventos = ({ registros, cargando, onVerDetalle }: any) => {
    if (cargando) return (
        <div className="flex flex-col items-center justify-center p-20 space-y-4">
            <Activity className="animate-spin text-blue-500" size={30} />
            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Sincronizando registros...</p>
        </div>
    );

    return (
        <div className="overflow-x-auto px-2">
            <table className="w-full border-separate border-spacing-y-2">
                <thead>
                    <tr className="text-[9px] font-black text-slate-400 uppercase tracking-widest text-left">
                        <th className="px-6 py-2">Fecha</th>
                        <th className="px-6 py-2">Placa</th>
                        <th className="px-6 py-2">Sistema / Componente</th>
                        <th className="px-6 py-2">Horómetro</th>
                        <th className="px-6 py-2 text-right">Detalles</th>
                    </tr>
                </thead>
                <tbody>
                    {registros.length === 0 ? (
                        <tr><td colSpan={5} className="text-center py-10 text-[10px] font-bold text-slate-400 uppercase">No se encontraron registros</td></tr>
                    ) : (
                        registros.map((item: RegistroEvento) => (
                            <tr key={item.id} className="bg-white hover:shadow-sm transition-all group border border-slate-50">
                                <td className="px-6 py-3 rounded-l-xl border-y border-l border-slate-100">
                                    <span className="text-[10px] font-bold text-slate-500">{new Date(item.fecha_evento).toLocaleDateString()}</span>
                                </td>
                                <td className="px-6 py-3 border-y border-slate-100 font-mono text-[10px] font-black text-slate-800 uppercase">
                                    <span className="bg-slate-50 px-2 py-0.5 rounded-md">{item.placa}</span>
                                </td>
                                <td className="px-6 py-3 border-y border-slate-100">
                                    <div className="flex flex-col leading-tight">
                                        <span className="text-[10px] font-bold text-blue-600 uppercase">{item.sistema}</span>
                                        <span className="text-[9px] font-medium text-slate-400 italic">{item.subsistema}</span>
                                    </div>
                                </td>
                                <td className="px-6 py-3 border-y border-slate-100 font-mono text-[10px] font-bold text-slate-600">
                                    {item.horometro} HRS
                                </td>
                                <td className="px-6 py-3 rounded-r-xl border-y border-r border-slate-100 text-right">
                                    <button onClick={() => onVerDetalle(item)} className="p-1.5 bg-slate-50 rounded-lg text-slate-300 hover:text-blue-600 transition-all">
                                        <ChevronRight size={14} />
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