export default function ProspectFormLayout({ children }) {
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
      <header className="border-b bg-rc-navy px-4 py-5 text-white">
        <div className="mx-auto flex max-w-3xl items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/10 text-sm font-bold">
            RC
          </div>
          <div>
            <p className="text-sm font-semibold">RegalClic</p>
            <p className="text-xs text-white/70">Formulaire commercial</p>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-3xl px-4 py-6 sm:py-8">
        {children}
      </main>
    </div>
  );
}
