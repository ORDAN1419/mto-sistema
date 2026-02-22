import { redirect } from 'next/navigation'

export default function RootPage() {
  // Solo redirige si entras a la raíz (/)
  redirect('/login')
}