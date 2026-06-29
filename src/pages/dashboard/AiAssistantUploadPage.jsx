import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Bot,
  ExternalLink,
  FileText,
  ImageIcon,
  Loader2,
  Sparkles,
  Trash2,
} from 'lucide-react';
import { toast } from 'sonner';
import DashboardLayout from '@/components/dashboard/DashboardLayout';
import AiAssistantNav from '@/components/ai-assistant/AiAssistantNav';
import MenuUploadZone from '@/components/ai-assistant/MenuUploadZone';
import AiQuotaBanner from '@/components/ai-assistant/AiQuotaBanner';
import AiActivitySummary from '@/components/ai-assistant/AiActivitySummary';
import { useMyBusiness } from '@/hooks/useMyBusiness';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import {
  AI_MENU_STATUS_LABELS,
  deleteMenuUpload,
  fetchMenuUploads,
  formatMenuFileSize,
  getMenuUploadSignedUrl,
  isMenuPdfMime,
  uploadMenuFile,
} from '@/lib/ai-assistant';
import { fetchAssistantQuota } from '@/lib/ai-quota';

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

function UploadRow({ upload, onDelete, deleting }) {
  const [opening, setOpening] = useState(false);
  const isPdf = isMenuPdfMime(upload.file_type);
  const Icon = isPdf ? FileText : ImageIcon;
  const canDelete = upload.status === 'uploaded' || upload.status === 'failed';
  const isExtracting = upload.status === 'extracting';

  const handlePreview = async () => {
    setOpening(true);
    try {
      const url = await getMenuUploadSignedUrl(upload.storage_path);
      window.open(url, '_blank', 'noopener,noreferrer');
    } catch (error) {
      toast.error(error?.message || 'Aperçu impossible');
    } finally {
      setOpening(false);
    }
  };

  return (
    <div className="flex flex-col gap-3 rounded-lg border bg-white p-4 sm:flex-row sm:items-center">
      <div className="flex min-w-0 flex-1 items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-slate-100">
          <Icon className="h-5 w-5 text-rc-navy" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="truncate text-sm font-medium text-slate-900">{upload.file_name}</p>
            <StatusBadge status={upload.status} />
          </div>
          <p className="mt-0.5 text-xs text-slate-500">
            {formatMenuFileSize(upload.file_size)}
            {' · '}
            {new Date(upload.created_at).toLocaleString('fr-FR')}
          </p>
          {upload.error_message ? (
            <p className="mt-1 text-xs text-red-600">{upload.error_message}</p>
          ) : null}
        </div>
      </div>

      <div className="flex shrink-0 flex-wrap gap-2 sm:justify-end">
        <Button type="button" variant="outline" size="sm" asChild>
          <Link to={`/dashboard/menu/${upload.id}`}>
            {isExtracting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : upload.status === 'extracted' ? (
              <Bot className="h-4 w-4" />
            ) : (
              <Sparkles className="h-4 w-4" />
            )}
            {isExtracting
              ? 'Extraction…'
              : upload.status === 'extracted'
                ? 'Voir le menu'
                : 'Extraire'}
          </Link>
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={opening}
          onClick={handlePreview}
        >
          {opening ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <ExternalLink className="h-4 w-4" />
          )}
          Aperçu
        </Button>
        {canDelete ? (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="text-red-600 hover:bg-red-50 hover:text-red-700"
            disabled={deleting}
            onClick={() => onDelete(upload)}
          >
            {deleting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Trash2 className="h-4 w-4" />
            )}
          </Button>
        ) : null}
      </div>
    </div>
  );
}

export default function AiAssistantUploadPage() {
  const navigate = useNavigate();
  const { business, isLoading: businessLoading } = useMyBusiness();
  const queryClient = useQueryClient();
  const [uploadProgress, setUploadProgress] = useState(0);
  const [deletingId, setDeletingId] = useState(null);

  const quotaQuery = useQuery({
    queryKey: ['ai-assistant-quota', business?.id],
    queryFn: () => fetchAssistantQuota(business.id),
    enabled: !!business?.id,
  });

  const uploadsQuery = useQuery({
    queryKey: ['ai-menu-uploads', business?.id],
    queryFn: () => fetchMenuUploads(business.id),
    enabled: !!business?.id,
    refetchInterval: (query) => {
      const rows = query.state.data ?? [];
      return rows.some((row) => row.status === 'extracting') ? 3000 : false;
    },
  });

  const uploadMutation = useMutation({
    mutationFn: (file) =>
      uploadMenuFile(business.id, file, (percent) => setUploadProgress(percent)),
    onSuccess: async (upload) => {
      setUploadProgress(0);
      await queryClient.invalidateQueries({ queryKey: ['ai-menu-uploads', business.id] });
      await queryClient.invalidateQueries({ queryKey: ['ai-assistant-quota', business.id] });
      toast.success('Menu envoyé');
      if (upload?.id) {
        navigate(`/dashboard/menu/${upload.id}`);
      }
    },
    onError: (error) => {
      setUploadProgress(0);
      toast.error(error?.message || 'Upload impossible');
    },
  });

  const handleDelete = async (upload) => {
    if (!window.confirm('Supprimer ce menu ?')) return;
    setDeletingId(upload.id);
    try {
      await deleteMenuUpload(upload);
      await queryClient.invalidateQueries({ queryKey: ['ai-menu-uploads', business?.id] });
      toast.success('Menu supprimé');
    } catch (error) {
      toast.error(error?.message || 'Suppression impossible');
    } finally {
      setDeletingId(null);
    }
  };

  if (businessLoading) {
    return (
      <DashboardLayout title="Mon menu" description="Chargement…">
        <Skeleton className="h-48 w-full" />
      </DashboardLayout>
    );
  }

  if (!business) {
    return (
      <DashboardLayout
        title="Mon menu"
        description="Uploadez votre menu pour générer des suggestions fidélité"
      >
        <Card>
          <CardHeader>
            <CardTitle>Commerce requis</CardTitle>
            <CardDescription>
              Configurez d&apos;abord votre commerce avant d&apos;utiliser l&apos;assistant IA.
            </CardDescription>
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

  const uploads = uploadsQuery.data ?? [];
  const quota = quotaQuery.data;
  const canUpload = quota?.assistant_enabled && quota?.upload?.allowed;

  return (
    <DashboardLayout
      title="Mon menu"
      description="Importez votre carte pour recevoir des idées d’offres adaptées à vos plats"
    >
      <div className="space-y-6">
        <AiAssistantNav />

        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Bot className="h-5 w-5 text-rc-teal" />
              <CardTitle>Envoyer un menu</CardTitle>
            </div>
            <CardDescription>
              Fichiers stockés de façon privée. Après l&apos;envoi, extrayez le contenu avec l&apos;IA
              ou saisissez-le manuellement.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <AiQuotaBanner quota={quota} kind="upload" />
            <AiActivitySummary businessId={business?.id} />
            <MenuUploadZone
              disabled={uploadMutation.isPending || !canUpload}
              uploading={uploadMutation.isPending}
              progress={uploadProgress}
              onUpload={(file) => uploadMutation.mutateAsync(file)}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Menus envoyés</CardTitle>
            <CardDescription>
              Historique des uploads pour {business.name}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {uploadsQuery.isLoading ? (
              <div className="space-y-3">
                <Skeleton className="h-20 w-full" />
                <Skeleton className="h-20 w-full" />
              </div>
            ) : uploads.length === 0 ? (
              <p className="text-sm text-slate-500">
                Aucun menu pour l&apos;instant. Envoyez un PDF ou une photo de votre carte.
              </p>
            ) : (
              <div className="space-y-3">
                {uploads.map((upload) => (
                  <UploadRow
                    key={upload.id}
                    upload={upload}
                    deleting={deletingId === upload.id}
                    onDelete={handleDelete}
                  />
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
