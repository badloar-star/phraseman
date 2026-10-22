/**
 * Кольцо кнопки звука в заданиях Learning V2 — ход по реальной речи голоса телефона.
 *
 * зачем (владелец 22.10: «Кружочек должен заполняться строго по длине аудио, а не сначала медленно, а потом аудио закончилось —
 * и он резко дозаполнился»): кольцо шло по оценке из числа слов (≈420 мс на слово) и по концу речи добивалось за 120 мс.
 *
 * Замер Сверки 22.10 (эмулятор, голос телефона, «I am ready.», 5 запусков, журнал [AUDIO-RING]) поменял модель:
 *  - от onStart до onDone стабильно 1030–1071 мс (±20) — это самая надёжная длина;
 *  - onStart приходит раньше звука: первая граница слова — через 234–412 мс; кольцо, стартуя по onStart, уезжало на 0,2–0,34 до звука;
 *  - границы внутри фразы не пропорциональны буквам («I» и «am» — через 2–6 мс одна за другой, «ready» — на 45 % букв, но на ~16 %
 *    звука): пересчёт темпа по ним уводил кольцо к 95 % на 250–600 мс раньше конца речи.
 * Поэтому:
 *  - длина = задержка голоса (onStart → первое слово) + слышимая часть (мс на символ); обе — скользящее среднее по скорости голоса;
 *  - кольцо ждёт выученную задержку и идёт к HOLD так, чтобы полным стать ровно к ожидаемому концу речи;
 *  - первая граница слова — «звук пошёл»: пришла раньше ожидания — кольцо стартует сразу, конец не сдвигается; задержка ещё не
 *    выучена — кольцо перестраивается от звука; остальные границы только пишутся в журнал;
 *  - до onDone кольцо держится не выше HOLD (95 %); onDone — короткое плавное доведение, не дольше 150 мс.
 * Здесь только числа (чистые функции и память замеров): анимацию по этим планам ведёт плеер на UI-потоке.
 */

export const SPEECH_RING_HOLD_V1 = 0.95;
export const SPEECH_RING_FINISH_MAX_MS_V1 = 150;
const SPEECH_RING_FINISH_MIN_MS_V1 = 60;
/** До первого замера: слышимая часть ≈ 72 мс на символ при скорости 1 (Сверка 22.10: «I am ready.», 11 знаков ≈ 650–830 мс от первого слова до конца). */
export const SPEECH_RING_DEFAULT_MS_PER_CHAR_V1 = 72;
/** Первая граница считается началом звука, только если это первое слово (а не граница после пропусков движка). */
const FIRST_WORD_MAX_SHARE = 0.2;
const EMA_WEIGHT = 0.5;
/** Замеры вне этих пределов — сбой (onDone без речи, зависший голос), в среднее не берём. */
const MIN_MEASURED_MS = 250;
const MAX_MEASURED_MS = 30_000;
const MAX_LEAD_MS = 1_500;

/** План кольца: ждать delayMs, затем за durationMs дойти до target. */
export type SpeechRingPlanV1 = Readonly<{ target: number; durationMs: number; delayMs: number }>;
export type SpeechRingEstimateV1 = Readonly<{
  /** Сколько голос молчит после onStart (выучено по первой границе слова); 0 — ещё не выучено. */
  leadMs: number;
  leadKnown: boolean;
  /** Слышимая часть фразы. */
  audibleMs: number;
  source: "measured" | "default";
}>;
export type SpeechRingSampleV1 = Readonly<{ totalMs: number; leadMs: number | null }>;
export type SpeechRingRecordV1 = Readonly<{ lead: boolean; audible: boolean }>;
export type SpeechRingFirstWordReasonV1 = "voice_earlier" | "anchor_unlearned_lead" | "on_plan" | "not_first_word";

const clamp01 = (value: number): number => (Number.isFinite(value) ? Math.min(1, Math.max(0, value)) : 0);
const safeRate = (rate: number | undefined): number => (typeof rate === "number" && Number.isFinite(rate) && rate > 0.1 ? rate : 1);
const rateKey = (rate: number | undefined): string => safeRate(rate).toFixed(2);
const spokenChars = (text: string): number => text.trim().length;
const ema = (previous: number | undefined, sample: number): number =>
  previous === undefined ? sample : previous * (1 - EMA_WEIGHT) + sample * EMA_WEIGHT;

/** Память замеров на время работы приложения: задержка голоса и мс на символ слышимой части для каждой скорости. */
export type SpeechRingCalibrationV1 = Readonly<{
  estimate: (text: string, rate: number | undefined) => SpeechRingEstimateV1;
  record: (text: string, rate: number | undefined, sample: SpeechRingSampleV1) => SpeechRingRecordV1;
}>;

export function createSpeechRingCalibrationV1(): SpeechRingCalibrationV1 {
  const byRate = new Map<string, Readonly<{ msPerChar?: number; leadMs?: number }>>();
  return {
    estimate(text, rate) {
      const memory = byRate.get(rateKey(rate));
      const chars = Math.max(1, spokenChars(text));
      const msPerChar = memory?.msPerChar ?? SPEECH_RING_DEFAULT_MS_PER_CHAR_V1 / safeRate(rate);
      return {
        leadMs: Math.round(memory?.leadMs ?? 0),
        leadKnown: memory?.leadMs !== undefined,
        audibleMs: Math.round(msPerChar * chars),
        source: memory?.msPerChar !== undefined ? "measured" : "default",
      };
    },
    record(text, rate, sample) {
      const key = rateKey(rate);
      const memory = byRate.get(key) ?? {};
      const chars = spokenChars(text);
      const totalOk = Number.isFinite(sample.totalMs) && sample.totalMs >= MIN_MEASURED_MS && sample.totalMs <= MAX_MEASURED_MS;
      const leadOk = totalOk
        && sample.leadMs !== null
        && Number.isFinite(sample.leadMs)
        && sample.leadMs >= 0
        && sample.leadMs <= MAX_LEAD_MS
        && sample.leadMs < sample.totalMs;
      const leadMs = leadOk ? ema(memory.leadMs, sample.leadMs as number) : memory.leadMs;
      // Слышимая часть — длина минус задержка ЭТОГО же запуска (границы не было — минус выученная): среднее линейно, поэтому
      // «задержка + слышимая часть» в точности идёт за сглаженной длиной onStart→onDone (±20 мс), хоть сама граница и пляшет (±90 мс).
      const audibleMs = sample.totalMs - (leadOk ? (sample.leadMs as number) : (memory.leadMs ?? 0));
      const audibleOk = totalOk && chars >= 2 && audibleMs > 0;
      byRate.set(key, {
        leadMs,
        msPerChar: audibleOk ? ema(memory.msPerChar, audibleMs / chars) : memory.msPerChar,
      });
      return { lead: leadOk, audible: audibleOk };
    },
  };
}

/** Общие замеры на время работы приложения: голос и скорость у человека одни и те же во всех заданиях. */
export const SPEECH_RING_CALIBRATION_V1 = createSpeechRingCalibrationV1();

/**
 * Путь кольца к HOLD так, чтобы полным оно стало к endAtMs: с места current в момент elapsedMs скорость постоянная.
 * Кольцо уже у HOLD или конец прошёл — плана нет (ждём onDone).
 */
export function speechRingTowardEndPlanV1(input: Readonly<{ current: number; elapsedMs: number; endAtMs: number }>): SpeechRingPlanV1 | null {
  const current = clamp01(input.current);
  const leftMs = input.endAtMs - input.elapsedMs;
  if (current >= SPEECH_RING_HOLD_V1 || !Number.isFinite(leftMs) || leftMs <= 0) return null;
  const share = (SPEECH_RING_HOLD_V1 - current) / (1 - current);
  return { target: SPEECH_RING_HOLD_V1, durationMs: Math.max(16, Math.round(share * leftMs)), delayMs: 0 };
}

/** Голос начал (onStart): подождать выученную задержку и идти к HOLD — полным кольцо станет к ожидаемому концу речи. */
export function speechRingStartPlanV1(estimate: SpeechRingEstimateV1): SpeechRingPlanV1 {
  return {
    target: SPEECH_RING_HOLD_V1,
    durationMs: Math.max(1, Math.round(estimate.audibleMs * SPEECH_RING_HOLD_V1)),
    delayMs: estimate.leadKnown ? Math.max(0, estimate.leadMs) : 0,
  };
}

/**
 * Первая граница слова = звук пошёл.
 *  - кольцо ещё ждёт выученную задержку → старт сейчас, конец (задержка + слышимая часть) не сдвигается;
 *  - задержка не выучена (кольцо шло от onStart) → перестроиться от звука: полное — через слышимую часть;
 *  - задержка выучена и кольцо уже идёт → план не трогаем: конец по onStart точнее, чем пляшущая граница.
 */
export function speechRingFirstWordPlanV1(input: Readonly<{
  estimate: SpeechRingEstimateV1;
  elapsedMs: number;
  current: number;
  charIndex: number;
  textLength: number;
}>): Readonly<{ plan: SpeechRingPlanV1 | null; reason: SpeechRingFirstWordReasonV1 }> {
  if (input.textLength > 0 && input.charIndex / input.textLength > FIRST_WORD_MAX_SHARE) {
    return { plan: null, reason: "not_first_word" };
  }
  const { estimate } = input;
  if (estimate.leadKnown && input.elapsedMs < estimate.leadMs) {
    return {
      plan: speechRingTowardEndPlanV1({ current: 0, elapsedMs: input.elapsedMs, endAtMs: estimate.leadMs + estimate.audibleMs }),
      reason: "voice_earlier",
    };
  }
  if (!estimate.leadKnown) {
    return {
      plan: speechRingTowardEndPlanV1({ current: input.current, elapsedMs: input.elapsedMs, endAtMs: input.elapsedMs + estimate.audibleMs }),
      reason: "anchor_unlearned_lead",
    };
  }
  return { plan: null, reason: "on_plan" };
}

/** Голос закончил: плавно до конца, 60–150 мс — чем меньше осталось, тем короче. */
export function speechRingDonePlanV1(current: number): SpeechRingPlanV1 {
  const rest = 1 - clamp01(current);
  if (rest <= 0) return { target: 1, durationMs: 0, delayMs: 0 };
  const share = Math.min(1, rest / (1 - SPEECH_RING_HOLD_V1 + 0.15));
  return {
    target: 1,
    durationMs: Math.round(SPEECH_RING_FINISH_MIN_MS_V1 + (SPEECH_RING_FINISH_MAX_MS_V1 - SPEECH_RING_FINISH_MIN_MS_V1) * share),
    delayMs: 0,
  };
}
