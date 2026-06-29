import { Link, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';

const LINKS = [
  { to: '/dashboard/ai-assistant', label: 'Hub', end: true },
  { to: '/dashboard/ai-assistant/upload', label: 'Menu' },
  { to: '/dashboard/ai-assistant/profile', label: 'Profil' },
  { to: '/dashboard/ai-assistant/suggestions', label: 'Validation' },
  { to: '/dashboard/ai-assistant/history', label: 'Historique' },
];

export default function AiAssistantNav({ className = '' }) {
  const location = useLocation();

  return (
    <nav className={cn('flex flex-wrap gap-2', className)}>
      {LINKS.map(({ to, label, end }) => {
        const active = end
          ? location.pathname === to
          : location.pathname.startsWith(to);
        return (
          <Link
            key={to}
            to={to}
            className={cn(
              'rounded-full px-3 py-1 text-xs font-medium transition-colors',
              active
                ? 'bg-rc-navy text-white'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200',
            )}
          >
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
