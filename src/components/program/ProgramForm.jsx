import { Save, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { FormStickyFooter } from '@/components/ui/form-layout';
import { ResponsiveActions } from '@/components/ui/responsive-actions';
import { cn } from '@/lib/utils';

export default function ProgramForm({
  form,
  onChange,
  onSubmit,
  onCancel,
  submitLabel = 'Enregistrer les modifications',
  loading = false,
  title = 'Modifier le programme',
  description = 'Ajustez la règle et la récompense proposée à vos clients.',
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            onSubmit();
          }}
          className="w-full space-y-6"
        >
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {[
              { value: 'points', label: 'Points', desc: '1 € = X points' },
              { value: 'stamps', label: 'Tampons', desc: '1 achat = 1 tampon' },
            ].map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => onChange({ ...form, type: option.value })}
                className={cn(
                  'min-h-[4.5rem] rounded-xl border p-4 text-left transition-colors',
                  form.type === option.value
                    ? 'border-rc-navy bg-rc-navy/5 ring-2 ring-rc-navy'
                    : 'hover:bg-muted/50',
                )}
              >
                <p className="font-semibold">{option.label}</p>
                <p className="text-sm text-muted-foreground">{option.desc}</p>
              </button>
            ))}
          </div>

          <div className="space-y-2">
            <Label htmlFor="program-name">Nom du programme</Label>
            <Input
              id="program-name"
              value={form.name}
              onChange={(e) => onChange({ ...form, name: e.target.value })}
            />
          </div>

          {form.type === 'points' ? (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="points_per_euro">Points par euro</Label>
                <Input
                  id="points_per_euro"
                  type="number"
                  min="0.1"
                  step="0.1"
                  value={form.points_per_euro}
                  onChange={(e) => onChange({
                    ...form,
                    points_per_euro: Number(e.target.value),
                  })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="reward_threshold">Seuil récompense (points)</Label>
                <Input
                  id="reward_threshold"
                  type="number"
                  min="1"
                  value={form.reward_threshold}
                  onChange={(e) => onChange({
                    ...form,
                    reward_threshold: Number(e.target.value),
                  })}
                />
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              <Label htmlFor="stamps_required">Tampons requis pour la récompense</Label>
              <Input
                id="stamps_required"
                type="number"
                min="2"
                value={form.stamps_required}
                onChange={(e) => onChange({
                  ...form,
                  stamps_required: Number(e.target.value),
                })}
              />
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="reward_label">Récompense</Label>
            <Input
              id="reward_label"
              value={form.reward_label}
              onChange={(e) => onChange({ ...form, reward_label: e.target.value })}
              placeholder="Boisson offerte, Menu offert…"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="reward_description">Description (optionnel)</Label>
            <Input
              id="reward_description"
              value={form.reward_description}
              onChange={(e) => onChange({ ...form, reward_description: e.target.value })}
              placeholder="Ex. : une boisson au choix"
            />
          </div>

          <FormStickyFooter>
            <ResponsiveActions>
              <Button type="submit" disabled={loading} className="sm:min-w-[12rem]">
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                {submitLabel}
              </Button>
              {onCancel ? (
                <Button type="button" variant="outline" onClick={onCancel} disabled={loading}>
                  Annuler
                </Button>
              ) : null}
            </ResponsiveActions>
          </FormStickyFooter>
        </form>
      </CardContent>
    </Card>
  );
}
