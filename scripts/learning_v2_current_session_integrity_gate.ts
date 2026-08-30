import { pathToFileURL } from "node:url";

import { authoredLearningV2SessionSource } from "../modules/learning-v2/content/source/authored_sessions_v1";
import { evaluateLearningV2SessionContentQuality } from "../modules/learning-v2/content/source/learning_content_quality_gate_v1";
import { evaluateLearningV2LearnerProjectionIntegrityV1 } from "../modules/learning-v2/content/source/learning_v2_learner_projection_integrity_v1";
import { buildLearningV2AuthoringDevicePreviewV1 } from "../modules/learning-v2/preview/authoring_device_preview_v1";
import { LEARNING_V2_INTERFACE_LOCALES } from "../modules/learning-v2/content/generator_course_contract";
import type { SessionSource } from "../modules/learning-v2/content/source/session_shard_from_source_v1";
import { EPISODE_01_SESSION_MAP_V1 } from "../modules/learning-v2/content/source/episode_01_session_map_v1";

const REVIEW_ONLY_ISSUES = new Set([
  "quality_review_missing",
  "quality_review_stale",
  "quality_review_rejected",
  "quality_review_not_independent",
  "locale_review_missing",
]);

export function assertLearningV2NewVocabularyProgressionV1(
  sources: readonly SessionSource[],
): void {
  const previouslyIntroduced = new Set<string>();
  for (const source of sources) {
    const targets = source.newVocabulary ?? [];
    if (targets.length < 1) {
      throw new Error(`session_new_vocabulary_missing:${source.requiredSessionOrdinal}`);
    }
    for (const entry of targets) {
      const key = entry.target.normalize("NFKC").trim().toLocaleLowerCase("en");
      if (previouslyIntroduced.has(key)) {
        throw new Error(
          `session_new_vocabulary_reused:${source.requiredSessionOrdinal}:${entry.target}`,
        );
      }
      previouslyIntroduced.add(key);
    }
  }
}

const GRAMMAR_FEATURE = /(?:copula|person|singular|plural|contraction|negation|question|interrogative|agreement|article|possessive|demonstrative|tense|aspect|modal|preposition|comparative|superlative|infinitive|gerund|pronoun|determiner|word_order|imperative)/iu;

const SURFACE_GRAMMAR_RULES = Object.freeze([
  { id: "to_construction", pattern: /\bto\b/iu },
  { id: "negation", pattern: /\bnot\b|n['’]t\b/iu },
  { id: "question", pattern: /\?/u },
  { id: "article", pattern: /\b(?:a|an|the)\b/iu },
  { id: "second_person", pattern: /^\s*you\b/iu },
  { id: "third_person_subject", pattern: /^\s*(?:he|she|it)\b/iu },
  { id: "plural_subject", pattern: /^\s*(?:we|they)\b/iu },
  { id: "demonstrative", pattern: /\b(?:this|that|these|those)\b/iu },
  { id: "possessive", pattern: /\b(?:my|your|his|her|its|our|their)\b/iu },
  { id: "have_construction", pattern: /\b(?:have|has)\b/iu },
  { id: "modal", pattern: /\b(?:can|could|may|might|must|should|would|will)\b/iu },
] as const);

function surfaceGrammarIds(source: SessionSource): readonly string[] {
  const targets = source.phrases.map((phrase) => phrase.english).join("\n");
  return SURFACE_GRAMMAR_RULES
    .filter((rule) => rule.pattern.test(targets))
    .map((rule) => rule.id);
}

export function assertLearningV2CurrentGrammarGetsFullSessionV1(
  sources: readonly SessionSource[],
): void {
  const current = sources.at(-1);
  if (!current) throw new Error("grammar_progression_current_source_missing");
  const previousFeatures = new Set(
    sources.slice(0, -1).flatMap((source) =>
      source.phrases.flatMap((phrase) => phrase.features.filter((feature) => GRAMMAR_FEATURE.test(feature))),
    ),
  );
  const currentGrammar = new Set(
    current.phrases.flatMap((phrase) => phrase.features.filter((feature) => GRAMMAR_FEATURE.test(feature))),
  );
  const previousSurfaceGrammar = new Set(
    sources.slice(0, -1).flatMap((source) => surfaceGrammarIds(source)),
  );
  const currentSurfaceGrammar = surfaceGrammarIds(current);
  const newGrammar = [
    ...[...currentGrammar].filter((feature) => !previousFeatures.has(feature)),
    ...currentSurfaceGrammar.filter((feature) => !previousSurfaceGrammar.has(feature)),
  ].filter((feature, index, all) => all.indexOf(feature) === index);
  if (newGrammar.length === 0) {
    throw new Error(`session_new_grammar_missing:${current.requiredSessionOrdinal}`);
  }
  const mapEntry = EPISODE_01_SESSION_MAP_V1[current.requiredSessionOrdinal - 1];
  if (!mapEntry) throw new Error(`grammar_session_map_missing:${current.requiredSessionOrdinal}`);
  const undeclared = newGrammar.filter((feature) => !mapEntry.teaches.includes(feature));
  if (undeclared.length > 0) {
    throw new Error(
      `new_grammar_hidden_inside_session:${current.requiredSessionOrdinal}:${undeclared.join(",")}`,
    );
  }
  if (current.introPages.length !== 3 || (current.modeNativePractice?.length ?? 0) !== 17) {
    throw new Error(
      `new_grammar_requires_full_session:${current.requiredSessionOrdinal}:${newGrammar.join(",")}`,
    );
  }
  const introGrammar = current.introPages.map((page) => page.question.grammarFeatureId?.trim() ?? "");
  const introDimensions = current.introPages.map((page) => page.question.testedDimension?.trim() ?? "");
  if (introGrammar.some((value) => value.length === 0) || introGrammar.some((value) => !newGrammar.includes(value))) {
    throw new Error(`intro_grammar_focus_missing_or_stale:${current.requiredSessionOrdinal}:${introGrammar.join(",")}`);
  }
  if (new Set(introDimensions).size !== 3 || introDimensions.some((value) => value.length === 0)) {
    throw new Error(`intro_grammar_dimensions_not_distinct:${current.requiredSessionOrdinal}`);
  }
  const unexplained = newGrammar.filter((feature) => !introGrammar.includes(feature));
  if (unexplained.length > 0) {
    throw new Error(`grammar_used_before_intro_explanation:${current.requiredSessionOrdinal}:${unexplained.join(",")}`);
  }
  for (const [pageIndex, page] of current.introPages.entries()) {
    const choices = page.question.choices.map((choice) => choice.ru.trim());
    if (choices.some((choice) => !/[A-Za-z]/u.test(choice))) {
      throw new Error(`intro_native_language_answer_forbidden:${current.requiredSessionOrdinal}:${pageIndex + 1}`);
    }
    const correct = choices[page.question.correctChoiceIndex]!;
    if (!page.body.ru.includes(correct)) {
      throw new Error(`intro_correct_grammar_not_taught_in_body:${current.requiredSessionOrdinal}:${pageIndex + 1}`);
    }
  }
}

export function assertLearningV2IntroGrammarQuestionsV1(source: SessionSource): void {
  if (source.introPages.length !== 3) {
    throw new Error(`intro_grammar_page_count_invalid:${source.requiredSessionOrdinal}`);
  }
  const dimensions = new Set<string>();
  for (const [pageIndex, page] of source.introPages.entries()) {
    const feature = page.question.grammarFeatureId?.trim() ?? "";
    const dimension = page.question.testedDimension?.trim() ?? "";
    if (!feature || !dimension) {
      throw new Error(`intro_grammar_metadata_missing:${source.requiredSessionOrdinal}:${pageIndex + 1}`);
    }
    dimensions.add(dimension);
    const choices = page.question.choices.map((choice) => choice.ru.trim());
    if (choices.some((choice) => !/[A-Za-z]/u.test(choice))) {
      throw new Error(`intro_native_language_answer_forbidden:${source.requiredSessionOrdinal}:${pageIndex + 1}`);
    }
    const correct = choices[page.question.correctChoiceIndex]!;
    if (!page.body.ru.includes(correct)) {
      throw new Error(`intro_correct_grammar_not_taught_in_body:${source.requiredSessionOrdinal}:${pageIndex + 1}`);
    }
  }
  if (dimensions.size !== 3) {
    throw new Error(`intro_grammar_dimensions_not_distinct:${source.requiredSessionOrdinal}`);
  }
}

const LETTER_ASSEMBLY_INSTRUCTION = /(?:letter|букв|літер|letra|chữ|huruf|litera)/iu;
const COMPLETE_ONE_LETTER_WORDS = new Set(["I", "a", "A"]);

export function assertLearningV2NoLetterLevelAssemblyV1(source: SessionSource): void {
  for (const [index, step] of (source.modeNativePractice ?? []).entries()) {
    if (Object.values(step.instruction ?? {}).some((text) => typeof text === "string" && LETTER_ASSEMBLY_INSTRUCTION.test(text))) {
      throw new Error(`letter_level_assembly_instruction_forbidden:${source.requiredSessionOrdinal}:${index + 1}`);
    }
    const payload = step.modePayload;
    if (payload.family !== "phrase_builder" && payload.family !== "listen_build_dictation") continue;
    const target = payload.family === "phrase_builder" ? payload.targetPhrase : payload.hiddenTargetPhrase;
    // зачем аннотация (2026-08-30): ?? [] выводил never[] и ломал includes.
    const completeWords: string[] = target.match(/[A-Za-z]+(?:['’][A-Za-z]+)?/gu) ?? [];
    if (completeWords.length === 0) {
      throw new Error(`builder_target_has_no_complete_words:${source.requiredSessionOrdinal}:${index + 1}`);
    }
    const invalid = payload.orderedTokens.filter((token) =>
      !completeWords.includes(token) &&
      !COMPLETE_ONE_LETTER_WORDS.has(token)
    );
    const singleTargetIsAtomic = completeWords.length !== 1 ||
      (payload.orderedTokens.length === 1 && payload.orderedTokens[0] === completeWords[0]);
    if (invalid.length > 0 || !singleTargetIsAtomic) {
      throw new Error(`letter_level_assembly_forbidden:${source.requiredSessionOrdinal}:${index + 1}:${invalid.join(",")}`);
    }
  }
}

export function assertLearningV2CurrentSessionIntegrityV1(
  sessionOrdinal: number,
): void {
  const source = authoredLearningV2SessionSource(sessionOrdinal);
  if (!source) {
    throw new Error(`current_session_source_missing:${sessionOrdinal}`);
  }
  const progression: SessionSource[] = [];
  for (let ordinal = 1; ordinal <= sessionOrdinal; ordinal += 1) {
    const candidate = authoredLearningV2SessionSource(ordinal);
    if (!candidate) throw new Error(`vocabulary_progression_source_missing:${ordinal}`);
    progression.push(candidate);
  }
  assertLearningV2NewVocabularyProgressionV1(progression);
  assertLearningV2CurrentGrammarGetsFullSessionV1(progression);
  progression.forEach(assertLearningV2IntroGrammarQuestionsV1);
  progression.forEach(assertLearningV2NoLetterLevelAssemblyV1);
  const contentIssues = evaluateLearningV2SessionContentQuality(source).issues.filter(
    (issue) => !REVIEW_ONLY_ISSUES.has(issue.code),
  );
  if (contentIssues.length > 0) {
    throw new Error(
      `current_session_content_integrity_hold:${sessionOrdinal}\n${contentIssues
        .slice(0, 30)
        .map((issue) => `${issue.code}:${issue.path}:${issue.message}`)
        .join("\n")}`,
    );
  }

  const projectionIssues = LEARNING_V2_INTERFACE_LOCALES.flatMap((locale) => {
    const preview = buildLearningV2AuthoringDevicePreviewV1(sessionOrdinal, locale);
    return evaluateLearningV2LearnerProjectionIntegrityV1({
      learnerChild: preview.learnerChild,
      evaluatorCapsuleChild: preview.evaluatorCapsuleChild,
      auxiliaryChild: preview.auxiliaryChild,
    }).issues.map((issue) => ({ locale, issue }));
  });
  if (projectionIssues.length > 0) {
    throw new Error(
      `current_session_projection_integrity_hold:${sessionOrdinal}\n${projectionIssues
        .map(({ locale, issue }) => `${locale}:${issue.code}:${issue.interactionId}:${issue.message}`)
        .join("\n")}`,
    );
  }
}

function readSessionOrdinal(argv: readonly string[]): number {
  const equals = argv.find((argument) => argument.startsWith("--session="));
  const spacedIndex = argv.indexOf("--session");
  const raw = equals?.slice("--session=".length) ??
    (spacedIndex >= 0 ? argv[spacedIndex + 1] : undefined);
  const parsed = Number.parseInt(String(raw ?? ""), 10);
  if (!Number.isInteger(parsed) || parsed < 1 || parsed > 56) {
    throw new Error("current_session_integrity_argument_invalid: use --session <1..56>");
  }
  return parsed;
}

const isDirectRun = process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href;
if (isDirectRun) {
  try {
    const ordinal = readSessionOrdinal(process.argv.slice(2));
    assertLearningV2CurrentSessionIntegrityV1(ordinal);
    process.stdout.write(
      `LEARNING V2 CURRENT SESSION INTEGRITY: PASS session=${ordinal}\n`,
    );
  } catch (error) {
    process.stderr.write(
      `LEARNING V2 CURRENT SESSION INTEGRITY: HOLD\n${
        error instanceof Error ? error.message : String(error)
      }\n`,
    );
    process.exitCode = 1;
  }
}
