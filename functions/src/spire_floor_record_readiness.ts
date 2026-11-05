import { isDeepStrictEqual } from 'node:util';
import type { SpirePack, SpirePackSource } from './spire_pack_contract';
import { prepareExistingStepRecordVerifier } from './spire_floor_record_publication';
import { stepRecordVerifierPath, type StepRecordVerifier } from './spire_floor_record_verifier';
import type { TournamentTask } from './tournament_core';

export type StepRecordReadinessIO = Readonly<{
  readPublic: (path: string) => Promise<Buffer | null>;
  readPrivate: (path: string) => Promise<Buffer | null>;
  readCanonical: () => Promise<{ source: Omit<SpirePackSource, 'poolTaskCount'>; tasks: readonly TournamentTask[] }>;
}>;
export type StepRecordReadiness = Readonly<{
  lang: string; tier: number; weekId: string; status: 'PACK_MISSING' | 'CAN_BACKFILL' | 'READY' | 'BLOCKED';
  packHash?: string; steps?: number; taskSlots?: number; privatePath?: string; reason?: string;
}>;

/** Strict read-only dependency surface: no publication, writes, deletes or generators. */
export async function inspectStepRecordReadiness(identity: { lang: string; tier: number; weekId: string }, io: StepRecordReadinessIO): Promise<StepRecordReadiness> {
  const base = { ...identity };
  try {
    const bytes = await io.readPublic(`spire_packs/${identity.lang}/${identity.tier}/${identity.weekId}.json`);
    if (!bytes) return { ...base, status: 'PACK_MISSING' };
    const pack = JSON.parse(bytes.toString('utf8')) as SpirePack;
    const canonical = await io.readCanonical();
    const compiled = prepareExistingStepRecordVerifier(bytes, { ...identity, packHash: pack.packHash }, canonical.source, canonical.tasks);
    const privatePath = stepRecordVerifierPath(identity.lang, identity.tier, identity.weekId, pack.packHash);
    const existing = await io.readPrivate(privatePath);
    if (existing && !isDeepStrictEqual(JSON.parse(existing.toString('utf8')) as StepRecordVerifier, compiled)) {
      return { ...base, packHash: pack.packHash, status: 'BLOCKED', reason: 'record_verifier_immutable_conflict' };
    }
    return { ...base, packHash: pack.packHash, privatePath, steps: compiled.steps.length,
      taskSlots: compiled.steps.reduce((n, s) => n + s.tasks.length, 0), status: existing ? 'READY' : 'CAN_BACKFILL' };
  } catch (error) {
    console.warn('[SPIRE-RECORD-READY] проверка не прошла', error instanceof Error ? error.message : 'readiness_failed'); // зачем: причина блокировки видна в журнале, а не только в ответе
    return { ...base, status: 'BLOCKED', reason: error instanceof Error ? error.message : 'readiness_failed' };
  }
}
