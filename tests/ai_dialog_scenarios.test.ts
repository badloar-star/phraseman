import {
  DIALOG_SCENARIO_GROUPS,
  DIALOG_SCENARIOS,
  dialogScenarioGoal,
  dialogScenarioGroupLabel,
  dialogScenarioGroupShortLabel,
  dialogScenarioNextStepHint,
  dialogScenarioTitle,
  getScenarioById,
  getPublicDialogScenarios,
  getScenariosByCategory,
  getCourseDialogScenarios,
  getChallengeDialogScenarios,
} from '../app/ai_dialog_scenarios';

const MOJIBAKE_PATTERN = /[ÐÑ]|â[€”™€œ]/;

const CYRILLIC_PATTERN = /[\u0400-\u04FF]/;

describe('ai_dialog_scenarios', () => {
  it('exposes only active, non-hidden scenarios publicly', () => {
    const pub = getPublicDialogScenarios();
    expect(pub.length).toBeGreaterThanOrEqual(20);
    expect(pub.every((scenario) => scenario.active)).toBe(true);
    expect(pub.every((scenario) => !scenario.hiddenFromHome)).toBe(true);
  });

  it('splits the public catalogue into the two Dialogs tabs (course + situations)', () => {
    // Вкладка «Уроки» = course-сценарии (по уровню CEFR), вкладка «Ситуации» =
    // challenge-сценарии (по уровню аккаунта). Вместе они и есть публичный набор.
    const course = getCourseDialogScenarios();
    const challenge = getChallengeDialogScenarios();
    expect(course.length).toBeGreaterThan(0);
    expect(challenge.length).toBeGreaterThan(0);
    expect(course.length + challenge.length).toBe(getPublicDialogScenarios().length);
    expect(course.every((s) => (s.collection ?? 'course') === 'course')).toBe(true);
    expect(challenge.every((s) => s.collection === 'challenge')).toBe(true);
  });

  it('keeps scenario ids unique and routeable', () => {
    const ids = DIALOG_SCENARIOS.map((scenario) => scenario.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const id of ids) {
      expect(getScenarioById(id)?.id).toBe(id);
    }
  });

  it('has clean Russian catalogue copy and useful English prompt data', () => {
    for (const scenario of DIALOG_SCENARIOS) {
      expect(scenario.titleRu).not.toMatch(MOJIBAKE_PATTERN);
      expect(scenario.goalRu).not.toMatch(MOJIBAKE_PATTERN);
      expect(scenario.titleRu.length).toBeGreaterThan(4);
      expect(scenario.goalRu.length).toBeGreaterThan(12);
      expect(scenario.role).toMatch(/[a-z]/i);
      expect(scenario.setting).toMatch(/[a-z]/i);
      expect(scenario.goalEn).toMatch(/[a-z]/i);
    }
  });

  it('gives every scenario a Russian next-step hint instead of canned replies', () => {
    for (const scenario of DIALOG_SCENARIOS) {
      const extended = scenario as typeof scenario & { suggestedReplies?: string[] };
      expect(extended.suggestedReplies).toBeUndefined();
      expect(scenario.nextStepHintRu).not.toMatch(MOJIBAKE_PATTERN);
      expect(scenario.nextStepHintRu).toMatch(/[А-Яа-яЁё]/);
      expect(scenario.nextStepHintRu.length).toBeGreaterThan(18);
      expect(scenario.nextStepHintRu.length).toBeLessThanOrEqual(120);
    }
  });

  it('keeps absurd challenge premises as intentional roleplay conflicts', () => {
    const cat = getScenarioById('neighbor_cat_accusation');
    expect(cat?.titleRu).toBe('Сосед думает, ты прячешь его кота');
    expect(cat?.goalRu).toContain('докажи невиновность');
    expect(cat?.role).toMatch(/secretly keeping their lost cat/i);
    expect(cat?.setting).toContain("learner's flat");

    const robot = getScenarioById('broken_robot_waiter');
    expect(robot?.titleRu).toBe('Робот-официант сломался');
    expect(robot?.role).toMatch(/malfunctioning robot waiter/i);
    expect(robot?.persona).toMatch(/UNIT-7|robot/i);

    const support = getScenarioById('looping_support_bot');
    expect(support?.titleRu).toBe('Бот поддержки ходит по кругу');
    expect(support?.role).toMatch(/automated support bot/i);
    expect(support?.persona).toMatch(/HELPER-BOT/i);
  });

  it('keeps category navigation populated in declared order', () => {
    expect(DIALOG_SCENARIO_GROUPS.map((group) => group.category)).toEqual([
      'everyday',
      'travel',
      'social',
    ]);

    for (const group of DIALOG_SCENARIO_GROUPS) {
      expect(group.labelRu).not.toMatch(MOJIBAKE_PATTERN);
      expect(getScenariosByCategory(group.category).length).toBeGreaterThanOrEqual(5);
    }
  });

  it('localizes scenario menu copy into Spanish without Russian fallbacks', () => {
    for (const scenario of DIALOG_SCENARIOS) {
      const title = dialogScenarioTitle(scenario, 'es');
      const goal = dialogScenarioGoal(scenario, 'es');
      const nextStepHint = dialogScenarioNextStepHint(scenario, 'es');

      expect(title).not.toMatch(CYRILLIC_PATTERN);
      expect(goal).not.toMatch(CYRILLIC_PATTERN);
      expect(nextStepHint).not.toMatch(CYRILLIC_PATTERN);
      expect(title).not.toBe(scenario.titleRu);
      expect(goal).not.toBe(scenario.goalRu);
      expect(nextStepHint).not.toBe(scenario.nextStepHintRu);
      expect(title.length).toBeGreaterThanOrEqual(4);
      expect(goal.length).toBeGreaterThan(12);
      expect(nextStepHint.length).toBeGreaterThan(18);
    }

    expect(dialogScenarioTitle(DIALOG_SCENARIOS[0], 'es')).toBe('Pide un café');

    for (const group of DIALOG_SCENARIO_GROUPS) {
      const label = dialogScenarioGroupLabel(group, 'es');
      const shortLabel = dialogScenarioGroupShortLabel(group, 'es');
      expect(label).not.toMatch(CYRILLIC_PATTERN);
      expect(shortLabel).not.toMatch(CYRILLIC_PATTERN);
      expect(label).not.toBe(group.labelRu);
      expect(shortLabel).not.toBe(group.shortLabelRu);
    }
  });

  it('localizes scenario menu copy into Heisenberg batch locales without Russian fallbacks', () => {
    for (const lang of ['pt-BR', 'vi', 'id', 'tr', 'pl'] as const) {
      for (const scenario of DIALOG_SCENARIOS) {
        const title = dialogScenarioTitle(scenario, lang);
        const goal = dialogScenarioGoal(scenario, lang);
        const nextStepHint = dialogScenarioNextStepHint(scenario, lang);

        expect(title).not.toMatch(CYRILLIC_PATTERN);
        expect(goal).not.toMatch(CYRILLIC_PATTERN);
        expect(nextStepHint).not.toMatch(CYRILLIC_PATTERN);
        expect(title).not.toBe(scenario.titleRu);
        expect(goal).not.toBe(scenario.goalRu);
        expect(nextStepHint).not.toBe(scenario.nextStepHintRu);
        expect(title.length).toBeGreaterThanOrEqual(4);
        expect(goal.length).toBeGreaterThan(12);
        expect(nextStepHint.length).toBeGreaterThan(18);
      }
    }
  });
});
