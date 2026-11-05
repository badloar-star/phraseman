import { inspectStepRecordReadiness } from './spire_floor_record_readiness';
import { loadMultilingualPool } from './spire_pack_build';
import { buildSpirePack } from './spire_pack_contract';
import { SPIRE_CONFIG_DEFAULTS } from './spire_config_contract';
import { compileStepRecordVerifier } from './spire_floor_record_verifier';

test('read-only readiness compiles exact existing bytes in memory and never publishes them', async () => {
  const tasks = loadMultilingualPool('de').tasks;
  const source = { poolVersion: 'spire-multilingual-direct-de', publicationFingerprint: 'spire-multilingual-direct', legacyPool: false };
  const identity = { lang: 'de', tier: 0, weekId: '2026-W45' };
  const built = buildSpirePack({ ...identity, pool: tasks, source, timer: SPIRE_CONFIG_DEFAULTS.timer });
  if (!built.ok) throw new Error(built.reason);
  const publicBytes = Buffer.from(built.json);
  const save = jest.fn(() => { throw new Error('writes_forbidden'); });
  const io = { readPublic: async () => publicBytes, readPrivate: async (): Promise<Buffer | null> => null,
    readCanonical: async () => ({ source, tasks }), save };
  expect(await inspectStepRecordReadiness(identity, io)).toMatchObject({ status: 'CAN_BACKFILL', steps: 135, taskSlots: 1350 });
  const privateBytes = Buffer.from(JSON.stringify(compileStepRecordVerifier(built.pack, tasks)));
  expect(await inspectStepRecordReadiness(identity, { ...io, readPrivate: async () => privateBytes })).toMatchObject({ status: 'READY' });
  expect(save).not.toHaveBeenCalled();
  expect(publicBytes.toString()).toBe(built.json);
  expect(await inspectStepRecordReadiness(identity, { ...io, readPublic: async () => null })).toMatchObject({ status: 'PACK_MISSING' });
  expect(await inspectStepRecordReadiness(identity, { ...io, readCanonical: async () => ({ source: { ...source, publicationFingerprint: 'changed' }, tasks }) })).toMatchObject({ status: 'BLOCKED', reason: 'record_verifier_source_changed' });
});
