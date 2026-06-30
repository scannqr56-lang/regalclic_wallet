import { Link } from 'react-router-dom';
import { Pencil, Sparkles, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ResponsiveActions } from '@/components/ui/responsive-actions';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import {
  formatProgramDate,
  getProgramRuleSummary,
  getProgramStatusBadge,
  getProgramThresholdLabel,
} from '@/lib/loyalty-program';

function DetailRow({ label, value }) {
  if (!value) return null;
  return (
    <div className="flex flex-col gap-0.5 sm:flex-row sm:items-baseline sm:justify-between">
      <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</dt>
      <dd className="text-sm font-medium text-slate-900">{value}</dd>
    </div>
  );
}

export default function ProgramCurrentCard({
  loyaltyProgram,
  reward,
  onEdit,
  onDelete,
  onReplace,
}) {
  const badge = getProgramStatusBadge(loyaltyProgram);
  const typeLabel = loyaltyProgram.type === 'stamps' ? 'Tampons' : 'Points';
  const updatedLabel = formatProgramDate(loyaltyProgram.updated_at || loyaltyProgram.created_at);

  return (
    <Card className="border-rc-teal/25 bg-gradient-to-br from-white to-rc-teal/5">
      <CardHeader>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <CardTitle className="text-lg">Programme actuel</CardTitle>
            <CardDescription className="mt-1 max-w-xl">
              Ce programme est actuellement utilisé pour votre restaurant.
              Vos clients peuvent cumuler des avantages selon cette règle.
            </CardDescription>
          </div>
          {badge ? (
            <span className={cn('rounded-full px-3 py-1 text-xs font-semibold', badge.className)}>
              {badge.label}
            </span>
          ) : null}
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        <dl className="space-y-3 rounded-lg border bg-white/80 p-4">
          <DetailRow label="Nom" value={loyaltyProgram.name} />
          <DetailRow label="Type" value={typeLabel} />
          <DetailRow label="Règle principale" value={getProgramRuleSummary(loyaltyProgram)} />
          <DetailRow label="Récompense" value={loyaltyProgram.reward_label} />
          <DetailRow label="Condition" value={getProgramThresholdLabel(loyaltyProgram)} />
          {reward?.description ? (
            <DetailRow label="Détail récompense" value={reward.description} />
          ) : null}
          {updatedLabel ? (
            <DetailRow label="Dernière modification" value={updatedLabel} />
          ) : null}
        </dl>

        <ResponsiveActions>
          <Button type="button" onClick={onEdit}>
            <Pencil className="h-4 w-4" />
            Modifier
          </Button>
          <Button type="button" variant="outline" onClick={onDelete}>
            <Trash2 className="h-4 w-4" />
            Supprimer
          </Button>
        </ResponsiveActions>

        <div className="border-t pt-4">
          <Button type="button" variant="ghost" className="h-11 w-full sm:w-auto" onClick={onReplace}>
            Remplacer par un nouveau programme
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

export function ProgramEmptyState({ onCreate }) {
  return (
    <Card className="border-dashed">
      <CardHeader className="text-center">
        <CardTitle className="text-lg">Aucun programme de fidélité configuré</CardTitle>
        <CardDescription className="mx-auto max-w-md">
          Créez un programme simple pour encourager vos clients à revenir et cumuler des avantages.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col items-center gap-3 pb-8">
        <Button type="button" size="lg" onClick={onCreate}>
          <Sparkles className="h-4 w-4" />
          Créer mon programme
        </Button>
        <Button type="button" variant="outline" size="sm" asChild>
          <Link to="/dashboard/ideas?tab=rewards">
            Voir les suggestions de récompenses
          </Link>
        </Button>
      </CardContent>
    </Card>
  );
}
