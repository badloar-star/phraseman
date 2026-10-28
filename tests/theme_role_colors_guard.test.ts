// зачем (владелец 28.10 «везде по цвету темы»; координатор: роли грамматики и панель награды опроса — от акцента темы, роли различимы, текст ≥ 4,5:1):
// три ролевых цвета считаются из акцента ТЕКУЩЕЙ темы (components/theme_role_colors.ts). Страж по всем темам × оформлениям:
//  — текст каждой роли ≥ 4,5:1 к карточке и к фону темы;
//  — роли различимы: попарное расстояние в OKLab ≥ ROLE_MIN_DISTANCE (контраст 3:1 между тремя светлыми цветами недостижим — см. модуль);
//  — оттенок подлежащего = оттенок акцента темы (у цветных тем), у серых тем роли не цветнее нижней границы + допуск;
//  — в файлах разбора теории, интро урока и панели опроса нет фиолетовых литералов.
import fs from 'node:fs';
import path from 'node:path';

import { LIQUID_GLASS_THEME_IDS, liquidGlassTokens } from '../constants/liquidGlassThemePalette';
import { homeSceneOklchOf, relativeLuminance } from '../components/home/v2/scene/home_scene_tokens';
import { ROLE_MAX_CHROMA, ROLE_MIN_CHROMA, ROLE_MIN_DISTANCE, ROLE_TEXT_MIN_CONTRAST, themeRoleColors } from '../components/theme_role_colors';

const ROOT = path.resolve(__dirname, '..');
const APPEARANCES = ['dark', 'light'] as const;
const HEX6 = /^#([0-9a-f]{6})$/i;
const lch = (hex: string): readonly [number, number, number] => {
  const n = parseInt(HEX6.exec(hex)![1], 16);
  return homeSceneOklchOf([(n >> 16) & 255, (n >> 8) & 255, n & 255]);
};
const lab = (hex: string): readonly [number, number, number] => {
  const [L, C, H] = lch(hex);
  return [L, C * Math.cos((H * Math.PI) / 180), C * Math.sin((H * Math.PI) / 180)];
};
const distance = (a: string, b: string): number => {
  const x = lab(a);
  const y = lab(b);
  return Math.hypot(x[0] - y[0], x[1] - y[1], x[2] - y[2]);
};
const contrast = (a: string, b: string): number => {
  const la = relativeLuminance(a) ?? 0;
  const lb = relativeLuminance(b) ?? 0;
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
};
const hueGap = (a: number, b: number): number => {
  const d = Math.abs(a - b) % 360;
  return d > 180 ? 360 - d : d;
};

describe('роли грамматики и цвет награды: оттенки акцента темы', () => {
  it('читаются и различимы на всех темах × оформлениях × поверхностях (карточка, фон)', () => {
    const bad: string[] = [];
    let checked = 0;
    for (const appearance of APPEARANCES) {
      for (const id of LIQUID_GLASS_THEME_IDS as readonly string[]) {
        const g = liquidGlassTokens(id, { level: 'max', appearance });
        for (const [surfaceName, surface] of [['карточка', g.opaqueCard], ['фон', g.bg]] as const) {
          const roles = themeRoleColors(g.accent, surface, appearance === 'light');
          const list = [['subject', roles.subject], ['link', roles.link], ['verb', roles.verb]] as const;
          for (const [name, color] of list) {
            checked += 1;
            const ratio = contrast(color, surface);
            if (ratio < ROLE_TEXT_MIN_CONTRAST) bad.push(`${id}/${appearance}/${surfaceName} ${name} ${color}: контраст ${ratio.toFixed(2)} < ${ROLE_TEXT_MIN_CONTRAST}`);
          }
          for (let i = 0; i < list.length; i += 1) {
            for (let j = i + 1; j < list.length; j += 1) {
              const d = distance(list[i][1], list[j][1]);
              if (d < ROLE_MIN_DISTANCE) bad.push(`${id}/${appearance}/${surfaceName} ${list[i][0]}~${list[j][0]}: расстояние ${d.toFixed(3)} < ${ROLE_MIN_DISTANCE}`);
            }
          }
        }
      }
    }
    expect(checked).toBeGreaterThan(300);
    expect(bad.slice(0, 20)).toEqual([]);
  });

  it('оттенок подлежащего — оттенок акцента темы; насыщенность в границах (у серых тем не цветнее нижней границы)', () => {
    const bad: string[] = [];
    for (const appearance of APPEARANCES) {
      for (const id of LIQUID_GLASS_THEME_IDS as readonly string[]) {
        const g = liquidGlassTokens(id, { level: 'max', appearance });
        const roles = themeRoleColors(g.accent, g.opaqueCard, appearance === 'light');
        const [, accentChroma, accentHue] = lch(g.accent);
        const [, subjectChroma, subjectHue] = lch(roles.subject);
        if (accentChroma > 0.05 && hueGap(subjectHue, accentHue) > 12) bad.push(`${id}/${appearance}: оттенок подлежащего ${subjectHue.toFixed(0)} не оттенок акцента ${accentHue.toFixed(0)}`);
        if (subjectChroma > ROLE_MAX_CHROMA + 0.02) bad.push(`${id}/${appearance}: насыщенность ${subjectChroma.toFixed(3)} выше границы`);
        if (accentChroma < 0.05 && subjectChroma > ROLE_MIN_CHROMA + 0.03) bad.push(`${id}/${appearance}: серая тема, а подлежащее цветнее нижней границы (${subjectChroma.toFixed(3)})`);
      }
    }
    expect(bad.slice(0, 20)).toEqual([]);
  });
});

describe('файлы с ролями и наградой опроса: без фиолетовых литералов', () => {
  const files = ['components/lesson_help_theory_ui.tsx', 'components/lesson_intro_rich.tsx', 'components/survey/SurveyRewardPanel.tsx'];
  it('нет #rrggbb фиолетового диапазона (оттенок 255–335°, насыщенность > 0,05) вне комментариев', () => {
    const bad: string[] = [];
    for (const file of files) {
      fs.readFileSync(path.join(ROOT, file), 'utf8').split(/\r?\n/).forEach((line, i) => {
        if (/^\s*(\/\/|\*|\/\*)/.test(line)) return;
        for (const m of line.matchAll(/#([0-9a-fA-F]{6})\b/g)) {
          const [, c, h] = lch(`#${m[1]}`);
          if (c > 0.05 && h > 255 && h < 335) bad.push(`${file}:${i + 1} ${m[0]}`);
        }
        if (/rgba?\(\s*(139|109|196)\s*,\s*(92|40|181)\s*,\s*(246|217|253)/.test(line)) bad.push(`${file}:${i + 1} фиолетовый rgba`);
      });
    }
    expect(bad).toEqual([]);
  });
});
