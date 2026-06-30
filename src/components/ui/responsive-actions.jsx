import { cn } from '@/lib/utils';

/**
 * Boutons d'action : pleine largeur et zone tactile confortable sur mobile,
 * inline sur tablette/desktop.
 */
export function ResponsiveActions({ className, children }) {
  return (
    <div
      className={cn(
        'grid grid-cols-1 gap-2 sm:flex sm:flex-wrap sm:items-center sm:gap-2',
        '[&_button]:min-h-11 [&_button]:w-full sm:[&_button]:min-h-9 sm:[&_button]:w-auto',
        '[&_a]:inline-flex [&_a]:min-h-11 [&_a]:w-full sm:[&_a]:min-h-9 sm:[&_a]:w-auto',
        className,
      )}
    >
      {children}
    </div>
  );
}
