import fs from "node:fs";
import path from "node:path";

jest.mock("../app/config", () => ({
  IS_EXPO_GO: true,
  CLOUD_SYNC_ENABLED: false,
}));
jest.mock("../app/debug-logger", () => ({ DebugLogger: { error: jest.fn() } }));
jest.mock("../app/events", () => ({ emitAppEvent: jest.fn() }));
jest.mock("../app/premium_guard", () => ({
  getVerifiedPremiumStatus: jest.fn(async () => false),
}));
jest.mock("../app/lifetime_profile_stats", () => ({
  bumpLifetimeShardsEarned: jest.fn(),
  bumpLifetimeShardsSpent: jest.fn(),
}));

describe("reported user data integrity", () => {
  it("keeps a pronunciation-only override separate from visible lesson text", () => {
    const audioSource = fs.readFileSync(
      path.join(__dirname, "..", "hooks", "use-audio.ts"),
      "utf8",
    );
    const lessonSource = fs.readFileSync(
      path.join(__dirname, "..", "app", "lesson1.tsx"),
      "utf8",
    );
    expect(audioSource).toContain("speechText?: string");
    expect(lessonSource).toContain(
      "return line.replace(/\\bread\\b/i, 'reed');",
    );
    expect(lessonSource).toContain(
      "speechText: pronunciationOverrideForLessonPhrase(line)",
    );
  });

  it("uses the natural birthday sentence consistently in lesson content", () => {
    const source = fs.readFileSync(
      path.join(__dirname, "..", "app", "lesson_data_1_8_phrases_source.ts"),
      "utf8",
    );
    const generated = fs.readFileSync(
      path.join(__dirname, "..", "app", "lesson_data_1_8_phrases_es.gen.ts"),
      "utf8",
    );
    const theory = fs.readFileSync(
      path.join(__dirname, "..", "components", "lesson_help_theory_data.tsx"),
      "utf8",
    );
    const traps = fs.readFileSync(
      path.join(__dirname, "..", "app", "error_traps", "error_traps_1_8.ts"),
      "utf8",
    );
    expect(source).toContain("english: 'His birthday is in October'");
    expect(generated).toContain("english: 'His birthday is in October'");
    expect(theory).toContain("His birthday is in October");
    const trapStart = traps.indexOf("His birthday is in October");
    const trapEnd = traps.indexOf("// 35:", trapStart);
    expect(trapStart).toBeGreaterThanOrEqual(0);
    expect(trapEnd).toBeGreaterThan(trapStart);
    expect(traps.slice(trapStart, trapEnd)).not.toContain("has a birthday");

    const sourcePhraseStart = source.indexOf("id: 'lesson8_phrase_35'");
    const sourcePhraseEnd = source.indexOf(
      "id: 'lesson8_phrase_36'",
      sourcePhraseStart,
    );
    const sourcePhrase = source.slice(sourcePhraseStart, sourcePhraseEnd);
    expect(sourcePhrase).toContain("{ text: 'His', correct: 'His'");
    expect(sourcePhrase).toContain("{ text: 'birthday', correct: 'birthday'");
    expect(sourcePhrase).toContain("{ text: 'is', correct: 'is'");
    expect(sourcePhrase).not.toContain("{ text: 'He', correct: 'He'");
    expect(sourcePhrase).not.toContain("{ text: 'has', correct: 'has'");

    const generatedPhraseStart = generated.indexOf("id: 'lesson8_phrase_35'");
    const generatedPhraseEnd = generated.indexOf(
      "id: 'lesson8_phrase_36'",
      generatedPhraseStart,
    );
    const generatedPhrase = generated.slice(
      generatedPhraseStart,
      generatedPhraseEnd,
    );
    expect(generatedPhrase).toContain("{ text: 'His', correct: 'His'");
    expect(generatedPhrase).toContain(
      "{ text: 'birthday', correct: 'birthday'",
    );
    expect(generatedPhrase).toContain("{ text: 'is', correct: 'is'");
    expect(generatedPhrase).not.toContain("{ text: 'He', correct: 'He'");
    expect(generatedPhrase).not.toContain("{ text: 'has', correct: 'has'");
  });

  it("keeps every published public draft free of internal diagnostics", () => {
    // зачем: единственная живая админка — admin/v2/legacy.html (AGENTS.md);
    // admin/index.html — заморозили как редирект-заглушку, PREPARED_REPORT_REPLIES там больше нет.
    const adminHtml = fs.readFileSync(
      path.join(__dirname, "..", "admin", "legacy.html"),
      "utf8",
    );
    const marker = "PREPARED_REPORT_REPLIES = {";
    const start = adminHtml.indexOf(marker);
    const end = adminHtml.indexOf("\n  };", start);
    expect(start).toBeGreaterThanOrEqual(0);
    expect(end).toBeGreaterThan(start);
    const prepared = Function(
      `return (${adminHtml.slice(start + marker.length - 1, end + 4)});`,
    )() as Record<string, { body: string }>;
    const replies = Object.values(prepared);
    expect(replies.length).toBeGreaterThanOrEqual(48);
    for (const row of replies) {
      expect(row.body).not.toMatch(
        /dataId|contentId|TextInput|watchdog|escape-path|device-repro|report №|забери 0 оскол/,
      );
      expect(row.body).not.toMatch(/\.\s*\./);
    }
  });
});
