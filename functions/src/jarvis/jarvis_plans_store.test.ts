import { upsertPlan, readPlan, listPlans, setPlanStatus, deletePlan, recordPlanOwnerDecision, closeVanishedPlans, JARVIS_PLANS_COLLECTION } from './jarvis_plans_store';
import { hashDecision } from './issue_decision_buttons';
import { buildPlanFromDecision } from './jarvis_plans';
import { decisionTopicKey } from './decision_topic';
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

/** То же решение, но с другим текстом находки — эмулирует сдвиг счётчика. */
function makeDecisionWithFinding(finding: string) {
  return buildDecision({
    department: 'quality', mode: 'observe', trigger: 'scheduled',
    question: 'Вопрос', finding, hypothesis: 'Гипотеза',
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
      where: (field: string, _operator: string, value: unknown) => ({
        limit: () => ({
          get: async () => ({
            docs: Array.from(store.entries())
              .filter(([path, data]) => path.startsWith(`${name}/`) && data[field] === value)
              .map(([path, data]) => ({
                id: path.slice(name.length + 1),
                data: () => data,
                ref: {
                  set: async (update: Record<string, unknown>, opts?: { merge?: boolean }) => {
                    const prev = opts?.merge ? (store.get(path) ?? {}) : {};
                    store.set(path, { ...prev, ...update });
                  },
                },
              })),
          }),
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
    const plan = await readPlan({ db, id: decisionTopicKey(decision) });
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
    await setPlanStatus({ db, id: decisionTopicKey(decision), status: 'resolved', nowMs: 3_000 });
    await upsertPlan({ db, decision, nowMs: 4_000 });
    const plan = await readPlan({ db, id: decisionTopicKey(decision) });
    expect(plan?.status).toBe('resolved');
  });

  test('deletePlan removes the document entirely', async () => {
    const { db } = makeFakeDb();
    const decision = makeDecision();
    await upsertPlan({ db, decision, nowMs: 2_000 });
    await deletePlan({ db, id: decisionTopicKey(decision) });
    const plan = await readPlan({ db, id: decisionTopicKey(decision) });
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

    const plan = await readPlan({ db, id: decisionTopicKey(decision) });
    expect(plan?.followUpTask).toMatchObject({
      id: `follow-up:${decision.contentHash}`,
      createdAtMs: 2_000,
      attemptCount: 0,
      maxAttempts: 3,
    });
    expect(Array.from(store.keys()).filter((key) => key.startsWith(`${JARVIS_PLANS_COLLECTION}/`))).toHaveLength(1);
  });

  test('Telegram approve is persisted on the exact plan version', async () => {
    const { db } = makeFakeDb();
    const decision = makeDecision();
    await upsertPlan({ db, decision, nowMs: 2_000 });
    const updated = await recordPlanOwnerDecision({
      db, approvalDecisionHash: hashDecision(decision), action: 'approve', nowMs: 3_000,
    });
    const plan = await readPlan({ db, id: decisionTopicKey(decision) });
    expect(updated).toBe(true);
    expect(plan?.ownerDecision).toEqual({ action: 'approve', decidedAtMs: 3_000, source: 'telegram' });
    // зачем изменено (владелец 2026-08-15, «говорит, а не делает»): раньше
    // «принять» оставляло план 'open' навсегда — единственный доступный
    // владельцу орган управления не управлял ничем. Теперь согласие переводит
    // находку в ожидание проверки результата, и она уходит из открытых.
    expect(plan?.status).toBe('accepted');
  });

  test('Telegram reject archives the plan instead of only writing an audit toast', async () => {
    const { db } = makeFakeDb();
    const decision = makeDecision();
    await upsertPlan({ db, decision, nowMs: 2_000 });
    await recordPlanOwnerDecision({
      db, approvalDecisionHash: hashDecision(decision), action: 'reject', nowMs: 3_000,
    });
    const plan = await readPlan({ db, id: decisionTopicKey(decision) });
    expect(plan?.ownerDecision?.action).toBe('reject');
    expect(plan?.status).toBe('archived');
  });

  test('ambiguous or unknown approval hash changes no plan', async () => {
    const { db } = makeFakeDb();
    expect(await recordPlanOwnerDecision({
      db, approvalDecisionHash: 'missing', action: 'approve', nowMs: 3_000,
    })).toBe(false);
  });

  test('счётчик в находке сдвинулся — план обновляется, а не дублируется', async () => {
    // зачем (владелец 2026-08-15, «пишет одно и то же»): план адресовался
    // contentHash, который меняется вместе с любым числом в тексте. Каждое
    // утро заводился НОВЫЙ план про ту же проблему, а старый висел открытым.
    const { db, store } = makeFakeDb();
    const day1 = makeDecisionWithFinding('125 писем без ответа');
    const day2 = makeDecisionWithFinding('126 писем без ответа');

    await upsertPlan({ db, decision: day1, nowMs: 1_000 });
    await upsertPlan({ db, decision: day2, nowMs: 2_000 });

    const plans = Array.from(store.keys()).filter((p) => p.startsWith(`${JARVIS_PLANS_COLLECTION}/`));
    expect(plans).toHaveLength(1);

    const plan = await readPlan({ db, id: decisionTopicKey(day2) });
    expect(plan?.finding).toBe('126 писем без ответа');
    // Дата создания — от первого появления проблемы, а не от последнего прогона.
    expect(plan?.createdAtMs).toBe(1_000);
  });

  test('отказ владельца переживает смену счётчика', async () => {
    // зачем: без этого вчерашнее «нет» терялось за сутки — владелец мог
    // отклонять одно и то же неделями без всякого эффекта.
    const { db } = makeFakeDb();
    const day1 = makeDecisionWithFinding('125 писем без ответа');
    await upsertPlan({ db, decision: day1, nowMs: 1_000 });
    await recordPlanOwnerDecision({
      db, approvalDecisionHash: hashDecision(day1), action: 'reject', nowMs: 2_000,
    });

    const day2 = makeDecisionWithFinding('126 писем без ответа');
    await upsertPlan({ db, decision: day2, nowMs: 3_000 });

    const plan = await readPlan({ db, id: decisionTopicKey(day2) });
    expect(plan?.status).toBe('archived');
    expect(plan?.ownerDecision?.action).toBe('reject');
  });

  test('исчезнувшая находка закрывается сама, принятая и архивная не трогаются', async () => {
    // зачем: без автозакрытия открытые планы копятся вечно — проблема давно
    // ушла из данных, а список открытых растёт и обесценивается.
    const { db } = makeFakeDb();
    const gone = makeDecisionWithFinding('исчезнувшая проблема');
    const stillHere = makeDecisionWithFinding('живая проблема');
    await upsertPlan({ db, decision: gone, nowMs: 1_000 });
    await upsertPlan({ db, decision: stillHere, nowMs: 1_000 });

    const closed = await closeVanishedPlans({
      db,
      seenTopicKeys: [decisionTopicKey(stillHere)],
      nowMs: 5_000,
    });

    expect(closed).toBe(1);
    expect((await readPlan({ db, id: decisionTopicKey(gone) }))?.status).toBe('vanished');
    expect((await readPlan({ db, id: decisionTopicKey(stillHere) }))?.status).toBe('open');
  });

  test('автозакрытие не воскрешает и не трогает решённое владельцем', async () => {
    // зачем: владелец уже вынес вердикт — автомат не имеет права его перебить.
    const { db } = makeFakeDb();
    const decision = makeDecisionWithFinding('отклонённая проблема');
    await upsertPlan({ db, decision, nowMs: 1_000 });
    await recordPlanOwnerDecision({
      db, approvalDecisionHash: hashDecision(decision), action: 'reject', nowMs: 2_000,
    });

    const closed = await closeVanishedPlans({ db, seenTopicKeys: [], nowMs: 5_000 });

    expect(closed).toBe(0);
    expect((await readPlan({ db, id: decisionTopicKey(decision) }))?.status).toBe('archived');
  });
});
