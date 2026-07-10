import { HttpsError } from 'firebase-functions/v2/https';
import { contentFactoryBudgetDocId, reserveContentFactoryBudget } from './content_factory_budget';

type Data = Record<string, unknown>;
const docs = new Map<string, Data>();
const ref = (path: string) => ({ path });
const db = {
  collection(name: string) { return { doc(id: string) { return ref(`${name}/${id}`); } }; },
  async runTransaction<T>(fn: (tx: { get(r: { path: string }): Promise<{ exists: boolean; data(): Data | undefined }>; set(r: { path: string }, data: Data, options?: { merge?: boolean }): void; create(r: { path: string }, data: Data): void }) => Promise<T>): Promise<T> {
    const writes: Array<() => void> = [];
    const result = await fn({
      async get(r) { const value = docs.get(r.path); return { exists: value !== undefined, data: () => value }; },
      set(r, data, options) { writes.push(() => docs.set(r.path, options?.merge ? { ...(docs.get(r.path) ?? {}), ...data } : data)); },
      create(r, data) { writes.push(() => { if (docs.has(r.path)) throw new Error('already_exists'); docs.set(r.path, data); }); },
    });
    writes.forEach((write) => write());
    return result;
  },
} as unknown as FirebaseFirestore.Firestore;

describe('content factory daily budget', () => {
  beforeEach(() => docs.clear());

  it('counts each paid unit once and replays the same reservation for free', async () => {
    const now = Date.UTC(2026, 6, 10, 12);
    expect(await reserveContentFactoryBudget(db, 'job-1:lesson:1', 1, now)).toEqual({ reserved: true, replayed: false });
    expect(await reserveContentFactoryBudget(db, 'job-1:lesson:1', 1, now)).toEqual({ reserved: true, replayed: true });
    await expect(reserveContentFactoryBudget(db, 'job-1:quiz:1', 1, now)).rejects.toBeInstanceOf(HttpsError);
  });

  it('uses a safe deterministic per-day reservation id', () => {
    expect(contentFactoryBudgetDocId('job-1:lesson:1', Date.UTC(2026, 6, 10))).toMatch(/^2026-07-10_[a-f0-9]{48}$/);
  });
});
