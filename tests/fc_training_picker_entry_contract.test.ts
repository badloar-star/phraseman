import fs from 'node:fs';
import path from 'node:path';

const source = fs.readFileSync(
  path.join(__dirname, '..', 'app', 'flashcards', 'FlashcardsTabBar.tsx'),
  'utf8',
);

function trainOptionHandler(): string {
  const start = source.indexOf('const onTrainOption = useCallback(');
  const end = source.indexOf('const onCreateOption = useCallback(', start);
  expect(start).toBeGreaterThanOrEqual(0);
  expect(end).toBeGreaterThan(start);
  return source.slice(start, end);
}

describe('Cards training mode entry', () => {
  test('ordinary taps open deck selection for training, listening, speaking and blitz', () => {
    const handler = trainOptionHandler();

    expect(handler).toContain('setPickerOption(option);');
    expect(handler).not.toContain('getLastPreset(');
    expect(handler).not.toContain('buildFcTrainRoute(');
    expect(handler).toContain('setDeckOptions([]);');
    expect(handler).toContain('setDeckPreset(null);');
    expect(handler).toContain('setDeckDataMode(null);');
  });

  test('Start is blocked until decks and preset belong to the currently open mode', () => {
    expect(source).toContain('setDeckDataMode(mode);');
    expect(source).toContain('deckDataMode === pickerMode');
    expect(source).toContain('if (!option || deckDataMode !== fcTrainOptionPresetMode(option)) return;');
  });

  test('Errors keeps its dedicated setup sheet contract', () => {
    const handler = trainOptionHandler();

    expect(handler).toContain("if (option === 'errors')");
    expect(handler).toContain('setMistakeSheetVisible(true);');
    expect(handler.indexOf('setMistakeSheetVisible(true);')).toBeLessThan(
      handler.indexOf('setPickerOption(option);'),
    );
  });
});
