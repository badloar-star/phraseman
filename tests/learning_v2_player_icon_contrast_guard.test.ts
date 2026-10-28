// зачем (хвост из хендовера 4 · Темы; координатор 28.10: «значки плеера Learning V2 „прослушать“ и микрофон почти не видны в части светлых тем, нужно ≥ 3:1»):
// значки плеера урока красились g.cta — это заливка главной кнопки темы, в светлых темах она сливается с карточкой/плиткой (до 1,01:1).
// Цвет графики темы — g.accentGraphic (≥ 3:1 на всех поверхностях по построению). Страж:
//  1) значки плеера лежат на плитке режима (opaqueControl), карточке (opaqueCard) и выбранной заливке (selected поверх карточки): accentGraphic ≥ 3:1 на всех 23 темах × оба оформления;
//  2) в файле плеера ни один <Ionicons> не красится g.cta (цвет заливки кнопки, а не графики).
import fs from 'node:fs';
import path from 'node:path';

import { LIQUID_GLASS_THEME_IDS, liquidGlassTokens } from '../constants/liquidGlassThemePalette';
import { relativeLuminance } from '../components/home/v2/scene/home_scene_tokens';

const ROOT = path.resolve(__dirname, '..');
const ICON_MIN_CONTRAST = 3;

function parse(hex: string): { c: [number, number, number]; a: number } | null {
  const m = /^#([0-9a-f]{6})([0-9a-f]{2})?$/i.exec(hex);
  if (!m) return null;
  const n = parseInt(m[1], 16);
  return { c: [(n >> 16) & 255, (n >> 8) & 255, n & 255], a: m[2] ? parseInt(m[2], 16) / 255 : 1 };
}
/** Цвет fg (может быть с прозрачностью) поверх bg → #rrggbb. */
function over(fg: string, bg: string): string {
  const f = parse(fg);
  const b = parse(bg);
  if (!f || !b) return bg;
  return `#${f.c.map((v, i) => Math.round(v * f.a + b.c[i] * (1 - f.a)).toString(16).padStart(2, '0')).join('')}`;
}
const ratio = (a: string, b: string): number => {
  const la = relativeLuminance(a) ?? 0;
  const lb = relativeLuminance(b) ?? 0;
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
};

describe('значки плеера урока Learning V2: контраст к фону', () => {
  it('accentGraphic ≥ 3:1 на плитке режима, карточке и выбранной заливке — 23 темы × оба оформления', () => {
    const bad: string[] = [];
    let checked = 0;
    for (const appearance of ['dark', 'light'] as const) {
      for (const id of LIQUID_GLASS_THEME_IDS as readonly string[]) {
        const g = liquidGlassTokens(id, { level: 'max', appearance });
        const surfaces: Record<string, string> = {
          'плитка режима (opaqueControl)': g.opaqueControl,
          'карточка (opaqueCard)': g.opaqueCard,
          'выбранная заливка (selected поверх карточки)': over(g.selected, g.opaqueCard),
        };
        for (const [name, surface] of Object.entries(surfaces)) {
          checked += 1;
          const r = ratio(g.accentGraphic, surface);
          if (r < ICON_MIN_CONTRAST) bad.push(`${id}/${appearance} ${name}: ${r.toFixed(2)} < ${ICON_MIN_CONTRAST}`);
        }
      }
    }
    expect(checked).toBeGreaterThan(100);
    expect(bad).toEqual([]);
  });

  it('в файле плеера ни один <Ionicons> не красится g.cta (цвет заливки кнопки, не графики)', () => {
    const src = fs.readFileSync(path.join(ROOT, 'app/learning_v2_direct_session_player_v1.tsx'), 'utf8');
    const bad = [...src.matchAll(/<Ionicons[^>]*?color=\{g\.cta\}/gs)].map((m) => src.slice(0, m.index).split('\n').length);
    expect(bad).toEqual([]);
  });
});
