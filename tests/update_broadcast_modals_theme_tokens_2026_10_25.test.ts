// зачем (перепись цветов docs/work/color-literal-census-2026-10-25.md, Темы 25.10): окно обновления, ворота обязательного
// обновления и окно рассылки красили затемнение постоянным чёрным 62–68 %, а тени — чистым #000000. Закон владельца 22.10:
// затемнение под окном — сильный скрим темы (scrimStrong), тени — тон тени темы (shadowTint, непрозрачный).
// Сторож: код берёт токены, а не литералы; токены есть и разбираются во всех 29 темах × светлая/тёмная × Спокойно/Акцент/Максимум.
import { readFileSync } from 'fs';
import { join } from 'path';
import { LIQUID_GLASS_THEME_IDS, liquidGlassTokens } from '../constants/liquidGlassThemePalette';
import { colorWithAlpha } from '../components/v2/plateAlpha';

const src = (rel: string): string => readFileSync(join(__dirname, '..', rel), 'utf8');
const LITERAL_SCRIM = /'rgba\(0,\s*0,\s*0,\s*0\.6[28]\)'/;

describe('окна обновления и рассылки: затемнение и тени из темы (25.10)', () => {
  it('код берёт scrimStrong и shadowTint, а не чёрные литералы', () => {
    const upd = src('components/UpdateModal.tsx');
    expect(upd).toContain('{ backgroundColor: glass.scrimStrong }');
    expect(upd).toContain('const shadowInk = colorWithAlpha(glass.shadowTint, 1);');
    expect(upd).not.toMatch(LITERAL_SCRIM);
    expect(upd).not.toContain("shadowColor: '#000000'");

    const gate = src('components/ForceUpdateGate.tsx');
    expect(gate).toContain('{ backgroundColor: forced ? glass.bg : glass.scrimStrong }');
    expect(gate).toContain('const shadowInk = colorWithAlpha(glass.shadowTint, 1);');
    expect(gate).not.toMatch(LITERAL_SCRIM);
    expect(gate).not.toContain("shadowColor: '#000000'");

    const broadcast = src('components/GlobalBroadcastModal.tsx');
    expect(broadcast).toContain('const dimColor = glass.scrimStrong;');
    expect(broadcast).not.toMatch(LITERAL_SCRIM);
  });

  it('scrimStrong и тон тени заданы и разбираются во всех 174 сочетаниях', () => {
    const bad: string[] = [];
    let n = 0;
    const COLOR = /^(#[0-9a-fA-F]{6}([0-9a-fA-F]{2})?|rgba?\([^)]+\))$/;
    for (const appearance of ['dark', 'light'] as const) for (const level of ['calm', 'accent', 'max'] as const) for (const id of LIQUID_GLASS_THEME_IDS as readonly string[]) {
      const g = liquidGlassTokens(id as never, { level, appearance } as never);
      n++;
      if (!COLOR.test(String(g.scrimStrong))) bad.push(`${appearance}/${id}/${level} scrimStrong=${g.scrimStrong}`);
      const ink = colorWithAlpha(g.shadowTint, 1);
      if (!COLOR.test(ink)) bad.push(`${appearance}/${id}/${level} shadowTint→${ink}`);
    }
    expect(n).toBe(174);
    expect(bad).toEqual([]);
  });
});
