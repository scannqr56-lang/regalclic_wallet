import { LogOut, Shield } from 'lucide-react';
import { useAuth } from '@/lib/AuthContext';
import { Button } from '@/components/ui/button';

export default function AdminLayout({ children, title, description }) {
  const { user, logout } = useAuth();

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="border-b bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-rc-navy text-white">
              <Shield className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm font-medium text-rc-teal">RegalClic Admin</p>
              <p className="text-xs text-slate-500">{user?.email}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={() => logout()}>
              <LogOut className="h-4 w-4" />
              Déconnexion
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-6">
        {title ? (
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-slate-900">{title}</h1>
            {description ? <p className="mt-1 text-sm text-slate-600">{description}</p> : null}
          </div>
        ) : null}
        {children}
      </main>
    </div>
  );
}
