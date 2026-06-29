/**
 * Règles communes pour toutes les générations plan (récompenses, offres, notifs, calendrier).
 */

export {
  AI_PROMPT_VERSION,
  AI_SYSTEM_RULES,
  WALLET_FORMULATION_RULES,
} from "./system.ts";

export const GENERATION_RETRY_HINT =
  "En cas d'échec JSON, une seule nouvelle tentative est autorisée avec correction du format.";
