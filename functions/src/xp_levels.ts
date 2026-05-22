export const MAX_LEVEL = 60;

// Keep this in sync with constants/theme.ts until XP levels move to shared config.
const XP_BASE = 400;
const XP_EXP = 1.82;
const XP_EXP_INV = 1 / XP_EXP;
const LEGENDARY_BASE_LEVEL = 50;
const LEGENDARY_XP_STEP = 150000;

const totalXPForStandardLevel = (level: number): number => {
  if (level <= 1) return 0;
  return Math.round(XP_BASE * Math.pow(level - 1, XP_EXP));
};

const totalXPForLegendaryLevel = (level: number): number => {
  const legendaryLevels = Math.max(0, level - LEGENDARY_BASE_LEVEL);
  return totalXPForStandardLevel(LEGENDARY_BASE_LEVEL)
    + Math.round((LEGENDARY_XP_STEP * legendaryLevels * (legendaryLevels + 1)) / 2);
};

export const totalXPForLevel = (level: number): number => {
  if (level <= 1) return 0;
  if (level <= LEGENDARY_BASE_LEVEL) return totalXPForStandardLevel(level);
  return totalXPForLegendaryLevel(level);
};

const normalizeLevelForXP = (level: number, totalXP: number): number => {
  let normalized = Math.max(1, Math.min(MAX_LEVEL, level));
  while (normalized < MAX_LEVEL && totalXP >= totalXPForLevel(normalized + 1)) {
    normalized += 1;
  }
  while (normalized > 1 && totalXP < totalXPForLevel(normalized)) {
    normalized -= 1;
  }
  return normalized;
};

export const getLevelFromXP = (totalXP: number): number => {
  if (totalXP <= 0) return 1;

  const firstLegendaryLevelXP = totalXPForLegendaryLevel(LEGENDARY_BASE_LEVEL + 1);
  if (totalXP < firstLegendaryLevelXP) {
    const estimatedLevel = Math.min(
      LEGENDARY_BASE_LEVEL,
      Math.floor(Math.pow(totalXP / XP_BASE, XP_EXP_INV)) + 1,
    );
    return normalizeLevelForXP(estimatedLevel, totalXP);
  }

  const legendaryXP = totalXP - totalXPForStandardLevel(LEGENDARY_BASE_LEVEL);
  const legendaryLevels = Math.floor(
    (Math.sqrt(1 + (8 * legendaryXP) / LEGENDARY_XP_STEP) - 1) / 2,
  );
  return normalizeLevelForXP(
    LEGENDARY_BASE_LEVEL + Math.max(0, legendaryLevels),
    totalXP,
  );
};
