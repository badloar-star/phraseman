// зачем (координатор 12.10, утреннее решение владельца о теме по умолчанию; Ядро cb501532c рекомендует «Аврора/Максимум» для новых): контраст grad_aurora на level 1 и 0,5
// по ВСЕМ экранным ролям (набор пар theme_contrast_report + роли свежих экранов), тёмное и светлое; для сравнения — нынешний умолчательный «Графит» на нуле.
//   npx tsx scripts/default_theme_contrast.ts            → таблица Markdown в stdout
import { liquidGlassTokens, type GlassTokens } from '../constants/liquidGlassThemePalette';
import { liquidGlassLevelForIntensity } from '../constants/liquidGlassThemeIntensity';
import { paletteContrast } from '../constants/liquidGlassPaletteRoles';
import { flattenOver } from '../constants/liquidGlassSurfaceRoles';

const solid = (hex: string) => hex.slice(0, 7);
type Pair = Readonly<{ name: string; min: number; fg: (g: GlassTokens) => string; bg: (g: GlassTokens) => string }>;
const over = (top: string, bottom: string) => flattenOver(top, bottom);
const PAIRS: readonly Pair[] = [
  { name: 'text / карточка', min: 4.5, fg: (g) => g.text, bg: (g) => g.opaqueCard },
  { name: 'text / плашка', min: 4.5, fg: (g) => g.text, bg: (g) => g.opaqueControl },
  { name: 'text / шторка', min: 4.5, fg: (g) => g.text, bg: (g) => g.opaqueSheet },
  { name: 'text / фон', min: 4.5, fg: (g) => g.text, bg: (g) => g.bg },
  { name: 'secondary / карточка', min: 4.5, fg: (g) => g.secondary, bg: (g) => g.opaqueCard },
  { name: 'secondary / плашка', min: 4.5, fg: (g) => g.secondary, bg: (g) => g.opaqueControl },
  { name: 'secondary / шторка', min: 4.5, fg: (g) => g.secondary, bg: (g) => g.opaqueSheet },
  { name: 'secondary / фон', min: 4.5, fg: (g) => g.secondary, bg: (g) => g.bg },
  { name: 'mutedText / карточка', min: 4.5, fg: (g) => g.mutedText, bg: (g) => g.opaqueCard },
  { name: 'mutedText / selected над шторкой (неактивная кнопка)', min: 4.5, fg: (g) => g.mutedText, bg: (g) => over(g.selected, g.opaqueSheet) },
  { name: 'accentText / карточка', min: 3, fg: (g) => g.accentText, bg: (g) => g.opaqueCard },
  { name: 'accentText / плашка', min: 3, fg: (g) => g.accentText, bg: (g) => g.opaqueControl },
  { name: 'accentText / accentSoft над карточкой (значок плашки Диалогов)', min: 4.5, fg: (g) => g.accentText, bg: (g) => over(g.accentSoft, g.opaqueCard) },
  { name: 'ctaInk / cta (главная кнопка)', min: 4.5, fg: (g) => g.ctaInk, bg: (g) => g.cta },
  { name: 'accentInk / accent (кнопка цвета темы, метка PLUS)', min: 4.5, fg: (g) => g.accentInk, bg: (g) => g.accent },
  { name: 'accent / фон (кольца, полосы — не текст)', min: 3, fg: (g) => g.accent, bg: (g) => g.bg },
  { name: 'accent / карточка (кольца, полосы — не текст)', min: 3, fg: (g) => g.accent, bg: (g) => g.opaqueCard },
  { name: 'good / карточка', min: 4.5, fg: (g) => g.good, bg: (g) => g.opaqueCard },
  { name: 'bad / карточка', min: 4.5, fg: (g) => g.bad, bg: (g) => g.opaqueCard },
  { name: 'warn / карточка', min: 4.5, fg: (g) => g.warn, bg: (g) => g.opaqueCard },
  { name: 'info / карточка', min: 4.5, fg: (g) => g.info, bg: (g) => g.opaqueCard },
  { name: 'good / плашка', min: 4.5, fg: (g) => g.good, bg: (g) => g.opaqueControl },
  { name: 'bad / плашка', min: 4.5, fg: (g) => g.bad, bg: (g) => g.opaqueControl },
  { name: 'белый значок / tileBlueDeep', min: 4.5, fg: () => '#FFFFFF', bg: (g) => g.tileBlueDeep },
  { name: 'белый значок / medalGoldDeep', min: 4.5, fg: () => '#FFFFFF', bg: (g) => g.medalGoldDeep },
  { name: 'levelA1 / levelA1Bg', min: 4.5, fg: (g) => g.levelA1, bg: (g) => g.levelA1Bg },
  { name: 'levelB2 / levelB2Bg', min: 4.5, fg: (g) => g.levelB2, bg: (g) => g.levelB2Bg },
];

type Col = Readonly<{ id: string; k: number; ap: 'dark' | 'light'; label: string }>;
const COLS: readonly Col[] = [
  { id: 'graphite', k: 0, ap: 'dark', label: 'Графит 0 · тёмн (сейчас)' }, { id: 'graphite', k: 0, ap: 'light', label: 'Графит 0 · светл (сейчас)' },
  { id: 'grad_aurora', k: 0.5, ap: 'dark', label: 'Аврора 0,5 · тёмн' }, { id: 'grad_aurora', k: 0.5, ap: 'light', label: 'Аврора 0,5 · светл' },
  { id: 'grad_aurora', k: 1, ap: 'dark', label: 'Аврора 1 · тёмн' }, { id: 'grad_aurora', k: 1, ap: 'light', label: 'Аврора 1 · светл' },
];

const tokens = COLS.map((c) => liquidGlassTokens(c.id, { appearance: c.ap, intensity: c.k, level: liquidGlassLevelForIntensity(c.k) }));
const lines = [`| Роль (текст / фон) | порог | ${COLS.map((c) => c.label).join(' | ')} |`, `|---|---|${COLS.map(() => '---').join('|')}|`];
const failed: string[] = [];
for (const pair of PAIRS) {
  const cells = tokens.map((g, i) => {
    const ratio = paletteContrast(solid(pair.fg(g)), solid(pair.bg(g)));
    const ok = ratio >= pair.min;
    if (!ok && COLS[i]!.id === 'grad_aurora') failed.push(`${pair.name} · ${COLS[i]!.label} = ${ratio.toFixed(2)} < ${pair.min}`);
    return `${ratio.toFixed(2)}${ok ? '' : ' ⚠'}`;
  });
  lines.push(`| ${pair.name} | ${pair.min} | ${cells.join(' | ')} |`);
}
console.log(lines.join('\n'));
console.log(`\nНИЖЕ ПОРОГА (только Аврора): ${failed.length === 0 ? 'нет' : '\n- ' + failed.join('\n- ')}`);
