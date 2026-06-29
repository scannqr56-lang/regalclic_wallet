import { supabase } from '@/lib/supabase';

const AI_MENU_UPLOAD_FUNCTION = 'ai-menu-upload';
const AI_EXTRACT_MENU_FUNCTION = 'ai-extract-menu';
const AI_MENU_BUCKET = 'business-private';
const EXTRACT_TIMEOUT_MS = 120_000;

export const AI_MENU_MAX_SIZE_BYTES = 10 * 1024 * 1024;
export const AI_MENU_MAX_SIZE_MB = 10;

export const AI_MENU_ACCEPTED_MIME_TYPES = [
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/webp',
];

export const AI_MENU_ACCEPT_EXTENSIONS = '.pdf,.jpg,.jpeg,.png,.webp';

export const AI_MENU_STATUS_LABELS = {
  uploaded: 'En attente',
  extracting: 'Extraction…',
  extracted: 'Extrait',
  failed: 'Échec',
};

function getSupabaseConfig() {
  const url = import.meta.env.VITE_SUPABASE_URL ?? '';
  const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY ?? '';
  return { url, anonKey };
}

export function formatMenuFileSize(bytes) {
  if (!bytes || bytes < 1024) return `${bytes || 0} o`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} Ko`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} Mo`;
}

export function isAcceptedMenuFile(file) {
  if (!file) return false;
  if (AI_MENU_ACCEPTED_MIME_TYPES.includes(file.type)) return true;
  const name = file.name.toLowerCase();
  return /\.(pdf|jpe?g|png|webp)$/.test(name);
}

export function validateMenuFile(file) {
  if (!file) return 'Aucun fichier sélectionné';
  if (!isAcceptedMenuFile(file)) {
    return 'Format non supporté. Utilisez PDF, JPG, PNG ou WebP.';
  }
  if (file.size > AI_MENU_MAX_SIZE_BYTES) {
    return `Fichier trop volumineux (max ${AI_MENU_MAX_SIZE_MB} Mo).`;
  }
  if (file.size <= 0) return 'Fichier vide';
  return null;
}

export async function fetchMenuUpload(uploadId) {
  const { data, error } = await supabase
    .from('ai_menu_uploads')
    .select('*')
    .eq('id', uploadId)
    .maybeSingle();

  if (error) throw error;
  return data;
}

async function invokeAiExtractMenu(action, payload = {}) {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.access_token) throw new Error('Session expirée');

  const { url, anonKey } = getSupabaseConfig();
  const endpoint = `${url.replace(/\/$/, '')}/functions/v1/${AI_EXTRACT_MENU_FUNCTION}`;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), EXTRACT_TIMEOUT_MS);

  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${session.access_token}`,
        apikey: anonKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ action, ...payload }),
      signal: controller.signal,
    });

    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(data.error || 'Extraction impossible');
    }
    return data;
  } catch (error) {
    if (error.name === 'AbortError') {
      throw new Error(
        "Délai dépassé (2 min) — l'extraction peut encore tourner côté serveur. Actualisez la page dans un instant.",
      );
    }
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

export function extractMenuUpload(menuUploadId) {
  return invokeAiExtractMenu('extract', { menu_upload_id: menuUploadId });
}

export function saveMenuExtractionManual(menuUploadId, extractedJson) {
  return invokeAiExtractMenu('save_manual', {
    menu_upload_id: menuUploadId,
    extracted_json: extractedJson,
  });
}

export async function fetchMenuUploads(businessId) {
  const { data, error } = await supabase
    .from('ai_menu_uploads')
    .select('*')
    .eq('business_id', businessId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data ?? [];
}

export async function getMenuUploadSignedUrl(storagePath, expiresIn = 3600) {
  const { data, error } = await supabase.storage
    .from(AI_MENU_BUCKET)
    .createSignedUrl(storagePath, expiresIn);

  if (error) throw error;
  return data.signedUrl;
}

export async function deleteMenuUpload(upload) {
  const { error: storageError } = await supabase.storage
    .from(AI_MENU_BUCKET)
    .remove([upload.storage_path]);

  if (storageError) throw storageError;

  const { error } = await supabase
    .from('ai_menu_uploads')
    .delete()
    .eq('id', upload.id);

  if (error) throw error;
}

/**
 * Upload menu via Edge Function (validation MIME + taille côté serveur).
 * @param {string} businessId
 * @param {File} file
 * @param {(percent: number) => void} [onProgress]
 */
export function uploadMenuFile(businessId, file, onProgress) {
  const validationError = validateMenuFile(file);
  if (validationError) return Promise.reject(new Error(validationError));

  return new Promise(async (resolve, reject) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        reject(new Error('Session expirée'));
        return;
      }

      const { url, anonKey } = getSupabaseConfig();
      const endpoint = `${url.replace(/\/$/, '')}/functions/v1/${AI_MENU_UPLOAD_FUNCTION}`;

      const formData = new FormData();
      formData.append('business_id', businessId);
      formData.append('file', file);

      const xhr = new XMLHttpRequest();
      xhr.open('POST', endpoint);
      xhr.setRequestHeader('Authorization', `Bearer ${session.access_token}`);
      xhr.setRequestHeader('apikey', anonKey);

      xhr.upload.onprogress = (event) => {
        if (!onProgress || !event.lengthComputable) return;
        onProgress(Math.round((event.loaded / event.total) * 100));
      };

      xhr.onload = () => {
        let data = {};
        try {
          data = JSON.parse(xhr.responseText || '{}');
        } catch {
          // ignore
        }

        if (xhr.status >= 200 && xhr.status < 300) {
          resolve(data.upload);
          return;
        }

        reject(new Error(data.error || 'Upload impossible'));
      };

      xhr.onerror = () => reject(new Error('Erreur réseau — vérifiez votre connexion'));
      xhr.onabort = () => reject(new Error('Upload annulé'));

      xhr.send(formData);
    } catch (error) {
      reject(error);
    }
  });
}

export function isMenuImageMime(mimeType) {
  return mimeType?.startsWith('image/');
}

export function isMenuPdfMime(mimeType) {
  return mimeType === 'application/pdf';
}
