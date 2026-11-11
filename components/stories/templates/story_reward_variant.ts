// ═══════════════════════════════════════════════════════════════════════════
// story_reward_variant.ts — какой из двух видов кадра итога недели показать и какая лига была до него (U36). Чистые функции.
//
// зачем (владелец 11.11: «давай не Б, а все — то есть будут рандомно»): в приложении живут оба вида — «Пьедестал» и «Ночная галерея».
// Выбор случайный, но привязан к самой истории: одна и та же история при повторном открытии выглядит одинаково, а разные недели — по-разному.
// Math.random здесь не годится — кадр менял бы вид при каждом открытии и при каждой перерисовке.
// ═══════════════════════════════════════════════════════════════════════════
import { clampSpireTierIndex } from '../../../modules/spire/tier_names';

export type StoryRewardVariant = 'pedestal' | 'gallery';
export type PeakWeekOutcome = 'up' | 'stay' | 'down';

/** Хэш FNV-1a (32 бита) строки-ключа истории. */
export function storyRewardHash(seed: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < seed.length; i += 1) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

/** Вид кадра по ключу истории: один и тот же ключ — всегда один и тот же вид. */
export function storyRewardVariant(seed: string): StoryRewardVariant {
  // зачем: берём бит из середины хэша — младший бит FNV у коротких похожих ключей чередуется слишком правильно
  return ((storyRewardHash(seed) >>> 7) & 1) === 1 ? 'gallery' : 'pedestal';
}

/** Ключ истории недели из того, что кадр уже знает: лига, исход, место, размер комнаты, монеты недели. */
export function peakWeekSeed(tpl: Readonly<{ tier: number; outcome: PeakWeekOutcome; place: number; total: number; weekCoins: number }>): string {
  return `peakweek:${tpl.tier}:${tpl.outcome}:${tpl.place}:${tpl.total}:${tpl.weekCoins}`;
}

/**
 * Лига до итога недели: кадр знает только новую лигу и исход, поэтому прежняя = новая ∓ 1.
 * На краях (Гранит и Алмаз) прежняя прижимается к новой — тогда кадр показывает одну статуэтку без смены.
 */
export function prevTierOf(tier: unknown, outcome: PeakWeekOutcome): number {
  const now = clampSpireTierIndex(tier);
  if (outcome === 'up') return clampSpireTierIndex(now - 1);
  if (outcome === 'down') return clampSpireTierIndex(now + 1);
  return now;
}
