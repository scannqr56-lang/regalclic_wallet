import { useEffect } from 'react';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { SUGGESTION_TYPE_LABELS } from '@/lib/ai-suggestions';

const textareaClassName =
  'flex min-h-[88px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring';

export default function SuggestionEditModal({
  open,
  suggestion,
  calendarItem,
  form,
  onChange,
  onClose,
  onSubmit,
  loading,
  submitLabel = 'Utiliser',
}) {
  useEffect(() => {
    if (!open) return undefined;
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previous;
    };
  }, [open]);

  if (!open) return null;

  const isCalendar = Boolean(calendarItem);
  const type = suggestion?.suggestion_type;
  const title = isCalendar
    ? 'Utiliser cette entrée calendrier'
    : `Modifier — ${SUGGESTION_TYPE_LABELS[type] || type}`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button
        type="button"
        className="absolute inset-0 bg-black/50"
        aria-label="Fermer"
        onClick={onClose}
      />
      <div className="relative z-10 max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-xl border bg-white p-6 shadow-xl">
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">{title}</h2>
            <p className="mt-1 text-sm text-slate-500">
              Ajustez les champs avant application — rien n&apos;est publié automatiquement.
            </p>
          </div>
          <Button type="button" size="sm" variant="ghost" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        <form
          className="space-y-4"
          onSubmit={(event) => {
            event.preventDefault();
            onSubmit?.();
          }}
        >
          {(type === 'offer' || type === 'notification' || isCalendar) ? (
            <>
              <div className="space-y-2">
                <Label htmlFor="edit-title">Titre campagne</Label>
                <Input
                  id="edit-title"
                  value={form?.title ?? ''}
                  onChange={(e) => onChange({ ...form, title: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-message">Message carte Wallet</Label>
                <textarea
                  id="edit-message"
                  className={textareaClassName}
                  value={form?.message ?? ''}
                  onChange={(e) => onChange({ ...form, message: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-offer-label">Libellé court (optionnel)</Label>
                <Input
                  id="edit-offer-label"
                  value={form?.offer_label ?? ''}
                  onChange={(e) => onChange({ ...form, offer_label: e.target.value })}
                />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="edit-starts">Début</Label>
                  <Input
                    id="edit-starts"
                    type="datetime-local"
                    value={form?.starts_at ?? ''}
                    onChange={(e) => onChange({ ...form, starts_at: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-ends">Fin</Label>
                  <Input
                    id="edit-ends"
                    type="datetime-local"
                    value={form?.ends_at ?? ''}
                    onChange={(e) => onChange({ ...form, ends_at: e.target.value })}
                  />
                </div>
              </div>
            </>
          ) : null}

          {type === 'reward' ? (
            <>
              <div className="space-y-2">
                <Label htmlFor="edit-reward-title">Libellé récompense</Label>
                <Input
                  id="edit-reward-title"
                  value={form?.title ?? ''}
                  onChange={(e) => onChange({ ...form, title: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-reward-desc">Description</Label>
                <Input
                  id="edit-reward-desc"
                  value={form?.description ?? ''}
                  onChange={(e) => onChange({ ...form, description: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-reward-threshold">Seuil (points ou tampons)</Label>
                <Input
                  id="edit-reward-threshold"
                  type="number"
                  min="1"
                  value={form?.recommended_threshold ?? ''}
                  onChange={(e) => onChange({
                    ...form,
                    recommended_threshold: e.target.value === '' ? '' : Number(e.target.value),
                  })}
                />
              </div>
            </>
          ) : null}

          {type === 'threshold' ? (
            <>
              <div className="space-y-2">
                <Label htmlFor="edit-threshold">Seuil recommandé</Label>
                <Input
                  id="edit-threshold"
                  type="number"
                  min="1"
                  value={form?.recommended_threshold ?? ''}
                  onChange={(e) => onChange({
                    ...form,
                    recommended_threshold: e.target.value === '' ? '' : Number(e.target.value),
                  })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-threshold-desc">Note</Label>
                <Input
                  id="edit-threshold-desc"
                  value={form?.description ?? ''}
                  onChange={(e) => onChange({ ...form, description: e.target.value })}
                />
              </div>
            </>
          ) : null}

          <div className="flex flex-wrap justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={onClose} disabled={loading}>
              Annuler
            </Button>
            <Button type="submit" disabled={loading}>
              {submitLabel}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
