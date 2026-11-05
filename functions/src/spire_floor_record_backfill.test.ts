const mockObjects = new Map<string, Buffer>();
const mockSaves: string[] = [];
let mockFail: 'public-write' | 'private-write' | 'probe' | undefined;
jest.mock('firebase-admin', () => ({
  firestore: () => ({ collection: () => ({ doc: () => ({ get: async () => ({ exists: false, data: () => undefined }) }) }) }),
  storage: () => ({ bucket: () => ({ file: (path: string) => ({
    exists: async () => { if (mockFail === 'probe') throw new Error('probe_unavailable'); return [mockObjects.has(path)]; },
    getMetadata: async () => [{ metadata: { packHash: JSON.parse(mockObjects.get(path)!.toString()).packHash } }],
    download: async () => { const bytes = mockObjects.get(path); if (!bytes) throw new Error('missing_object'); return [bytes]; },
    save: async (bytes: Buffer, options: { preconditionOpts?: { ifGenerationMatch: number } }) => {
      const isPublic = path.startsWith('spire_packs/');
      if ((mockFail === 'public-write' && isPublic) || (mockFail === 'private-write' && !isPublic)) throw Object.assign(new Error('write_unavailable'), { code: 503 });
      if (options.preconditionOpts?.ifGenerationMatch === 0 && mockObjects.has(path)) throw Object.assign(new Error('exists'), { code: 412 });
      mockSaves.push(path); mockObjects.set(path, bytes);
    },
  }) }) }),
}));
jest.mock('./arena_target_registry', () => ({ ...jest.requireActual('./arena_target_registry'), resolveArenaTargetPublication: () => null }));
import { loadMultilingualPool, runSpirePackBuild } from './spire_pack_build';
import { buildSpirePack, spirePackHash, type SpirePack } from './spire_pack_contract';
import { SPIRE_CONFIG_DEFAULTS } from './spire_config_contract';
import { stepRecordVerifierPath } from './spire_floor_record_verifier';

const path = 'spire_packs/de/0/2026-W40.json';
let pack: SpirePack;
let publicBytes: Buffer;
const run = (force = false) => runSpirePackBuild({ weekIds: ['2026-W40'], langs: ['de'], tiers: [0], force, requireLive: false, trigger: 'admin' });
beforeAll(() => {
  const pool = loadMultilingualPool('de');
  const built = buildSpirePack({ weekId: '2026-W40', lang: 'de', tier: 0, pool: pool.tasks, timer: SPIRE_CONFIG_DEFAULTS.timer,
    source: { poolVersion: 'spire-multilingual-direct-de', publicationFingerprint: 'spire-multilingual-direct', legacyPool: false } });
  if (!built.ok) throw new Error(built.reason);
  pack = built.pack; publicBytes = Buffer.from(built.json);
});
beforeEach(() => { mockObjects.clear(); mockSaves.length = 0; mockFail = undefined; mockObjects.set(path, publicBytes); });

test('ordinary existing-pack run backfills exact set0 companion without a public write; retry is quiet', async () => {
  const result = await run();
  expect(result.outcomes[0]).toMatchObject({ status: 'kept_existing', recordVerifierStatus: 'backfilled', packHash: pack.packHash });
  expect(mockObjects.get(path)).toBe(publicBytes);
  expect(mockSaves).toEqual([stepRecordVerifierPath('de', 0, pack.weekId, pack.packHash)]);
  const companion = JSON.parse(mockObjects.get(mockSaves[0])!.toString());
  expect(companion.steps).toHaveLength(135);
  const again = await run();
  expect(again.outcomes[0]).toMatchObject({ recordVerifierStatus: 'ready' });
  expect(mockSaves).toHaveLength(1);
});
test('private write failure leaves public bytes intact and a retry completes backfill', async () => {
  mockFail = 'private-write';
  expect((await run()).outcomes[0]).toMatchObject({ status: 'failed', recordVerifierStatus: 'unavailable' });
  expect(mockObjects.get(path)).toBe(publicBytes);
  expect(mockSaves).toEqual([]);
  mockFail = undefined;
  expect((await run()).outcomes[0]).toMatchObject({ recordVerifierStatus: 'backfilled' });
});
test('probe failure never falls back to overwriting an existing public pack', async () => {
  mockFail = 'probe';
  expect((await run()).outcomes[0]).toMatchObject({ status: 'failed', reason: 'pack_probe_failed' });
  expect(mockObjects.get(path)).toBe(publicBytes);
  expect(mockSaves).toEqual([]);
});
test('changed historical source fails closed without reconstructing or rewriting public pack', async () => {
  const changed = Buffer.from(JSON.stringify({ ...pack, source: { ...pack.source, publicationFingerprint: 'older' } }));
  mockObjects.set(path, changed);
  expect((await run()).outcomes[0]).toMatchObject({ status: 'failed', reason: 'record_verifier_source_changed' });
  expect(mockObjects.get(path)).toBe(changed);
  expect(mockSaves).toEqual([]);
});
test('failed public replacement cannot alter the companion referenced by the existing hash', async () => {
  const { packHash: _old, ...body } = pack;
  const oldBody = { ...body, source: { ...body.source, poolTaskCount: body.source.poolTaskCount + 1 } };
  const oldPack = { ...oldBody, packHash: spirePackHash(oldBody) };
  const oldBytes = Buffer.from(JSON.stringify(oldPack));
  const oldCompanionPath = stepRecordVerifierPath('de', 0, pack.weekId, oldPack.packHash);
  const oldCompanion = Buffer.from('immutable old companion');
  mockObjects.set(path, oldBytes); mockObjects.set(oldCompanionPath, oldCompanion);
  mockFail = 'public-write';
  expect((await run(true)).outcomes[0]).toMatchObject({ status: 'failed', reason: 'write_failed' });
  expect(mockObjects.get(path)).toBe(oldBytes);
  expect(mockObjects.get(oldCompanionPath)).toBe(oldCompanion);
  const newPath = stepRecordVerifierPath('de', 0, pack.weekId, pack.packHash);
  expect(newPath).not.toBe(oldCompanionPath);
  expect(JSON.parse(mockObjects.get(newPath)!.toString()).packHash).toBe(pack.packHash);
  mockFail = undefined;
  expect((await run(true)).outcomes[0]).toMatchObject({ status: 'written', packHash: pack.packHash });
  expect(mockObjects.get(oldCompanionPath)).toBe(oldCompanion);
});
