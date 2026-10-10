import fs from 'fs';
import os from 'os';
import path from 'path';
import { LIQUID_GLASS_THEME_IDS, liquidGlassTokens, type GlassTokens } from '../constants/liquidGlassThemePalette';
import { paletteContrast } from '../constants/liquidGlassPaletteRoles';

// зачем (координатор 10.10): аудит контраста AA пар «текст/значок на плашке» по ВСЕМ 23 темам, обоим оформлениям и 21 шагу
// ползунка. Тест держит пороги; с THEME_REPORT=1 ещё и пишет отчёт во временную папку.
const STEPS = Array.from({ length: 21 }, (_, i) => i / 20);
const solid = (hex: string) => hex.slice(0, 7);

type Pair = Readonly<{ name: string; min: number; fg: (g: GlassTokens) => string; bg: (g: GlassTokens) => string }>;
const PAIRS: readonly Pair[] = [
  { name: 'text / карточка', min: 4.5, fg: (g) => g.text, bg: (g) => g.opaqueCard },
  { name: 'text / плашка', min: 4.5, fg: (g) => g.text, bg: (g) => g.opaqueControl },
  { name: 'text / шторка', min: 4.5, fg: (g) => g.text, bg: (g) => g.opaqueSheet },
  { name: 'text / фон', min: 4.5, fg: (g) => g.text, bg: (g) => g.bg },
  { name: 'secondary / карточка', min: 4.5, fg: (g) => g.secondary, bg: (g) => g.opaqueCard },
  { name: 'secondary / плашка', min: 4.5, fg: (g) => g.secondary, bg: (g) => g.opaqueControl },
  { name: 'secondary / шторка', min: 4.5, fg: (g) => g.secondary, bg: (g) => g.opaqueSheet },
  { name: 'secondary / фон', min: 4.5, fg: (g) => g.secondary, bg: (g) => g.bg },
  { name: 'mutedText / карточка', min: 3, fg: (g) => g.mutedText, bg: (g) => g.opaqueCard },
  { name: 'accentText / карточка', min: 3, fg: (g) => g.accentText, bg: (g) => g.opaqueCard },
  { name: 'accentText / плашка', min: 3, fg: (g) => g.accentText, bg: (g) => g.opaqueControl },
  { name: 'ctaInk / cta (главная кнопка)', min: 4.5, fg: (g) => g.ctaInk, bg: (g) => g.cta },
  { name: 'accentInk / accent (кнопка цвета темы)', min: 4.5, fg: (g) => g.accentInk, bg: (g) => g.accent },
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

describe('theme contrast audit (AA)', () => {
  it('every text/icon-on-plate pair meets its threshold in every theme, appearance and slider step', () => {
    const rows: string[] = [];
    const failures: string[] = [];
    for (const pair of PAIRS) {
      let worst = { ratio: Infinity, where: '' };
      let worstLight = { ratio: Infinity, where: '' };
      let worstDark = { ratio: Infinity, where: '' };
      for (const id of LIQUID_GLASS_THEME_IDS) {
        for (const appearance of ['dark', 'light'] as const) {
          for (const intensity of STEPS) {
            const g = liquidGlassTokens(id, { level: 'calm', appearance, intensity });
            const ratio = paletteContrast(solid(pair.fg(g)), solid(pair.bg(g)));
            const where = `${id}|${appearance}|${intensity}`;
            if (ratio < worst.ratio) worst = { ratio, where };
            if (appearance === 'light' && ratio < worstLight.ratio) worstLight = { ratio, where };
            if (appearance === 'dark' && ratio < worstDark.ratio) worstDark = { ratio, where };
            if (ratio < pair.min) failures.push(`${pair.name} ${where}=${ratio.toFixed(2)}<${pair.min}`);
          }
        }
      }
      rows.push(`| ${pair.name} | ${pair.min} | ${worstDark.ratio.toFixed(2)} (${worstDark.where}) | ${worstLight.ratio.toFixed(2)} (${worstLight.where}) | ${worst.ratio >= pair.min ? 'ок' : 'НАРУШЕНИЕ'} |`);
    }
    if (process.env.THEME_REPORT === '1') {
      const report = [
        '# Аудит контраста AA — пары «текст/значок на плашке» по всем темам (10.10)',
        '',
        'Governance-ID: TG-F33C0EFFAB0E',
        '',
        `Охват: ${LIQUID_GLASS_THEME_IDS.length} тем × 2 оформления (тёмное, светлое) × 21 шаг ползунка насыщенности = ${LIQUID_GLASS_THEME_IDS.length * 2 * STEPS.length} комбинаций на каждую пару.`,
        'Источник: `tests/theme_contrast_report.test.ts` (контраст WCAG по относительной яркости, без прозрачности — цвета берутся без альфы). Порог: 4.5 — текст и кнопки, 3 — приглушённый и акцентный текст/графика.',
        'Перегенерировать: `THEME_REPORT=1 npm run test:one -- tests/theme_contrast_report.test.ts` — отчёт появится в временной папке (`%TEMP%/theme-contrast-audit-2026-10-10.md`), скопировать сюда.',
        '',
        '| Пара | Порог | Худший в тёмных (тема\\|оформление\\|шаг) | Худший в светлых | Итог |',
        '|---|---|---|---|---|',
        ...rows,
        '',
        failures.length ? `## Нарушения (${failures.length})\n\n${failures.slice(0, 60).map((f) => `- ${f}`).join('\n')}` : '## Нарушений нет',
        '',
        '## Что не покрыто',
        '',
        '- Цвета, зашитые прямо в экранах (остаток храповика цветов, `config/theme-hardcoded-colors-baseline.json`): там контраст зависит от экрана, а не от темы. Главный остаток — старые экраны сессии Learning V2 (кодмод ждёт решения владельца, см. `2026-10-10_owner_lv2_session_theme_migration_commands.md`).',
        '- Текст поверх картинок и арта (визитка, награды): иллюстрации, цвет задаёт арт; для них есть `mediaInk` (≥ 7 на подложке `deepBase`).',
        '- Полупрозрачные плашки (`hairlineSoft`, `*Soft`) считаются отдельно: поверх них стоит основной текст темы, его пары проверены выше.',
      ].join('\n');
      // зачем: защитный слой jest не пускает тесты писать в исходники — отчёт кладём во временную папку, в docs его копирует человек/сессия.
      fs.writeFileSync(path.join(os.tmpdir(), 'theme-contrast-audit-2026-10-10.md'), `${report}\n`);
    }
    expect(failures.slice(0, 30)).toEqual([]);
  });
});
