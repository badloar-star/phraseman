import {
  proposeActions,
  applyApprovedActions,
  rollbackAction,
  JARVIS_ACTIONS_COLLECTION,
} from './jarvis_actions_store';
import { buildProposedAction, JARVIS_ACTIONS_MAX_PER_RUN, type ProposedActionInput } from './jarvis_actions';
import type { Decision } from './decision';

function decision(over: Partial<Decision> = {}): Decision {
  return {
    department: 'support',
    contentHash: 'c1',
    revision: 1,
    status: 'awaiting_owner',
    actionability: 'confirmed_action',
    question: 'Вопрос',
    finding: '12 обращений ждут ответа',
    recommendation: 'Ответить на просроченные',
    ...over,
  } as unknown as Decision;
}

function proposal(over: Partial<ProposedActionInput> = {}): ProposedActionInput {
  return {
    decision: decision(),
    kind: 'admin_tag',
    target: { collection: 'user_reports', docId: 'r1' },
    payload: { tag: 'jarvis:needs-review' },
    nowMs: 1_000,
    ...over,
  };
}

function makeFakeDb() {
  const store = new Map<string, Record<string, unknown>>();
  const applied: string[] = [];
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
            applied.push(path);
          },
          delete: async () => { store.delete(path); },
        };
      },
      // guard-ok: тестовый двойник читает уже собранные в памяти документы.
      where: (field: string, _op: string, value: unknown) => ({
        limit: () => ({
          get: async () => ({
            docs: Array.from(store.entries())
              .filter(([path, data]) => path.startsWith(`${name}/`) && data[field] === value)
              .map(([path, data]) => ({
                id: path.slice(name.length + 1),
                data: () => data,
                ref: {
                  set: async (upd: Record<string, unknown>, opts?: { merge?: boolean }) => {
                    const prev = opts?.merge ? (store.get(path) ?? {}) : {};
                    store.set(path, { ...prev, ...upd });
                  },
                },
              })),
          }),
        }),
      }),
    }),
  };
  return { db: db as unknown as FirebaseFirestore.Firestore, store, applied };
}

describe('Jarvis actions store — предложить, применить, откатить', () => {
  test('предложенное действие не применяется само', async () => {
    // зачем главное правило: действие ждёт согласия владельца. Автоматическое
    // применение — это и есть та автономия, которой он не давал.
    const { db, store } = makeFakeDb();
    await proposeActions({ db, proposals: [proposal()], nowMs: 1_000 });

    const saved = Array.from(store.entries()).find(([p]) => p.startsWith(`${JARVIS_ACTIONS_COLLECTION}/`));
    expect(saved?.[1].status).toBe('proposed');
    // Целевой документ не тронут.
    expect(store.has('user_reports/r1')).toBe(false);
  });

  test('невалидное предложение отвергается и записывается как отказ', async () => {
    // зачем сохранять отказ: молча выброшенное предложение невозможно
    // расследовать — «почему он этого не сделал» осталось бы без ответа.
    const { db, store } = makeFakeDb();
    const saved = await proposeActions({
      db,
      proposals: [proposal({ payload: { tag: 'выдуманный тег' } })],
      nowMs: 1_000,
    });

    expect(saved).toHaveLength(0);
    const rejected = Array.from(store.values()).find((v) => v.status === 'rejected');
    expect(rejected).toBeTruthy();
    expect(String(rejected?.rejectedReason)).toContain('словар');
  });

  test('за прогон предлагается не больше потолка', async () => {
    const { db } = makeFakeDb();
    const many = Array.from({ length: 10 }, (_, i) => proposal({
      target: { collection: 'user_reports', docId: `r${i}` },
    }));
    const saved = await proposeActions({ db, proposals: many, nowMs: 1_000 });
    expect(saved.length).toBeLessThanOrEqual(JARVIS_ACTIONS_MAX_PER_RUN);
  });

  test('после согласия действие применяется к цели', async () => {
    const { db, store } = makeFakeDb();
    const [action] = await proposeActions({ db, proposals: [proposal()], nowMs: 1_000 });
    await db.collection(JARVIS_ACTIONS_COLLECTION).doc(action.id).set({ status: 'approved' }, { merge: true });

    const applied = await applyApprovedActions({ db, nowMs: 2_000 });

    expect(applied).toBe(1);
    expect(store.get('user_reports/r1')).toMatchObject({ jarvisTags: ['jarvis:needs-review'] });
    expect(store.get(`${JARVIS_ACTIONS_COLLECTION}/${action.id}`)?.status).toBe('applied');
  });

  test('повторное применение не дублирует пометку', async () => {
    // зачем: крон ходит каждый день, и одобренное действие не должно
    // применяться заново при каждом прогоне.
    const { db, store } = makeFakeDb();
    const [action] = await proposeActions({ db, proposals: [proposal()], nowMs: 1_000 });
    await db.collection(JARVIS_ACTIONS_COLLECTION).doc(action.id).set({ status: 'approved' }, { merge: true });

    await applyApprovedActions({ db, nowMs: 2_000 });
    const second = await applyApprovedActions({ db, nowMs: 3_000 });

    expect(second).toBe(0);
    expect(store.get('user_reports/r1')?.jarvisTags).toEqual(['jarvis:needs-review']);
  });

  test('откат снимает пометку и помечает действие откаченным', async () => {
    // зачем откат обязателен: действие без отката — необратимое действие,
    // как бы безобидно оно ни выглядело.
    const { db, store } = makeFakeDb();
    const [action] = await proposeActions({ db, proposals: [proposal()], nowMs: 1_000 });
    await db.collection(JARVIS_ACTIONS_COLLECTION).doc(action.id).set({ status: 'approved' }, { merge: true });
    await applyApprovedActions({ db, nowMs: 2_000 });

    const rolled = await rollbackAction({ db, actionId: action.id, nowMs: 3_000 });

    expect(rolled).toBe(true);
    expect(store.get('user_reports/r1')?.jarvisTags).toEqual([]);
    expect(store.get(`${JARVIS_ACTIONS_COLLECTION}/${action.id}`)?.status).toBe('rolled_back');
  });

  test('откат неприменённого действия ничего не ломает', async () => {
    const { db } = makeFakeDb();
    const [action] = await proposeActions({ db, proposals: [proposal()], nowMs: 1_000 });
    expect(await rollbackAction({ db, actionId: action.id, nowMs: 3_000 })).toBe(false);
  });

  test('неодобренное не применяется, сколько бы прогонов ни прошло', async () => {
    const { db, store } = makeFakeDb();
    await proposeActions({ db, proposals: [proposal()], nowMs: 1_000 });
    await applyApprovedActions({ db, nowMs: 2_000 });
    await applyApprovedActions({ db, nowMs: 9_000 });
    expect(store.has('user_reports/r1')).toBe(false);
  });
});
