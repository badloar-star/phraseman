import { compileStepRecordVerifier, selectStepRecordVerifier } from './spire_floor_record_verifier';
import { answerFingerprint, toPublicTournamentTask, verifyTournamentAnswer, type TournamentTask } from './tournament_core';
import { prepareExistingStepRecordVerifier } from './spire_floor_record_publication';
import { spirePackHash } from './spire_pack_contract';
import type { SpirePack } from './spire_pack_contract';

const raw: TournamentTask[] = Array.from({ length: 10 }, (_, i) => ({ taskId: `t${i}`, mode: 'guess_phrase',
  isVoice: false, difficulty: 1, verified: true, tags: [], payload: { phrase: `p${i}`, options: ['a', 'b', 'c', 'd'], correctIndex: 0 } }));
const set = { tasks: raw.map(t => ({ taskId: t.taskId, mode: t.mode, kind: 'choice', difficulty: 1,
  payload: { phrase: t.payload.phrase, options: t.payload.options } })), answerFingerprints: raw.map(t => [answerFingerprint('salt', t.taskId, 0)]) };
const pack = { schema: 'spire-pack-v1', saltId: 'salt', weekId: '2026-W44', lang: 'en', tier: 0, packHash: 'pack_hash_123',
  source: { poolVersion: 'pv', publicationFingerprint: 'fp', legacyPool: true, poolTaskCount: 10 },
  floors: Array.from({ length: 15 }, (_, i) => ({ floor: i + 1, steps: Array.from({ length: i < 5 ? i + 5 : 10 }, (_, s) => ({ step: s + 1, sets: [set] })) })) } as unknown as SpirePack;

test('companion preserves all 135 existing step set0 IDs and raw server truth', () => {
  const companion = compileStepRecordVerifier(pack, raw);
  expect(companion.steps).toHaveLength(135);
  const selected = selectStepRecordVerifier(companion, pack, 15, 10);
  expect(selected.map(t => t.taskId)).toEqual(set.tasks.map(t => t.taskId));
  expect(selected.every(t => verifyTournamentAnswer(t, { selectedIndex: 0 }))).toBe(true);
  expect(selected.some(t => verifyTournamentAnswer(t, { selectedIndex: 1 }))).toBe(false);
});
test('companion fails closed on missing raw truth, pack mismatch, or payload drift', () => {
  expect(() => compileStepRecordVerifier(pack, raw.slice(1))).toThrow('record_verifier_task_missing');
  const companion = compileStepRecordVerifier(pack, raw);
  expect(() => selectStepRecordVerifier(companion, { ...pack, packHash: 'different' }, 1, 1)).toThrow('record_verifier_identity');
  const drift = raw.map(t => ({ ...t, payload: { ...t.payload, phrase: 'changed' } }));
  expect(() => compileStepRecordVerifier(pack, drift)).toThrow('record_verifier_payload');
});
test('answer-only drift fails compiler, selector and existing-public-pack backfill', () => {
  const changed = raw.map(t => ({ ...t, payload: { ...t.payload, correctIndex: 1 } }));
  expect(() => compileStepRecordVerifier(pack, changed)).toThrow('record_verifier_answer_drift');
  const companion = compileStepRecordVerifier(pack, raw);
  expect(() => selectStepRecordVerifier({ ...companion, steps: companion.steps.map(s => ({ ...s, tasks: changed })) }, pack, 1, 1)).toThrow('record_verifier_answer_drift');
  const { packHash: _hash, ...body } = pack;
  const published = { ...body, packHash: spirePackHash(body) };
  expect(() => prepareExistingStepRecordVerifier(Buffer.from(JSON.stringify(published)), published, published.source, changed)).toThrow('record_verifier_answer_drift');
});
test.each([
  ['guess_phrase', { phrase: 'p', options: ['a', 'b', 'c', 'd'], correctIndex: 0 }, { selectedIndex: 0 }, { selectedIndex: 1 }],
  ['listen_choose', { phrase: 'a', audioUri: 'device-tts:en:abcdef', options: ['a', 'b'], correctIndex: 0 }, { selectedIndex: 0 }, { selectedIndex: 1 }],
  ['translate_build', { phrase: 'p', wordBank: ['a', 'b'], correctTokens: ['a'] }, { tokens: ['a'] }, { tokens: ['b'] }],
  ['listen_build', { phrase: 'a', audioUri: 'device-tts:en:abcdef', wordBank: ['a', 'b'], correctTokens: ['a'] }, { tokens: ['a'] }, { tokens: ['b'] }],
  ['time_attack', { prompt: 'p', items: [{ prompt: 'q', options: ['a', 'b'], correctIndex: 0 }] }, { selectedIndexes: [0] }, { selectedIndexes: [1] }],
  ['speed_match', { prompt: 'p', items: [{ prompt: 'q', options: ['a', 'b'], correctIndex: 0 }] }, { selectedIndexes: [0] }, { selectedIndexes: [1] }],
] as const)('canonical verification for %s uses exact raw truth', (mode, payload, right, wrong) => {
  const tasks: TournamentTask[] = raw.map(t => ({ ...t, mode, payload: JSON.parse(JSON.stringify(payload)) }));
  const publicTasks = tasks.map(t => {
    const pub = toPublicTournamentTask(t)!;
    const publicPayload = { ...pub.payload };
    if (pub.kind === 'listen' || pub.kind === 'dictate') publicPayload.phrase = t.payload.phrase;
    if (pub.kind === 'dictate') publicPayload.correctTokenCount = 1;
    return { taskId: t.taskId, mode, kind: pub.kind, difficulty: 1, payload: publicPayload };
  });
  const variant = { ...pack, floors: pack.floors.map(f => ({ ...f, steps: f.steps.map(s => ({ ...s,
    sets: [{ tasks: publicTasks, answerFingerprints: tasks.map(t => {
      if (mode === 'listen_choose') return [answerFingerprint(pack.saltId, t.taskId, t.payload.correctIndex)];
      if (mode === 'listen_build') return [answerFingerprint(pack.saltId, t.taskId, t.payload.correctTokens)];
      return toPublicTournamentTask(t, pack.saltId)!.answerFingerprints!;
    }) }],
  })) })) };
  const selected = selectStepRecordVerifier(compileStepRecordVerifier(variant, tasks), variant, 1, 1);
  expect(selected.every(t => verifyTournamentAnswer(t, right))).toBe(true);
  expect(selected.some(t => verifyTournamentAnswer(t, wrong))).toBe(false);
  const changed = tasks.map(t => ({ ...t, payload: { ...t.payload,
    ...(mode === 'listen_build' || mode === 'translate_build' ? { correctTokens: ['b'] }
      : mode === 'speed_match' || mode === 'time_attack'
        ? { items: (t.payload.items as Record<string, unknown>[]).map(item => ({ ...item, correctIndex: 1 })) }
        : { correctIndex: 1 }),
  } }));
  expect(() => compileStepRecordVerifier(variant, changed)).toThrow('record_verifier_answer_drift');
  const { packHash: _hash, ...body } = variant;
  const published = { ...body, packHash: spirePackHash(body) };
  expect(() => prepareExistingStepRecordVerifier(Buffer.from(JSON.stringify(published)), published, published.source, changed)).toThrow('record_verifier_answer_drift');
});
