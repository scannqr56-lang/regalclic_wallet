import { Link } from 'react-router-dom';
import { Sparkles } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export default function ProgramStatusCard({ programStatus, loading }) {
  if (loading || !programStatus) return null;

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">État du programme</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-start gap-3">
          <div
            className={cn(
              'mt-0.5 h-2.5 w-2.5 shrink-0 rounded-full',
              programStatus.active ? 'bg-emerald-500' : 'bg-amber-400',
            )}
          />
          <div>
            <p className="text-sm font-semibold text-slate-900">{programStatus.label}</p>
            <p className="text-xs text-slate-500">{programStatus.detail}</p>
          </div>
        </div>
        {!programStatus.active ? (
          <Button variant="outline" size="sm" asChild>
            <Link to="/dashboard/program">
              <Sparkles className="h-4 w-4" />
              Configurer
            </Link>
          </Button>
        ) : null}
      </CardContent>
    </Card>
  );
}
