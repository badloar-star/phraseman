import { compileStepRecordVerifier, type StepRecordVerifier } from './spire_floor_record_verifier';
import { spirePackHash, type SpirePack, type SpirePackSource } from './spire_pack_contract';
import type { TournamentTask } from './tournament_core';

type ImmutableFile = {
  save: (bytes: Buffer, options: { preconditionOpts: { ifGenerationMatch: number }; resumable: boolean; contentType: string }) => Promise<unknown>;
  download: () => Promise<readonly [Buffer]>;
};
function canonical(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonical).join(',')}]`;
  if (value && typeof value === 'object') return `{${Object.entries(value).filter(([, v]) => v !== undefined)
    .sort(([a], [b]) => a < b ? -1 : a > b ? 1 : 0).map(([k, v]) => `${JSON.stringify(k)}:${canonical(v)}`).join(',')}}`;
  return JSON.stringify(value);
}

/** Hash-addressed, create-only: a failed public write cannot replace an old pair. */
export async function writeImmutableStepRecordVerifier(file: ImmutableFile, companion: StepRecordVerifier): Promise<void> {
  const bytes = Buffer.from(canonical(companion), 'utf8');
  try {
    await file.save(bytes, { preconditionOpts: { ifGenerationMatch: 0 }, resumable: false, contentType: 'application/json; charset=utf-8' });
  } catch (error) {
    if (Number((error as { code?: unknown })?.code) !== 412) throw error;
    const [existing] = await file.download();
    if (!existing.equals(bytes)) throw new Error('record_verifier_immutable_conflict');
  }
}

/** Reads the existing bytes; never calls buildSpirePack and never writes public data. */
export function prepareExistingStepRecordVerifier(bytes: Buffer,
  identity: Readonly<{ lang: string; tier: number; weekId: string; packHash: string }>,
  source: Omit<SpirePackSource, 'poolTaskCount'>, pool: readonly TournamentTask[]): StepRecordVerifier {
  const pack = JSON.parse(bytes.toString('utf8')) as SpirePack;
  if (pack.schema !== 'spire-pack-v1' || pack.lang !== identity.lang || pack.tier !== identity.tier
    || pack.weekId !== identity.weekId || pack.packHash !== identity.packHash) throw new Error('record_verifier_identity');
  if (pack.source?.poolVersion !== source.poolVersion || pack.source.publicationFingerprint !== source.publicationFingerprint
    || pack.source.legacyPool !== source.legacyPool) throw new Error('record_verifier_source_changed');
  const { packHash, ...body } = pack;
  if (spirePackHash(body) !== packHash) throw new Error('record_verifier_public_hash_invalid');
  return compileStepRecordVerifier(pack, pool);
}
