import {
  DIALOGUE_V2_CEFR_SEQUENCE,
  isDialogueV2Pack,
  validateDialogueV2PackReference,
  validateDialogueV2Pack,
} from '../shared/dialogue_v2_contract';

describe('dialogue v2 canonical contract', () => {
  test('accepts exactly four worlds with the required 19-step CEFR progression', () => {
    const pack = {
      worlds: ['social', 'work', 'travel', 'everyday'].map((world) => ({
        id: world,
        scenarios: DIALOGUE_V2_CEFR_SEQUENCE.map((cefr, index) => ({
          id: `${world}_${index + 1}`,
          rankRequired: index + 1,
          cefr,
          objectives: Array.from({ length: 6 }, (_, objectiveIndex) => ({ id: `goal_${objectiveIndex + 1}` })),
        })),
      })),
    };

    expect(validateDialogueV2Pack(pack)).toEqual({ ok: true });
  });

  test('rejects a scenario id repeated in two worlds', () => {
    const pack = {
      worlds: ['social', 'work', 'travel', 'everyday'].map((world) => ({
        id: world,
        scenarios: DIALOGUE_V2_CEFR_SEQUENCE.map((cefr, index) => ({
          id: `${world}_${index + 1}`,
          rankRequired: index + 1,
          cefr,
          objectives: Array.from({ length: 6 }, (_, objectiveIndex) => ({ id: `goal_${objectiveIndex + 1}` })),
        })),
      })),
    };
    pack.worlds[1].scenarios[0].id = pack.worlds[0].scenarios[0].id;

    expect(validateDialogueV2Pack(pack)).toEqual({ ok: false, error: 'scenario_id' });
  });

  test('rejects a non-string scenario id', () => {
    const pack = {
      worlds: ['social', 'work', 'travel', 'everyday'].map((world) => ({
        id: world,
        scenarios: DIALOGUE_V2_CEFR_SEQUENCE.map((cefr, index) => ({
          id: `${world}_${index + 1}`,
          rankRequired: index + 1,
          cefr,
          objectives: Array.from({ length: 6 }, (_, objectiveIndex) => ({ id: `goal_${objectiveIndex + 1}` })),
        })),
      })),
    };
    pack.worlds[0].scenarios[0].id = 1 as unknown as string;

    expect(validateDialogueV2Pack(pack)).toEqual({ ok: false, error: 'scenario_id' });
  });

  test('rejects empty or repeated objective ids', () => {
    const pack = {
      worlds: ['social', 'work', 'travel', 'everyday'].map((world) => ({
        id: world,
        scenarios: DIALOGUE_V2_CEFR_SEQUENCE.map((cefr, index) => ({
          id: `${world}_${index + 1}`,
          rankRequired: index + 1,
          cefr,
          objectives: Array.from({ length: 6 }, (_, objectiveIndex) => ({ id: `goal_${objectiveIndex + 1}` })),
        })),
      })),
    };
    pack.worlds[0].scenarios[0].objectives[5].id = '';

    expect(validateDialogueV2Pack(pack)).toEqual({ ok: false, error: 'objective_id' });
  });

  test('rejects a scenario id with surrounding whitespace', () => {
    const pack = {
      worlds: ['social', 'work', 'travel', 'everyday'].map((world) => ({
        id: world,
        scenarios: DIALOGUE_V2_CEFR_SEQUENCE.map((cefr, index) => ({
          id: `${world}_${index + 1}`,
          rankRequired: index + 1,
          cefr,
          objectives: Array.from({ length: 6 }, (_, objectiveIndex) => ({ id: `goal_${objectiveIndex + 1}` })),
        })),
      })),
    };
    pack.worlds[0].scenarios[0].id = ' social_1 ';

    expect(validateDialogueV2Pack(pack)).toEqual({ ok: false, error: 'scenario_id' });
  });

  test('exposes a type-safe boolean guard for a structurally valid pack', () => {
    const pack: unknown = {
      worlds: ['social', 'work', 'travel', 'everyday'].map((world) => ({
        id: world,
        scenarios: DIALOGUE_V2_CEFR_SEQUENCE.map((cefr, index) => ({
          id: `${world}_${index + 1}`,
          rankRequired: index + 1,
          cefr,
          objectives: Array.from({ length: 6 }, (_, objectiveIndex) => ({ id: `goal_${objectiveIndex + 1}` })),
        })),
      })),
    };

    expect(isDialogueV2Pack(pack)).toBe(true);
    expect(isDialogueV2Pack({ worlds: [] })).toBe(false);
  });

  test('accepts only a canonical immutable pack reference', () => {
    expect(validateDialogueV2PackReference({
      scenarioId: 'social_01',
      packVersion: 'dialogues_v2_2026_09_26',
      packSha256: 'a'.repeat(64),
      catalogueSha256: 'b'.repeat(64),
    })).toEqual({ ok: true });

    expect(validateDialogueV2PackReference({
      scenarioId: ' social_01 ',
      packVersion: 'dialogues_v2_2026_09_26',
      packSha256: 'a'.repeat(64),
      catalogueSha256: 'b'.repeat(64),
    })).toEqual({ ok: false, error: 'pack_reference_invalid' });
  });
});
