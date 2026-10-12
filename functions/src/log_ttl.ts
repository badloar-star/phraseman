import { Timestamp } from 'firebase-admin/firestore';

/**
 * зачем: R/п.4 (координатор) и аудит E24 — журналы `app_errors` и `app_activity`
 * росли бесконечно и стоили денег за хранение. Срок жизни записи — 90 дней,
 * дальше её удаляет TTL-политика Firestore по полю `expireAt`
 * (см. fieldOverrides в firestore.indexes.json). Одна константа и один хелпер,
 * чтобы все писатели журналов считали срок одинаково.
 */
export const LOG_TTL_DAYS = 90;
export const LOG_TTL_MS = LOG_TTL_DAYS * 24 * 60 * 60 * 1000;

/** Момент, когда TTL-политика вправе удалить запись, созданную в `nowMs`. */
export function logExpireAt(nowMs: number): Timestamp {
  return Timestamp.fromMillis(nowMs + LOG_TTL_MS);
}

/**
 * зачем (решение владельца 12.10 (а)): обращения в поддержку и сообщения об ошибках (error_reports, kind=error_report) вместе с приложенным
 * журналом диагностики хранятся 30 дней — дальше документ удаляет TTL-политика по `expireAt` (fieldOverride в firestore.indexes.json).
 * Срок назван в политике конфиденциальности (legal/privacy_policy_en*.json).
 */
export const SUPPORT_REPORT_TTL_DAYS = 30;
export const SUPPORT_REPORT_TTL_MS = SUPPORT_REPORT_TTL_DAYS * 24 * 60 * 60 * 1000;

export function supportReportExpireAt(nowMs: number): Timestamp {
  return Timestamp.fromMillis(nowMs + SUPPORT_REPORT_TTL_MS);
}
