// зачем (закон владельца 22.10 «ЦВЕТА ДОЛЖНЫ БЫТЬ СТРОГО ЦВЕТАМИ И ОТТЕНКАМИ ТЕКУЩЕЙ ТЕМЫ»; координатор → 8 · МОМЕНТЫ, зона «Друзья/Сообщество»):
// белое поверх арта визитки — роли текущей темы (profile_card_art_ink), а не литералы с пометкой theme-exempt. Арт визитки всегда тёмный
// (палитры видов), поэтому проверяем: подпись белой кнопки, белые подписи и сердце «нравится» читаются на всех видах во всех темах.
import * as fs from 'fs';
import * as path from 'path';
import { LIQUID_GLASS_THEME_IDS, liquidGlassTokens } from '../constants/liquidGlassThemePalette';
import { paletteContrast } from '../constants/liquidGlassPaletteRoles';
import { profileCardArtInkForTheme } from '../components/profile-card/profile_card_art_ink';
import { PROFILE_CARD_LOOKS } from '../components/profile-card/profile_card_looks';

/** rgba(…) поверх непрозрачного #RRGGBB → #RRGGBB. */
const over = (top: string, under: string): string => {
  const m = /^rgba\((\d+),(\d+),(\d+),([\d.]+)\)$/.exec(top.replace(/\s/g, ''));
  if (!m) return top.slice(0, 7);
  const a = Number(m[4]);
  const u = Number.parseInt(under.slice(1, 7), 16);
  const ch = (i: number, shift: number) => Math.round(Number(m[i]) * a + ((u >> shift) & 255) * (1 - a)).toString(16).padStart(2, '0');
  return `#${ch(1, 16)}${ch(2, 8)}${ch(3, 0)}`.toUpperCase();
};

const VARIANTS = (['dark', 'light'] as const).flatMap((appearance) => (['calm', 'accent', 'max'] as const).map((level) => ({ appearance, level })));
const LOOK_BGS = Object.values(PROFILE_CARD_LOOKS).map((look) => look.bg);

describe('profileCardArtInk', () => {
  it('белое на арте — mediaInk темы; подписи кнопок и сердце читаются на всех видах визитки во всех темах', () => {
    const bad: string[] = [];
    for (const variant of VARIANTS) {
      for (const id of LIQUID_GLASS_THEME_IDS as readonly string[]) {
        const g = liquidGlassTokens(id as never, variant as never);
        // как в useProfileCardArtInk: сердце — из тёмного оформления той же темы (арт визитки всегда тёмный)
        const art = profileCardArtInkForTheme(id, variant);
        const at = `${id} ${variant.appearance}/${variant.level}`;
        if (art.ink !== g.mediaInk) bad.push(`${at}: ink не mediaInk`);
        // белая главная кнопка без градиента вида («Повысить ранг» у базового вида): тёмная подпись ≥ 4,5
        const primary = paletteContrast(art.button.primaryInk.slice(0, 7), art.button.primaryBg.slice(0, 7));
        if (primary < 4.5) bad.push(`${at}: подпись белой кнопки ${primary.toFixed(2)}`);
        for (const bg of LOOK_BGS) {
          const alt = over(art.button.altBg, bg);
          const altInk = paletteContrast(art.button.altInk.slice(0, 7), alt);
          if (altInk < 4.5) bad.push(`${at} на ${bg}: подпись второй кнопки ${altInk.toFixed(2)}`);
          const heart = paletteContrast(art.liked.slice(0, 7), alt);
          if (heart < 3) bad.push(`${at} на ${bg}: сердце «нравится» ${heart.toFixed(2)}`);
          const bio = paletteContrast(over(art.bio, bg), bg);
          if (bio < 4.5) bad.push(`${at} на ${bg}: свой текст ${bio.toFixed(2)}`);
        }
      }
    }
    expect(bad).toEqual([]);
  });

  it('файлы визитки красят белое на арте через profile_card_art_ink — без своих белых литералов и пометок theme-exempt', () => {
    const root = path.resolve(__dirname, '..');
    for (const rel of [
      'components/profile-card/ProfileCardBody.tsx',
      'components/profile-card/ProfileCardFooter.tsx',
      'components/profile-card/ProfileCardParts.tsx',
      'components/profile-card/ProfileCardProSheet.tsx',
      'components/PlayerProfileModal.tsx',
    ]) {
      const code = fs.readFileSync(path.join(root, rel), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:'"`])\/\/[^\n]*/g, '$1');
      expect({ rel, literals: code.match(/(['"`])#(?:[0-9A-Fa-f]{3,8})\1|rgba?\(\s*\d/g) ?? [] }).toEqual({ rel, literals: [] });
      expect({ rel, exempt: /theme-exempt/.test(code) }).toEqual({ rel, exempt: false });
    }
  });
});
