import { mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { spawnSync } from "node:child_process";

describe("Lesson 1 exact real-session mock", () => {
  it("projects only the locked plus current authoring range without QA labels", () => {
    const outputDir = mkdtempSync(join(tmpdir(), "phraseman-real-session-mock-"));
    const htmlPath = join(outputDir, "real.html");
    const dataPath = join(outputDir, "real-data.js");
    const result = spawnSync(
      process.execPath,
      [
        resolve("scripts/build_learning_v2_lesson1_real_session_mock.mjs"),
        "--from",
        "1",
        "--to",
        "11",
        "--output",
        htmlPath,
        "--data-output",
        dataPath,
      ],
      { cwd: resolve("."), encoding: "utf8" },
    );

    expect(result.status).toBe(0);
    const raw = readFileSync(dataPath, "utf8");
    const json = raw
      .replace(/^window\.__LEARNING_V2_REAL_SESSION_DATA__=/u, "")
      .replace(/;\s*$/u, "");
    const data = JSON.parse(json) as {
      sessions: readonly {
        kind: string;
        interactionProfile: 'standard' | 'rapid' | 'voice_heavy';
        intro: readonly unknown[];
        practice: readonly {
          family: string;
          inputMode: string;
          promptByLocale: Readonly<Record<string, string>>;
          responseOptionsByLocale: Readonly<
            Record<string, readonly { responseId: string; text: string }[]>
          >;
          responseFeedbackById: Readonly<
            Record<string, Readonly<Record<string, string>>>
          >;
        }[];
      }[];
    };
    expect(data.sessions).toHaveLength(11);
    const families = new Set<string>();
    for (const session of data.sessions) {
      expect(session.intro).toHaveLength(3);
      const expectedPracticeCount =
        session.interactionProfile === 'rapid'
          ? 17
          : session.interactionProfile === 'voice_heavy'
            ? 9
            : 12;
      expect(session.practice).toHaveLength(expectedPracticeCount);
      for (const task of session.practice) {
        families.add(task.family);
        expect(task.promptByLocale.ru.length).toBeGreaterThan(0);
        if (task.inputMode === "scripted_speech") {
          expect(task.responseOptionsByLocale.ru).toHaveLength(0);
        } else {
          expect(task.responseOptionsByLocale.ru.length).toBeGreaterThan(0);
          const wrongOptions = task.responseOptionsByLocale.ru.filter(
            (option) => option.responseId.includes(':wrong'),
          );
          wrongOptions.forEach((option) => {
            expect(task.responseFeedbackById[option.responseId]?.ru).toContain(
              option.text,
            );
            expect(Object.keys(task.responseFeedbackById[option.responseId] ?? {})).toHaveLength(8);
          });
        }
      }
    }
    expect([...families].sort()).toEqual([
      "context_gap_grammar",
      "listen_build_dictation",
      "listen_choose",
      "phrase_builder",
      "scripted_repeat_compare",
      "sound_contrast",
      "speed_match",
    ]);
    const html = readFileSync(htmlPath, "utf8");
    expect(html).toContain("Все созданные материалы");
    expect(html).not.toContain("Аудирование: выбор");
    expect(html).not.toContain("Быстрое сопоставление");
    expect(html).not.toContain("task-meta");
    expect(html).not.toContain("promptNovelty");
  });
});
