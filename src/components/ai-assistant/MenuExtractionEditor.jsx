import { Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { EXTRACTION_CONFIDENCE_LABELS } from '@/lib/ai-menu-extraction';

const textareaClassName =
  'flex min-h-[72px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring';

function updateCategory(categories, index, patch) {
  return categories.map((cat, i) => (i === index ? { ...cat, ...patch } : cat));
}

function updateItem(categories, categoryIndex, itemIndex, patch) {
  return categories.map((cat, ci) => {
    if (ci !== categoryIndex) return cat;
    return {
      ...cat,
      items: cat.items.map((item, ii) => (ii === itemIndex ? { ...item, ...patch } : item)),
    };
  });
}

export default function MenuExtractionEditor({ value, onChange, disabled = false }) {
  const data = value;

  const setData = (patch) => onChange({ ...data, ...patch });

  const addCategory = () => {
    setData({
      categories: [
        ...data.categories,
        { name: 'Nouvelle catégorie', items: [{ name: '', description: null, price: null }] },
      ],
    });
  };

  const removeCategory = (index) => {
    setData({ categories: data.categories.filter((_, i) => i !== index) });
  };

  const addItem = (categoryIndex) => {
    setData({
      categories: updateCategory(data.categories, categoryIndex, {
        items: [
          ...data.categories[categoryIndex].items,
          { name: '', description: null, price: null },
        ],
      }),
    });
  };

  const removeItem = (categoryIndex, itemIndex) => {
    setData({
      categories: updateCategory(data.categories, categoryIndex, {
        items: data.categories[categoryIndex].items.filter((_, i) => i !== itemIndex),
      }),
    });
  };

  const addMenu = () => {
    setData({
      menus: [
        ...data.menus,
        { name: 'Nouvelle formule', price: null, included_items: [] },
      ],
    });
  };

  const removeMenu = (index) => {
    setData({ menus: data.menus.filter((_, i) => i !== index) });
  };

  const updateMenu = (index, patch) => {
    setData({
      menus: data.menus.map((menu, i) => (i === index ? { ...menu, ...patch } : menu)),
    });
  };

  const notesText = (data.notes || []).join('\n');

  return (
    <div className="space-y-6">
      <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
        Les prix et produits extraits sont <strong>indicatifs</strong> — vérifiez-les selon
        votre carte réelle et vos coûts avant toute utilisation.
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="menu-currency">Devise détectée</Label>
          <Input
            id="menu-currency"
            value={data.detected_currency || 'EUR'}
            disabled={disabled}
            onChange={(e) => setData({ detected_currency: e.target.value })}
          />
        </div>
        <div className="space-y-2">
          <Label>Confiance extraction</Label>
          <p className="flex h-10 items-center text-sm text-slate-700">
            {EXTRACTION_CONFIDENCE_LABELS[data.extraction_confidence] || data.extraction_confidence}
          </p>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="menu-notes">Notes (une par ligne)</Label>
        <textarea
          id="menu-notes"
          className={textareaClassName}
          disabled={disabled}
          value={notesText}
          placeholder="Ex. Prix menu midi à vérifier"
          onChange={(e) =>
            setData({
              notes: e.target.value
                .split('\n')
                .map((line) => line.trim())
                .filter(Boolean),
            })
          }
        />
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-slate-900">Catégories & produits</h3>
          <Button type="button" variant="outline" size="sm" disabled={disabled} onClick={addCategory}>
            <Plus className="h-4 w-4" />
            Catégorie
          </Button>
        </div>

        {data.categories.length === 0 ? (
          <p className="text-sm text-slate-500">Aucune catégorie — ajoutez-en une ou lancez l&apos;extraction IA.</p>
        ) : (
          data.categories.map((category, categoryIndex) => (
            <div key={categoryIndex} className="space-y-3 rounded-lg border bg-white p-4">
              <div className="flex gap-2">
                <Input
                  value={category.name}
                  disabled={disabled}
                  placeholder="Nom de catégorie"
                  onChange={(e) =>
                    setData({
                      categories: updateCategory(data.categories, categoryIndex, {
                        name: e.target.value,
                      }),
                    })
                  }
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  disabled={disabled}
                  className="shrink-0 text-red-600"
                  onClick={() => removeCategory(categoryIndex)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>

              <div className="space-y-2">
                {category.items.map((item, itemIndex) => (
                  <div
                    key={itemIndex}
                    className="grid gap-2 rounded-md border border-slate-100 bg-slate-50 p-3 sm:grid-cols-[1fr_1fr_100px_auto]"
                  >
                    <Input
                      value={item.name}
                      disabled={disabled}
                      placeholder="Produit"
                      onChange={(e) =>
                        setData({
                          categories: updateItem(data.categories, categoryIndex, itemIndex, {
                            name: e.target.value,
                          }),
                        })
                      }
                    />
                    <Input
                      value={item.description || ''}
                      disabled={disabled}
                      placeholder="Description (opt.)"
                      onChange={(e) =>
                        setData({
                          categories: updateItem(data.categories, categoryIndex, itemIndex, {
                            description: e.target.value || null,
                          }),
                        })
                      }
                    />
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      value={item.price ?? ''}
                      disabled={disabled}
                      placeholder="Prix"
                      onChange={(e) =>
                        setData({
                          categories: updateItem(data.categories, categoryIndex, itemIndex, {
                            price: e.target.value === '' ? null : Number(e.target.value),
                            price_estimated: false,
                          }),
                        })
                      }
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      disabled={disabled}
                      className="text-red-600"
                      onClick={() => removeItem(categoryIndex, itemIndex)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>

              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={disabled}
                onClick={() => addItem(categoryIndex)}
              >
                <Plus className="h-4 w-4" />
                Produit
              </Button>
            </div>
          ))
        )}
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-slate-900">Formules / menus</h3>
          <Button type="button" variant="outline" size="sm" disabled={disabled} onClick={addMenu}>
            <Plus className="h-4 w-4" />
            Formule
          </Button>
        </div>

        {data.menus.length === 0 ? (
          <p className="text-sm text-slate-500">Aucune formule détectée.</p>
        ) : (
          data.menus.map((menu, menuIndex) => (
            <div key={menuIndex} className="space-y-2 rounded-lg border bg-white p-4">
              <div className="grid gap-2 sm:grid-cols-[1fr_120px_auto]">
                <Input
                  value={menu.name}
                  disabled={disabled}
                  placeholder="Nom formule"
                  onChange={(e) => updateMenu(menuIndex, { name: e.target.value })}
                />
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  value={menu.price ?? ''}
                  disabled={disabled}
                  placeholder="Prix"
                  onChange={(e) =>
                    updateMenu(menuIndex, {
                      price: e.target.value === '' ? null : Number(e.target.value),
                    })
                  }
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  disabled={disabled}
                  className="text-red-600"
                  onClick={() => removeMenu(menuIndex)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
              <div className="space-y-1">
                <Label>Inclus (séparés par des virgules)</Label>
                <Input
                  value={(menu.included_items || []).join(', ')}
                  disabled={disabled}
                  placeholder="plat, boisson, dessert"
                  onChange={(e) =>
                    updateMenu(menuIndex, {
                      included_items: e.target.value
                        .split(',')
                        .map((s) => s.trim())
                        .filter(Boolean),
                    })
                  }
                />
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
