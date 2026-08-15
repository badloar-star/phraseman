import { hashCanonicalBody } from "../policies/decision_registry";
import {
  evaluateLearningV2EvidenceRulesV1,
  type LearningV2EvidenceReportV1,
  type LearningV2InteractionModeV1,
} from "./evidence_based_quality_rules_v1";

/**
 * Банк фраз урока — учебный материал, из которого собираются задания.
 *
 * зачем: фразы приходят от генерирующего агента, и им НЕЛЬЗЯ верить на слово.
 * Здесь они проходят структурную проверку и гейты из ресёрча, прежде чем
 * попасть в урок. Агент может ошибиться в частотности, придумать неестественную
 * фразу или забыть коммуникативную функцию — это ловится тут, а не глазами.
 *
 * Отдельно проверяется то, чем славится Duolingo в плохом смысле: абсурдные
 * предложения. Полностью автоматически «абсурд» не измерить, поэтому здесь
 * ловятся его формальные признаки, а окончательное слово остаётся за человеком.
 */
export const LEARNING_V2_PHRASE_BANK_SCHEMA_V1 =
  "learning-v2-phrase-bank.v1" as const;

/** Максимальная длина фразы для pre-A1: длиннее новичок не произнесёт. */
export const LEARNING_V2_BEGINNER_MAX_WORDS_V1 = 8 as const;

export type LearningV2BankPhraseV1 = Readonly<{
  id: string;
  /** Целевой язык (английский или испанский). */
  text: string;
  /** Русский перевод — естественный, а не пословный. */
  ru: string;
  /** Какой компонент цели урока обслуживает фраза. */
  component: string;
  /** Коммуникативная функция: попросить, уточнить, отказаться. */
  function: string;
  /** Устойчивый оборот или собранная конструкция. */
  isChunk: boolean;
  /** Ранг самого редкого слова по частотному списку. */
  rarestWordRank: number;
  /** Контексты, где фраза работает. */
  contexts: readonly string[];
  /** Режимы, в которых фраза встречается в заданиях. */
  interactionModes: readonly LearningV2InteractionModeV1[];
}>;

export type LearningV2PhraseBankIssueV1 = Readonly<{
  phraseId: string;
  severity: "blocker" | "error" | "warning";
  code: string;
  message: string;
}>;

export type LearningV2PhraseBankV1 = Readonly<{
  schemaVersion: typeof LEARNING_V2_PHRASE_BANK_SCHEMA_V1;
  lessonOrdinal: number;
  targetLanguage: string;
  phrases: readonly LearningV2BankPhraseV1[];
  phraseCount: number;
  componentCoverage: Readonly<Record<string, number>>;
  structuralIssues: readonly LearningV2PhraseBankIssueV1[];
  evidenceReport: LearningV2EvidenceReportV1;
  verdict: "blocked" | "needs_repair" | "eligible_for_human_review";
  approvalAuthority: "owner_only_machine_cannot_approve";
  bankFingerprint: string;
}>;

function fail(): never {
  throw new Error("learning_v2_phrase_bank_invalid");
}

function words(text: string): readonly string[] {
  return text.trim().split(/\s+/u).filter(Boolean);
}

export function buildLearningV2PhraseBankV1(
  input: Readonly<{
    lessonOrdinal: number;
    targetLanguage: string;
    objectiveComponents: readonly string[];
    phrases: readonly LearningV2BankPhraseV1[];
  }>,
): LearningV2PhraseBankV1 {
  if (
    typeof input !== "object" ||
    input === null ||
    !Number.isSafeInteger(input.lessonOrdinal) ||
    input.lessonOrdinal < 1 ||
    input.lessonOrdinal > 32 ||
    typeof input.targetLanguage !== "string" ||
    input.targetLanguage.length === 0 ||
    !Array.isArray(input.objectiveComponents) ||
    input.objectiveComponents.length === 0 ||
    !Array.isArray(input.phrases) ||
    input.phrases.length === 0
  )
    fail();

  const issues: LearningV2PhraseBankIssueV1[] = [];
  const seenIds = new Set<string>();
  const seenTexts = new Set<string>();
  const componentCoverage: Record<string, number> = Object.fromEntries(
    input.objectiveComponents.map((component) => [component, 0]),
  );

  for (const phrase of input.phrases) {
    if (
      typeof phrase !== "object" ||
      phrase === null ||
      typeof phrase.id !== "string" ||
      phrase.id.length === 0 ||
      typeof phrase.text !== "string" ||
      phrase.text.trim().length === 0 ||
      typeof phrase.ru !== "string" ||
      phrase.ru.trim().length === 0 ||
      typeof phrase.isChunk !== "boolean" ||
      !Number.isSafeInteger(phrase.rarestWordRank) ||
      phrase.rarestWordRank < 1 ||
      !Array.isArray(phrase.contexts) ||
      !Array.isArray(phrase.interactionModes)
    )
      fail();

    if (seenIds.has(phrase.id)) fail();
    seenIds.add(phrase.id);

    // Дубликат фразы — это не разнообразие, а набивка объёма.
    const normalized = phrase.text.trim().toLowerCase();
    if (seenTexts.has(normalized)) {
      issues.push(
        Object.freeze({
          phraseId: phrase.id,
          severity: "error" as const,
          code: "duplicate_phrase",
          message: `Фраза «${phrase.text}» повторяется в банке.`,
        }),
      );
    }
    seenTexts.add(normalized);

    // Компонент обязан быть заявленным в цели урока, а не выдуманным.
    if (!(phrase.component in componentCoverage)) {
      issues.push(
        Object.freeze({
          phraseId: phrase.id,
          severity: "blocker" as const,
          code: "unknown_objective_component",
          message: `Фраза «${phrase.text}» привязана к компоненту «${phrase.component}», которого нет в цели урока.`,
        }),
      );
    } else {
      componentCoverage[phrase.component] += 1;
    }

    // Слишком длинная фраза для новичка: он её не произнесёт.
    const wordCount = words(phrase.text).length;
    if (wordCount > LEARNING_V2_BEGINNER_MAX_WORDS_V1) {
      issues.push(
        Object.freeze({
          phraseId: phrase.id,
          severity: "warning" as const,
          code: "phrase_too_long_for_level",
          message: `Фраза «${phrase.text}» из ${wordCount} слов — длинновата для произнесения на этом уровне.`,
        }),
      );
    }

    // Перевод, совпадающий с оригиналом, означает, что перевода нет.
    if (phrase.ru.trim().toLowerCase() === normalized) {
      issues.push(
        Object.freeze({
          phraseId: phrase.id,
          severity: "error" as const,
          code: "translation_missing",
          message: `У фразы «${phrase.text}» перевод совпадает с оригиналом.`,
        }),
      );
    }
  }

  // Компонент без единой фразы — дыра в уроке.
  for (const [component, count] of Object.entries(componentCoverage)) {
    if (count === 0) {
      issues.push(
        Object.freeze({
          phraseId: "*",
          severity: "blocker" as const,
          code: "objective_component_without_phrases",
          message: `Компонент цели «${component}» не обслуживается ни одной фразой.`,
        }),
      );
    }
  }

  // Гейты из ресёрча судят тот же банк независимо.
  const evidenceReport = evaluateLearningV2EvidenceRulesV1({
    phrases: input.phrases.map((phrase) => ({
      phraseId: phrase.id,
      text: phrase.text,
      rarestWordFrequencyRank: phrase.rarestWordRank,
      isFormulaicChunk: phrase.isChunk,
      communicativeFunction: phrase.function,
      contexts: phrase.contexts,
      interactionModes: phrase.interactionModes,
    })),
  });

  const structuralBlockers = issues.filter(
    (issue) => issue.severity === "blocker",
  ).length;
  const structuralErrors = issues.filter(
    (issue) => issue.severity === "error",
  ).length;

  const blocked =
    structuralBlockers > 0 || evidenceReport.verdict === "blocked";
  const needsRepair =
    structuralErrors > 0 || evidenceReport.verdict === "needs_repair";

  const body = {
    schemaVersion: LEARNING_V2_PHRASE_BANK_SCHEMA_V1,
    lessonOrdinal: input.lessonOrdinal,
    targetLanguage: input.targetLanguage,
    phrases: Object.freeze([...input.phrases]),
    phraseCount: input.phrases.length,
    componentCoverage: Object.freeze({ ...componentCoverage }),
    structuralIssues: Object.freeze(issues),
    evidenceReport,
    verdict: blocked
      ? ("blocked" as const)
      : needsRepair
        ? ("needs_repair" as const)
        : ("eligible_for_human_review" as const),
    approvalAuthority: "owner_only_machine_cannot_approve" as const,
  };

  return Object.freeze({
    ...body,
    bankFingerprint: hashCanonicalBody(body),
  });
}
