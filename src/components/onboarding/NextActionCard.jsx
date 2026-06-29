import { Link } from 'react-router-dom';
import { ArrowRight, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

export default function NextActionCard({ action, loading }) {
  if (loading) {
    return <Skeleton className="h-36 w-full rounded-xl" />;
  }

  if (!action) return null;

  const stepLabel = action.mature
    ? null
    : `Étape ${action.stepIndex} / ${action.totalSteps}`;

  return (
    <Card className="border-rc-teal/40 bg-gradient-to-r from-rc-teal/5 to-transparent">
      <CardHeader className="pb-2">
        {stepLabel ? (
          <p className="text-xs font-medium uppercase tracking-wide text-rc-teal">
            {stepLabel}
          </p>
        ) : null}
        <CardTitle className="flex items-center gap-2 text-base">
          <Sparkles className="h-5 w-5 text-rc-teal" />
          {action.title}
        </CardTitle>
        <CardDescription>{action.description}</CardDescription>
      </CardHeader>
      <CardContent>
        <Button asChild size="lg">
          <Link to={action.href}>
            {action.label}
            <ArrowRight className="h-4 w-4" />
          </Link>
        </Button>
      </CardContent>
    </Card>
  );
}
