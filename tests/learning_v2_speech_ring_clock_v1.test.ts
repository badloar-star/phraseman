/**
 * speech_ring_clock_v1 — кольцо кнопки звука идёт по реальной речи (владелец 22.10: «строго по длине аудио, без резкого
 * дозаполнения»). Сторож: до замеров — оценка по словам с поправкой на скорость, после — по замеру этой скорости; граница слова
 * пересчитывает темп с текущего места; до onDone кольцо не уходит выше 95 %; доведение по onDone — от 60 до 150 мс.
 */
import {
  SPEECH_RING_FINISH_MAX_MS_V1,
  SPEECH_RING_HOLD_V1,
  createSpeechRingCalibrationV1,
  speechRingBoundaryPlanV1,
  speechRingDonePlanV1,
  speechRingStartPlanV1,
} from "../modules/learning-v2/runtime/speech_ring_clock_v1";
import { learningV2RingFillMsForPhraseV1 } from "../modules/learning-v2/modes/mode_motion_tokens_v1";

describe("оценка длины и замеры", () => {
  it("до замеров — прежняя оценка по словам, медленный голос — дольше", () => {
    const calibration = createSpeechRingCalibrationV1();
    const words = learningV2RingFillMsForPhraseV1("I am not cold.");
    expect(calibration.estimate("I am not cold.", 1)).toEqual({ ms: words, source: "words" });
    expect(calibration.estimate("I am not cold.", 0.72).ms).toBe(Math.round(words / 0.72));
  });

  it("после замера — мс на символ этой скорости; другая скорость — своя", () => {
    const calibration = createSpeechRingCalibrationV1();
    expect(calibration.record("I am here.", 1, 1000)).toBe(true);
    expect(calibration.estimate("We are together.", 1)).toEqual({ ms: Math.round((1000 / 10) * 16), source: "measured" });
    expect(calibration.estimate("We are together.", 0.72).source).toBe("words");
  });

  it("скользящее среднее; сбойные замеры не портят оценку", () => {
    const calibration = createSpeechRingCalibrationV1();
    calibration.record("abcdefghij", 1, 1000);
    calibration.record("abcdefghij", 1, 2000);
    expect(calibration.estimate("abcdefghij", 1).ms).toBe(1500);
    expect(calibration.record("abcdefghij", 1, 50)).toBe(false);
    expect(calibration.record("a", 1, 900)).toBe(false);
    expect(calibration.record("abcdefghij", 1, 45_000)).toBe(false);
    expect(calibration.estimate("abcdefghij", 1).ms).toBe(1500);
  });
});

describe("планы кольца", () => {
  it("старт: к 95 % за ожидаемое время", () => {
    expect(speechRingStartPlanV1(2000)).toEqual({ target: SPEECH_RING_HOLD_V1, durationMs: 1900 });
  });

  it("граница слова: голос быстрее оценки — кольцо ускоряется, медленнее — замедляется", () => {
    // половина текста сказана за 400 мс → вся речь ≈ 800 мс → до 95 % ещё 360 мс
    expect(speechRingBoundaryPlanV1({ charIndex: 10, textLength: 20, elapsedMs: 400, current: 0.3 })).toEqual({ target: SPEECH_RING_HOLD_V1, durationMs: 360 });
    // половина за 1500 мс → вся ≈ 3000 мс → ещё 1350 мс
    expect(speechRingBoundaryPlanV1({ charIndex: 10, textLength: 20, elapsedMs: 1500, current: 0.6 })).toEqual({ target: SPEECH_RING_HOLD_V1, durationMs: 1350 });
  });

  it("граница слова слишком рано, без длины или у 95 % — плана нет", () => {
    expect(speechRingBoundaryPlanV1({ charIndex: 1, textLength: 20, elapsedMs: 100, current: 0.05 })).toBeNull();
    expect(speechRingBoundaryPlanV1({ charIndex: 5, textLength: 0, elapsedMs: 100, current: 0.2 })).toBeNull();
    expect(speechRingBoundaryPlanV1({ charIndex: 15, textLength: 20, elapsedMs: 900, current: SPEECH_RING_HOLD_V1 })).toBeNull();
  });

  it("onDone: плавное доведение 60–150 мс, чем меньше осталось — тем короче; полное — сразу", () => {
    const fromHold = speechRingDonePlanV1(SPEECH_RING_HOLD_V1);
    const fromHalf = speechRingDonePlanV1(0.5);
    expect(fromHold.target).toBe(1);
    expect(fromHold.durationMs).toBeGreaterThanOrEqual(60);
    expect(fromHold.durationMs).toBeLessThan(fromHalf.durationMs);
    expect(fromHalf.durationMs).toBe(SPEECH_RING_FINISH_MAX_MS_V1);
    expect(speechRingDonePlanV1(1)).toEqual({ target: 1, durationMs: 0 });
  });
});
