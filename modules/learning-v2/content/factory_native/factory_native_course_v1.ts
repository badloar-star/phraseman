import { FACTORY_NATIVE_MANIFEST_V1 } from "./factory_native_manifest_v1.generated";
import { FACTORY_NATIVE_DISPLAY_LOCALE_FALLBACK_V1 } from "./factory_native_catalog_v1";
import {
  LEARNING_V2_INTERFACE_LOCALES,
  type LearningV2InterfaceLocale,
} from "../generator_course_contract";
import { learningV2CourseSessionIdV1 } from "../course_topology_v1";
import {
  materializeLearningV2CourseSessionAuxiliaryChildV1,
  materializeLearningV2CourseSessionIntroChildV1,
  materializeLearningV2CourseSessionLearnerChildV1,
  materializeLearningV2CourseSessionSavablePhraseV1,
  type LearningV2CourseSessionAuxiliaryEntryV1,
  type LearningV2CourseSessionIntroPageV1,
  type LearningV2CourseSessionLocalizedTextV1,
  type LearningV2CourseSessionPracticeInteractionV1,
} from "../../runtime/course_session_client_children_v1";
import type { LearningV2CourseSessionWordEncounterPresentationV1 } from "../../runtime/course_session_word_encounter_presentation_v1";
import {
  materializeLearningV2CourseSessionEvaluatorCapsuleChildV1,
  type LearningV2CourseSessionEvaluatorCapsuleEntryV1,
} from "../../runtime/course_session_evaluator_capsule_child_v1";
import type { LearningV2ModeNativePayloadV1 } from "../../contracts/mode_native_payload_v1";
import { hashCanonicalBody, sha256Utf8 } from "../../policies/decision_registry";

export {
  FACTORY_NATIVE_AUTHORED_LOCALES_V1,
  FACTORY_NATIVE_DISPLAY_LOCALE_FALLBACK_V1,
  FACTORY_NATIVE_PROJECTION_VERSION_V1,
  factoryNativeLearningV2AvailabilityV1,
  factoryNativeLearningV2CatalogSeedV1,
  factoryNativeLearningV2CourseIdentityV1,
} from "./factory_native_catalog_v1";

type Plain = Record<string, unknown>;

export type LearningV2FactoryNativeNewWordEncounterV1 = LearningV2CourseSessionWordEncounterPresentationV1 & Readonly<{ encounterId: string }>;
export type LearningV2FactoryNativePracticeSemanticV1 = Readonly<{
  canonicalTarget: string;
  reviewedMeaningByLocale: LearningV2CourseSessionLocalizedTextV1 | null;
}>;

function record(value: unknown): Plain {
  if (typeof value !== "object" || value === null || Array.isArray(value))
    throw new Error("learning_v2_factory_native_projection_invalid");
  return value as Plain;
}

function localized(value: unknown): LearningV2CourseSessionLocalizedTextV1 {
  const source = record(value);
  const ru = String(source.ru ?? "").replace(/\s+/gu, " ").trim();
  const uk = String(source.uk ?? ru).replace(/\s+/gu, " ").trim();
  if (!ru || !uk) throw new Error("learning_v2_factory_native_locale_missing");
  return Object.freeze(
    Object.fromEntries(LEARNING_V2_INTERFACE_LOCALES.map((locale) => [
      locale,
      locale === "uk" ? uk : ru,
    ])),
  ) as LearningV2CourseSessionLocalizedTextV1;
}

function remapText(value: string, oldPrefix: string, courseSessionId: string): string {
  return value.split(oldPrefix).join(courseSessionId);
}

function remapId(value: unknown, oldPrefix: string, courseSessionId: string): string {
  const id = remapText(String(value ?? ""), oldPrefix, courseSessionId);
  if (!id) throw new Error("learning_v2_factory_native_id_missing");
  return id;
}

function stablePermutation(values: readonly string[], seed: string): readonly string[] {
  const result = [...values];
  for (let index = result.length - 1; index > 0; index -= 1) {
    const digest = sha256Utf8(`${seed}:${index}`);
    const swap = Number.parseInt(digest.slice(0, 8), 16) % (index + 1);
    [result[index], result[swap]] = [result[swap]!, result[index]!];
  }
  if (result.length > 1 && result.every((value, index) => value === values[index])) result.push(result.shift()!);
  return Object.freeze(result);
}

export function factoryNativeSpeedMatchColumnsV1(
  pairIds: readonly string[],
  boardSeed: string,
): Readonly<{ leftColumn: readonly string[]; rightColumn: readonly string[] }> {
  if (pairIds.length < 3 || new Set(pairIds).size !== pairIds.length)
    throw new Error("learning_v2_factory_native_pair_shuffle_invalid");
  const leftColumn = stablePermutation(pairIds, `${boardSeed}:left`);
  const rightSeed = stablePermutation(pairIds, `${boardSeed}:right`);
  // Preserve the published four-pair board ordering before considering the
  // complete fallback used by future board sizes.
  const rightCandidates = [rightSeed, Object.freeze([...rightSeed].reverse())]
    .flatMap((candidate) => candidate.map((_, offset) => Object.freeze(
      candidate.map((__, index) => candidate[(index + offset) % candidate.length]!),
    )));
  const isValid = (candidate: readonly string[]) =>
    candidate.some((pairId, index) => pairId !== pairIds[index]) &&
    candidate.every((pairId, index) => pairId !== leftColumn[index]);
  const existingCandidate = rightCandidates.find(isValid);
  if (existingCandidate) return Object.freeze({ leftColumn, rightColumn: existingCandidate });

  // Every non-zero cyclic shift of distinct left-column IDs is a derangement.
  // For n >= 3, at most one of those n-1 shifts can equal the source order, so
  // this search always contains a valid non-identity presentation.
  for (let offset = 1; offset < leftColumn.length; offset += 1) {
    const candidate = Object.freeze(
      leftColumn.map((_, index) => leftColumn[(index + offset) % leftColumn.length]!),
    );
    if (isValid(candidate)) return Object.freeze({ leftColumn, rightColumn: candidate });
  }
  throw new Error("learning_v2_factory_native_pair_shuffle_invalid");
}

function bodyRuns(text: string) {
  const runs: { text: string; semantic: "explanation" }[] = [];
  let cursor = 0;
  for (const match of text.matchAll(/`([^`]+)`/gu)) {
    const index = match.index ?? 0;
    if (index > cursor) runs.push({ text: text.slice(cursor, index), semantic: "explanation" });
    // Backticks preserve an authored language fragment, but do not establish
    // correctness: reviewed intros also use them for counterexamples.
    runs.push({ text: match[1]!, semantic: "explanation" });
    cursor = index + match[0].length;
  }
  if (cursor < text.length) runs.push({ text: text.slice(cursor), semantic: "explanation" });
  return Object.freeze(runs.length ? runs.map(Object.freeze) : [Object.freeze({ text, semantic: "explanation" as const })]);
}

function localizedRuns(value: unknown) {
  const source = localized(value);
  return Object.freeze(
    Object.fromEntries(LEARNING_V2_INTERFACE_LOCALES.map((locale) => [locale, bodyRuns(source[locale])])),
  );
}

function modeFeedback(
  raw: Plain,
  responseOptions: readonly { responseId: string; text: string }[],
  correctResponseId: string | null,
  oldPrefix: string,
  courseSessionId: string,
) {
  const wrongIds = responseOptions
    .map((option) => option.responseId)
    .filter((responseId) => responseId !== correctResponseId);
  const source = Array.isArray(raw.choiceFeedback)
    ? raw.choiceFeedback
    : [];
  return Object.freeze(source.map((candidate: unknown, index: number) => {
    const feedback = record(candidate);
    const responseId = wrongIds[index] ?? remapId(feedback.responseId, oldPrefix, courseSessionId);
    return Object.freeze({
      responseId,
      correct: false as const,
      testedDimension: String(feedback.testedDimension ?? "reviewed_factory_feedback"),
      feedbackByLocale: localized(feedback.feedbackByLocale),
    });
  }));
}

function nativeModePayload(
  rawValue: unknown,
  responseOptions: readonly { responseId: string; text: string }[],
  correctResponseId: string | null,
  oldPrefix: string,
  courseSessionId: string,
): LearningV2ModeNativePayloadV1 {
  const raw = record(rawValue);
  const family = String(raw.family);
  const feedback = ["listen_choose", "sound_contrast", "context_gap_grammar"].includes(family)
    ? modeFeedback(raw, responseOptions, correctResponseId, oldPrefix, courseSessionId)
    : Object.freeze([]);
  const audioTargetId = (value: unknown) => hashCanonicalBody({
    schemaVersion: "learning-v2-factory-native-audio-target.v1",
    courseSessionId,
    sourceAudioTargetId: remapId(value, oldPrefix, courseSessionId),
  });
  const audioRef = (value: unknown) => value === null
    ? null
    : Object.freeze({
        audioTargetId: audioTargetId(record(value).audioTargetId),
        transcript: String(record(value).transcript ?? ""),
      });
  if (family === "phrase_builder") return Object.freeze({
    family,
    targetPhrase: String(raw.targetPhrase),
    localizedMeaning: localized(raw.localizedMeaning),
    orderedTokens: Object.freeze((raw.orderedTokens as unknown[]).map(String)),
    authoredDistractorTokens: Object.freeze((raw.authoredDistractorTokens as unknown[]).map(String)),
    slotFeedback: feedback,
  });
  if (family === "listen_choose") return Object.freeze({
    family,
    referenceAudio: audioRef(raw.referenceAudio),
    slowReferenceAudio: audioRef(raw.slowReferenceAudio),
    localizedMeaningChoices: Object.freeze((raw.localizedMeaningChoices as unknown[]).map((value) => {
      const choice = record(value);
      return Object.freeze({
        responseId: remapId(choice.responseId, oldPrefix, courseSessionId),
        targetText: String(choice.targetText),
        meaningByLocale: choice.meaningByLocale === null ? null : localized(choice.meaningByLocale),
      });
    })),
    transcriptRevealPolicy: "after_first_attempt" as const,
    choiceFeedback: feedback,
  });
  if (family === "sound_contrast") return Object.freeze({
    family,
    contrastA: String(raw.contrastA), contrastB: String(raw.contrastB),
    ipaA: String(raw.ipaA ?? ""), ipaB: String(raw.ipaB ?? ""),
    audioA: audioRef(raw.audioA), audioB: audioRef(raw.audioB),
    testedPhoneticContrast: String(raw.testedPhoneticContrast),
    choiceFeedback: feedback,
  });
  if (family === "listen_build_dictation") return Object.freeze({
    family,
    referenceAudio: audioRef(raw.referenceAudio),
    slowReferenceAudio: audioRef(raw.slowReferenceAudio),
    hiddenTargetPhrase: String(raw.hiddenTargetPhrase),
    orderedTokens: Object.freeze((raw.orderedTokens as unknown[]).map(String)),
    authoredDistractorTokens: Object.freeze((raw.authoredDistractorTokens as unknown[]).map(String)),
    slotFeedback: feedback,
  });
  if (family === "context_gap_grammar") return Object.freeze({
    family,
    localizedScene: localized(raw.localizedScene),
    gappedTargetPhrase: String(raw.gappedTargetPhrase),
    gapOptions: Object.freeze(responseOptions),
    testedDimension: String(raw.testedDimension),
    choiceFeedback: feedback,
  });
  if (family === "speed_match") {
    const pairGrid = Object.freeze((raw.pairGrid as unknown[]).map((value) => {
      const pair = record(value);
      return Object.freeze({
        pairId: remapId(pair.pairId, oldPrefix, courseSessionId),
        target: String(pair.target),
        meaningByLocale: localized(pair.meaningByLocale),
      });
    }));
    const pairIds = Object.freeze(pairGrid.map((pair) => pair.pairId));
    const boardSeed = `${courseSessionId}:${pairIds.join(":")}`;
    const { leftColumn, rightColumn } = factoryNativeSpeedMatchColumnsV1(pairIds, boardSeed);
    return Object.freeze({
      family, pairGrid, leftColumn, rightColumn,
      pairingKey: "pair_id" as const,
      timerPolicy: Object.freeze({ enabledByDefault: true as const, learnerCanDisable: true as const, pausesOnInterruption: true as const }),
      finishStats: Object.freeze(["speed", "accuracy", "personal_best"] as const),
    });
  }
  if (family === "scripted_repeat_compare") return Object.freeze({
    family,
    referenceAudio: audioRef(raw.referenceAudio), slowReferenceAudio: audioRef(raw.slowReferenceAudio),
    targetPhrase: String(raw.targetPhrase),
    recordControlPolicy: "hold_press_release_with_accessible_toggle" as const,
    modelPlayback: "reference_and_slow" as const,
    learnerPlayback: "available_after_capture" as const,
    honestOutcomeStates: Object.freeze(["PASS_CONFIDENT", "NEEDS_WORK_CONFIDENT", "UNCERTAIN", "INVALID_AUDIO_OR_SYSTEM"] as const),
  });
  throw new Error(`learning_v2_factory_native_family_unsupported:${family}`);
}

function shortMeaning(definition: string, word: string, lessonOrdinal: number, sessionOrdinal: number): string {
  const quoted = /[«“"]([^»”"]+)[»”"]/u.exec(definition)?.[1]?.trim();
  if (quoted) return quoted;
  // The one card is the sole reviewed card without a short quoted gloss.
  // Preserve its exact reviewed definition instead of inventing a word-level
  // translation from a later phrase.
  if (word.toLocaleLowerCase("en") === "one" && lessonOrdinal === 2 && sessionOrdinal === 29)
    return definition.trim();
  throw new Error("learning_v2_factory_native_word_translation_missing");
}

function localizedWordMeaning(
  definitions: LearningV2CourseSessionLocalizedTextV1,
  word: string,
  lessonOrdinal: number,
  sessionOrdinal: number,
): LearningV2CourseSessionLocalizedTextV1 {
  const ru = shortMeaning(definitions.ru, word, lessonOrdinal, sessionOrdinal);
  const uk = shortMeaning(definitions.uk, word, lessonOrdinal, sessionOrdinal);
  return localized({ ru, uk });
}

function lexicalSense(
  word: string,
  lessonOrdinal: number,
  sessionOrdinal: number,
): string {
  const normalized = word.normalize("NFKC").trim().toLocaleLowerCase("en");
  if (normalized === "busy") return lessonOrdinal === 1 && sessionOrdinal === 30 ? "place-crowded" : "person-occupied";
  if (normalized === "full") return lessonOrdinal === 1 && sessionOrdinal === 45 ? "container-filled" : "person-satiated";
  if (normalized === "free") return lessonOrdinal === 1 && sessionOrdinal === 30 ? "without-charge" : "available";
  if (normalized === "late") return lessonOrdinal === 1 && sessionOrdinal === 26 ? "late-time" : "late-arrival";
  if (normalized === "cold")
    return lessonOrdinal === 1 && [3, 25].includes(sessionOrdinal) ? "person-feeling" : "temperature";
  if (normalized === "hot") return lessonOrdinal === 1 && sessionOrdinal === 5 ? "person-feeling" : "temperature";
  return "default-reviewed-sense";
}

function learnerPrompt(title: string, family: string, correctText: string): string {
  let prompt = title;
  const normalizedCorrect = correctText.toLowerCase().replace(/[.?!]$/u, "");
  const tail = /\s+—\s+(.+)$/u.exec(prompt);
  if (tail && normalizedCorrect &&
    tail[1]!.toLowerCase().replace(/[.?!]$/u, "") === normalizedCorrect) {
    prompt = prompt.slice(0, tail.index).trim();
  }
  if (family === "speed_match") {
    prompt = prompt.replace(/\s*\(Speed Match,\s*[4-7]\s+(?:пар|пары|пари)\)\s*$/iu, "").trim();
  }
  return prompt;
}

function localizedSceneMeaning(value: LearningV2CourseSessionLocalizedTextV1) {
  return Object.freeze(Object.fromEntries(LEARNING_V2_INTERFACE_LOCALES.map((locale) => [
    locale,
    value[locale].replace(/^.+?\s+—\s+/u, "").trim(),
  ]))) as LearningV2CourseSessionLocalizedTextV1;
}

function localizedQuotedMeaning(value: LearningV2CourseSessionLocalizedTextV1) {
  return Object.freeze(Object.fromEntries(LEARNING_V2_INTERFACE_LOCALES.map((locale) => {
    const quotes = [...value[locale].matchAll(/«([^»]+)»/gu)];
    return [locale, quotes.at(-1)?.[1]?.trim() || localizedSceneMeaning(value)[locale]];
  }))) as LearningV2CourseSessionLocalizedTextV1;
}

function reviewedQuotedMeaning(
  value: LearningV2CourseSessionLocalizedTextV1,
): LearningV2CourseSessionLocalizedTextV1 | null {
  const ru = [...value.ru.matchAll(/«([^»]+)»/gu)].at(-1)?.[1]?.trim();
  const uk = [...value.uk.matchAll(/«([^»]+)»/gu)].at(-1)?.[1]?.trim();
  return ru && uk ? localized({ ru, uk }) : null;
}

function practiceSaveProjection(
  interaction: LearningV2CourseSessionPracticeInteractionV1,
  correctResponseId: string | null,
  correctText: string,
  fallbackMeaning: LearningV2CourseSessionLocalizedTextV1,
) {
  const mode = interaction.modePayload;
  if (mode?.family === "phrase_builder")
    return { targetText: mode.targetPhrase, meaningByLocale: localizedSceneMeaning(mode.localizedMeaning) };
  if (mode?.family === "listen_build_dictation")
    return { targetText: mode.hiddenTargetPhrase, meaningByLocale: localizedSceneMeaning(fallbackMeaning) };
  if (mode?.family === "context_gap_grammar") {
    const correct = interaction.responseOptions.find((option) => option.responseId === correctResponseId)?.text ?? correctText;
    return {
      targetText: mode.gappedTargetPhrase.replace(/_{2,}/u, correct),
      meaningByLocale: localizedSceneMeaning(mode.localizedScene),
    };
  }
  if (mode?.family === "speed_match") {
    const firstPair = mode.pairGrid[0]!;
    return {
      targetText: firstPair.target,
      meaningByLocale: firstPair.meaningByLocale,
    };
  }
  const visibleCorrect = interaction.responseOptions.find((option) => option.responseId === correctResponseId)?.text ?? correctText;
  return { targetText: visibleCorrect, meaningByLocale: localizedSceneMeaning(fallbackMeaning) };
}

export function factoryNativeLearningV2InitialRewardBindingV1() {
  const row = FACTORY_NATIVE_MANIFEST_V1.find((candidate) => candidate.lessonOrdinal === 1 && candidate.sessionOrdinal === 1);
  if (!row) throw new Error("learning_v2_factory_native_initial_session_missing");
  const learner = record(row.loadLearner("ru"));
  if (!Array.isArray(learner.interactions)) throw new Error("learning_v2_factory_native_initial_session_invalid");
  const courseSessionId = learningV2CourseSessionIdV1(1, 1);
  return Object.freeze({
    sourceFingerprint: row.sourceFingerprint,
    interactionIds: Object.freeze([
      `${courseSessionId}:intro1:q`, `${courseSessionId}:intro2:q`, `${courseSessionId}:intro3:q`,
      ...learner.interactions.flatMap((value) => {
        const interaction = record(value);
        return record(interaction.modePayload).isWordCard === true
          ? [] : [remapId(interaction.interactionId, "en:lesson-01:session-01", courseSessionId)];
      }),
    ]),
  });
}

export function materializeFactoryNativeLearningV2SessionV1(input: Readonly<{
  lessonOrdinal: number;
  sessionOrdinal: number;
  interfaceLocale: LearningV2InterfaceLocale;
}>) {
  const row = FACTORY_NATIVE_MANIFEST_V1.find((candidate) =>
    candidate.lessonOrdinal === input.lessonOrdinal && candidate.sessionOrdinal === input.sessionOrdinal);
  if (!row || !LEARNING_V2_INTERFACE_LOCALES.includes(input.interfaceLocale)) return null;
  const authoredLocale = FACTORY_NATIVE_DISPLAY_LOCALE_FALLBACK_V1[input.interfaceLocale];
  const courseSessionId = learningV2CourseSessionIdV1(row.lessonOrdinal, row.sessionOrdinal);
  const rawIntro = record(row.loadIntro());
  const rawPages = rawIntro.pages as unknown[];
  const oldPrefix = String(record(rawPages[0]).pageId).replace(/:intro1$/u, "");
  const introPages = rawPages.map((value, pageIndex) => {
    const page = record(value);
    const question = record(page.question);
    const choiceSource = record(question.choicesByLocale);
    const choicesByLocale = Object.freeze(Object.fromEntries(
      LEARNING_V2_INTERFACE_LOCALES.map((locale) => {
        const sourceLocale = FACTORY_NATIVE_DISPLAY_LOCALE_FALLBACK_V1[locale];
        const choices = (choiceSource[sourceLocale] ?? choiceSource.ru) as unknown[];
        return [locale, Object.freeze(choices.map((choice) => String(record(choice).text)))];
      }),
    )) as LearningV2CourseSessionIntroPageV1["question"]["choicesByLocale"];
    const bodies = localized(page.bodyByLocale);
    return Object.freeze({
      pageOrdinal: (pageIndex + 1) as 1 | 2 | 3,
      pageId: remapId(page.pageId, oldPrefix, courseSessionId),
      kind: page.kind,
      titleByLocale: localized(page.titleByLocale),
      bodyByLocale: Object.freeze(Object.fromEntries(LEARNING_V2_INTERFACE_LOCALES.map((locale) => [locale, bodyRuns(bodies[locale]).map((run) => run.text).join("")]))),
      bodyRunsByLocale: localizedRuns(page.bodyByLocale),
      question: Object.freeze({
        interactionId: remapId(question.interactionId, oldPrefix, courseSessionId),
        promptByLocale: localized({
          ru: row.introPromptByAuthoredLocale.ru[pageIndex],
          uk: row.introPromptByAuthoredLocale.uk[pageIndex],
        }),
        choicesByLocale,
        accessibilityLabelByLocale: localized({
          ru: row.introPromptByAuthoredLocale.ru[pageIndex],
          uk: row.introPromptByAuthoredLocale.uk[pageIndex],
        }),
      }),
    });
  }) as unknown as readonly [
    LearningV2CourseSessionIntroPageV1,
    LearningV2CourseSessionIntroPageV1,
    LearningV2CourseSessionIntroPageV1,
  ];
  const introChild = materializeLearningV2CourseSessionIntroChildV1({
    courseSessionId,
    learningOutcomeByLocale: localized(row.learningOutcomeByAuthoredLocale),
    pages: introPages,
  });

  const rawLearner = record(row.loadLearner(authoredLocale));
  const rawInteractions = rawLearner.interactions as unknown[];
  const rawAnswers = row.loadAnswers();
  if (!Array.isArray(rawAnswers)) throw new Error("learning_v2_factory_native_answers_invalid");
  const answers = new Map(rawAnswers.map((value) => {
    const answer = record(value);
    return [String(answer.interactionId), answer] as const;
  }));
  const titleByOrdinal = new Map(row.practiceTitlesByAuthoredLocale[authoredLocale].map((entry) => [entry.ordinal, entry.title]));
  const interactions: LearningV2CourseSessionPracticeInteractionV1[] = [];
  const practiceSemantics = new Map<string, LearningV2FactoryNativePracticeSemanticV1>();
  const cardQueues = new Map<string, LearningV2FactoryNativeNewWordEncounterV1[]>();
  let pendingCards: LearningV2FactoryNativeNewWordEncounterV1[] = [];
  let wordOrder = 0;
  for (const rawValue of rawInteractions) {
    const raw = record(rawValue);
    const rawMode = record(raw.modePayload);
    const oldInteractionId = String(raw.interactionId);
    if (rawMode.isWordCard === true) {
      const definitionByLocale = localized(record(rawMode.wordCard).definitionByLocale);
      const word = String(record(rawMode.wordCard).word);
      const meaningByLocale = localizedWordMeaning(
        definitionByLocale, word, row.lessonOrdinal, row.sessionOrdinal,
      );
      const save = materializeLearningV2CourseSessionSavablePhraseV1({ targetLanguage: "en", targetText: word, meaningByLocale });
      wordOrder += 1;
      pendingCards.push(Object.freeze({
        encounterId: `${remapId(oldInteractionId, oldPrefix, courseSessionId)}:word-card`,
        lexicalItemId: `lexical-en-${hashCanonicalBody({
          word,
          sense: lexicalSense(word, row.lessonOrdinal, row.sessionOrdinal),
        }).slice(0, 32)}`,
        transcription: null,
        playfulMeaningByLocale: definitionByLocale,
        motionVariant: wordOrder % 2 === 0 ? "premium_a" : "lesson_hero_b",
        presentation: "blocking_task_overlay", dismissal: "continue_only", saveControl: "bookmark_icon",
        orderWithinSession: wordOrder,
        save,
      }));
      continue;
    }
    const answer = answers.get(oldInteractionId);
    if (!answer) throw new Error("learning_v2_factory_native_answer_missing");
    let responseOptions = Object.freeze((raw.responseOptions as unknown[]).map((value) => {
      const option = record(value);
      return Object.freeze({ responseId: remapId(option.responseId, oldPrefix, courseSessionId), text: String(option.text) });
    }));
    const correctResponseId = answer.correctResponseId === null ? null : remapId(answer.correctResponseId, oldPrefix, courseSessionId);
    if (raw.inputMode === "ordered_tokens") {
      const tileTexts = [...(rawMode.orderedTokens as unknown[]), ...(rawMode.authoredDistractorTokens as unknown[])].map(String);
      responseOptions = Object.freeze(tileTexts.map((text, index) => Object.freeze({
        responseId: `${remapId(oldInteractionId, oldPrefix, courseSessionId)}:t${String(index + 1).padStart(2, "0")}`,
        text,
      })));
    }
    const modePayload = nativeModePayload(raw.modePayload, responseOptions, correctResponseId, oldPrefix, courseSessionId);
    const interactionId = remapId(oldInteractionId, oldPrefix, courseSessionId);
    const title = titleByOrdinal.get(Number(String(oldInteractionId).match(/:i(\d+)$/u)?.[1])) ?? String(raw.prompt);
    const prompt = learnerPrompt(title, String(raw.family), String(answer.correctText ?? ""));
    interactions.push(Object.freeze({
      interactionId,
      ordinal: interactions.length + 4,
      purpose: raw.purpose,
      family: raw.family,
      inputMode: raw.inputMode,
      prompt,
      responseOptions,
      mediaIds: Object.freeze((raw.mediaIds as unknown[]).map((id) => remapId(id, oldPrefix, courseSessionId))),
      audioTargetIds: Object.freeze((raw.audioTargetIds as unknown[]).map((id) => hashCanonicalBody({
        schemaVersion: "learning-v2-factory-native-audio-target.v1",
        courseSessionId,
        sourceAudioTargetId: remapId(id, oldPrefix, courseSessionId),
      }))),
      accessibilityLabel: prompt,
      modePayload,
      scriptedAlternate: null,
    }) as LearningV2CourseSessionPracticeInteractionV1);
    if (pendingCards.length) {
      cardQueues.set(interactionId, pendingCards);
      pendingCards = [];
    }
  }
  if (pendingCards.length) throw new Error("learning_v2_factory_native_terminal_word_card");
  const interactionProfile = interactions.filter((entry) => entry.family === "scripted_repeat_compare").length >= 4
    ? "voice_heavy" as const
    : interactions.length >= 18 ? "rapid" as const : "standard" as const;
  const learnerChild = materializeLearningV2CourseSessionLearnerChildV1({ courseSessionId, targetLanguage: "en", interactionProfile, interactions });

  const evaluatorEntries: LearningV2CourseSessionEvaluatorCapsuleEntryV1[] = [];
  const auxiliaryEntries: LearningV2CourseSessionAuxiliaryEntryV1[] = [];
  introChild.pages.forEach((page, pageIndex) => {
    const correctIndex = row.introCorrectChoiceIndexes[pageIndex]!;
    const accepted = page.question.choicesByLocale[authoredLocale][correctIndex];
    if (!accepted) throw new Error("learning_v2_factory_native_intro_answer_missing");
    evaluatorEntries.push({
      interactionId: page.question.interactionId,
      activityId: `${page.question.interactionId}:activity`, capsuleId: `${page.question.interactionId}:capsule`,
      family: "phrase_builder", normalizationLocale: "en", salt: sha256Utf8(`${row.sourceFingerprint}:${page.question.interactionId}`),
      acceptedResponses: [accepted],
    });
    const save = materializeLearningV2CourseSessionSavablePhraseV1({ targetLanguage: "en", targetText: accepted, meaningByLocale: localizedQuotedMeaning(page.question.promptByLocale) });
    const introFeedback = localized({
      ru: row.introWrongFeedbackByAuthoredLocale.ru[pageIndex]?.[0],
      uk: row.introWrongFeedbackByAuthoredLocale.uk[pageIndex]?.[0],
    });
    const wrongChoiceIndexes = page.question.choicesByLocale.ru
      .map((_, index) => index)
      .filter((index) => index !== correctIndex);
    const responseFeedbackById = Object.freeze(Object.fromEntries(
      wrongChoiceIndexes.map((choiceIndex, feedbackIndex) => [
        `${page.question.interactionId.replace(/:q$/u, "")}:r${choiceIndex + 1}`,
        localized({
          ru: row.introWrongFeedbackByAuthoredLocale.ru[pageIndex]?.[feedbackIndex],
          uk: row.introWrongFeedbackByAuthoredLocale.uk[pageIndex]?.[feedbackIndex],
        }),
      ]),
    ));
    auxiliaryEntries.push(Object.freeze({
      interactionId: page.question.interactionId,
      report: Object.freeze({ available: true, reportContextRef: `${page.question.interactionId}:report`, screen: "learning_v2_session" }),
      save, voice: Object.freeze({ available: true, tapToRecordAllowed: true, holdToTalkAllowed: true }),
      secondErrorExplanationRef: `${page.question.interactionId}:feedback`,
      secondErrorExplanationByLocale: introFeedback,
      responseFeedbackById,
    }));
  });
  learnerChild.interactions.forEach((interaction) => {
    const oldId = remapText(interaction.interactionId, courseSessionId, oldPrefix);
    const answer = answers.get(oldId)!;
    let acceptedResponses: readonly string[];
    if (interaction.inputMode === "single_choice") acceptedResponses = [remapId(answer.correctResponseId, oldPrefix, courseSessionId)];
    else if (interaction.inputMode === "pair_grid") acceptedResponses = ["all_pairs_matched"];
    else if (interaction.modePayload?.family === "phrase_builder") acceptedResponses = [interaction.modePayload.orderedTokens.join(" ")];
    else if (interaction.modePayload?.family === "listen_build_dictation") acceptedResponses = [interaction.modePayload.orderedTokens.join(" ")];
    else acceptedResponses = [String(answer.correctText)];
    evaluatorEntries.push({
      interactionId: interaction.interactionId,
      activityId: `${interaction.interactionId}:activity`, capsuleId: `${interaction.interactionId}:capsule`,
      family: interaction.family, normalizationLocale: "en", salt: sha256Utf8(`${row.sourceFingerprint}:${interaction.interactionId}`),
      acceptedResponses,
    });
    const promptByLocale = localized({
      ru: row.practiceTitlesByAuthoredLocale.ru.find((entry) => entry.ordinal === Number(oldId.match(/:i(\d+)$/u)?.[1]))?.title ?? interaction.prompt,
      uk: row.practiceTitlesByAuthoredLocale.uk.find((entry) => entry.ordinal === Number(oldId.match(/:i(\d+)$/u)?.[1]))?.title ?? interaction.prompt,
    });
    const saveProjection = practiceSaveProjection(
      interaction,
      answer.correctResponseId === null ? null : remapId(answer.correctResponseId, oldPrefix, courseSessionId),
      String(answer.correctText ?? ""),
      promptByLocale,
    );
    const exactModeMeaning = interaction.modePayload?.family === "listen_choose"
      ? interaction.modePayload.localizedMeaningChoices.find((choice) =>
          choice.responseId === (answer.correctResponseId === null ? null : remapId(answer.correctResponseId, oldPrefix, courseSessionId)))?.meaningByLocale ?? null
      : interaction.modePayload?.family === "speed_match"
        ? interaction.modePayload.pairGrid[0]?.meaningByLocale ?? null
        : interaction.modePayload?.family === "phrase_builder"
          ? reviewedQuotedMeaning(interaction.modePayload.localizedMeaning)
          : reviewedQuotedMeaning(promptByLocale);
    practiceSemantics.set(interaction.interactionId, Object.freeze({
      canonicalTarget: saveProjection.targetText,
      reviewedMeaningByLocale: exactModeMeaning,
    }));
    const save = materializeLearningV2CourseSessionSavablePhraseV1({ targetLanguage: "en", ...saveProjection });
    const feedback = interaction.modePayload && "choiceFeedback" in interaction.modePayload
      ? interaction.modePayload.choiceFeedback
      : [];
    const responseFeedbackById = feedback.length ? Object.freeze(Object.fromEntries(feedback.map((entry) => [entry.responseId, entry.feedbackByLocale]))) : undefined;
    auxiliaryEntries.push(Object.freeze({
      interactionId: interaction.interactionId,
      report: Object.freeze({ available: true, reportContextRef: `${interaction.interactionId}:report`, screen: "learning_v2_session" }),
      save, voice: Object.freeze({ available: true, tapToRecordAllowed: true, holdToTalkAllowed: true }),
      secondErrorExplanationRef: `${interaction.interactionId}:feedback`,
      secondErrorExplanationByLocale: feedback[0]?.feedbackByLocale ?? promptByLocale,
      ...(responseFeedbackById ? { responseFeedbackById } : {}),
    }));
  });
  const evaluatorCapsuleChild = materializeLearningV2CourseSessionEvaluatorCapsuleChildV1({ courseSessionId, entries: evaluatorEntries });
  const auxiliaryChild = materializeLearningV2CourseSessionAuxiliaryChildV1({ courseSessionId, entries: auxiliaryEntries });
  return Object.freeze({
    courseSessionId,
    sourceFingerprint: row.sourceFingerprint,
    localeResolution: Object.freeze({
      requestedLocale: input.interfaceLocale,
      authoredLocale,
      kind: input.interfaceLocale === authoredLocale ? "authored" as const : "explicit_display_fallback" as const,
    }),
    introChild, learnerChild, evaluatorCapsuleChild, auxiliaryChild,
    wordEncounterQueuesByInteractionId: Object.freeze(Object.fromEntries(
      [...cardQueues.entries()].map(([interactionId, encounters]) => [interactionId, Object.freeze(encounters)]),
    )),
    practiceSemanticsByInteractionId: Object.freeze(Object.fromEntries(practiceSemantics)),
    deviceSpeechFingerprint: hashCanonicalBody(learnerChild.interactions.map((entry) => ({ interactionId: entry.interactionId, audioTargetIds: entry.audioTargetIds, modePayload: entry.modePayload }))),
  });
}
