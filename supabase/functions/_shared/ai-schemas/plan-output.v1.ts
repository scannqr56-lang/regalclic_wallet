/**
 * Schéma de sortie plan IA fidélité — version 1.
 * Référence : docs/ROADMAP_ASSISTANT_IA_FIDELITE.md (phases 6–9)
 */

export const PLAN_OUTPUT_SCHEMA_VERSION = "v1.0.0";

export const MARGIN_RISK_VALUES = ["low", "medium", "high"] as const;
export const TARGET_SEGMENT_VALUES = ["all", "loyal", "inactive", "new"] as const;

export type PlanOutputKind =
  | "rewards"
  | "offers"
  | "notifications"
  | "calendar";
