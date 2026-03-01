"use client"
import { useEffect, useState, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { Search, Gauge, Save, Loader2, ArrowRight, Truck, AlertTriangle } from 'lucide-react'

export default function InspeccionNeumaticosPage() {
    const [placa, setPlaca] = useState('')
    const [llantasMontadas, setLlantasMontadas] = useState<any[]>([])
    const [loading, setLoading] = useState(false)
    const [enviando, setEnviando] = useState(false)
    const [errorMsg, setErrorMsg] = useState<string | null>(null)

    const [sugerencias, setSugerencias] = useState<any[]>([])
    const [mostrarSugerencias, setMostrarSugerencias] = useState(false)
    const [selectedIndex, setSelectedIndex] = useState(-1)
    const containerRef = useRef<HTMLDivElement>(null)

    useEffect(() => {
        const buscarPlacas = async () => {
            if (placa.length < 2 || llantasMontadas.length > 0) {
                setSugerencias([]);
                return;
            }
            const { data } = await supabase
                .from('maestroEquipos')
                .select('placaRodaje, codigoEquipo')
                .ilike('placaRodaje', `%${placa}%`)
                .limit(5);
            setSugerencias(data || []);
            setMostrarSugerencias(true);
        };
        buscarPlacas();
    }, [placa, llantasMontadas.length]);

    const buscarLlantas = async () => {
        if (!placa) return;
        setLoading(true);
        setErrorMsg(null);
        setMostrarSugerencias(false);

        console.log("Iniciando búsqueda para placa:", placa);

        try {
            // Consulta a Supabase
            const { data, error } = await supabase
                .from('neumaticos_asignacion')
                .select(`
                    posicion,
                    id_neumatico,
                    neumaticos_maestro (serie, marca, modelo)
                `)
                .eq('placa', placa.toUpperCase().trim())
                .eq('activo', true);

            if (error) {
                console.error("Error de Supabase:", error);
                throw error;
            }

            console.log("Datos recibidos:", data);

            if (!data || data.length === 0) {
                setErrorMsg("No se encontraron llantas ACTIVAS montadas en esta unidad.");
                setLlantasMontadas([]);
            } else {
                const inicializado = data.map(l => ({
                    ...l,
                    r1: '', r2: '', r3: '', presion: 100
                }));
                setLlantasMontadas(inicializado);
            }
        } catch (err: any) {
            setErrorMsg("Error al conectar con la base de datos.");
            console.error("Error completo:", err);
        } finally {
            setLoading(false);
        }
    };

    // ... (Mantener handleKeyDown y seleccionarPlaca igual que antes)
    const seleccionarPlaca = (valor: string) => {
        setPlaca(valor.toUpperCase());
        setMostrarSugerencias(false);
        setSugerencias([]);
        setSelectedIndex(-1);
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (sugerencias.length > 0) {
            if (e.key === "ArrowDown") {
                setSelectedIndex(prev => (prev < sugerencias.length - 1 ? prev + 1 : prev));
            } else if (e.key === "ArrowUp") {
                setSelectedIndex(prev => (prev > 0 ? prev - 1 : 0));
            } else if (e.key === "Enter" && selectedIndex !== -1) {
                seleccionarPlaca(sugerencias[selectedIndex].placaRodaje);
            }
        } else if (e.key === "Enter" && placa) {
            buscarLlantas();
        }
    };

    const handleGuardarInspeccion = async () => {
        if (llantasMontadas.some(l => !l.r1 || !l.r2 || !l.r3)) {
            alert("Por favor complete todas las mediciones R1, R2 y R3");
            return;
        }
        setEnviando(true)
        try {
            const inspecciones = llantasMontadas.map(l => ({
                id_neumatico: l.id_neumatico,
                r1: parseFloat(l.r1),
                r2: parseFloat(l.r2),
                r3: parseFloat(l.r3),
                presion_psi: parseFloat(l.presion),
                fecha_medicion: new Date().toISOString().split('T')[0]
            }))
            const { error } = await supabase.from('neumaticos_inspecciones').insert(inspecciones)
            if (error) throw error
            alert("✅ Inspección técnica contabilizada");
            setLlantasMontadas([]);
            setPlaca('');
        } catch (err: any) {
            alert("Error: " + err.message)
        } finally {
            setEnviando(false)
        }
    }

    return (
        <main className="min-h-screen bg-[#f7f9fa] p-4 md:p-8 font-sans text-left leading-none">
            <div className="max-w-4xl mx-auto space-y-6">

                <div className="bg-[#354a5f] p-6 rounded-sm shadow-lg text-white relative" ref={containerRef}>
                    <h2 className="text-[10px] font-bold uppercase tracking-widest mb-4 opacity-70 leading-none">Terminal de Medición</h2>
                    <div className="flex gap-3">
                        <div className="relative flex-1">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                            <input
                                className="w-full pl-10 pr-4 py-3 bg-white text-slate-900 font-black rounded-sm outline-none focus:ring-2 focus:ring-[#0070b1] uppercase text-sm leading-none"
                                placeholder="ESCRIBA PLACA O CÓDIGO..."
                                value={placa}
                                onChange={(e) => setPlaca(e.target.value)}
                                onKeyDown={handleKeyDown}
                                autoComplete="off"
                            />

                            {mostrarSugerencias && sugerencias.length > 0 && (
                                <div className="absolute top-full left-0 right-0 bg-white border border-[#d3d7d9] shadow-xl z-50 mt-1 rounded-sm overflow-hidden">
                                    {sugerencias.map((s, index) => (
                                        <div
                                            key={s.placaRodaje}
                                            onClick={() => seleccionarPlaca(s.placaRodaje)}
                                            className={`p-3 flex items-center gap-3 cursor-pointer border-b border-slate-50 last:border-0 ${selectedIndex === index ? 'bg-[#eff4f9] text-[#0070b1]' : 'text-slate-700 hover:bg-slate-50'
                                                }`}
                                        >
                                            <Truck size={14} className="opacity-50" />
                                            <div className="flex flex-col gap-1">
                                                <span className="font-black text-xs leading-none">{s.placaRodaje}</span>
                                                <span className="text-[9px] uppercase font-bold opacity-60 leading-none">{s.codigoEquipo}</span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                        <button
                            onClick={buscarLlantas}
                            disabled={loading}
                            className="bg-[#0070b1] px-8 font-bold uppercase text-xs rounded-sm hover:bg-[#005a8e] shadow-md active:scale-95 transition-all flex items-center gap-2"
                        >
                            {loading ? <Loader2 className="animate-spin" size={16} /> : "Cargar Ejes"}
                        </button>
                    </div>

                    {/* Alerta de Error */}
                    {errorMsg && (
                        <div className="mt-4 p-3 bg-red-500/20 border border-red-500 text-red-100 text-[10px] font-bold flex items-center gap-2 uppercase rounded-sm">
                            <AlertTriangle size={14} /> {errorMsg}
                        </div>
                    )}
                </div>

                {/* ... El resto del formulario de llantasMontadas queda igual ... */}
                {llantasMontadas.length > 0 && (
                    <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500 text-left">
                        <div className="flex justify-between items-end px-2">
                            <h3 className="text-[10px] font-black uppercase text-slate-500 tracking-tighter leading-none">Componentes Detectados: {llantasMontadas.length}</h3>
                            <button onClick={() => setLlantasMontadas([])} className="text-[10px] font-bold text-rose-600 uppercase hover:underline leading-none">Cancelar Selección</button>
                        </div>
                        <div className="grid grid-cols-1 gap-3">
                            {llantasMontadas.map((llanta, idx) => (
                                <div key={llanta.posicion} className="bg-white border border-[#d3d7d9] p-4 flex items-center gap-6 shadow-sm hover:border-[#0070b1] transition-all">
                                    <div className="w-14 h-14 bg-[#f2f4f5] flex flex-col items-center justify-center border border-[#d3d7d9] rounded-sm shrink-0">
                                        <span className="text-[8px] font-black text-slate-400 uppercase leading-none mb-1">Posición</span>
                                        <span className="text-base font-black text-[#354a5f] leading-none">{llanta.posicion}</span>
                                    </div>

                                    <div className="flex-1 text-left leading-none">
                                        <p className="text-[9px] font-bold text-slate-400 uppercase leading-none mb-1.5 tracking-tight">Serie: {llanta.neumaticos_maestro.serie}</p>
                                        <p className="text-[11px] font-black uppercase leading-none tracking-tight text-[#32363a]">{llanta.neumaticos_maestro.marca} - {llanta.neumaticos_maestro.modelo}</p>
                                    </div>

                                    <div className="flex items-center gap-3 bg-[#f7f9fa] p-2.5 border border-[#d3d7d9] rounded-sm">
                                        {['r1', 'r2', 'r3'].map((field) => (
                                            <div key={field} className="space-y-1.5">
                                                <label className="text-[8px] font-black block text-center uppercase text-slate-500 leading-none">{field}</label>
                                                <input
                                                    type="number"
                                                    step="0.1"
                                                    className="w-12 p-1.5 text-center font-black border border-[#b0b3b5] focus:border-[#0070b1] outline-none rounded-sm text-xs leading-none bg-white"
                                                    value={llanta[field]}
                                                    onChange={e => {
                                                        const newArr = [...llantasMontadas];
                                                        newArr[idx][field] = e.target.value;
                                                        setLlantasMontadas(newArr);
                                                    }}
                                                />
                                            </div>
                                        ))}
                                        <div className="h-8 w-px bg-slate-200 mx-1" />
                                        <div className="space-y-1.5">
                                            <label className="text-[8px] font-black block text-center uppercase text-blue-600 leading-none">PSI</label>
                                            <input
                                                type="number"
                                                className="w-14 p-1.5 text-center font-black border border-blue-200 text-blue-700 focus:ring-1 focus:ring-blue-500 outline-none rounded-sm text-xs leading-none bg-white"
                                                value={llanta.presion}
                                                onChange={e => {
                                                    const newArr = [...llantasMontadas];
                                                    newArr[idx].presion = e.target.value;
                                                    setLlantasMontadas(newArr);
                                                }}
                                            />
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>

                        <button
                            onClick={handleGuardarInspeccion}
                            disabled={enviando}
                            className="w-full bg-[#0070b1] text-white py-4 rounded-sm font-black uppercase tracking-[0.2em] shadow-xl hover:bg-[#005a8e] transition-all flex items-center justify-center gap-3 active:scale-[0.98] disabled:opacity-50 text-xs leading-none"
                        >
                            {enviando ? <Loader2 className="animate-spin" size={20} /> : <><Save size={20} /> Postear Inspección Técnica</>}
                        </button>
                    </div>
                )}
            </div>
        </main>
    )
}