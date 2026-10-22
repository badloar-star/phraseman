// зачем (владелец 22.10: «Кружочек должен заполняться строго по длине аудио, а не сначала медленно, а потом аудио закончилось —
// и он резко дозаполнился»): сторож проводки кольца кнопки фразы. Кольцо ведёт сама речь голоса телефона: onStart — старт,
// граница слова — пересчёт темпа, любой конец (done / stopped / error / сторож / отмена) — плавное доведение; ход живёт на
// UI-потоке; каждый шаг и каждый ранний выход пишет [AUDIO-RING]. Числа планов — в learning_v2_speech_ring_clock_v1.test.ts.
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

describe("Learning V2 reference phrase ring follows real speech", () => {
  test("the player owns one UI-thread ring value and hands it to the routed modes", () => {
    expect(player).toContain("const referenceSpeechProgress = useSharedValue(0);");
    expect(player).toContain("referenceSpeechProgress={referenceSpeechProgress}");
    expect(player).toContain("referenceSpeechProgress.value = withTiming(plan.target, { duration: plan.durationMs, easing: Easing.linear });");
    expect(player).toContain("referenceSpeechProgress.value = withTiming(plan.target, { duration: plan.durationMs, easing: Easing.out(Easing.cubic) });");
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
  });

  test("a finished phrase is recorded for calibration; the finish never takes longer than the clock allows", () => {
    expect(player).toContain("SPEECH_RING_CALIBRATION_V1.record(run.text, run.rate, actualMs)");
    expect(player).toContain('how === "done" && actualMs !== null');
    expect(player).toContain("const plan = speechRingDonePlanV1(ringAtEnd);");
  });

  test("[AUDIO-RING] logs every step and every early exit", () => {
    expect(player).toContain('if (__DEV__) console.log("[AUDIO-RING]", JSON.stringify({ phase, ...payload }));');
    for (const phase of ["request", "superseded", "start", "start_skip", "boundary", "boundary_skip", "end", "end_skip"]) {
      expect(player).toContain(`logSpeechRing("${phase}"`);
    }
    const ringBlock = player.slice(
      player.indexOf("const startSpeechRing = useCallback("),
      player.indexOf("const speakPreviewText = useCallback("),
    );
    expect(ringBlock.length).toBeGreaterThan(0);
    for (const field of ["latencyMs", "estimateMs", "source", "actualMs", "errorPct", "boundaries", "ringAtEnd", "finishMs", "recorded", "spokenPct", "planMs"]) {
      expect(ringBlock).toContain(`${field}`);
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
