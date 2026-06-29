import { Link, useLocation } from 'react-router-dom';
import { LayoutDashboard, Store, Sparkles, QrCode, ScanLine, Users, Megaphone, LogOut, Bot } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/lib/AuthContext';
import { Button } from '@/components/ui/button';

const NAV = [
  { to: '/dashboard', label: 'Accueil', icon: LayoutDashboard, end: true },
  { to: '/dashboard/business', label: 'Commerce', icon: Store },
  { to: '/dashboard/program', label: 'Programme', icon: Sparkles },
  { to: '/dashboard/offers', label: 'Offres promo', icon: Megaphone },
  { to: '/dashboard/ai-assistant/upload', label: 'Assistant IA', icon: Bot, matchPrefix: '/dashboard/ai-assistant' },
  { to: '/dashboard/qr', label: 'QR inscription', icon: QrCode },
  { to: '/dashboard/scan', label: 'Scanner', icon: ScanLine },
  { to: '/dashboard/customers', label: 'Clients', icon: Users },
];

export default function DashboardLayout({ children, title, description }) {
  const location = useLocation();
  const { logout } = useAuth();

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="border-b bg-rc-navy text-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
          <div>
            <p className="text-xs font-medium uppercase tracking-wider text-rc-teal">RegalClic Wallet</p>
            <h1 className="text-lg font-semibold">{title}</h1>
            {description ? <p className="text-sm text-white/70">{description}</p> : null}
          </div>
          <Button variant="ghost" size="sm" className="text-white hover:bg-white/10" onClick={logout}>
            <LogOut className="h-4 w-4" />
            Déconnexion
          </Button>
        </div>
      </header>

      <div className="mx-auto grid max-w-6xl gap-6 px-4 py-6 lg:grid-cols-[220px_1fr]">
        <nav className="flex gap-2 overflow-x-auto lg:flex-col lg:overflow-visible">
          {NAV.map(({ to, label, icon: Icon, end, matchPrefix }) => {
            const active = matchPrefix
              ? location.pathname.startsWith(matchPrefix)
              : end
                ? location.pathname === to
                : location.pathname.startsWith(to);
            return (
              <Link
                key={to}
                to={to}
                className={cn(
                  'flex items-center gap-2 rounded-lg px-3 py-2.5 text-sm font-medium whitespace-nowrap transition-colors',
                  active
                    ? 'bg-rc-navy text-white shadow'
                    : 'bg-white text-slate-700 hover:bg-slate-100',
                )}
              >
                <Icon className="h-4 w-4" />
                {label}
              </Link>
            );
          })}
        </nav>

        <main>{children}</main>
      </div>
    </div>
  );
}
