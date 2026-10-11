// зачем (приказ владельца 14.10 через координатора: «тёмные пятна в светлых темах проявляются на белом»): единое правило тона блика/дымки на плашке.
// В СВЕТЛЫХ темах внутри и поверх плашки нет ничего темнее самой плашки — блик и дымка только белые, без усиления; тень рисуется снаружи и снизу
// (токены «Тени»). В ТЁМНЫХ темах ничего не меняется: дымка и усиление такие, как задала палитра.
// Модуль чистый (без React), чтобы им пользовались и V2GlassSheen, и тест.
import type { GlassTokens } from '../../constants/liquidGlassThemePalette';

export type PlateTone = Readonly<{
  /** Цвет дымки, который реально рисуется. */
  smoke: string;
  /** Усиление дымки, которое реально применяется. */
  smokeBoost: number;
  /** true — правило светлых тем изменило значения палитры. */
  clamped: boolean;
}>;

const WHITE = '#FFFFFF'; // theme-exempt: белый блик светлых тем — «только светлее плашки»

/** Тон дымки плашки: светлая тема → белая и ×1; тёмная → как в палитре. */
export function plateToneFor(g: Pick<GlassTokens, 'isLight'>, palette: Readonly<{ smoke: string; smokeBoost: number }>): PlateTone {
  if (!g.isLight) return { smoke: palette.smoke, smokeBoost: palette.smokeBoost, clamped: false };
  const clamped = palette.smoke.slice(0, 7).toUpperCase() !== WHITE || palette.smokeBoost !== 1;
  return { smoke: WHITE, smokeBoost: 1, clamped };
}

const logged = new Set<string>();

/** Один раз на сочетание «тема / оформление / уровень / насыщенность»: лог [PLATE-TONE] — что палитра просила и что нарисовано. */
export function logPlateToneOnce(
  themeId: string,
  g: Pick<GlassTokens, 'isLight' | 'level' | 'intensity' | 'plateFillFrom' | 'plateFillTo'>,
  palette: Readonly<{ smoke: string; smokeBoost: number; sheenFrom: string; sheenTo: string }>,
  tone: PlateTone,
): void {
  const key = `${themeId}/${g.isLight ? 'light' : 'dark'}/${g.level}/${String(g.intensity)}`;
  if (logged.has(key)) return;
  logged.add(key);
  console.log(`[PLATE-TONE] theme=${themeId} isLight=${String(g.isLight)} level=${g.level} intensity=${String(g.intensity)} plate=${g.plateFillFrom}→${g.plateFillTo} sheen=${palette.sheenFrom}→${palette.sheenTo} smokeAsked=${palette.smoke}×${palette.smokeBoost} smokeDrawn=${tone.smoke}×${tone.smokeBoost} clamped=${String(tone.clamped)} shadow=outer-bottom`);
}
