import fs from 'fs';
import path from 'path';

import { DIALOGUE_V2_CATALOGUE_INDEX } from '../shared/dialogue_v2_catalogue_index';

type Objective = Readonly<{ id: string; labelRu: string }>;
type Persona = Readonly<{
  id: string;
  displayNameRu: string;
  replyStyle: string;
  styleNoteRu: string;
  mood: string;
  correctionStyle: string;
}>;
type Scenario = Readonly<{
  id: string;
  rankRequired: number;
  cefr: string;
  titleRu: string;
  authoringTitleRu?: string;
  briefingRu: string;
  completionToneRu: string;
  personas: readonly Persona[];
  objectives: readonly Objective[];
}>;
type World = Readonly<{ id: string; scenarios: readonly Scenario[] }>;
type TitleReconciliation = Readonly<{
  scenarioId: string;
  expectedCefr: string;
  authoredCefr: string;
  expectedTitle: string;
  authoredTitle: string;
}>;
type Ledger = Readonly<{
  schemaVersion: string;
  status: string;
  sourceLocale: string;
  immutablePolicy: string;
  titleReconciliation: readonly TitleReconciliation[];
  worlds: readonly World[];
}>;

const CEFR_SEQUENCE = [
  'A1', 'A1', 'A1', 'A1', 'A1',
  'A2', 'A2', 'A2', 'A2', 'A2',
  'B1', 'B1', 'B1',
  'B2', 'B2', 'B2',
  'C1', 'C1',
  'C2',
];

function readLedger(): Ledger {
  return JSON.parse(fs.readFileSync(
    path.join(__dirname, '..', 'content', 'dialogues-v2', 'authoring', 'dialogue_v2_authoring_ru.json'),
    'utf8',
  )) as Ledger;
}

describe('Dialogue V2 Russian authoring ledger', () => {
  it('contains the full rank-by-rank 76-scenario source with 6–12 named objectives each', () => {
    const ledger = readLedger();
    expect(ledger).toMatchObject({
      schemaVersion: 'dialogue-v2-authoring-ledger.v1',
      status: 'authoring_only_not_releaseable',
      sourceLocale: 'ru',
    });
    expect(ledger.worlds.map((world) => world.id)).toEqual(['social', 'work', 'travel', 'everyday']);
    expect(ledger.worlds.flatMap((world) => world.scenarios)).toHaveLength(76);

    for (const world of ledger.worlds) {
      expect(world.scenarios).toHaveLength(19);
      expect(world.scenarios.map((scenario) => scenario.rankRequired)).toEqual(
        Array.from({ length: 19 }, (_, index) => index + 1),
      );
      expect(world.scenarios.map((scenario) => scenario.cefr)).toEqual(CEFR_SEQUENCE);
      expect(world.scenarios.map((scenario) => ({
        id: scenario.id,
        rankRequired: scenario.rankRequired,
        cefr: scenario.cefr,
      }))).toEqual(DIALOGUE_V2_CATALOGUE_INDEX
        .filter((entry) => entry.worldId === world.id)
        .map(({ id, rankRequired, cefr }) => ({ id, rankRequired, cefr })));
      for (const scenario of world.scenarios) {
        expect(scenario.objectives.length).toBeGreaterThanOrEqual(6);
        expect(scenario.objectives.length).toBeLessThanOrEqual(12);
        expect(new Set(scenario.objectives.map((objective) => objective.id)).size)
          .toBe(scenario.objectives.length);
        expect(scenario.objectives.every((objective) => objective.labelRu.trim().length > 0)).toBe(true);
        expect(scenario.briefingRu.trim().length).toBeGreaterThanOrEqual(20);
        expect(scenario.completionToneRu.trim().length).toBeGreaterThanOrEqual(8);
        expect(scenario.personas.length).toBeGreaterThanOrEqual(1);
        expect(scenario.personas.length).toBeLessThanOrEqual(3);
        expect(new Set(scenario.personas.map((persona) => persona.id)).size)
          .toBe(scenario.personas.length);
        expect(scenario.personas.every((persona) => (
          persona.displayNameRu.trim().length > 0
          && persona.styleNoteRu.trim().length >= 12
          && ['warm', 'direct', 'calm', 'playful', 'formal'].includes(persona.replyStyle)
          && ['open', 'focused', 'helpful', 'measured', 'energetic'].includes(persona.mood)
          && ['none', 'gentle', 'playful_gentle'].includes(persona.correctionStyle)
        ))).toBe(true);
      }
    }
  });

  it('records title reconciliations and explicitly forbids learner delivery before localized reviewed packs exist', () => {
    const ledger = readLedger();
    expect(ledger.titleReconciliation).toHaveLength(8);
    expect(ledger.immutablePolicy).toContain('Do not expose to learners');
    const scenarioById = new Map(
      ledger.worlds.flatMap((world) => world.scenarios).map((scenario) => [scenario.id, scenario]),
    );
    for (const reconciliation of ledger.titleReconciliation) {
      const scenario = scenarioById.get(reconciliation.scenarioId);
      expect(scenario).toBeDefined();
      expect(reconciliation.expectedCefr).toBe(reconciliation.authoredCefr);
      expect(scenario?.cefr).toBe(reconciliation.expectedCefr);
      expect(scenario?.titleRu).toBe(reconciliation.expectedTitle);
      expect(scenario?.authoringTitleRu).toBe(reconciliation.authoredTitle);
    }
  });
});
