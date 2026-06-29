import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft,
  ArrowRight,
  Bot,
  ExternalLink,
  Loader2,
  Sparkles,
  Save,
} from 'lucide-react';
import { toast } from 'sonner';
import DashboardLayout from '@/components/dashboard/DashboardLayout';
import AiAssistantNav from '@/components/ai-assistant/AiAssistantNav';
import MenuExtractionEditor from '@/components/ai-assistant/MenuExtractionEditor';
import { useMyBusiness } from '@/hooks/useMyBusiness';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import {
  AI_MENU_STATUS_LABELS,
  extractMenuUpload,
  fetchMenuUpload,
  formatMenuFileSize,
  getMenuUploadSignedUrl,
  saveMenuExtractionManual,
} from '@/lib/ai-assistant';
import {
  countMenuItems,
  emptyExtractedMenuJson,
  normalizeExtractedMenuJson,
  validateExtractedMenuJson,
} from '@/lib/ai-menu-extraction';

function StatusBadge({ status }) {
  const styles = {
    uploaded: 'bg-blue-100 text-blue-800',
    extracting: 'bg-amber-100 text-amber-800',
    extracted: 'bg-emerald-100 text-emerald-800',
    failed: 'bg-red-100 text-red-800',
  };

  return (
    <span
      className={cn(
        'rounded-full px-2.5 py-0.5 text-xs font-medium',
        styles[status] || 'bg-slate-100 text-slate-700',
      )}
    >
      {AI_MENU_STATUS_LABELS[status] || status}
    </span>
  );
}

export default function AiAssistantMenuPage() {
  const { uploadId } = useParams();
  const queryClient = useQueryClient();
  const { business } = useMyBusiness();
  const [editorData, setEditorData] = useState(emptyExtractedMenuJson());
  const [editorTouched, setEditorTouched] = useState(false);
  const [previewLoading, setPreviewLoading] = useState(false);

  const uploadQuery = useQuery({
    queryKey: ['ai-menu-upload', uploadId],
    queryFn: () => fetchMenuUpload(uploadId),
    enabled: !!uploadId,
    refetchInterval: (query) =>
      query.state.data?.status === 'extracting' ? 3000 : false,
  });

  const upload = uploadQuery.data;

  useEffect(() => {
    if (!upload || editorTouched) return;

    if (upload.extracted_json) {
      setEditorData(normalizeExtractedMenuJson(upload.extracted_json));
    } else if (upload.status === 'uploaded' || upload.status === 'failed') {
      setEditorData(emptyExtractedMenuJson());
    }
  }, [upload, editorTouched]);

  const extractMutation = useMutation({
    mutationFn: () => extractMenuUpload(uploadId),
    onSuccess: async (result) => {
      setEditorTouched(false);
      if (result.extracted) {
        setEditorData(normalizeExtractedMenuJson(result.extracted));
      }
      await queryClient.invalidateQueries({ queryKey: ['ai-menu-upload', uploadId] });
      await queryClient.invalidateQueries({ queryKey: ['ai-menu-uploads', business?.id] });
      toast.success('Menu extrait — vérifiez les produits et prix');
    },
    onError: (error) => {
      queryClient.invalidateQueries({ queryKey: ['ai-menu-upload', uploadId] });
      queryClient.invalidateQueries({ queryKey: ['ai-menu-uploads', business?.id] });
      toast.error(error?.message || 'Extraction impossible');
    },
  });

  const saveMutation = useMutation({
    mutationFn: (payload) => saveMenuExtractionManual(uploadId, payload),
    onSuccess: async () => {
      setEditorTouched(false);
      await queryClient.invalidateQueries({ queryKey: ['ai-menu-upload', uploadId] });
      await queryClient.invalidateQueries({ queryKey: ['ai-menu-uploads', business?.id] });
      toast.success('Menu enregistré');
    },
    onError: (error) => {
      toast.error(error?.message || 'Enregistrement impossible');
    },
  });

  const handleSave = () => {
    const normalized = normalizeExtractedMenuJson(editorData);
    const validationError = validateExtractedMenuJson(normalized);
    if (validationError) {
      toast.error(validationError);
      return;
    }
    setEditorData(normalized);
    saveMutation.mutate(normalized);
  };

  const handleManualStart = () => {
    setEditorTouched(true);
    if (!editorData.categories.length && !editorData.menus.length) {
      setEditorData({
        ...emptyExtractedMenuJson(),
        categories: [
          {
            name: 'Carte',
            items: [{ name: '', description: null, price: null }],
          },
        ],
      });
    }
  };

  const handlePreview = async () => {
    if (!upload?.storage_path) return;
    setPreviewLoading(true);
    try {
      const url = await getMenuUploadSignedUrl(upload.storage_path);
      window.open(url, '_blank', 'noopener,noreferrer');
    } catch (error) {
      toast.error(error?.message || 'Aperçu impossible');
    } finally {
      setPreviewLoading(false);
    }
  };

  if (uploadQuery.isLoading) {
    return (
      <DashboardLayout title="Extraction menu" description="Chargement…">
        <Skeleton className="h-64 w-full" />
      </DashboardLayout>
    );
  }

  if (!upload || (business && upload.business_id !== business.id)) {
    return (
      <DashboardLayout title="Menu introuvable">
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-slate-600">Ce menu n&apos;existe pas ou vous n&apos;y avez pas accès.</p>
            <Button asChild className="mt-4">
              <Link to="/dashboard/menu">Retour aux menus</Link>
            </Button>
          </CardContent>
        </Card>
      </DashboardLayout>
    );
  }

  const isExtracting = upload.status === 'extracting' || extractMutation.isPending;
  const isExtracted = upload.status === 'extracted';
  const itemCount = countMenuItems(editorData);

  return (
    <DashboardLayout
      title="Mon menu"
      description={upload.file_name}
    >
      <div className="space-y-6">
        <AiAssistantNav />

        <Button variant="ghost" size="sm" asChild className="-ml-2">
          <Link to="/dashboard/menu">
            <ArrowLeft className="h-4 w-4" />
            Retour
          </Link>
        </Button>

        <Card>
          <CardHeader>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <CardTitle className="text-base">{upload.file_name}</CardTitle>
                  <StatusBadge status={upload.status} />
                </div>
                <CardDescription className="mt-1">
                  {formatMenuFileSize(upload.file_size)}
                  {' · '}
                  {new Date(upload.created_at).toLocaleString('fr-FR')}
                  {upload.extracted_text ? ` · ${upload.extracted_text}` : ''}
                </CardDescription>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={previewLoading}
                  onClick={handlePreview}
                >
                  {previewLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <ExternalLink className="h-4 w-4" />
                  )}
                  Fichier original
                </Button>
                <Button
                  type="button"
                  size="sm"
                  disabled={isExtracting}
                  onClick={() => extractMutation.mutate()}
                >
                  {isExtracting ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Sparkles className="h-4 w-4" />
                  )}
                  {isExtracted ? 'Ré-extraire avec l’IA' : 'Extraire avec l’IA'}
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {upload.error_message ? (
              <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
                {upload.error_message}
              </div>
            ) : null}

            {isExtracting ? (
              <div className="flex items-center gap-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-4 text-sm text-amber-900">
                <Loader2 className="h-5 w-5 animate-spin shrink-0" />
                <div>
                  <p className="font-medium">Extraction en cours…</p>
                  <p className="mt-0.5 text-amber-800/80">
                    Cela peut prendre jusqu&apos;à 90 secondes selon la taille du fichier.
                  </p>
                </div>
              </div>
            ) : null}

            {!isExtracted && !isExtracting && !editorData.categories.length && !editorData.menus.length ? (
              <div className="rounded-lg border bg-slate-50 px-4 py-6 text-center">
                <Bot className="mx-auto h-8 w-8 text-rc-teal" />
                <p className="mt-3 text-sm font-medium text-slate-900">
                  Lancez l&apos;extraction IA ou saisissez le menu manuellement
                </p>
                <div className="mt-4 flex flex-wrap justify-center gap-2">
                  <Button type="button" onClick={() => extractMutation.mutate()} disabled={extractMutation.isPending}>
                    <Sparkles className="h-4 w-4" />
                    Extraire avec l&apos;IA
                  </Button>
                  <Button type="button" variant="outline" onClick={handleManualStart}>
                    Saisie manuelle
                  </Button>
                </div>
              </div>
            ) : (
              <>
                {(editorData.categories.length > 0 || editorData.menus.length > 0 || isExtracted) && (
                  <MenuExtractionEditor
                    value={editorData}
                    disabled={isExtracting || saveMutation.isPending}
                    onChange={(next) => {
                      setEditorTouched(true);
                      setEditorData(next);
                    }}
                  />
                )}

                <div className="flex flex-wrap items-center justify-between gap-3 border-t pt-4">
                  <p className="text-xs text-slate-500">
                    {itemCount} produit(s) · {editorData.menus.length} formule(s)
                  </p>
                  <Button
                    type="button"
                    disabled={isExtracting || saveMutation.isPending}
                    onClick={handleSave}
                  >
                    {saveMutation.isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Save className="h-4 w-4" />
                    )}
                    Enregistrer le menu
                  </Button>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {isExtracted && itemCount > 0 ? (
          <Card className="border-rc-teal/30 bg-rc-teal/5">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Menu prêt</CardTitle>
              <CardDescription>
                Vérifiez les plats et prix, puis passez à l&apos;étape suivante pour recevoir des idées d&apos;offres.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button asChild size="lg">
                <Link to="/dashboard/restaurant">
                  Mon menu est bon — continuer
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
            </CardContent>
          </Card>
        ) : null}
      </div>
    </DashboardLayout>
  );
}
