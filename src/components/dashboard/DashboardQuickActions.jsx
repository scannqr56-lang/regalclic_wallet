import { Link } from 'react-router-dom';
import {
  Megaphone,
  Palette,
  QrCode,
  ScanLine,
  Users,
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';

const ACTIONS = [
  {
    to: '/dashboard/scan',
    label: 'Scanner un client',
    description: 'Points, tampons ou récompense',
    icon: ScanLine,
    accent: 'bg-rc-navy/10 text-rc-navy',
  },
  {
    to: '/dashboard/customers',
    label: 'Voir les clients',
    description: 'Fiches et historique',
    icon: Users,
    accent: 'bg-rc-teal/15 text-rc-teal',
  },
  {
    to: '/dashboard/offers',
    label: 'Créer une offre',
    description: 'Promo Wallet',
    icon: Megaphone,
    accent: 'bg-rc-orange/10 text-rc-orange',
  },
  {
    to: '/dashboard/business?section=wallet',
    label: 'Carte Wallet',
    description: 'Logo, couleurs, textes',
    icon: Palette,
    accent: 'bg-violet-100 text-violet-700',
  },
  {
    to: '/dashboard/qr',
    label: 'QR inscription',
    description: 'Nouveaux clients',
    icon: QrCode,
    accent: 'bg-slate-100 text-slate-700',
  },
];

export default function DashboardQuickActions() {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Accès rapide</CardTitle>
        <CardDescription>Actions du quotidien en caisse</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {ACTIONS.map(({ to, label, description, icon: Icon, accent }) => (
            <Link
              key={to}
              to={to}
              className="flex min-h-[4.5rem] items-center gap-3 rounded-xl border border-slate-200 bg-white p-4 transition-colors hover:border-rc-teal/40 hover:bg-slate-50 active:bg-slate-100"
            >
              <div className={cn('flex h-11 w-11 shrink-0 items-center justify-center rounded-xl', accent)}>
                <Icon className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <p className="font-medium text-slate-900">{label}</p>
                <p className="truncate text-xs text-muted-foreground">{description}</p>
              </div>
            </Link>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
