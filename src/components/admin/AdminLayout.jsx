import { LogOut, Menu, Shield, X } from 'lucide-react';
import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '@/lib/AuthContext';
import { Button } from '@/components/ui/button';
import SkipToContent from '@/components/ui/skip-to-content';
import { cn } from '@/lib/utils';

const ADMIN_NAV = [
  { to: '/admin/merchants', label: 'Commerces' },
  { to: '/admin/prospects', label: 'Prospects' },
];

export default function AdminLayout({ children, title, description }) {
  const { user, logout } = useAuth();
  const location = useLocation();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  return (
    <div className="min-h-screen overflow-x-hidden bg-slate-50">
      <SkipToContent />
      <header className="sticky top-0 z-40 border-b bg-white shadow-sm">
        <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-3 sm:py-4">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="shrink-0 sm:hidden"
            onClick={() => setMobileNavOpen((open) => !open)}
            aria-label="Menu admin"
          >
            {mobileNavOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>
          <div className="flex min-w-0 flex-1 items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-rc-navy text-white">
              <Shield className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-medium text-rc-teal">RegalClic Admin</p>
              <p className="truncate text-xs text-slate-500">{user?.email}</p>
            </div>
          </div>
          <Button variant="ghost" size="sm" className="shrink-0" onClick={() => logout()}>
            <LogOut className="h-4 w-4" />
            <span className="hidden sm:inline">Déconnexion</span>
          </Button>
        </div>
        <nav className="border-t bg-slate-50 px-4 py-2">
          <div className={cn('flex flex-wrap gap-2', !mobileNavOpen && 'hidden sm:flex')}>
            {ADMIN_NAV.map((item) => {
              const active = location.pathname.startsWith(item.to);
              return (
                <Link
                  key={item.to}
                  to={item.to}
                  onClick={() => setMobileNavOpen(false)}
                  className={cn(
                    'rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                    active
                      ? 'bg-rc-navy text-white'
                      : 'text-slate-600 hover:bg-white hover:text-rc-navy',
                  )}
                >
                  {item.label}
                </Link>
              );
            })}
          </div>
        </nav>
      </header>

      <main id="main-content" className="mx-auto max-w-6xl scroll-mt-20 px-4 py-4 sm:py-6">
        {title ? (
          <div className="mb-4 sm:mb-6">
            <h1 className="text-xl font-bold text-slate-900 sm:text-2xl">{title}</h1>
            {description ? <p className="mt-1 text-sm text-slate-600">{description}</p> : null}
          </div>
        ) : null}
        <div className="min-w-0">{children}</div>
      </main>
    </div>
  );
}
