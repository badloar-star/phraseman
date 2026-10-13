/**
 * Ошибки диалога → «Мои ошибки» (владелец 13.10: «Да, пусть попадают в Мои ошибки»).
 *
 * зачем: итог диалога показывает «было → стало» по каждой реплике (разбор хода D112, app/dialogue_v2_session_outcome_store.ts),
 * но в журнал ошибок эти поправки не попадали — кнопке «Добить: Ещё учу (N)» на итоге диалога нечего было открывать.
 * Каждая поправка становится обычной записью журнала вида 'dialogue':
 * - задание (sourcePrompt) — фраза ученика как он её сказал, ответ (canonicalTarget) — исправленная фраза;
 * - грань 'form' без подсказок-отвлекалок и без аудио → журнал сам предлагает «собери» (builder) и «напиши» (typing);
 * - id записи = sessionId + номер поправки: повторный заход на итог той же сессии не плодит дублей (eventId стабилен,
 *   запись пропускается как appended:false);
 * - хранение — тот же локальный журнал и тот же синк (users/{uid}/progress_events), что у остальных ошибок; ответ ученика
 *   (given) режется до 200 знаков, как везде.
 * Журнал [DIALOG-MISTAKES]: вход, каждый пропуск с причиной, каждый catch, итог.
 */
import type { MistakeStudyTarget } from '../modules/mistake-practice/contracts';
import { normalizeMistakeStudyTarget } from '../modules/mistake-practice/contracts';
import {
  captureCurrentAccountObjectiveAttempt,
  type CaptureResult,
  type ObjectiveMistakeAttempt,
} from './mistake_practice_capture';

const TAG = '[DIALOG-MISTAKES]';
/** Больше поправок с одной сессии не пишем: диалог — не тест, длинный хвост только засорит журнал. */
export const DIALOGUE_MISTAKES_PER_SESSION_MAX = 12;

export type DialogueCorrectionRow = Readonly<{ original: string; corrected: string }>;

export type DialogueMistakeAttempt = Omit<ObjectiveMistakeAttempt, 'accountScope'>;

const normalize = (value: string): string => value.normalize('NFC').replace(/\s+/g, ' ').trim();
// Сравнение «поправка ничего не меняет»: регистр и конечная пунктуация не считаются ошибкой.
const comparable = (value: string): string => normalize(value).toLowerCase().replace(/[.!?…,;:]+$/u, '');

export type DialogueMistakePlan = Readonly<{
  attempts: readonly DialogueMistakeAttempt[];
  skipped: readonly Readonly<{ index: number; reason: 'empty' | 'same_text' | 'over_limit' }>[];
}>;

/** Чистая сборка попыток из поправок сессии (без I/O) — её и проверяют тесты. */
export function planDialogueMistakeAttempts(input: Readonly<{
  sessionId: string;
  studyTarget: unknown;
  rows: readonly DialogueCorrectionRow[];
}>): DialogueMistakePlan {
  const studyTarget: MistakeStudyTarget = normalizeMistakeStudyTarget(input.studyTarget);
  const attempts: DialogueMistakeAttempt[] = [];
  const skipped: { index: number; reason: 'empty' | 'same_text' | 'over_limit' }[] = [];
  input.rows.forEach((row, index) => {
    const original = normalize(row?.original ?? '');
    const corrected = normalize(row?.corrected ?? '');
    if (!original || !corrected) { skipped.push({ index, reason: 'empty' }); return; }
    if (comparable(original) === comparable(corrected)) { skipped.push({ index, reason: 'same_text' }); return; }
    if (attempts.length >= DIALOGUE_MISTAKES_PER_SESSION_MAX) { skipped.push({ index, reason: 'over_limit' }); return; }
    const number = index + 1;
    attempts.push({
      attemptId: `dialogue:${input.sessionId}:${number}`,
      studyTarget,
      verdict: 'wrong',
      objective: true,
      content: {
        sourceKind: 'dialogue',
        sourceId: `${input.sessionId}:${number}`,
        canonicalTarget: corrected,
        sourcePrompt: original,
        tokens: corrected.split(' '),
      },
      facet: { kind: 'form', given: original },
    });
  });
  return { attempts, skipped };
}

export type DialogueMistakeCaptureSummary = Readonly<{
  mistakeIds: readonly string[];
  captured: number;
  alreadyKnown: number;
  failed: number;
}>;

export async function captureDialogueV2Mistakes(
  input: Readonly<{ sessionId: string; studyTarget: unknown; rows: readonly DialogueCorrectionRow[] }>,
  capture: (attempt: DialogueMistakeAttempt) => Promise<CaptureResult> = captureCurrentAccountObjectiveAttempt,
): Promise<DialogueMistakeCaptureSummary> {
  const session = input.sessionId.slice(0, 24);
  const plan = planDialogueMistakeAttempts(input);
  console.log(`${TAG} start ${JSON.stringify({ session, studyTarget: String(input.studyTarget), rows: input.rows.length, attempts: plan.attempts.length, skipped: plan.skipped })}`);
  const mistakeIds: string[] = [];
  let captured = 0;
  let alreadyKnown = 0;
  let failed = 0;
  for (const attempt of plan.attempts) {
    try {
      const result = await capture(attempt);
      if (result.kind !== 'captured') {
        console.warn(`${TAG} ignored ${JSON.stringify({ session, sourceId: attempt.content.sourceId.slice(-8), reason: result.reason })}`);
        continue;
      }
      if (!mistakeIds.includes(result.mistakeId)) mistakeIds.push(result.mistakeId);
      if (result.appended) captured += 1; else alreadyKnown += 1;
    } catch (error) {
      // Причину записи уже пишет mistake_practice_capture ([MISTAKE-CAPTURE] failed); здесь — какая поправка не легла.
      failed += 1;
      console.warn(`${TAG} capture_failed ${JSON.stringify({ session, sourceId: attempt.content.sourceId.slice(-8), reason: error instanceof Error ? error.message.slice(0, 160) : String(error).slice(0, 160) })}`);
    }
  }
  const summary = { mistakeIds, captured, alreadyKnown, failed };
  console.log(`${TAG} done ${JSON.stringify({ session, ids: mistakeIds.length, captured, alreadyKnown, failed })}`);
  return summary;
}
