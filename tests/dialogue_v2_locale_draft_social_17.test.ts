import fs from 'node:fs'; import path from 'node:path';
import { DIALOGUE_STUDY_TARGETS } from '../app/dialogue_language_registry';
const draft = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'content', 'dialogues-v2', 'authoring', 'locale-drafts', 'social_17.all-targets.v1.json'), 'utf8')) as { status: unknown; sourceScenarioId: unknown; targets: Record<string, { personas: { id: unknown }[]; objectives: { id: unknown; label: unknown }[] }> };
test('social_17 is non-release C1 content for all active targets with two voices and seven goals', () => {
  expect(draft.status).toBe('draft_not_releaseable'); expect(draft.sourceScenarioId).toBe('social_17'); expect(Object.keys(draft.targets).sort()).toEqual([...DIALOGUE_STUDY_TARGETS].sort());
  for (const t of Object.values(draft.targets)) { expect(t.personas.map(x => x.id)).toEqual(['zoe', 'denis']); expect(t.objectives.map(x => x.id)).toEqual(['objective_01','objective_02','objective_03','objective_04','objective_05','objective_06','objective_07']); expect(t.objectives.every(x => typeof x.label === 'string' && x.label.trim().length >= 3)).toBe(true); }
});
