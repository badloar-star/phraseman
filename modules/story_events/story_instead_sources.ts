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

/**
 * «Бонусы стали монетами» (взамен окна «Встречайте PhraseMan 2.0»): сколько монет начислил сервер и сколько было опыта, жемчуга и вращений.
 * Ключ — итог начисления: пересчёт разовый, повторный вход с тем же итогом второй истории не создаёт.
 */
export function recordLegacyCoinsStory(input: Readonly<{ coins: number; xpBefore: number; pearlsBefore: number; spinsBefore: number }>): Promise<StoryRecordResult> {
  return record('legacy', `v2:${input.coins}`, { coins: input.coins, xpBefore: input.xpBefore, pearlsBefore: input.pearlsBefore, spinsBefore: input.spinsBefore });
}

/**
 * «Plus закончился» (взамен автоперехода на экран оплаты): вид подписки и сколько защит серии в месяц давал Plus (число — из правил приложения,
 * пишется в событие, чтобы кадр не зависел от модуля подписки). Ключ — вид и день: хост и так показывает не чаще раза в 7 дней.
 */
export function recordPlusExpiredStory(input: Readonly<{ kind: 'premium' | 'vip'; dayKey: string; freezesPerMonth: number }>, accountToken: AccountGenerationToken): Promise<StoryRecordResult> {
  return record('plus_expired', `${input.kind}:${input.dayKey}`, { plan: input.kind, freezesPerMonth: input.freezesPerMonth }, accountToken);
}

/** «Доступ можно открыть снова» (взамен окна на вкладке «Друзья»): ключ — момент конца окна доступа, одно окно доступа — одна история. */
export function recordReferralEndedStory(input: Readonly<{ windowEndMs: number }>): Promise<StoryRecordResult> {
  return record('ref_ended', String(input.windowEndMs), { windowEndMs: input.windowEndMs });
}

/**
 * «Тебя пригласили» (взамен реферального окна-приветствия): один раз на аккаунт, как отметка «видел» у окна.
 * `needsCodeEntry` — код друга ещё не введён: у кадра появляется кнопка «У меня есть код приглашения».
 */
export function recordReferralWelcomeStory(needsCodeEntry: boolean = false): Promise<StoryRecordResult> {
  return record('ref_welcome', 'once', { needsCodeEntry });
}

/** «Первый разговор» (взамен окна в конце первого диалога): один раз на изучаемый язык, как отметка показа у окна. */
export function recordFirstDialogStory(input: Readonly<{ studyTarget: string; turns: number; goalsDone: number; goalsTotal: number }>): Promise<StoryRecordResult> {
  return record('first_dialog', input.studyTarget, { studyTarget: input.studyTarget, turns: input.turns, goalsDone: input.goalsDone, goalsTotal: input.goalsTotal });
}

/**
 * «Оцените приложение» (взамен окна просьбы об оценке): повод просьбы (идеальный урок / зачёт / рубеж серии) и длина серии для повода «серия».
 * Ключ — повод и локальный день: одна просьба в день, как у окна (у него ещё и своя пауза в 30 дней).
 */
export function recordRateAppStory(input: Readonly<{ context: 'perfect_lesson' | 'level_exam_pass' | 'streak_milestone'; streakDays: number | null; dayKey: string }>): Promise<StoryRecordResult> {
  // 0 — длины серии нет (повод не «серия»): в событии только числа и строки
  return record('rate', `${input.context}:${input.dayKey}`, { context: input.context, streakDays: input.streakDays ?? 0 }); // guard-ok: длина серии для подписи кадра, серия не меняется
}

/**
 * «Идеальный урок» (взамен окна-штампа на итоге урока): номер урока, число заданий (все верные) и монеты за урок — то же «+N», что на итоге.
 * Ключ — ключ прохождения (урок + язык + попытка): повторный заход на тот же итог второй истории не создаёт.
 */
export function recordPerfectLessonStory(input: Readonly<{ onceKey: string; lessonNo: number; total: number; coins: number }>): Promise<StoryRecordResult> {
  return record('perfect', input.onceKey, { lessonNo: input.lessonNo, total: input.total, coins: input.coins }); // guard-ok: число монет для показа в кадре, баланс не меняется
}

/** «Открыт урок N» (взамен уведомления «Новый урок открыт» на итоге): ключ — язык и номер открытого урока, один раз на урок. */
export function recordLessonOpenStory(input: Readonly<{ studyTarget: string; lessonNo: number; nextLessonNo: number }>): Promise<StoryRecordResult> {
  return record('lesson_open', `${input.studyTarget}:${input.nextLessonNo}`, { lessonNo: input.lessonNo, nextLessonNo: input.nextLessonNo });
}

/**
 * «Медаль урока» (взамен уведомления о медали на итоге урока): урок, ступень медали и оценка урока (оценка нужна тексту «Поделиться»).
 * Ключ — язык, урок и ступень: каждая ступень медали урока объявляется один раз.
 */
export function recordLessonMedalStory(input: Readonly<{ studyTarget: string; lessonNo: number; tier: 'bronze' | 'silver' | 'gold'; score: number }>): Promise<StoryRecordResult> {
  return record('medal', `${input.studyTarget}:${input.lessonNo}:${input.tier}`, { lessonNo: input.lessonNo, tier: input.tier, score: input.score });
}

/** «Экзамен уровня открыт» (взамен уведомления на итоге урока): ключ — язык и уровень, один раз на уровень. */
export function recordLevelExamOpenStory(input: Readonly<{ studyTarget: string; cefrLevel: string; lessonNo: number; score: number }>): Promise<StoryRecordResult> {
  return record('level_exam', `${input.studyTarget}:${input.cefrLevel}`, { cefrLevel: input.cefrLevel, lessonNo: input.lessonNo, score: input.score });
}

/** «Экзамен Lingman открыт» (взамен уведомления на итоге урока): ключ — язык, один раз на курс. */
export function recordLingmanExamOpenStory(input: Readonly<{ studyTarget: string; lessonNo: number; score: number }>): Promise<StoryRecordResult> {
  return record('lingman_exam', input.studyTarget, { lessonNo: input.lessonNo, score: input.score });
}

/**
 * «Вышло обновление» (взамен мягкого окна «Доступно обновление»): необязательный текст из настроек обновления.
 * Ключ — локальный день: проверка обновления и так срабатывает не чаще раза в сутки. Адрес магазина в событие не пишется —
 * кнопка кадра берёт его из настроек приложения.
 */
export function recordAppUpdateStory(input: Readonly<{ dayKey: string; message: string | null }>): Promise<StoryRecordResult> {
  // пустая строка — текста из настроек нет (в событии только числа и строки)
  return record('update', input.dayKey, { message: input.message ?? '' });
}

/**
 * «Включить напоминания» (взамен окна после пропущенных дней): сколько дней без занятий.
 * Ключ — день показа: сигнал и так срабатывает не чаще раза в день.
 */
export function recordNotifNudgeStory(input: Readonly<{ dayKey: string; missedDays: number }>): Promise<StoryRecordResult> {
  return record('nudge', input.dayKey, { missedDays: input.missedDays });
}

/**
 * «Добро пожаловать» (взамен приветствия новичка поверх Главной; владелец 11.11: «только история! ничего поверх главной!»):
 * один раз на аккаунт, как отметка «показано» у приветствия. Монета — начального ранга: новичок ещё ничего не улучшал.
 */
export function recordHelloStory(): Promise<StoryRecordResult> {
  return record('hello', 'once', { coinRank: 0 }); // guard-ok: ранг монеты для показа в кадре (начальный), ранг и баланс не меняются
}

/**
 * «Сообщение» (взамен полноэкранного окна личного сообщения команды): заголовок и текст письма на языке интерфейса в момент записи.
 * Ключ — номер сообщения: одно письмо — одна история.
 */
export function recordTeamMessageStory(input: Readonly<{ messageId: string; title: string; body: string }>, accountToken: AccountGenerationToken): Promise<StoryRecordResult> {
  return record('message', input.messageId, { title: input.title, body: input.body }, accountToken);
}

/**
 * «Plus подключён» (взамен праздничного окна после покупки или выдачи Plus): сколько защит серии в месяц даёт Plus (число — из правил
 * приложения). Ключ — отметка события покупки или выдачи: одно событие — одна история.
 */
export function recordPlusOnStory(input: Readonly<{ key: string; freezesPerMonth: number }>): Promise<StoryRecordResult> {
  return record('plus_on', input.key, { freezesPerMonth: input.freezesPerMonth });
}

/** «Пик · позиция выросла» (взамен окна после ступени): место «было → стало» и монеты ступени. Ключ — ключ решения Ядра (в нём неделя). */
export function recordPeakRiseStory(input: Readonly<{ key: string; fromIndex: number; toIndex: number; coinsGained: number }>): Promise<StoryRecordResult> {
  return record('peak_rise', input.key, { fromIndex: input.fromIndex, toIndex: input.toIndex, coinsGained: input.coinsGained }); // guard-ok: монеты ступени для подписи кадра, баланс не меняется
}

/** «Пик · тебя обгоняют» (взамен плашки «Тебя обогнали»): соперник и разрыв; −1 — значения нет (в событии только числа и строки). */
export function recordPeakOvertakeStory(input: Readonly<{ key: string; rivalName: string; rivalCoinRank: number | null; gapCoins: number; gapSteps: number | null }>): Promise<StoryRecordResult> {
  return record('peak_overtake', input.key, {
    rivalName: input.rivalName, rivalCoinRank: input.rivalCoinRank ?? -1, gapCoins: input.gapCoins, gapSteps: input.gapSteps ?? -1, // guard-ok: разрыв для подписи кадра
  });
}

/** «Пик · последний шанс» (взамен окна в воскресенье): конец недели, возврат энергии, разрыв до топ-5; −1 — значения нет. */
export function recordPeakLastChanceStory(input: Readonly<{ key: string; weekEndsAtMs: number; energyReadyAtMs: number; gapCoins: number | null; gapSteps: number | null }>): Promise<StoryRecordResult> {
  return record('peak_last', input.key, {
    weekEndsAtMs: input.weekEndsAtMs, energyReadyAtMs: input.energyReadyAtMs, gapCoins: input.gapCoins ?? -1, gapSteps: input.gapSteps ?? -1, // guard-ok: разрыв для подписи кадра
  });
}

/** «Хватает на ранг N»: ключ — номер следующего ранга, один раз на ранг (как у окна). */
export function recordRankEnoughStory(input: Readonly<{ rank: number; nextRank: number; balance: number; price: number }>, accountToken: AccountGenerationToken): Promise<StoryRecordResult> {
  return record('rank_enough', String(input.nextRank), { rank: input.rank, nextRank: input.nextRank, balance: input.balance, price: input.price }, accountToken);
}
