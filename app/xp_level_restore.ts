import { getLevelFromXP, TOTAL_XP_FOR_LEVEL } from '../constants/theme';

const OLD_XP_BASE_250 = 250;
const XP_EXP = 1.82;
const OLD_MAX_LEVEL = 50;

export const XP_LEVEL_RESTORE_250_TO_400_KEY = 'xp_level_restore_250_to_400_v1';

export function old250TotalXPForLevel(level: number): number {
  if (level <= 1) return 0;
  return Math.round(OLD_XP_BASE_250 * Math.pow(level - 1, XP_EXP));
}

export function old250LevelFromXP(totalXP: number): number {
  if (totalXP <= 0) return 1;
  let level = Math.min(OLD_MAX_LEVEL, Math.floor(Math.pow(totalXP / OLD_XP_BASE_250, 1 / XP_EXP)) + 1);
  while (level < OLD_MAX_LEVEL && totalXP >= old250TotalXPForLevel(level + 1)) level += 1;
  while (level > 1 && totalXP < old250TotalXPForLevel(level)) level -= 1;
  return level;
}

export function restoredXPForOld250VisibleLevel(totalXP: number): {
  currentXP: number;
  targetXP: number;
  oldLevel: number;
  restoredLevel: number;
  currentLevel: number;
  needsRestore: boolean;
} {
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
  const newStart = TOTAL_XP_FOR_LEVEL(oldLevel);

  let targetXP = newStart;
  if (oldLevel < OLD_MAX_LEVEL) {
    const oldNeed = Math.max(1, old250TotalXPForLevel(oldLevel + 1) - oldStart);
    const newNeed = Math.max(1, TOTAL_XP_FOR_LEVEL(oldLevel + 1) - newStart);
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

/* expo-router route shim: keeps utility module from warning when discovered as route */
export default function __RouteShim() { return null; }
