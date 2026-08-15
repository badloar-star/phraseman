import { hashCanonicalBody } from "../policies/decision_registry";
import {
  materializeLearningV2CourseSessionAuxiliaryChildV1,
  materializeLearningV2CourseSessionIntroChildV1,
  materializeLearningV2CourseSessionLearnerChildV1,
  materializeLearningV2CourseSessionSavablePhraseV1,
  type LearningV2CourseSessionAuxiliaryChildV1,
  type LearningV2CourseSessionIntroChildV1,
  type LearningV2CourseSessionLearnerChildV1,
  type LearningV2CourseSessionLocalizedTextV1,
} from "../runtime/course_session_client_children_v1";
import {
  materializeLearningV2CourseSessionEvaluatorCapsuleChildV1,
  type LearningV2CourseSessionEvaluatorCapsuleChildV1,
} from "../runtime/course_session_evaluator_capsule_child_v1";
import {
  materializeLearningV2CourseSessionAudioChildV1,
  type LearningV2CourseSessionAudioChildV1,
} from "../runtime/course_session_audio_child_v1";
import { V2_REQUIRED_VOICE_IDS } from "../contracts/voice_playback_policy_v1";

/**
 * Neutral QA session fixture — НЕ учебный контент курса.
 *
 * зачем: владелец единолично создаёт реальные уроки E1–E32. Чтобы проверить весь
 * физический путь занятия (модалка → intro → локальный вердикт → аудио слов →
 * обрыв → новый run → завершение → answer-free сводка), нужен пакет, который
 * технически неотличим от настоящего для рантайма, но никогда не может быть
 * принят за production-контент:
 *
 *  - `contentClass: "neutral_test_fixture"` и `releaseAuthority: false`;
 *  - lessonOrdinal 32 / sessionOrdinal 56 при `LESSON_ID`/`COURSE_SESSION_ID`
 *    с префиксом `qa-neutral-*`, которого нет и не может быть в production;
 *  - фразы намеренно про вымышленный «QA-город», а не про реальную тему урока.
 *
 * Педагогически пакет цельный (introduce → practice → retrieval → independent
 * check), как требует QUALITY_REFERENCE_GENERATED_CURRICULUM_V3, но цельность
 * НЕ повышает его authority: кнопка «взять как основу» обязана создавать
 * отдельную production-копию с новыми ID и fingerprint.
 */
export const LEARNING_V2_NEUTRAL_QA_FIXTURE_SCHEMA_V1 =
  "learning-v2-neutral-qa-session-fixture.v1" as const;

export const LEARNING_V2_NEUTRAL_QA_CONTENT_CLASS_V1 =
  "neutral_test_fixture" as const;

/**
 * зачем: production id строится из порядковых номеров (`lesson-32:session:56`).
 * Префикс `qa-neutral-` физически исключает совпадение, поэтому даже случайный
 * импорт этого пакета не перекроет настоящий урок.
 */
export const LEARNING_V2_NEUTRAL_QA_LESSON_ID_V1 = "qa-neutral-lesson" as const;
export const LEARNING_V2_NEUTRAL_QA_COURSE_SESSION_ID_V1 =
  "qa-neutral-lesson:session:56" as const;
export const LEARNING_V2_NEUTRAL_QA_LESSON_ORDINAL_V1 = 32 as const;
export const LEARNING_V2_NEUTRAL_QA_SESSION_ORDINAL_V1 = 56 as const;
export const LEARNING_V2_NEUTRAL_QA_TARGET_LANGUAGE_V1 = "en-US" as const;

export const LEARNING_V2_NEUTRAL_QA_INTERFACE_LOCALES_V1 = Object.freeze([
  "ru",
  "uk",
  "es",
  "pt-BR",
  "vi",
  "id",
  "tr",
  "pl",
] as const);

/** 3 intro-вопроса (slots 1–3) + 14 практических = 17, внутри standard 14–18. */
export const LEARNING_V2_NEUTRAL_QA_PRACTICE_COUNT_V1 = 14 as const;

type Locale = (typeof LEARNING_V2_NEUTRAL_QA_INTERFACE_LOCALES_V1)[number];

function localized(
  byLocale: Readonly<Record<Locale, string>>,
): LearningV2CourseSessionLocalizedTextV1 {
  return Object.freeze({ ...byLocale }) as LearningV2CourseSessionLocalizedTextV1;
}

/**
 * зачем: восемь локалей обязательны по контракту, но переводить нейтральный QA
 * текст на восемь языков смысла нет — важна структура, а не формулировка. Чтобы
 * никто не принял это за готовый перевод, каждая локаль явно помечена тегом.
 */
function tagged(base: string): LearningV2CourseSessionLocalizedTextV1 {
  return localized(
    Object.fromEntries(
      LEARNING_V2_NEUTRAL_QA_INTERFACE_LOCALES_V1.map((locale) => [
        locale,
        `[qa:${locale}] ${base}`,
      ]),
    ) as Record<Locale, string>,
  );
}

function interactionId(ordinal: number): string {
  return `qa-neutral-interaction-${String(ordinal).padStart(2, "0")}`;
}

/**
 * зачем: audioTargetId и wordId по контракту — строго 64-символьные хеши, а не
 * читаемые идентификаторы. Выводим их детерминированно из координат фикстуры,
 * чтобы они были стабильны между прогонами и не совпадали с production.
 */
function audioTargetId(ordinal: number, slot: number): string {
  return hashCanonicalBody(`qa-neutral-audio-target|${ordinal}|${slot}`);
}

function wordId(ordinal: number, slot: number): string {
  return hashCanonicalBody(`qa-neutral-word|${ordinal}|${slot}`);
}

/** Тема фикстуры: вымышленный «QA-город», нигде не пересекается с курсом. */
const INTRO_PAGES = Object.freeze([
  Object.freeze({
    kind: "concept" as const,
    title: "Where the QA tram stops",
    body: "In this neutral drill a speaker names a stop. The pattern is: subject + verb + place.",
    prompt: "Which part names the place?",
    correct: "at the museum",
    distractor: "the tram runs",
  }),
  Object.freeze({
    kind: "formula" as const,
    title: "The formula",
    body: "Subject + verb + at + place. The preposition never disappears in this drill.",
    prompt: "Complete: the tram stops ___ the museum.",
    correct: "at",
    distractor: "of",
  }),
  Object.freeze({
    kind: "example" as const,
    title: "One worked example",
    body: "The tram stops at the museum. Same shape, different place: it stops at the bridge.",
    prompt: "Which sentence follows the formula?",
    correct: "it stops at the bridge",
    distractor: "it stops bridge at",
  }),
] as const);

/**
 * Практика идёт по возрастанию самостоятельности, как требует reference:
 * supported → guided → retrieval → near transfer → independent check.
 */
const PRACTICE = Object.freeze([
  { family: "phrase_builder", input: "ordered_tokens", purpose: "supported_practice", phrase: "the tram stops at the museum" },
  { family: "listen_choose", input: "single_choice", purpose: "supported_practice", phrase: "the tram stops at the bridge" },
  { family: "phrase_builder", input: "ordered_tokens", purpose: "guided_practice", phrase: "the bus waits at the corner" },
  { family: "context_gap_grammar", input: "single_choice", purpose: "guided_practice", phrase: "the ferry leaves at the pier" },
  { family: "sound_contrast", input: "single_choice", purpose: "guided_practice", phrase: "the train stops at the station" },
  { family: "listen_build_dictation", input: "ordered_tokens", purpose: "retrieval_practice", phrase: "the taxi waits at the gate" },
  { family: "phrase_builder", input: "ordered_tokens", purpose: "retrieval_practice", phrase: "the boat arrives at the dock" },
  { family: "speed_match", input: "single_choice", purpose: "retrieval_practice", phrase: "the bus stops at the school" },
  { family: "context_gap_grammar", input: "single_choice", purpose: "interleaved_review", phrase: "the tram waits at the park" },
  { family: "listen_choose", input: "single_choice", purpose: "near_transfer", phrase: "the shuttle stops at the airport" },
  { family: "phrase_builder", input: "ordered_tokens", purpose: "near_transfer", phrase: "the coach leaves at the terminal" },
  { family: "scripted_repeat_compare", input: "scripted_speech", purpose: "near_transfer", phrase: "the train arrives at the platform" },
  { family: "phrase_builder", input: "ordered_tokens", purpose: "independent_check", phrase: "the ferry stops at the harbour" },
  { family: "context_gap_grammar", input: "single_choice", purpose: "independent_check", phrase: "the bus arrives at the market" },
] as const);

function words(phrase: string): readonly string[] {
  return phrase.split(" ");
}

export function buildLearningV2NeutralQaIntroChildV1(): LearningV2CourseSessionIntroChildV1 {
  return materializeLearningV2CourseSessionIntroChildV1({
    courseSessionId: LEARNING_V2_NEUTRAL_QA_COURSE_SESSION_ID_V1,
    learningOutcomeByLocale: tagged(
      "You will say where a vehicle stops, using: subject + verb + at + place.",
    ),
    pages: INTRO_PAGES.map((page, index) => ({
      pageOrdinal: (index + 1) as 1 | 2 | 3,
      pageId: `qa-neutral-intro-page-${index + 1}`,
      kind: page.kind,
      titleByLocale: tagged(page.title),
      bodyByLocale: tagged(page.body),
      // зачем: вопрос живёт ВНИЗУ своей intro-страницы и проверяет только её —
      // отдельного блока вопросов после intro быть не должно.
      question: {
        interactionId: interactionId(index + 1),
        promptByLocale: tagged(page.prompt),
        choicesByLocale: localized(
          Object.fromEntries(
            LEARNING_V2_NEUTRAL_QA_INTERFACE_LOCALES_V1.map((locale) => [
              locale,
              [page.correct, page.distractor],
            ]),
          ) as never,
        ) as never,
        accessibilityLabelByLocale: tagged(page.prompt),
      },
    })) as never,
  });
}

export function buildLearningV2NeutralQaLearnerChildV1(): LearningV2CourseSessionLearnerChildV1 {
  return materializeLearningV2CourseSessionLearnerChildV1({
    courseSessionId: LEARNING_V2_NEUTRAL_QA_COURSE_SESSION_ID_V1,
    targetLanguage: LEARNING_V2_NEUTRAL_QA_TARGET_LANGUAGE_V1,
    interactionProfile: "standard",
    interactions: PRACTICE.map((entry, index) => {
      const ordinal = index + 4;
      const tokens = words(entry.phrase);
      return {
        interactionId: interactionId(ordinal),
        ordinal,
        purpose: entry.purpose,
        family: entry.family,
        inputMode: entry.input,
        prompt:
          entry.input === "single_choice"
            ? `Choose the sentence that follows the formula (${index + 1}).`
            : entry.input === "scripted_speech"
              ? `Say the sentence out loud (${index + 1}).`
              : `Build the sentence (${index + 1}).`,
        responseOptions:
          entry.input === "single_choice"
            ? [
                { responseId: `qa-opt-${ordinal}-a`, text: entry.phrase },
                {
                  responseId: `qa-opt-${ordinal}-b`,
                  text: `${tokens[0]} ${tokens[1]} ${tokens[3]}`,
                },
              ]
            : tokens.slice(0, 8).map((token, tokenIndex) => ({
                responseId: `qa-tok-${ordinal}-${tokenIndex + 1}`,
                text: token,
              })),
        mediaIds: [],
        // Ровно один audioTarget на каждый выбираемый элемент: у аудио-ребёнка
        // selectables строятся из responseOptions один в один. Контракт требует
        // именно 64-символьный хеш, а не читаемый id.
        audioTargetIds: (entry.input === "single_choice"
          ? [1, 2]
          : tokens.slice(0, 8).map((_, tokenIndex) => tokenIndex + 1)
        ).map((slot) => audioTargetId(ordinal, slot)),
        accessibilityLabel: `Neutral QA interaction ${ordinal}`,
        // зачем: голосовой ответ остаётся доступной альтернативой, но НЕ считается
        // доказательством и ничего не начисляет — оба флага строго false.
        scriptedAlternate:
          entry.input === "scripted_speech"
            ? {
                alternateId: `qa-neutral-alternate-${ordinal}`,
                instruction: `Tap to record instead of holding: ${entry.phrase}`,
                voiceEvidenceEquivalent: false as const,
                canAward: false as const,
              }
            : null,
      };
    }) as never,
  });
}

export function buildLearningV2NeutralQaEvaluatorCapsuleChildV1(): LearningV2CourseSessionEvaluatorCapsuleChildV1 {
  const introEntries = INTRO_PAGES.map((page, index) => ({
    interactionId: interactionId(index + 1),
    activityId: `qa-neutral-activity-${index + 1}`,
    capsuleId: `qa-neutral-capsule-${index + 1}`,
    // зачем: device-run требует inputKind "text" для трёх intro-слотов, а
    // inputKind выводится из family. phrase_builder — единственное семейство,
    // которое даёт "text" и при этом уместно для свободного ответа на intro.
    family: "phrase_builder" as const,
    normalizationLocale: LEARNING_V2_NEUTRAL_QA_TARGET_LANGUAGE_V1,
    salt: hashCanonicalBody(`qa-neutral-intro-salt-${index + 1}`),
    acceptedResponses: [page.correct],
  }));
  const practiceEntries = PRACTICE.map((entry, index) => {
    const ordinal = index + 4;
    return {
      interactionId: interactionId(ordinal),
      activityId: `qa-neutral-activity-${ordinal}`,
      capsuleId: `qa-neutral-capsule-${ordinal}`,
      family: entry.family,
      normalizationLocale: LEARNING_V2_NEUTRAL_QA_TARGET_LANGUAGE_V1,
      salt: hashCanonicalBody(`qa-neutral-practice-salt-${ordinal}`),
      acceptedResponses: [
        entry.input === "single_choice" ? `qa-opt-${ordinal}-a` : entry.phrase,
      ],
    };
  });
  return materializeLearningV2CourseSessionEvaluatorCapsuleChildV1({
    courseSessionId: LEARNING_V2_NEUTRAL_QA_COURSE_SESSION_ID_V1,
    entries: [...introEntries, ...practiceEntries] as never,
  });
}

export function buildLearningV2NeutralQaAuxiliaryChildV1(): LearningV2CourseSessionAuxiliaryChildV1 {
  const all = [
    ...INTRO_PAGES.map((page, index) => ({
      ordinal: index + 1,
      phrase: page.correct,
      // зачем: вторая ошибка в задании обязана показать ПОДГОТОВЛЕННОЕ
      // объяснение; текст каталогизирован по языку/типу/уроку/сессии.
      explanation: `The place always follows "at": ${page.correct}.`,
    })),
    ...PRACTICE.map((entry, index) => ({
      ordinal: index + 4,
      phrase: entry.phrase,
      explanation: `Keep the order subject + verb + at + place: ${entry.phrase}.`,
    })),
  ];
  return materializeLearningV2CourseSessionAuxiliaryChildV1({
    courseSessionId: LEARNING_V2_NEUTRAL_QA_COURSE_SESSION_ID_V1,
    entries: all.map((entry) => ({
      interactionId: interactionId(entry.ordinal),
      report: {
        available: true as const,
        reportContextRef: `qa-neutral-report-${entry.ordinal}`,
        screen: "learning_v2_session" as const,
      },
      save: materializeLearningV2CourseSessionSavablePhraseV1({
        targetLanguage: LEARNING_V2_NEUTRAL_QA_TARGET_LANGUAGE_V1,
        targetText: entry.phrase,
        meaningByLocale: tagged(`Neutral QA meaning: ${entry.phrase}`),
      }),
      voice: {
        available: true,
        tapToRecordAllowed: true as const,
        holdToTalkAllowed: true as const,
      },
      secondErrorExplanationRef: `qa-neutral-explanation-${entry.ordinal}`,
      secondErrorExplanationByLocale: tagged(entry.explanation),
    })) as never,
  });
}

/**
 * зачем: пути и хеши обязаны выглядеть как настоящие (иначе parser отвергнет),
 * но выводятся детерминированно из координат фикстуры, поэтому не совпадают ни
 * с одним реально опубликованным объектом.
 */
function audioFile(seed: string, voiceIndex: 0 | 1 | 2 | 3) {
  const contentHash = hashCanonicalBody(`${seed}|content|${voiceIndex}`);
  const objectPath = [
    "learning-v2/voice-audio",
    hashCanonicalBody(`${seed}|root`),
    hashCanonicalBody(`${seed}|lesson`),
    hashCanonicalBody(`${seed}|session`),
    `${contentHash}.mp3`,
  ].join("/");
  return {
    voiceId: V2_REQUIRED_VOICE_IDS[voiceIndex],
    objectPath,
    contentHash,
    objectGeneration: String(1_700_000_000_000 + voiceIndex),
    byteSize: 4096 + voiceIndex,
    contentType: "audio/mpeg" as const,
  };
}

function fourVoices(seed: string) {
  return [0, 1, 2, 3].map((index) =>
    audioFile(seed, index as 0 | 1 | 2 | 3),
  ) as never;
}

export function buildLearningV2NeutralQaAudioChildV1(
  learner: LearningV2CourseSessionLearnerChildV1,
): LearningV2CourseSessionAudioChildV1 {
  return materializeLearningV2CourseSessionAudioChildV1({
    learner,
    // зачем: аудио привязывается к ТЕМ ЖЕ selectable, что показаны ученику —
    // selectableId обязан совпасть с responseId из learner-child, иначе tap по
    // варианту/слову останется без звука.
    interactions: learner.interactions
      .filter((entry) => entry.audioTargetIds.length > 0)
      .map((entry) => ({
        interactionId: entry.interactionId,
        taskVoiceGroupFingerprint: hashCanonicalBody(
          `qa-neutral-voice-group-${entry.ordinal}`,
        ),
        // Полная фраза озвучена всеми четырьмя голосами...
        fullPhraseFiles: fourVoices(`qa-neutral-phrase-${entry.ordinal}`),
        // ...и КАЖДЫЙ выбираемый элемент тоже.
        selectables: entry.responseOptions.map((option, optionIndex) => ({
          selectableId: option.responseId,
          audioTargetId: entry.audioTargetIds[optionIndex]!,
          wordId: wordId(entry.ordinal, optionIndex + 1),
          wordOrdinal: optionIndex + 1,
          visibleText: option.text,
          files: fourVoices(
            `qa-neutral-selectable-${entry.ordinal}-${optionIndex + 1}`,
          ),
        })),
      })) as never,
  });
}

export type LearningV2NeutralQaSessionFixtureV1 = Readonly<{
  schemaVersion: typeof LEARNING_V2_NEUTRAL_QA_FIXTURE_SCHEMA_V1;
  contentClass: typeof LEARNING_V2_NEUTRAL_QA_CONTENT_CLASS_V1;
  releaseAuthority: false;
  productionSelectable: false;
  lessonId: typeof LEARNING_V2_NEUTRAL_QA_LESSON_ID_V1;
  lessonOrdinal: typeof LEARNING_V2_NEUTRAL_QA_LESSON_ORDINAL_V1;
  courseSessionId: typeof LEARNING_V2_NEUTRAL_QA_COURSE_SESSION_ID_V1;
  sessionOrdinal: typeof LEARNING_V2_NEUTRAL_QA_SESSION_ORDINAL_V1;
  introChild: LearningV2CourseSessionIntroChildV1;
  learnerChild: LearningV2CourseSessionLearnerChildV1;
  evaluatorCapsuleChild: LearningV2CourseSessionEvaluatorCapsuleChildV1;
  auxiliaryChild: LearningV2CourseSessionAuxiliaryChildV1;
  audioChild: LearningV2CourseSessionAudioChildV1;
  fixtureFingerprint: string;
}>;

export function buildLearningV2NeutralQaSessionFixtureV1(): LearningV2NeutralQaSessionFixtureV1 {
  const introChild = buildLearningV2NeutralQaIntroChildV1();
  const learnerChild = buildLearningV2NeutralQaLearnerChildV1();
  const evaluatorCapsuleChild = buildLearningV2NeutralQaEvaluatorCapsuleChildV1();
  const auxiliaryChild = buildLearningV2NeutralQaAuxiliaryChildV1();
  const audioChild = buildLearningV2NeutralQaAudioChildV1(learnerChild);
  return Object.freeze({
    schemaVersion: LEARNING_V2_NEUTRAL_QA_FIXTURE_SCHEMA_V1,
    contentClass: LEARNING_V2_NEUTRAL_QA_CONTENT_CLASS_V1,
    releaseAuthority: false as const,
    productionSelectable: false as const,
    lessonId: LEARNING_V2_NEUTRAL_QA_LESSON_ID_V1,
    lessonOrdinal: LEARNING_V2_NEUTRAL_QA_LESSON_ORDINAL_V1,
    courseSessionId: LEARNING_V2_NEUTRAL_QA_COURSE_SESSION_ID_V1,
    sessionOrdinal: LEARNING_V2_NEUTRAL_QA_SESSION_ORDINAL_V1,
    introChild,
    learnerChild,
    evaluatorCapsuleChild,
    auxiliaryChild,
    audioChild,
    fixtureFingerprint: hashCanonicalBody({
      schemaVersion: LEARNING_V2_NEUTRAL_QA_FIXTURE_SCHEMA_V1,
      intro: introChild.introFingerprint,
      learner: learnerChild.learnerFingerprint,
      auxiliary: auxiliaryChild.auxiliaryFingerprint,
      audio: audioChild.audioFingerprint,
    }),
  });
}
