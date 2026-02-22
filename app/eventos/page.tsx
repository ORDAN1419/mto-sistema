"use client"
import { useEffect, useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { ArrowLeft, Search, Wrench, Activity } from 'lucide-react'

import { TablaEventos } from './TablaEventos';
import ModalDetalle from './ModalDetalle';
import { ModalFormulario } from './ModalFormulario';

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
    const [nuevoRepuesto, setNuevoRepuesto] = useState({ descripcion: '', cantidad: 1 })

    // 1. Estado inicial sincronizado con tu tabla SQL
    const initialForm = {
        fecha_evento: new Date().toISOString().split('T')[0],
        placa: '',
        ubic: '',
        horometro: '',
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

    const fetchRegistros = async () => {
        setCargando(true);
        const { data, error } = await supabase.from('historial_eventos')
            .select('*')
            .order('fecha_evento', { ascending: false });
        if (!error) setRegistros(data || []);
        setCargando(false);
    }

    useEffect(() => {
        fetchRegistros();
        const placaUrl = searchParams.get('placa');
        if (placaUrl) {
            setForm(prev => ({ ...prev, placa: placaUrl.toUpperCase(), horometro: searchParams.get('horo') || '' }));
            setShowModal(true);
        }
    }, [searchParams]);

    useEffect(() => {
        if (verEvento) {
            supabase.from('repuestos_utilizados')
                .select('*')
                .eq('evento_id', verEvento.id)
                .then(({ data }) => setRepuestosCargados(data || []));
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
        if (!form.placa || !form.horometro || !form.sistema) return alert("⚠️ Datos básicos incompletos");

        // 2. Lógica para calcular duración automáticamente
        let duracionCalculada = 0;
        if (form.H_inicial && form.H_final) {
            const [h1, m1] = form.H_inicial.split(':').map(Number);
            const [h2, m2] = form.H_final.split(':').map(Number);
            const inicio = h1 + m1 / 60;
            const fin = h2 + m2 / 60;

            // Si la hora final es menor a la inicial, asumimos que pasó al día siguiente
            duracionCalculada = fin > inicio ? fin - inicio : (24 - inicio) + fin;
        }

        setEnviando(true);
        try {
            // 3. Objeto de datos que respeta los nombres de tu tabla SQL
            const dataToSave = {
                fecha_evento: form.fecha_evento,
                placa: form.placa.trim().toUpperCase(),
                ubic: form.ubic?.toUpperCase() || '',
                horometro: Number(form.horometro),
                sistema: form.sistema.trim().toUpperCase(),
                subsistema: form.subsistema?.trim().toUpperCase() || '',
                evento: form.evento,
                tecnico: form.tecnico?.trim().toUpperCase() || '',
                tipoTrabajo: form.tipoTrabajo,
                H_inicial: form.H_inicial || null,
                H_final: form.H_final || null,
                duracion: Number(duracionCalculada.toFixed(2))
            };

            let evId = verEvento?.id;

            if (isEditing && evId) {
                const { error: errorUpd } = await supabase.from('historial_eventos').update(dataToSave).eq('id', evId);
                if (errorUpd) throw errorUpd;
                await supabase.from('repuestos_utilizados').delete().eq('evento_id', evId);
            } else {
                const { data, error: errorIns } = await supabase.from('historial_eventos').insert([dataToSave]).select().single();
                if (errorIns) throw errorIns;
                evId = data.id;
            }

            if (repuestos.length > 0) {
                await supabase.from('repuestos_utilizados').insert(
                    repuestos.map(r => ({
                        evento_id: evId,
                        descripcion: r.descripcion.toUpperCase(),
                        cantidad: r.cantidad,
                        fecha_cambio: form.fecha_evento
                    }))
                );
            }

            await fetchRegistros();
            setShowModal(false);
            setVerEvento(null);
            setForm(initialForm);
            setRepuestos([]);
            setEspecificarSistema(false);
            alert("✅ Guardado con éxito");

        } catch (e) {
            console.error("Error en Guardado:", e);
            alert("Error al guardar el reporte");
        } finally {
            setEnviando(false);
        }
    }

    const agregarRepuestoALista = () => {
        if (!nuevoRepuesto.descripcion.trim()) return;
        setRepuestos([...repuestos, { ...nuevoRepuesto, descripcion: nuevoRepuesto.descripcion.toUpperCase() }]);
        setNuevoRepuesto({ descripcion: '', cantidad: 1 });
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
        r.sistema.toLowerCase().includes(busqueda.toLowerCase())
    );

    return (
        <div className="max-w-[1400px] mx-auto">
            <div className="flex flex-col md:flex-row items-center justify-between bg-white px-5 py-3 rounded-2xl border border-slate-100 shadow-sm mb-6 gap-4">
                <div className="flex items-center gap-3">
                    <button onClick={() => router.push('/equipos')} className="p-2 bg-slate-50 rounded-lg text-slate-400 hover:text-blue-600 border border-slate-100"><ArrowLeft size={16} /></button>
                    <div>
                        <h1 className="text-sm font-black text-slate-800 uppercase tracking-tighter">Historial de Eventos</h1>
                        <p className="text-[8px] text-slate-400 font-bold uppercase tracking-widest">{registrosFiltrados.length} Registros</p>
                    </div>
                </div>
                <div className="relative w-full md:w-80">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300" size={14} />
                    <input type="text" placeholder="Buscar..." value={busqueda} onChange={(e) => setBusqueda(e.target.value)} className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-100 rounded-xl text-[10px] font-bold outline-none" />
                </div>
                <button
                    onClick={() => { setForm(initialForm); setIsEditing(false); setRepuestos([]); setEspecificarSistema(false); setShowModal(true); }}
                    className="px-5 py-2 bg-blue-600 text-white rounded-xl font-black text-[9px] uppercase tracking-widest hover:bg-blue-700 shadow-md flex items-center gap-2"
                >
                    <Wrench size={12} /> + NUEVO EVENTO
                </button>
            </div>

            <TablaEventos registros={registrosFiltrados} cargando={cargando} onVerDetalle={setVerEvento} />

            <ModalDetalle
                verEvento={verEvento}
                setVerEvento={setVerEvento}
                darAltaEquipo={darAltaEquipo}
                prepararEdicion={prepararEdicion}
                eliminarRegistro={eliminarRegistro}
                repuestosCargados={repuestosCargados}
            />

            <ModalFormulario
                showModal={showModal}
                setShowModal={setShowModal}
                isEditing={isEditing}
                form={form}
                setForm={setForm}
                especificarSistema={especificarSistema}
                setEspecificarSistema={setEspecificarSistema}
                nuevoRepuesto={nuevoRepuesto}
                setNuevoRepuesto={setNuevoRepuesto}
                agregarRepuestoALista={agregarRepuestoALista}
                repuestos={repuestos}
                setRepuestos={setRepuestos}
                guardarEvento={guardarEvento}
                enviando={enviando}
            />
        </div>
    )
}

export default function HistorialEventosPage() {
    return (
        <main className="min-h-screen bg-[#F8FAFC] p-6 md:p-8">
            <Suspense fallback={<div className="flex justify-center p-20"><Activity className="animate-spin text-blue-500" /></div>}>
                <HistorialFormContent />
            </Suspense>
        </main>
    )
}