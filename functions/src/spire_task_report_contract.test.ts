import {
  parseSpireTaskReportClaim,
  verifySpireTaskClaimAgainstPack,
} from './spire_task_report_contract';
import { spirePackHash } from './spire_pack_contract';

const packBody = {
  schema: 'spire-pack-v1' as const,
  weekId: '2026-W40',
  lang: 'es' as const,
  tier: 2,
  floors: [{
    floor: 1,
    steps: [{
      step: 1,
      sets: [{ tasks: [{ taskId: 'arena-es-fill_gap-1-0000', mode: 'fill_gap', kind: 'choice', difficulty: 1, payload: {} }] }],
    }],
  }],
};
const canonicalPackHash = spirePackHash(packBody);

const claim = {
  taskId: 'arena-es-fill_gap-1-0000',
  studyTarget: 'es' as const,
  weekId: '2026-W40',
  tier: 2,
  packHash: canonicalPackHash,
  floor: 1,
  step: 1,
  setIndex: 0,
  taskIndex: 0,
  reason: 'В вариантах два правильных ответа',
};

const pack = {
  ...packBody,
  packHash: canonicalPackHash,
};

describe('Spire task report contract', () => {
  test('accepts an exact ES/FR/DE published-pack location', () => {
    const parsed = parseSpireTaskReportClaim(claim);
    expect(parsed).toEqual(claim);
    expect(verifySpireTaskClaimAgainstPack(parsed, pack, claim.packHash)).toMatchObject({
      taskId: claim.taskId,
      studyTarget: 'es',
      mode: 'fill_gap',
      difficulty: 1,
    });
  });

  test.each([
    ['task id', { ...claim, taskId: 'arena-es-fill_gap-1-9999' }],
    ['pack hash', { ...claim, packHash: 'sp1_otherhash1234567890' }],
    ['week', { ...claim, weekId: '2026-W39' }],
    ['tier', { ...claim, tier: 3 }],
    ['location', { ...claim, taskIndex: 1 }],
  ])('rejects forged or stale %s claims', (_label, raw) => {
    const parsed = parseSpireTaskReportClaim(raw);
    expect(() => verifySpireTaskClaimAgainstPack(parsed, pack, claim.packHash)).toThrow('spire_task_report_pack_mismatch');
  });

  test('rejects English and malformed identity fields before any pack read', () => {
    expect(() => parseSpireTaskReportClaim({ ...claim, studyTarget: 'en' })).toThrow('spire_task_report_lang_invalid');
    expect(() => parseSpireTaskReportClaim({ ...claim, studyTarget: 'de' })).toThrow('spire_task_report_task_invalid');
    expect(() => parseSpireTaskReportClaim({ ...claim, weekId: '../2026-W40' })).toThrow('spire_task_report_week_invalid');
    expect(() => parseSpireTaskReportClaim({ ...claim, taskId: '../task' })).toThrow('spire_task_report_task_invalid');
  });

  test('rejects a pack whose embedded and Storage hashes agree but body was changed', () => {
    const changed = {
      ...pack,
      floors: [{ ...pack.floors[0], steps: [{ ...pack.floors[0].steps[0], sets: [{ tasks: [{
        ...pack.floors[0].steps[0].sets[0].tasks[0], difficulty: 3,
      }] }] }] }],
    };
    expect(() => verifySpireTaskClaimAgainstPack(claim, changed, claim.packHash))
      .toThrow('spire_task_report_pack_mismatch');
  });
});
