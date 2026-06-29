export type RewardSuggestion = {
  title: string;
  description: string;
  objective: string;
  type: "points" | "stamps";
  recommended_threshold: number;
  margin_risk: "low" | "medium" | "high";
  explanation: string;
};

export type ThresholdOption = {
  threshold: number;
  type: "points" | "stamps";
  rationale: string;
};

export type RewardsGenerationResult = {
  rewards: RewardSuggestion[];
  threshold_options: ThresholdOption[];
};

const OBJECTIVES = new Set([
  "frequence",
  "panier_moyen",
  "heures_creuses",
  "fideliser",
  "pousser_produit",
  "nouveau_produit",
]);
const MARGIN_RISKS = new Set(["low", "medium", "high"]);
const PROGRAM_TYPES = new Set(["points", "stamps"]);

function asString(value: unknown, fallback = ""): string {
  if (typeof value === "string") return value.trim();
  if (value == null) return fallback;
  return String(value).trim();
}

function asThreshold(value: unknown): number | null {
  const parsed = typeof value === "number" ? value : Number.parseInt(String(value), 10);
  if (!Number.isFinite(parsed) || parsed <= 0) return null;
  return parsed;
}

function normalizeReward(raw: unknown, defaultType: "points" | "stamps"): RewardSuggestion | null {
  if (!raw || typeof raw !== "object") return null;
  const item = raw as Record<string, unknown>;
  const title = asString(item.title);
  if (!title) return null;

  const typeRaw = asString(item.type, defaultType);
  const type = PROGRAM_TYPES.has(typeRaw) ? typeRaw as "points" | "stamps" : defaultType;
  const threshold = asThreshold(item.recommended_threshold);
  if (threshold == null) return null;

  const objective = asString(item.objective, "frequence");
  const marginRaw = asString(item.margin_risk, "medium").toLowerCase();

  return {
    title,
    description: asString(item.description),
    objective: OBJECTIVES.has(objective) ? objective : "frequence",
    type,
    recommended_threshold: threshold,
    margin_risk: MARGIN_RISKS.has(marginRaw) ? marginRaw as RewardSuggestion["margin_risk"] : "medium",
    explanation: asString(item.explanation, "À valider selon vos coûts et votre carte."),
  };
}

function normalizeThreshold(raw: unknown, defaultType: "points" | "stamps"): ThresholdOption | null {
  if (!raw || typeof raw !== "object") return null;
  const item = raw as Record<string, unknown>;
  const threshold = asThreshold(item.threshold ?? item.points ?? item.stamps);
  if (threshold == null) return null;

  const typeRaw = asString(item.type, defaultType);
  const type = PROGRAM_TYPES.has(typeRaw) ? typeRaw as "points" | "stamps" : defaultType;

  return {
    threshold,
    type,
    rationale: asString(item.rationale, "Seuil à valider selon votre programme."),
  };
}

export function parseRewardsGenerationResponse(
  content: string,
  programType: "points" | "stamps",
): RewardsGenerationResult {
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
  const rewardsRaw = Array.isArray(source.rewards) ? source.rewards : [];
  const thresholdsRaw = Array.isArray(source.threshold_options) ? source.threshold_options : [];

  const rewards = rewardsRaw
    .map((item) => normalizeReward(item, programType))
    .filter((item): item is RewardSuggestion => item !== null);

  const threshold_options = thresholdsRaw
    .map((item) => normalizeThreshold(item, programType))
    .filter((item): item is ThresholdOption => item !== null);

  if (rewards.length < 3) {
    throw new Error("Pas assez de récompenses générées — réessayez");
  }

  if (threshold_options.length < 2) {
    throw new Error("Pas assez d'options de seuil générées — réessayez");
  }

  return { rewards, threshold_options };
}
