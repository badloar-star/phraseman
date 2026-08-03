import type { Decision } from './decision';

/**
 * LLM-обогатитель Джарвиса — narrative ПОВЕРХ уже готовых решений.
 *
 * зачем отдельный шаг после крона, а не внутри него (совет Advisor, план
 * владельца 2026-08-03): департаменты уже посчитали факты, пороги и severity
 * детерминированно — LLM НИКОГДА не участвует в этом счёте. Единственная его
 * работа — превратить готовое решение в связный текст для владельца. Если
 * LLM недоступен, ошибся или бюджет исчерпан — решение остаётся полностью
 * рабочим с narrative=null, просто без художественного пересказа.
 *
 * Порядок проверок ДО вызова OpenAI (каждая — дешёвое чтение Firestore,
 * дорогой сетевой вызов — последним):
 *  1. bail out, если у решения нет вообще ни одного доверенного доказательства
 *     (LLM нечего пересказывать, а выдумывать на пустом месте запрещено);
 *  2. технический бюджет (llm_budget.ts) — денежный потолок;
 *  3. слот идемпотентности (llm_enrichment_cache.ts) — не платить дважды за
 *     тот же contentHash при ретрае крона.
 * Только после всех трёх — реальный вызов LLM.
 */

export interface EnricherBudgetVerdict {
  readonly allowed: boolean;
  readonly reason?: string;
}

export interface EnricherSlotVerdict {
  readonly reserved: boolean;
}

export interface EnricherNarrativeResult {
  readonly text: string;
  readonly promptTokens: number;
  readonly completionTokens: number;
}

export interface EnricherDependencies {
  readonly checkBudget: (input: { estimatedCostUsd: number; nowMs: number }) => Promise<EnricherBudgetVerdict>;
  readonly reserveSlot: (input: { contentHash: string; nowMs: number }) => Promise<EnricherSlotVerdict>;
  readonly generateNarrative: (prompt: { system: string; user: string }) => Promise<EnricherNarrativeResult>;
  readonly recordSpend: (input: { actualCostUsd: number; nowMs: number }) => Promise<void>;
  readonly recordResult: (input: { contentHash: string; narrative: string; nowMs: number }) => Promise<void>;
  readonly estimateCostUsd: () => number;
  readonly actualCostUsd: (usage: { promptTokens: number; completionTokens: number }) => number;
  readonly nowMs: () => number;
}

export interface EnrichDecisionsInput {
  readonly decisions: readonly Decision[];
}

export interface EnrichedDecision {
  readonly decision: Decision;
  readonly narrative: string | null;
}

const DEPARTMENT_LABEL: Record<string, string> = {
  quality: 'Качество', money: 'Деньги', growth: 'Рост', content: 'Контент',
  payments: 'Платежи', safety: 'Безопасность', support: 'Поддержка',
  factory: 'Фабрика контента', retention: 'Удержание',
};

/**
 * Строит промпт ТОЛЬКО из доверенных полей решения. sourceId недоверенных
 * evidence-записей туда не попадает вовсе — LLM не должен даже видеть имя
 * источника, которому нельзя верить, не то что опираться на его число.
 */
function buildPrompt(decision: Decision): { system: string; user: string } {
  const trustedEvidence = decision.evidence
    .filter((item) => item.trustworthy)
    .map((item) => `- ${item.sourceId}: ${item.count ?? '—'}`)
    .join('\n');

  const system = 'Ты помощник, который кратко и по-деловому пересказывает готовое решение '
    + 'аналитической системы владельцу приложения. Не придумывай фактов, не меняй цифры, '
    + 'не давай новых рекомендаций — только свяжи уже данные факты в связный абзац на русском, '
    + 'не длиннее 3-4 предложений.';

  const user = [
    `Департамент: ${DEPARTMENT_LABEL[decision.department] ?? decision.department}`,
    `Вопрос: ${decision.question}`,
    `Находка: ${decision.finding}`,
    `Гипотеза: ${decision.hypothesis}`,
    `Рекомендация: ${decision.recommendation}`,
    trustedEvidence ? `Данные:\n${trustedEvidence}` : null,
  ].filter((line): line is string => line !== null).join('\n');

  return { system, user };
}

async function enrichOne(decision: Decision, deps: EnricherDependencies): Promise<EnrichedDecision> {
  const hasTrustworthyEvidence = decision.evidence.some((item) => item.trustworthy);
  if (!hasTrustworthyEvidence) return { decision, narrative: null };

  const nowMs = deps.nowMs();

  const budgetVerdict = await deps.checkBudget({ estimatedCostUsd: deps.estimateCostUsd(), nowMs });
  if (!budgetVerdict.allowed) return { decision, narrative: null };

  const slotVerdict = await deps.reserveSlot({ contentHash: decision.contentHash, nowMs });
  if (!slotVerdict.reserved) return { decision, narrative: null };

  try {
    const prompt = buildPrompt(decision);
    const generated = await deps.generateNarrative(prompt);
    const actualCostUsd = deps.actualCostUsd({
      promptTokens: generated.promptTokens,
      completionTokens: generated.completionTokens,
    });
    await deps.recordSpend({ actualCostUsd, nowMs });
    await deps.recordResult({ contentHash: decision.contentHash, narrative: generated.text, nowMs });
    return { decision, narrative: generated.text };
  } catch {
    // Ошибка LLM (сеть, таймаут, невалидный ответ) — решение остаётся
    // рабочим без narrative, а не ломает весь суточный прогон Джарвиса.
    return { decision, narrative: null };
  }
}

/**
 * зачем последовательно, а не Promise.all: один батч-вызов был бы дешевле,
 * но решений за прогон немного (максимум по одному на департамент), а
 * последовательность проще держать в рамках дневного капа — бюджет одного
 * решения не должен резервироваться, пока предыдущее ещё не подтвердило
 * реальную стоимость.
 */
export async function enrichDecisionsWithNarrative(
  input: EnrichDecisionsInput,
  deps: EnricherDependencies,
): Promise<readonly EnrichedDecision[]> {
  const results: EnrichedDecision[] = [];
  for (const decision of input.decisions) {
    results.push(await enrichOne(decision, deps));
  }
  return results;
}
