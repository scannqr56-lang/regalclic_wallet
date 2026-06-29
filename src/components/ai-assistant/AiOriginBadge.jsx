import { Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function AiOriginBadge({ label = 'Créée par IA', className }) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full bg-violet-100 px-2.5 py-0.5 text-xs font-medium text-violet-800',
        className,
      )}
    >
      <Sparkles className="h-3 w-3" />
      {label}
    </span>
  );
}
