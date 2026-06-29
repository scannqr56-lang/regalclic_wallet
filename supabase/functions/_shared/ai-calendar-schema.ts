export type CalendarItemInput = {
  scheduled_date: string;
  title: string;
  objective: string;
  offer_message: string;
  wallet_message: string;
  target_segment: "all" | "loyal" | "inactive" | "new";
  advice: string;
};

export type CalendarGenerationResult = {
  calendar: CalendarItemInput[];
};

const OBJECTIVES = new Set([
  "heures_creuses",
  "panier_moyen",
  "fideliser",
  "nouveaute",
  "retour_client",
  "double_points",
  "double_tampons",
  "evenement",
  "offre",
  "recompense",
  "rappel",
]);
const TARGET_SEGMENTS = new Set(["all", "loyal", "inactive", "new"]);
const WALLET_MSG_MAX = 120;

function asString(value: unknown, fallback = ""): string {
  if (typeof value === "string") return value.trim();
  if (value == null) return fallback;
  return String(value).trim();
}

function truncate(text: string, max: number): string {
  if (text.length <= max) return text;
  return `${text.slice(0, max - 1).trimEnd()}…`;
}

function isValidDate(value: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(`${value}T12:00:00`));
}

function addDays(isoDate: string, days: number): string {
  const date = new Date(`${isoDate}T12:00:00`);
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
}

function normalizeCalendarItem(
  raw: unknown,
  startDate: string,
  dayIndex: number,
  programType: "points" | "stamps",
): CalendarItemInput | null {
  if (!raw || typeof raw !== "object") return null;
  const item = raw as Record<string, unknown>;

  let scheduled_date = asString(item.scheduled_date);
  if (!isValidDate(scheduled_date)) {
    scheduled_date = addDays(startDate, dayIndex);
  }

  const title = asString(item.title);
  const offer_message = asString(item.offer_message, title);
  const wallet_message = truncate(asString(item.wallet_message, offer_message), WALLET_MSG_MAX);
  if (!title || !wallet_message) return null;

  let objective = asString(item.objective, "offre");
  if (objective === "double_points" && programType === "stamps") {
    objective = "double_tampons";
  }
  if (!OBJECTIVES.has(objective)) objective = "offre";

  const targetRaw = asString(item.target_segment, "all");

  return {
    scheduled_date,
    title,
    objective,
    offer_message,
    wallet_message,
    target_segment: TARGET_SEGMENTS.has(targetRaw)
      ? targetRaw as CalendarItemInput["target_segment"]
      : "all",
    advice: asString(
      item.advice,
      "À valider selon vos marges et votre planning.",
    ),
  };
}

export function parseCalendarGenerationResponse(
  content: string,
  startDate: string,
  programType: "points" | "stamps",
): CalendarGenerationResult {
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
  const calendarRaw = Array.isArray(source.calendar) ? source.calendar : [];

  const calendar = calendarRaw
    .map((item, index) => normalizeCalendarItem(item, startDate, index, programType))
    .filter((item): item is CalendarItemInput => item !== null);

  if (calendar.length < 15) {
    throw new Error("Calendrier incomplet — réessayez");
  }

  return { calendar };
}

export function calendarRowsFromGeneration(
  businessId: string,
  batchId: string,
  generated: CalendarGenerationResult,
) {
  return generated.calendar.map((item) => ({
    business_id: businessId,
    batch_id: batchId,
    scheduled_date: item.scheduled_date,
    title: item.title,
    objective: item.objective,
    offer_message: item.offer_message,
    wallet_message: item.wallet_message,
    target_segment: item.target_segment,
    advice: item.advice,
    status: "draft",
  }));
}
