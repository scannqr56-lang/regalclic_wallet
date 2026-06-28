/**
 * Grille tampons — aligné sur wallet-card-model.ts (Edge).
 */

export function resolveStampsRequired(program) {
  return Math.max(Math.floor(Number(program?.stamps_required) || 10), 1);
}

export function resolveStampGridColumns(total) {
  if (total <= 5) return total;
  if (total <= 10) return 5;
  return Math.ceil(total / 2);
}

export function buildStampSlots(filled, total) {
  const safeTotal = Math.max(Math.floor(total) || 1, 1);
  const safeFilled = Math.min(Math.max(0, Math.floor(filled)), safeTotal);
  return Array.from({ length: safeTotal }, (_, index) => ({
    index,
    filled: index < safeFilled,
    isReward: index === safeTotal - 1,
  }));
}

export function chunkStampRows(slots, columns) {
  const rows = [];
  for (let i = 0; i < slots.length; i += columns) {
    rows.push(slots.slice(i, i + columns));
  }
  return rows;
}
