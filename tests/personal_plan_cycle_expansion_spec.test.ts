import fs from 'fs';
import path from 'path';

import {
  PERSONAL_PLAN_CYCLE_EXPANSION_SPEC,
  getPersonalPlanCycleExpansion,
} from '../app/personal_plan_cycle_expansion_spec';

const ROOT = path.resolve(__dirname, '..');

describe('personal plan cycle expansion spec', () => {
  it('maps the 28-day universal cycle onto every full plan length without using daily time', () => {
    expect(PERSONAL_PLAN_CYCLE_EXPANSION_SPEC.cycleLengthDays).toBe(28);
    expect(PERSONAL_PLAN_CYCLE_EXPANSION_SPEC.dailyTimeAffectsTaskSelection).toBe(false);
    expect(PERSONAL_PLAN_CYCLE_EXPANSION_SPEC.productionReady).toBe(false);

    expect(getPersonalPlanCycleExpansion('voyazh')).toMatchObject({
      totalDays: 84,
      fullCycles: 3,
      partialCycleDays: 0,
      totalCyclePasses: 3,
    });
    expect(getPersonalPlanCycleExpansion('mitap')).toMatchObject({
      totalDays: 112,
      fullCycles: 4,
      partialCycleDays: 0,
      totalCyclePasses: 4,
    });
    expect(getPersonalPlanCycleExpansion('gavan')).toMatchObject({
      totalDays: 126,
      fullCycles: 4,
      partialCycleDays: 14,
      totalCyclePasses: 5,
    });
    expect(getPersonalPlanCycleExpansion('impuls')).toMatchObject({
      totalDays: 140,
      fullCycles: 5,
      partialCycleDays: 0,
      totalCyclePasses: 5,
    });
    expect(getPersonalPlanCycleExpansion('echo')).toMatchObject({
      totalDays: 84,
      fullCycles: 3,
      partialCycleDays: 0,
      totalCyclePasses: 3,
    });
  });

  it('documents cycle difficulty growth and keeps the cycle draft-only before source import', () => {
    const doc = fs.readFileSync(
      path.join(ROOT, 'docs', 'personal-plans-cycle-expansion-spec.md'),
      'utf8',
    ).toLowerCase();

    expect(doc).toContain('28-day universal cycle');
    expect(doc).toContain('voyazh: 84 days = 3 full cycles');
    expect(doc).toContain('mitap: 112 days = 4 full cycles');
    expect(doc).toContain('gavan: 126 days = 4 full cycles + 14-day partial cycle');
    expect(doc).toContain('impuls: 140 days = 5 full cycles');
    expect(doc).toContain('echo: 84 days = 3 full cycles');
    expect(doc).toContain('selected daily time does not change');
    expect(doc).toContain('not production-ready');
    expect(doc).toContain('chat draft');
    expect(doc).toContain('cycle 1');
    expect(doc).toContain('cycle 2');
    expect(doc).toContain('cycle 3');
    expect(doc).toContain('cycle 4');
    expect(doc).toContain('cycle 5');
  });
});
