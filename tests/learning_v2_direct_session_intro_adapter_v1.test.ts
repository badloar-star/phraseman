import { readFileSync } from "node:fs";
import { join } from "node:path";

const source = (path: string) =>
  readFileSync(join(__dirname, "..", path), "utf8");

describe("Learning V2 direct intro adapter", () => {
  test("routes active intro choices through the local device evaluator", () => {
    const intro = source("app/learning_v2_session_intro.tsx");
    const adapter = source(
      "app/learning_v2_direct_session_intro_adapter_v1.ts",
    );
    expect(intro).toContain("evaluateChoice?:");
    expect(intro).toContain("evaluateChoice({");
    expect(intro).toContain(
      "resolveSecondWrongExplanation?.(question.questionId)",
    );
    expect(adapter).toContain("getLearningV2CourseSessionIntroPageV1");
    expect(adapter).toContain("getLearningV2CourseSessionAuxiliaryEntryV1");
    expect(adapter).not.toMatch(/acceptedResponse|correctResponse|answerKey/u);
    expect(adapter).not.toMatch(/httpsCallable|fetch\(|firebase|AsyncStorage/u);
  });
});
