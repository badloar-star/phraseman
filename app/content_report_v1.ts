// content_report_v1.ts — жалоба на задание или реплику «Пожаловаться» для ВСЕХ людей, с долговечной очередью.
//
// зачем (координатор 28.10, слово владельца: кнопка «Пожаловаться» везде, где её нет — Диалоги во время диалога, тест уровня, упражнения; «тап — сразу „Спасибо“,
// отправка в фоне, ретрай без сети»): обычная ReportErrorButton в сборке магазина скрыта (REPORT_ERROR_ENABLED = ENABLE_DEV_TOOLS, решение владельца 05.10: «Нашёл ошибку?» —
// только тестерам); показать её всем можно только со своим транспортом submitOverride — как у уроков Learning V2 (решение владельца 21.10, реестр №9) и Шпиля. Этот модуль — такой
// транспорт для всех остальных мест. Отправка идёт через sendSupportReportInBackground (app/support_report_outbox.ts): запись в долговечную очередь, дослать при следующем
// запуске, если сети нет — поэтому форма показывает «Спасибо» сразу, а «не отправилось» только когда не легло даже в очередь. Диагностический журнал к жалобе на контент НЕ
// прикладывается (attachDiagnostics:false): нужен только текст задания, ответ и язык — минимум данных.
import type { Lang } from '../constants/i18n';
import { ERROR_REPORT_COMMENT_MIN_LEN, ERROR_REPORT_FREE_TEXT_CATEGORY, type ErrorReportResult } from './error_report';
import { sendSupportReportInBackground } from './support_report_outbox';

const LOG = '[CONTENT-REPORT]';
/** Предел id в админке и текста, который кладём в отчёт (сервер режет dataText на 5000, ответ на 1000). */
const DATA_ID_MAX = 180;
const DATA_TEXT_MAX = 1800;
const USER_ANSWER_MAX = 600;

export type ContentReportInputV1 = Readonly<{
  /** Экран-источник: ключ для админки («dialogue_v2_session», «learning_v2_placement», …). */
  screen: string;
  /** Машинный ключ места: id диалога/задания и реплики/номера. */
  dataId: string;
  /** Текст, на который жалуются (реплика собеседника, формулировка задания). */
  dataText: string;
  /** Что человек ответил/собрал до жалобы. */
  userAnswer?: string;
  comment: string;
  /** Язык интерфейса — на нём ответит поддержка. */
  lang: Lang;
  /** Язык контента (изучаемый), например «en»: попадает в текст отчёта. */
  contentLang?: string;
}>;

const reportedInThisProcess = new Set<string>();

function clip(value: string, max: number): string {
  return value.length > max ? `${value.slice(0, max - 1)}…` : value;
}

/** Текст отчёта: первой строкой язык контента, затем сам текст — админ сразу видит контекст. */
export function contentReportDataTextV1(input: Pick<ContentReportInputV1, 'screen' | 'dataText' | 'contentLang'>): string {
  const head = `${input.screen}${input.contentLang ? ` · ${input.contentLang}` : ''}`;
  return clip(`${head}\n${input.dataText}`, DATA_TEXT_MAX);
}

/** Ключ «один и тот же отчёт в одном запуске не шлём дважды»: место + текст пояснения. */
function dedupeKey(input: Pick<ContentReportInputV1, 'dataId' | 'comment'>): string {
  return `${input.dataId}|${input.comment.trim()}`.slice(0, 400);
}

/**
 * Транспорт для ReportErrorButton.submitOverride. 'sent' — отчёт в очереди или уже ушёл (человеку «Спасибо»); 'failed' — не легло даже в очередь (нужен повтор);
 * 'invalid_comment' — пояснение короче минимума (форма проверяет это сама, здесь страховка).
 */
export async function submitContentReportV1(input: ContentReportInputV1): Promise<ErrorReportResult> {
  const comment = input.comment.trim();
  const dataId = clip(input.dataId, DATA_ID_MAX);
  if (comment.length < ERROR_REPORT_COMMENT_MIN_LEN) {
    console.warn(`${LOG} отклонён: пояснение короче минимума`, JSON.stringify({ dataId, len: comment.length, min: ERROR_REPORT_COMMENT_MIN_LEN })); // guard-ok: ранний выход называет причину
    return 'invalid_comment';
  }
  const key = dedupeKey({ dataId, comment });
  if (reportedInThisProcess.has(key)) {
    console.log(`${LOG} повтор той же жалобы в этом запуске — не шлём`, JSON.stringify({ dataId })); // guard-ok: ранний выход называет причину
    return 'sent';
  }
  const startedAt = Date.now();
  try {
    const outcome = await sendSupportReportInBackground(
      {
        screen: input.screen,
        category: ERROR_REPORT_FREE_TEXT_CATEGORY,
        dataId,
        dataText: contentReportDataTextV1(input),
        userAnswer: input.userAnswer ? clip(input.userAnswer, USER_ANSWER_MAX) : undefined,
        comment,
      },
      input.lang,
      {},
      { attachDiagnostics: false },
    );
    console.log(`${LOG} итог`, JSON.stringify({ screen: input.screen, dataId, outcome, ms: Date.now() - startedAt, contentLang: input.contentLang ?? null })); // guard-ok: итог отправки
    if (outcome === 'failed') return 'failed';
    reportedInThisProcess.add(key);
    return 'sent';
  } catch (error: unknown) {
    console.warn(`${LOG} отправка бросила ошибку`, JSON.stringify({ dataId, reason: error instanceof Error ? error.message : String(error) })); // guard-ok: catch называет причину
    return 'failed';
  }
}

export function resetContentReportsForTests(): void {
  reportedInThisProcess.clear();
}

export default function __RouteShim() { return null; }
