// зачем (решение владельца 05.11, макет target_lang_one_color_approved — «да так отлично»): слова изучаемого языка — ОДИН жирный цвет lang из оттенка темы, «Читается» — say (приглушённый, курсив),
// вторичный текст — gloss. Каждый ≥ 4,5 на всех подложках, где стоит текст: карточка вступления (plateFillFrom → plateFillTo), плашка ситуации, карточка «Скажи так», шторка теории,
// стекло на фоне и подсказка (introLangRoleSurfaces); во всех темах × 2 оформления × 3 уровня и по сетке ползунков H × S.
// Различимость: lang ≠ обычный текст, say ≠ lang, ΔE в OKLab; насыщенность утверждена (lang c = 0,24, say c = 0,05) — цвет не серый и не «ослабленный».
import { LIQUID_GLASS_THEME_IDS, liquidGlassTokens } from '../constants/liquidGlassThemePalette';
import { introLangRoleSurfaces, introTextRoles, introTextRolesForTokens } from '../constants/liquidGlassIntroTextRoles';
import { paletteContrast } from '../constants/liquidGlassPaletteRoles';
import { themeTuneId } from '../constants/theme_tune';

jest.mock('../constants/theme_sliders_flag', () => ({ THEME_SLIDERS_V1_ENABLED: true }));

const lin = (v: number): number => { const x = v / 255; return x <= 0.04045 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4; };
const oklab = (h: string): [number, number, number] => {
  const n = parseInt(h.slice(1, 7), 16); const r = lin((n >> 16) & 255), g = lin((n >> 8) & 255), b = lin(n & 255);
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
  return [0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s, 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s, 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s];
};
const dE = (a: string, b: string): number => { const x = oklab(a), y = oklab(b); return Math.hypot(x[0] - y[0], x[1] - y[1], x[2] - y[2]); };
const chroma = (h: string): number => { const [, a, b] = oklab(h); return Math.hypot(a, b); };

describe('цвета текста вступления и теории: изучаемый язык одним цветом', () => {
  it('во всех темах × 2 оформления × 3 уровня — lang, say и gloss читаемы на всех подложках и различимы', () => {
    const bad: string[] = [];
    for (const appearance of ['dark', 'light'] as const) {
      for (const level of ['calm', 'accent', 'max'] as const) {
        for (const id of LIQUID_GLASS_THEME_IDS as readonly string[]) {
          if (id.startsWith('tune:')) continue;
          const g = liquidGlassTokens(id as never, { level, appearance } as never);
          const r = introTextRoles(id as never, { level, appearance });
          const at = `${appearance}/${id}/${level}`;
          for (const [name, c] of Object.entries(r)) {
            for (const s of introLangRoleSurfaces(g)) {
              const k = paletteContrast(c.slice(0, 7), s.slice(0, 7));
              if (k < 4.5) bad.push(`${at} ${name} ${c} на ${s}: ${k.toFixed(2)}`);
            }
          }
          if (dE(r.lang, g.text) < 0.04) bad.push(`${at} lang≈обычный текст ΔE ${dE(r.lang, g.text).toFixed(3)}`);
          // порог 0,035: у «Эвкалипта» светлого на «Максимуме» 0,039 — отличие держат курсив, вес и насыщенность (макет утверждён владельцем с этими числами)
          if (dE(r.say, r.lang) < 0.035) bad.push(`${at} say≈lang ΔE ${dE(r.say, r.lang).toFixed(3)}`);
        }
      }
    }
    expect(bad).toEqual([]);
  });

  it('утверждённая насыщенность не ослаблена: lang заметно цветной на стандартном оттенке (не серый)', () => {
    const bad: string[] = [];
    for (const appearance of ['dark', 'light'] as const) {
      const r = introTextRoles('tune:250:35' as never, { level: 'max', appearance });
      if (chroma(r.lang) < 0.1) bad.push(`${appearance} lang слишком бледный: ${r.lang} chroma ${chroma(r.lang).toFixed(3)}`);
      if (chroma(r.say) < 0.02) bad.push(`${appearance} say серый: ${r.say}`);
    }
    expect(bad).toEqual([]);
  });

  it('сетка ползунков: H 0…345 шаг 15 × S 0, 20, 35, 60, 100 × светлое/тёмное — контраст ≥ 4,5 на всех подложках', () => {
    const bad: string[] = [];
    for (const appearance of ['dark', 'light'] as const) {
      for (let H = 0; H < 360; H += 15) {
        for (const S of [0, 20, 35, 60, 100]) {
          const id = themeTuneId({ H, S });
          const g = liquidGlassTokens(id as never, { level: 'max', appearance } as never);
          const r = introTextRolesForTokens(id as never, g);
          for (const [name, c] of Object.entries(r)) {
            for (const s of introLangRoleSurfaces(g)) {
              const k = paletteContrast(c.slice(0, 7), s.slice(0, 7));
              if (k < 4.5) bad.push(`${appearance}/${id} ${name} ${c}: ${k.toFixed(2)}`);
            }
          }
        }
      }
    }
    expect(bad).toEqual([]);
  });

  it('оттенок ползунка двигает цвет языка: разные H дают разные lang', () => {
    const a = introTextRoles('tune:30:60' as never, { level: 'max', appearance: 'dark' }).lang;
    const b = introTextRoles('tune:210:60' as never, { level: 'max', appearance: 'dark' }).lang;
    expect(dE(a, b)).toBeGreaterThan(0.1);
  });
});
