// story_event_sources.ts — переходники «факт → история» (D192). Источники зовут их одной строкой `void record…(...)`:
// ничего не ждут, ничего не бросают, поведение исходных мест не меняется. Флаг stories_v1 проверяет recordStoryEvent.
import { isStreakMilestone } from '../../components/streak/moments/streak_milestones';
import { DebugLogger } from '../../app/debug-logger';
import { recordStoryEvent, type StoryRecordResult } from './story_events_store';
import { recordWeekRecapStory } from './week_recap_story';
import { isPremiumThemeId, type PremiumThemeId } from '../../app/premium_theme_catalog';
import { notePremiumThemeProgress } from '../../app/premium_theme_progress';
import { isCurrentAccountGeneration, type AccountGenerationToken } from '../../app/account_generation';
import { onSkillLevelUps } from '../skills/skill_store';
import type { SkillLevelUp } from '../skills/skill_levels';

type SpireWeekFact = Readonly<{
  weekId: string; lang: string; promoted: boolean; demoted: boolean; prevTier: number; newTier: number; roomRank: number; roomTotal: number;
  weekCoins?: number; promotionCoins?: number; rankBy?: 'steps' | 'coins';
  /** Награда за место (U36). В итоге недели она уже 0, пока сервер не подтвердил выплату. */
  placeCoins?: number;
  /** Статус выплаты крона (U36): 'pending_wallet' — монеты ещё идут в кошелёк. */
  rewardStatus?: string;
}>;

/** Итог недели Шпиля: вверх / вниз / удержался + этаж. Тот же документ, что прочитал загрузчик, — новых чтений нет. */
function spireWeekPayload(result: SpireWeekFact): Readonly<Record<string, string | number>> {
  const outcome = result.promoted ? 'up' : result.demoted ? 'down' : 'stay';
  return {
    weekId: result.weekId, lang: result.lang, outcome, prevTier: result.prevTier, floor: result.newTier,
    place: result.roomRank, total: result.roomTotal,
    // зачем (координатор 14.10): слайд «N место из M · X монет за неделю» — монеты недели решают переход (D162/D190);
    // promotionCoins — настоящая награда сервера за повышение (config/spire_v1.coins.promotionBonus, по умолчанию 100), 0 если нет.
    weekCoins: result.weekCoins ?? 0, promotionCoins: result.promotionCoins ?? 0, rankBy: result.rankBy ?? 'steps',
    // зачем (владелец 11.11, U36 «За что дали награду»): кадр истории показывает сумму и её причины — «за N место» и «за повышение».
    // Новых чтений нет: число уже лежит в итоге недели и равно 0, пока монеты не дошли до кошелька.
    placeCoins: result.placeCoins ?? 0,
    // зачем (владелец 11.11: «добавь „в пути“ на кадр»): 1 — награда есть, но ещё не дошла до кошелька. Историю с таким признаком
    // хранилище обновит, когда тот же итог недели придёт уже выплаченным (refreshSpireWeekReward), — надпись не останется навсегда.
    rewardPending: result.rewardStatus === 'pending_wallet' ? 1 : 0,
  };
}

export function recordSpireWeekStory(result: SpireWeekFact | null, accountToken: AccountGenerationToken): Promise<StoryRecordResult> | undefined {
  if (!result) return undefined;
  if (!isCurrentAccountGeneration(accountToken)) return Promise.resolve({ recorded: false, reason: 'account_changed' });
  notePremiumThemeProgress('final_spire', result.newTier, accountToken);
  // зачем (владелец 11.11: «заводи события недели и диалога», «Монеты Пика»): итог недели Пика пришёл — рядом ложится личная история
  // «Твоя неделя» (активность с телефона + монеты этой недели). Не ждём: запись идёт фоном и сама пишет причину отказа в [STORY-WEEK].
  void recordWeekRecapStory(result, accountToken);
  return recordStoryEvent('spire_week', spireWeekPayload(result), undefined, { accountToken });
}

/**
 * Окно итога недели D191 показано (координатор 14.10): та же история сразу просмотрена — кольцо на этот итог не загорается,
 * но история остаётся в «недавних» на 7 дней. Окно D191 зовёт это одной строкой при показе.
 */
export function markSpireWeekStoryShown(result: SpireWeekFact | null): Promise<StoryRecordResult> | undefined {
  if (!result) return undefined;
  return recordStoryEvent('spire_week', spireWeekPayload(result), Date.now(), { seen: true });
}

/** Рубеж серии — только числа из списка рубежей (streak_milestones.ts); прочие дни молча не пишем. */
export function recordStreakMilestoneStory(days: number, dayKey: string): Promise<StoryRecordResult> | undefined {
  notePremiumThemeProgress('streak_365', days);
  if (!isStreakMilestone(days)) return undefined;
  return recordStoryEvent('streak_milestone', { days, dayKey });
}

/** Сколько реплик диалога кладём в историю и какой длины: кадр показывает до трёх коротких пузырей. */
export const DIALOG_STORY_BUBBLES_MAX = 3;
export const DIALOG_STORY_BUBBLE_CHARS = 80;

export type DialogDoneFact = Readonly<{
  scenarioId: string; title: string; dayKey: string;
  goalsDone: number; goalsTotal: number; turns: number; minutes: number;
  /** Какой по счёту пройденный диалог у человека (после этой отметки) — по нему решается кадр-предложение Plus. */
  doneCount: number;
  bubbles: readonly Readonly<{ me: boolean; text: string }>[];
}>;

/** «me:текст|them:текст» — формат, который читает кадр «Диалог пройден» (story_template_from_event → bubblesOf). */
export function dialogStoryBubbles(bubbles: DialogDoneFact['bubbles']): string {
  return bubbles
    // разделитель реплик — «|»: в самой реплике он заменяется пробелом, иначе пузырь разрезало бы пополам
    .map((b) => ({ me: b.me, text: b.text.replace(/[|\r\n]+/g, ' ').replace(/\s+/g, ' ').trim() }))
    .filter((b) => b.text !== '')
    .slice(0, DIALOG_STORY_BUBBLES_MAX)
    .map((b) => `${b.me ? 'me' : 'them'}:${b.text.length > DIALOG_STORY_BUBBLE_CHARS ? `${b.text.slice(0, DIALOG_STORY_BUBBLE_CHARS - 1).trimEnd()}…` : b.text}`)
    .join('|');
}

/**
 * Диалог с ИИ засчитан пройденным → история «Диалог пройден».
 * зачем (владелец 11.11: «заводи события недели и диалога»): шаблон кадра был, а события никто не создавал. Зовётся одной строкой
 * рядом с отметкой «пройден» в app/dialogue_v2_session.tsx. Реплики остаются на телефоне (локальный журнал историй), на сервер не уходят.
 * Без названия сцены кадр не рисуется — такое событие не пишем и говорим почему.
 */
export function recordDialogDoneStory(fact: DialogDoneFact): Promise<StoryRecordResult> | undefined {
  if (!fact.scenarioId || !fact.title.trim() || !fact.dayKey) {
    DebugLogger.info('[STORY-EVENTS]', `dialog_done: не пишем — нет сценария, названия или дня (scenarioId=${fact.scenarioId || '—'} названиеДлина=${fact.title.trim().length} день=${fact.dayKey || '—'})`);
    return undefined;
  }
  const whole = (n: number): number => (Number.isFinite(n) ? Math.max(0, Math.trunc(n)) : 0);
  return recordStoryEvent('dialog_done', {
    scenarioId: fact.scenarioId, title: fact.title.trim(), dayKey: fact.dayKey,
    goalsDone: whole(fact.goalsDone), goalsTotal: whole(fact.goalsTotal), turns: whole(fact.turns), minutes: Math.max(1, whole(fact.minutes)),
    // «без подсказок» не утверждаем: надёжного признака подсказок у сессии пока нет
    noHints: false, doneCount: whole(fact.doneCount), bubbles: dialogStoryBubbles(fact.bubbles),
  });
}

/** Повышение ранга монеты — после состоявшейся покупки (трата и ранг уже на диске). */
export function recordCoinRankStory(toRank: number, paidPrice: number, accountToken: AccountGenerationToken): Promise<StoryRecordResult> {
  notePremiumThemeProgress('final_coin_rank', toRank, accountToken);
  return recordStoryEvent('coin_rank_up', { toRank, paidPrice }, undefined, { accountToken });
}

/** Открытые живым действием ачивки (тихий backfill сюда не попадает — это не новость). */
export function recordAchievementStories(achievementIds: readonly string[]): void {
  if (achievementIds.length > 4) DebugLogger.info('[STORY-EVENTS]', `achievement: пачка из ${achievementIds.length} — пишем все, лимит 20 вытеснит старые`);
  for (const achievementId of achievementIds) void recordStoryEvent('achievement', { achievementId });
}

/** Новая постоянная тема: запись создаёт красное кольцо у аватара и живёт в недавних 7 дней. */
export function recordThemeUnlockStory(themeId: PremiumThemeId): Promise<StoryRecordResult> | undefined {
  if (!isPremiumThemeId(themeId)) return undefined;
  return recordStoryEvent('theme_unlock', { themeId });
}

/**
 * Навык поднялся на уровень (D207). Макет elevate-skills.js, кадр sk-story: «Живёт в историях, а не всплывает поверх урока.
 * Нажатие листает на второй кадр» — поэтому два события подряд: кадр «Новый уровень» (up) и кадр «Что дальше» (next).
 * Кадр рисует факт по текущим очкам (components/skills/SkillLevelStorySlide.tsx); очки начислены независимо от показа.
 */
export async function recordSkillLevelStories(levelUps: readonly SkillLevelUp[]): Promise<void> {
  for (const up of levelUps) {
    const base = { skill: up.skill, fromLevel: up.from, toLevel: up.to };
    const first = await recordStoryEvent('skill_level', { ...base, frame: 'up' });
    // зачем: второй кадр без первого бессмыслен — не записался первый, второй не пишем
    if (!first.recorded) {
      DebugLogger.info('[STORY-EVENTS]', `skill_level: ${up.skill} ${up.to} — первый кадр не записан, второй пропущен`);
      continue;
    }
    await recordStoryEvent('skill_level', { ...base, frame: 'next' });
  }
}

// зачем: источник историй загружается при старте (его зовут ачивки и серия), отсюда он и слушает подъёмы уровня навыка
onSkillLevelUps((levelUps) => {
  recordSkillLevelStories(levelUps).catch((error: unknown) => {
    DebugLogger.warn('[STORY-EVENTS]', `skill_level: запись не удалась ${error instanceof Error ? error.message : String(error)}`);
  });
});
