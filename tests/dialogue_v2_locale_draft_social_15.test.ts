import fs from 'node:fs'; import path from 'node:path';
import { DIALOGUE_STUDY_TARGETS } from '../app/dialogue_language_registry';
const DRAFT_PATH = path.join(__dirname, '..', 'content', 'dialogues-v2', 'authoring', 'locale-drafts', 'social_15.all-targets.v1.json');
describe('Dialogue V2 social_15 locale draft', () => {
  const draft = JSON.parse(fs.readFileSync(DRAFT_PATH, 'utf8')) as { status: unknown; sourceScenarioId: unknown; targets: Record<string, { content: { title: unknown; briefing: unknown; completionTone: unknown }; personas: { id: unknown }[]; objectives: { id: unknown; label: unknown }[] }> };
  test('covers every target with a non-release draft', () => { expect(draft.status).toBe('draft_not_releaseable'); expect(draft.sourceScenarioId).toBe('social_15'); expect(Object.keys(draft.targets).sort()).toEqual([...DIALOGUE_STUDY_TARGETS].sort()); });
  test('keeps Denis and eight expectation-setting goals', () => { for (const target of Object.values(draft.targets)) { expect((target.content.title as string).trim().length).toBeGreaterThan(2); expect((target.content.briefing as string).trim().length).toBeGreaterThan(20); expect(target.personas[0]?.id).toBe('denis'); expect(target.objectives.map((x) => x.id)).toEqual(['objective_01','objective_02','objective_03','objective_04','objective_05','objective_06','objective_07','objective_08']); expect(target.objectives.every((x) => typeof x.label === 'string' && x.label.trim().length >= 3)).toBe(true); } });
});
