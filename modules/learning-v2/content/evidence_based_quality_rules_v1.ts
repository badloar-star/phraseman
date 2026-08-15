import { hashCanonicalBody } from "../policies/decision_registry";

/**
 * Правила качества, выведенные из исследований SLA — то, чем мы обязаны быть
 * лучше Duolingo, выраженное проверяемо.
 *
 * зачем: «лучше Duolingo» нельзя оставить лозунгом. Ресёрч 2026-08-15 дал
 * конкретные, подтверждённые источниками механизмы провала Duolingo и то, что
 * работает вместо них. Здесь они закодированы как гейты: пакет либо
 * соответствует, либо получает находку.
 *
 * ГЛАВНЫЙ вывод ресёрча (Swain 1985, Comprehensible Output Hypothesis):
 * ученики французского погружения с ТЫСЯЧАМИ часов понятного ввода всё равно
 * говорили с устойчивыми грамматическими ошибками. Понимание ≠ производство.
 * Duolingo построен на узнавании (выбор варианта, банк слов, «напиши что
 * слышишь») и структурно избегает открытого производства — отсюда массовое
 * «прошёл дерево, говорить не могу». Это признаёт и сам Duolingo в своём блоге.
 *
 * Честная граница: часть цифр про Duolingo (удержание, исследование 2024) идёт
 * из материалов самой компании и не является независимой наукой. Мы опираемся
 * на них только как на направление, а гейты строим на рецензируемых работах.
 */
export const LEARNING_V2_EVIDENCE_RULES_SCHEMA_V1 =
  "learning-v2-evidence-based-quality-rules.v1" as const;

/**
 * Порог покрытия по частотности: 2000 самых частых семейств слов дают ~90.6%
 * повседневного текста (Nation 2006). Первая тысяча — уже ~72%, вторая
 * добавляет лишь ~7.7 п.п., поэтому смысл именно во фронт-лоуде.
 */
export const LEARNING_V2_HIGH_FREQUENCY_BAND_V1 = 2000 as const;

/**
 * Доля фраз урока, которая обязана укладываться в высокочастотную полосу.
 * Не 100%: функциональные слова темы (аэропорт, рецепт) законно выходят за неё,
 * но должны быть исключением с явной причиной, а не нормой.
 */
export const LEARNING_V2_MIN_HIGH_FREQUENCY_SHARE_V1 = 0.8 as const;

/**
 * Сколько разных контекстов должна получить фраза. Duolingo сам назвал
 * context-bound learning причиной непереноса: практика в одном фиксированном
 * контексте не обобщается.
 */
export const LEARNING_V2_MIN_CONTEXTS_PER_PHRASE_V1 = 2 as const;

export type LearningV2InteractionModeV1 =
  | "recognition"
  | "production";

/**
 * Узнавание против производства. Выбор варианта и сборка из банка слов — это
 * узнавание: правильный ответ уже на экране. Свободный ввод и речь — это
 * производство.
 */
export const LEARNING_V2_MODE_BY_INPUT_V1 = Object.freeze({
  single_choice: "recognition",
  ordered_tokens: "recognition",
  scripted_speech: "production",
  free_text: "production",
} as const);

export type LearningV2PhraseEvidenceInputV1 = Readonly<{
  phraseId: string;
  text: string;
  /** Ранг самого редкого слова фразы по частотному списку. */
  rarestWordFrequencyRank: number;
  /** Является ли фраза устойчивым оборотом (chunk), а не собранной конструкцией. */
  isFormulaicChunk: boolean;
  /** Коммуникативная функция: заказать, отказаться, уточнить. */
  communicativeFunction: string;
  /** Контексты, в которых фраза отрабатывается. */
  contexts: readonly string[];
  /** Режимы взаимодействий, в которых фраза встречается. */
  interactionModes: readonly LearningV2InteractionModeV1[];
}>;

export type LearningV2EvidenceFindingV1 = Readonly<{
  ruleId: string;
  severity: "blocker" | "error" | "warning";
  phraseId: string;
  message: string;
  /** Откуда правило: чтобы находку можно было оспорить по существу. */
  evidence: string;
}>;

export type LearningV2EvidenceReportV1 = Readonly<{
  schemaVersion: typeof LEARNING_V2_EVIDENCE_RULES_SCHEMA_V1;
  phraseCount: number;
  productionCoveragePercent: number;
  highFrequencySharePercent: number;
  formulaicSharePercent: number;
  findings: readonly LearningV2EvidenceFindingV1[];
  blockerCount: number;
  errorCount: number;
  warningCount: number;
  verdict: "blocked" | "needs_repair" | "eligible_for_human_review";
  reportFingerprint: string;
}>;

function fail(): never {
  throw new Error("learning_v2_evidence_rules_invalid");
}

export function evaluateLearningV2EvidenceRulesV1(
  input: Readonly<{ phrases: readonly LearningV2PhraseEvidenceInputV1[] }>,
): LearningV2EvidenceReportV1 {
  if (
    typeof input !== "object" ||
    input === null ||
    !Array.isArray(input.phrases) ||
    input.phrases.length === 0
  )
    fail();

  const findings: LearningV2EvidenceFindingV1[] = [];
  const seen = new Set<string>();
  let producible = 0;
  let highFrequency = 0;
  let formulaic = 0;

  for (const phrase of input.phrases) {
    if (
      typeof phrase.phraseId !== "string" ||
      phrase.phraseId.length === 0 ||
      seen.has(phrase.phraseId) ||
      typeof phrase.text !== "string" ||
      phrase.text.length === 0 ||
      !Number.isSafeInteger(phrase.rarestWordFrequencyRank) ||
      phrase.rarestWordFrequencyRank < 1 ||
      typeof phrase.isFormulaicChunk !== "boolean" ||
      typeof phrase.communicativeFunction !== "string" ||
      !Array.isArray(phrase.contexts) ||
      !Array.isArray(phrase.interactionModes)
    )
      fail();
    seen.add(phrase.phraseId);

    // R1 — производство обязательно.
    // Свейн: понимание не создаёт способность говорить. Фраза, которую ученик
    // только узнаёт среди вариантов, остаётся пассивной.
    const hasProduction = phrase.interactionModes.includes("production");
    if (hasProduction) producible += 1;
    else {
      findings.push(
        Object.freeze({
          ruleId: "R1_recognition_without_production",
          severity: "blocker" as const,
          phraseId: phrase.phraseId,
          message: `Фраза «${phrase.text}» встречается только в заданиях на узнавание — ученик не будет уметь её произнести.`,
          evidence:
            "Swain 1985 (Comprehensible Output): годы понятного ввода не дают точного производства без принуждения к речи.",
        }),
      );
    }

    // R2 — частотность.
    if (phrase.rarestWordFrequencyRank <= LEARNING_V2_HIGH_FREQUENCY_BAND_V1) {
      highFrequency += 1;
    }

    // R3 — устойчивые обороты предпочтительнее собранных конструкций.
    if (phrase.isFormulaicChunk) formulaic += 1;

    // R4 — коммуникативная функция обязательна.
    // Фраза ради демонстрации грамматики — это то, за что ругают Duolingo.
    if (phrase.communicativeFunction.trim().length === 0) {
      findings.push(
        Object.freeze({
          ruleId: "R4_no_communicative_function",
          severity: "error" as const,
          phraseId: phrase.phraseId,
          message: `У фразы «${phrase.text}» нет коммуникативной функции — она существует ради грамматики.`,
          evidence:
            "TBLT: перенос в реальную речь дают задачи с коммуникативной целью, а не демонстрация формы.",
        }),
      );
    }

    // R5 — практика минимум в двух контекстах.
    if (phrase.contexts.length < LEARNING_V2_MIN_CONTEXTS_PER_PHRASE_V1) {
      findings.push(
        Object.freeze({
          ruleId: "R5_context_bound",
          severity: "warning" as const,
          phraseId: phrase.phraseId,
          message: `Фраза «${phrase.text}» отрабатывается только в одном контексте — навык не перенесётся.`,
          evidence:
            "Duolingo признал context-bound learning причиной того, что выученное не работает в живом разговоре.",
        }),
      );
    }
  }

  const phraseCount = input.phrases.length;
  const productionCoveragePercent = Math.round(
    (producible / phraseCount) * 100,
  );
  const highFrequencySharePercent = Math.round(
    (highFrequency / phraseCount) * 100,
  );
  const formulaicSharePercent = Math.round((formulaic / phraseCount) * 100);

  // R2 как свойство набора: единичное редкое слово — норма, системный перекос — нет.
  if (
    highFrequency / phraseCount <
    LEARNING_V2_MIN_HIGH_FREQUENCY_SHARE_V1
  ) {
    findings.push(
      Object.freeze({
        ruleId: "R2_low_frequency_vocabulary",
        severity: "error" as const,
        phraseId: "*",
        message: `Только ${highFrequencySharePercent}% фраз укладываются в 2000 самых частых слов — курс учит редкой лексике вместо полезной.`,
        evidence:
          "Nation 2006: 2000 частотных семейств покрывают ~90.6% повседневного текста.",
      }),
    );
  }

  const blockerCount = findings.filter((f) => f.severity === "blocker").length;
  const errorCount = findings.filter((f) => f.severity === "error").length;
  const warningCount = findings.filter((f) => f.severity === "warning").length;

  const body = {
    schemaVersion: LEARNING_V2_EVIDENCE_RULES_SCHEMA_V1,
    phraseCount,
    productionCoveragePercent,
    highFrequencySharePercent,
    formulaicSharePercent,
    findings: Object.freeze(findings),
    blockerCount,
    errorCount,
    warningCount,
    verdict:
      blockerCount > 0
        ? ("blocked" as const)
        : errorCount > 0
          ? ("needs_repair" as const)
          : ("eligible_for_human_review" as const),
  };

  return Object.freeze({
    ...body,
    reportFingerprint: hashCanonicalBody(body),
  });
}
