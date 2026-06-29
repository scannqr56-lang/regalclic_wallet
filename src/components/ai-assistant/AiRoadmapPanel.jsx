import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { AI_ROADMAP_ITEMS } from '@/lib/ai-roadmap';

const STATUS_STYLES = {
  preview: 'bg-emerald-100 text-emerald-800',
  planned: 'bg-slate-100 text-slate-600',
  research: 'bg-amber-100 text-amber-800',
};

const STATUS_LABELS = {
  preview: 'Aperçu disponible',
  planned: 'Planifié',
  research: 'Étude',
};

export default function AiRoadmapPanel() {
  const v2 = AI_ROADMAP_ITEMS.filter((item) => item.version === 'v2');
  const v3 = AI_ROADMAP_ITEMS.filter((item) => item.version === 'v3');

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Feuille de route V2 / V3</CardTitle>
        <CardDescription>
          Prochaines évolutions de l&apos;assistant — détail dans{' '}
          <code className="text-xs">docs/BACKLOG_ASSISTANT_IA_V2_V3.md</code>
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">V2</p>
          <ul className="space-y-2">
            {v2.map((item) => (
              <li key={item.id} className="flex items-start justify-between gap-2 text-sm">
                <span className="text-slate-700">{item.title}</span>
                <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium ${STATUS_STYLES[item.status]}`}>
                  {STATUS_LABELS[item.status]}
                </span>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">V3</p>
          <ul className="space-y-2">
            {v3.map((item) => (
              <li key={item.id} className="flex items-start justify-between gap-2 text-sm">
                <span className="text-slate-700">{item.title}</span>
                <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium ${STATUS_STYLES[item.status]}`}>
                  {STATUS_LABELS[item.status]}
                </span>
              </li>
            ))}
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}
