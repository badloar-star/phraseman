import { readFileSync } from "node:fs";
import { join } from "node:path";
import { adaptLearningV2DirectSessionIntroV1 } from "../app/learning_v2_direct_session_intro_adapter_v1";
import {
  getLearningV2CourseSessionAuxiliaryEntryV1,
  getLearningV2CourseSessionDeviceRunSummaryV1,
  getLearningV2CourseSessionIntroPageV1,
} from "../modules/learning-v2/runtime/course_session_device_run_v1";

jest.mock("../modules/learning-v2/runtime/course_session_device_run_v1", () => ({
  getLearningV2CourseSessionAuxiliaryEntryV1: jest.fn(),
  getLearningV2CourseSessionDeviceRunSummaryV1: jest.fn(),
  getLearningV2CourseSessionIntroPageV1: jest.fn(),
}));

const source = (path: string) =>
  readFileSync(join(__dirname, "..", path), "utf8");

describe("Learning V2 direct intro adapter", () => {
  test("preserves supplied intro run order, whitespace, punctuation and semantics", () => {
    const locales = ["ru", "uk", "es", "pt-BR", "vi", "id", "tr", "pl"] as const;
    const localized = <T>(factory: (locale: (typeof locales)[number]) => T) =>
      Object.fromEntries(locales.map((locale) => [locale, factory(locale)]));
    jest.mocked(getLearningV2CourseSessionDeviceRunSummaryV1).mockReturnValue({
      lessonOrdinal: 1,
    } as never);
    jest.mocked(getLearningV2CourseSessionIntroPageV1).mockImplementation(
      (_run, pageOrdinal) => ({
        pageOrdinal,
        pageId: `page-${pageOrdinal}`,
        kind: pageOrdinal === 2 ? "formula" : "concept",
        titleByLocale: localized((locale) => `Title ${pageOrdinal} (${locale})`),
        bodyByLocale: localized(
          (locale) => `Keep  ${locale}, punctuation! exactly.`,
        ),
        bodyRunsByLocale: localized((locale) => [
          { text: "Keep  ", semantic: "explanation" },
          { text: `${locale}, punctuation!`, semantic: "targetCorrect" },
          { text: " exactly.", semantic: "nativeGloss" },
        ]),
        question: {
          interactionId: `interaction-${pageOrdinal}`,
          promptByLocale: localized((locale) => `Prompt ${locale}`),
          choicesByLocale: localized(() => ["A", "B"]),
        },
      }) as never,
    );
    jest.mocked(getLearningV2CourseSessionAuxiliaryEntryV1).mockReturnValue({
      secondErrorExplanationByLocale: localized(
        (locale) => `Explanation ${locale}`,
      ),
    } as never);

    const screens = adaptLearningV2DirectSessionIntroV1({} as never);

    expect(screens[0].linesRU?.[0].parts).toEqual([
      { text: "Keep  ", semantic: "explanation" },
      { text: "ru, punctuation!", semantic: "targetCorrect" },
      { text: " exactly.", semantic: "nativeGloss" },
    ]);
    expect(screens[0].linesTr?.[0].parts).toEqual([
      { text: "Keep  ", semantic: "explanation" },
      { text: "tr, punctuation!", semantic: "targetCorrect" },
      { text: " exactly.", semantic: "nativeGloss" },
    ]);
  });

  test("marks a legacy unsplit body as one explanation part", () => {
    const locales = ["ru", "uk", "es", "pt-BR", "vi", "id", "tr", "pl"] as const;
    const localized = <T>(value: T) =>
      Object.fromEntries(locales.map((locale) => [locale, value]));
    jest.mocked(getLearningV2CourseSessionDeviceRunSummaryV1).mockReturnValue({
      lessonOrdinal: 1,
    } as never);
    jest.mocked(getLearningV2CourseSessionIntroPageV1).mockImplementation(
      (_run, pageOrdinal) => ({
        pageOrdinal,
        pageId: `legacy-page-${pageOrdinal}`,
        kind: "concept",
        titleByLocale: localized("Legacy title"),
        bodyByLocale: localized("Legacy body, unchanged."),
        question: {
          interactionId: `legacy-interaction-${pageOrdinal}`,
          promptByLocale: localized("Prompt"),
          choicesByLocale: localized(["A", "B"]),
        },
      }) as never,
    );
    jest.mocked(getLearningV2CourseSessionAuxiliaryEntryV1).mockReturnValue({
      secondErrorExplanationByLocale: localized("Explanation"),
    } as never);

    const screens = adaptLearningV2DirectSessionIntroV1({} as never);

    expect(screens[0].linesRU?.[0].parts).toEqual([
      { text: "Legacy body, unchanged.", semantic: "explanation" },
    ]);
  });

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
