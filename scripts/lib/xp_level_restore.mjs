import { getLevelFromXP, totalXPForLevel } from './xp_levels.mjs';

export const XP_LEVEL_RESTORE_250_TO_400_KEY = 'xp_level_restore_250_to_400_v1';

const OLD_XP_BASE_250 = 250;
const XP_EXP = 1.82;
const OLD_MAX_LEVEL = 50;

export function old250TotalXPForLevel(level) {
  if (level <= 1) return 0;
  return Math.round(OLD_XP_BASE_250 * Math.pow(level - 1, XP_EXP));
}

export function old250LevelFromXP(totalXP) {
  const xp = Math.max(0, Math.floor(Number(totalXP) || 0));
  if (xp <= 0) return 1;
  let level = Math.min(OLD_MAX_LEVEL, Math.floor(Math.pow(xp / OLD_XP_BASE_250, 1 / XP_EXP)) + 1);
  while (level < OLD_MAX_LEVEL && xp >= old250TotalXPForLevel(level + 1)) level += 1;
  while (level > 1 && xp < old250TotalXPForLevel(level)) level -= 1;
  return level;
}

export function restoredXPForOld250VisibleLevel(totalXP) {
  const currentXP = Math.max(0, Math.floor(Number(totalXP) || 0));
  if (currentXP <= 0) {
    return { currentXP, targetXP: 0, oldLevel: 1, restoredLevel: 1, currentLevel: 1, needsRestore: false };
  }

  const oldLevel = old250LevelFromXP(currentXP);
  const currentLevel = getLevelFromXP(currentXP);
  if (currentLevel >= oldLevel) {
    return {
      currentXP,
      targetXP: currentXP,
      oldLevel,
      restoredLevel: currentLevel,
      currentLevel,
      needsRestore: false,
    };
  }

  const oldStart = old250TotalXPForLevel(oldLevel);
  const newStart = totalXPForLevel(oldLevel);
  let targetXP = newStart;

  if (oldLevel < OLD_MAX_LEVEL) {
    const oldNeed = Math.max(1, old250TotalXPForLevel(oldLevel + 1) - oldStart);
    const newNeed = Math.max(1, totalXPForLevel(oldLevel + 1) - newStart);
    const progress = Math.max(0, Math.min(0.999999, (currentXP - oldStart) / oldNeed));
    targetXP = Math.round(newStart + progress * newNeed);
  } else {
    targetXP = newStart + Math.max(0, currentXP - oldStart);
  }

  targetXP = Math.max(currentXP, targetXP);
  return {
    currentXP,
    targetXP,
    oldLevel,
    restoredLevel: getLevelFromXP(targetXP),
    currentLevel,
    needsRestore: targetXP > currentXP,
  };
}
