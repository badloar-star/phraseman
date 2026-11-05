import { isDeepStrictEqual } from 'node:util';
import { stepRecordKey } from '../../shared/spire_floor_records';
import { answerFingerprint, toPublicTournamentTask, validateTournamentTask, type TournamentTask } from './tournament_core';
import type { SpirePack } from './spire_pack_contract';

export type StepRecordVerifier = Readonly<{
  schema: 'spire-step-verifier-v2'; packHash: string; weekId: string; lang: string; tier: number;
  steps: readonly Readonly<{ floor: number; step: number; tasks: readonly TournamentTask[] }>[];
}>;

export function stepRecordVerifierPath(lang: string, tier: number, weekId: string, packHash: string): string {
  if (!/^[A-Za-z0-9:_-]{8,128}$/.test(packHash)) throw new Error('record_verifier_hash_invalid');
  // Outside spire_packs/**: Storage rules default-deny all client access.
  return `spire_record_verifiers/v2/${lang}/${tier}/${weekId}/${packHash}.json`;
}

function checkTasks(pack: SpirePack, floor: number, step: number, tasks: readonly TournamentTask[]): void {
  if (typeof pack.saltId !== 'string' || !pack.saltId) throw new Error('record_verifier_salt_invalid');
  const set = pack.floors.find(f => f.floor === floor)?.steps.find(s => s.step === step)?.sets[0];
  if (!set || tasks.length !== 10 || set.tasks.length !== 10 || new Set(tasks.map(t => t.taskId)).size !== 10) throw new Error('record_verifier_set');
  tasks.forEach((raw, i) => {
    const validation = validateTournamentTask(raw);
    if (!validation.ok || validation.kind === 'voice') throw new Error('record_verifier_task_invalid');
    const pub = toPublicTournamentTask(raw, pack.saltId);
    if (!pub) throw new Error('record_verifier_task_invalid');
    const payload = { ...pub.payload };
    // Existing Peak uses device TTS and therefore sends phrase for these kinds.
    if (pub.kind === 'listen' || pub.kind === 'dictate') payload.phrase = raw.payload.phrase;
    if (pub.kind === 'dictate') payload.correctTokenCount = (raw.payload.correctTokens as string[]).length;
    const projected = { taskId: pub.taskId, mode: pub.mode, kind: pub.kind, difficulty: pub.difficulty, payload };
    if (!isDeepStrictEqual(projected, set.tasks[i])) throw new Error('record_verifier_payload');
    // Admission parity with this immutable public pack; runtime scoring uses raw truth.
    const expected = pub.kind === 'listen'
      ? [answerFingerprint(pack.saltId, raw.taskId, raw.payload.correctIndex)]
      : pub.kind === 'dictate'
        ? [answerFingerprint(pack.saltId, raw.taskId, raw.payload.correctTokens)]
        : pub.answerFingerprints;
    if (!isDeepStrictEqual(expected, set.answerFingerprints[i])) throw new Error('record_verifier_answer_drift');
  });
}

/** Raw truth comes from the same verified pool used by the weekly builder. */
export function compileStepRecordVerifier(pack: SpirePack, pool: readonly TournamentTask[]): StepRecordVerifier {
  const byId = new Map(pool.map(t => [t.taskId, t]));
  const steps: { floor: number; step: number; tasks: TournamentTask[] }[] = [];
  for (const floor of pack.floors) for (const step of floor.steps) {
    if (!stepRecordKey(floor.floor, step.step)) throw new Error('record_verifier_step');
    const tasks = (step.sets[0]?.tasks ?? []).map(t => {
      const raw = byId.get(t.taskId);
      if (!raw) throw new Error('record_verifier_task_missing');
      return raw;
    });
    checkTasks(pack, floor.floor, step.step, tasks);
    steps.push({ floor: floor.floor, step: step.step, tasks });
  }
  if (steps.length !== 135 || new Set(steps.map(s => stepRecordKey(s.floor, s.step))).size !== 135) throw new Error('record_verifier_steps');
  return { schema: 'spire-step-verifier-v2', packHash: pack.packHash, weekId: pack.weekId, lang: pack.lang, tier: pack.tier, steps };
}

export function selectStepRecordVerifier(companion: StepRecordVerifier, pack: SpirePack, floor: number, step: number): readonly TournamentTask[] {
  if (companion.schema !== 'spire-step-verifier-v2' || companion.packHash !== pack.packHash || companion.weekId !== pack.weekId
    || companion.lang !== pack.lang || companion.tier !== pack.tier || !stepRecordKey(floor, step)) throw new Error('record_verifier_identity');
  const row = companion.steps.find(s => s.floor === floor && s.step === step);
  if (!row) throw new Error('record_verifier_step');
  checkTasks(pack, floor, step, row.tasks);
  return row.tasks;
}
