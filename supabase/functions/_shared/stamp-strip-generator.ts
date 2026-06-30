/**
 * Bandeau PNG tampons — cercles sur une ligne (Apple strip + Google image module).
 *
 * Apple Store Card strip (officiel) :
 * - @1x : 375 × 123 px
 * - @2x : 750 × 246 px
 *
 * Les coins arrondis de la carte rognent les bords du strip : marge latérale généreuse.
 */
import { Image } from "https://deno.land/x/imagescript@1.3.0/mod.ts";

export const APPLE_STAMP_STRIP_1X = { width: 375, height: 123 } as const;
export const APPLE_STAMP_STRIP_2X = { width: 750, height: 246 } as const;
/** Bandeau Google Wallet (module image face carte). */
export const GOOGLE_STAMP_STRIP = { width: 750, height: 112 } as const;

/** Marge latérale (coins arrondis Wallet + halo dernier tampon). */
const CARD_EDGE_INSET_RATIO = 0.09;
const RENDER_SCALE = 2;

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

function blendOverBg(bg: [number, number, number], fg: [number, number, number], alpha: number): number {
  const a = Math.max(0, Math.min(1, alpha));
  const r = Math.round(bg[0] * (1 - a) + fg[0] * a);
  const g = Math.round(bg[1] * (1 - a) + fg[1] * a);
  const b = Math.round(bg[2] * (1 - a) + fg[2] * a);
  return rgba(r, g, b);
}

type StampLayout = {
  centers: number[];
  radius: number;
  cy: number;
};

function computeStampLayout(width: number, height: number, total: number): StampLayout {
  const horizontalPadding = Math.max(
    Math.round(width * CARD_EDGE_INSET_RATIO),
    Math.round(width * 0.075),
  );
  const usable = width - horizontalPadding * 2;
  const step = usable / total;
  const glowPad = Math.max(2, Math.round(width * 0.008));

  let radius = Math.min(
    Math.floor(step * 0.68),
    Math.floor(height * 0.24),
  );

  const shrinkUntilFits = () => {
    const firstCx = horizontalPadding + step / 2;
    const lastCx = horizontalPadding + step * (total - 1) + step / 2;
    while (radius > 3) {
      if (firstCx - radius - glowPad >= 2 && lastCx + radius + glowPad <= width - 2) {
        return;
      }
      radius -= 1;
    }
  };
  shrinkUntilFits();

  const centers = Array.from({ length: total }, (_, i) =>
    Math.round(horizontalPadding + step * i + step / 2));

  return {
    centers,
    radius: Math.max(radius, 3),
    cy: Math.round(height * 0.52),
  };
}

function drawTicketFrame(
  img: Image,
  width: number,
  height: number,
  bgRgb: [number, number, number],
  fgRgb: [number, number, number],
) {
  const insetX = Math.round(width * 0.04);
  const insetY = Math.round(height * 0.14);
  const border = blendOverBg(bgRgb, fgRgb, 0.2);
  const t = Math.max(1, Math.round(width * 0.003));
  const innerW = width - insetX * 2;
  const innerH = height - insetY * 2;

  img.drawBox(insetX, insetY, innerW, t, border);
  img.drawBox(insetX, height - insetY - t, innerW, t, border);
  img.drawBox(insetX, insetY, t, innerH, border);
  img.drawBox(width - insetX - t, insetY, t, innerH, border);
}

function drawSoftDisk(
  img: Image,
  cx: number,
  cy: number,
  radius: number,
  color: number,
) {
  if (radius <= 0) return;
  img.drawCircle(cx, cy, radius, color);
  if (radius > 2) {
    img.drawCircle(cx, cy, radius - 1, color);
  }
}

function drawRing(
  img: Image,
  cx: number,
  cy: number,
  radius: number,
  ringRgb: [number, number, number],
  bgRgb: [number, number, number],
  alpha: number,
  thickness: number,
) {
  const ring = blendOverBg(bgRgb, ringRgb, alpha);
  const steps = Math.max(2, thickness);
  for (let t = 0; t < steps; t += 1) {
    drawSoftDisk(img, cx, cy, radius - t, ring);
  }
  const inner = Math.max(1, radius - thickness);
  drawSoftDisk(img, cx, cy, inner, rgba(bgRgb[0], bgRgb[1], bgRgb[2]));
}

function drawFilledStamp(
  img: Image,
  cx: number,
  cy: number,
  radius: number,
  fgRgb: [number, number, number],
  bgRgb: [number, number, number],
) {
  drawRing(img, cx, cy, radius, fgRgb, bgRgb, 0.35, Math.max(2, Math.round(radius * 0.12)));
  drawSoftDisk(img, cx, cy, Math.max(1, radius - 2), rgba(fgRgb[0], fgRgb[1], fgRgb[2]));
}

function drawRewardStamp(
  img: Image,
  cx: number,
  cy: number,
  radius: number,
  bgRgb: [number, number, number],
  filled: boolean,
  rewardReady: boolean,
) {
  const gold: [number, number, number] = [251, 191, 36];
  const goldLight: [number, number, number] = [253, 224, 71];

  if (rewardReady) {
    const glow = blendOverBg(bgRgb, goldLight, 0.35);
    drawSoftDisk(img, cx, cy, radius + 3, glow);
  }

  if (filled || rewardReady) {
    drawSoftDisk(img, cx, cy, radius, rgba(gold[0], gold[1], gold[2]));
    drawRing(img, cx, cy, radius, goldLight, gold, 0.55, 2);
    const inner = blendOverBg(gold, [255, 255, 255], 0.35);
    drawSoftDisk(img, cx, cy, Math.max(2, radius - 4), inner);
  } else {
    drawRing(img, cx, cy, radius, gold, bgRgb, 0.85, Math.max(2, Math.round(radius * 0.14)));
  }
}

export type StampStripOptions = {
  filled: number;
  total: number;
  backgroundHex: string;
  foregroundHex?: string;
  width?: number;
  height?: number;
  rewardReady?: boolean;
};

async function renderStampStripPng(options: StampStripOptions): Promise<Uint8Array> {
  const width = options.width ?? 750;
  const height = options.height ?? 112;
  const bgRgb = parseHexColor(options.backgroundHex, [26, 39, 68]);
  const fgRgb = parseHexColor(options.foregroundHex || "#ffffff", [255, 255, 255]);

  const renderW = width * RENDER_SCALE;
  const renderH = height * RENDER_SCALE;

  const img = new Image(renderW, renderH);
  img.fill(rgba(bgRgb[0], bgRgb[1], bgRgb[2]));

  drawTicketFrame(img, renderW, renderH, bgRgb, fgRgb);

  const total = Math.max(1, Math.floor(options.total));
  const filled = Math.min(Math.max(0, Math.floor(options.filled)), total);
  const rewardReady = Boolean(options.rewardReady);
  const layout = computeStampLayout(renderW, renderH, total);

  for (let i = 0; i < total; i += 1) {
    const cx = layout.centers[i];
    const cy = layout.cy;
    const radius = layout.radius;
    const isReward = i === total - 1;
    const isFilled = i < filled;

    if (isReward) {
      drawRewardStamp(img, cx, cy, radius, bgRgb, isFilled, rewardReady);
    } else if (isFilled) {
      drawFilledStamp(img, cx, cy, radius, fgRgb, bgRgb);
    } else {
      drawRing(
        img,
        cx,
        cy,
        radius,
        fgRgb,
        bgRgb,
        0.55,
        Math.max(2, Math.round(radius * 0.13)),
      );
    }
  }

  const scaled = img.resize(width, height);
  return await scaled.encode();
}

export async function generateStampStripPng(options: StampStripOptions): Promise<Uint8Array> {
  return await renderStampStripPng(options);
}

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

/** Labels Apple lisibles sur fond coloré (évite le noir automatique sur fond clair/vif). */
export function resolveStampPassLabelRgb(backgroundHex: string, walletLabelHex?: string | null): string {
  const [r, g, b] = parseHexColor(backgroundHex, [11, 30, 63]);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  if (luminance > 0.42) {
    return "rgb(255,255,255)";
  }
  const label = parseHexColor(walletLabelHex || "#44C4A1", [68, 196, 161]);
  return `rgb(${label[0]},${label[1]},${label[2]})`;
}
