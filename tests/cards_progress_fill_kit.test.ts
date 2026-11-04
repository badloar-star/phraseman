// зачем (Волна 2, пункт 18): полосы прогресса в карточках/видео-наборах едут плавно через общий KitProgressFill (scaleX, нативный драйвер),
// а не перескакивают через `width: N%` на каждый шаг. Сторож: четыре места не возвращаются к ширине в процентах.
import * as fs from 'fs';
import * as path from 'path';

const read = (rel: string): string => fs.readFileSync(path.join(__dirname, '..', rel), 'utf8').replace(/\r\n/g, '\n');

const SITES: ReadonlyArray<Readonly<{ file: string; ratio: RegExp; importPath: string }>> = [
  { file: 'app/flashcards_swipe.tsx', ratio: /<KitProgressFill ratio=\{progressPct \/ 100\}/, importPath: "'../components/KitProgressFill'" },
  { file: 'app/flashcards_speaking_session.tsx', ratio: /<KitProgressFill\s+ratio=\{progress\.total > 0 \? progress\.position \/ progress\.total : 0\}/, importPath: "'../components/KitProgressFill'" },
  { file: 'app/flashcards/VideoPackRow.tsx', ratio: /<KitProgressFill ratio=\{progress\}/, importPath: "'../../components/KitProgressFill'" },
  { file: 'app/flashcards/VideoSetView.tsx', ratio: /<KitProgressFill ratio=\{progress\}/, importPath: "'../../components/KitProgressFill'" },
];

describe('заливки прогресса карточек и видео-наборов — через KitProgressFill', () => {
  for (const site of SITES) {
    it(`${site.file}: импорт, доля в ratio, ширина в процентах убрана`, () => {
      const source = read(site.file);
      expect(source).toContain(`import KitProgressFill from ${site.importPath};`);
      expect(source).toMatch(site.ratio);
      // прежние приёмы «ширина заливки в процентах» не возвращаются
      expect(source).not.toMatch(/width: `\$\{progressPct\}%`/);
      expect(source).not.toMatch(/width: `\$\{\(progress\.position \/ progress\.total\) \* 100\}%`/);
      expect(source).not.toMatch(/width: `\$\{Math\.round\(progress \* 100\)\}%`/);
    });
  }
  it('заливки не красят край собственным радиусом (трек обрезает, scaleX не плющит скругление)', () => {
    for (const site of SITES) expect(read(site.file)).toMatch(/KitProgressFill[\s\S]{0,400}borderRadius: 0/);
  });
});
