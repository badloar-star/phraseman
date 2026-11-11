// ═══════════════════════════════════════════════════════════════════════════
// plus_offer_stories.ts — кадры-предложения Plus в «Историях»: какие и кому показываем. Без React Native — правило проверяется тестом напрямую.
//
// зачем (владелец 11.11: «карточки предложения переместить в истории», на шаг 2 — «Да, делай»): бесплатный аккаунт, взявший рубеж
// серии 7, 14 или 30 дней, видит следом за кадром «Серия» кадр «с Plus серия не сгорит». Кадр НЕ хранится: он выводится на лету из уже
// существующего события серии (закон проекта «празднование не durable» — на диске лежит факт, а не долг на показ). Его «просмотрено»
// зеркалит исходное событие: посмотрел кадр серии — предложение уходит вместе с ним, отдельной записи нет.
// После ВТОРОГО пройденного диалога (событие dialog_done с doneCount = 2) так же выводится кадр «диалоги без счётчика».
// За историей «Твоя неделя» (событие week_recap) так же выводится кадр «итог недели на одной странице».
// ═══════════════════════════════════════════════════════════════════════════
import type { StoryEvent, StoryEventList } from './story_events_core';

/** Приставка id выведенного кадра: по ней отметка «просмотрено» понимает, что отдельной записи у кадра нет. */
export const PLUS_OFFER_STORY_ID_PREFIX = 'plus_offer:';
/** Какой по счёту пройденный диалог приводит кадр «диалоги без счётчика» (как у мягкого предложения: второй). */
export const PLUS_OFFER_DIALOG_DONE_COUNT = 2;
/** Рубежи серии, за которыми идёт предложение защиты серии (те же, что были у мягкого предложения: 7, 14, 30). */
export const PLUS_OFFER_STREAK_DAYS: ReadonlySet<number> = new Set([7, 14, 30]);

export type PlusOfferDecision = Readonly<{
  offers: StoryEventList;
  /** Почему кадров нет или сколько добавлено — для журнала [STORY-PLUS-OFFER]. */
  reason: 'plus' | 'access_unresolved' | 'no_source' | 'added';
}>;

function streakDays(event: StoryEvent): number | null {
  if (event.type !== 'streak_milestone') return null;
  const days = Math.trunc(Number(event.payload.days));
  return Number.isFinite(days) && PLUS_OFFER_STREAK_DAYS.has(days) ? days : null;
}

function isSecondDialog(event: StoryEvent): boolean {
  return event.type === 'dialog_done' && Math.trunc(Number(event.payload.doneCount)) === PLUS_OFFER_DIALOG_DONE_COUNT;
}

/**
 * Кадры-предложения для ленты историй.
 * `accessResolved` — статус подписки уже известен; пока нет, предложение не показываем (подписчик не должен увидеть его на долю секунды).
 */
export function plusOfferStories(stories: StoryEventList, access: Readonly<{ accessResolved: boolean; hasPlus: boolean }>): PlusOfferDecision {
  if (!access.accessResolved) return { offers: Object.freeze([]), reason: 'access_unresolved' };
  if (access.hasPlus) return { offers: Object.freeze([]), reason: 'plus' };
  const offers: StoryEvent[] = [];
  for (const event of stories) {
    // на миллисекунду позже исходного события — в очереди просмотра кадр встаёт сразу за своим личным кадром
    const base = { id: `${PLUS_OFFER_STORY_ID_PREFIX}${event.id}`, type: 'plus_offer' as const, atMs: event.atMs + 1, seen: event.seen };
    const days = streakDays(event);
    if (days !== null) {
      const dayKey = event.payload.dayKey;
      offers.push({ ...base, payload: typeof dayKey === 'string' ? { kind: 'streak', days, dayKey } : { kind: 'streak', days } });
      continue;
    }
    if (event.type === 'week_recap' && typeof event.payload.startDayKey === 'string') {
      const dailyMinutes = event.payload.dailyMinutes;
      offers.push({ ...base, payload: { kind: 'week', startDayKey: event.payload.startDayKey, dailyMinutes: typeof dailyMinutes === 'string' ? dailyMinutes : '' } });
      continue;
    }
    if (isSecondDialog(event)) {
      const bubbles = event.payload.bubbles;
      offers.push({ ...base, payload: { kind: 'dialog', bubbles: typeof bubbles === 'string' ? bubbles : '' } });
    }
  }
  return offers.length > 0 ? { offers: Object.freeze(offers), reason: 'added' } : { offers: Object.freeze([]), reason: 'no_source' };
}

export function isPlusOfferStoryId(id: string): boolean {
  return id.startsWith(PLUS_OFFER_STORY_ID_PREFIX);
}

/** id исходного события серии для выведенного кадра: отметка «просмотрено» уходит на него. */
export function plusOfferSourceId(id: string): string | null {
  return isPlusOfferStoryId(id) ? id.slice(PLUS_OFFER_STORY_ID_PREFIX.length) : null;
}
