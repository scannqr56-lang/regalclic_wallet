import { Link } from 'react-router-dom';
import { ArrowRight, AlertCircle } from 'lucide-react';
import DashboardLayout from '@/components/dashboard/DashboardLayout';
import { useMyBusiness } from '@/hooks/useMyBusiness';
import { useOnboardingProgress } from '@/hooks/useOnboardingProgress';
import NextActionCard from '@/components/onboarding/NextActionCard';
import OnboardingChecklist from '@/components/onboarding/OnboardingChecklist';
import ProgramStatusCard from '@/components/onboarding/ProgramStatusCard';
import SimpleStatsRow from '@/components/onboarding/SimpleStatsRow';
import DashboardQuickActions from '@/components/dashboard/DashboardQuickActions';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';

export default function DashboardHomePage() {
  const { business, loyaltyProgram, isLoading } = useMyBusiness();
  const {
    stats,
    progress,
    isLoading: progressLoading,
  } = useOnboardingProgress(business, loyaltyProgram);

  if (isLoading) {
    return (
      <DashboardLayout title="Tableau de bord">
        <Skeleton className="h-40 w-full" />
      </DashboardLayout>
    );
  }

  if (!business) {
    return (
      <DashboardLayout
        title="Bienvenue sur RegalClic"
        description="Mettez en place votre fidélité en quelques étapes simples."
      >
        <Card className="max-w-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-rc-orange" />
              Aucun commerce configuré
            </CardTitle>
            <CardDescription>
              Créez votre restaurant ou commerce pour commencer.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild>
              <Link to="/dashboard/business">
                Configurer mon commerce
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </CardContent>
        </Card>
      </DashboardLayout>
    );
  }

  const showQuickLinks = progress?.onboardingComplete;

  return (
    <DashboardLayout
      title={`Bienvenue${business.name ? `, ${business.name}` : ''}`}
      description="Mettez en place votre fidélité en quelques étapes simples."
    >
      <div className="space-y-6">
        <NextActionCard action={progress?.nextAction} loading={progressLoading} />

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-[1.2fr_1fr]">
          <OnboardingChecklist
            steps={progress?.checklistSteps}
            currentStepIndex={progress?.currentStepIndex ?? 0}
            completedCount={progress?.completedCount ?? 0}
            totalSteps={progress?.totalSteps ?? 6}
            loading={progressLoading}
          />

          <div className="space-y-4">
            <ProgramStatusCard
              programStatus={progress?.programStatus}
              loading={progressLoading}
            />

            <SimpleStatsRow
              stats={stats}
              loyaltyProgram={loyaltyProgram}
              loading={progressLoading}
            />
          </div>
        </div>

        {showQuickLinks ? <DashboardQuickActions /> : null}
      </div>
    </DashboardLayout>
  );
}
