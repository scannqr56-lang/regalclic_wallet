import { cn } from '@/lib/utils';

/** Classes partagées — champs confortables au doigt sur mobile. */
export const touchSelectClassName =
  'flex h-11 w-full rounded-md border border-input bg-background px-3 py-2 text-base ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:text-sm';

export const touchTextareaClassName =
  'flex min-h-[5.5rem] w-full resize-y rounded-md border border-input bg-background px-3 py-3 text-base ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:min-h-[5rem] sm:py-2 sm:text-sm';

export function FormSection({ title, description, children, className }) {
  return (
    <section className={cn('space-y-4 rounded-xl border border-slate-200 bg-white p-4 sm:p-5', className)}>
      {title ? (
        <div className="space-y-1">
          <h3 className="text-sm font-semibold text-slate-900">{title}</h3>
          {description ? <p className="text-xs text-muted-foreground">{description}</p> : null}
        </div>
      ) : null}
      {children}
    </section>
  );
}

/**
 * Barre d'actions fixée en bas sur mobile, statique sur desktop.
 * Ajoute un spacer pour éviter que le contenu soit masqué.
 */
export function FormStickyFooter({ children, className }) {
  return (
    <>
      <div className="h-[4.5rem] lg:hidden" aria-hidden />
      <div
        className={cn(
          'fixed inset-x-0 bottom-0 z-30 border-t bg-white/95 p-3 shadow-[0_-4px_20px_rgba(0,0,0,0.08)] backdrop-blur supports-[backdrop-filter]:bg-white/90',
          'lg:static lg:z-auto lg:border-0 lg:bg-transparent lg:p-0 lg:shadow-none',
          className,
        )}
      >
        {children}
      </div>
    </>
  );
}
