"use client"
import { useEffect, useState, Suspense, useMemo, useCallback } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import {
    ArrowLeft, Search, Wrench, Activity, Calendar, Clock,
    CheckCircle2, Filter, RefreshCw, LayoutGrid
} from 'lucide-react'

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

    // --- ESTADOS ORIGINALES (INTACTOS) ---
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

    // --- ATAJOS DE TECLADO (SAP STANDARD LOGIC) ---
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            // Navegación CTRL + NUM
            if (e.ctrlKey && e.key === '1') { e.preventDefault(); router.push('/rendimiento'); }
            if (e.ctrlKey && e.key === '2') { e.preventDefault(); router.push('/bdrepuestos'); }
            if (e.ctrlKey && e.key === '3') { e.preventDefault(); router.push('/estatus'); }

            // Acciones ALT
            if (e.altKey && e.key.toLowerCase() === 'n') { // Nuevo registro
                e.preventDefault();
                setForm(initialForm);
                setIsEditing(false);
                setRepuestos([]);
                setEspecificarSistema(false);
                setShowModal(true);
            }
            if (e.altKey && e.key.toLowerCase() === 'q') { // Refrescar
                e.preventDefault();
                fetchRegistros();
            }
            if (e.altKey && e.key.toLowerCase() === 's') { // Buscar
                e.preventDefault();
                const searchInput = document.getElementById('sap-main-search');
                searchInput?.focus();
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [router, initialForm]);

    // --- LÓGICA DE NEGOCIO (INTACTA) ---
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

    useEffect(() => {
        if (verEvento) {
            supabase.from('repUsadosMtto')
                .select('*, base_repuestos(codigo_almacen, numero_parte)')
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
        if (!form.placa || !form.horometro || !form.sistema || !form.tipoTrabajo) return alert("⚠️ Datos incompletos");
        setEnviando(true);
        try {
            // Lógica de cálculo de duración original
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
            const nuevoStatus = form.tipoTrabajo === "INSPECCION" ? 'OPERATIVO' : 'INOPERATIVO';
            const updateFields: any = { status: nuevoStatus };
            if (equipoActual && nuevoHorometro > (equipoActual.horometroMayor || 0)) {
                updateFields.horometroMayor = nuevoHorometro;
                updateFields.ultima_fecha = form.fecha_evento;
            }
            await supabase.from('maestroEquipos').update(updateFields).eq('placaRodaje', placaLimpia);

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
        } catch (e: any) { alert(e.message) } finally { setEnviando(false) }
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

    // ✅ BUSCADOR MEJORADO: Ahora incluye la búsqueda por ID LOG
    const registrosFiltrados = registros.filter(r =>
        r.placa.toLowerCase().includes(busqueda.toLowerCase()) ||
        r.sistema.toLowerCase().includes(busqueda.toLowerCase()) ||
        r.tecnico?.toLowerCase().includes(busqueda.toLowerCase()) ||
        // Añadimos la búsqueda por ID (Documento)
        r.id.toLowerCase().includes(busqueda.toLowerCase())
    );

    const agregarRepuestoALista = () => {
        if (!nuevoRepuesto.descripcion.trim()) return;
        setRepuestos([...repuestos, { ...nuevoRepuesto, descripcion: nuevoRepuesto.descripcion.toUpperCase() }]);
        setNuevoRepuesto({ descripcion: '', cantidad: 1, id: null });
    }

    return (
        <div className="max-w-[1600px] mx-auto space-y-4">

            {/* SAP SHELL BAR (Header) */}
            <nav className="bg-[#354a5f] text-white p-4 flex flex-col md:flex-row items-center justify-between shadow-md rounded-sm sticky top-0 z-40">
                <div className="flex items-center gap-4 w-full md:w-auto text-left leading-none">
                    <button onClick={() => router.push('/equipos')} className="p-2 hover:bg-white/10 rounded-sm transition-colors border border-white/20">
                        <ArrowLeft size={18} />
                    </button>
                    <div>
                        <h1 className="text-sm font-bold uppercase tracking-wider">Historial de Intervenciones</h1>
                        <span className="text-[10px] opacity-60 font-mono leading-none">SGM - Alejandro Aponte</span>
                    </div>
                </div>

                <div className="flex flex-col sm:flex-row items-center gap-2 w-full md:w-auto mt-4 md:mt-0 leading-none">
                    <div className="relative w-full sm:w-72">
                        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-white/50" size={14} />
                        <input
                            id="sap-main-search"
                            type="text"
                            placeholder="Buscar en historial [ALT+S]..."
                            value={busqueda}
                            onChange={(e) => setBusqueda(e.target.value)}
                            className="w-full pl-9 pr-4 py-1.5 bg-white/10 border border-white/20 rounded-sm text-xs outline-none focus:bg-white focus:text-[#32363a] transition-all font-bold"
                        />
                    </div>
                    <button
                        onClick={() => { setForm(initialForm); setIsEditing(false); setRepuestos([]); setEspecificarSistema(false); setShowModal(true); }}
                        className="w-full sm:w-auto px-6 py-1.5 bg-[#0070b1] hover:bg-[#005a8e] text-white rounded-sm font-bold text-[11px] uppercase transition-all shadow-sm flex items-center justify-center gap-2"
                        title="ALT+N"
                    >
                        <Wrench size={14} /> Nuevo Documento
                    </button>
                </div>
            </nav>

            {/* ANALYTICAL TILES (KPIs) */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <SapKpiTile label="Eventos Registrados" value={stats.total} icon={<Calendar size={18} />} color="blue" />
                <SapKpiTile label="Total Horas Invertidas" value={`${stats.duracionTotal}h`} icon={<Clock size={18} />} color="amber" />
                <SapKpiTile label="Registros de Hoy" value={stats.hoy} icon={<CheckCircle2 size={18} />} color="emerald" />
            </div>

            {/* MAIN WORKLIST AREA */}
            <div className="bg-white border border-[#d3d7d9] shadow-sm rounded-sm overflow-hidden text-left">
                <div className="px-6 py-3 border-b border-[#d3d7d9] bg-[#f2f4f5] flex items-center justify-between leading-none">
                    <div className="flex items-center gap-2 text-[#6a6d70]">
                        <LayoutGrid size={14} />
                        <span className="text-[11px] font-bold uppercase tracking-tighter">Worklist: Entradas Sincronizadas</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <Filter size={14} className="text-[#0070b1]" />
                        <span className="text-[10px] font-bold text-[#6a6d70] uppercase">Filtro Activo: {registrosFiltrados.length} Registros</span>
                    </div>
                </div>

                <div className="p-2 bg-white min-h-[400px]">
                    <TablaEventos registros={registrosFiltrados} cargando={cargando} onVerDetalle={setVerEvento} />
                </div>
            </div>

            {/* MODALES REUTILIZANDO TU LOGICA */}
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

function SapKpiTile({ label, value, icon, color }: any) {
    const borders: any = { blue: 'border-l-[#0070b1]', amber: 'border-l-[#b7791f]', emerald: 'border-l-[#107e3e]' };
    return (
        <div className={`bg-white p-4 border border-[#d3d7d9] border-l-4 ${borders[color]} rounded-sm shadow-sm flex items-center gap-4 text-left leading-none`}>
            <div className="text-slate-300">{icon}</div>
            <div>
                <p className="text-[10px] font-bold text-[#6a6d70] uppercase mb-1 leading-none">{label}</p>
                <p className="text-xl font-light text-[#32363a] leading-none font-mono tracking-tighter">{value}</p>
            </div>
        </div>
    );
}

export default function HistorialEventosPage() {
    return (
        <main className="min-h-screen bg-[#f7f9fa] p-4 font-sans text-left leading-none">
            <Suspense fallback={
                <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
                    <RefreshCw className="animate-spin text-[#0070b1]" size={40} />
                    <p className="text-xs font-bold text-[#6a6d70] uppercase tracking-widest leading-none">Conectando con SAP HANA...</p>
                </div>
            }>
                <HistorialFormContent />
            </Suspense>
        </main>
    )
}