import { useCallback, useRef, useState } from 'react';
import { FileText, ImageIcon, Loader2, Upload, X } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import {
  AI_MENU_ACCEPT_EXTENSIONS,
  AI_MENU_MAX_SIZE_MB,
  formatMenuFileSize,
  isAcceptedMenuFile,
  validateMenuFile,
} from '@/lib/ai-assistant';

function FilePreview({ file }) {
  if (!file) return null;

  const isPdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
  const Icon = isPdf ? FileText : ImageIcon;

  return (
    <div className="flex items-center gap-3 rounded-lg border bg-slate-50 p-3">
      <div className="flex h-10 w-10 items-center justify-center rounded-md bg-white shadow-sm">
        <Icon className="h-5 w-5 text-rc-navy" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-slate-900">{file.name}</p>
        <p className="text-xs text-slate-500">{formatMenuFileSize(file.size)}</p>
      </div>
    </div>
  );
}

export default function MenuUploadZone({
  disabled = false,
  uploading = false,
  progress = 0,
  onUpload,
}) {
  const inputRef = useRef(null);
  const [dragOver, setDragOver] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);

  const clearSelection = useCallback(() => {
    setSelectedFile(null);
    if (inputRef.current) inputRef.current.value = '';
  }, []);

  const handleFile = useCallback((file) => {
    const error = validateMenuFile(file);
    if (error) {
      toast.error(error);
      return;
    }
    setSelectedFile(file);
  }, []);

  const handleInputChange = (e) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    if (disabled || uploading) return;

    const file = e.dataTransfer.files?.[0];
    if (!file) return;

    if (!isAcceptedMenuFile(file)) {
      toast.error('Format non supporté. Utilisez PDF, JPG, PNG ou WebP.');
      return;
    }

    handleFile(file);
  };

  const handleSubmit = async () => {
    if (!selectedFile || !onUpload) return;
    try {
      await onUpload(selectedFile);
      clearSelection();
    } catch {
      // erreur gérée par le parent
    }
  };

  return (
    <div className="space-y-4">
      <div
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') inputRef.current?.click();
        }}
        onDragOver={(e) => {
          e.preventDefault();
          if (!disabled && !uploading) setDragOver(true);
        }}
        onDragLeave={(e) => {
          e.preventDefault();
          setDragOver(false);
        }}
        onDrop={handleDrop}
        onClick={() => {
          if (!disabled && !uploading) inputRef.current?.click();
        }}
        className={cn(
          'flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed px-6 py-10 text-center transition-colors',
          dragOver ? 'border-rc-teal bg-rc-teal/5' : 'border-slate-300 bg-white hover:border-rc-navy/40',
          (disabled || uploading) && 'pointer-events-none opacity-60',
        )}
      >
        <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-slate-100">
          {uploading ? (
            <Loader2 className="h-6 w-6 animate-spin text-rc-navy" />
          ) : (
            <Upload className="h-6 w-6 text-rc-navy" />
          )}
        </div>
        <p className="text-sm font-medium text-slate-900">
          {uploading ? 'Envoi en cours…' : 'Glissez votre menu ici'}
        </p>
        <p className="mt-1 text-xs text-slate-500">
          PDF, JPG, PNG ou WebP — max {AI_MENU_MAX_SIZE_MB} Mo
        </p>
        {!uploading && (
          <p className="mt-3 text-xs text-rc-teal">ou cliquez pour parcourir</p>
        )}
        <input
          ref={inputRef}
          type="file"
          accept={AI_MENU_ACCEPT_EXTENSIONS}
          className="hidden"
          disabled={disabled || uploading}
          onChange={handleInputChange}
        />
      </div>

      {uploading && (
        <div className="space-y-1">
          <div className="h-2 overflow-hidden rounded-full bg-slate-200">
            <div
              className="h-full rounded-full bg-rc-teal transition-all duration-300"
              style={{ width: `${Math.max(progress, 8)}%` }}
            />
          </div>
          <p className="text-xs text-slate-500 text-right">{progress}%</p>
        </div>
      )}

      {selectedFile && !uploading && (
        <div className="space-y-3">
          <div className="flex items-start gap-2">
            <div className="flex-1">
              <FilePreview file={selectedFile} />
            </div>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="shrink-0"
              onClick={(e) => {
                e.stopPropagation();
                clearSelection();
              }}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
          <Button type="button" className="w-full" onClick={handleSubmit}>
            <Upload className="h-4 w-4" />
            Envoyer le menu
          </Button>
        </div>
      )}
    </div>
  );
}
