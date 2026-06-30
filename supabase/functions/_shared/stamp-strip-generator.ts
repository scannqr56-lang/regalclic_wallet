/**
 * Bandeau PNG tampons — cercles sur une ligne (Apple strip + Google image module).
 *
 * Apple Store Card strip (officiel) :
 * - @1x : 375 × 123 px
 * - @2x : 750 × 246 px
 */
import { Image } from "https://deno.land/x/imagescript@1.3.0/mod.ts";

export const APPLE_STAMP_STRIP_1X = { width: 375, height: 123 } as const;
export const APPLE_STAMP_STRIP_2X = { width: 750, height: 246 } as const;
/** Bandeau Google Wallet (module image face carte). */
export const GOOGLE_STAMP_STRIP = { width: 750, height: 112 } as const;

function parseHexColor(hex: string, fallback: [number, number, number]): [number, number, number] {
  const raw = hex.replace("#", "").trim();
  if (raw.length !== 6) return fallback;
  const r = Number.parseInt(raw.slice(0, 2), 16);
  const g = Number.parseInt(raw.slice(2, 4), 16);
  const b = Number.parseInt(raw.slice(4, 6), 16);
  if ([r, g, b].some((v) => Number.isNaN(v))) return fallback;
  return [r, g, b];
}

function rgba(r: number, g: number, b: number, a = 255): number {
  return Image.rgbaToColor(r, g, b, a);
}

function drawRing(
  img: Image,
  cx: number,
  cy: number,
  radius: number,
  ringColor: number,
  fillColor: number,
  thickness = 3,
) {
  const safeThickness = Math.max(2, Math.min(thickness, Math.floor(radius * 0.35)));
  img.drawCircle(cx, cy, radius, ringColor);
  const inner = Math.max(1, radius - safeThickness);
  img.drawCircle(cx, cy, inner, fillColor);
}

export type StampStripOptions = {
  filled: number;
  total: number;
  backgroundHex: string;
  foregroundHex?: string;
  width?: number;
  height?: number;
  /** Récompense débloquée — dernier slot doré plein */
  rewardReady?: boolean;
};

export async function generateStampStripPng(options: StampStripOptions): Promise<Uint8Array> {
  const width = options.width ?? 750;
  const height = options.height ?? 112;
  const [bgR, bgG, bgB] = parseHexColor(options.backgroundHex, [26, 39, 68]);
  const [fgR, fgG, fgB] = parseHexColor(options.foregroundHex || "#ffffff", [255, 255, 255]);

  const bg = rgba(bgR, bgG, bgB);
  const fg = rgba(fgR, fgG, fgB);
  const gold = rgba(251, 191, 36);
  const goldDim = rgba(251, 191, 36, 200);
  const goldGlow = rgba(253, 224, 71, 120);

  const img = new Image(width, height);
  img.fill(bg);

  const total = Math.max(1, Math.floor(options.total));
  const filled = Math.min(Math.max(0, Math.floor(options.filled)), total);
  const rewardReady = Boolean(options.rewardReady);
  const horizontalPadding = Math.round(width * 0.04);
  const usable = width - horizontalPadding * 2;
  const step = usable / total;
  const radius = Math.min(
    Math.floor(step * 0.36),
    Math.floor(height * 0.28),
  );
  const ringThickness = Math.max(2, Math.round(radius * 0.14));

  for (let i = 0; i < total; i += 1) {
    const cx = Math.floor(horizontalPadding + step * i + step / 2);
    const cy = Math.floor(height / 2);
    const isReward = i === total - 1;
    const isFilled = i < filled;

    if (isReward) {
      if (rewardReady || isFilled) {
        if (rewardReady) {
          img.drawCircle(cx, cy, radius + 2, goldGlow);
        }
        img.drawCircle(cx, cy, radius, gold);
      } else {
        drawRing(img, cx, cy, radius, goldDim, bg, ringThickness);
      }
    } else if (isFilled) {
      img.drawCircle(cx, cy, radius, fg);
    } else {
      drawRing(img, cx, cy, radius, fg, bg, ringThickness);
    }
  }

  return await img.encode();
}

/** Génère les deux résolutions strip requises par Apple Wallet. */
export async function generateAppleStampStrips(
  options: Omit<StampStripOptions, "width" | "height">,
): Promise<{ strip1x: Uint8Array; strip2x: Uint8Array }> {
  const [strip1x, strip2x] = await Promise.all([
    generateStampStripPng({
      ...options,
      width: APPLE_STAMP_STRIP_1X.width,
      height: APPLE_STAMP_STRIP_1X.height,
    }),
    generateStampStripPng({
      ...options,
      width: APPLE_STAMP_STRIP_2X.width,
      height: APPLE_STAMP_STRIP_2X.height,
    }),
  ]);
  return { strip1x, strip2x };
}

export function buildStampStripImageUrl(
  supabaseUrl: string,
  filled: number,
  total: number,
  backgroundHex: string,
  foregroundHex?: string,
  options?: { rewardReady?: boolean },
): string | null {
  const base = supabaseUrl.replace(/\/$/, "");
  if (!base.startsWith("https://")) return null;

  const params = new URLSearchParams({
    filled: String(Math.max(0, Math.floor(filled))),
    total: String(Math.max(1, Math.floor(total))),
    bg: backgroundHex.replace("#", ""),
    fg: (foregroundHex || "#ffffff").replace("#", ""),
  });

  if (options?.rewardReady) {
    params.set("reward", "1");
  }

  return `${base}/functions/v1/wallet-stamp-strip?${params.toString()}`;
}
