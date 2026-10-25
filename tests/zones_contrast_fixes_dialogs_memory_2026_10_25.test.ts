// зачем (Темы 25.10, docs/work/zones-contrast-2026-10-25.md, раздел «Диалоги и Пик»): «Очистить память этого языка» красилась
// p.wrong на фоне экрана — до 4,49 (и «Не удалось очистить» под ней) в 3 из 174 сочетаний. semanticInk(g).badText — тот же красный темы, доведённый до ≥ 4,5.
// Сторож: код берёт badText, и он держит 4,5 на фоне экрана (bg, верх и низ градиента) во всех 29 темах × светлая/тёмная × уровни.
import { readFileSync } from 'fs';
import { join } from 'path';
import { LIQUID_GLASS_THEME_IDS, liquidGlassTokens } from '../constants/liquidGlassThemePalette';
import { paletteContrast } from '../constants/liquidGlassPaletteRoles';
import { semanticInk } from '../constants/liquidGlassSemanticInk';

describe('Память диалогов: «Очистить» — badText темы (25.10)', () => {
  it('код берёт semanticInk(g).badText', () => {
    const src = readFileSync(join(__dirname, '..', 'app/dialogue_v2_memory.tsx'), 'utf8');
    const control = src.slice(src.indexOf('const renderClearControl'), src.indexOf('const renderClearFeedback'));
    expect(control).toContain("color: semanticInk(g).badText, ...V2_TYPE.headline");
    expect(control).not.toContain('color: p.wrong');
    // и «Не удалось очистить» под ней — на том же фоне
    expect(src).toContain("testID=\"dialogue-v2-memory-clear-failed\" accessibilityLiveRegion=\"polite\" style={{ color: semanticInk(g).badText, ...V2_TYPE.body");
    expect(src).not.toContain('color: p.wrong');
  });

  it('badText ≥ 4,5 на фоне экрана во всех 174 сочетаниях', () => {
    const bad: string[] = [];
    let n = 0;
    for (const appearance of ['dark', 'light'] as const) for (const level of ['calm', 'accent', 'max'] as const) for (const id of LIQUID_GLASS_THEME_IDS as readonly string[]) {
      const g = liquidGlassTokens(id as never, { level, appearance } as never);
      const ink = semanticInk(g).badText;
      n++;
      for (const s of [g.bg, g.bgTop, g.bgBottom]) {
        const k = paletteContrast(ink.slice(0, 7), s.slice(0, 7));
        if (k < 4.5) bad.push(`${appearance}/${id}/${level} badText на ${s}: ${k.toFixed(2)}`);
      }
    }
    expect(n).toBe(174);
    expect(bad).toEqual([]);
  });
});
