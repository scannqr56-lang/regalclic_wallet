import { Link } from 'react-router-dom';
import { CheckCircle2, Circle, Lock } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

function StepIcon({ done, locked, current }) {
  if (done) return <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-600" />;
  if (locked) return <Lock className="h-5 w-5 shrink-0 text-slate-300" />;
  if (current) return <Circle className="h-5 w-5 shrink-0 text-rc-teal fill-rc-teal/20" />;
  return <Circle className="h-5 w-5 shrink-0 text-slate-300" />;
}

export default function OnboardingChecklist({
  steps,
  currentStepIndex,
  completedCount,
  totalSteps,
  loading,
}) {
  if (loading) {
    return <Skeleton className="h-72 w-full rounded-xl" />;
  }

  if (!steps?.length) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Votre progression</CardTitle>
        <CardDescription>
          {completedCount} / {totalSteps} étapes complétées
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-2">
        {steps.map((step, index) => {
          const isCurrent = index === currentStepIndex;
          const isLocked = !step.done && index > currentStepIndex;
          const content = (
            <>
              <StepIcon done={step.done} locked={isLocked} current={isCurrent} />
              <div className="min-w-0 flex-1">
                <p
                  className={cn(
                    'text-sm font-medium',
                    step.done ? 'text-slate-700' : isCurrent ? 'text-rc-navy' : 'text-slate-500',
                  )}
                >
                  {step.title}
                </p>
                <p className="text-xs text-slate-500">{step.description}</p>
              </div>
            </>
          );

          if (isLocked) {
            return (
              <div
                key={step.id}
                className="flex items-start gap-3 rounded-lg border border-dashed border-slate-200 bg-slate-50/80 px-3 py-2.5 opacity-80"
                title="Complétez l’étape précédente pour débloquer"
              >
                {content}
              </div>
            );
          }

          return (
            <Link
              key={step.id}
              to={step.href}
              className={cn(
                'flex items-start gap-3 rounded-lg border px-3 py-2.5 transition-colors hover:bg-slate-50',
                isCurrent && 'border-rc-teal/40 bg-rc-teal/5',
                step.done && 'border-emerald-100',
              )}
            >
              {content}
            </Link>
          );
        })}
      </CardContent>
    </Card>
  );
}
