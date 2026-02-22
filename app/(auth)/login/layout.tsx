export default function AuthLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <section className="bg-slate-50 min-h-screen">
      {/* Aquí podrías poner un logo o un footer simple si quisieras */}
      {children}
    </section>
  )
}