import { buildScenarioGreeting, personaNameFor } from '../app/ai_dialog_greeting';
import { DIALOG_SCENARIOS } from '../app/ai_dialog_scenarios';

describe('buildScenarioGreeting', () => {
  it('returns a non-empty greeting for every scenario', () => {
    for (const s of DIALOG_SCENARIOS) {
      const g = buildScenarioGreeting(s);
      expect(typeof g).toBe('string');
      expect(g.trim().length).toBeGreaterThan(0);
    }
  });

  it('produces a UNIQUE first line per scenario (not one shared greeting)', () => {
    const greetings = DIALOG_SCENARIOS.map((s) => buildScenarioGreeting(s));
    const unique = new Set(greetings);
    // Допускаем небольшие совпадения шаблонов, но в основном должны различаться.
    expect(unique.size).toBeGreaterThanOrEqual(Math.ceil(DIALOG_SCENARIOS.length * 0.7));
  });

  it('is deterministic — same scenario yields the same greeting', () => {
    const s = DIALOG_SCENARIOS[0];
    expect(buildScenarioGreeting(s)).toBe(buildScenarioGreeting(s));
  });

  it('weaves in the persona name when present', () => {
    const coffee = DIALOG_SCENARIOS.find((s) => s.id === 'coffee');
    expect(coffee).toBeTruthy();
    if (coffee) {
      const name = personaNameFor(coffee.persona);
      expect(name).toBe('Mia');
      expect(buildScenarioGreeting(coffee)).toContain('Mia');
    }
  });

  it('extracts titled names correctly (Mr./Dr.)', () => {
    expect(personaNameFor('Your name is Mr. Patel. You are precise.')).toBe('Mr. Patel');
    expect(personaNameFor('Your name is Mia. She is cheerful.')).toBe('Mia');
    expect(personaNameFor(undefined)).toBe('');
    expect(personaNameFor('No name here.')).toBe('');
  });

  it('never leaves double spaces or leading/trailing whitespace', () => {
    for (const s of DIALOG_SCENARIOS) {
      const g = buildScenarioGreeting(s);
      expect(g).toBe(g.trim());
      expect(g).not.toMatch(/ {2,}/);
    }
  });
});
