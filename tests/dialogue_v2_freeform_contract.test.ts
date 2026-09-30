import {
  parseDialogueV2FreeformSelection,
} from '../shared/dialogue_v2_freeform_contract';

describe('Dialogue V2 freeform selection contract', () => {
  test.each(['en', 'es', 'fr', 'de'] as const)(
    'accepts the exact supported study target %s',
    (studyTarget) => {
      const parsed = parseDialogueV2FreeformSelection({ studyTarget });

      expect(parsed).toEqual({ studyTarget });
      expect(Object.isFrozen(parsed)).toBe(true);
    },
  );

  test.each([
    null,
    undefined,
    [],
    {},
    { studyTarget: 'it' },
    { studyTarget: 'EN' },
    { studyTarget: 'en', scenarioId: 'social_01' },
    { studyTarget: 'en', rank: 19 },
    { studyTarget: 'en', persona: 'assistant' },
    { studyTarget: 'en', model: 'model' },
    { studyTarget: 'en', history: [] },
    { studyTarget: 'en', audioUri: 'file://private' },
    { studyTarget: 'en', path: 'users/victim' },
  ])('rejects non-exact or unsupported selection %#', (value) => {
    expect(parseDialogueV2FreeformSelection(value)).toBeNull();
  });

  test('rejects accessors without invoking user-controlled code', () => {
    const getter = jest.fn(() => 'en');
    const accessor = Object.defineProperty({}, 'studyTarget', {
      enumerable: true,
      get: getter,
    });

    expect(parseDialogueV2FreeformSelection(accessor)).toBeNull();
    expect(getter).not.toHaveBeenCalled();
  });
});
