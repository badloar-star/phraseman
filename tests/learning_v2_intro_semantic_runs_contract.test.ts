import {
  encodeLearningV2CourseSessionIntroChildV1,
  materializeLearningV2CourseSessionIntroChildV1,
  parseLearningV2CourseSessionIntroChildV1,
} from "../modules/learning-v2/runtime/course_session_client_children_v1";

const locales = ["ru", "uk", "es", "pt-BR", "vi", "id", "tr", "pl"] as const;

const localized = (prefix: string) =>
  Object.freeze(
    Object.fromEntries(
      locales.map((locale) => [locale, `${prefix} ${locale}`]),
    ),
  );

const bodyRunsByLocale = (
  ordinal: number,
  targetSemantic: "targetCorrect" | "targetWrong" = "targetCorrect",
) =>
  Object.freeze(
    Object.fromEntries(
      locales.map((locale) => [
        locale,
        Object.freeze([
          Object.freeze({ text: `Body ${ordinal} `, semantic: "explanation" }),
          Object.freeze({ text: locale, semantic: targetSemantic }),
        ]),
      ]),
    ),
  );

function introWithSemanticRuns(
  targetSemantic: "targetCorrect" | "targetWrong" = "targetCorrect",
) {
  return materializeLearningV2CourseSessionIntroChildV1({
    courseSessionId: "lesson-01:session:01",
    learningOutcomeByLocale: localized("Outcome") as never,
    pages: [1, 2, 3].map((ordinal) => ({
      pageOrdinal: ordinal as 1 | 2 | 3,
      pageId: `page-${ordinal}`,
      kind:
        ordinal === 1
          ? ("concept" as const)
          : ordinal === 2
            ? ("formula" as const)
            : ("trap" as const),
      titleByLocale: localized(`Title ${ordinal}`),
      bodyByLocale: localized(`Body ${ordinal}`),
      bodyRunsByLocale: bodyRunsByLocale(ordinal, targetSemantic),
      question: {
        interactionId: `interaction-${ordinal}`,
        promptByLocale: localized(`Question ${ordinal}`),
        choicesByLocale: Object.freeze(
          Object.fromEntries(
            locales.map((locale) => [locale, [`A ${ordinal}`, `B ${ordinal}`]]),
          ),
        ),
        accessibilityLabelByLocale: localized(`Accessibility ${ordinal}`),
      },
    })) as never,
  });
}

describe("Learning V2 intro semantic runs", () => {
  test("round-trips explicit semantic runs without changing the canonical body", () => {
    const parsed = parseLearningV2CourseSessionIntroChildV1(
      encodeLearningV2CourseSessionIntroChildV1(introWithSemanticRuns()),
    );
    const pages = parsed.pages as unknown as ReadonlyArray<{
      readonly bodyByLocale: Readonly<Record<(typeof locales)[number], string>>;
      readonly bodyRunsByLocale?: Readonly<
        Record<
          (typeof locales)[number],
          ReadonlyArray<{
            readonly text: string;
            readonly semantic:
              | "explanation"
              | "targetCorrect"
              | "targetWrong"
              | "nativeGloss";
          }>
        >
      >;
    }>;

    expect(pages[0].bodyRunsByLocale?.ru).toEqual([
      { text: "Body 1 ", semantic: "explanation" },
      { text: "ru", semantic: "targetCorrect" },
    ]);
    for (const page of pages) {
      for (const locale of locales) {
        expect(
          page.bodyRunsByLocale?.[locale].map((run) => run.text).join(""),
        ).toBe(page.bodyByLocale[locale]);
      }
    }
  });

  test("semantic meaning participates in the canonical intro fingerprint", () => {
    const correct = introWithSemanticRuns("targetCorrect");
    const wrong = introWithSemanticRuns("targetWrong");

    expect(correct.pages[0].bodyByLocale).toEqual(wrong.pages[0].bodyByLocale);
    expect(correct.introFingerprint).not.toBe(wrong.introFingerprint);
  });
});
