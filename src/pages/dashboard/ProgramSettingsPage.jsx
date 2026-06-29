import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import DashboardLayout from '@/components/dashboard/DashboardLayout';
import ProgramCurrentCard, { ProgramEmptyState } from '@/components/program/ProgramCurrentCard';
import ProgramForm from '@/components/program/ProgramForm';
import { useMyBusiness } from '@/hooks/useMyBusiness';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import {
  buildProgramFormFromData,
  deleteLoyaltyProgram,
  EMPTY_PROGRAM_FORM,
  saveLoyaltyProgram,
} from '@/lib/loyalty-program';

/** view = lecture seule | edit | create | replace */
export default function ProgramSettingsPage() {
  const { business, loyaltyProgram, isLoading, refetch } = useMyBusiness();
  const queryClient = useQueryClient();
  const [pageMode, setPageMode] = useState('view');
  const [form, setForm] = useState({ ...EMPTY_PROGRAM_FORM });

  const hasProgram = Boolean(loyaltyProgram?.id);

  const { data: reward, isLoading: rewardLoading } = useQuery({
    queryKey: ['reward', business?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('rewards')
        .select('*')
        .eq('business_id', business.id)
        .eq('is_active', true)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!business?.id,
  });

  const syncFormFromProgram = () => {
    setForm(buildProgramFormFromData(loyaltyProgram, reward));
  };

  const invalidateProgramQueries = async () => {
    await refetch();
    await queryClient.invalidateQueries({ queryKey: ['reward', business?.id] });
    await queryClient.invalidateQueries({ queryKey: ['my-business'] });
    await queryClient.invalidateQueries({ queryKey: ['onboarding-progress', business?.id] });
  };

  const saveMutation = useMutation({
    mutationFn: () => saveLoyaltyProgram({
      businessId: business.id,
      loyaltyProgram,
      reward,
      payload: form,
    }),
    onSuccess: async () => {
      await invalidateProgramQueries();
      setPageMode('view');
      toast.success(
        hasProgram && pageMode === 'edit'
          ? 'Votre programme a bien été mis à jour.'
          : 'Programme ajouté avec succès.',
      );
    },
    onError: (error) => {
      toast.error(error?.message || 'Impossible d’enregistrer les modifications.');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: () => deleteLoyaltyProgram({
      businessId: business.id,
      programId: loyaltyProgram.id,
    }),
    onSuccess: async () => {
      await invalidateProgramQueries();
      setPageMode('view');
      setForm({ ...EMPTY_PROGRAM_FORM });
      toast.success('Le programme a bien été supprimé.');
    },
    onError: (error) => {
      toast.error(error?.message || 'Impossible de supprimer le programme.');
    },
  });

  const openCreate = () => {
    setForm({ ...EMPTY_PROGRAM_FORM });
    setPageMode('create');
  };

  const openEdit = () => {
    syncFormFromProgram();
    setPageMode('edit');
  };

  const openReplace = () => {
    setForm({ ...EMPTY_PROGRAM_FORM });
    setPageMode('replace');
  };

  const cancelEditing = () => {
    setPageMode('view');
    syncFormFromProgram();
  };

  const confirmDelete = () => {
    const confirmed = window.confirm(
      'Voulez-vous vraiment supprimer ce programme ? Vos clients ne pourront plus bénéficier de cette règle de fidélité.',
    );
    if (confirmed) deleteMutation.mutate();
  };

  const pageLoading = isLoading || (hasProgram && rewardLoading);

  if (pageLoading) {
    return (
      <DashboardLayout title="Mon programme" description="Chargement…">
        <Skeleton className="h-64 w-full" />
      </DashboardLayout>
    );
  }

  if (!business) {
    return (
      <DashboardLayout title="Mon programme">
        <Card className="max-w-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-rc-orange" />
              Commerce requis
            </CardTitle>
            <CardDescription>Créez d&apos;abord votre commerce.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild>
              <Link to="/dashboard/business">Configurer mon commerce</Link>
            </Button>
          </CardContent>
        </Card>
      </DashboardLayout>
    );
  }

  const showForm = pageMode === 'edit' || pageMode === 'create' || pageMode === 'replace';
  const formTitle = pageMode === 'create'
    ? 'Créer mon programme'
    : pageMode === 'replace'
      ? 'Remplacer le programme'
      : 'Modifier le programme';

  const formDescription = pageMode === 'replace'
    ? 'Les nouvelles règles remplaceront le programme actuel une fois enregistrées.'
    : pageMode === 'create'
      ? 'Définissez une règle simple et une récompense pour vos clients fidèles.'
      : 'Ajustez la règle et la récompense — vos clients verront les changements sur leur carte.';

  return (
    <DashboardLayout
      title="Mon programme"
      description={
        hasProgram && pageMode === 'view'
          ? 'Votre règle de fidélité est enregistrée et prête à l’emploi.'
          : 'Points ou tampons — une récompense claire pour vos clients.'
      }
    >
      <div className="space-y-6">
        {pageMode === 'view' && hasProgram ? (
          <ProgramCurrentCard
            loyaltyProgram={loyaltyProgram}
            reward={reward}
            onEdit={openEdit}
            onDelete={confirmDelete}
            onReplace={openReplace}
          />
        ) : null}

        {pageMode === 'view' && !hasProgram ? (
          <ProgramEmptyState onCreate={openCreate} />
        ) : null}

        {showForm ? (
          <ProgramForm
            form={form}
            onChange={setForm}
            onSubmit={() => saveMutation.mutate()}
            onCancel={hasProgram ? cancelEditing : undefined}
            loading={saveMutation.isPending || deleteMutation.isPending}
            title={formTitle}
            description={formDescription}
            submitLabel={
              pageMode === 'edit' || pageMode === 'replace'
                ? 'Enregistrer les modifications'
                : 'Créer mon programme'
            }
          />
        ) : null}
      </div>
    </DashboardLayout>
  );
}
