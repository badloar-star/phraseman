/**
 * Вежливое предупреждение о голосовом лимите при старте занятия V2.
 *
 * зачем (владелец 17.10, координатор): у Free один общий счётчик голосовых попыток в день на все микрофоны (D196,
 * app/voice_daily_allowance.ts). Если в занятии голосовых заданий больше, чем осталось попыток, человек упрётся в лимит
 * посреди занятия. Предупреждаем ДО первого задания: «в этом занятии N заданий с голосом, у тебя осталось K — закончить
 * не получится; с Plus лимита нет» — кнопки «Попробовать Plus» и «Начать всё равно». Окно — поверх вступления, без сети,
 * раз на запуск занятия (sessionRunId).
 *
 * Чистые функции: решение тестируется без экрана. Лог [VOICE-HEADSUP] — числа и решение, без персональных данных.
 */
import type { VoiceDailyAllowance } from './voice_daily_allowance';

/** Режимы ввода, на которых плеер включает микрофон (app/learning_v2_direct_session_player_v1.tsx: scripted_speech / tap_record_compare). */
const VOICE_INPUT_MODES: ReadonlySet<string> = new Set(['scripted_speech', 'tap_record_compare']);

export type VoiceHeadsupInteraction = Readonly<{ inputMode?: string | null }>;

/** Сколько заданий занятия требуют микрофон. Каждый старт записи тратит попытку, поэтому это нижняя граница расхода. */
export function countLearningV2VoiceTasksV1(interactions: readonly VoiceHeadsupInteraction[]): number {
  return interactions.reduce((count, interaction) => count + (VOICE_INPUT_MODES.has(String(interaction.inputMode ?? '')) ? 1 : 0), 0);
}

export type VoiceHeadsupDecision =
  | 'show'
  | 'skip_no_voice_tasks'
  | 'skip_plus'
  | 'skip_unknown'
  | 'skip_enough_attempts'
  | 'skip_already_shown';

export type VoiceHeadsupResult = Readonly<{
  decision: VoiceHeadsupDecision;
  voiceTasks: number;
  remaining: number | null;
}>;

/**
 * Показывать ли предупреждение. Только Free с известным остатком (kind 'limited') и только когда остаток меньше числа
 * голосовых заданий. 'unknown' — молчим, как значок микрофона (Plus не должен увидеть предупреждение из-за медленной проверки).
 */
export function decideLearningV2VoiceHeadsupV1(input: Readonly<{
  allowance: VoiceDailyAllowance;
  voiceTasks: number;
  alreadyShownForRun: boolean;
}>): VoiceHeadsupResult {
  const { allowance, voiceTasks } = input;
  const base = { voiceTasks, remaining: allowance.remaining };
  if (voiceTasks <= 0) return { ...base, decision: 'skip_no_voice_tasks' };
  if (allowance.kind === 'plus') return { ...base, decision: 'skip_plus' };
  if (allowance.kind !== 'limited' || allowance.remaining === null) return { ...base, decision: 'skip_unknown' };
  if (allowance.remaining >= voiceTasks) return { ...base, decision: 'skip_enough_attempts' };
  if (input.alreadyShownForRun) return { ...base, decision: 'skip_already_shown' };
  return { ...base, decision: 'show' };
}

export function logLearningV2VoiceHeadsupV1(
  result: VoiceHeadsupResult,
  context: Readonly<{ lessonOrdinal: number | null; sessionOrdinal: number | null; kind: VoiceDailyAllowance['kind'] }>,
): void {
  console.log('[VOICE-HEADSUP]', JSON.stringify({ ...context, voiceTasks: result.voiceTasks, remaining: result.remaining, decision: result.decision })); // guard-ok: одна строка на решение
}

/** Запуски занятия, для которых предупреждение уже показано (в памяти процесса: раз на sessionRunId). */
const shownRuns = new Set<string>();

export function wasLearningV2VoiceHeadsupShownV1(sessionRunId: string): boolean {
  return shownRuns.has(sessionRunId);
}

export function markLearningV2VoiceHeadsupShownV1(sessionRunId: string): void {
  shownRuns.add(sessionRunId);
}

export function resetLearningV2VoiceHeadsupForTestsV1(): void {
  shownRuns.clear();
}
