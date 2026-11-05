import { prepareExistingStepRecordVerifier, writeImmutableStepRecordVerifier } from './spire_floor_record_publication';
import { stepRecordVerifierPath, type StepRecordVerifier } from './spire_floor_record_verifier';

test('immutable companion identity includes the public pack hash', () => {
  expect(stepRecordVerifierPath('en', 0, '2026-W45', 'sp1_abcdefgh')).not.toBe(stepRecordVerifierPath('en', 0, '2026-W45', 'sp1_ijklmnop'));
});
test('create-only publication retries equal bytes without overwriting different truth', async () => {
  const companion = { schema: 'spire-step-verifier-v2', lang: 'en', tier: 0, weekId: '2026-W45', packHash: 'sp1_abcdefgh', steps: [] } as StepRecordVerifier;
  let existing: Buffer | undefined;
  const save = jest.fn(async (bytes: Buffer, options: { preconditionOpts: { ifGenerationMatch: number } }) => {
    expect(options.preconditionOpts.ifGenerationMatch).toBe(0);
    if (existing) throw Object.assign(new Error('exists'), { code: 412 });
    existing = bytes;
  });
  const file = { save, download: async () => [existing!] as [Buffer] };
  await writeImmutableStepRecordVerifier(file, companion);
  await writeImmutableStepRecordVerifier(file, companion);
  const original = existing;
  await expect(writeImmutableStepRecordVerifier(file, { ...companion, tier: 1 })).rejects.toThrow('record_verifier_immutable_conflict');
  expect(existing).toBe(original);
});
test('transient private write failure propagates without overwrite retry', async () => {
  const file = { save: jest.fn(async () => { throw Object.assign(new Error('unavailable'), { code: 503 }); }), download: jest.fn() };
  await expect(writeImmutableStepRecordVerifier(file, {} as StepRecordVerifier)).rejects.toThrow('unavailable');
  expect(file.save).toHaveBeenCalledTimes(1);
  expect(file.download).not.toHaveBeenCalled();
});
test('backfill rejects corrupt public bytes or changed publication instead of rebuilding public tasks', () => {
  const identity = { lang: 'en', tier: 0, weekId: '2026-W45', packHash: 'sp1_abcdefgh' };
  const source = { poolVersion: 'pv', publicationFingerprint: 'fp', legacyPool: true };
  expect(() => prepareExistingStepRecordVerifier(Buffer.from('{'), identity, source, [])).toThrow();
  const pack = { schema: 'spire-pack-v1', ...identity, source: { ...source, publicationFingerprint: 'other' }, floors: [] };
  expect(() => prepareExistingStepRecordVerifier(Buffer.from(JSON.stringify(pack)), identity, source, [])).toThrow('record_verifier_source_changed');
});
