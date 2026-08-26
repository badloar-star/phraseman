import { arenaPromptSegments, shouldShowArenaBuilderPunctuation } from '../modules/arena/arena_prompt_semantics';

describe('Arena prompt semantic segments', () => {
  test('keeps focus styling exactly inside quote boundaries', () => {
    expect(arenaPromptSegments('Выберите «Do you like reading?» сейчас.', 'prompt')).toEqual([
      { text: 'Выберите ', role: 'native', focus: false },
      { text: '«Do you like reading?»', role: 'native', focus: true },
      { text: ' сейчас.', role: 'native', focus: false },
    ]);
  });

  test('uses explicit roles instead of guessing language from Latin letters', () => {
    expect(arenaPromptSegments('Settings', 'native')).toEqual([
      { text: 'Settings', role: 'native', focus: false },
    ]);
    expect(arenaPromptSegments('Settings', 'target')).toEqual([
      { text: 'Settings', role: 'target', focus: false },
    ]);
  });

  test('does not show display-only builder punctuation before a token is selected', () => {
    expect(shouldShowArenaBuilderPunctuation(0, '?')).toBe(false);
    expect(shouldShowArenaBuilderPunctuation(1, '?')).toBe(true);
  });
});
