'use client';
import React from 'react';
import { ChevronDown, ChevronUp, Clock, AlertTriangle, FileText, Mail, ShoppingCart, CheckCircle2 } from 'lucide-react';

// Interfaces (puedes moverlas a un archivo de tipos después)
export interface Repuesto {
    id: string;
    codigo_almacen: string;
    codigo_fabricante: string;
    descripcion: string;
    status: 'Creado' | 'Enviado' | 'Pedido' | 'Concluido';
    criticidad: 'Alta' | 'Media' | 'Baja';
    fecha_pedido: string;
}

export interface GrupoEquipo {
    placa: string;
    codigo_interno: string;
    repuestos: Repuesto[];
}

interface Props {
    equipos: GrupoEquipo[];
    abiertos: { [key: string]: boolean };
    onToggle: (placa: string) => void;
}

export default function TablaSeguimiento({ equipos, abiertos, onToggle }: Props) {
    return (
        <div className="space-y-4">
            {equipos.map((equipo) => (
                <AcordeonEquipo
                    key={equipo.placa}
                    equipo={equipo}
                    isOpen={!!abiertos[equipo.placa]}
                    onToggle={() => onToggle(equipo.placa)}
                />
            ))}
        </div>
    );
}

// El sub-componente AcordeonEquipo se queda aquí abajo (igual que lo tenías)
function AcordeonEquipo({ equipo, isOpen, onToggle }: { equipo: GrupoEquipo, isOpen: boolean, onToggle: () => void }) {
    // ... AQUÍ PEGAS TODA LA FUNCIÓN AcordeonEquipo QUE YA TENÍAS ...
    // (Mantenemos exactamente el mismo diseño de filas y progreso que me pasaste)
    return (
        /* Tu código del return del acordeón */
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden transition-all duration-200">
            {/* ... Todo el botón y la tabla interna ... */}
        </div>
    );
}