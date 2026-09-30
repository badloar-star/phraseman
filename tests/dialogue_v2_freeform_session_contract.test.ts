import {
  parseDialogueV2FreeformSessionStartShape,
  parseDialogueV2FreeformSessionTurnShape,
} from '../shared/dialogue_v2_freeform_session_contract';

describe('Dialogue V2 Plus freeform session public contracts', () => {
  it('accepts and freezes only the exact start payload', () => {
    const parsed = parseDialogueV2FreeformSessionStartShape({ studyTarget: 'de' });

    expect(parsed).toEqual({ studyTarget: 'de' });
    expect(Object.isFrozen(parsed)).toBe(true);
  });

  it.each([
    null,
    [],
    { studyTarget: 'de', scenarioId: 'work_01' },
    { studyTarget: 'de', rank: 7 },
    { studyTarget: 'de', model: 'provider-model' },
    { studyTarget: 'xx' },
  ])('rejects non-exact freeform start input %#', (input) => {
    expect(parseDialogueV2FreeformSessionStartShape(input)).toBeNull();
  });

  it('accepts and freezes only the exact freeform turn payload', () => {
    const parsed = parseDialogueV2FreeformSessionTurnShape({
      sessionId: `d2fs_${'S'.repeat(32)}`,
      turnId: `d2ft_${'T'.repeat(16)}`,
      studyTarget: 'fr',
      userMessage: 'On peut continuer cette conversation ?',
    });

    expect(parsed).toEqual({
      sessionId: `d2fs_${'S'.repeat(32)}`,
      turnId: `d2ft_${'T'.repeat(16)}`,
      studyTarget: 'fr',
      userMessage: 'On peut continuer cette conversation ?',
    });
    expect(Object.isFrozen(parsed)).toBe(true);
  });

  it.each([
    { sessionId: `d2s_${'S'.repeat(32)}`, turnId: `d2ft_${'T'.repeat(16)}`, studyTarget: 'fr', userMessage: 'Bonjour.' },
    { sessionId: `d2fs_${'S'.repeat(32)}`, turnId: `d2t_${'T'.repeat(16)}`, studyTarget: 'fr', userMessage: 'Bonjour.' },
    { sessionId: `d2fs_${'S'.repeat(32)}`, turnId: `d2ft_${'T'.repeat(16)}`, studyTarget: 'fr', userMessage: 'Bonjour.', scenarioId: 'work_01' },
    { sessionId: `d2fs_${'S'.repeat(32)}`, turnId: `d2ft_${'T'.repeat(16)}`, studyTarget: 'fr', userMessage: 'Bonjour.', objectives: [] },
    { sessionId: `d2fs_${'S'.repeat(32)}`, turnId: `d2ft_${'T'.repeat(16)}`, studyTarget: 'fr', userMessage: 'Bonjour.', history: [] },
    { sessionId: `d2fs_${'S'.repeat(32)}`, turnId: `d2ft_${'T'.repeat(16)}`, studyTarget: 'fr', userMessage: 'Bonjour.', audioUri: 'file://local' },
    { sessionId: `d2fs_${'S'.repeat(32)}`, turnId: `d2ft_${'T'.repeat(16)}`, studyTarget: 'fr', userMessage: ' Bonjour.' },
  ])('rejects cross-mode, extra, or non-canonical turn input %#', (input) => {
    expect(parseDialogueV2FreeformSessionTurnShape(input)).toBeNull();
  });

  it('rejects accessors and symbol-key smuggling without invoking them', () => {
    const getter = jest.fn(() => 'de');
    const accessor = Object.defineProperty({}, 'studyTarget', {
      enumerable: true,
      get: getter,
    });
    const symbolInput = { studyTarget: 'de', [Symbol('hidden')]: true };

    expect(parseDialogueV2FreeformSessionStartShape(accessor)).toBeNull();
    expect(getter).not.toHaveBeenCalled();
    expect(parseDialogueV2FreeformSessionStartShape(symbolInput)).toBeNull();
  });

  it('is explicitly shape-only and does not pretend to detect transparent proxies', () => {
    const proxy = new Proxy({ studyTarget: 'de' }, {});

    expect(parseDialogueV2FreeformSessionStartShape(proxy)).toEqual({ studyTarget: 'de' });
  });
});
