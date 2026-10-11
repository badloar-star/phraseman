/**
 * Ограниченное ожидание синхронизации личности RevenueCat при расчёте доступа Plus.
 *
 * зачем (Сверка ~23:30: `[RC-IDENTITY] sync:slow 53 467 мс`; координатор 00:56): после смены аккаунта
 * PremiumContext сбрасывает Plus и ждал синхронизацию без потолка — без Play Billing или при плохой сети подписчик
 * минуту видел замки. Расчёт доступа и так продолжается при НЕУДАЧЕ синхронизации (fail-open по проверенному
 * кэшу/облаку), поэтому долгое ожидание приравнено к неудаче: не дольше `waitMs`, а поздний итог отдаётся в `onLate`,
 * чтобы вызывающий один раз пересчитал доступ.
 */
export const PREMIUM_IDENTITY_WAIT_MS = 3_000;

export type PremiumIdentityWaitResult = Readonly<{
  ready: boolean;
  timedOut: boolean;
}>;

// Поздний итог приходит вне вызывающего await — исключение в onLate не должно стать необработанным отказом промиса.
function safeOnLate(onLate: (lateReady: boolean) => void, lateReady: boolean): void {
  try {
    onLate(lateReady);
  } catch (error: unknown) {
    console.warn('[RC-IDENTITY] premium_reload:on_late_failed', error instanceof Error ? error.message : String(error));
  }
}

export function waitForIdentitySyncBounded(
  sync: Promise<boolean>,
  onLate: (lateReady: boolean) => void,
  waitMs: number = PREMIUM_IDENTITY_WAIT_MS,
): Promise<PremiumIdentityWaitResult> {
  return new Promise((resolve) => {
    let settled = false;
    const timer = setTimeout(() => {
      if (settled) return;
      settled = true;
      resolve({ ready: false, timedOut: true });
    }, waitMs);
    sync.then(
      (ready) => {
        if (!settled) {
          settled = true;
          clearTimeout(timer);
          resolve({ ready, timedOut: false });
          return;
        }
        safeOnLate(onLate, ready);
      },
      (error: unknown) => {
        // Синхронизация обязана не бросать (вызывающий оборачивает её), но если бросила — это неудача, а не зависание.
        console.warn('[RC-IDENTITY] premium_reload:sync_rejected', error instanceof Error ? error.message : String(error));
        if (!settled) {
          settled = true;
          clearTimeout(timer);
          resolve({ ready: false, timedOut: false });
          return;
        }
        safeOnLate(onLate, false);
      },
    );
  });
}
