import { buildPlanFromDecision, JARVIS_PLANS_COLLECTION, type JarvisPlanLifecycleStatus } from './jarvis_plans';
import { buildDecision, type Decision } from './decision';

/**
 * Раздел «Планы» (владелец 2026-08-04): каждая находка Джарвиса сохраняется
 * ПОСТОЯННО, независимо от Telegram — владелец жаловался, что находки видны
 * только секунду во всплывающем сообщении и негде читать их полностью.
 * buildPlanFromDecision — единственное место, где Decision превращается в
 * запись раздела «Планы»: без сети, без Firestore, только преобразование.
 */

function makeDecision(overrides: Partial<Parameters<typeof buildDecision>[0]> = {}): Decision {
  return buildDecision({
    department: 'quality',
    mode: 'observe',
    trigger: 'scheduled',
    question: 'Растут ли жалобы?',
    finding: 'За сутки 20 жалоб на экране lesson.',
    hypothesis: 'Вероятная причина — недавнее изменение.',
    options: [
      { title: 'Откатить изменение', cost: 1, risk: 'low' },
      { title: 'Исправить точечно', cost: 5, risk: 'medium' },
    ],
    recommendation: 'Откатить изменение',
    risk: 'Откат может вернуть старую проблему',
    cost: 1,
    successMetric: 'Жалобы возвращаются к фону',
    rollback: 'Вернуть предыдущую сборку',
    evidence: [
      { sourceId: 'user_reports', state: 'ready', count: 20, truncated: false, droppedCount: 0, observedAtMs: 1_000 },
    ],
    nowMs: 1_000,
    ...overrides,
  });
}

describe('buildPlanFromDecision', () => {
  test('creates a new plan in the open state', () => {
    const plan = buildPlanFromDecision(makeDecision(), null, 2_000);
    expect(plan.status).toBe<JarvisPlanLifecycleStatus>('open');
    expect(plan.department).toBe('quality');
    expect(plan.contentHash).toBe(makeDecision().contentHash);
    expect(plan.finding).toContain('20 жалоб');
    expect(plan.createdAtMs).toBe(2_000);
    expect(plan.updatedAtMs).toBe(2_000);
  });

  test('carries the full recommendation/hypothesis/risk/successMetric/rollback text', () => {
    const plan = buildPlanFromDecision(makeDecision(), null, 2_000);
    expect(plan.recommendation).toBe('Откатить изменение');
    expect(plan.hypothesis).toBe('Вероятная причина — недавнее изменение.');
    expect(plan.risk).toBe('Откат может вернуть старую проблему');
    expect(plan.successMetric).toBe('Жалобы возвращаются к фону');
    expect(plan.rollback).toBe('Вернуть предыдущую сборку');
  });

  test('a decision with a DIFFERENT finding gets a different contentHash — no existing plan to inherit from', () => {
    // зачем: finding входит в состав contentHash (decision.ts) — другой
    // текст находки означает другое смысловое решение, значит нет смысла
    // искать/передавать existing из другого хеша, вызывающий сам находит
    // (или не находит) существующий план по id === contentHash.
    const changed = buildPlanFromDecision(makeDecision({ finding: 'За сутки 25 жалоб на экране lesson.' }), null, 4_000);
    const original = buildPlanFromDecision(makeDecision(), null, 4_000);
    expect(changed.contentHash).not.toBe(original.contentHash);
    expect(changed.status).toBe('open');
  });

  test('re-running the exact same decision keeps the plan status the caller already had (no silent revert)', () => {
    const decision = makeDecision();
    const created = buildPlanFromDecision(decision, null, 2_000);
    const markedResolved = { ...created, status: 'resolved' as const, updatedAtMs: 3_000 };
    const rerun = buildPlanFromDecision(decision, markedResolved, 5_000);
    // зачем: владелец уже отметил план решённым — повторный суточный прогон
    // с ТОЙ ЖЕ находкой не должен тихо вернуть её в "open" и напугать заново.
    expect(rerun.status).toBe('resolved');
    expect(rerun.id).toBe(created.id);
  });

  test('a plan the owner archived stays archived on re-run of the identical decision', () => {
    const decision = makeDecision();
    const created = buildPlanFromDecision(decision, null, 2_000);
    const archived = { ...created, status: 'archived' as const, updatedAtMs: 3_000 };
    const rerun = buildPlanFromDecision(decision, archived, 5_000);
    expect(rerun.status).toBe('archived');
  });

  test('plan id is derived from contentHash — stable and collision-safe across departments', () => {
    const a = buildPlanFromDecision(makeDecision({ department: 'quality' }), null, 2_000);
    const b = buildPlanFromDecision(makeDecision({ department: 'growth', question: 'Другой вопрос' }), null, 2_000);
    expect(a.id).not.toBe(b.id);
    expect(a.id).toBe(a.contentHash);
  });

  test('JARVIS_PLANS_COLLECTION is a stable, non-empty constant', () => {
    expect(JARVIS_PLANS_COLLECTION).toBe('jarvis_plans');
  });
});
