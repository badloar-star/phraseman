import { CAN_DO_GOALS } from './max_voice_can_do_goals';
import {
  TUTOR_NATIVE_GOAL_CATALOG,
  pickTutorGoalForTarget,
  projectTutorGoalTitle,
  tutorGoalForTargetById,
} from './tutor_text_goal_catalog';

describe('native tutor goal catalog', () => {
  it.each(['es', 'fr', 'de'] as const)('%s has at least four native pragmatic goals per CEFR', (target) => {
    for (const level of ['A1', 'A2', 'B1', 'B2']) {
      expect(TUTOR_NATIVE_GOAL_CATALOG[target].filter((row) => row.level === level)).toHaveLength(4);
    }
  });

  it.each(['es', 'fr', 'de'] as const)('%s projects a native learner-facing label without English grammar templates', (target) => {
    const title = projectTutorGoalTitle('a1_greet', target);
    expect(new Set(Object.values(title)).size).toBe(1);
    expect(Object.values(title).join(' ')).not.toMatch(/was\s*\/\s*were|phrasal|present simple/i);
  });

  it.each(['es', 'fr', 'de'] as const)('%s keeps every selected descriptor free of English grammar forms', (target) => {
    expect(TUTOR_NATIVE_GOAL_CATALOG[target]).toHaveLength(16);
    expect(TUTOR_NATIVE_GOAL_CATALOG[target].map((row) => row.label).join(' '))
      .not.toMatch(/\b(?:was|were|will|going to|phrasal|present simple|past simple)\b/i);
  });

  it('keeps all 78 English goals but rejects non-native direct goal ids', () => {
    const englishOnly = CAN_DO_GOALS.find((goal) => !TUTOR_NATIVE_GOAL_CATALOG.de.some((row) => row.goalId === goal.id));
    expect(englishOnly).toBeDefined();
    expect(tutorGoalForTargetById(englishOnly!.id, 'en')).toBe(englishOnly);
    expect(tutorGoalForTargetById(englishOnly!.id, 'de')).toBeUndefined();
  });

  it('adapts an unsupported direct goal to a permitted native goal', () => {
    expect(pickTutorGoalForTarget({}, 'A1', 'de', 'a1_be_past')?.id).toBe('a1_greet');
  });

  it('offers a useful same-level revisit after every native goal is mastered', () => {
    const mastered = Object.fromEntries(TUTOR_NATIVE_GOAL_CATALOG.es.map((row) => [row.goalId, 3]));
    expect(pickTutorGoalForTarget(mastered, 'A2', 'es')?.id).toBe('a2_plans');
  });
});
