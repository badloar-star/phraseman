// зачем (решение владельца 28.10 через координатора: «Теория — в цвет темы приложения, грамматические темы различаются оттенком от акцента, а не своей палитрой»):
// акцент темы урока считается из акцента ТЕКУЩЕЙ темы (app/theory_topic_accents.ts → getTopicAccent); прежняя таблица из 22 фиксированных цветов удалена.
// Страж по всем темам × урокам 1–32: текст accent ≥ 4,5:1 на тёмной карточке, accentOnLight ≥ 4,5:1 на светлой; темы цикла различимы (расстояние в OKLab ≥ 0,03);
// оттенок первой темы цикла — оттенок акцента темы приложения; в файле нет цветных литералов.
import fs from 'node:fs';
import path from 'node:path';

import { LIQUID_GLASS_THEME_IDS, liquidGlassTokens } from '../constants/liquidGlassThemePalette';
import { homeSceneOklchOf, relativeLuminance } from '../components/home/v2/scene/home_scene_tokens';
import { TOPIC_HUE_CYCLE, getTopicAccent } from '../app/theory_topic_accents';

const ratio = (a: string, b: string): number => {
  const la = relativeLuminance(a) ?? 0;
  const lb = relativeLuminance(b) ?? 0;
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
};
const lch = (hex: string): readonly [number, number, number] => {
  const n = parseInt(hex.slice(1, 7), 16);
  return homeSceneOklchOf([(n >> 16) & 255, (n >> 8) & 255, n & 255]);
};
const lab = (hex: string): readonly [number, number, number] => {
  const [L, C, H] = lch(hex);
  return [L, C * Math.cos((H * Math.PI) / 180), C * Math.sin((H * Math.PI) / 180)];
};
const dist = (a: string, b: string): number => {
  const x = lab(a);
  const y = lab(b);
  return Math.hypot(x[0] - y[0], x[1] - y[1], x[2] - y[2]);
};
const hueGap = (a: number, b: number): number => {
  const d = Math.abs(a - b) % 360;
  return d > 180 ? 360 - d : d;
};

describe('теория: акцент темы урока из акцента текущей темы', () => {
  it('читается на тёмной и светлой карточке — все темы × уроки 1–32', () => {
    const bad: string[] = [];
    let checked = 0;
    for (const id of LIQUID_GLASS_THEME_IDS as readonly string[]) {
      const dark = liquidGlassTokens(id, { level: 'max', appearance: 'dark' });
      const light = liquidGlassTokens(id, { level: 'max', appearance: 'light' });
      for (let lesson = 1; lesson <= 32; lesson += 1) {
        const pal = getTopicAccent(lesson, undefined, dark.accent);
        const palLight = getTopicAccent(lesson, undefined, light.accent);
        checked += 1;
        for (const [name, color, surface] of [['accent на тёмной карточке', pal.accent, dark.opaqueCard], ['accent на тёмном фоне', pal.accent, dark.bg], ['accentOnLight на светлой карточке', palLight.accentOnLight, light.opaqueCard], ['accentOnLight на светлом фоне', palLight.accentOnLight, light.bg]] as const) {
          const r = ratio(color, surface);
          if (r < 4.5) bad.push(`${id} урок ${lesson} ${name}: ${r.toFixed(2)} < 4.5`);
        }
      }
    }
    expect(checked).toBeGreaterThan(700);
    expect(bad.slice(0, 20)).toEqual([]);
  });

  it('темы цикла различимы, первая — оттенок акцента темы приложения', () => {
    const bad: string[] = [];
    for (const id of LIQUID_GLASS_THEME_IDS as readonly string[]) {
      const dark = liquidGlassTokens(id, { level: 'max', appearance: 'dark' });
      const cycle = Array.from({ length: TOPIC_HUE_CYCLE }, (_, i) => getTopicAccent(i + 1, undefined, dark.accent).accent);
      for (let i = 0; i < cycle.length; i += 1) {
        for (let j = i + 1; j < cycle.length; j += 1) {
          const d = dist(cycle[i], cycle[j]);
          if (d < 0.03) bad.push(`${id} темы ${i + 1}~${j + 1}: расстояние ${d.toFixed(3)} < 0.03`);
        }
      }
      const [, accentChroma, accentHue] = lch(dark.accent);
      if (accentChroma > 0.05 && hueGap(lch(cycle[0])[2], accentHue) > 12) bad.push(`${id}: оттенок первой темы ${lch(cycle[0])[2].toFixed(0)} не оттенок акцента ${accentHue.toFixed(0)}`);
    }
    expect(bad.slice(0, 20)).toEqual([]);
  });

  it('в файле нет цветных литералов и прежней таблицы', () => {
    const src = fs.readFileSync(path.resolve(__dirname, '..', 'app/theory_topic_accents.ts'), 'utf8');
    const code = src.split(/\r?\n/).filter((l) => !/^\s*(\/\/|\*|\/\*)/.test(l)).join('\n');
    expect(code.match(/#[0-9a-fA-F]{6,8}\b|rgba\(\s*\d/g) ?? []).toEqual([]);
    expect(src.includes('TOPIC_ACCENTS')).toBe(false);
  });
});
