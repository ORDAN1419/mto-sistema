"use client"
import { useEffect, useState, useMemo, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { Search, X, Database, Clock, Truck, Info, Package, Edit3 } from 'lucide-react'

export default function MaestroInsumosPage() {
    const router = useRouter();
    const [insumos, setInsumos] = useState<any[]>([]);
    const [secuencias, setSecuencias] = useState<any[]>([]);
    const [busqueda, setBusqueda] = useState('');
    const [loading, setLoading] = useState(true);
    const searchInputRef = useRef<HTMLInputElement>(null);

    // ✅ Atajos de teclado
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.altKey && e.key.toLowerCase() === 's') { e.preventDefault(); searchInputRef.current?.focus(); }
            if (e.altKey && e.key.toLowerCase() === 'x') { e.preventDefault(); setBusqueda(''); }
            if (e.ctrlKey && e.key === '1') { e.preventDefault(); router.push('/historial-horometro'); }
            if (e.ctrlKey && e.key === '0') { e.preventDefault(); router.push('/equipos'); }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [router]);

    const fetchDatos = async () => {
        setLoading(true);
        const { data: insData } = await supabase.from('insumosmp_maestros').select('*').order('descripcion');
        if (insData) setInsumos(insData);
        const { data: secData } = await supabase.from('secuenciaMP').select('*').order('secuencia', { ascending: true });
        if (secData) setSecuencias(secData);
        setLoading(false);
    };

    useEffect(() => { fetchDatos() }, []);

    // ✅ LÓGICA DE TOGGLE CORREGIDA: Usa prefijos para separar marcas
    const togglePM = async (id: string, pmNombre: string, flotaKey: string, listaActual: string[]) => {
        const tagUnica = `${flotaKey}:${pmNombre}`; // Ejemplo: "CHICAGO:PM1-1"
        const existe = (listaActual || []).includes(tagUnica);

        const nuevaLista = existe
            ? listaActual.filter(item => item !== tagUnica)
            : [...(listaActual || []), tagUnica];

        const { error } = await supabase
            .from('insumosmp_maestros')
            .update({ aplicacion_pms: nuevaLista })
            .eq('id', id);

        if (!error) fetchDatos();
    };

    const updateInsumoField = async (id: string, campo: string, valor: any) => {
        const { error } = await supabase.from('insumosmp_maestros').update({ [campo]: valor }).eq('id', id);
        if (!error) fetchDatos();
    };

    const agregarEtiquetaFisica = async (id: string, campo: 'marca' | 'modelo', valor: string, listaActual: string[]) => {
        if (!valor) return;
        const valorLimpio = valor.toUpperCase().trim();
        if ((listaActual || []).includes(valorLimpio)) return;
        const nuevaLista = [...(listaActual || []), valorLimpio];
        await supabase.from('insumosmp_maestros').update({ [campo]: nuevaLista }).eq('id', id);
        fetchDatos();
    };

    const borrarEtiquetaFisica = async (id: string, campo: 'marca' | 'modelo', valorABorrar: string, listaActual: string[]) => {
        const nuevaLista = (listaActual || []).filter(item => item !== valorABorrar);
        await supabase.from('insumosmp_maestros').update({ [campo]: nuevaLista }).eq('id', id);
        fetchDatos();
    };

    const insumosFiltrados = useMemo(() => {
        if (!busqueda.trim()) return insumos;
        const palabras = busqueda.toLowerCase().trim().split(/\s+/);
        return insumos.filter(insumo => {
            const contenido = [insumo.nro_parte, insumo.descripcion, ...(insumo.marca || []), ...(insumo.modelo || [])].join(' ').toLowerCase();
            return palabras.every(p => contenido.includes(p));
        });
    }, [insumos, busqueda]);

    const obtenerGruposFiltrados = (marcas: string[], modelos: string[]) => {
        const grupos: any = {};
        const palabrasBusqueda = busqueda.toLowerCase().trim().split(/\s+/);
        marcas.forEach(m => {
            modelos.forEach(mod => {
                const nombreGrupo = `${m} - ${mod}`;
                const coincideFlota = busqueda === '' || palabrasBusqueda.some(p => nombreGrupo.toLowerCase().includes(p));
                const filtradas = secuencias.filter(s => s.marca === m && s.modelo === mod);
                if (filtradas.length > 0 && coincideFlota) { grupos[nombreGrupo] = filtradas; }
            });
        });
        return grupos;
    };

    return (
        <div className="min-h-screen bg-[#edeff0] text-[#32363a] font-sans p-4 leading-none text-left">
            <header className="bg-[#354a5f] text-white p-4 rounded-t-lg flex justify-between items-center shadow-md">
                <div className="flex items-center gap-3">
                    <Database size={20} className="text-[#91c8f6]" />
                    <h1 className="text-sm font-bold uppercase tracking-tighter">Master Data Insumos</h1>
                </div>
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-white/50" size={16} />
                    <input ref={searchInputRef} type="text" placeholder="BUSCAR..." className="w-[450px] pl-10 pr-4 py-2 bg-white/10 border border-white/20 rounded text-xs outline-none focus:bg-white focus:text-[#32363a] font-bold uppercase transition-all" value={busqueda} onChange={(e) => setBusqueda(e.target.value)} />
                </div>
            </header>

            <div className="bg-white border-x border-b border-[#d8dce3] shadow-sm rounded-b-lg overflow-hidden">
                <table className="w-full text-left border-collapse table-fixed">
                    <thead className="bg-[#f7f9fa] border-b border-[#d8dce3] text-[10px] uppercase text-[#6a6d70] font-bold tracking-wider">
                        <tr>
                            <th className="p-4 border-r border-[#d8dce3] w-[40%] text-left">Material / Q / Flota</th>
                            <th className="p-4 bg-[#f0f4f7] text-center">Aplicación PM por Flota (Independiente)</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-[#ebeef0]">
                        {insumosFiltrados.map((insumo) => {
                            const gruposSecuencia = obtenerGruposFiltrados(insumo.marca || [], insumo.modelo || []);
                            return (
                                <tr key={insumo.id} className="hover:bg-[#f5f6f7] transition-colors group">
                                    <td className="p-4 border-r border-[#ebeef0] align-top">
                                        <div className="flex flex-col gap-4">
                                            <div className="flex justify-between items-start">
                                                <div className="flex flex-col gap-1 w-full">
                                                    <span className="text-xs font-black text-[#0070b1] tracking-tighter">{insumo.nro_parte}</span>
                                                    <h2 className="text-[11px] font-bold uppercase leading-tight">{insumo.descripcion}</h2>

                                                    {/* Edición Cantidad y Unidad */}
                                                    <div className="flex items-center gap-2 mt-2 bg-slate-100 p-1 rounded-sm w-fit border border-slate-200">
                                                        <span className="text-[8px] font-black text-slate-500">Q:</span>
                                                        <input type="number" className="w-10 bg-white text-[10px] font-bold text-center border rounded-sm outline-none" defaultValue={insumo.cantidad_base}
                                                            onBlur={(e) => updateInsumoField(insumo.id, 'cantidad_base', parseFloat(e.target.value))} />
                                                        <select className="bg-white text-[10px] font-bold border rounded-sm outline-none uppercase" defaultValue={insumo.unidad}
                                                            onChange={(e) => updateInsumoField(insumo.id, 'unidad', e.target.value)}>
                                                            <option value="UNI">UNI</option><option value="GAL">GAL</option><option value="LT">LT</option>
                                                        </select>
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="grid grid-cols-1 gap-3 pt-2 border-t border-slate-100">
                                                <div className="space-y-1">
                                                    <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest block">Marcas:</span>
                                                    <div className="flex flex-wrap gap-1.5">
                                                        {(insumo.marca || []).map((m: string) => (
                                                            <span key={m} className="inline-flex items-center gap-1 px-2 py-0.5 bg-[#0070d2] text-white rounded-sm text-[9px] font-bold">
                                                                {m} <button onClick={() => borrarEtiquetaFisica(insumo.id, 'marca', m, insumo.marca)}><X size={10} /></button>
                                                            </span>
                                                        ))}
                                                        <input className="w-24 px-2 py-0.5 text-[9px] border border-dashed border-slate-300 rounded outline-none font-bold uppercase bg-slate-50 focus:bg-white" placeholder="+ MARCA" onKeyDown={(e: any) => e.key === 'Enter' && (agregarEtiquetaFisica(insumo.id, 'marca', e.target.value, insumo.marca), e.target.value = '')} />
                                                    </div>
                                                </div>
                                                <div className="space-y-1">
                                                    <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest block">Modelos:</span>
                                                    <div className="flex flex-wrap gap-1.5">
                                                        {(insumo.modelo || []).map((mod: string) => (
                                                            <span key={mod} className="inline-flex items-center gap-1 px-2 py-0.5 bg-[#5c31ad] text-white rounded-sm text-[9px] font-bold">
                                                                {mod} <button onClick={() => borrarEtiquetaFisica(insumo.id, 'modelo', mod, insumo.modelo)}><X size={10} /></button>
                                                            </span>
                                                        ))}
                                                        <input className="w-24 px-2 py-0.5 text-[9px] border border-dashed border-slate-300 rounded outline-none font-bold uppercase bg-slate-50 focus:bg-white" placeholder="+ MODELO" onKeyDown={(e: any) => e.key === 'Enter' && (agregarEtiquetaFisica(insumo.id, 'modelo', e.target.value, insumo.modelo), e.target.value = '')} />
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </td>

                                    <td className="p-4 align-top bg-[#fbfcfd]">
                                        <div className="flex flex-col gap-6">
                                            {Object.entries(gruposSecuencia).map(([label, secs]: any) => (
                                                <div key={label} className="border-l-2 border-slate-200 pl-4">
                                                    <div className="flex items-center gap-2 mb-3 text-[#6a6d70]">
                                                        <Truck size={14} className="text-[#91c8f6]" />
                                                        <span className="text-[10px] font-black uppercase tracking-tight">{label}</span>
                                                    </div>
                                                    <div className="flex flex-wrap gap-1.5">
                                                        {secs.map((s: any) => {
                                                            // ✅ Solo marcamos si el PM tiene el prefijo de esta marca exacta
                                                            const activo = (insumo.aplicacion_pms || []).includes(`${label}:${s.descripcion}`);

                                                            return (
                                                                <button
                                                                    key={s.id}
                                                                    onClick={() => togglePM(insumo.id, s.descripcion, label, insumo.aplicacion_pms)}
                                                                    className={`px-2 py-2 rounded-sm border text-[10px] font-black transition-all flex flex-col items-center min-w-[55px] shadow-sm ${activo ? 'bg-[#107e3e] text-white border-[#0d6b35]' : 'bg-white text-slate-300 border-slate-200 hover:border-emerald-400'}`}
                                                                >
                                                                    <span>{s.descripcion}</span>
                                                                    <span className="text-[7px] mt-0.5 opacity-60">S#{s.secuencia}</span>
                                                                </button>
                                                            );
                                                        })}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        </div>
    );
}