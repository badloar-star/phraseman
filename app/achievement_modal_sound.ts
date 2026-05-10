import type { Achievement } from './achievements';
import { playExclusiveShortSfx } from './exclusive_short_sfx';

/** UI pack: sound 1 / 2 / 4 → три разных слота для модалок. */
const SFX_SLOT_1 = require('../assets/sounds/action-toast-success.mp3');
const SFX_SLOT_2 = require('../assets/sounds/action-toast-error.mp3');
const SFX_SLOT_3 = require('../assets/sounds/action-toast-info.mp3');

export type AchievementModalSfxSlot = 1 | 2 | 3;

function assetForSlot(slot: AchievementModalSfxSlot) {
  return slot === 1 ? SFX_SLOT_1 : slot === 2 ? SFX_SLOT_2 : SFX_SLOT_3;
}

/** Категория ачивки → один из трёх сэмплов. */
export function achievementCategoryToSfxSlot(category: Achievement['category']): AchievementModalSfxSlot {
  if (category === 'streak' || category === 'lessons') return 1;
  if (category === 'xp' || category === 'quiz') return 2;
  return 3;
}

export async function playAchievementModalSfxSlot(slot: AchievementModalSfxSlot): Promise<void> {
  await playExclusiveShortSfx(assetForSlot(slot));
}

/** Тост/модалка разблокировки достижения (баннер + деталь по тапу). */
export async function playAchievementUnlockSound(category: Achievement['category']): Promise<void> {
  await playAchievementModalSfxSlot(achievementCategoryToSfxSlot(category));
}

/** Модалка «получены осколки» (глобальный shards_earned). Слот 2 — отдельно от «редких» ачивок (слот 3). */
export async function playShardsRewardModalSound(): Promise<void> {
  await playAchievementModalSfxSlot(2);
}
