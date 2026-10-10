import fs from "fs";
import path from "path";

const ROOT = path.resolve(__dirname, "..");

function source(relativePath: string): string {
  return fs.readFileSync(path.join(ROOT, relativePath), "utf8");
}

// зачем (11.10): окно «2600 знаков после маркера» перестало вмещать эффект — PM-229 добавил в catch логи, а
// трассы [MIC]/[SPEAK-FOCUS] легли в его начало, и restoreLoudPlaybackMode в SpeakingPanel уехал на 2804-й знак.
// Берём ровно тело эффекта: от маркера до его массива зависимостей. Гарантии те же, без порога длины.
function lifecycleEffect(text: string): string {
  const start = text.indexOf("// Speech capture lifecycle invariant:");
  if (start < 0) return "";
  const depsStart = text.indexOf("}, [runtimeActive", start);
  return text.slice(start, depsStart > start ? depsStart : start + 2600);
}

const CAPTURE_OWNERS = [
  "components/onboarding_aha/SpeechBeat.tsx",
  "components/learning-v2-lab/kimi/use_voice_capture.ts",
  "components/SpeakingPanel.tsx",
  "app/ai_dialog_session.tsx",
] as const;

describe("speech capture runtime lifecycle contract", () => {
  test.each(CAPTURE_OWNERS)(
    "%s owns capture through navigation focus and AppState",
    (relativePath) => {
      const text = source(relativePath);

      expect(text).toContain("useRuntimeActive");
      expect(text).toMatch(/const\s+\w*runtimeActive\s*=\s*useRuntimeActive\(/);
      expect(text).toContain("if (runtimeActive) return;");
    },
  );

  test.each(CAPTURE_OWNERS)(
    "%s invalidates pending capture starts when runtime becomes inactive",
    (relativePath) => {
      const text = source(relativePath);
      const lifecycleStart = text.indexOf(
        "// Speech capture lifecycle invariant:",
      );

      expect(lifecycleStart).toBeGreaterThanOrEqual(0);
      const lifecycle = lifecycleEffect(text);
      expect(lifecycle).toMatch(
        /(?:generation|attempt).*Ref\.current\s*\+=\s*1/i,
      );
      expect(lifecycle).toMatch(/(?:press|hold).*Ref\.current\s*=\s*false/i);
    },
  );

  test.each(CAPTURE_OWNERS)(
    "%s tears native capture down without auto-resume",
    (relativePath) => {
      const text = source(relativePath);
      const lifecycle = lifecycleEffect(text);

      expect(lifecycle).toMatch(/(?:cleanup|remove).*Listener/i);
      expect(lifecycle).toMatch(/(?:abort|cancel)\(/);
      if (/setTimeout\(/.test(text)) {
        expect(lifecycle).toMatch(/clear[A-Za-z]*(?:Watchdog|Timer|Advance)/);
      }
      // зачем (11.10): громкий режим теперь возвращает освобождение аренды записи (audio_runtime_arbiter: revoke →
      // lease.release). В SpeechBeat и лаборатории это releaseRecording(), в SpeakingPanel — restoreLoudPlaybackMode().
      expect(lifecycle).toMatch(/restoreLoudPlayback\w*\(\)|releaseRecording\(\)/);
      expect(lifecycle).not.toMatch(
        /if\s*\(runtimeActive\)[\s\S]{0,300}(?:\.start\(|startListening\(|startHold\()/,
      );
    },
  );

  test("capture owners no longer use the AppState-only hook", () => {
    expect(source("components/SpeakingPanel.tsx")).not.toContain(
      "useAppRuntimeActive",
    );
    expect(source("app/ai_dialog_session.tsx")).not.toContain(
      "useAppRuntimeActive",
    );
  });

  test.each([
    "components/SpeakingPanel.tsx",
    "components/onboarding_aha/SpeechBeat.tsx",
  ])(
    "%s invalidates delayed raw-player creation during teardown",
    (relativePath) => {
      const text = source(relativePath);
      const lifecycle = lifecycleEffect(text);
      const replayStart = text.indexOf("const playMyRecording");
      const replay = text.slice(replayStart, replayStart + 1800);

      expect(lifecycle).toMatch(
        /playback(?:Token|Generation)Ref\.current\s*\+=\s*1/,
      );
      expect(replay).toMatch(
        // зачем (11.10): условие стало многострочным и содержит `claim?.isCurrent()` — `[^)]*` спотыкался о его скобку,
        // хотя проверка ДО создания плеера на месте. Ищем ту же проверку в пределах условия перед createAudioPlayer.
        /if \([\s\S]{0,240}(?:mountedRef|runtimeActiveRef|playback(?:Token|Generation)Ref)\.current[\s\S]{0,300}createAudioPlayer/,
      );
      expect(replay).toMatch(
        /createAudioPlayer[\s\S]{0,300}(?:\.release\(\)|safeCall)/,
      );
    },
  );
});
