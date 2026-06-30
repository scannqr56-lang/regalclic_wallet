import { useEffect, useRef } from 'react';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useFocusTrap } from '@/hooks/useFocusTrap';

/**
 * Modale / bottom sheet mobile-first :
 * - mobile : plein écran, corps scrollable, pied sticky
 * - desktop : dialogue centré classique
 */
export default function ResponsiveModal({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  className,
  contentClassName,
}) {
  const dialogRef = useRef(null);
  useFocusTrap(dialogRef, open);

  useEffect(() => {
    if (!open) return undefined;
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previous;
    };
  }, [open]);

  useEffect(() => {
    if (!open) return undefined;
    const onKeyDown = (event) => {
      if (event.key === 'Escape') onClose?.();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex sm:items-center sm:justify-center sm:p-4"
      role="presentation"
    >
      <button
        type="button"
        className="absolute inset-0 bg-black/50"
        aria-label="Fermer"
        onClick={onClose}
      />
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="responsive-modal-title"
        className={cn(
          'relative z-10 flex w-full flex-col bg-white shadow-xl',
          'h-[100dvh] max-h-[100dvh] sm:h-auto sm:max-h-[min(90vh,48rem)] sm:max-w-lg',
          'sm:rounded-xl sm:border',
          className,
        )}
      >
        <div className="flex shrink-0 items-start justify-between gap-3 border-b px-4 py-4 sm:border-0 sm:px-6 sm:pb-0 sm:pt-6">
          <div className="min-w-0 pr-2">
            <h2 id="responsive-modal-title" className="text-lg font-semibold text-slate-900">
              {title}
            </h2>
            {description ? (
              <p className="mt-1 text-sm text-slate-500">{description}</p>
            ) : null}
          </div>
          <Button
            type="button"
            size="sm"
            variant="ghost"
            className="shrink-0"
            onClick={onClose}
            aria-label="Fermer la fenêtre"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div
          className={cn(
            'flex-1 overflow-y-auto overscroll-contain px-4 py-4 sm:px-6',
            contentClassName,
          )}
        >
          {children}
        </div>

        {footer ? (
          <div className="shrink-0 border-t bg-white/95 p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur sm:border-0 sm:px-6 sm:pb-6 sm:pt-2">
            {footer}
          </div>
        ) : null}
      </div>
    </div>
  );
}
