import type { DailyJourneyRevealTarget } from './DailyJourneyRevealScene';

// зачем: сцена «Дар дня» живёт в Modal поверх любого таба (DevHubSheet
// смонтирован в (tabs)/_layout), а центр карточки «Статистика» знает только
// app/(tabs)/home.tsx. Реестр-мост: главная регистрирует замерщик, хост сцены
// спрашивает точку в момент показа. Нет замерщика / замер упал / карточка вне
// экрана — null, и сцена летит в стабильный верхний центр (спека, п. 5.6);
// доставка при этом не откатывается.

const LOG = '[DAILY-JOURNEY-TARGET]';
// зачем: measureInWindow обязан ответить за кадр-два; зависший замер не должен
// держать чёрный Modal — по таймауту честно уходим в фоллбэк.
const MEASURE_TIMEOUT_MS = 300;
const isDev = (): boolean => typeof __DEV__ !== 'undefined' && __DEV__;

export type DailyJourneyRevealTargetMeasurer = () => Promise<DailyJourneyRevealTarget | null>;

let activeMeasurer: DailyJourneyRevealTargetMeasurer | null = null;

/** Главная регистрирует замерщик центра карточки; возвращает отписку. */
export function registerDailyJourneyRevealTargetMeasurer(
  measurer: DailyJourneyRevealTargetMeasurer,
): () => void {
  activeMeasurer = measurer;
  return () => {
    if (activeMeasurer === measurer) activeMeasurer = null;
  };
}

/** Точка полёта награды или null (хост сцены передаст null — сработает фоллбэк). */
export async function measureDailyJourneyRevealTarget(signal?: AbortSignal): Promise<DailyJourneyRevealTarget | null> {
  const measurer = activeMeasurer;
  if (!measurer) {
    if (isDev()) console.log(LOG, 'no measurer registered -> top-center fallback');
    return null;
  }
  let timeoutId: ReturnType<typeof setTimeout> | null = null;
  const measured = measurer().catch((e: unknown) => {
    // зачем: правило «каждый catch пишет причину» — немой отказ замера
    // выглядел бы как случайные полёты в верхний центр без объяснения.
    if (isDev()) console.log(LOG, 'measurer threw:', e);
    return null;
  });
  const timeout = new Promise<null>((resolve) => {
    timeoutId = setTimeout(() => resolve(null), MEASURE_TIMEOUT_MS);
  });
  const aborted = new Promise<null>((resolve) => {
    signal?.addEventListener('abort', () => resolve(null), { once: true });
  });
  const point = await Promise.race([measured, timeout, aborted]);
  if (timeoutId !== null) clearTimeout(timeoutId);
  if (signal?.aborted) return null;
  if (!point || !Number.isFinite(point.x) || !Number.isFinite(point.y)) {
    if (isDev()) console.log(LOG, 'measurer returned', point, '-> top-center fallback');
    return null;
  }
  return point;
}
