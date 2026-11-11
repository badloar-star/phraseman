// ═══════════════════════════════════════════════════════════════════════════
// streak_milestone_slot.ts — когда окно рубежа серии просит слот очереди окон и когда его можно показать.
//
// зачем (владелец 11.11, аудит всплывающих окон — «Итог урока»): на итоге урока рубеж-сцена (7 / 30 / 100 дней…) не показывался
// НИКОГДА. Экран итога держит слот очереди (ключ lessonResultsSequence), пока рубеж «ожидает или открыт», — чтобы оценка и тосты
// не встали поверх него. А с 05.11 окно рубежа само ждёт слот (ключ streakMilestone). Очередь невытесняющая: экран ждёт окно,
// окно ждёт экран. Вместе с рубежом пропадали «Идеальный урок» и просьба об оценке.
// Решение: слот, который держит экран итога, и есть слот для этого окна — экран держит его ради рубежа и сам рисуется обычным
// View, а не нативным окном, так что двух нативных окон на кадре не возникает (правило владельца 05.11 соблюдено).
// На других экранах (итог разговора, карточки, «Мои ошибки») ничего не меняется: окно ждёт свой слот.
// ═══════════════════════════════════════════════════════════════════════════
import type { OverlayKey } from '../../overlay_arbiter_core';

/** Ключи экранов-родителей, которые держат слот очереди РАДИ окна рубежа. Чужие окна сюда не входят. */
export const STREAK_MILESTONE_COVERING_KEYS: ReadonlySet<OverlayKey> = new Set<OverlayKey>(['lessonResultsSequence']);

export type StreakMilestoneSlotInput = Readonly<{
  /** Есть что показать: окно открыто и рубеж известен. */
  wants: boolean;
  /** Малый рубеж-тост: наложение без блокировки касаний, слота не берёт. */
  isToast: boolean;
  /** Кто сейчас держит слот очереди. */
  holder: OverlayKey | null;
  /** Окно уже было показано в этом открытии — не гасим его, если прикрытие исчезло посреди показа. */
  shownBefore: boolean;
}>;

/** Держит ли слот экран-родитель, под прикрытием которого рубеж показывается без собственного слота. */
export function isCoveredByParentSlot(holder: OverlayKey | null): boolean {
  return holder !== null && STREAK_MILESTONE_COVERING_KEYS.has(holder);
}

/** Просить ли собственный слот streakMilestone. Под прикрытием родителя — не просим: иначе вечное взаимное ожидание. */
export function shouldRequestStreakMilestoneSlot(input: StreakMilestoneSlotInput): boolean {
  if (!input.wants || input.isToast) return false;
  return !isCoveredByParentSlot(input.holder);
}

export type StreakMilestoneSlotDecision = Readonly<{ show: boolean; reason: 'nothing' | 'toast' | 'own_slot' | 'parent_slot' | 'latched' | 'waiting' }>;

/** Показывать ли окно сейчас и почему (причина идёт в журнал [STREAK-MILESTONE] slot). */
export function decideStreakMilestoneShow(input: StreakMilestoneSlotInput, ownSlot: boolean): StreakMilestoneSlotDecision {
  if (!input.wants) return { show: false, reason: 'nothing' };
  if (input.isToast) return { show: true, reason: 'toast' };
  if (ownSlot) return { show: true, reason: 'own_slot' };
  if (isCoveredByParentSlot(input.holder)) return { show: true, reason: 'parent_slot' };
  if (input.shownBefore) return { show: true, reason: 'latched' };
  return { show: false, reason: 'waiting' };
}
