import fs from 'node:fs';
import path from 'node:path';

import { DIALOGUE_STUDY_TARGETS } from '../app/dialogue_language_registry';

const DRAFT_PATH = path.join(__dirname, '..', 'content', 'dialogues-v2', 'authoring', 'locale-drafts', 'social_13.all-targets.v1.json');

describe('Dialogue V2 social_13 locale draft', () => {
  const draft = JSON.parse(fs.readFileSync(DRAFT_PATH, 'utf8')) as {
    status: unknown;
    sourceScenarioId: unknown;
    targets: Record<string, {
      content: { title: unknown; briefing: unknown; completionTone: unknown };
      personas: { id: unknown; displayName: unknown; styleNote: unknown }[];
      objectives: { id: unknown; label: unknown }[];
    }>;
  };

  test('has a non-release localisation draft for every target language', () => {
    expect(draft.status).toBe('draft_not_releaseable');
    expect(draft.sourceScenarioId).toBe('social_13');
    expect(Object.keys(draft.targets).sort()).toEqual([...DIALOGUE_STUDY_TARGETS].sort());
  });

  test('keeps both participant styles and all seven repair-of-understanding goals', () => {
    for (const target of Object.values(draft.targets)) {
      expect((target.content.title as string).trim().length).toBeGreaterThan(2);
      expect((target.content.briefing as string).trim().length).toBeGreaterThan(20);
      expect((target.content.completionTone as string).trim().length).toBeGreaterThan(2);
      expect(target.personas.map((persona) => persona.id)).toEqual(['mila', 'zoe']);
      expect(target.objectives.map((objective) => objective.id)).toEqual([
        'objective_01', 'objective_02', 'objective_03', 'objective_04',
        'objective_05', 'objective_06', 'objective_07',
      ]);
      expect(target.objectives.every((objective) => typeof objective.label === 'string'
        && objective.label.trim().length >= 3)).toBe(true);
    }
  });
});
