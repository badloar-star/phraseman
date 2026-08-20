import {
  LEARNING_V2_OPENAI_TTS_VOICES,
  learningV2AudioDependencyFingerprint,
  learningV2AudioNeedsRegeneration,
  learningV2VoiceForSlot,
  materializeLearningV2AudioGenerationInput,
  materializeLearningV2AudioGenerationVariants,
  learningV2VoiceForPlayback,
  validateLearningV2GeneratedSessionIntro,
} from "../modules/learning-v2/content/generator_session_contract";
import {
  LEARNING_V2_INTERFACE_LOCALES,
  type LearningV2Localized,
} from "../modules/learning-v2/content/generator_course_contract";
import { adaptLearningV2GeneratedSessionIntroToLessonScreens } from "../modules/learning-v2/content/session_intro_runtime_adapter";

const localized = <T>(
  value: (locale: (typeof LEARNING_V2_INTERFACE_LOCALES)[number]) => T,
): LearningV2Localized<T> =>
  Object.fromEntries(
    LEARNING_V2_INTERFACE_LOCALES.map((locale) => [locale, value(locale)]),
  ) as LearningV2Localized<T>;

const introQuestion = (n: 1 | 2 | 3) => ({
  questionId: `q${n}`,
  requiredTaskSlot: n,
  promptByLocale: localized((locale) => `Question ${n} (${locale})`),
  choicesByLocale: localized(
    (locale) => [`A-${locale}`, `B-${locale}`, `C-${locale}`] as const,
  ),
  correctChoiceIndex: 0 as const,
  explanationByLocale: localized(
    (locale) => `Because A is correct (${locale}).`,
  ),
});

const introPage = (ordinal: 1 | 2 | 3) => ({
  pageOrdinal: ordinal,
  pageId: `concept-${ordinal}`,
  kind: "concept" as const,
  titleByLocale: localized((locale) => `The idea ${ordinal} (${locale})`),
  bodyByLocale: localized(
    (locale) => `English needs a verb ${ordinal} (${locale}).`,
  ),
  question: introQuestion(ordinal),
});

const generatedIntro = () => ({
  schemaVersion: "learning-v2-generated-session-intro.v3" as const,
  sessionTemplateId: "e1-session-1",
  titleByLocale: localized((locale) => `Meet the verb to be (${locale})`),
  summaryByLocale: localized((locale) => `A short introduction (${locale}).`),
  learningGoalByLocale: localized(
    (locale) => `Use am, is and are (${locale}).`,
  ),
  pages: [introPage(1), introPage(2), introPage(3)] as const,
  practiceStartSlot: 4 as const,
  slotPresentationPolicy:
    "slots_1_2_3_embedded_in_intro_pages_not_repeated" as const,
});

const semanticRunsByLocale = (ordinal: 1 | 2 | 3) =>
  localized((locale) => [
    { text: `English needs a verb ${ordinal} (`, semantic: "explanation" as const },
    { text: locale, semantic: "targetCorrect" as const },
    { text: ").", semantic: "explanation" as const },
  ] as const);

describe("Learning V2 generator session contract", () => {
  test("rejects semantic runs whose plain text differs from the canonical body", () => {
    const candidate = generatedIntro();
    const pages = candidate.pages.map((page) => ({
      ...page,
      bodyRunsByLocale: semanticRunsByLocale(page.pageOrdinal),
    })) as unknown as typeof candidate.pages;
    const broken = {
      ...candidate,
      pages: pages.map((page, index) =>
        index === 0
          ? {
              ...page,
              bodyRunsByLocale: localized((locale) => [
                {
                  text: `Different text (${locale}).`,
                  semantic: "targetCorrect" as const,
                },
              ] as const),
            }
          : page,
      ) as unknown as typeof candidate.pages,
    };

    expect(() =>
      validateLearningV2GeneratedSessionIntro(broken as never),
    ).toThrow("learning_v2_generator_intro_runs_body_mismatch");
  });

  test("rejects semantic roles outside the closed four-role vocabulary", () => {
    const candidate = generatedIntro();
    const broken = {
      ...candidate,
      pages: candidate.pages.map((page) => ({
        ...page,
        bodyRunsByLocale: localized((locale) => [
          {
            text: page.bodyByLocale[locale],
            semantic: "highlight",
          },
        ]),
      })) as unknown as typeof candidate.pages,
    };

    expect(() =>
      validateLearningV2GeneratedSessionIntro(broken as never),
    ).toThrow("learning_v2_intro_run_invalid");
  });

  test("pins exactly four approved OpenAI voices and assigns them deterministically", () => {
    expect(LEARNING_V2_OPENAI_TTS_VOICES).toEqual([
      "ash",
      "onyx",
      "nova",
      "coral",
    ]);
    const first = learningV2VoiceForSlot({
      episodeOrdinal: 1,
      slotOrdinal: 4,
      characterId: "guide-anna",
    });
    expect(
      learningV2VoiceForSlot({
        episodeOrdinal: 32,
        slotOrdinal: 999,
        characterId: "guide-anna",
      }),
    ).toBe(first);
    expect(LEARNING_V2_OPENAI_TTS_VOICES).toContain(first);
    expect(
      new Set(
        [1, 2, 3, 4].map((slotOrdinal) =>
          learningV2VoiceForSlot({ episodeOrdinal: 1, slotOrdinal }),
        ),
      ),
    ).toEqual(new Set(LEARNING_V2_OPENAI_TTS_VOICES));
  });

  test("requires regeneration whenever a semantic TTS input changes", () => {
    const base = materializeLearningV2AudioGenerationInput({
      contentItemId: "e1-hello",
      language: "en-US",
      inputText: "Hello, I am Anna.",
      characterId: "anna",
      episodeOrdinal: 1,
      slotOrdinal: 1,
      instructions: "Warm, clear, natural A1 English.",
    });
    const receipt = {
      dependencyFingerprint: learningV2AudioDependencyFingerprint(base),
      assetSha256: "a".repeat(64),
      assetBytes: 8_000,
      reviewStatus: "human_approved" as const,
    };
    expect(learningV2AudioNeedsRegeneration(base, receipt)).toBe(false);
    const repaired = materializeLearningV2AudioGenerationInput({
      contentItemId: "e1-hello",
      language: "en-US",
      inputText: "Hi, I am Anna.",
      characterId: "anna",
      episodeOrdinal: 1,
      slotOrdinal: 1,
      instructions: "Warm, clear, natural A1 English.",
    });
    expect(learningV2AudioNeedsRegeneration(repaired, receipt)).toBe(true);
  });

  test("generates all four local variants and replays the same phrase round-robin", () => {
    const variants = materializeLearningV2AudioGenerationVariants({
      contentItemId: "e1-hello",
      language: "en-US",
      inputText: "Hello, I am Anna.",
      episodeOrdinal: 1,
      slotOrdinal: 1,
      instructions: "Warm, clear, natural A1 English.",
    });
    expect(variants.map((variant) => variant.voice)).toEqual([
      "ash",
      "onyx",
      "nova",
      "coral",
    ]);
    expect(variants.map((variant) => variant.variantOrdinal)).toEqual([
      1, 2, 3, 4,
    ]);
    expect([0, 1, 2, 3, 4, 5].map(learningV2VoiceForPlayback)).toEqual([
      "ash",
      "onyx",
      "nova",
      "coral",
      "ash",
      "onyx",
    ]);
    expect(
      new Set(variants.map(learningV2AudioDependencyFingerprint)).size,
    ).toBe(4);
  });

  test("accepts only three intro pages with one canonical question embedded in each", () => {
    const intro = generatedIntro();
    expect(validateLearningV2GeneratedSessionIntro(intro)).toBe(intro);
    expect(() =>
      validateLearningV2GeneratedSessionIntro({
        ...intro,
        pages: intro.pages.slice(0, 2) as never,
      }),
    ).toThrow("learning_v2_generator_intro_invalid");
    expect(() =>
      validateLearningV2GeneratedSessionIntro({
        ...intro,
        pages: [
          { ...intro.pages[0], question: introQuestion(2) },
          intro.pages[1],
          intro.pages[2],
        ],
      }),
    ).toThrow("learning_v2_generator_intro_star_slot_invalid");
    const { pl: _missing, ...missingPolish } = intro.titleByLocale;
    expect(() =>
      validateLearningV2GeneratedSessionIntro({
        ...intro,
        titleByLocale: missingPolish as never,
      }),
    ).toThrow("learning_v2_generator_intro_title_locales_invalid");
  });

  test("maps every generated locale into the existing full-screen intro without Russian fallback duplication", () => {
    const screens = adaptLearningV2GeneratedSessionIntroToLessonScreens({
      intro: generatedIntro(),
      lessonId: 1,
      sessionOrdinal: 1,
      topicAccent: {
        accent: "#70D6FF",
        soft: "#173446",
        accentOnLight: "#075C78",
      },
    });
    expect(screens).toHaveLength(3);
    expect(screens[0].titleRU).toContain("(ru)");
    expect(screens[0].titleUK).toContain("(uk)");
    expect(screens[0].titleES).toContain("(es)");
    expect(screens[0].titlePtBr).toContain("(pt-BR)");
    expect(screens[0].linesPl?.[0].parts?.[0].text).toContain("(pl)");
    expect(screens[0].linesRU?.[1].parts).toEqual([
      {
        text: "English needs a verb 1 (ru).",
        semantic: "explanation",
      },
    ]);
    expect(screens[0].titleRU).not.toBe(screens[0].titlePl);
    expect(
      screens.map((screen) => screen.learningV2EmbeddedQuestion?.taskSlot),
    ).toEqual([1, 2, 3]);
  });

  test("preserves supplied intro run order, whitespace, punctuation and semantics in the packaged adapter", () => {
    const candidate = generatedIntro();
    const withRuns = {
      ...candidate,
      pages: candidate.pages.map((page) => ({
        ...page,
        bodyRunsByLocale: semanticRunsByLocale(page.pageOrdinal),
      })) as unknown as typeof candidate.pages,
    };
    const screens = adaptLearningV2GeneratedSessionIntroToLessonScreens({
      intro: withRuns,
      lessonId: 1,
      sessionOrdinal: 1,
      topicAccent: {
        accent: "#70D6FF",
        soft: "#173446",
        accentOnLight: "#075C78",
      },
    });

    expect(screens[0].linesRU?.[1].parts).toEqual([
      { text: "English needs a verb 1 (", semantic: "explanation" },
      { text: "ru", semantic: "targetCorrect" },
      { text: ").", semantic: "explanation" },
    ]);
    expect(screens[0].linesPl?.[1].parts).toEqual([
      { text: "English needs a verb 1 (", semantic: "explanation" },
      { text: "pl", semantic: "targetCorrect" },
      { text: ").", semantic: "explanation" },
    ]);
  });
});
