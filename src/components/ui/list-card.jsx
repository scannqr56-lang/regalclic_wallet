import { cn } from '@/lib/utils';

/** Carte verticale pour remplacer une ligne de tableau sur mobile. */
export function ListCard({ className, children }) {
  return (
    <li className={cn('rounded-xl border border-slate-200 bg-white p-4 shadow-sm', className)}>
      {children}
    </li>
  );
}

export function ListCardHeader({ className, children }) {
  return (
    <div className={cn('space-y-2', className)}>
      {children}
    </div>
  );
}

export function ListCardMeta({ className, children }) {
  return (
    <p className={cn('text-xs text-muted-foreground', className)}>
      {children}
    </p>
  );
}

export function ListCardBody({ className, children }) {
  return (
    <div className={cn('mt-3 space-y-2 text-sm', className)}>
      {children}
    </div>
  );
}

export function ListCardFooter({ className, children }) {
  return (
    <div className={cn('mt-4 border-t border-slate-100 pt-3', className)}>
      {children}
    </div>
  );
}
