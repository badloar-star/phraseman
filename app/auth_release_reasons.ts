/**
 * Коды причин аккаунтных потоков для журнала обращения (шаг 3 RELEASE_LOGGING_R1_2026-10-13.md, помощник Ядра 4faca60d8).
 *
 * зачем (Авторизация 13.10): релиз вырезает console.log, а console.warn с телефона до поддержки не доходит — в обращении не
 * было видно, почему не вышло войти, сменить аккаунт или удалить его. Здесь — только коды смысла причины (без uid, почты, id
 * и текста ошибки); пишет releaseReason, который не бросает и не ждёт диска.
 */
import { isValidReleaseReasonCode, releaseReason, type ReleaseReasonArea, type ReleaseReasonResult } from './release_reason';

/** Отказы входа, которые человек видит как понятную остановку, а не сбой. */
const SIGN_IN_REFUSALS: ReadonlySet<string> = new Set([
  'account_delete_pending',
  'identity_retired',
  'merge_pending',
  'swap',
  'clean_recovery_transition_active',
]);

/** Значение параметра события → годный код или запасной. */
function safeCode(raw: unknown, fallback: string): string {
  const head = String(raw ?? '').split(':')[0].trim().toLowerCase();
  return isValidReleaseReasonCode(head) ? head : fallback;
}

/** Исход signInWithProvider на экране входа: отмена окна провайдера или код ошибки входа. Успех не пишется. */
export function reportSignInOutcome(provider: string, result: Readonly<{ result: string; error?: string }>): void {
  if (result.result === 'cancelled') {
    releaseReason('auth', provider === 'apple' ? 'apple_cancelled' : 'google_cancelled', 'blocked');
    return;
  }
  if (result.result !== 'error') return;
  const code = safeCode(result.error, 'sign_in_failed');
  if (code === 'account_switch_required') {
    releaseReason('account_switch', 'required', 'blocked');
    return;
  }
  releaseReason('auth', code, SIGN_IN_REFUSALS.has(code) ? 'blocked' : 'error');
}

/** Вход бросил исключение (catch экрана входа). */
export function reportSignInThrew(): void {
  releaseReason('auth', 'sign_in_threw', 'error');
}

/** Окно удаления: локальная передача удаления отказала (код причины из beginAccountDeletion) или бросила. */
export function reportAccountDeleteHandoffFailed(reason: unknown): void {
  releaseReason('account_delete', safeCode(reason, 'local_rejected'), 'error');
}

export function reportAccountDeleteHandoffThrew(): void {
  releaseReason('account_delete', 'local_delete_threw', 'error');
}

type AuthEventRule = (params?: Record<string, string | number>) => readonly [ReleaseReasonArea, string, ReleaseReasonResult];

/**
 * События аналитики входа/выхода/удаления → код причины. Подключено в logAuthEvent (одна точка вместо десятков веток).
 * Событие не из таблицы журнал обращения не трогает.
 */
const AUTH_EVENT_RULES: Readonly<Record<string, AuthEventRule>> = {
  auth_signout_wipe_failed: (p) => ['auth', `sign_out_failed_${safeCode(p?.stage, 'unknown')}`, 'error'],
  auth_signout_wipe_sync_failed_aborted: () => ['auth', 'sign_out_sync_aborted', 'blocked'],
  auth_account_delete_enqueued: () => ['account_delete', 'queued', 'info'],
  auth_account_delete_enqueue_failed: () => ['account_delete', 'enqueue_failed', 'error'],
  auth_account_delete_quarantined: (p) => {
    const reason = safeCode(p?.reason, 'quarantined');
    return ['account_delete', reason, reason === 'guest_server_deletion_deferred' ? 'info' : 'error'];
  },
  auth_account_delete_lock_release_failed: () => ['account_delete', 'lock_release_failed', 'error'],
};

export function releaseReasonForAuthEvent(name: string, params?: Record<string, string | number>): void {
  const rule = AUTH_EVENT_RULES[name];
  if (!rule) return;
  const [area, code, result] = rule(params);
  releaseReason(area, code, result);
}

/* expo-router route shim: keeps utility module from warning when discovered as route */
export default function __RouteShim() { return null; }
