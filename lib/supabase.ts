import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''

// Si las variables están vacías, lanzamos un aviso más claro en la consola
if (!supabaseUrl || !supabaseAnonKey) {
  console.error("⚠️ Error: Las llaves de Supabase no están configuradas en .env.local")
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey)