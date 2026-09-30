// ═══════════════════════════════════════════════════════════════════════════
// spire_mistake_capture.ts — ошибка в ступени Шпиля → «Мои ошибки» (пакет D).
//
// зачем (макет spire.html «Ошибка — правильный ответ»: «Ошибка сохранена в «Мои
// ошибки»»): тот же журнал, что у уроков и экзамена (captureCurrentAccountObjectiveAttempt,
// только локально, без сети). Строку «сохранена» экран показывает ТОЛЬКО по факту
// ответа журнала (kind === 'captured'), а не заранее.
//
// Что пишем — только то, из чего потом можно собрать решаемое упражнение:
//   • guess_phrase — фраза-подсказка + верный вариант (+ остальные как дистракторы);
//   • fill_gap     — фраза с пропуском + верное слово (facet missing_token);
//   • translate_build — фраза + восстановленный порядок слов.
// «Найди лишнее» и «пары» не пишем: из них упражнение «Моих ошибок» не строится,
// а неразрешимое задание в журнале стоит человеку жизни (инцидент 2026-09-21).
//
// sourceKind: в объединении MistakeSourceKind значения для Шпиля пока нет, а
// modules/mistake-practice/contracts.ts сейчас правит другая сессия. Журнал
// хранит sourceKind строкой, группировка неизвестного даёт «другое»
// (mistake_practice_insights.ts), поэтому значение 'spire_step' безопасно.
// TODO(owner/tech): добавить 'spire_step' в MistakeSourceKind и группу «Шпиль».
// ═══════════════════════════════════════════════════════════════════════════
import type { MistakeSourceKind } from '../../modules/mistake-practice/contracts';
import { isMistakeStudyTargetValue } from '../../modules/mistake-practice/contracts';
import type { SpirePackTask } from '../../modules/spire/pack_plan';
import { DebugLogger } from '../debug-logger';
import { captureCurrentAccountObjectiveAttempt } from '../mistake_practice_capture';

const LOG = '[SPIRE]';
const SPIRE_SOURCE_KIND = 'spire_step' as MistakeSourceKind;

export type SpireMistakeInput = Readonly<{
  studyTarget: string;
  attemptKey: string;
  task: SpirePackTask;
  /** Верный ответ, восстановленный по отпечатку (текст варианта или слова сборки). */
  correct: string | readonly string[] | null;
  given: string;
}>;

function str(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

/** true — журнал записал ошибку (можно честно сказать «сохранена»). */
export async function spireCaptureMistake(input: SpireMistakeInput): Promise<boolean> {
  const { task } = input;
  if (!isMistakeStudyTargetValue(input.studyTarget)) {
    DebugLogger.info(LOG, `mistake: язык ${input.studyTarget} не пишется в журнал ошибок — пропуск`);
    return false;
  }
  if (input.correct === null) {
    DebugLogger.info(LOG, `mistake: верный ответ ${task.taskId} не восстановлен — не пишем`);
    return false;
  }
  const phrase = str(task.payload.phrase);
  const options = Array.isArray(task.payload.options) ? task.payload.options.map(str) : [];
  let content: { canonicalTarget: string; sourceMeaning?: string; sourcePrompt?: string; tokens?: readonly string[]; distractors?: readonly string[] } | null = null;
  let facet: 'meaning' | 'missing_token' | 'word_order' = 'meaning';
  if (task.mode === 'guess_phrase' && typeof input.correct === 'string') {
    content = { canonicalTarget: input.correct, sourceMeaning: phrase, distractors: options };
  } else if (task.mode === 'fill_gap' && typeof input.correct === 'string' && phrase.includes('___')) {
    content = { canonicalTarget: phrase.replace('___', input.correct), sourcePrompt: phrase, distractors: options };
    facet = 'missing_token';
  } else if (task.mode === 'translate_build' && Array.isArray(input.correct)) {
    content = { canonicalTarget: input.correct.join(' '), sourceMeaning: phrase, tokens: input.correct };
    facet = 'word_order';
  }
  if (!content || !content.canonicalTarget) {
    DebugLogger.info(LOG, `mistake: режим ${task.mode} не пишется в «Мои ошибки» — пропуск`);
    return false;
  }
  try {
    const result = await captureCurrentAccountObjectiveAttempt({
      attemptId: `spire:${input.attemptKey}:${task.taskId}`,
      studyTarget: input.studyTarget,
      verdict: 'wrong',
      objective: true,
      content: { sourceKind: SPIRE_SOURCE_KIND, sourceId: `spire:${task.taskId}`, ...content },
      facet: {
        kind: facet,
        expected: typeof input.correct === 'string' ? input.correct : input.correct.join(' '),
        given: input.given,
      },
    });
    DebugLogger.info(LOG, `mistake: ${task.taskId} → ${result.kind}${result.kind === 'ignored' ? ` (${result.reason})` : ''}`);
    return result.kind === 'captured';
  } catch (error) {
    DebugLogger.warn(LOG, `mistake: запись ${task.taskId} упала (${error instanceof Error ? error.message : String(error)})`);
    return false;
  }
}

/* expo-router route shim */
export default function __RouteShim() { return null; }
