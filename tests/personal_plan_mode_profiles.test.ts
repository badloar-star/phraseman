import {
  PLAN_MODE_PROFILES,
  PLAN_TAIL_KINDS,
  requiredMinutesForKind,
  tailOrderForPlanDay,
} from '../app/personal_plan_mode_profiles';
import {
  getPlanById,
  tasksForMinutes,
  type PersonalPlanId,
  type PlanMinutesChoice,
} from '../app/personal_plan_catalog';

const PLAN_IDS: PersonalPlanId[] = ['voyazh', 'mitap', 'gavan', 'impuls', 'echo'];
const ALL_MINUTES: PlanMinutesChoice[] = [5, 10, 15, 20];

describe('personal_plan_mode_profiles', () => {
  describe('profile invariants', () => {
    it('puts speaking (plan_pronunciation_repeat) in the 5-minute tier of EVERY plan', () => {
      // Концепция: во всех планах упор на разговорные режимы.
      for (const planId of PLAN_IDS) {
        expect(requiredMinutesForKind(planId, 'plan_pronunciation_repeat')).toContain(5);
      }
    });

    it('keeps tiers monotonic: required at a shorter session implies required at longer ones', () => {
      for (const planId of PLAN_IDS) {
        for (const kind of PLAN_TAIL_KINDS) {
          const tiers = requiredMinutesForKind(planId, kind as never);
          for (let i = 0; i < ALL_MINUTES.length - 1; i += 1) {
            if (tiers.includes(ALL_MINUTES[i])) {
              expect(tiers).toContain(ALL_MINUTES[i + 1]);
            }
          }
        }
      }
    });

    it('requires the full tail at 20 minutes for every plan', () => {
      for (const planId of PLAN_IDS) {
        for (const kind of PLAN_TAIL_KINDS) {
          expect(requiredMinutesForKind(planId, kind as never)).toContain(20);
        }
      }
    });

    it('gives every plan a UNIQUE 5-minute kind set (plans differ in composition)', () => {
      const signatures = PLAN_IDS.map((planId) =>
        PLAN_TAIL_KINDS
          .filter((kind) => requiredMinutesForKind(planId, kind as never).includes(5))
          .sort()
          .join('|'),
      );
      expect(new Set(signatures).size).toBe(PLAN_IDS.length);
    });

    it('keeps every tail order a permutation of the 6 tail kinds', () => {
      for (const planId of PLAN_IDS) {
        for (const order of PLAN_MODE_PROFILES[planId].tailOrders) {
          expect([...order].sort()).toEqual([...PLAN_TAIL_KINDS].sort());
        }
      }
    });

    it('gives every plan its own rotation set (no two plans share identical ordering)', () => {
      const signatures = PLAN_IDS.map((planId) => JSON.stringify(PLAN_MODE_PROFILES[planId].tailOrders));
      expect(new Set(signatures).size).toBe(PLAN_IDS.length);
    });

    it('rotates the tail order across days within a plan (variety preserved)', () => {
      for (const planId of PLAN_IDS) {
        const day1 = tailOrderForPlanDay(planId, 1).join('|');
        const day2 = tailOrderForPlanDay(planId, 2).join('|');
        expect(day1).not.toBe(day2);
      }
    });

    it('leads day 1 with each plan signature mode', () => {
      // Golden anchors: the first tail task IS the plan emphasis.
      expect(tailOrderForPlanDay('echo', 1)[0]).toBe('plan_listen_choose');
      expect(tailOrderForPlanDay('impuls', 1)[0]).toBe('plan_pronunciation_repeat');
      expect(tailOrderForPlanDay('voyazh', 1)[0]).toBe('plan_pronunciation_repeat');
      expect(tailOrderForPlanDay('gavan', 1)[0]).toBe('plan_missing_word');
      expect(tailOrderForPlanDay('mitap', 1)[0]).toBe('plan_missing_word');
    });
  });

  describe('catalog integration', () => {
    it('two different plans produce different 5-minute weeks (workplan Ф3 criterion)', () => {
      // The day screen shows the first N tasks in order, so over a week the
      // short-session kind sequence must differ for every pair of plans.
      const weekSignature = (planId: PersonalPlanId): string => {
        const plan = getPlanById(planId);
        return plan.days
          .slice(0, 7)
          .map((day) => tasksForMinutes(day, 5).map((task) => task.kind).join(','))
          .join(';');
      };

      for (let a = 0; a < PLAN_IDS.length; a += 1) {
        for (let b = a + 1; b < PLAN_IDS.length; b += 1) {
          expect(weekSignature(PLAN_IDS[a])).not.toBe(weekSignature(PLAN_IDS[b]));
        }
      }
    });

    it('applies profile requiredFor to generated day tasks', () => {
      // gavan (ЗАПАС) keeps recall in short sessions; echo (ЭФИР) defers it.
      const gavanDay = getPlanById('gavan').days[4];
      const echoDay = getPlanById('echo').days[4];
      const recallOf = (day: { tasks: Array<{ kind: string; requiredFor: number[] }> }) =>
        day.tasks.find((task) => task.kind === 'plan_phrase_recall');

      expect(recallOf(gavanDay)?.requiredFor).toContain(5);
      expect(recallOf(echoDay)?.requiredFor).not.toContain(5);
      expect(recallOf(echoDay)?.requiredFor).toEqual(expect.arrayContaining([15, 20]));
    });

    it('keeps speaking required at every minute choice in all plans', () => {
      for (const planId of PLAN_IDS) {
        const day = getPlanById(planId).days[1];
        const speaking = day.tasks.find((task) => task.kind === 'plan_pronunciation_repeat');
        expect(speaking).toBeTruthy();
        expect(speaking?.requiredFor).toEqual(expect.arrayContaining(ALL_MINUTES));
      }
    });
  });
});
