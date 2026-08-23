// Единый адаптер над `pc.getStats()` для MAX-звонка.
//
// Зачем отдельный чистый модуль: формат RTCStats в react-native-webrtc плавает
// между платформами и версиями (то массив, то Map-like отчёт; поля местами
// отсутствуют). Экран звонка не должен знать об этих расхождениях — он получает
// один нормализованный сэмпл, а `null` в полях означает «данных нет, уходи в
// organic idle pulse», а не «тишина в ноль». Любая кривая структура статов
// обязана превращаться в null-поля, никогда — в throw в горячем 100мс-поллинге.
//
// Второй потребитель одного и того же тика (эквалайзер и ореол) подключается
// через фан-аут: один вызов getStats — одна рассылка, чтобы не дублировать
// поллинг на слабых Android.
//
// Ноль React/нативных импортов — модуль детерминирован и покрыт юнит-тестами.

import { MAX_CALL_ORB_HYBRID } from '../constants/motionHybrid';

/** Один нормализованный тик уровней звука. `null` = данных нет (fallback UI). */
export interface AudioLevelSample {
  /** Уровень микрофона юзера (media-source.audioLevel), 0..1 или null. */
  mic: number | null;
  /** Уровень голоса ИИ (inbound-rtp audio audioLevel), 0..1 или null. */
  remote: number | null;
  /**
   * RTT выбранной candidate-pair в миллисекундах — нужен гейтингу
   * оптимистичного barge-in (RTT>300мс → локальный своп цвета как деградация).
   */
  rttMs: number | null;
}

/** Пустой сэмпл: статов нет вовсе — UI обязан уйти в idle pulse. */
const NULL_SAMPLE: AudioLevelSample = { mic: null, remote: null, rttMs: null };

/** Число валидно только если конечное — NaN/Infinity из кривых статов режем. */
function finiteOrNull(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

/** audioLevel обязан жить в 0..1 — расхождение формата клампим, не пробрасываем. */
function clamp01OrNull(value: unknown): number | null {
  const n = finiteOrNull(value);
  if (n === null) return null;
  return n < 0 ? 0 : n > 1 ? 1 : n;
}

/**
 * Ниже этого уровня считаем, что говорящий замолчал: сглаживание затухает
 * асимптотически и само в ноль не приходит, а «почти ноль» на экране читается
 * как застрявшая раздутой сфера.
 */
const SILENCE_FLOOR = 0.004;

function clamp01(value: number): number {
  return value < 0 ? 0 : value > 1 ? 1 : value;
}

/** Сглаженная огибающая голоса MAX: без рывка на каждом отдельном слове. */
export function smoothRemoteAudioLevel(previous: number, remote: number): number {
  const safePrevious = Number.isFinite(previous) ? clamp01(previous) : 0;
  const safeRemote = Number.isFinite(remote) ? clamp01(remote) : 0;
  // зачем (владелец 2026-08-23): «сфера не пульсирует по звуку». Прежняя
  // симметричная EMA 72/28 при тике 250мс имела постоянную времени ~1с и
  // срезала вершины слогов почти в прямую линию. Атака быстрее спада: удар
  // слога виден сразу, хвост угасает мягко — живая огибающая, не дрожь.
  const alpha = safeRemote > safePrevious ? 0.55 : 0.18;
  return safePrevious * (1 - alpha) + safeRemote * alpha;
}

/**
 * Нелинейная кривая отклика: реальный WebRTC audioLevel живого голоса лежит
 * в 0.01..0.25, а не в 0..1. Линейная проекция давала ~1.5px размаха на сфере
 * 238px — визуально ноль на фоне 5px собственного дыхания шара. Корень
 * растягивает рабочий диапазон речи в полный ход, не ломая границы 0..1.
 */
export function orbAudioResponse(level: number): number {
  const safe = Number.isFinite(level) ? clamp01(level) : 0;
  // Порог тишины: EMA сходится к нулю асимптотически, поэтому без него после
  // фразы оставался ~1% раздутия — сфера «зависала» чуть больше положенного.
  if (safe < SILENCE_FLOOR) return 0;
  // sqrt(x / typical) даёт ~1.0 уже на обычной громкости речи.
  const stretched = Math.sqrt(safe / MAX_CALL_ORB_HYBRID.typicalSpeechLevel);
  return clamp01(stretched);
}

/** Чистая проекция уровня remote-аудио в масштаб сферы; микрофон не участвует. */
export function orbScale(
  sample: AudioLevelSample,
  previous = 0,
  reduceMotion = false,
): number {
  if (reduceMotion || sample.remote === null || !Number.isFinite(sample.remote)) return 1;
  const smoothed = smoothRemoteAudioLevel(previous, sample.remote);
  return 1 + orbAudioResponse(smoothed) * MAX_CALL_ORB_HYBRID.audioScaleMax;
}

/**
 * Приводим вход к плоскому списку stats-объектов. Реальный `getStats()` в
 * rn-webrtc отдаёт либо массив, либо Map-like RTCStatsReport (forEach/values);
 * поддерживаем оба, всё прочее — «нет данных».
 */
function toStatsList(stats: unknown): Record<string, unknown>[] {
  const out: Record<string, unknown>[] = [];
  const pushIfObject = (entry: unknown) => {
    if (entry !== null && typeof entry === 'object') {
      out.push(entry as Record<string, unknown>);
    }
  };
  try {
    if (Array.isArray(stats)) {
      for (const entry of stats) pushIfObject(entry);
      return out;
    }
    if (stats === null || typeof stats !== 'object') return out;
    const mapLike = stats as {
      forEach?: (cb: (value: unknown) => void) => void;
      values?: () => Iterable<unknown>;
    };
    if (typeof mapLike.forEach === 'function') {
      // RTCStatsReport: forEach(value, key) — ключ нам не нужен.
      mapLike.forEach((value) => pushIfObject(value));
      return out;
    }
    if (typeof mapLike.values === 'function') {
      for (const value of mapLike.values()) pushIfObject(value);
      return out;
    }
  } catch {
    // Экзотический прокси/битый отчёт — молча считаем, что данных нет.
    return [];
  }
  return out;
}

/**
 * Разбор одного тика `pc.getStats()` в нормализованный сэмпл.
 *
 * - `inbound-rtp` с kind==='audio' → remote (голос ИИ);
 * - `media-source` (audio) → mic (микрофон юзера);
 * - `candidate-pair` с nominated/selected → rttMs (currentRoundTripTime в
 *   секундах по спеке WebRTC → переводим в мс).
 *
 * Любое расхождение формата даёт null в соответствующем поле; функция никогда
 * не бросает — поллинг 100мс не имеет права уронить экран звонка.
 */
export function parseAudioLevels(stats: unknown): AudioLevelSample {
  try {
    let mic: number | null = null;
    let remote: number | null = null;
    let rttMs: number | null = null;

    for (const entry of toStatsList(stats)) {
      const type = entry.type;
      if (typeof type !== 'string') continue;

      if (type === 'inbound-rtp') {
        // Старые сборки писали mediaType вместо kind — принимаем оба.
        const kind = entry.kind ?? entry.mediaType;
        if (kind !== 'audio') continue;
        if (remote === null) remote = clamp01OrNull(entry.audioLevel);
        continue;
      }

      if (type === 'media-source') {
        // media-source бывает и видео — отсекаем только явное не-audio.
        const kind = entry.kind ?? entry.mediaType;
        if (kind !== undefined && kind !== 'audio') continue;
        if (mic === null) mic = clamp01OrNull(entry.audioLevel);
        continue;
      }

      if (type === 'candidate-pair') {
        // Разные платформы помечают активную пару по-разному.
        const active = entry.nominated === true || entry.selected === true;
        if (!active) continue;
        if (rttMs === null) {
          const rttSec = finiteOrNull(entry.currentRoundTripTime);
          rttMs = rttSec !== null && rttSec >= 0 ? rttSec * 1000 : null;
        }
      }
    }

    return { mic, remote, rttMs };
  } catch {
    return { ...NULL_SAMPLE };
  }
}

/** Фан-аут одного тика нескольким потребителям (эквалайзер + ореол). */
export interface AudioLevelFanout {
  /** Подписка; возвращает отписку. Повторный вызов отписки — no-op. */
  subscribe(cb: (s: AudioLevelSample) => void): () => void;
  /** Синхронная рассылка сэмпла всем живым подписчикам. */
  push(s: AudioLevelSample): void;
}

/**
 * Один push — синхронный фан-аут всем подписчикам в порядке подписки.
 * Исключение в одном подписчике не должно лишать сэмпла остальных: ореол не
 * имеет права «убить» эквалайзер, и наоборот.
 */
export function createAudioLevelFanout(): AudioLevelFanout {
  const subscribers = new Set<(s: AudioLevelSample) => void>();
  return {
    subscribe(cb: (s: AudioLevelSample) => void): () => void {
      subscribers.add(cb);
      return () => {
        subscribers.delete(cb);
      };
    },
    push(s: AudioLevelSample): void {
      // Снимок на случай подписки/отписки прямо из колбэка во время рассылки.
      for (const cb of Array.from(subscribers)) {
        try {
          cb(s);
        } catch {
          // Сломавшийся потребитель — его проблема; рассылку продолжаем.
        }
      }
    },
  };
}
