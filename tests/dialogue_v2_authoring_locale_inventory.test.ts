import fs from 'node:fs';
import path from 'node:path';
import ledger from '../content/dialogues-v2/authoring/dialogue_v2_authoring_ru.json';
import profiles from '../content/dialogues-v2/authoring/dialogue_v2_persona_locale_profiles.v1.json';
import { DIALOGUE_STUDY_TARGETS } from '../app/dialogue_language_registry';

type Draft = Readonly<{
  status: unknown;
  sourceScenarioId: unknown;
  targets: Record<string, Readonly<{
    content: Readonly<{ title: unknown; briefing: unknown; completionTone: unknown }>;
    personas: readonly Readonly<{ id: unknown }> [];
    objectives: readonly Readonly<{ id: unknown; label: unknown }> [];
  }>>;
}>;

const draftDirectory = path.join(
  __dirname,
  '..',
  'content',
  'dialogues-v2',
  'authoring',
  'locale-drafts',
);

const scenarios = ledger.worlds.flatMap((world) => world.scenarios);
const EXPECTED_TARGETS = ['de', 'en', 'es', 'fr'] as const;
const CYRILLIC = /[\u0400-\u04FF]/u;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isDraft(value: unknown): value is Draft {
  if (!isRecord(value) || !isRecord(value.targets)) return false;
  return Object.values(value.targets).every((target) => {
    if (!isRecord(target) || !isRecord(target.content)
      || !Array.isArray(target.personas) || !Array.isArray(target.objectives)) return false;
    return target.personas.every((persona) => isRecord(persona))
      && target.objectives.every((objective) => isRecord(objective));
  });
}

function readDraft(scenarioId: string): Draft {
  const parsed: unknown = JSON.parse(fs.readFileSync(
    path.join(draftDirectory, `${scenarioId}.all-targets.v1.json`),
    'utf8',
  ));
  if (!isDraft(parsed)) throw new Error(`invalid_dialogue_v2_locale_draft:${scenarioId}`);
  return parsed;
}

function expectTargetText(value: unknown, minimumLength: number): void {
  expect(typeof value).toBe('string');
  expect((value as string).trim().length).toBeGreaterThan(minimumLength);
  expect(value as string).not.toMatch(CYRILLIC);
}

describe('Dialogue V2 authoring locale inventory', () => {
  test('keeps every canonical scenario in every active target with 6–12 target-facing goals', () => {
    expect(scenarios).toHaveLength(76);
    expect([...DIALOGUE_STUDY_TARGETS].sort()).toEqual([...EXPECTED_TARGETS]);

    for (const scenario of scenarios) {
      const draft = readDraft(scenario.id);
      expect(draft.status).toBe('draft_not_releaseable');
      expect(draft.sourceScenarioId).toBe(scenario.id);
      expect(Object.keys(draft.targets).sort()).toEqual([...EXPECTED_TARGETS]);

      for (const target of Object.values(draft.targets)) {
        expectTargetText(target.content.title, 2);
        expectTargetText(target.content.briefing, 10);
        expectTargetText(target.content.completionTone, 2);
        expect(target.objectives).toHaveLength(scenario.objectives.length);
        expect(target.objectives.length).toBeGreaterThanOrEqual(6);
        expect(target.objectives.length).toBeLessThanOrEqual(12);
        expect(target.objectives.map((objective) => objective.id)).toEqual(
          scenario.objectives.map((objective) => objective.id),
        );
        expect(target.objectives.every(
          (objective) => typeof objective.label === 'string'
            && objective.label.trim().length > 2
            && !CYRILLIC.test(objective.label),
        )).toBe(true);
      }
    }
  });

  test('keeps every draft persona backed by a localised identity and style profile', () => {
    for (const scenario of scenarios) {
      const draft = readDraft(scenario.id);
      for (const [targetCode, target] of Object.entries(draft.targets)) {
        const targetProfiles = profiles.targets[targetCode as keyof typeof profiles.targets];
        expect(targetProfiles).toBeDefined();
        expect(target.personas.map((persona) => persona.id)).toEqual(
          scenario.personas.map((persona) => persona.id),
        );
        for (const persona of target.personas) {
          expect(typeof persona.id).toBe('string');
          const profile = targetProfiles[persona.id as keyof typeof targetProfiles];
          expect(profile).toBeDefined();
          expect(profile.displayName.trim().length).toBeGreaterThan(0);
          expect(profile.displayName).not.toMatch(CYRILLIC);
          expect(profile.styleNote.trim().length).toBeGreaterThan(10);
        }
      }
    }
  });
});
