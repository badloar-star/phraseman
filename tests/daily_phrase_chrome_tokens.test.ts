// зачем (владелец 28.10: «каждый цвет — оттенок текущей темы»; аудит цвета, пакет 1 «Фраза дня»): оформление карточки «Фраза дня» считается из токенов
// ТЕКУЩЕЙ темы (app/daily_phrase_chrome.ts), а не из таблицы по прежнему режиму (у любой тёмной темы карточка была зелёной). Страж:
//  — тексты (метка, фраза, пояснение) ≥ 4,5:1 к каждой точке градиента карточки, подпись кнопки ≥ 4,5:1, форма кнопки и орнамент ≥ 3:1 — все 23 темы × оба оформления;
//  — в файле нет цветных литералов и таблицы по режимам.
import fs from 'node:fs';
import path from 'node:path';

import { LIQUID_GLASS_THEME_IDS, liquidGlassTokens } from '../constants/liquidGlassThemePalette';
import { relativeLuminance } from '../components/home/v2/scene/home_scene_tokens';
import { dailyPhraseChromeFromTokens } from '../app/daily_phrase_chrome';

const ratio = (a: string, b: string): number => {
  const la = relativeLuminance(a) ?? 0;
  const lb = relativeLuminance(b) ?? 0;
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
};

describe('«Фраза дня»: оформление из токенов текущей темы', () => {
  it('читается и кнопка видна на всех темах × оформлениях × точках градиента', () => {
    const bad: string[] = [];
    let checked = 0;
    for (const appearance of ['dark', 'light'] as const) {
      for (const id of LIQUID_GLASS_THEME_IDS as readonly string[]) {
        const c = dailyPhraseChromeFromTokens(liquidGlassTokens(id, { level: 'max', appearance }));
        const pairs: Array<[string, string, string, number]> = [];
        for (const stop of c.colors) {
          pairs.push(['метка', c.title, stop, 4.5], ['фраза', c.phrase, stop, 4.5], ['пояснение', c.sub, stop, 4.5], ['орнамент', c.ornament, stop, 3], ['форма кнопки', c.actionBg, stop, 3]);
        }
        pairs.push(['подпись кнопки', c.actionText, c.actionBg, 4.5]);
        for (const [name, fg, bg, need] of pairs) {
          checked += 1;
          const r = ratio(fg, bg);
          if (r < need) bad.push(`${id}/${appearance} ${name}: ${r.toFixed(2)} < ${need}`);
        }
      }
    }
    expect(checked).toBeGreaterThan(500);
    expect(bad.slice(0, 20)).toEqual([]);
  });

  it('в файле оформления нет цветных литералов и таблицы по режимам', () => {
    const src = fs.readFileSync(path.resolve(__dirname, '..', 'app/daily_phrase_chrome.ts'), 'utf8');
    const code = src.split(/\r?\n/).filter((l) => !/^\s*(\/\/|\*|\/\*)/.test(l)).join('\n');
    expect(code.match(/#[0-9a-fA-F]{3,8}\b|rgba?\(/g) ?? []).toEqual([]);
    expect(src.includes('DAILY_PHRASE_CHROME')).toBe(false);
  });
});
