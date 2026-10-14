// story_event_sources.ts — переходники «факт → история» (D192). Источники зовут их одной строкой `void record…(...)`:
// ничего не ждут, ничего не бросают, поведение исходных мест не меняется. Флаг stories_v1 проверяет recordStoryEvent.
import { isStreakMilestone } from '../../components/streak/moments/streak_milestones';
import { DebugLogger } from '../../app/debug-logger';
import { recordStoryEvent, type StoryRecordResult } from './story_events_store';

type SpireWeekFact = Readonly<{ weekId: string; lang: string; promoted: boolean; demoted: boolean; prevTier: number; newTier: number; roomRank: number; roomTotal: number }>;

/** Итог недели Шпиля: вверх / вниз / удержался + этаж. Тот же документ, что прочитал загрузчик, — новых чтений нет. */
export function recordSpireWeekStory(result: SpireWeekFact | null): Promise<StoryRecordResult> | undefined {
  if (!result) return undefined;
  const outcome = result.promoted ? 'up' : result.demoted ? 'down' : 'stay';
  return recordStoryEvent('spire_week', {
    weekId: result.weekId, lang: result.lang, outcome, prevTier: result.prevTier, floor: result.newTier,
    place: result.roomRank, total: result.roomTotal,
  });
}

/** Рубеж серии — только числа из списка рубежей (streak_milestones.ts); прочие дни молча не пишем. */
export function recordStreakMilestoneStory(days: number, dayKey: string): Promise<StoryRecordResult> | undefined {
  if (!isStreakMilestone(days)) return undefined;
  return recordStoryEvent('streak_milestone', { days, dayKey });
}

/** Повышение ранга монеты — после состоявшейся покупки (трата и ранг уже на диске). */
export function recordCoinRankStory(toRank: number): Promise<StoryRecordResult> {
  return recordStoryEvent('coin_rank_up', { toRank });
}

/** Открытые живым действием ачивки (тихий backfill сюда не попадает — это не новость). */
export function recordAchievementStories(achievementIds: readonly string[]): void {
  if (achievementIds.length > 4) DebugLogger.info('[STORY-EVENTS]', `achievement: пачка из ${achievementIds.length} — пишем все, лимит 20 вытеснит старые`);
  for (const achievementId of achievementIds) void recordStoryEvent('achievement', { achievementId });
}
