// ════════════════════════════════════════════════════════════════════════════
// paywall_init_cap.ts — «ждать не дольше потолка» для шагов ДО оплаты (старт магазина, синхронизация личности).
//
// зачем (координатор 12.10, Optimistic UI R1): у пейвола онбординга (не resilientCheckout) initRevenueCat и syncRevenueCatIdentity ждались без потолка —
// если магазин «подвис» до оплаты, кнопка крутилась бесконечно. Здесь шаг получает тот же потолок, что в окне Plus (LOAD_GATE_TOTAL_MS), а вызывающий
// получает ИСХОД (ok / timeout / error), а не исключение: по timeout он освобождает кнопку и говорит «Магазин не отвечает», по error — ведёт себя как раньше.
// Сама оплата, цены и entitlement сюда не попадают. Журнал: [PAYWALL-INIT-CAP] — что ждали, сколько, исход.
// ════════════════════════════════════════════════════════════════════════════

export type InitCapOutcome<T> =
  | Readonly<{ status: 'ok'; value: T; ms: number }>
  | Readonly<{ status: 'timeout'; ms: number }>
  | Readonly<{ status: 'error'; error: unknown; ms: number }>;

const TAG = '[PAYWALL-INIT-CAP]';

export async function awaitWithinInitCap<T>(step: string, work: Promise<T>, ceilingMs: number, context: string): Promise<InitCapOutcome<T>> {
  const startedAt = Date.now();
  console.log(`${TAG} wait step=${step} ceilingMs=${ceilingMs} ctx=${context}`); // guard-ok: вход шага
  let timer: ReturnType<typeof setTimeout> | null = null;
  const timeout = new Promise<'timeout'>((resolve) => {
    timer = setTimeout(() => resolve('timeout'), ceilingMs);
  });
  try {
    const raced = await Promise.race([work.then((value) => ({ kind: 'ok' as const, value })), timeout]);
    const ms = Date.now() - startedAt;
    if (raced === 'timeout') {
      // зачем: незавершённый шаг не отменяем (магазин может ответить позже и пригодится следующему тапу), но человека больше не держим
      work.catch((error: unknown) => {
        console.warn(`${TAG} late_error step=${step} after_timeout reason=${error instanceof Error ? error.message : String(error)}`); // guard-ok: поздний отказ после потолка
      });
      console.warn(`${TAG} timeout step=${step} ms=${ms} ceilingMs=${ceilingMs} ctx=${context} → кнопка свободна, оплата не начата`); // guard-ok: исход
      return { status: 'timeout', ms };
    }
    console.log(`${TAG} ok step=${step} ms=${ms}`); // guard-ok: исход
    return { status: 'ok', value: raced.value, ms };
  } catch (error: unknown) {
    const ms = Date.now() - startedAt;
    console.warn(`${TAG} error step=${step} ms=${ms} reason=${error instanceof Error ? error.message : String(error)} → прежнее поведение (ошибка уходит дальше)`); // guard-ok: исход
    return { status: 'error', error, ms };
  } finally {
    if (timer) clearTimeout(timer);
  }
}

/* expo-router route shim */
export default function __RouteShim() { return null; }
