import fs from 'fs';
import path from 'path';

const root = path.join(__dirname, '..');
const trainerSource = fs.readFileSync(path.join(root, 'app', 'trainer_phrases_session.tsx'), 'utf8');
const duoPressableSource = fs.readFileSync(path.join(root, 'components', 'DuoPressable.tsx'), 'utf8');

describe('trainer word-bank instant touch feedback', () => {
  it('lets DuoPressable compose caller press-in/out callbacks with its own animation', () => {
    expect(duoPressableSource).toContain('onPressIn?: PressableProps[\'onPressIn\']');
    expect(duoPressableSource).toContain('onPressOut?: PressableProps[\'onPressOut\']');
    expect(duoPressableSource).toContain('onPressIn?.(event)');
    expect(duoPressableSource).toContain('onPressOut?.(event)');
  });

  it('starts a reversible tile preview on press-in and commits only on press', () => {
    const wordBankSource = trainerSource.slice(
      trainerSource.indexOf('function WordBankMode'),
      trainerSource.indexOf('function FillGapMode'),
    );

    expect(wordBankSource).toContain('const [previewTile, setPreviewTile]');
    expect(wordBankSource).toContain('onPressIn={() => setPreviewTile(tile)}');
    expect(wordBankSource).toContain('onPressOut={() => setPreviewTile(null)}');
    expect(wordBankSource).toContain('const visibleSelected');
    expect(wordBankSource).toContain('visibleSelected.map');

    // A scroll-cancelled touch may animate a preview, but must never mutate the answer.
    const tileStart = wordBankSource.indexOf('<DuoPressable');
    const tileEnd = wordBankSource.indexOf('</DuoPressable>', tileStart);
    const tileBlock = wordBankSource.slice(tileStart, tileEnd);
    const pressHandler = tileBlock.slice(tileBlock.indexOf('onPress={() =>'));
    expect(pressHandler).toContain('tapBank(tile)');
    expect(tileBlock.slice(0, tileBlock.indexOf('onPress={() =>'))).not.toContain('tapBank(tile)');
  });
});
