/**
 * Контроллер перемотки одного встроенного плеера.
 *
 * зачем (владелец 2026-09-25): тап по фразе под плеером перематывает видео к
 * моменту фразы. Плеер внутри WebView готов не сразу (YouTube IFrame API грузится
 * из сети), поэтому перемотка, пришедшая раньше, ждёт сигнала «готов» и
 * применяется один раз, последняя из запрошенных. Логика вынесена из компонента,
 * чтобы проверяться тестом без WebView.
 */
const TAG = '[VIDEO-SEEK]';

export type YoutubeSeekController = {
  /** Перемотать на секунду; если плеер не готов — запомнить (только последнюю). */
  requestSeek: (seconds: number) => void;
  /** Плеер внутри WebView сообщил «готов» — применить отложенную перемотку. */
  markReady: () => void;
  /** WebView пересоздан (повтор после ошибки, смена ролика) — снова ждём «готов». */
  reset: () => void;
};

export function createYoutubeSeekController(
  videoId: string,
  send: (seconds: number) => void,
  takeBusPending?: () => number | null,
): YoutubeSeekController {
  let ready = false;
  let queued: number | null = null;

  const apply = (seconds: number, via: string) => {
    console.log(`${TAG} ${videoId} применяю ${seconds}s (${via})`);
    try {
      send(seconds);
    } catch (e) {
      console.warn(`${TAG} ${videoId} отправка в WebView упала: ${e instanceof Error ? e.message : String(e)}`);
    }
  };

  return {
    requestSeek(seconds) {
      if (!Number.isFinite(seconds) || seconds < 0) {
        console.warn(`${TAG} ${videoId} неверная секунда=${String(seconds)} — пропущено`);
        return;
      }
      if (!ready) {
        queued = seconds;
        console.log(`${TAG} ${videoId} плеер не готов — ${seconds}s в очереди`);
        return;
      }
      apply(seconds, 'сразу');
    },
    markReady() {
      ready = true;
      let pending = queued;
      queued = null;
      if (pending === null && takeBusPending) pending = takeBusPending();
      if (pending === null) {
        console.log(`${TAG} ${videoId} плеер готов, отложенной перемотки нет`);
        return;
      }
      apply(pending, 'после готовности');
    },
    reset() {
      ready = false;
      queued = null;
      console.log(`${TAG} ${videoId} сброс: ждём готовности плеера заново`);
    },
  };
}
