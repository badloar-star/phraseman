// ═══════════════════════════════════════════════════════════════════════════
// release_reason.ts — код причины отказа в денежных и аккаунтных потоках, видимый в РЕЛИЗЕ.
//
// зачем (координатор 13.10, RELEASE_LOGGING_R1_2026-10-13.md): релизная сборка вырезает console.log, а console.warn живёт только
// в системном журнале телефона — причина «почему не прошла покупка / вход / списание энергии» до команды не доходила.
// Помощник кладёт КОРОТКИЙ КОД в уже существующий журнал обращения в поддержку (recordSupportDiagnostic, событие
// feature_action, поле action = «область:код»). Этот журнал описан в политике §10, новых полей нет.
// Никакого текста, id, email и UUID: код проверяется строгим шаблоном здесь и ещё раз схемой журнала.
// Пишет в память, на диск пачкой раз в 30 с (support_diagnostics_flush) — на путь пользователя не влияет.
// ═══════════════════════════════════════════════════════════════════════════
import { recordSupportDiagnostic } from './support_diagnostics';

export const RELEASE_REASON_AREAS = [
  'purchase',
  'restore_purchase',
  'auth',
  'account_switch',
  'account_restore',
  'account_delete',
  'energy',
] as const;

export type ReleaseReasonArea = typeof RELEASE_REASON_AREAS[number];
export type ReleaseReasonResult = 'blocked' | 'error' | 'info';

/** Только строчные латинские буквы, цифры и подчёркивание, начинается с буквы, ≤ 40 знаков. */
const RELEASE_REASON_CODE = /^[a-z][a-z0-9_]{0,39}$/;
/** Похоже на идентификатор: 6+ цифр подряд или 20+ букв и цифр без разделителя (то же правило, что в схеме журнала). */
const LOOKS_LIKE_ID = /[0-9]{6,}|[a-z0-9]{20,}/;

function devRuntime(): boolean {
  return typeof __DEV__ !== 'undefined' && __DEV__ === true;
}

/** true — код годится для журнала. Экспорт для тестов и сторожей. */
export function isValidReleaseReasonCode(code: string): boolean {
  return RELEASE_REASON_CODE.test(code) && !LOOKS_LIKE_ID.test(code);
}

/**
 * Записать код причины отказа. Никогда не бросает и не ждёт диска.
 * Пример: releaseReason('purchase', 'rc_cancelled', 'blocked').
 */
export function releaseReason(area: ReleaseReasonArea, code: string, result: ReleaseReasonResult = 'blocked'): void {
  try {
    if (!(RELEASE_REASON_AREAS as readonly string[]).includes(area) || !isValidReleaseReasonCode(code)) {
      if (devRuntime()) console.log(`[RELEASE-REASON] код отброшен (не по схеме) area=${String(area)} code=${String(code).slice(0, 60)}`); // guard-ok: dev-ветка, причина отказа видна
      return;
    }
    const action = `${area}:${code}`;
    if (devRuntime()) console.log(`[RELEASE-REASON] ${action} result=${result}`); // guard-ok: dev-след той же записи
    void recordSupportDiagnostic({ event: 'feature_action', action, result, subject: 'app' }).catch((error: unknown) => {
      if (devRuntime()) console.log(`[RELEASE-REASON] запись в журнал не удалась ${action}`, error instanceof Error ? error.message : String(error)); // guard-ok: catch логируется
    });
  } catch (error) {
    if (devRuntime()) console.log('[RELEASE-REASON] помощник упал', error instanceof Error ? error.message : String(error)); // guard-ok: catch логируется
  }
}

/* expo-router route shim: app/ files are treated as routes and need a default export. */
export default function __RouteShim() { return null; }
