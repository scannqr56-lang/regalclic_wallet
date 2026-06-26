/**
 * Préparation images Wallet côté client (validation + redimensionnement canvas).
 * Référence dimensions : docs/WALLET_CARD_SPEC.md
 */

export const WALLET_ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
export const WALLET_MAX_BYTES = 2 * 1024 * 1024;

export const WALLET_LOGO_MAX = { width: 800, height: 800 };
export const WALLET_HERO_TARGET = { width: 1032, height: 336 };

export function validateWalletImageFile(file) {
  if (!file) throw new Error('Aucun fichier sélectionné.');
  if (!WALLET_ALLOWED_MIME_TYPES.includes(file.type)) {
    throw new Error('Format non supporté. Utilisez PNG, JPEG ou WebP.');
  }
  if (file.size > WALLET_MAX_BYTES) {
    throw new Error('Image trop lourde (maximum 2 Mo).');
  }
}

function loadImageFromFile(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Impossible de lire cette image.'));
    };
    img.src = url;
  });
}

function canvasToBlob(canvas, mimeType, quality) {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) reject(new Error('Échec de la compression image.'));
        else resolve(blob);
      },
      mimeType,
      quality,
    );
  });
}

function fitWithinBounds(srcW, srcH, maxW, maxH) {
  const ratio = Math.min(maxW / srcW, maxH / srcH, 1);
  return {
    width: Math.max(1, Math.round(srcW * ratio)),
    height: Math.max(1, Math.round(srcH * ratio)),
  };
}

function coverCropBounds(srcW, srcH, targetW, targetH) {
  const scale = Math.max(targetW / srcW, targetH / srcH);
  const drawW = srcW * scale;
  const drawH = srcH * scale;
  return {
    drawW,
    drawH,
    offsetX: (targetW - drawW) / 2,
    offsetY: (targetH - drawH) / 2,
  };
}

/**
 * Logo commerce : conserve le ratio, max 800×800, export WebP.
 */
export async function prepareWalletLogo(file) {
  validateWalletImageFile(file);
  const img = await loadImageFromFile(file);
  const { width, height } = fitWithinBounds(img.width, img.height, WALLET_LOGO_MAX.width, WALLET_LOGO_MAX.height);
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas non disponible.');
  ctx.drawImage(img, 0, 0, width, height);
  const blob = await canvasToBlob(canvas, 'image/webp', 0.88);
  return new File([blob], 'logo.webp', { type: 'image/webp' });
}

/**
 * Bannière Wallet : recadrage cover 1032×336, export WebP.
 */
export async function prepareWalletHero(file) {
  validateWalletImageFile(file);
  const img = await loadImageFromFile(file);
  const { width, height } = WALLET_HERO_TARGET;
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas non disponible.');
  const crop = coverCropBounds(img.width, img.height, width, height);
  ctx.drawImage(img, crop.offsetX, crop.offsetY, crop.drawW, crop.drawH);
  const blob = await canvasToBlob(canvas, 'image/webp', 0.85);
  return new File([blob], 'hero.webp', { type: 'image/webp' });
}
