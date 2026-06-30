/**
 * Constantes et validation prospects commerciaux (partagé edge functions).
 */

export const PROSPECT_STATUSES = [
  "new",
  "to_contact",
  "contacted",
  "interested",
  "demo_requested",
  "demo_done",
  "proposal_sent",
  "to_follow_up",
  "signed",
  "refused",
  "lost",
] as const;

export const PROSPECT_INTEREST_LEVELS = ["hot", "warm", "cold", "refused"] as const;

export const PROSPECT_CONTACT_CHANNELS = [
  "physical_visit",
  "instagram",
  "facebook",
  "email",
  "phone",
  "whatsapp",
  "referral",
  "other",
] as const;

export const PROSPECT_BUSINESS_TYPES = [
  "restaurant",
  "snack",
  "pizzeria",
  "burger",
  "tacos",
  "food_truck",
  "bakery",
  "butcher",
  "beauty_institute",
  "hairdresser",
  "barber",
  "grocery",
  "other",
] as const;

export type ProspectPayload = Record<string, unknown>;

function trimOrNull(value: unknown, max = 2000): string | null {
  const text = String(value ?? "").trim();
  if (!text) return null;
  return text.slice(0, max);
}

function trimRequired(value: unknown, field: string, max = 500): string {
  const text = String(value ?? "").trim();
  if (!text) throw new Error(`Champ requis : ${field}`);
  return text.slice(0, max);
}

function parseDateOrNull(value: unknown): string | null {
  const text = String(value ?? "").trim();
  if (!text) return null;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(text)) {
    throw new Error("Date invalide (format AAAA-MM-JJ attendu)");
  }
  return text;
}

function parseBoolean(value: unknown, fallback = false): boolean {
  if (typeof value === "boolean") return value;
  const text = String(value ?? "").trim().toLowerCase();
  if (text === "true" || text === "1" || text === "yes" || text === "oui") return true;
  if (text === "false" || text === "0" || text === "no" || text === "non") return false;
  return fallback;
}

function parseStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => String(item ?? "").trim())
    .filter(Boolean)
    .slice(0, 20);
}

function normalizeUrl(value: unknown): string | null {
  const text = trimOrNull(value, 2000);
  if (!text) return null;
  if (text.startsWith("https://")) return text;
  if (text.startsWith("http://")) return null;
  return `https://${text}`;
}

function assertCommercialCodeAllowed(code: string): void {
  const allowed = (Deno.env.get("COMMERCIAL_CODES") || "")
    .split(",")
    .map((c) => c.trim().toUpperCase())
    .filter(Boolean);
  if (allowed.length === 0) return;
  if (!allowed.includes(code.toUpperCase())) {
    throw new Error("Code commercial non reconnu");
  }
}

export function validateProspectCreatePayload(body: ProspectPayload) {
  const commercialCode = trimRequired(body.commercial_code, "code commercial");
  assertCommercialCodeAllowed(commercialCode);

  const businessName = trimRequired(body.business_name, "nom du commerce");
  const businessType = trimRequired(body.business_type, "type de commerce");
  const city = trimRequired(body.city, "ville");
  const interestLevel = trimRequired(body.interest_level, "niveau d'intérêt");
  const status = trimOrNull(body.status, 40) || "new";

  if (!PROSPECT_INTEREST_LEVELS.includes(interestLevel as typeof PROSPECT_INTEREST_LEVELS[number])) {
    throw new Error("Niveau d'intérêt invalide");
  }
  if (!PROSPECT_STATUSES.includes(status as typeof PROSPECT_STATUSES[number])) {
    throw new Error("Statut invalide");
  }

  const phone = trimOrNull(body.phone_mobile, 40) || trimOrNull(body.phone_landline, 40);
  const email = trimOrNull(body.email, 320);
  const instagram = normalizeUrl(body.instagram_url);
  if (!phone && !email && !instagram) {
    // Recommandé mais pas bloquant en V1 — on laisse passer avec avertissement côté client seulement
  }

  return {
    commercial_name: null,
    commercial_email: null,
    commercial_phone: null,
    commercial_code: commercialCode.toUpperCase(),
    contact_date: parseDateOrNull(body.contact_date) || new Date().toISOString().slice(0, 10),
    contact_channel: null,

    business_name: businessName,
    business_type: businessType,
    city,
    postal_code: trimOrNull(body.postal_code, 20),
    address: trimOrNull(body.address, 500),
    area: trimOrNull(body.area, 200),
    google_maps_url: normalizeUrl(body.google_maps_url),
    website_url: normalizeUrl(body.website_url),
    instagram_url: instagram,
    facebook_url: normalizeUrl(body.facebook_url),
    tiktok_url: normalizeUrl(body.tiktok_url),
    other_url: normalizeUrl(body.other_url),

    contact_name: trimOrNull(body.contact_name, 200),
    contact_role: trimOrNull(body.contact_role, 80),
    phone_landline: trimOrNull(body.phone_landline, 40),
    phone_mobile: trimOrNull(body.phone_mobile, 40),
    email,
    preferred_contact_method: trimOrNull(body.preferred_contact_method, 40),

    has_loyalty_system: trimOrNull(body.has_loyalty_system, 40),
    loyalty_system_details: trimOrNull(body.loyalty_system_details, 2000),
    has_pos_or_kiosk: trimOrNull(body.has_pos_or_kiosk, 40),
    pos_or_kiosk_name: trimOrNull(body.pos_or_kiosk_name, 200),
    loyalty_interest: trimOrNull(body.loyalty_interest, 40),

    main_problem: trimOrNull(body.main_problem, 80),
    objections: parseStringArray(body.objections),
    objection_notes: trimOrNull(body.objection_notes, 2000),
    expressed_need: trimOrNull(body.expressed_need, 2000),
    commercial_notes: trimOrNull(body.commercial_notes, 4000),

    interest_level: interestLevel,
    wants_demo: trimOrNull(body.wants_demo, 20),
    demo_done: parseBoolean(body.demo_done, false),
    follow_up_date: parseDateOrNull(body.follow_up_date),
    next_action: trimOrNull(body.next_action, 80),
    status,

    offer_presented: trimOrNull(body.offer_presented, 80) || "wallet",
    price_announced: trimOrNull(body.price_announced, 120),
    setup_fee_announced: trimOrNull(body.setup_fee_announced, 120),
    launch_offer_presented: parseBoolean(body.launch_offer_presented, false),
    offer_comment: trimOrNull(body.offer_comment, 2000),

    photo_url: normalizeUrl(body.photo_url),
    instagram_screenshot_url: normalizeUrl(body.instagram_screenshot_url),
    menu_url: normalizeUrl(body.menu_url),
    document_url: normalizeUrl(body.document_url),

    source: "commercial_form",
  };
}

const ADMIN_PATCH_FIELDS = [
  "status",
  "interest_level",
  "next_action",
  "follow_up_date",
  "internal_notes",
  "commercial_notes",
  "wants_demo",
  "demo_done",
] as const;

export function validateProspectAdminPatch(body: ProspectPayload) {
  const patch: Record<string, unknown> = {};

  for (const key of ADMIN_PATCH_FIELDS) {
    if (body[key] === undefined) continue;
    if (key === "follow_up_date") {
      patch.follow_up_date = body.follow_up_date === null || body.follow_up_date === ""
        ? null
        : parseDateOrNull(body.follow_up_date);
      continue;
    }
    if (key === "demo_done") {
      patch.demo_done = parseBoolean(body.demo_done, false);
      continue;
    }
    if (key === "status") {
      const status = trimRequired(body.status, "statut", 40);
      if (!PROSPECT_STATUSES.includes(status as typeof PROSPECT_STATUSES[number])) {
        throw new Error("Statut invalide");
      }
      patch.status = status;
      continue;
    }
    if (key === "interest_level") {
      const level = trimRequired(body.interest_level, "niveau d'intérêt", 40);
      if (!PROSPECT_INTEREST_LEVELS.includes(level as typeof PROSPECT_INTEREST_LEVELS[number])) {
        throw new Error("Niveau d'intérêt invalide");
      }
      patch.interest_level = level;
      continue;
    }
    patch[key] = trimOrNull(body[key], key === "internal_notes" || key === "commercial_notes" ? 4000 : 200);
  }

  if (Object.keys(patch).length === 0) {
    throw new Error("Aucun champ à mettre à jour");
  }

  return patch;
}

export function sanitizeProspectListFilters(params: URLSearchParams) {
  const page = Math.max(1, Number.parseInt(params.get("page") || "1", 10) || 1);
  const limit = Math.min(100, Math.max(1, Number.parseInt(params.get("limit") || "25", 10) || 25));
  const offset = (page - 1) * limit;

  return {
    status: trimOrNull(params.get("status"), 40),
    city: trimOrNull(params.get("city"), 200),
    business_type: trimOrNull(params.get("business_type"), 80),
    commercial_code: trimOrNull(params.get("commercial_code"), 80),
    interest_level: trimOrNull(params.get("interest_level"), 40),
    search: trimOrNull(params.get("search"), 200),
    page,
    limit,
    offset,
  };
}
