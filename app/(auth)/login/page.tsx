"use client"
import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import { LogIn, Mail, Lock, Loader2, ArrowRight } from 'lucide-react'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setErrorMsg(null)
    
    try {
      // 1. Intentar el login con Supabase
      const { data, error } = await supabase.auth.signInWithPassword({ 
        email: email.trim(), 
        password: password 
      })
      
      if (error) {
        setErrorMsg("Acceso denegado: " + error.message)
        setLoading(false)
        return
      }

      // 2. Si hay sesión, forzamos la redirección
      if (data?.session) {
        // Usamos location.replace para romper cualquier bucle del middleware
        window.location.replace('/equipos')
      }
    } catch (err: any) {
      setErrorMsg("Error de conexión al servidor")
      setLoading(false)
    }
  }

  return (
    <main className="min-h-screen bg-white flex items-center justify-center p-6 selection:bg-slate-900 selection:text-white">
      <div className="max-w-[340px] w-full space-y-12 animate-in fade-in zoom-in duration-700">
        
        {/* Header Minimalista Profesional */}
        <div className="space-y-3 text-left">
          <div className="w-12 h-12 bg-slate-900 rounded-2xl flex items-center justify-center text-white shadow-[0_10px_30px_rgba(0,0,0,0.1)]">
            <LogIn size={20} />
          </div>
          <div>
            <h1 className="text-3xl font-black text-slate-900 tracking-tighter italic lowercase">mto. sistema</h1>
            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-[0.3em] mt-1 italic">Gestión de Flota Pesada</p>
          </div>
        </div>

        <form onSubmit={handleLogin} className="space-y-6">
          <div className="space-y-5">
            <div className="space-y-1">
              <label className="text-[9px] font-black text-slate-300 uppercase ml-1 tracking-widest italic">Usuario</label>
              <div className="relative">
                <input 
                  type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
                  className="w-full py-3 bg-transparent border-b border-slate-100 text-sm font-bold outline-none focus:border-slate-900 transition-all placeholder:text-slate-100"
                  placeholder="correo@empresa.com"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-[9px] font-black text-slate-300 uppercase ml-1 tracking-widest italic">Contraseña</label>
              <div className="relative">
                <input 
                  type="password" required value={password} onChange={(e) => setPassword(e.target.value)}
                  className="w-full py-3 bg-transparent border-b border-slate-100 text-sm font-bold outline-none focus:border-slate-900 transition-all placeholder:text-slate-100"
                  placeholder="••••••••"
                />
              </div>
            </div>
          </div>

          {errorMsg && (
            <p className="text-[10px] font-bold text-rose-500 italic animate-in slide-in-from-top-1">
              * {errorMsg}
            </p>
          )}

          <button 
            type="submit"
            disabled={loading}
            className="w-full bg-slate-900 text-white py-5 rounded-full font-black text-[10px] uppercase tracking-[0.2em] shadow-[0_20px_40px_rgba(0,0,0,0.1)] hover:bg-blue-600 transition-all active:scale-95 flex items-center justify-center gap-3 italic disabled:opacity-50"
          >
            {loading ? <Loader2 className="animate-spin" size={16} /> : (
              <>Entrar al Sistema <ArrowRight size={14} /></>
            )}
          </button>
        </form>

        <p className="text-[9px] font-bold text-slate-200 uppercase tracking-widest text-center pt-4">
          Mantenimiento Integral © 2026
        </p>
      </div>
    </main>
  )
}