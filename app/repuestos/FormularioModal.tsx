'use client';
import React, { useState } from 'react';
import { X, Save, Plus } from 'lucide-react';
import { supabase } from '@/lib/supabase';

interface Props {
    onSuccess: () => void; // Para refrescar la tabla cuando se guarde algo
}

export default function FormularioModal({ onSuccess }: Props) {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [formData, setFormData] = useState({
        placa: '',
        criticidad: 'Media' as 'Alta' | 'Media' | 'Baja',
        fecha_cambio: new Date().toISOString().split('T')[0],
        codigo_repuesto: '',
        descripcion: '',
        cantidad: 1
    });

    const handleGuardar = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const payload = {
                fecha_cambio: formData.fecha_cambio,
                codigo_repuesto: `${formData.codigo_repuesto} | ${formData.criticidad}`,
                descripcion: `[${formData.placa}] ${formData.descripcion}`,
                cantidad: formData.cantidad
            };
            const { error } = await supabase.from('repuestos_utilizados').insert([payload]);
            if (error) throw error;

            setIsModalOpen(false);
            setFormData({ ...formData, codigo_repuesto: '', descripcion: '', placa: '', cantidad: 1 });
            onSuccess(); // Llamamos al refresco de la tabla
        } catch (error: any) { alert(error.message); }
    };

    return (
        <>
            <button
                onClick={() => setIsModalOpen(true)}
                className="bg-blue-600 text-white px-6 py-2 rounded-lg font-bold text-sm flex items-center gap-2 hover:bg-blue-700 transition-all shadow-lg"
            >
                <Plus size={18} /> REGISTRAR PLACA
            </button>

            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
                    <div className="bg-white w-full max-w-lg rounded-[2.5rem] shadow-2xl overflow-hidden border border-slate-100">
                        <div className="p-8 flex justify-between items-center border-b border-slate-50">
                            <h2 className="text-xl font-black text-slate-800 uppercase tracking-tight">Nuevo Registro</h2>
                            <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-slate-100 rounded-full text-slate-400"><X /></button>
                        </div>
                        <form onSubmit={handleGuardar} className="p-8 space-y-5">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">Placa</label>
                                    <input required type="text" placeholder="ABC-123" value={formData.placa}
                                        onChange={(e) => setFormData({ ...formData, placa: e.target.value.toUpperCase() })}
                                        className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold focus:border-blue-500 outline-none" />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">Criticidad</label>
                                    <select value={formData.criticidad}
                                        onChange={(e) => setFormData({ ...formData, criticidad: e.target.value as any })}
                                        className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold outline-none">
                                        <option value="Baja">Baja</option>
                                        <option value="Media">Media</option>
                                        <option value="Alta">Alta</option>
                                    </select>
                                </div>
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">Descripción</label>
                                <textarea required rows={2} value={formData.descripcion}
                                    onChange={(e) => setFormData({ ...formData, descripcion: e.target.value })}
                                    className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold outline-none resize-none" />
                            </div>
                            <button type="submit" className="w-full bg-[#1E293B] text-white p-5 rounded-2xl font-black uppercase text-xs tracking-widest hover:bg-blue-600 transition-all">
                                <Save size={18} className="inline mr-2" /> GUARDAR EN BASE DE DATOS
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </>
    );
}