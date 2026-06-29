import { ShieldCheck } from 'lucide-react';
import { cn } from '@/lib/utils';

const DEFAULT_MESSAGES = [
  'Rien n’est envoyé à vos clients sans votre validation.',
  'Vous pouvez modifier chaque idée avant de l’activer.',
  'Ces propositions sont basées sur votre carte — adaptez-les à vos marges.',
];

export default function GuidedLayout({
  children,
  messages = DEFAULT_MESSAGES,
  className = '',
}) {
  return (
    <div className={cn('space-y-6', className)}>
      <div className="rounded-lg border border-rc-teal/25 bg-rc-teal/5 px-4 py-3 text-sm text-slate-800">
        <div className="flex items-start gap-2">
          <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-rc-teal" />
          <ul className="space-y-1">
            {messages.map((message) => (
              <li key={message}>{message}</li>
            ))}
          </ul>
        </div>
      </div>
      {children}
    </div>
  );
}
