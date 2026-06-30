import { useEffect, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { LogOut, Menu, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/lib/AuthContext';
import { useMyBusiness } from '@/hooks/useMyBusiness';
import { useOnboardingProgress } from '@/hooks/useOnboardingProgress';
import { useDashboardNavMode } from '@/hooks/useDashboardNavMode';
import { useFocusTrap } from '@/hooks/useFocusTrap';
import { Button } from '@/components/ui/button';
import SkipToContent from '@/components/ui/skip-to-content';
import DashboardNav from '@/components/dashboard/DashboardNav';

export default function DashboardLayout({ children, title, description }) {
  const location = useLocation();
  const { logout } = useAuth();
  const { business, loyaltyProgram } = useMyBusiness();
  const { progress } = useOnboardingProgress(business, loyaltyProgram);
  const { isAdvancedMode, toggleNavMode } = useDashboardNavMode(progress?.onboardingComplete);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const drawerRef = useRef(null);

  useFocusTrap(drawerRef, mobileNavOpen);

  useEffect(() => {
    setMobileNavOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    if (!mobileNavOpen) return undefined;
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previous;
    };
  }, [mobileNavOpen]);

  useEffect(() => {
    if (!mobileNavOpen) return undefined;
    const onKeyDown = (event) => {
      if (event.key === 'Escape') setMobileNavOpen(false);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [mobileNavOpen]);

  const closeMobileNav = () => setMobileNavOpen(false);

  return (
    <div className="min-h-screen overflow-x-hidden bg-slate-50">
      <SkipToContent />
      <header className="sticky top-0 z-40 border-b bg-rc-navy text-white shadow-sm">
        <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-3 sm:py-4">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="shrink-0 text-white hover:bg-white/10 lg:hidden"
            onClick={() => setMobileNavOpen(true)}
            aria-label="Ouvrir le menu"
          >
            <Menu className="h-5 w-5" />
          </Button>

          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-medium uppercase tracking-wider text-rc-teal sm:text-xs">
              RegalClic Wallet
            </p>
            <h1 className="truncate text-base font-semibold sm:text-lg">{title}</h1>
            {description ? (
              <p className="hidden truncate text-sm text-white/70 sm:block">{description}</p>
            ) : null}
          </div>

          <Button
            variant="ghost"
            size="sm"
            className="shrink-0 text-white hover:bg-white/10"
            onClick={logout}
          >
            <LogOut className="h-4 w-4" />
            <span className="hidden sm:inline">Déconnexion</span>
          </Button>
        </div>
      </header>

      {/* Drawer mobile */}
      <div
        className={cn(
          'fixed inset-0 z-50 lg:hidden',
          mobileNavOpen ? 'pointer-events-auto' : 'pointer-events-none',
        )}
        aria-hidden={!mobileNavOpen}
        role="presentation"
      >
        <button
          type="button"
          className={cn(
            'absolute inset-0 bg-black/40 transition-opacity',
            mobileNavOpen ? 'opacity-100' : 'opacity-0',
          )}
          onClick={closeMobileNav}
          aria-label="Fermer le menu"
        />
        <aside
          ref={drawerRef}
          role="dialog"
          aria-modal="true"
          aria-label="Menu de navigation"
          className={cn(
            'absolute inset-y-0 left-0 flex w-[min(100vw-3rem,320px)] flex-col bg-slate-50 shadow-xl transition-transform duration-200',
            mobileNavOpen ? 'translate-x-0' : '-translate-x-full',
          )}
        >
          <div className="flex items-center justify-between border-b bg-rc-navy px-4 py-3 text-white">
            <div className="min-w-0">
              <p className="text-xs font-medium text-rc-teal">Navigation</p>
              <p className="truncate text-sm font-semibold">{business?.name || 'Mon commerce'}</p>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="shrink-0 text-white hover:bg-white/10"
              onClick={closeMobileNav}
              aria-label="Fermer le menu"
            >
              <X className="h-5 w-5" />
            </Button>
          </div>
          <nav className="flex-1 overflow-y-auto p-4">
            <DashboardNav
              isAdvancedMode={isAdvancedMode}
              onToggleNavMode={toggleNavMode}
              statuses={progress?.statuses ?? {}}
              onNavigate={closeMobileNav}
            />
          </nav>
        </aside>
      </div>

      <div className="mx-auto max-w-6xl px-4 py-4 sm:py-6 lg:grid lg:grid-cols-[240px_minmax(0,1fr)] lg:gap-8">
        <nav className="hidden lg:block">
          <div className="sticky top-[4.5rem]">
            <DashboardNav
              isAdvancedMode={isAdvancedMode}
              onToggleNavMode={toggleNavMode}
              statuses={progress?.statuses ?? {}}
            />
          </div>
        </nav>

        <main id="main-content" className="min-w-0 scroll-mt-20">{children}</main>
      </div>
    </div>
  );
}
