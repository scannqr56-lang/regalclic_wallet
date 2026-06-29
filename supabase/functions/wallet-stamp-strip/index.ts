import { generateStampStripPng } from "../_shared/stamp-strip-generator.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function normalizeHex(value: string | null, fallback: string): string {
  const raw = (value || "").trim().replace("#", "");
  return /^[0-9a-fA-F]{6}$/.test(raw) ? `#${raw}` : fallback;
}

function parseIntParam(value: string | null, fallback: number, min: number, max: number): number {
  const parsed = Number.parseInt(String(value || ""), 10);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(max, Math.max(min, parsed));
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "GET") {
    return new Response("Method not allowed", { status: 405, headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const total = parseIntParam(url.searchParams.get("total"), 10, 1, 20);
    const filled = parseIntParam(url.searchParams.get("filled"), 0, 0, total);
    const bg = normalizeHex(url.searchParams.get("bg"), "#1a2744");
    const fg = normalizeHex(url.searchParams.get("fg"), "#ffffff");

    const png = await generateStampStripPng({
      filled,
      total,
      backgroundHex: bg,
      foregroundHex: fg,
      width: 750,
      height: 112,
    });

    return new Response(png, {
      headers: {
        ...corsHeaders,
        "Content-Type": "image/png",
        "Cache-Control": "public, max-age=300",
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erreur génération tampons";
    return new Response(message, { status: 500, headers: corsHeaders });
  }
});
