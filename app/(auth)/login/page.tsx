"use client"
import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import { LogIn, Loader2, ArrowRight, ShieldCheck, Cpu } from 'lucide-react'

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
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password: password
      })

      if (error) {
        setErrorMsg("Error de autenticación: " + error.message)
        setLoading(false)
        return
      }

      if (data?.session) {
        window.location.replace('/equipos')
      }
    } catch (err: any) {
      setErrorMsg("No se pudo conectar con SAP Cloud Services")
      setLoading(false)
    }
  }

  return (
    // Fondo con el degradado clásico de SAP Fiori
    <main className="min-h-screen bg-[#f7f9fa] bg-[radial-gradient(at_top_right,_#e7f0f7,_#f7f9fa)] flex flex-col items-center justify-center p-6 font-sans">

      {/* Logo / Branding Superior */}
      <div className="mb-8 flex flex-col items-center gap-2">
        <div className="bg-[#354a5f] p-3 rounded-lg shadow-md">
          <Cpu className="text-[#34ebff]" size={32} />
        </div>
        <div className="text-center">
          <h1 className="text-xl font-bold text-[#32363a] uppercase tracking-widest leading-none">SGM</h1>
          <p className="text-[10px] font-bold text-[#6a6d70] uppercase tracking-[0.2em] mt-1">Sistema de gestion del mantenimiento</p>
        </div>
      </div>

      {/* Card de Login Estilo SAP Quartz */}
      <div className="bg-white w-full max-w-[400px] rounded-md shadow-[0_20px_50px_rgba(0,0,0,0.05)] border border-[#d3d7d9] overflow-hidden">

        {/* Header del Card */}
        <div className="bg-[#354a5f] p-4 flex items-center gap-3">
          <ShieldCheck size={18} className="text-white opacity-80" />
          <span className="text-white text-xs font-bold uppercase tracking-wider">Identificación de Usuario</span>
        </div>

        <form onSubmit={handleLogin} className="p-8 space-y-6 text-left">

          <div className="space-y-4">
            {/* Campo Usuario */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-[#6a6d70] uppercase ml-0.5">Correo Electrónico / ID</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3 py-2.5 bg-[#f2f2f2] border-b-2 border-[#b0b3b5] text-sm font-medium outline-none focus:bg-white focus:border-[#0070b1] transition-all"
                placeholder="nombre.apellido@empresa.com"
              />
            </div>

            {/* Campo Password */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-[#6a6d70] uppercase ml-0.5">Contraseña del Sistema</label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-3 py-2.5 bg-[#f2f2f2] border-b-2 border-[#b0b3b5] text-sm font-medium outline-none focus:bg-white focus:border-[#0070b1] transition-all"
                placeholder="••••••••"
              />
            </div>
          </div>

          {/* Área de Errores */}
          <div className="min-h-[20px]">
            {errorMsg && (
              <div className="flex items-center gap-2 text-[#bb0000] bg-[#fff4f4] p-2 border border-[#ffbbbb] rounded-sm">
                <div className="w-1 h-1 rounded-full bg-[#bb0000]" />
                <p className="text-[10px] font-bold uppercase italic leading-none">{errorMsg}</p>
              </div>
            )}
          </div>

          {/* Botón Acción Principal SAP Blue */}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-[#0070b1] hover:bg-[#005a8e] text-white py-3 rounded-sm font-bold text-xs uppercase tracking-widest shadow-sm transition-all active:scale-[0.98] flex items-center justify-center gap-3 disabled:opacity-50 disabled:grayscale"
          >
            {loading ? (
              <Loader2 className="animate-spin" size={18} />
            ) : (
              <>Acceder al Terminal <ArrowRight size={16} /></>
            )}
          </button>
        </form>

        {/* Footer Técnico */}
        <div className="bg-[#f2f4f5] p-3 border-t border-[#d3d7d9] text-center">
          <span className="text-[9px] font-bold text-[#6a6d70] uppercase tracking-tighter opacity-60">
            Node.js Production Environment | Port 443 | SSL Secure
          </span>
        </div>
      </div>

      {/* Footer Legal */}
      <div className="mt-12 space-y-1 text-center leading-none">
        <p className="text-[10px] font-bold text-[#32363a] uppercase tracking-widest">
          Mantenimiento de Flota Pesada v1.0
        </p>
        <p className="text-[9px] text-[#6a6d70] uppercase font-medium">
          © 2026 AVNETWORKK - derechos reservados .
        </p>
      </div>
    </main>
  )
}