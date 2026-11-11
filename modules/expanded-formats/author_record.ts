/**
 * Чтение авторской записи Кодекса (`peak-expanded-author-v1`) в задание, готовое к показу.
 *
 * зачем: пул новых заданий Пика написан в авторском формате — с уровнями, происхождением,
 * редакторскими пометками. Экрану из этого нужны только тексты на языке интерфейса и само задание.
 * Пояснения в пуле есть на en и ru; для остальных языков интерфейса берётся английский
 * (долг записан в пакете задачи peak-12-formats-and-exams-2026-11-11).
 */
import type { ExpandedFeedback, ExpandedTask } from './types';
import { parseExpandedExercise } from './validate';

export const EXPANDED_AUTHOR_SCHEMA = 'peak-expanded-author-v1' as const;

type Raw = Readonly<Record<string, unknown>>;

function isRecord(value: unknown): value is Raw {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function text(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function textArray(value: unknown): readonly string[] | undefined {
  return Array.isArray(value) && value.every((item) => typeof item === 'string') ? value : undefined;
}

function pickLocale(block: unknown, uiLang: string): Raw | null {
  if (!isRecord(block)) return null;
  const own = block[uiLang];
  if (isRecord(own)) return own;
  const fallback = block.en;
  return isRecord(fallback) ? fallback : null;
}

function readFeedback(raw: Raw | null): ExpandedFeedback | undefined {
  if (!raw || !text(raw.correct)) return undefined;
  const gapReasons = Array.isArray(raw.gapReasons)
    ? raw.gapReasons.map((slot) => textArray(slot) ?? [])
    : undefined;
  const commonErrors = Array.isArray(raw.commonErrors)
    ? raw.commonErrors
      .filter(isRecord)
      .map((entry) => ({ answer: text(entry.answer), reason: text(entry.reason) }))
      .filter((entry) => entry.answer && entry.reason)
    : undefined;
  return {
    correct: text(raw.correct),
    choiceReasons: textArray(raw.choiceReasons),
    sequenceReasons: textArray(raw.sequenceReasons),
    bankReasons: textArray(raw.bankReasons),
    wordReasons: textArray(raw.wordReasons),
    replacementReasons: textArray(raw.replacementReasons),
    gapReasons,
    itemReasons: textArray(raw.itemReasons),
    commonErrors,
    otherwise: text(raw.otherwise) || undefined,
  };
}

export type ExpandedAuthorParse =
  | Readonly<{ ok: true; task: ExpandedTask }>
  | Readonly<{ ok: false; reason: string }>;

/** Одна авторская запись → задание на языке интерфейса `uiLang`, либо причина отказа. */
export function expandedTaskFromAuthorRecord(record: unknown, uiLang: string): ExpandedAuthorParse {
  if (!isRecord(record)) return { ok: false, reason: 'record_object' };
  if (record.schema !== EXPANDED_AUTHOR_SCHEMA) return { ok: false, reason: 'schema' };
  const id = text(record.candidateId);
  const studyTarget = text(record.studyTarget);
  if (!id || !studyTarget) return { ok: false, reason: 'identity' };

  const ui = pickLocale(record.ui, uiLang);
  if (!ui || !text(ui.instruction) || !text(ui.prompt)) return { ok: false, reason: 'ui_texts' };

  const parsed = parseExpandedExercise(record.format, record.exercise, studyTarget);
  if (!parsed.ok) return { ok: false, reason: parsed.reason };

  // зачем: у «найди подтверждение» поле context — это сам текст для чтения; он показывается блоком текста, а не условием
  const context = parsed.exercise.format === 'evidence_choice' ? '' : text(ui.context);
  return {
    ok: true,
    task: {
      id,
      studyTarget,
      instruction: text(ui.instruction),
      prompt: text(ui.prompt),
      context,
      exercise: parsed.exercise,
      feedback: readFeedback(pickLocale(record.feedback, uiLang)),
    },
  };
}
