import { upsertPlan, readPlan, listPlans, setPlanStatus, deletePlan, JARVIS_PLANS_COLLECTION } from './jarvis_plans_store';
import { buildPlanFromDecision } from './jarvis_plans';
import { buildDecision } from './decision';

function makeDecision(department: 'quality' | 'growth' = 'quality') {
  return buildDecision({
    department, mode: 'observe', trigger: 'scheduled',
    question: 'Вопрос', finding: 'Находка', hypothesis: 'Гипотеза',
    options: [{ title: 'Вариант А', cost: 0, risk: 'low' }, { title: 'Вариант Б', cost: 1, risk: 'medium' }],
    recommendation: 'Рекомендация', risk: 'Риск', cost: 0,
    successMetric: 'Метрика', rollback: 'Откат',
    evidence: [{ sourceId: 'x', state: 'ready', count: 1, truncated: false, droppedCount: 0, observedAtMs: 1_000 }],
    nowMs: 1_000,
  });
}

function makeFakeDb() {
  const store = new Map<string, Record<string, unknown>>();
  const db = {
    collection: (name: string) => ({
      doc: (id: string) => {
        const path = `${name}/${id}`;
        return {
          id,
          path,
          get: async () => ({ exists: store.has(path), data: () => store.get(path), id }),
          set: async (data: Record<string, unknown>, opts?: { merge?: boolean }) => {
            const prev = opts?.merge ? (store.get(path) ?? {}) : {};
            store.set(path, { ...prev, ...data });
          },
          delete: async () => { store.delete(path); },
        };
      },
      // guard-ok: тестовый двойник читает уже собранные в памяти документы —
      // не выполняет реальных операций Firestore.
      limit: () => ({
        get: async () => ({
          docs: Array.from(store.entries())
            .filter(([path]) => path.startsWith(`${name}/`))
            .map(([path, data]) => ({ id: path.slice(name.length + 1), data: () => data })),
        }),
      }),
    }),
  };
  return { db: db as unknown as FirebaseFirestore.Firestore, store };
}

describe('jarvis_plans_store', () => {
  test('upsertPlan writes a new open plan, readPlan gets it back', async () => {
    const { db } = makeFakeDb();
    const decision = makeDecision();
    await upsertPlan({ db, decision, nowMs: 2_000 });
    const plan = await readPlan({ db, id: decision.contentHash });
    expect(plan?.status).toBe('open');
    expect(plan?.finding).toBe('Находка');
  });

  test('upserting the same decision twice does not create a duplicate document', async () => {
    const { db, store } = makeFakeDb();
    const decision = makeDecision();
    await upsertPlan({ db, decision, nowMs: 2_000 });
    await upsertPlan({ db, decision, nowMs: 3_000 });
    const planDocs = Array.from(store.keys()).filter((k) => k.startsWith(`${JARVIS_PLANS_COLLECTION}/`));
    expect(planDocs).toHaveLength(1);
  });

  test('setPlanStatus persists and survives a later upsert of the identical decision', async () => {
    const { db } = makeFakeDb();
    const decision = makeDecision();
    await upsertPlan({ db, decision, nowMs: 2_000 });
    await setPlanStatus({ db, id: decision.contentHash, status: 'resolved', nowMs: 3_000 });
    await upsertPlan({ db, decision, nowMs: 4_000 });
    const plan = await readPlan({ db, id: decision.contentHash });
    expect(plan?.status).toBe('resolved');
  });

  test('deletePlan removes the document entirely', async () => {
    const { db } = makeFakeDb();
    const decision = makeDecision();
    await upsertPlan({ db, decision, nowMs: 2_000 });
    await deletePlan({ db, id: decision.contentHash });
    const plan = await readPlan({ db, id: decision.contentHash });
    expect(plan).toBeNull();
  });

  test('listPlans returns every stored plan', async () => {
    const { db } = makeFakeDb();
    await upsertPlan({ db, decision: makeDecision('quality'), nowMs: 2_000 });
    await upsertPlan({ db, decision: makeDecision('growth'), nowMs: 2_000 });
    const plans = await listPlans({ db });
    expect(plans).toHaveLength(2);
  });

  test('readPlan on a missing id returns null, not throw', async () => {
    const { db } = makeFakeDb();
    const plan = await readPlan({ db, id: 'never-existed' });
    expect(plan).toBeNull();
  });

  test('persists exactly one idempotent internal follow-up record inside the plan when enabled', async () => {
    const { db, store } = makeFakeDb();
    const decision = makeDecision();
    await upsertPlan({ db, decision, nowMs: 2_000, followUpTasksEnabled: true });
    await upsertPlan({ db, decision, nowMs: 3_000, followUpTasksEnabled: true });

    const plan = await readPlan({ db, id: decision.contentHash });
    expect(plan?.followUpTask).toMatchObject({
      id: `follow-up:${decision.contentHash}`,
      createdAtMs: 2_000,
      attemptCount: 0,
      maxAttempts: 3,
    });
    expect(Array.from(store.keys()).filter((key) => key.startsWith(`${JARVIS_PLANS_COLLECTION}/`))).toHaveLength(1);
  });
});
