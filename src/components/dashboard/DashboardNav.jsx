import { Link, useLocation } from 'react-router-dom';
import { Settings2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { getVisibleNavItems, isNavItemActive } from '@/lib/dashboard-nav';

export default function DashboardNav({
  isAdvancedMode,
  onToggleNavMode,
  statuses = {},
  onNavigate,
  className,
}) {
  const location = useLocation();
  const navItems = getVisibleNavItems({ isAdvancedMode, statuses });

  return (
    <div className={cn('flex flex-col gap-2', className)}>
      <div className="flex flex-col gap-1">
        {navItems.map(({ to, label, icon: Icon, end, matchPrefixes }) => {
          const active = isNavItemActive({ to, end, matchPrefixes }, location.pathname);
          return (
            <Link
              key={to}
              to={to}
              onClick={onNavigate}
              aria-current={active ? 'page' : undefined}
              className={cn(
                'flex min-h-11 items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
                active
                  ? 'bg-rc-navy text-white shadow'
                  : 'bg-white text-slate-700 hover:bg-slate-100',
              )}
            >
              <Icon className="h-5 w-5 shrink-0" />
              <span className="truncate">{label}</span>
            </Link>
          );
        })}
      </div>

      <button
        type="button"
        onClick={onToggleNavMode}
        className="flex min-h-11 items-center gap-2 rounded-lg border border-dashed border-slate-200 bg-white px-3 py-2.5 text-left text-xs text-slate-600 transition-colors hover:bg-slate-50"
      >
        <Settings2 className="h-4 w-4 shrink-0 text-rc-teal" />
        {isAdvancedMode ? 'Revenir au mode guidé' : 'Afficher les options avancées'}
      </button>
    </div>
  );
}
