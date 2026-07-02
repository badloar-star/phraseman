// Валидация контента aha_scenes.ts: тайминги, дистракторы, маппинг сценариев, локализация.

import { AHA_SCENARIOS, AHA_STRINGS, ahaLineWordCount, resolveAhaScenario } from '../components/onboarding_aha/aha_scenes';
import type { AhaLine, AhaScenarioId, TriText } from '../components/onboarding_aha/aha_types';

const ALL_LINES: Array<{ scenarioId: AhaScenarioId; kind: 'hear' | 'say'; line: AhaLine }> = Object.values(
  AHA_SCENARIOS,
).flatMap((scenario) => [
  { scenarioId: scenario.id, kind: 'hear' as const, line: scenario.hear },
  { scenarioId: scenario.id, kind: 'say' as const, line: scenario.say },
]);

describe('AHA_SCENARIOS: тайминги реплик (12 штук: 6 hear + 6 say)', () => {
  it('ровно 12 реплик проверяется', () => {
    expect(ALL_LINES.length).toBe(12);
  });

  it.each(ALL_LINES.map((entry) => [`${entry.scenarioId}.${entry.kind}`, entry] as const))(
    '%s: timings.length === числу слов text',
    (_label, entry) => {
      const wordCount = ahaLineWordCount(entry.line.text);
      expect(entry.line.timings.length).toBe(wordCount);
    },
  );

  it.each(ALL_LINES.map((entry) => [`${entry.scenarioId}.${entry.kind}`, entry] as const))(
    '%s: тайминги неубывающие, endMs > startMs для каждого слова',
    (_label, entry) => {
      const timings = entry.line.timings;
      for (const t of timings) {
        expect(t.endMs).toBeGreaterThan(t.startMs);
      }
      for (let i = 1; i < timings.length; i++) {
        expect(timings[i].startMs).toBeGreaterThanOrEqual(timings[i - 1].endMs);
      }
    },
  );

  it.each(ALL_LINES.map((entry) => [`${entry.scenarioId}.${entry.kind}`, entry] as const))(
    '%s: durationMs >= endMs последнего слова',
    (_label, entry) => {
      const timings = entry.line.timings;
      const lastEnd = timings[timings.length - 1]?.endMs ?? 0;
      expect(entry.line.durationMs).toBeGreaterThanOrEqual(lastEnd);
    },
  );
});

describe('AHA_SCENARIOS: дистракторы не совпадают со словами своей say-фразы', () => {
  it.each(Object.values(AHA_SCENARIOS).map((s) => [s.id, s] as const))('%s', (_id, scenario) => {
    const sayWords = new Set(
      scenario.say.text
        .split(/\s+/)
        .filter(Boolean)
        .map((w) => w.replace(/[.,!?]+$/, '').toLowerCase()),
    );
    for (const distractor of scenario.distractors) {
      expect(sayWords.has(distractor.toLowerCase())).toBe(false);
    }
  });
});

describe('resolveAhaScenario: маппинг цели -> сценарий', () => {
  const cases: Array<[Parameters<typeof resolveAhaScenario>[0], AhaScenarioId]> = [
    ['travel', 'travel'],
    ['series', 'media'],
    ['everyday', 'people'],
    ['words', 'everyday'],
    ['mind', 'self'],
    ['work', 'work'],
    [null, 'self'],
    ['unknown', 'self'],
    [undefined, 'self'],
  ];

  it.each(cases)('%s -> %s', (goal, expectedId) => {
    expect(resolveAhaScenario(goal).id).toBe(expectedId);
  });
});

describe('Локализация: все TriText непустые ru/uk/es', () => {
  function collectTriTexts(): Array<[string, TriText]> {
    const result: Array<[string, TriText]> = [];
    for (const scenario of Object.values(AHA_SCENARIOS)) {
      result.push([`${scenario.id}.setting`, scenario.setting]);
      result.push([`${scenario.id}.replyPrompt`, scenario.replyPrompt]);
      result.push([`${scenario.id}.hear.translation`, scenario.hear.translation]);
      result.push([`${scenario.id}.say.translation`, scenario.say.translation]);
    }
    for (const [key, value] of Object.entries(AHA_STRINGS)) {
      result.push([`AHA_STRINGS.${key}`, value]);
    }
    return result;
  }

  it.each(collectTriTexts())('%s: ru/uk/es непустые', (_label, tri) => {
    expect(tri.ru.trim().length).toBeGreaterThan(0);
    expect(tri.uk.trim().length).toBeGreaterThan(0);
    expect(tri.es.trim().length).toBeGreaterThan(0);
  });
});
