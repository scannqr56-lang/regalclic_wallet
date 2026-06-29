export const AI_MENU_BUCKET = "business-private";

export const AI_MENU_MAX_SIZE_BYTES = Number(
  Deno.env.get("AI_MAX_MENU_FILE_SIZE_MB") || "10",
) * 1024 * 1024;

export const AI_MENU_ALLOWED_MIME_TYPES = [
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
] as const;

export type AiMenuMimeType = (typeof AI_MENU_ALLOWED_MIME_TYPES)[number];

export const AI_MENU_MIME_TO_EXT: Record<AiMenuMimeType, string> = {
  "application/pdf": "pdf",
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

export function isAllowedMenuMimeType(value: string): value is AiMenuMimeType {
  return (AI_MENU_ALLOWED_MIME_TYPES as readonly string[]).includes(value);
}

export function buildMenuStoragePath(
  businessId: string,
  uploadId: string,
  mimeType: AiMenuMimeType,
): string {
  const ext = AI_MENU_MIME_TO_EXT[mimeType];
  return `${businessId}/ai-menus/${uploadId}.${ext}`;
}
