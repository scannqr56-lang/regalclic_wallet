import { Loader2, Trash2, Upload } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { FormSection, touchTextareaClassName } from '@/components/ui/form-layout';
import { ResponsiveActions } from '@/components/ui/responsive-actions';

const colorPickerClassName = 'h-12 w-full max-w-[4.5rem] shrink-0 p-1 sm:h-11';

function ColorField({ id, label, value, onChange, placeholder }) {
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <Input
          id={id}
          type="color"
          className={colorPickerClassName}
          value={value}
          onChange={(e) => onChange(e.target.value)}
        />
        <Input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="min-w-0 flex-1"
        />
      </div>
    </div>
  );
}

export default function WalletDesignForm({
  form,
  onFieldChange,
  businessId,
  logoRef,
  heroRef,
  uploadingLogo,
  uploadingHero,
  onLogoUpload,
  onHeroUpload,
  onRemoveHero,
}) {
  return (
    <div className="space-y-4">
      <FormSection
        title="Couleurs"
        description="Couleur de fond de la carte et teinte des libellés (Apple Wallet)."
      >
        <ColorField
          id="primary_color"
          label="Couleur principale"
          value={form.primary_color}
          onChange={(v) => onFieldChange('primary_color', v)}
          placeholder="#0B1E3F"
        />
        <ColorField
          id="wallet_label_color"
          label="Couleur des libellés"
          value={form.wallet_label_color}
          onChange={(v) => onFieldChange('wallet_label_color', v)}
          placeholder="#44C4A1"
        />
      </FormSection>

      <FormSection
        title="Logo et bannière"
        description="Visuels affichés en haut de la carte sur Apple et Google Wallet."
      >
        {businessId ? (
          <>
            <div className="space-y-2">
              <Label>Logo du commerce</Label>
              <p className="text-xs text-muted-foreground">
                PNG, JPEG ou WebP — redimensionné automatiquement (max 800×800).
              </p>
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
                {form.logo_url ? (
                  <img
                    src={form.logo_url}
                    alt="Logo"
                    className="h-20 w-20 shrink-0 rounded-lg border object-cover"
                  />
                ) : (
                  <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-lg border bg-muted text-xs text-muted-foreground">
                    Aucun
                  </div>
                )}
                <input
                  ref={logoRef}
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  className="hidden"
                  onChange={onLogoUpload}
                />
                <Button
                  type="button"
                  variant="outline"
                  className="w-full sm:w-auto"
                  disabled={uploadingLogo}
                  onClick={() => logoRef.current?.click()}
                >
                  {uploadingLogo ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                  {uploadingLogo ? 'Envoi…' : 'Changer le logo'}
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Bannière (optionnel)</Label>
              <p className="text-xs text-muted-foreground">
                Format recommandé 1032×336 — bandeau en haut de carte.
              </p>
              {form.wallet_hero_url ? (
                <img
                  src={form.wallet_hero_url}
                  alt="Bannière Wallet"
                  className="h-28 w-full max-w-full rounded-lg border object-cover"
                />
              ) : (
                <div className="flex h-28 w-full items-center justify-center rounded-lg border bg-muted text-xs text-muted-foreground">
                  Aucune bannière
                </div>
              )}
              <ResponsiveActions className="sm:flex-row">
                <input
                  ref={heroRef}
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  className="hidden"
                  onChange={onHeroUpload}
                />
                <Button
                  type="button"
                  variant="outline"
                  disabled={uploadingHero}
                  onClick={() => heroRef.current?.click()}
                >
                  {uploadingHero ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                  {uploadingHero ? 'Envoi…' : 'Ajouter une bannière'}
                </Button>
                {form.wallet_hero_url ? (
                  <Button type="button" variant="ghost" onClick={onRemoveHero}>
                    <Trash2 className="h-4 w-4" />
                    Supprimer
                  </Button>
                ) : null}
              </ResponsiveActions>
            </div>
          </>
        ) : (
          <p className="text-sm text-muted-foreground">
            Enregistrez d&apos;abord votre commerce pour ajouter logo et bannière.
          </p>
        )}
      </FormSection>

      <FormSection
        title="Textes sur la carte"
        description="Message visible sur la face de la carte et conditions au verso."
      >
        <div className="space-y-2">
          <Label htmlFor="wallet_promo_message">Message promo (face)</Label>
          <Input
            id="wallet_promo_message"
            value={form.wallet_promo_message}
            onChange={(e) => onFieldChange('wallet_promo_message', e.target.value)}
            placeholder="Votre fidélité récompensée"
            maxLength={120}
          />
          <p className="text-xs text-muted-foreground">
            {(form.wallet_promo_message || '').length}
            /120 caractères
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="wallet_terms">Conditions de fidélité (verso)</Label>
          <textarea
            id="wallet_terms"
            className={touchTextareaClassName}
            value={form.wallet_terms}
            onChange={(e) => onFieldChange('wallet_terms', e.target.value)}
            placeholder="Ex. : la récompense est valable 30 jours, non cumulable avec d'autres offres…"
            maxLength={800}
          />
        </div>
      </FormSection>

      <FormSection
        title="Liens rapides"
        description="Boutons accessibles depuis le verso de la carte Wallet."
      >
        <div className="space-y-2">
          <Label htmlFor="order_url">Commander en ligne</Label>
          <Input
            id="order_url"
            type="url"
            inputMode="url"
            value={form.order_url}
            onChange={(e) => onFieldChange('order_url', e.target.value)}
            placeholder="https://commander.mon-restaurant.fr"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="instagram_url">Instagram</Label>
          <Input
            id="instagram_url"
            type="url"
            inputMode="url"
            value={form.instagram_url}
            onChange={(e) => onFieldChange('instagram_url', e.target.value)}
            placeholder="https://instagram.com/monrestaurant"
          />
        </div>
      </FormSection>
    </div>
  );
}
