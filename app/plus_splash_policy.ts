// ════════════════════════════════════════════════════════════════════════════
// plus_splash_policy.ts — когда показывать заставку Plus при запуске (№35).
//
// зачем (владелец 21.10, эталон docs/design/v2-app/plus-launch-etalon.html): заставка — предложение, а не навязчивость.
// Правила эталона: раз в 14 дней и только при запуске; не в первые 3 дня после установки; после трёх «Не сейчас» подряд —
// раз в 30 дней; не показываем с Plus (включая пробный) и 30 дней после его окончания; не показываем, если магазина на устройстве
// нет (купить всё равно нельзя). Счётчик живёт на устройстве — ни чтений, ни записей в базу.
//
// Модуль чистый: на вход — факты, на выход — решение и ПРИЧИНА (журнал [PLUS-SPLASH] пишет её на каждое решение).
// ════════════════════════════════════════════════════════════════════════════

const DAY_MS = 24 * 60 * 60 * 1000;

/** Обычный интервал между показами. */
export const PLUS_SPLASH_INTERVAL_MS = 14 * DAY_MS;
/** Интервал после того, как человек несколько раз подряд отказался. */
export const PLUS_SPLASH_AFTER_REFUSALS_INTERVAL_MS = 30 * DAY_MS;
/** Сколько «Не сейчас» подряд переводят заставку на редкий режим. */
export const PLUS_SPLASH_REFUSALS_LIMIT = 3;
/** Новичку сначала даём понять приложение. */
export const PLUS_SPLASH_MIN_INSTALL_AGE_MS = 3 * DAY_MS;
/** Тишина после окончания Plus: этим занимается карточка возврата. */
export const PLUS_SPLASH_AFTER_PLUS_QUIET_MS = 30 * DAY_MS;

export type PlusSplashReason =
  | 'show_first'
  | 'show_due'
  | 'access_unresolved'
  | 'has_plus'
  | 'install_date_unknown'
  | 'recent_install'
  | 'after_plus_quiet'
  | 'interval_not_elapsed'
  | 'store_unavailable';

export type PlusSplashFacts = Readonly<{
  nowMs: number;
  /** Первая проверка доступа уже прошла: до неё Plus-пользователь выглядит как бесплатный. */
  accessResolved: boolean;
  /** Plus / VIP / Pro / пробный период — любой доступ. */
  hasPremiumAccess: boolean;
  /** `install_date` из локального хранилища (мс) или null, если не записан. */
  installedAtMs: number | null;
  /** Последний показ заставки (мс) или null, если ещё не показывали. */
  lastShownAtMs: number | null;
  /** Сколько раз подряд закрыли без перехода в пейвол. */
  refusalsInRow: number;
  /** Последнее известное окончание Plus (`premium_rc_expiry_ms`) или null. */
  lastPlusExpiryMs: number | null;
  /** true — магазин на устройстве недоступен (billing_unavailable); null — ещё не знаем, не блокирует. */
  storeUnavailable: boolean | null;
}>;

export type PlusSplashDecision = Readonly<{ show: boolean; reason: PlusSplashReason; detail: string }>;

const no = (reason: PlusSplashReason, detail: string): PlusSplashDecision => ({ show: false, reason, detail });
const yes = (reason: PlusSplashReason, detail: string): PlusSplashDecision => ({ show: true, reason, detail });

const days = (ms: number): string => (ms / DAY_MS).toFixed(1);

/** Интервал до следующего показа с учётом отказов подряд. */
export function plusSplashIntervalMs(refusalsInRow: number): number {
  return refusalsInRow >= PLUS_SPLASH_REFUSALS_LIMIT ? PLUS_SPLASH_AFTER_REFUSALS_INTERVAL_MS : PLUS_SPLASH_INTERVAL_MS;
}

export function decidePlusSplash(f: PlusSplashFacts): PlusSplashDecision {
  if (!f.accessResolved) return no('access_unresolved', 'доступ ещё не проверен — не показываем, чтобы не предложить Plus тому, у кого он есть');
  if (f.hasPremiumAccess) return no('has_plus', 'у человека уже есть Plus / VIP / пробный период');

  if (f.installedAtMs === null || !Number.isFinite(f.installedAtMs) || f.installedAtMs <= 0) {
    return no('install_date_unknown', 'дата установки не записана — не показываем, пока не известен возраст установки');
  }
  const installAge = f.nowMs - f.installedAtMs;
  if (installAge < PLUS_SPLASH_MIN_INSTALL_AGE_MS) {
    return no('recent_install', `с установки прошло ${days(installAge)} дн. < 3`);
  }

  if (f.lastPlusExpiryMs !== null && Number.isFinite(f.lastPlusExpiryMs) && f.lastPlusExpiryMs > 0) {
    const sinceExpiry = f.nowMs - f.lastPlusExpiryMs;
    if (sinceExpiry < PLUS_SPLASH_AFTER_PLUS_QUIET_MS) {
      return no('after_plus_quiet', `Plus закончился ${days(sinceExpiry)} дн. назад < 30`);
    }
  }

  const interval = plusSplashIntervalMs(f.refusalsInRow);
  if (f.lastShownAtMs !== null && Number.isFinite(f.lastShownAtMs) && f.lastShownAtMs > 0 && f.lastShownAtMs <= f.nowMs) {
    const since = f.nowMs - f.lastShownAtMs;
    if (since < interval) {
      return no('interval_not_elapsed', `после прошлого показа ${days(since)} дн. < ${days(interval)} (отказов подряд: ${f.refusalsInRow})`);
    }
  }
  // Метка показа из будущего (часы переводили) в расчёт не берём — иначе заставка пропала бы надолго; причина остаётся в detail.
  const skew = f.lastShownAtMs !== null && f.lastShownAtMs > f.nowMs ? ' (метка прошлого показа из будущего — игнорируем)' : '';

  if (f.storeUnavailable === true) return no('store_unavailable', 'магазина на устройстве нет (billing_unavailable) — купить всё равно нельзя');

  return f.lastShownAtMs === null
    ? yes('show_first', `ещё не показывали; установка ${days(installAge)} дн. назад`)
    : yes('show_due', `интервал ${days(interval)} дн. прошёл; отказов подряд: ${f.refusalsInRow}${skew}`);
}

/* expo-router route shim: служебный модуль в app/ не должен становиться экраном. */
export default function __PlusSplashPolicyRouteShim() { return null; }
