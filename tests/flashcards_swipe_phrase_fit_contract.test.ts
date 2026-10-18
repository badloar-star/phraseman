// зачем (Макеты 18.10, риск C9 в CHECKLISTS_1018.md): в свайп-тренировке fitPhraseFontSize считался без системного масштаба шрифта —
// при шрифте 1,3 длинная фраза из видео рисовалась крупнее расчёта и могла вылезти за карточку. Теперь масштаб тот же, что в списке карточек.
import fs from 'fs';
import path from 'path';
import { estimateWrappedLines, fitPhraseFontSize } from '../app/flashcards/fit_phrase_font';

const LONG = 'I was just wondering whether you could possibly help me carry these heavy boxes up to the fourth floor this evening';

describe('свайп: подгон кегля фразы учитывает системный масштаб шрифта', () => {
  it('исходник свайпа передаёт fontScale с тем же ограничением, что и список карточек', () => {
    const src = fs.readFileSync(path.join(__dirname, '..', 'app', 'flashcards_swipe.tsx'), 'utf8');
    expect(src).toContain('const phraseFontScale = Math.min(Math.max(fontScale, 1), 1.35);');
    expect(src).toMatch(/fitPhraseFontSize\(\{[^}]*fontScale: phraseFontScale \}\)/);
  });

  it('шрифт 1,3: кегль меньше, чем при 1,0, и фраза помещается в ту же высоту с учётом масштаба', () => {
    const box = { text: LONG, baseSize: 24, widthPx: 330, maxHeightPx: 135 };
    const at1 = fitPhraseFontSize(box);
    const at13 = fitPhraseFontSize({ ...box, fontScale: 1.3 });
    expect(at13).toBeLessThan(at1);
    const lines = estimateWrappedLines(LONG, at13, box.widthPx, 1.3);
    if (at13 > 14) expect(lines * at13 * 1.3 * 1.3).toBeLessThanOrEqual(box.maxHeightPx);
    expect(at13).toBeGreaterThanOrEqual(14);
  });
});
