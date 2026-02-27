"use client"
import { useEffect, useState, Suspense, useMemo } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { ArrowLeft, Search, Wrench, Activity, Calendar, Clock, CheckCircle2, Filter } from 'lucide-react'

import { TablaEventos } from './TablaEventos';
import ModalDetalle from './ModalDetalle';
import { ModalFormulario } from './ModalFormulario';

const obtenerFechaLocal = () => {
    const ahora = new Date();
    const anio = ahora.getFullYear();
    const mes = String(ahora.getMonth() + 1).padStart(2, '0');
    const dia = String(ahora.getDate()).padStart(2, '0');
    return `${anio}-${mes}-${dia}`;
};

function HistorialFormContent() {
    const router = useRouter()
    const searchParams = useSearchParams()

    const [showModal, setShowModal] = useState(false)
    const [isEditing, setIsEditing] = useState(false)
    const [verEvento, setVerEvento] = useState<any>(null)
    const [enviando, setEnviando] = useState(false)
    const [busqueda, setBusqueda] = useState("")
    const [registros, setRegistros] = useState<any[]>([])
    const [cargando, setCargando] = useState(true)
    const [especificarSistema, setEspecificarSistema] = useState(false)

    const [repuestos, setRepuestos] = useState<any[]>([])
    const [repuestosCargados, setRepuestosCargados] = useState<any[]>([])
    const [nuevoRepuesto, setNuevoRepuesto] = useState({ descripcion: '', cantidad: 1, id: null })

    // ✅ MODIFICADO: horometro como string vacío para evitar el '0' preseteado
    const initialForm = {
        fecha_evento: obtenerFechaLocal(),
        placa: '',
        ubic: '',
        horometro: '' as any,
        sistema: '',
        subsistema: '',
        evento: '',
        tecnico: '',
        tipoTrabajo: '',
        H_inicial: '',
        H_final: '',
        duracion: 0
    }
    const [form, setForm] = useState(initialForm)

    const stats = useMemo(() => {
        const hoy = obtenerFechaLocal();
        return {
            total: registros.length,
            hoy: registros.filter(r => r.fecha_evento === hoy).length,
            duracionTotal: registros.reduce((acc, curr) => acc + (Number(curr.duracion) || 0), 0).toFixed(1)
        };
    }, [registros]);

    const fetchRegistros = async () => {
        setCargando(true);
        const { data, error } = await supabase.from('historial_eventos')
            .select('*')
            .order('fecha_evento', { ascending: false });

        if (!error && data) {
            const registrosCorregidos = data.map(reg => ({
                ...reg,
                fecha_evento: typeof reg.fecha_evento === 'string'
                    ? reg.fecha_evento.split('T')[0]
                    : reg.fecha_evento
            }));
            setRegistros(registrosCorregidos);
        }
        setCargando(false);
    }

    useEffect(() => {
        fetchRegistros();
        const placaUrl = searchParams.get('placa');
        if (placaUrl) {
            setForm(prev => ({
                ...prev,
                placa: placaUrl.toUpperCase(),
                horometro: searchParams.get('horo') || '',
                fecha_evento: obtenerFechaLocal()
            }));
            setShowModal(true);
        }
    }, [searchParams]);

    // ✅ MODIFICADO: Carga de repuestos desde repUsadosMtto con Join a base_repuestos
    useEffect(() => {
        if (verEvento) {
            supabase.from('repUsadosMtto')
                .select(`
                    *,
                    base_repuestos (
                        codigo_almacen,
                        numero_parte
                    )
                `)
                .eq('eventoId', verEvento.id)
                .then(({ data }) => {
                    const repuestosFormateados = data?.map(r => ({
                        ...r,
                        codigo_almacen: r.base_repuestos?.codigo_almacen || r.codigo_almacen,
                        numero_parte: r.base_repuestos?.numero_parte || r.numero_parte
                    }));
                    setRepuestosCargados(repuestosFormateados || []);
                });
        }
    }, [verEvento]);

    const prepararEdicion = () => {
        const sistemasBase = ["MOTOR", "TRANSMISIÓN", "SIST. ELÉCTRICO", "HIDRÁULICO", "FRENOS", "ESTRUCTURA"];
        const esSistemaManual = !sistemasBase.includes(verEvento.sistema);

        setForm({
            ...verEvento,
            horometro: verEvento.horometro.toString(),
            tipoTrabajo: verEvento.tipoTrabajo || '',
            H_inicial: verEvento.H_inicial || '',
            H_final: verEvento.H_final || ''
        });
        setRepuestos(repuestosCargados);
        setEspecificarSistema(esSistemaManual);
        setIsEditing(true);
        setShowModal(true);
    }

    const guardarEvento = async () => {
        if (!form.placa || !form.horometro || !form.sistema || !form.tipoTrabajo) {
            return alert("⚠️ Datos básicos incompletos");
        }

        let duracionCalculada = 0;
        if (form.H_inicial && form.H_final) {
            const [h1, m1] = form.H_inicial.split(':').map(Number);
            const [h2, m2] = form.H_final.split(':').map(Number);
            const inicio = h1 + m1 / 60;
            const fin = h2 + m2 / 60;
            duracionCalculada = fin > inicio ? fin - inicio : (24 - inicio) + fin;
        }

        const duracionFinal = Number(duracionCalculada.toFixed(2));
        const placaLimpia = form.placa.trim().toUpperCase();
        const nuevoHorometro = Number(form.horometro);

        setEnviando(true);

        try {
            const dataToSave = {
                fecha_evento: form.fecha_evento,
                placa: placaLimpia,
                ubic: form.ubic?.toUpperCase() || '',
                horometro: nuevoHorometro,
                sistema: form.sistema.trim().toUpperCase(),
                subsistema: form.subsistema?.trim().toUpperCase() || '',
                evento: form.evento,
                tecnico: form.tecnico?.trim().toUpperCase() || '',
                tipoTrabajo: form.tipoTrabajo,
                H_inicial: form.H_inicial || null,
                H_final: form.H_final || null,
                duracion: duracionFinal
            };

            let evId = verEvento?.id;

            if (isEditing && evId) {
                const { error } = await supabase.from('historial_eventos').update(dataToSave).eq('id', evId);
                if (error) throw error;
                await supabase.from('repUsadosMtto').delete().eq('eventoId', evId);
            } else {
                const { data, error } = await supabase.from('historial_eventos').insert([dataToSave]).select().single();
                if (error) throw error;
                evId = data.id;
            }

            const { data: equipoActual } = await supabase.from('maestroEquipos').select('horometroMayor').eq('placaRodaje', placaLimpia).single();
            if (equipoActual && nuevoHorometro > (equipoActual.horometroMayor || 0)) {
                await supabase.from('maestroEquipos').update({
                    horometroMayor: nuevoHorometro,
                    ultima_fecha: form.fecha_evento
                }).eq('placaRodaje', placaLimpia);
            }

            // ✅ MODIFICADO: Guardado masivo en repUsadosMtto
            if (repuestos.length > 0) {
                const repuestosData = repuestos.map(r => ({
                    fechCambio: form.fecha_evento,
                    placaId: placaLimpia,
                    eventoId: evId,
                    bdRepuestoId: r.bdRepuestoId || r.id || null,
                    descripcion_repuesto: (r.descripcion_repuesto || r.descripcion).toUpperCase(),
                    cantidad: Number(r.cantidad),
                    horometro: nuevoHorometro
                }));

                const { error: errorRep } = await supabase.from('repUsadosMtto').insert(repuestosData);
                if (errorRep) throw errorRep;
            }

            await fetchRegistros();
            setShowModal(false);
            setVerEvento(null);
            setForm(initialForm);
            setRepuestos([]);
            setEspecificarSistema(false);
            alert("✅ Registro procesado exitosamente.");

        } catch (e: any) {
            console.error(e);
            alert(`Error: ${e.message}`);
        } finally {
            setEnviando(false);
        }
    }

    const agregarRepuestoALista = () => {
        if (!nuevoRepuesto.descripcion.trim()) return;
        setRepuestos([...repuestos, { ...nuevoRepuesto, descripcion: nuevoRepuesto.descripcion.toUpperCase() }]);
        setNuevoRepuesto({ descripcion: '', cantidad: 1, id: null });
    }

    const darAltaEquipo = async () => {
        const nuevaUbic = prompt("Ubicación final:", verEvento.ubic);
        if (!nuevaUbic) return;
        await supabase.from('maestroEquipos').update({ status: 'OPERATIVO', ubic: nuevaUbic.toUpperCase() }).eq('placaRodaje', verEvento.placa);
        setVerEvento(null);
        fetchRegistros();
    }

    const eliminarRegistro = async (id: string) => {
        if (!confirm("¿Eliminar este reporte?")) return;
        await supabase.from('historial_eventos').delete().eq('id', id);
        setVerEvento(null);
        fetchRegistros();
    }

    const registrosFiltrados = registros.filter(r =>
        r.placa.toLowerCase().includes(busqueda.toLowerCase()) ||
        r.sistema.toLowerCase().includes(busqueda.toLowerCase()) ||
        r.tecnico?.toLowerCase().includes(busqueda.toLowerCase())
    );

    return (
        <div className="max-w-[1440px] mx-auto space-y-6">
            <div className="bg-white p-5 rounded-[2.5rem] border border-slate-200/60 shadow-xl shadow-slate-200/40 flex flex-col lg:flex-row items-center justify-between gap-6">
                <div className="flex items-center gap-5 w-full lg:w-auto">
                    <button onClick={() => router.push('/equipos')} className="p-3 bg-slate-50 rounded-2xl text-slate-400 hover:text-blue-600 border border-slate-100"><ArrowLeft size={20} /></button>
                    <div>
                        <h1 className="text-xl font-black text-slate-800 uppercase tracking-tighter leading-none">Historial de Eventos</h1>
                        <div className="flex items-center gap-2 mt-1.5">
                            <span className="relative flex h-2 w-2">
                                <span className="absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75 animate-ping"></span>
                                <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                            </span>
                            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Sincronizado con Supabase</p>
                        </div>
                    </div>
                </div>

                <div className="flex flex-col sm:flex-row items-center gap-3 w-full lg:w-auto">
                    <div className="relative w-full sm:w-80 group">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-blue-500 transition-colors" size={18} />
                        <input type="text" placeholder="Buscar placa, sistema o técnico..." value={busqueda} onChange={(e) => setBusqueda(e.target.value)} className="w-full pl-12 pr-4 py-3.5 bg-slate-50 border border-slate-100 rounded-2xl text-xs font-bold outline-none focus:ring-4 focus:ring-blue-500/5 focus:bg-white transition-all shadow-inner" />
                    </div>
                    <button onClick={() => { setForm(initialForm); setIsEditing(false); setRepuestos([]); setEspecificarSistema(false); setShowModal(true); }} className="w-full sm:w-auto px-8 py-3.5 bg-blue-600 text-white rounded-2xl font-black text-[11px] uppercase tracking-[0.15em] hover:bg-blue-700 transition-all shadow-lg flex items-center justify-center gap-3"><Wrench size={16} /> NUEVO REGISTRO</button>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                {[
                    { label: 'Eventos Totales', val: stats.total, icon: <Calendar size={22} />, color: 'text-blue-600', bg: 'bg-blue-50' },
                    { label: 'Horas Invertidas', val: `${stats.duracionTotal}h`, icon: <Clock size={22} />, color: 'text-amber-600', bg: 'bg-amber-50' },
                    { label: 'Registros Hoy', val: stats.hoy, icon: <CheckCircle2 size={22} />, color: 'text-green-600', bg: 'bg-green-50' }
                ].map((item, i) => (
                    <div key={i} className="bg-white p-6 rounded-[2rem] border border-slate-200/50 shadow-sm flex items-center gap-5 hover:border-blue-200 transition-colors group">
                        <div className={`p-4 ${item.bg} ${item.color} rounded-2xl group-hover:scale-110 transition-transform`}>{item.icon}</div>
                        <div>
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">{item.label}</p>
                            <p className="text-2xl font-black text-slate-800">{item.val}</p>
                        </div>
                    </div>
                ))}
            </div>

            <div className="bg-white rounded-[2.5rem] border border-slate-200/60 shadow-xl shadow-slate-200/30 overflow-hidden">
                <div className="px-8 py-5 border-b border-slate-50 flex items-center justify-between bg-slate-50/30">
                    <div className="flex items-center gap-2">
                        <Filter size={14} className="text-blue-500" />
                        <span className="text-[11px] font-black text-slate-500 uppercase tracking-widest">Mostrando {registrosFiltrados.length} resultados</span>
                    </div>
                </div>
                <div className="p-4">
                    <TablaEventos registros={registrosFiltrados} cargando={cargando} onVerDetalle={setVerEvento} />
                </div>
            </div>

            <ModalDetalle verEvento={verEvento} setVerEvento={setVerEvento} darAltaEquipo={darAltaEquipo} prepararEdicion={prepararEdicion} eliminarRegistro={eliminarRegistro} repuestosCargados={repuestosCargados} />
            <ModalFormulario showModal={showModal} setShowModal={setShowModal} isEditing={isEditing} form={form} setForm={setForm} especificarSistema={especificarSistema} setEspecificarSistema={setEspecificarSistema} nuevoRepuesto={nuevoRepuesto} setNuevoRepuesto={setNuevoRepuesto} agregarRepuestoALista={agregarRepuestoALista} repuestos={repuestos} setRepuestos={setRepuestos} guardarEvento={guardarEvento} enviando={enviando} />
        </div>
    )
}

export default function HistorialEventosPage() {
    return (
        <main className="min-h-screen bg-[#F8FAFC] p-4 md:p-10 font-sans">
            <Suspense fallback={<div className="flex flex-col items-center justify-center min-h-[60vh] gap-6"><Activity className="animate-spin text-blue-600" size={48} /><p className="text-xs font-black text-slate-400 uppercase tracking-[0.3em] animate-pulse">Sincronizando Historial...</p></div>}>
                <HistorialFormContent />
            </Suspense>
        </main>
    )
}