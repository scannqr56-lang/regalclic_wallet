import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Save, Loader2, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import DashboardLayout from '@/components/dashboard/DashboardLayout';
import { useMyBusiness } from '@/hooks/useMyBusiness';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { markProgramSuggestionApplied } from '@/lib/ai-apply-suggestion';

export default function ProgramSettingsPage() {
  const { business, loyaltyProgram, isLoading, refetch } = useMyBusiness();
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();
  const [aiBanner, setAiBanner] = useState(null);
  const [pendingAiSuggestionId, setPendingAiSuggestionId] = useState(null);

  const { data: reward } = useQuery({
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

  const [form, setForm] = useState({
    type: 'points',
    name: 'Programme fidélité',
    points_per_euro: 1,
    stamps_required: 10,
    reward_label: 'Récompense offerte',
    reward_threshold: 100,
    reward_description: '',
  });

  useEffect(() => {
    if (loyaltyProgram) {
      setForm({
        type: loyaltyProgram.type || 'points',
        name: loyaltyProgram.name || 'Programme fidélité',
        points_per_euro: Number(loyaltyProgram.points_per_euro) || 1,
        stamps_required: loyaltyProgram.stamps_required || 10,
        reward_label: loyaltyProgram.reward_label || 'Récompense offerte',
        reward_threshold: loyaltyProgram.reward_threshold || 100,
        reward_description: reward?.description || '',
      });
    }
  }, [loyaltyProgram, reward]);

  useEffect(() => {
    const suggestionId = searchParams.get('ai_suggestion_id');
    if (!suggestionId) return;

    const rewardLabel = searchParams.get('ai_reward_label');
    const rewardDescription = searchParams.get('ai_reward_description');
    const threshold = searchParams.get('ai_threshold');
    const isStamps = searchParams.get('ai_stamps') === '1' || loyaltyProgram?.type === 'stamps';

    setForm((prev) => ({
      ...prev,
      ...(rewardLabel ? { reward_label: rewardLabel } : {}),
      ...(rewardDescription ? { reward_description: rewardDescription } : {}),
      ...(threshold && !isStamps
        ? { reward_threshold: Number(threshold) || prev.reward_threshold }
        : {}),
      ...(threshold && isStamps
        ? { stamps_required: Number(threshold) || prev.stamps_required }
        : {}),
    }));

    setAiBanner('Suggestion IA pré-remplie — vérifiez avant d’enregistrer.');
    setPendingAiSuggestionId(suggestionId);

    const next = new URLSearchParams(searchParams);
    ['ai_suggestion_id', 'ai_reward_label', 'ai_reward_description', 'ai_threshold', 'ai_stamps'].forEach((key) => {
      next.delete(key);
    });
    setSearchParams(next, { replace: true });
  }, [loyaltyProgram?.type, searchParams, setSearchParams]);

  const saveMutation = useMutation({
    mutationFn: async (payload) => {
      if (!business?.id) throw new Error('Commerce requis');

      const programPayload = {
        business_id: business.id,
        name: payload.name,
        type: payload.type,
        points_per_euro: payload.points_per_euro,
        stamps_required: payload.stamps_required,
        reward_label: payload.reward_label,
        reward_threshold: payload.type === 'points' ? payload.reward_threshold : payload.stamps_required,
        is_active: true,
      };

      let programId = loyaltyProgram?.id;

      if (programId) {
        const { error } = await supabase
          .from('loyalty_programs')
          .update(programPayload)
          .eq('id', programId);
        if (error) throw error;
      } else {
        const { data, error } = await supabase
          .from('loyalty_programs')
          .insert(programPayload)
          .select()
          .single();
        if (error) throw error;
        programId = data.id;
      }

      const thresholdValue = payload.type === 'points' ? payload.reward_threshold : payload.stamps_required;
      const rewardPayload = {
        loyalty_program_id: programId,
        business_id: business.id,
        name: payload.reward_label,
        description: payload.reward_description || null,
        threshold_value: thresholdValue,
        type: payload.type,
        is_active: true,
      };

      if (reward?.id) {
        const { error } = await supabase.from('rewards').update(rewardPayload).eq('id', reward.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('rewards').insert(rewardPayload);
        if (error) throw error;
      }

      return programId;
    },
    onSuccess: async (programId) => {
      if (pendingAiSuggestionId) {
        await markProgramSuggestionApplied(pendingAiSuggestionId, programId);
        setPendingAiSuggestionId(null);
        setAiBanner(null);
        queryClient.invalidateQueries({ queryKey: ['ai-all-suggestions', business?.id] });
      }
      await refetch();
      queryClient.invalidateQueries({ queryKey: ['reward', business?.id] });
      queryClient.invalidateQueries({ queryKey: ['my-business'] });
      toast.success('Programme enregistré');
    },
    onError: (error) => toast.error(error?.message || 'Erreur lors de la sauvegarde'),
  });

  if (isLoading) {
    return (
      <DashboardLayout title="Programme">
        <Skeleton className="h-64 w-full" />
      </DashboardLayout>
    );
  }

  if (!business) {
    return (
      <DashboardLayout title="Programme de fidélité">
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

  return (
    <DashboardLayout
      title="Programme de fidélité"
      description="Choisissez points ou tampons et définissez la récompense."
    >
      <Card>
        <CardHeader>
          <CardTitle>Type de programme</CardTitle>
          <CardDescription>Un seul programme actif par commerce en V1.</CardDescription>
        </CardHeader>
        <CardContent>
          {aiBanner ? (
            <div className="mb-4 rounded-lg border border-violet-200 bg-violet-50 px-4 py-3 text-sm text-violet-900">
              {aiBanner}
            </div>
          ) : null}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              saveMutation.mutate(form);
            }}
            className="space-y-6 max-w-xl"
          >
            <div className="grid grid-cols-2 gap-3">
              {[
                { value: 'points', label: 'Points', desc: '1 € = X points' },
                { value: 'stamps', label: 'Tampons', desc: '1 achat = 1 tampon' },
              ].map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setForm((prev) => ({ ...prev, type: option.value }))}
                  className={cn(
                    'rounded-xl border p-4 text-left transition-colors',
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
              <Label htmlFor="name">Nom du programme</Label>
              <Input
                id="name"
                value={form.name}
                onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
              />
            </div>

            {form.type === 'points' ? (
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="points_per_euro">Points par euro</Label>
                  <Input
                    id="points_per_euro"
                    type="number"
                    min="0.1"
                    step="0.1"
                    value={form.points_per_euro}
                    onChange={(e) => setForm((p) => ({ ...p, points_per_euro: Number(e.target.value) }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="reward_threshold">Seuil récompense (points)</Label>
                  <Input
                    id="reward_threshold"
                    type="number"
                    min="1"
                    value={form.reward_threshold}
                    onChange={(e) => setForm((p) => ({ ...p, reward_threshold: Number(e.target.value) }))}
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
                  onChange={(e) => setForm((p) => ({ ...p, stamps_required: Number(e.target.value) }))}
                />
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="reward_label">Récompense</Label>
              <Input
                id="reward_label"
                value={form.reward_label}
                onChange={(e) => setForm((p) => ({ ...p, reward_label: e.target.value }))}
                placeholder="Boisson offerte, Menu offert…"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="reward_description">Description (optionnel)</Label>
              <Input
                id="reward_description"
                value={form.reward_description}
                onChange={(e) => setForm((p) => ({ ...p, reward_description: e.target.value }))}
                placeholder="Ex. : une boisson au choix"
              />
            </div>

            <Button type="submit" disabled={saveMutation.isPending}>
              {saveMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              Enregistrer le programme
            </Button>
          </form>
        </CardContent>
      </Card>
    </DashboardLayout>
  );
}
