export const MAX_LEVEL = 60;
export const XP_BASE = 400;
export const XP_EXP = 1.82;
export const LEGENDARY_BASE_LEVEL = 50;
export const LEGENDARY_XP_STEP = 150000;

export function totalXPForLevel(level) {
  if (level <= 1) return 0;
  if (level <= LEGENDARY_BASE_LEVEL) {
    return Math.round(XP_BASE * Math.pow(level - 1, XP_EXP));
  }
  const legendaryLevels = Math.max(0, level - LEGENDARY_BASE_LEVEL);
  return totalXPForLevel(LEGENDARY_BASE_LEVEL)
    + Math.round((LEGENDARY_XP_STEP * legendaryLevels * (legendaryLevels + 1)) / 2);
}

function normalizeLevelForXP(level, totalXP) {
  let normalized = Math.max(1, Math.min(MAX_LEVEL, level));
  while (normalized < MAX_LEVEL && totalXP >= totalXPForLevel(normalized + 1)) normalized += 1;
  while (normalized > 1 && totalXP < totalXPForLevel(normalized)) normalized -= 1;
  return normalized;
}

export function getLevelFromXP(totalXP) {
  const xp = Math.max(0, Math.floor(Number(totalXP) || 0));
  if (xp <= 0) return 1;

  const firstLegendaryLevelXP = totalXPForLevel(LEGENDARY_BASE_LEVEL + 1);
  if (xp < firstLegendaryLevelXP) {
    return normalizeLevelForXP(Math.floor(Math.pow(xp / XP_BASE, 1 / XP_EXP)) + 1, xp);
  }

  const legendaryXP = xp - totalXPForLevel(LEGENDARY_BASE_LEVEL);
  const legendaryLevels = Math.floor(
    (Math.sqrt(1 + (8 * legendaryXP) / LEGENDARY_XP_STEP) - 1) / 2,
  );
  return normalizeLevelForXP(LEGENDARY_BASE_LEVEL + Math.max(0, legendaryLevels), xp);
}

