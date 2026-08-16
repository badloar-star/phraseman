import type { Decision } from './decision';
import {
  formatJarvisPmBusinessContext,
  type JarvisPmBusinessContext,
} from './pm_business_context';
import {
  readBusinessKnowledge,
  renderKnowledge,
  selectKnowledgeForDepartment,
} from './business_knowledge';

/**
 * LLM-обогатитель Джарвиса — короткий PM-план ПОВЕРХ готовых фактов.
 *
 * зачем отдельный шаг после крона, а не внутри него (совет Advisor, план
 * владельца 2026-08-03): департаменты уже посчитали факты, пороги и severity
 * детерминированно — LLM НИКОГДА не участвует в этом счёте. Единственная его
 * работа — превратить готовое решение в связный текст для владельца. Если
 * LLM недоступен, ошибся или бюджет исчерпан — решение остаётся полностью
 * рабочим с narrative=null, просто без дополнительной продуктовой гипотезы.
 *
 * Порядок проверок ДО вызова OpenAI (каждая — дешёвое чтение Firestore,
 * дорогой сетевой вызов — последним):
 *  1. bail out, если у решения нет вообще ни одного доверенного доказательства
 *     (LLM не на чем строить гипотезу, а выдумывать факты запрещено);
 *  2. слот идемпотентности (llm_enrichment_cache.ts) — вернуть готовый кэш
 *     или не платить дважды за тот же contentHash при ретрае крона;
 *  3. технический бюджет (llm_budget.ts) — денежный потолок только для
 *     действительно нового вызова.
 * Только после всех трёх — реальный вызов LLM.
 */

export interface EnricherBudgetVerdict {
  readonly allowed: boolean;
  readonly reason?: string;
}

export interface EnricherSlotVerdict {
  readonly reserved: boolean;
  /** Готовый результат предыдущего запуска; отсутствует у in-flight слота. */
  readonly narrative?: string;
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
  /** Общая бизнес-динамика, прочитанная один раз на весь прогон. */
  readonly businessContext?: JarvisPmBusinessContext;
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
/**
 * Правила бизнеса для этого департамента.
 *
 * зачем в промпт: модель, знающая только цифры, уверенно предлагает уже
 * отвергнутое — ужесточить возвраты, нанять человека, слать ежедневную
 * сводку. Запрет, записанный человеком, дешевле любого разбирательства
 * с плохим советом постфактум.
 *
 * зачем помечать как правила: модель не должна путать «так устроен бизнес»
 * с «так было вчера», иначе начнёт приписывать правилам причинность.
 */
function knowledgeBlock(department: string): string | null {
  const files = selectKnowledgeForDepartment(readBusinessKnowledge(), department);
  if (files.length === 0) return null;
  const text = renderKnowledge(files);
  if (!text) return null;
  return 'Правила и знание о бизнесе (это НЕ данные дня, а постоянные ограничения — '
    + `нарушать их нельзя, ссылаться на них как на причину происходящего тоже):\n${text}`;
}

function buildPrompt(
  decision: Decision,
  businessContext?: JarvisPmBusinessContext,
): { system: string; user: string } {
  const trustedEvidence = decision.evidence
    .filter((item) => item.trustworthy)
    .map((item) => `- ${item.sourceId}: ${item.count ?? '—'}`)
    .join('\n');

  const system = 'Ты виртуальный product manager Phraseman — мобильного приложения для изучения языков. '
    + 'На основании ТОЛЬКО переданных проверенных фактов предложи конкретную продуктовую гипотезу и самый дешёвый '
    + 'проверяемый следующий шаг. Не придумывай метрики, сегменты, причины или события, которых нет во входе, '
    + 'и не выдавай гипотезу за факт. Ответь на русском ровно в 3 коротких пунктах: '
    + '«Почему это важно: …», «Гипотеза: …», «Эксперимент: …; успех: …». '
    + 'Эксперимент должен быть выполнимым, иметь срок проверки и использовать переданную метрику успеха.';

  const user = [
    `Департамент: ${DEPARTMENT_LABEL[decision.department] ?? decision.department}`,
    `Вопрос: ${decision.question}`,
    `Находка: ${decision.finding}`,
    `Гипотеза: ${decision.hypothesis}`,
    `Рекомендация: ${decision.recommendation}`,
    `Метрика успеха: ${decision.successMetric}`,
    `Риск: ${decision.risk}`,
    `Ограничения: ${decision.constraints.join('; ') || 'нет дополнительных'}`,
    trustedEvidence ? `Данные:\n${trustedEvidence}` : null,
    businessContext
      ? `Контекст бизнеса Phraseman (используй для приоритета, но не приписывай ему причинность):\n${formatJarvisPmBusinessContext(businessContext)}`
      : null,
    // зачем знание отдельно от контекста (аудит 2026-08-16): контекст выше —
    // это ЧИСЛА за последние дни, они меняются. Здесь — ПРАВИЛА бизнеса,
    // которые верны независимо от сегодняшних цифр. Без них модель уверенно
    // советует уже отвергнутое: ужесточить возвраты, нанять человека,
    // прислать ежедневную сводку.
    knowledgeBlock(decision.department),
  ].filter((line): line is string => line !== null).join('\n');

  return { system, user };
}

async function enrichOne(
  decision: Decision,
  deps: EnricherDependencies,
  businessContext?: JarvisPmBusinessContext,
): Promise<EnrichedDecision> {
  const hasTrustworthyEvidence = decision.evidence.some((item) => item.trustworthy);
  if (!hasTrustworthyEvidence) return { decision, narrative: null };

  const nowMs = deps.nowMs();

  const slotVerdict = await deps.reserveSlot({ contentHash: decision.contentHash, nowMs });
  if (!slotVerdict.reserved) return { decision, narrative: slotVerdict.narrative ?? null };

  // Бюджет резервируется ПОСЛЕ cache/slot: повторный contentHash не должен
  // увеличивать committedUsd, когда дорогой вызов всё равно не произойдёт.
  const budgetVerdict = await deps.checkBudget({ estimatedCostUsd: deps.estimateCostUsd(), nowMs });
  if (!budgetVerdict.allowed) return { decision, narrative: null };

  try {
    const prompt = buildPrompt(decision, businessContext);
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
    results.push(await enrichOne(decision, deps, input.businessContext));
  }
  return results;
}
