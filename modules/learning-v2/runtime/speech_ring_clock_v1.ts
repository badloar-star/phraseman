/**
 * Кольцо кнопки звука в заданиях Learning V2 — ход по реальной речи голоса телефона.
 *
 * зачем (владелец 22.10: «Кружочек должен заполняться строго по длине аудио, а не сначала медленно, а потом аудио закончилось —
 * и он резко дозаполнился»): кольцо шло по оценке из числа слов (≈420 мс на слово) и по концу речи добивалось за 120 мс. Голоса
 * и скорость («медленно» 0,72) у телефонов разные — оценка врала. Теперь (подсказка Learning V2 22.10: настоящая длина — от onStart
 * до onDone голоса):
 *  - старт — onStart голоса; длительность — замер прошлых фраз той же скорости (мс на символ, скользящее среднее),
 *    пока замеров нет — прежняя оценка по словам с поправкой на скорость;
 *  - граница слова (onBoundary: iOS willSpeakRange, Android onRangeStart) пересчитывает темп по факту — кольцо меняет
 *    скорость с текущего места, без рывков;
 *  - до onDone кольцо держится на HOLD (95 %): если голос говорит дольше оценки, кольцо не встанет «полным» раньше речи;
 *  - onDone — короткое плавное доведение, не дольше 150 мс.
 * Здесь только числа (чистые функции и память замеров): анимацию по этим планам ведёт withTiming на UI-потоке.
 */
import { learningV2RingFillMsForPhraseV1 } from "../modes/mode_motion_tokens_v1";

export const SPEECH_RING_HOLD_V1 = 0.95;
export const SPEECH_RING_FINISH_MAX_MS_V1 = 150;
const SPEECH_RING_FINISH_MIN_MS_V1 = 60;
/** Раньше этой доли текста темп по границам слов ненадёжен (вдох, первое слово) — держим план старта. */
const MIN_SPOKEN_FOR_PROJECTION = 0.12;
const EMA_WEIGHT = 0.5;
/** Замеры вне этих пределов — сбой (onDone без речи, зависший голос), в среднее не берём. */
const MIN_MEASURED_MS = 250;
const MAX_MEASURED_MS = 30_000;

export type SpeechRingPlanV1 = Readonly<{ target: number; durationMs: number }>;
export type SpeechRingEstimateV1 = Readonly<{ ms: number; source: "measured" | "words" }>;

const clamp01 = (value: number): number => (Number.isFinite(value) ? Math.min(1, Math.max(0, value)) : 0);
const safeRate = (rate: number | undefined): number => (typeof rate === "number" && Number.isFinite(rate) && rate > 0.1 ? rate : 1);
const rateKey = (rate: number | undefined): string => safeRate(rate).toFixed(2);
const spokenChars = (text: string): number => text.trim().length;

/** Память замеров на время работы приложения: мс на символ для каждой скорости голоса. */
export type SpeechRingCalibrationV1 = Readonly<{
  estimate: (text: string, rate: number | undefined) => SpeechRingEstimateV1;
  record: (text: string, rate: number | undefined, actualMs: number) => boolean;
}>;

export function createSpeechRingCalibrationV1(): SpeechRingCalibrationV1 {
  const msPerCharByRate = new Map<string, number>();
  return {
    estimate(text, rate) {
      const chars = spokenChars(text);
      const measured = msPerCharByRate.get(rateKey(rate));
      if (measured !== undefined && chars > 0) return { ms: Math.round(measured * chars), source: "measured" };
      return { ms: Math.round(learningV2RingFillMsForPhraseV1(text) / safeRate(rate)), source: "words" };
    },
    record(text, rate, actualMs) {
      const chars = spokenChars(text);
      if (chars < 2 || !Number.isFinite(actualMs) || actualMs < MIN_MEASURED_MS || actualMs > MAX_MEASURED_MS) return false;
      const key = rateKey(rate);
      const sample = actualMs / chars;
      const previous = msPerCharByRate.get(key);
      msPerCharByRate.set(key, previous === undefined ? sample : previous * (1 - EMA_WEIGHT) + sample * EMA_WEIGHT);
      return true;
    },
  };
}

/** Общие замеры на время работы приложения: голос и скорость у человека одни и те же во всех заданиях. */
export const SPEECH_RING_CALIBRATION_V1 = createSpeechRingCalibrationV1();

/** Голос начал говорить: к HOLD за ожидаемое время (кольцо не обгоняет речь до onDone). */
export function speechRingStartPlanV1(estimateMs: number): SpeechRingPlanV1 {
  return { target: SPEECH_RING_HOLD_V1, durationMs: Math.max(1, Math.round(Math.max(0, estimateMs) * SPEECH_RING_HOLD_V1)) };
}

/**
 * Граница слова: по сказанной доле и прошедшему времени — сколько ещё до HOLD. Новый план начинается с текущего места кольца,
 * поэтому скорость меняется плавно. Рано (меньше 12 % текста), неизвестная длина или кольцо уже у HOLD — плана нет.
 */
export function speechRingBoundaryPlanV1(input: Readonly<{
  charIndex: number;
  textLength: number;
  elapsedMs: number;
  current: number;
}>): SpeechRingPlanV1 | null {
  if (input.textLength <= 0 || input.elapsedMs <= 0 || clamp01(input.current) >= SPEECH_RING_HOLD_V1) return null;
  const spoken = clamp01(input.charIndex / input.textLength);
  if (spoken < MIN_SPOKEN_FOR_PROJECTION) return null;
  const projectedTotalMs = input.elapsedMs / spoken;
  return { target: SPEECH_RING_HOLD_V1, durationMs: Math.max(16, Math.round(projectedTotalMs * SPEECH_RING_HOLD_V1 - input.elapsedMs)) };
}

/** Голос закончил: плавно до конца, 60–150 мс — чем меньше осталось, тем короче. */
export function speechRingDonePlanV1(current: number): SpeechRingPlanV1 {
  const rest = 1 - clamp01(current);
  if (rest <= 0) return { target: 1, durationMs: 0 };
  const share = Math.min(1, rest / (1 - SPEECH_RING_HOLD_V1 + 0.15));
  return {
    target: 1,
    durationMs: Math.round(SPEECH_RING_FINISH_MIN_MS_V1 + (SPEECH_RING_FINISH_MAX_MS_V1 - SPEECH_RING_FINISH_MIN_MS_V1) * share),
  };
}
