/**
 * speech_ring_clock_v1 — кольцо кнопки звука идёт по реальной речи (владелец 22.10: «строго по длине аудио, без резкого
 * дозаполнения»). Сторож: до замеров — 72 мс на символ слышимой части; потом — выученные задержка голоса (onStart → первое слово)
 * и слышимая часть, сумма которых идёт за длиной onStart→onDone; первая граница слова — «звук пошёл»; до onDone кольцо не выше
 * 95 %; доведение по onDone — от 60 до 150 мс. Числа замера — из журнала [AUDIO-RING] Сверки 22.10 (эмулятор, «I am ready.»).
 */
import {
  SPEECH_RING_DEFAULT_MS_PER_CHAR_V1,
  SPEECH_RING_FINISH_MAX_MS_V1,
  SPEECH_RING_HOLD_V1,
  createSpeechRingCalibrationV1,
  speechRingDonePlanV1,
  speechRingFirstWordPlanV1,
  speechRingStartPlanV1,
  speechRingTowardEndPlanV1,
} from "../modules/learning-v2/runtime/speech_ring_clock_v1";

const PHRASE = "I am ready.";
// Сверка 22.10: длина onStart→onDone и первое слово (мс после onStart) четырёх полных запусков.
const EMULATOR_RUNS = [
  { totalMs: 1030, leadMs: 246 },
  { totalMs: 1071, leadMs: 329 },
  { totalMs: 1065, leadMs: 234 },
  { totalMs: 1060, leadMs: 412 },
] as const;

describe("оценка длины и замеры", () => {
  it("до замеров — 72 мс на символ, задержка голоса не выучена; медленный голос — дольше", () => {
    const calibration = createSpeechRingCalibrationV1();
    expect(calibration.estimate(PHRASE, 1)).toEqual({
      leadMs: 0,
      leadKnown: false,
      audibleMs: 11 * SPEECH_RING_DEFAULT_MS_PER_CHAR_V1,
      source: "default",
    });
    expect(calibration.estimate(PHRASE, 0.72).audibleMs).toBe(Math.round((SPEECH_RING_DEFAULT_MS_PER_CHAR_V1 / 0.72) * 11));
  });

  it("журнал Сверки: задержка + слышимая часть идут за длиной onStart→onDone, хоть первое слово и пляшет", () => {
    const calibration = createSpeechRingCalibrationV1();
    for (const run of EMULATOR_RUNS) expect(calibration.record(PHRASE, 1, run)).toEqual({ lead: true, audible: true });
    const estimate = calibration.estimate(PHRASE, 1);
    expect(estimate).toMatchObject({ leadKnown: true, source: "measured" });
    // скользящая длина четырёх запусков ≈ 1059 мс; ошибка суммы — округление
    expect(Math.abs(estimate.leadMs + estimate.audibleMs - 1059)).toBeLessThanOrEqual(3);
    expect(estimate.leadMs).toBeGreaterThan(200);
  });

  it("запуск без границ слов: слышимая часть = длина минус выученная задержка, задержка не меняется", () => {
    const calibration = createSpeechRingCalibrationV1();
    calibration.record(PHRASE, 1, { totalMs: 1000, leadMs: 300 });
    expect(calibration.record(PHRASE, 1, { totalMs: 1100, leadMs: null })).toEqual({ lead: false, audible: true });
    const estimate = calibration.estimate(PHRASE, 1);
    expect(estimate.leadMs).toBe(300);
    expect(Math.abs(estimate.leadMs + estimate.audibleMs - 1050)).toBeLessThanOrEqual(1);
  });

  it("другая скорость голоса — своя память; сбойные замеры не портят оценку", () => {
    const calibration = createSpeechRingCalibrationV1();
    calibration.record(PHRASE, 1, { totalMs: 1000, leadMs: 300 });
    expect(calibration.estimate(PHRASE, 0.72).source).toBe("default");
    const before = calibration.estimate(PHRASE, 1);
    expect(calibration.record(PHRASE, 1, { totalMs: 100, leadMs: 50 })).toEqual({ lead: false, audible: false });
    expect(calibration.record(PHRASE, 1, { totalMs: 45_000, leadMs: 300 })).toEqual({ lead: false, audible: false });
    expect(calibration.record(PHRASE, 1, { totalMs: 900, leadMs: 950 }).lead).toBe(false);
    expect(calibration.record(PHRASE, 1, { totalMs: 900, leadMs: -5 }).lead).toBe(false);
    expect(calibration.record("a", 1, { totalMs: 900, leadMs: null }).audible).toBe(false);
    expect(calibration.estimate(PHRASE, 1).leadMs).toBe(before.leadMs);
  });
});

describe("планы кольца", () => {
  it("старт: ждать выученную задержку и идти к 95 % за 95 % слышимой части; не выучена — сразу", () => {
    expect(speechRingStartPlanV1({ leadMs: 0, leadKnown: false, audibleMs: 800, source: "default" }))
      .toEqual({ target: SPEECH_RING_HOLD_V1, durationMs: 760, delayMs: 0 });
    expect(speechRingStartPlanV1({ leadMs: 280, leadKnown: true, audibleMs: 760, source: "measured" }))
      .toEqual({ target: SPEECH_RING_HOLD_V1, durationMs: 722, delayMs: 280 });
  });

  it("путь к концу: постоянная скорость с текущего места; у 95 % или после конца — плана нет", () => {
    expect(speechRingTowardEndPlanV1({ current: 0, elapsedMs: 200, endAtMs: 1200 })).toEqual({ target: SPEECH_RING_HOLD_V1, durationMs: 950, delayMs: 0 });
    expect(speechRingTowardEndPlanV1({ current: 0.5, elapsedMs: 200, endAtMs: 1200 })?.durationMs).toBe(900);
    expect(speechRingTowardEndPlanV1({ current: SPEECH_RING_HOLD_V1, elapsedMs: 200, endAtMs: 1200 })).toBeNull();
    expect(speechRingTowardEndPlanV1({ current: 0.4, elapsedMs: 1300, endAtMs: 1200 })).toBeNull();
  });

  it("первое слово раньше выученной задержки — старт сейчас, конец не сдвигается", () => {
    const decision = speechRingFirstWordPlanV1({
      estimate: { leadMs: 300, leadKnown: true, audibleMs: 760, source: "measured" },
      elapsedMs: 234,
      current: 0,
      charIndex: 0,
      textLength: 11,
    });
    expect(decision.reason).toBe("voice_earlier");
    expect(decision.plan).toEqual({ target: SPEECH_RING_HOLD_V1, durationMs: Math.round(0.95 * (1060 - 234)), delayMs: 0 });
  });

  it("задержка не выучена — кольцо перестраивается от звука с текущего места (журнал: 0,208 через 246 мс)", () => {
    const decision = speechRingFirstWordPlanV1({
      estimate: { leadMs: 0, leadKnown: false, audibleMs: 792, source: "default" },
      elapsedMs: 246,
      current: 0.208,
      charIndex: 0,
      textLength: 11,
    });
    expect(decision.reason).toBe("anchor_unlearned_lead");
    expect(decision.plan?.durationMs).toBe(Math.round(((0.95 - 0.208) / (1 - 0.208)) * 792));
  });

  it("задержка выучена и кольцо уже идёт — план не трогаем; поздняя граница не считается первым словом", () => {
    const estimate = { leadMs: 300, leadKnown: true, audibleMs: 760, source: "measured" } as const;
    expect(speechRingFirstWordPlanV1({ estimate, elapsedMs: 329, current: 0.04, charIndex: 0, textLength: 11 }))
      .toEqual({ plan: null, reason: "on_plan" });
    expect(speechRingFirstWordPlanV1({ estimate, elapsedMs: 374, current: 0.1, charIndex: 5, textLength: 11 }))
      .toEqual({ plan: null, reason: "not_first_word" });
  });

  it("onDone: плавное доведение 60–150 мс, чем меньше осталось — тем короче; полное — сразу", () => {
    const fromHold = speechRingDonePlanV1(SPEECH_RING_HOLD_V1);
    const fromHalf = speechRingDonePlanV1(0.5);
    expect(fromHold.target).toBe(1);
    expect(fromHold.durationMs).toBeGreaterThanOrEqual(60);
    expect(fromHold.durationMs).toBeLessThan(fromHalf.durationMs);
    expect(fromHalf.durationMs).toBe(SPEECH_RING_FINISH_MAX_MS_V1);
    expect(speechRingDonePlanV1(1)).toEqual({ target: 1, durationMs: 0, delayMs: 0 });
  });
});
