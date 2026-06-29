export type OfferSuggestion = {
  title: string;
  offer_label: string;
  objective: string;
  customer_message: string;
  recommended_duration_days: number;
  recommended_timing: string;
  target_segment: "all" | "loyal" | "inactive" | "new";
  margin_risk: "low" | "medium" | "high";
  generosity_level: string;
  explanation: string;
};

export type OffersGenerationResult = {
  offers: OfferSuggestion[];
};

const OBJECTIVES = new Set([
  "heures_creuses",
  "panier_moyen",
  "retour_client",
  "nouveaute",
  "fideles",
  "double_points",
  "double_tampons",
  "evenement",
]);
const MARGIN_RISKS = new Set(["low", "medium", "high"]);
const TARGET_SEGMENTS = new Set(["all", "loyal", "inactive", "new"]);

function asString(value: unknown, fallback = ""): string {
  if (typeof value === "string") return value.trim();
  if (value == null) return fallback;
  return String(value).trim();
}

function asDurationDays(value: unknown): number {
  const parsed = typeof value === "number" ? value : Number.parseInt(String(value), 10);
  if (!Number.isFinite(parsed) || parsed < 1) return 7;
  return Math.min(parsed, 30);
}

function normalizeOffer(raw: unknown, programType: "points" | "stamps"): OfferSuggestion | null {
  if (!raw || typeof raw !== "object") return null;
  const item = raw as Record<string, unknown>;

  const title = asString(item.title);
  const customer_message = asString(item.customer_message);
  if (!title || !customer_message) return null;

  let objective = asString(item.objective, "heures_creuses");
  if (objective === "double_points" && programType === "stamps") {
    objective = "double_tampons";
  }
  if (!OBJECTIVES.has(objective)) objective = "heures_creuses";

  const targetRaw = asString(item.target_segment, "all");
  const marginRaw = asString(item.margin_risk, "medium").toLowerCase();

  return {
    title,
    offer_label: asString(item.offer_label, title),
    objective,
    customer_message,
    recommended_duration_days: asDurationDays(item.recommended_duration_days),
    recommended_timing: asString(item.recommended_timing, "À définir"),
    target_segment: TARGET_SEGMENTS.has(targetRaw)
      ? targetRaw as OfferSuggestion["target_segment"]
      : "all",
    margin_risk: MARGIN_RISKS.has(marginRaw) ? marginRaw as OfferSuggestion["margin_risk"] : "medium",
    generosity_level: asString(item.generosity_level, "balanced"),
    explanation: asString(
      item.explanation,
      "À valider selon vos marges avant activation sur la carte Wallet.",
    ),
  };
}

export function parseOffersGenerationResponse(
  content: string,
  programType: "points" | "stamps",
): OffersGenerationResult {
  let parsed: unknown;
  try {
    parsed = JSON.parse(content);
  } catch {
    const match = content.match(/\{[\s\S]*\}/);
    if (!match) throw new Error("Réponse IA non JSON");
    parsed = JSON.parse(match[0]);
  }

  if (!parsed || typeof parsed !== "object") {
    throw new Error("Réponse IA invalide");
  }

  const source = parsed as Record<string, unknown>;
  const offersRaw = Array.isArray(source.offers) ? source.offers : [];

  const offers = offersRaw
    .map((item) => normalizeOffer(item, programType))
    .filter((item): item is OfferSuggestion => item !== null);

  if (offers.length < 3) {
    throw new Error("Pas assez d'offres générées — réessayez");
  }

  return { offers };
}

export function suggestionsFromOffers(
  businessId: string,
  batchId: string,
  generated: OffersGenerationResult,
) {
  return generated.offers.map((offer) => ({
    business_id: businessId,
    batch_id: batchId,
    suggestion_type: "offer",
    title: offer.title,
    description: offer.offer_label,
    objective: offer.objective,
    customer_message: offer.customer_message,
    wallet_notification_body: offer.offer_label,
    recommended_timing: offer.recommended_timing,
    target_segment: offer.target_segment,
    margin_risk: offer.margin_risk,
    explanation: `${offer.explanation} · Durée suggérée : ${offer.recommended_duration_days} jour(s)`,
    status: "pending",
  }));
}
