import { AppState } from 'react-native';
import { Image } from 'expo-image';
import { ACTIVE_FOUNDATION_IDS } from './achievement_catalog_v2';
import { getAchievementImageUrl } from '../constants/achievement_image_urls';
import { DebugLogger } from './debug-logger';
import {
  isInteractiveNetworkDeferredError,
  withBackgroundNetworkLease,
  type BackgroundNetworkLease,
} from './interactive_network_quiet';

/**
 * Событийный прогрев дискового кэша арта достижений.
 *
 * зачем: 64 статуэтки (3.84 МБ) больше не бандлятся, они лежат в Firebase
 * Storage. Чтобы пользователь НИКОГДА не увидел щит-заглушку вместо заслуженной
 * награды, арт скачивается ЗАРАНЕЕ и по событиям — не по таймеру:
 *   · вход на экран достижений — там видно всю полку целиком;
 *   · повышение уровня — в этот момент всплывают тосты наград;
 *   · возврат приложения из фона — догоняем то, что не скачалось офлайн.
 * Плюс разовый фоновый проход после первого кадра — он и покрывает награду,
 * выданную по итогам урока: к моменту первой награды кэш уже готов, даже если
 * пользователь ни разу не заходил в достижения.
 *
 * Экономия трафика и стоимости Storage:
 *  · каждый URL качается ОДИН раз на устройство (диск-кэш expo-image), дальше
 *    сеть не участвует вовсе;
 *  · объекты отдаются с `Cache-Control: immutable, max-age=1 год`;
 *  · в рамках сессии помним уже запрошенные URL и не дёргаем их повторно;
 *  · грузим малыми пачками, чтобы не конкурировать с видимым контентом;
 *  · при неудаче URL забывается — прогрев повторится на следующем событии, а
 *    до тех пор рисуется щит-заглушка, а не пустота.
 */

// Малые пачки: сеть не забивается, первый экран не тормозит.
const BATCH_SIZE = 8;
const BATCH_PAUSE_MS = 400;
// Стартуем заметно позже первого кадра — приоритет у видимого контента.
const START_DELAY_MS = 4000;

/** URL, уже прогретые (или прогреваемые) в этой сессии. */
const warmed = new Set<string>();
let running = false;
let backgroundStarted = false;
const queue: string[] = [];

// зачем: PM-213/PM-215 — прогрев арта (P4, 64 картинки) раньше не знал ни про фон, ни про
// занятие: качал пачки при свёрнутом приложении и конкурировал с сетью живого урока Learning V2.
// Теперь каждая пачка идёт под арендой «интерактивной тишины сети» (уступает занятию и
// отменяется по её сигналу), а в фоне приложения очередь останавливается. Остановка ничего не
// теряет: URL забываются, и следующее событие (возврат в active, экран достижений, уровень)
// поставит их в очередь заново. Лог с префиксом покажет, что и почему остановлено.
const PREFETCH_LOG = '[RUNTIME-PREFETCH]';
const LEASE_SOURCE = 'achievement-art.prefetch';

const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

function stopAndForgetQueue(reason: string, batch: readonly string[] = []): void {
  const dropped = queue.length + batch.length;
  batch.forEach((url) => warmed.delete(url));
  queue.forEach((url) => warmed.delete(url));
  queue.length = 0;
  console.log(`${PREFETCH_LOG} achievement_art остановлен`, JSON.stringify({ reason, dropped }));
}

/** Одна пачка под арендой; Image.prefetch не принимает сигнал, поэтому ждём либо итог, либо отмену аренды. */
async function prefetchBatch(
  batch: readonly string[],
  lease: BackgroundNetworkLease,
): Promise<PromiseSettledResult<boolean>[] | 'aborted'> {
  const aborted = new Promise<'aborted'>((resolve) => {
    if (lease.signal.aborted) { resolve('aborted'); return; }
    lease.signal.addEventListener('abort', () => resolve('aborted'), { once: true });
  });
  const settled = Promise.allSettled(
    // cachePolicy 'disk' — арт нужен на будущее, память под него не занимаем.
    batch.map((url) => Image.prefetch(url, { cachePolicy: 'disk' })),
  );
  return Promise.race([settled, aborted]);
}

async function drain(): Promise<void> {
  if (running) return;
  running = true;
  try {
    while (queue.length > 0) {
      if (AppState.currentState !== 'active') {
        stopAndForgetQueue(`app_state=${AppState.currentState}`);
        return;
      }
      const batch = queue.splice(0, BATCH_SIZE);
      let results: PromiseSettledResult<boolean>[] | 'aborted';
      try {
        results = await withBackgroundNetworkLease(LEASE_SOURCE, (lease) => prefetchBatch(batch, lease));
      } catch (error) {
        if (isInteractiveNetworkDeferredError(error)) {
          stopAndForgetQueue('interactive_network_quiet', batch);
          return;
        }
        throw error;
      }
      if (results === 'aborted') {
        stopAndForgetQueue('lease_aborted', batch);
        return;
      }
      results.forEach((result, index) => {
        // Не смогли — забываем URL, чтобы следующее событие попробовало снова.
        if (result.status === 'rejected') warmed.delete(batch[index]);
      });
      if (queue.length > 0) await sleep(BATCH_PAUSE_MS);
    }
  } catch (e) {
      // Прогрев — «best effort»: ошибка просто откладывает его до следующего // события, показ при этом никогда не остаётся пустым (есть щит).
      DebugLogger.error('achievement_art_prefetch:results', e instanceof Error ? e : new Error(String(e)), 'warning');
    } finally {
    running = false;
  }
}

function enqueue(ids: readonly string[]): void {
  let added = false;
  for (const id of ids) {
    const url = getAchievementImageUrl(id);
    if (!url || warmed.has(url)) continue;
    warmed.add(url);
    queue.push(url);
    added = true;
  }
  if (added) void drain();
}

/** Прогреть арт конкретных достижений — например, видимых на экране прямо сейчас. */
export function prefetchAchievementArt(ids: readonly string[]): void {
  if (__DEV__) return;
  enqueue(ids);
}

/**
 * Прогреть всю полку. Вызывается на входе на экран достижений и при повышении
 * уровня — там награда и открывается.
 */
export function prefetchAllAchievementArt(): void {
  if (__DEV__) return;
  enqueue(ACTIVE_FOUNDATION_IDS);
}

/**
 * Разовый фоновый прогрев после первого кадра. Безопасно вызывать многократно —
 * реально сработает один раз за сессию.
 */
export function prefetchAchievementArtInBackground(): void {
  if (__DEV__ || backgroundStarted) return;
  backgroundStarted = true;

  // зачем (аудит 2026-08-25): если прогрев прошёл офлайн, арт остался не
  // скачанным и сам бы не догрузился — следующая попытка ждала бы захода на
  // экран достижений или повышения уровня, а награда могла всплыть раньше.
  // Возврат из фона — момент, когда сеть чаще всего уже есть. Неудачные URL
  // забываются в drain(), поэтому повтор подхватывает ровно их.
  AppState.addEventListener('change', (state) => {
    if (state === 'active') prefetchAllAchievementArt();
  });

  void (async () => {
    await sleep(START_DELAY_MS);
    prefetchAllAchievementArt();
  })();
}
