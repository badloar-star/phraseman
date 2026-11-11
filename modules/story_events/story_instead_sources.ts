// ═══════════════════════════════════════════════════════════════════════════
// story_instead_sources.ts — переходники «факт → история» для кадров «истории вместо окон».
//
// зачем (владелец 11.11: «никаких модальных окон совсем, всё отображается только в историях», на шаг 2 — «Да, шаг 2»):
// место, которое раньше просило слот очереди окон, теперь пишет факт сюда — кадр появляется в «Историях», у монеты загорается кольцо.
// Истории включает удалённый флаг stories_v1 (по умолчанию выключен): пока он выключен, замена НЕ действует и окно работает как
// раньше — `storiesReplaceWindows()` это и отвечает. Так игрок ничего не теряет ни при каком значении флага.
// Один тип события `instead`, вид — в поле `kind`, ключ повтора — в поле `key` (story_events_core: `instead:<kind>:<key>`).
// Журнал: [STORY-INSTEAD] — вид, ключ и исход записи.
// ═══════════════════════════════════════════════════════════════════════════
import type { AccountGenerationToken } from '../../app/account_generation';
import { DebugLogger } from '../../app/debug-logger';
import { isStoriesEnabled, recordStoryEvent, type StoryRecordResult } from './story_events_store';

const LOG = '[STORY-INSTEAD]';

/** Заменяют ли истории всплывающие окна прямо сейчас: только при включённом флаге историй. */
export function storiesReplaceWindows(): boolean {
  return isStoriesEnabled();
}

/** Записан ли факт так, что «показано» можно ставить: новая запись или уже есть такая же (повтор — тоже «есть»). */
export function insteadStoryLanded(result: StoryRecordResult): boolean {
  return result.recorded || result.reason === 'duplicate';
}

async function record(kind: string, key: string, data: Readonly<Record<string, string | number | boolean>>, accountToken?: AccountGenerationToken): Promise<StoryRecordResult> {
  const result = await recordStoryEvent('instead', { kind, key, ...data }, undefined, accountToken ? { accountToken } : {});
  DebugLogger.info(LOG, `записано kind=${kind} key=${key} → ${result.recorded ? `ok id=${result.id}` : `нет: ${result.reason}`}`);
  return result;
}

/** «С возвращением»: перерыв в днях, сколько карточек ждут и сколько фраз выучено. Ключ — локальный день возвращения. */
export function recordWelcomeBackStory(input: Readonly<{ dayKey: string; daysAway: number; dueCards: number; phrasesLearned: number; coinRank: number | null }>): Promise<StoryRecordResult> {
  return record('back', input.dayKey, {
    daysAway: input.daysAway, dueCards: input.dueCards, phrasesLearned: input.phrasesLearned,
    // -1 — ранг неизвестен (кадр покажет монету без ранга)
    coinRank: input.coinRank ?? -1, // guard-ok: ранг монеты для показа в кадре (−1 = неизвестен), баланс и ранг не меняются
  });
}

/** «Хватает на ранг N»: ключ — номер следующего ранга, один раз на ранг (как у окна). */
export function recordRankEnoughStory(input: Readonly<{ rank: number; nextRank: number; balance: number; price: number }>, accountToken: AccountGenerationToken): Promise<StoryRecordResult> {
  return record('rank_enough', String(input.nextRank), { rank: input.rank, nextRank: input.nextRank, balance: input.balance, price: input.price }, accountToken);
}
