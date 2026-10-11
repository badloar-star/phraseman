// зачем (аудит контраста 14.10, пункт 1 — решение координатора): `accent` в светлых градиентных темах — пастельная ЗАЛИВКА (контраст 1,3–1,8),
// поэтому текст, значки и тонкие линии на плашках красятся `accentText`. Заливки (backgroundColor, градиенты, кольца) остаются на `accent`.
import { readFileSync } from 'fs';
import { join } from 'path';

const FILES = [
  'components/dialogs/DialogHowToSaySheet.tsx',
  'components/dialogs/DialogHelperRow.tsx',
  'components/ExplainButton.tsx',
  'components/ui/new/UndoSnackbar.tsx',
  'components/mistake-practice/MistakePracticeLoopNode.tsx',
  'components/SpeakingPanel.tsx',
  'app/pack_opening.tsx',
];
// color={t.accent} / color: t.accent / stroke={t.accent} / mTheme.accent в color — но не accentText/accentBg/accentInk
const BAD = /\b(?:color|stroke)\s*(?:=\s*\{|:\s*)\s*(?:t|theme|mTheme|glass)\.accent(?![A-Za-z])/;

describe('accent как цвет текста/значка запрещён (нужен accentText)', () => {
  it.each(FILES)('%s', (file) => {
    const lines = readFileSync(join(__dirname, '..', file), 'utf8').split(/\r?\n/);
    const bad = lines
      .map((line, i) => ({ line, n: i + 1 }))
      .filter(({ line }) => BAD.test(line) && !/shadow-ok|theme-exempt/.test(line));
    expect(bad).toEqual([]);
  });
});
