// зачем (решение владельца 28.10 через координатора: «онбординг — в цвета ТЕМЫ ПО УМОЛЧАНИЮ, после выбора темы всё сразу перекрашивается»; аудит цвета): палитра
// онбординга «ага» считается из сцены ТЕКУЩЕЙ темы (components/onboarding_aha/aha_theme.ts → ahaThemeFor), а не из фиксированной «Полночи» с фиолетовым (#C95CFF, #7B8CFF).
// Страж по всем темам × оформлениям: белый текст на фоне ≥ 4,5; подпись кнопки ≥ 4,5 на каждом оттенке кнопки; кнопка/микрофон ≥ 3 к фону; слова «чисто/неточно» ≥ 3; кнопка записи ≥ 2,5
// (значок на ней); серая тема не даёт яркого цвета (насыщенность ≤ 0,1); в файлах онбординга «ага» нет AHA_THEME и цветных литералов.
import fs from 'node:fs';
import path from 'node:path';

import { LIQUID_GLASS_THEME_IDS, liquidGlassTokens } from '../constants/liquidGlassThemePalette';
import { homeSceneOklchOf, relativeLuminance } from '../components/home/v2/scene/home_scene_tokens';
import { ahaThemeFor } from '../components/onboarding_aha/aha_theme';
import { hexChroma } from '../components/learning-v2/season/season_art';

const ROOT = path.resolve(__dirname, '..');
const ratio = (a: string, b: string): number => {
  const la = relativeLuminance(a);
  const lb = relativeLuminance(b);
  if (la === null || lb === null) return 99;
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
};
const chromaOf = (hex: string): number => {
  const n = parseInt(hex.slice(1, 7), 16);
  return homeSceneOklchOf([(n >> 16) & 255, (n >> 8) & 255, n & 255])[1];
};

describe('онбординг «ага»: палитра из сцены текущей темы', () => {
  it('читается на всех темах × оформлениях × точках градиента фона', () => {
    const bad: string[] = [];
    let checked = 0;
    for (const appearance of ['dark', 'light'] as const) {
      for (const id of LIQUID_GLASS_THEME_IDS as readonly string[]) {
        const T = ahaThemeFor(id, appearance);
        for (const bg of T.bgGradient) {
          const rows: Array<[string, string, string, number]> = [
            ['белый текст', '#FFFFFF', bg, 4.5],
            ['кнопка', T.ctaGradient[1], bg, 3],
            ['микрофон', T.micRing, bg, 3],
            ['слово «чисто»', T.wordClean, bg, 3],
            ['слово «неточно»', T.wordFuzzy, bg, 3],
            ['кнопка записи', T.recordGradient[1], bg, 2.5],
          ];
          for (const [name, fg, back, need] of rows) {
            checked += 1;
            const r = ratio(fg, back);
            if (r < need) bad.push(`${id}/${appearance} ${name}: ${r.toFixed(2)} < ${need}`);
          }
        }
        for (const stop of T.ctaGradient) {
          checked += 1;
          const r = ratio(T.ctaTextColor, stop);
          if (r < 4.5) bad.push(`${id}/${appearance} подпись кнопки на ${stop}: ${r.toFixed(2)} < 4.5`);
        }
      }
    }
    expect(checked).toBeGreaterThan(500);
    expect(bad.slice(0, 20)).toEqual([]);
  });

  it('серая тема не даёт яркого цвета (кнопка, акценты)', () => {
    const bad: string[] = [];
    for (const appearance of ['dark', 'light'] as const) {
      for (const id of LIQUID_GLASS_THEME_IDS as readonly string[]) {
        if (hexChroma(liquidGlassTokens(id, { level: 'max', appearance }).accent) >= 0.08) continue;
        const T = ahaThemeFor(id, appearance);
        for (const color of [...T.ctaGradient, T.micRing, T.micRingActive, T.chipSelectedBorder, T.karaokeAccent]) {
          if (chromaOf(color) > 0.1) bad.push(`${id}/${appearance}: ${color} насыщенность ${chromaOf(color).toFixed(3)}`);
        }
      }
    }
    expect(bad).toEqual([]);
  });

  it('в файлах онбординга «ага» нет AHA_THEME и цветных литералов', () => {
    const dir = path.join(ROOT, 'components/onboarding_aha');
    const bad: string[] = [];
    for (const name of fs.readdirSync(dir)) {
      if (!/\.tsx?$/.test(name)) continue;
      const lines = fs.readFileSync(path.join(dir, name), 'utf8').split(/\r?\n/);
      lines.forEach((l, i) => {
        if (/^\s*(\/\/|\*|\/\*)/.test(l)) return;
        const code = l.replace(/\/\/.*$/, '');
        if (/\bAHA_THEME\b/.test(code)) bad.push(`${name}:${i + 1} AHA_THEME`);
        // aha_theme.ts — сама палитра: белый свет сцены собирается шаблоном rgba(255,255,255,a); литералов hex там нет
        const literal = name === 'aha_theme.ts' ? /#[0-9a-fA-F]{6,8}\b/ : /#[0-9a-fA-F]{6,8}\b|rgba?\(\s*\d/;
        if (literal.test(code)) bad.push(`${name}:${i + 1} литерал цвета`);
      });
    }
    expect(bad).toEqual([]);
  });
});
