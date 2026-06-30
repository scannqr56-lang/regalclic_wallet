import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { touchTextareaClassName } from '@/components/ui/form-layout';
import ResponsiveModal from '@/components/ui/responsive-modal';
import { ResponsiveActions } from '@/components/ui/responsive-actions';
import { SUGGESTION_TYPE_LABELS } from '@/lib/ai-suggestions';

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
  const isCalendar = Boolean(calendarItem);
  const type = suggestion?.suggestion_type;
  const title = isCalendar
    ? 'Utiliser cette entrée calendrier'
    : `Modifier — ${SUGGESTION_TYPE_LABELS[type] || type}`;

  return (
    <ResponsiveModal
      open={open}
      onClose={onClose}
      title={title}
      description="Ajustez les champs avant application — rien n'est publié automatiquement."
      footer={(
        <ResponsiveActions className="sm:justify-end">
          <Button type="button" variant="outline" onClick={onClose} disabled={loading}>
            Annuler
          </Button>
          <Button
            type="submit"
            form="suggestion-edit-form"
            disabled={loading}
            className="sm:min-w-[8rem]"
          >
            {submitLabel}
          </Button>
        </ResponsiveActions>
      )}
    >
      <form
        id="suggestion-edit-form"
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
                className={touchTextareaClassName}
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
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
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
                inputMode="numeric"
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
                inputMode="numeric"
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
      </form>
    </ResponsiveModal>
  );
}
