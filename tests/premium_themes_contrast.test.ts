// ЗАМОК ВЛАДЕЛЬЦА 24.10: «Пусть чинит 4 · Темы» (премиум-темы проходят тот же контраст, что все темы; ослабить может только новое слово владельца; docs/work/OWNER_LOCKS.md)
// зачем: пакет премиум-тем Codex (grad_full_*) в светлом оформлении давал кнопку пейвола 1,01–1,15 к листу и подпись на ней 1,04–1,14 — кнопка была невидима.
// Каждая премиум-тема × оформление × уровень: главная кнопка видна и читается, текст и вторичный текст читаются на карточке и контроле, «верно» читается
// на своей плитке, значок Plus/галочка читаются на акценте. Пигменты коллекции (фон, карточки) при этом остаются утверждёнными.
import { LIQUID_GLASS_THEME_IDS, liquidGlassTokens } from '../constants/liquidGlassThemePalette';
import { flattenOver } from '../constants/liquidGlassSurfaceRoles';
import { premiumThemeTokenOverrides } from '../constants/premiumThemeVisualSpecs';
import { contrastRatio } from '../components/dialogs/scene/dialogs_scene_tokens';

const PREMIUM = (LIQUID_GLASS_THEME_IDS as readonly string[]).filter((id) => premiumThemeTokenOverrides(id, 'light') !== null);

describe('премиум-темы: контраст как у всех тем', () => {
  it('список премиум-тем не пуст (сторож не проходит вхолостую)', () => {
    expect(PREMIUM.length).toBeGreaterThanOrEqual(6);
  });

  it('кнопка пейвола видна, тексты и «верно» читаются; пигменты коллекции сохранены', () => {
    const misses: string[] = [];
    for (const appearance of ['light', 'dark'] as const) {
      for (const id of PREMIUM) {
        const pig = premiumThemeTokenOverrides(id, appearance)!;
        for (const level of ['calm', 'accent', 'max'] as const) {
          const g = liquidGlassTokens(id, { level, appearance } as never);
          const tag = `${appearance}/${id}/${level}`;
          const check = (name: string, fg: string, bg: string, need: number): void => {
            const r = contrastRatio(fg, bg);
            if (r < need) misses.push(`${tag} · ${name}: ${r.toFixed(2)} < ${need}`);
          };
          check('главная кнопка: форма к листу', g.ctaFill, g.opaqueSheet, 3);
          check('главная кнопка: подпись', g.ctaFillInk, g.ctaFill, 4.5);
          for (const [n, s] of [['карточка', g.opaqueCard], ['контрол', g.opaqueControl]] as const) {
            check(`текст на ${n}`, g.text, s, 4.5);
            check(`вторичный текст на ${n}`, g.secondary, s, 4.5);
          }
          check('«верно» на своей плитке', g.good, flattenOver(g.goodSoft, g.opaqueCard), 4.5);
          check('значок Plus / галочка на акценте', g.accentInk, g.accent, 4.5);
          if (g.bg !== pig.bg || g.opaqueCard !== pig.opaqueCard) misses.push(`${tag} · пигменты коллекции изменены`);
        }
      }
    }
    expect(misses.slice(0, 15)).toEqual([]);
  });
});
