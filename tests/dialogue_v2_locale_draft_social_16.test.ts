import fs from 'node:fs'; import path from 'node:path';
import { DIALOGUE_STUDY_TARGETS } from '../app/dialogue_language_registry';
const DRAFT_PATH = path.join(__dirname, '..', 'content', 'dialogues-v2', 'authoring', 'locale-drafts', 'social_16.all-targets.v1.json');
describe('Dialogue V2 social_16 locale draft', () => {
 const draft = JSON.parse(fs.readFileSync(DRAFT_PATH, 'utf8')) as { status: unknown; sourceScenarioId: unknown; targets: Record<string, { content: { title: unknown; briefing: unknown; completionTone: unknown }; personas: { id: unknown }[]; objectives: { id: unknown; label: unknown }[] }> };
 test('is a non-release draft for every active target', () => { expect(draft.status).toBe('draft_not_releaseable'); expect(draft.sourceScenarioId).toBe('social_16'); expect(Object.keys(draft.targets).sort()).toEqual([...DIALOGUE_STUDY_TARGETS].sort()); });
 test('keeps Mila and seven delicate-feedback tasks', () => { for (const t of Object.values(draft.targets)) { expect((t.content.title as string).trim().length).toBeGreaterThan(2); expect((t.content.briefing as string).trim().length).toBeGreaterThan(20); expect(t.personas[0]?.id).toBe('mila'); expect(t.objectives.map(x => x.id)).toEqual(['objective_01','objective_02','objective_03','objective_04','objective_05','objective_06','objective_07']); expect(t.objectives.every(x => typeof x.label === 'string' && x.label.trim().length >= 3)).toBe(true); } });
});
