// зачем (владелец 22.10: «Кружочек должен заполняться строго по длине аудио, а не сначала медленно, а потом аудио закончилось —
// и он резко дозаполнился»): сторож проводки кольца кнопки фразы. Кольцо ведёт сама речь голоса телефона: нажатие сразу
// откатывает кольцо к нулю; onStart — ждать выученную задержку голоса; первая граница слова — «звук пошёл», остальные только
// в журнал; любой конец (done / stopped / error / сторож / отмена) — плавное доведение; ход живёт на UI-потоке; каждый шаг и каждый
// ранний выход пишет [AUDIO-RING]. Числа планов — в learning_v2_speech_ring_clock_v1.test.ts.
// Журнал Сверки 22.10 поймал прыжки кольца: withTiming к той же цели наследует старт прежней анимации («continuity» Reanimated) —
// поэтому каждая новая анимация кольца идёт только после сброса прежней (сторож ниже).
import { readFileSync } from "node:fs";
import { join } from "node:path";

const root = join(__dirname, "..");
const read = (...parts: string[]) => readFileSync(join(root, ...parts), "utf8");
const player = read("app", "learning_v2_direct_session_player_v1.tsx");
const audio = read("hooks", "use-audio.ts");
const modes = {
  listenChoose: read("modules", "learning-v2", "modes", "listen_choose_mode_v1.tsx"),
  dictation: read("modules", "learning-v2", "modes", "listen_build_dictation_mode_v1.tsx"),
};
const ringBlock = player.slice(
  player.indexOf("const startSpeechRing = useCallback("),
  player.indexOf("const speakPreviewText = useCallback("),
);

describe("Learning V2 reference phrase ring follows real speech", () => {
  test("the player owns one UI-thread ring value and hands it to the routed modes", () => {
    expect(player).toContain("const referenceSpeechProgress = useSharedValue(0);");
    expect(player).toContain("referenceSpeechProgress={referenceSpeechProgress}");
    expect(ringBlock.length).toBeGreaterThan(0);
  });

  test("every new ring animation starts only after the previous one is reset (no inherited start)", () => {
    const lines = player.split("\n");
    const starts = lines
      .map((line, index) => ({ line, index }))
      .filter(({ line }) => line.includes("referenceSpeechProgress.value = with"));
    expect(starts.length).toBeGreaterThanOrEqual(4);
    for (const { index } of starts) {
      let at = index - 1;
      while (at >= 0 && (lines[at].trim().startsWith("//") || lines[at].trim() === "")) at -= 1;
      const previous = lines[at] ?? "";
      expect(
        previous.includes("cancelAnimation(referenceSpeechProgress);") || previous.includes("referenceSpeechProgress.value = 0;"),
      ).toBe(true);
    }
  });

  test("a tap answers at once; the voice start waits for the learned voice delay; progress ignores reduce-motion", () => {
    expect(player).toContain("referenceSpeechProgress.value = withTiming(0, { duration: SPEECH_RING_REWIND_MS, easing: Easing.out(Easing.cubic) });");
    expect(ringBlock).toContain("const plan = speechRingStartPlanV1(estimate);");
    expect(ringBlock).toMatch(/referenceSpeechProgress\.value = withDelay\(\s*plan\.delayMs,/u);
    expect(ringBlock).toContain("reduceMotion: ReduceMotion.Never");
    expect(ringBlock).toContain("referenceSpeechProgress.value = withTiming(plan.target, { duration: plan.durationMs, easing: Easing.out(Easing.cubic) });");
  });

  test("the first word anchors the ring to the sound; later word boundaries are only logged", () => {
    expect(ringBlock).toContain("const decision = speechRingFirstWordPlanV1({");
    expect(ringBlock).toContain('firstWordAtMs: decision.reason === "not_first_word" ? null : elapsedMs,');
    expect(ringBlock).toContain('decision: "log_only"');
    expect(ringBlock).not.toContain("speechRingBoundaryPlanV1");
  });

  test("only the full reference phrase drives the ring", () => {
    expect(player).toMatch(/speakPreviewText\(\s*previewPracticeSpeechText,\s*`practice:\$\{practice\.interactionId\}`,\s*undefined,\s*true,/u);
    expect(player).toMatch(/speakPreviewText\(\s*previewPracticeSlowSpeechText,\s*`practice:\$\{practice\.interactionId\}:slow`,\s*0\.72,\s*\);/u);
    expect(player).toContain("(text: string | null | undefined, key: string, rate?: number, drivesRing = false) => {");
  });

  test("speech start, word boundaries and every ending move the ring of the same playback only", () => {
    expect(player).toContain("if (drivesRing) startSpeechRing(request.generation);");
    expect(player).toContain("? (event: SpeechRingBoundaryEventV1) => moveSpeechRing(request.generation, event)");
    for (const how of ["done", "stopped", "error", "watchdog"]) {
      expect(player).toContain(`if (drivesRing) endSpeechRing(request.generation, "${how}");`);
    }
    expect(player).toContain('if (ringRun) endSpeechRing(ringRun.generation, "cancelled");');
    expect(player).toContain('endSpeechRing(previousRing.generation, "superseded");');
    // поздний колбэк прежней фразы не трогает кольцо: проверка номера проигрыша на каждом шаге
    expect(player.match(/run\.generation !== generation/gu)?.length ?? 0).toBeGreaterThanOrEqual(3);
    // голос не заговорил — кольцо остаётся пустым (с нажатия оно откатывается к нулю)
    expect(ringBlock).toContain('decision: "stay_empty"');
  });

  test("a finished phrase teaches the clock its length and the voice delay", () => {
    expect(ringBlock).toContain("SPEECH_RING_CALIBRATION_V1.record(run.text, run.rate, { totalMs, leadMs: run.firstWordAtMs })");
    expect(ringBlock).toContain('how === "done" && totalMs !== null');
    expect(ringBlock).toContain("const plan = speechRingDonePlanV1(ringAtEnd);");
  });

  test("[AUDIO-RING] logs every step and every early exit", () => {
    expect(player).toContain('if (__DEV__) console.log("[AUDIO-RING]", JSON.stringify({ phase, ...payload }));');
    for (const phase of ["request", "superseded", "start", "start_skip", "boundary", "boundary_skip", "end", "end_skip"]) {
      expect(player).toContain(`logSpeechRing("${phase}"`);
    }
    for (const field of [
      "latencyMs", "leadMs", "leadKnown", "audibleMs", "source", "delayMs", "planMs", "spokenPct", "elapsedMs",
      "totalMs", "expectedMs", "errorPct", "firstWordMs", "boundaries", "ringAtEnd", "finishMs", "recordedLead", "recordedAudible",
    ]) {
      expect(ringBlock).toContain(field);
    }
  });

  test.each(Object.entries(modes))("%s shows the speech ring only after its own first playback", (_name, source) => {
    expect(source).toContain("if (speechProgress) return;");
    expect(source).toContain("const heard = useSharedValue(0);");
    expect(source).toContain("if (playing) heard.value = 1;");
    expect(source).toContain("(speechProgress ? (heard.value > 0 ? speechProgress.value : 0) : progress.value)");
    expect(source).toContain("speechProgress={props.referenceSpeechProgress ?? null}");
  });

  test("the audio hook forwards word boundaries with the spoken text length", () => {
    expect(audio).toContain("onBoundary?: (event: Readonly<{ charIndex: number; charLength: number; textLength: number }>) => void;");
    expect(audio).toContain("textLength: spokenText.length");
  });
});
