import { createOpenAiGenerationProvider } from './generation_provider';
import { reserveContentFactoryBudget } from './content_factory_budget';

type Data = Record<string, unknown>;
const docs = new Map<string, Data>();
const ref = (path: string) => ({ path });
const db = {
  collection(name: string) { return { doc(id: string) { return ref(`${name}/${id}`); } }; },
  async runTransaction<T>(fn: (tx: any) => Promise<T>): Promise<T> {
    const writes: Array<() => void> = [];
    const result = await fn({
      async get(r: { path: string }) { const value = docs.get(r.path); return { exists: value !== undefined, data: () => value }; },
      set(r: { path: string }, data: Data, options?: { merge?: boolean }) { writes.push(() => docs.set(r.path, options?.merge ? { ...(docs.get(r.path) ?? {}), ...data } : data)); },
      create(r: { path: string }, data: Data) { writes.push(() => docs.set(r.path, data)); },
    });
    writes.forEach((write) => write());
    return result;
  },
} as unknown as FirebaseFirestore.Firestore;

describe('provider transport budget integration', () => {
  const originalFetch = global.fetch;
  let warn: jest.SpyInstance;
  beforeEach(() => { docs.clear(); warn = jest.spyOn(console, 'warn').mockImplementation(() => undefined); });
  afterEach(() => { global.fetch = originalFetch; warn.mockRestore(); });

  test('cap exhaustion stops an HTTP retry before its fetch', async () => {
    global.fetch = jest.fn(async () => new Response('retry', { status: 500 })) as typeof fetch;
    const nowMs = Date.UTC(2026, 6, 13, 12);
    const provider = createOpenAiGenerationProvider('test', { beforeProviderRequest: async (requestIndex) => { await reserveContentFactoryBudget(db, `stage-1:attempt:1:provider-request:${requestIndex}`, 1, nowMs); } });
    await expect(provider.generate({ model: 'fake', prompt: 'json', responseFormat: 'json_object' })).rejects.toMatchObject({ code: 'resource-exhausted' });
    expect(global.fetch).toHaveBeenCalledTimes(1);
    expect(provider.getProviderRequestCount?.()).toBe(1);
  });
});
