import {
  SPIRE_PACK_SETS_PER_STEP,
  buildSpirePack,
  spireDifficultyCounts,
  spireFloorMix,
  spireHardness,
  spirePackHash,
  spirePackPath,
  spirePackTotalSteps,
} from './spire_pack_contract';
import { SPIRE_CONFIG_DEFAULTS, SPIRE_STEP_TASK_COUNT, spireStepsForFloor } from './spire_config_contract';
import { answerFingerprint, type TournamentTask } from './tournament_core';

/** Минимальный валидный пул: выбор (3 режима) + сборка + пары по трём сложностям. */
function makePool(perCell: number): TournamentTask[] {
  const out: TournamentTask[] = [];
  const base = { isVoice: false, tags: [], verified: true } as const;
  for (let difficulty = 1; difficulty <= 3; difficulty += 1) {
    for (let i = 0; i < perCell; i += 1) {
      for (const mode of ['guess_phrase', 'fill_gap', 'find_oddity']) {
        out.push({ ...base, taskId: `${mode}-${difficulty}-${i}`, mode, difficulty,
          payload: { phrase: `p${i}`, options: ['a', 'b', 'c', 'd'], correctIndex: i % 4 } });
      }
      out.push({ ...base, taskId: `translate_build-${difficulty}-${i}`, mode: 'translate_build', difficulty,
        payload: { phrase: `фраза ${i}`, wordBank: ['I', 'am', 'here', 'x'], correctTokens: ['I', 'am', 'here'], correctTokenCount: 3 } });
      out.push({ ...base, taskId: `speed_match-${difficulty}-${i}`, mode: 'speed_match', difficulty,
        payload: { prompt: 'пары', items: [{ prompt: 'one', options: ['один', 'два'], correctIndex: 0 }] } });
    }
  }
  return out;
}

const INPUT = {
  weekId: '2026-W40',
  lang: 'en',
  tier: 3,
  timer: SPIRE_CONFIG_DEFAULTS.timer,
  source: { poolVersion: 'pv', publicationFingerprint: 'fp', legacyPool: true },
};

describe('spire weekly pack (PM-272)', () => {
  it('path matches the Storage layout that spireReportSteps reads', () => {
    expect(spirePackPath('es', 7, '2026-W40')).toBe('spire_packs/es/7/2026-W40.json');
  });

  it('has 135 steps for floors 1..15 (contract §4 estimate)', () => {
    expect(spirePackTotalSteps()).toBe(135);
  });

  it('difficulty grows with tier and floor; counts always sum to 10', () => {
    expect(spireHardness(0, 1)).toBe(0);
    expect(spireHardness(11, 15)).toBe(1);
    expect(spireHardness(5, 10)).toBeGreaterThan(spireHardness(5, 9));
    for (const h of [0, 0.2, 0.5, 0.77, 1]) {
      const [a, b, c] = spireDifficultyCounts(h);
      expect(a + b + c).toBe(SPIRE_STEP_TASK_COUNT);
    }
    expect(spireFloorMix(1).translate_build).toBe(0);
    expect(spireFloorMix(3).translate_build).toBeGreaterThan(0);
  });

  it('builds 3 sets × 10 per step, no repeat inside a step, fingerprints salted by saltId', () => {
    const built = buildSpirePack({ ...INPUT, pool: makePool(60) });
    if (!built.ok) throw new Error(built.reason);
    const { pack } = built;
    expect(pack.floors).toHaveLength(15);
    for (const floor of pack.floors) {
      expect(floor.steps).toHaveLength(spireStepsForFloor(floor.floor));
      expect(floor.voiceRequired).toBe(false);
      for (const step of floor.steps) {
        expect(step.sets).toHaveLength(SPIRE_PACK_SETS_PER_STEP);
        const ids = step.sets.flatMap((set) => set.tasks.map((t) => t.taskId));
        expect(ids).toHaveLength(SPIRE_STEP_TASK_COUNT * SPIRE_PACK_SETS_PER_STEP);
        expect(new Set(ids).size).toBe(ids.length);
        for (const set of step.sets) {
          expect(set.answerFingerprints).toHaveLength(set.tasks.length);
          for (const task of set.tasks) {
            expect(task.payload).not.toHaveProperty('correctIndex');
            expect(task.payload).not.toHaveProperty('correctTokens');
          }
        }
      }
    }
    const first = pack.floors[0].steps[0].sets[0];
    const idx = first.tasks.findIndex((t) => t.mode === 'guess_phrase');
    const n = Number(first.tasks[idx].taskId.split('-').pop());
    expect(first.answerFingerprints[idx]).toEqual([answerFingerprint(pack.saltId, first.tasks[idx].taskId, n % 4)]);
  });

  it('is deterministic: same input → same packHash; hash passes PACK_HASH_RE', () => {
    const a = buildSpirePack({ ...INPUT, pool: makePool(60) });
    const b = buildSpirePack({ ...INPUT, pool: makePool(60).reverse() });
    if (!a.ok || !b.ok) throw new Error('build failed');
    expect(a.pack.packHash).toBe(b.pack.packHash);
    expect(a.pack.packHash).toMatch(/^[A-Za-z0-9:_-]{8,128}$/u);
    const c = buildSpirePack({ ...INPUT, tier: 4, pool: makePool(60) });
    if (!c.ok) throw new Error('build failed');
    expect(c.pack.packHash).not.toBe(a.pack.packHash);
    expect(spirePackHash({ x: 1, y: 2 })).toBe(spirePackHash({ y: 2, x: 1 }));
  });

  it('excludes operator-flagged tasks (PM-287)', () => {
    const flagged = ['guess_phrase-1-0', 'fill_gap-2-3'];
    const built = buildSpirePack({ ...INPUT, pool: makePool(60), excludedTaskIds: flagged });
    if (!built.ok) throw new Error(built.reason);
    const ids = built.pack.floors.flatMap((f) => f.steps.flatMap((s) => s.sets.flatMap((set) => set.tasks.map((t) => t.taskId))));
    for (const id of flagged) expect(ids).not.toContain(id);
    expect(built.pack.stats.excludedFlagged).toBe(2);
  });

  it('fails honestly on a pool too small for one step', () => {
    const built = buildSpirePack({ ...INPUT, pool: makePool(1) });
    expect(built.ok).toBe(false);
  });
});
