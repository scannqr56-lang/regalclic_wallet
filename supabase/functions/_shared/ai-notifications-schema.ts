import { extractJsonObject } from "./ai-schemas/json-parse.ts";
import { sanitizeSuggestionText, sanitizeWalletMessage } from "./ai-schemas/sanitize-text.ts";

export type NotificationSuggestion = {
  title: string;
  body: string;
  notification_type: string;
  objective: string;
  offer_label: string;
  recommended_timing: string;
  target_segment: "all" | "loyal" | "inactive" | "new";
  margin_risk: "low" | "medium" | "high";
  explanation: string;
};

export type NotificationsGenerationResult = {
  notifications: NotificationSuggestion[];
};

const NOTIFICATION_TYPES = new Set([
  "offre",
  "recompense",
  "nouveaute",
  "rappel",
  "double_points",
  "double_tampons",
]);
const OBJECTIVES = new Set([
  "offre",
  "recompense",
  "nouveaute",
  "rappel",
  "double_points",
  "double_tampons",
  "heures_creuses",
  "panier_moyen",
  "fideliser",
]);
const MARGIN_RISKS = new Set(["low", "medium", "high"]);
const TARGET_SEGMENTS = new Set(["all", "loyal", "inactive", "new"]);

const TITLE_MAX = 40;
const BODY_MAX = 120;

function asString(value: unknown, fallback = ""): string {
  if (typeof value === "string") return value.trim();
  if (value == null) return fallback;
  return String(value).trim();
}

function truncate(text: string, max: number): string {
  if (text.length <= max) return text;
  return `${text.slice(0, max - 1).trimEnd()}…`;
}

function normalizeNotification(
  raw: unknown,
  programType: "points" | "stamps",
): NotificationSuggestion | null {
  if (!raw || typeof raw !== "object") return null;
  const item = raw as Record<string, unknown>;

  const body = truncate(sanitizeWalletMessage(item.body, BODY_MAX), BODY_MAX);
  const title = truncate(sanitizeWalletMessage(item.title || body, TITLE_MAX), TITLE_MAX);
  if (!title || !body) return null;

  let notification_type = asString(item.notification_type, "offre");
  if (notification_type === "double_points" && programType === "stamps") {
    notification_type = "double_tampons";
  }
  if (!NOTIFICATION_TYPES.has(notification_type)) notification_type = "offre";

  let objective = asString(item.objective, notification_type);
  if (!OBJECTIVES.has(objective)) objective = notification_type;

  const targetRaw = asString(item.target_segment, "all");
  const marginRaw = asString(item.margin_risk, "low").toLowerCase();

  return {
    title,
    body,
    notification_type,
    objective,
    offer_label: truncate(asString(item.offer_label, title), 40),
    recommended_timing: asString(item.recommended_timing, "À définir"),
    target_segment: TARGET_SEGMENTS.has(targetRaw)
      ? targetRaw as NotificationSuggestion["target_segment"]
      : "all",
    margin_risk: MARGIN_RISKS.has(marginRaw) ? marginRaw as NotificationSuggestion["margin_risk"] : "low",
    explanation: sanitizeSuggestionText(
      item.explanation,
      "Notification promo liée à la carte — dépend des règles Apple et Google.",
    ),
  };
}

export function parseNotificationsGenerationResponse(
  content: string,
  programType: "points" | "stamps",
): NotificationsGenerationResult {
  const parsed = extractJsonObject(content);

  if (!parsed || typeof parsed !== "object") {
    throw new Error("Réponse IA invalide");
  }

  const source = parsed as Record<string, unknown>;
  const notificationsRaw = Array.isArray(source.notifications) ? source.notifications : [];

  const notifications = notificationsRaw
    .map((item) => normalizeNotification(item, programType))
    .filter((item): item is NotificationSuggestion => item !== null);

  if (notifications.length < 6) {
    throw new Error("Pas assez de notifications générées — réessayez");
  }

  return { notifications };
}

export function suggestionsFromNotifications(
  businessId: string,
  batchId: string,
  generated: NotificationsGenerationResult,
) {
  return generated.notifications.map((notification) => ({
    business_id: businessId,
    batch_id: batchId,
    suggestion_type: "notification",
    title: notification.title,
    description: notification.offer_label,
    objective: notification.objective,
    customer_message: notification.body,
    wallet_notification_title: notification.title,
    wallet_notification_body: notification.body,
    recommended_timing: notification.recommended_timing,
    target_segment: notification.target_segment,
    margin_risk: notification.margin_risk,
    explanation: notification.explanation,
    status: "pending",
  }));
}
