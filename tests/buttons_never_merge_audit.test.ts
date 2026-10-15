// зачем (владелец 13.10, №35 «никакие кнопки чтобы не сливались»; поручение координатора 15.10): аудит контраста КАЖДОЙ кнопки к поверхности под ней во ВСЕХ темах.
// Два уровня (координатор 15.10): ОСНОВНЫЕ кнопки (V2 primary/accent, главная кнопка окон моментов) — фон к самой светлой и самой тёмной поверхности под ней ≥ 3:1;
// ТОНОВЫЕ плашки (V2 вторичная, опасная, отключённая, плашки окон моментов на buttonFill) — ≥ 1,5:1, принятый порог button_tokens_contrast, стиль «Тень». Подпись везде ≥ 4,5:1.
// Красным остаётся только то, что ниже СВОЕГО уровня — это и есть настоящее «сливается» (как 1,00 на шторке).
// Поверхности под кнопкой: страница (bg, bgTop, bgBottom — края градиента), карточка (opaqueCard), шторка/окно (opaqueSheet).
// Кнопки: V2Button primary/accent (ctaFill/ctaInk), secondary (buttonFill), ghost (без заливки — только подпись), disabled (buttonFillDisabled/Ink), danger (dangerFill/Ink),
// кнопка окон моментов Пика (SpirePalette: cta = accent, ctaText = accentInk) и вторичная плашка окон (opaqueControl).
// Отчёт пишется только при BUTTON_AUDIT_WRITE=1; в обычном прогоне тест сверяет красное с зафиксированным списком (RED_BASELINE) — расти он не должен.
import fs from 'node:fs';
import path from 'node:path';

import { LIQUID_GLASS_THEME_IDS, liquidGlassTokens } from '../constants/liquidGlassThemePalette';

type Tok = Record<string, string>;
const rgb = (hex: string): number[] => { const h = hex.replace('#', '').slice(0, 6); return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16)); };
const lum = (hex: string): number => {
  const c = rgb(hex).map((v) => v / 255).map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
  return 0.2126 * c[0]! + 0.7152 * c[1]! + 0.0722 * c[2]!;
};
const ratio = (a: string, b: string): number => { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return (x! + 0.05) / (y! + 0.05); };

const SURFACES: ReadonlyArray<readonly [string, readonly string[]]> = [
  ['страница', ['bg', 'bgTop', 'bgBottom']],
  ['карточка', ['opaqueCard']],
  ['шторка/окно', ['opaqueSheet']],
];
const INTENSITIES = [0, 0.25, 0.5, 0.75, 1];

type ButtonDef = Readonly<{ name: string; fill: string | null; ink: string; min: number }>;
const MAIN_MIN = 3;
const TONAL_MIN = 1.5;
const BUTTONS: readonly ButtonDef[] = [
  { name: 'V2 основная/акцентная', fill: 'ctaFill', ink: 'ctaFillInk', min: MAIN_MIN },
  { name: 'V2 вторичная', fill: 'buttonFill', ink: 'text', min: TONAL_MIN },
  { name: 'V2 прозрачная (ghost)', fill: null, ink: 'text', min: TONAL_MIN },
  { name: 'V2 отключённая', fill: 'buttonFillDisabled', ink: 'buttonInkDisabled', min: TONAL_MIN },
  { name: 'опасная', fill: 'dangerFill', ink: 'dangerInk', min: TONAL_MIN },
  { name: 'окна моментов: основная (ctaFill)', fill: 'ctaFill', ink: 'ctaFillInk', min: MAIN_MIN }, // зачем (15.10): подпись на ctaFill — ctaFillInk (в светлых градиентных темах белая на углублённой заливке)
  // зачем: плашки окон (в т.ч. «Пропустить») берут buttonFill, а не control/opaqueControl (на нём было 1,00 к шторке)
  { name: 'окна моментов: плашка (buttonFill)', fill: 'buttonFill', ink: 'text', min: TONAL_MIN },
];

type Row = { theme: string; appearance: string; button: string; surface: string; fillMin: number | null; inkRatio: number; fillRed: boolean; inkRed: boolean };

function compute(): Row[] {
  const rows: Row[] = [];
  for (const id of LIQUID_GLASS_THEME_IDS as readonly string[]) {
    for (const appearance of ['dark', 'light'] as const) {
      for (const b of BUTTONS) {
        for (const [surfaceName, keys] of SURFACES) {
          let fillMin: number | null = null;
          let inkMin = Infinity;
          for (const intensity of INTENSITIES) {
            const t = liquidGlassTokens(id, { intensity, appearance } as never) as unknown as Tok;
            if (b.fill) {
              // самый светлый и самый тёмный край поверхности: берём худший
              for (const k of keys) {
                const r = ratio(t[b.fill]!, t[k]!);
                fillMin = fillMin === null ? r : Math.min(fillMin, r);
              }
              inkMin = Math.min(inkMin, ratio(t[b.ink]!, t[b.fill]!));
            } else {
              for (const k of keys) inkMin = Math.min(inkMin, ratio(t[b.ink]!, t[k]!));
            }
          }
          rows.push({ theme: id, appearance, button: b.name, surface: surfaceName, fillMin, inkRatio: inkMin, fillRed: fillMin !== null && fillMin < b.min, inkRed: inkMin < 4.5 });
        }
      }
    }
  }
  return rows;
}

const keyOf = (r: Row): string => `${r.theme}|${r.appearance}|${r.button}|${r.surface}|${r.fillRed ? 'fill' : ''}${r.inkRed ? 'ink' : ''}`;

describe('кнопки нигде не сливаются: основные ≥ 3:1, тоновые ≥ 1,5:1 к поверхности, подпись ≥ 4,5:1', () => {
  const rows = compute();
  const red = rows.filter((r) => r.fillRed || r.inkRed);

  it('аудит считает все темы × оформления × кнопки × поверхности', () => {
    expect(rows.length).toBe((LIQUID_GLASS_THEME_IDS as readonly string[]).length * 2 * BUTTONS.length * SURFACES.length);
  });

  it('отчёт (BUTTON_AUDIT_WRITE=1) пишется вне репозитория (BUTTON_AUDIT_OUT)', () => {
    if (process.env.BUTTON_AUDIT_WRITE !== '1') return;
    const out = process.env.BUTTON_AUDIT_OUT ?? 'C:/Temp/claude/work/buttons_contrast_audit.md'; // зачем: охранник записи тестов не пускает в репозиторий — отчёт кладётся вне него, в docs его переносит человек/сессия
    const fmt = (n: number | null) => (n === null ? '—' : n.toFixed(2));
    const lines: string[] = [];
    lines.push('# Аудит «кнопки нигде не сливаются» (владелец 13.10) — контраст по всем темам', '');
    lines.push('Пороги: основные кнопки ≥ 3 : 1, тоновые плашки ≥ 1,5 : 1 (худший из краёв градиента bg/bgTop/bgBottom, карточки, шторки), подпись ≥ 4,5 : 1; худшее по 5 шагам ползунка.');
    lines.push(`Строк: ${rows.length}; красных: ${red.length}. Источник: tests/buttons_never_merge_audit.test.ts (BUTTON_AUDIT_WRITE=1).`, '');
    lines.push('## Красное (отдельным списком)', '', '| тема | оформление | кнопка | поверхность | фон/поверхность | подпись/фон |', '|---|---|---|---|---|---|');
    for (const r of red) lines.push(`| ${r.theme} | ${r.appearance} | ${r.button} | ${r.surface} | ${fmt(r.fillMin)}${r.fillRed ? ' 🔴' : ''} | ${fmt(r.inkRatio)}${r.inkRed ? ' 🔴' : ''} |`);
    lines.push('', '## Все значения', '', '| тема | оформление | кнопка | поверхность | фон/поверхность | подпись/фон |', '|---|---|---|---|---|---|');
    for (const r of rows) lines.push(`| ${r.theme} | ${r.appearance} | ${r.button} | ${r.surface} | ${fmt(r.fillMin)} | ${fmt(r.inkRatio)} |`);
    fs.writeFileSync(out, lines.join('\n') + '\n', 'utf8');
  });

  it('новая базовая линия (BUTTON_AUDIT_BASELINE_OUT) — только по явной просьбе, вне репозитория', () => {
    const out = process.env.BUTTON_AUDIT_BASELINE_OUT;
    if (!out) return;
    const body = { note: 'Красное аудита «кнопки не сливаются» по двум уровням (основные ≥ 3:1, тоновые плашки ≥ 1,5:1, подпись ≥ 4,5:1), обновлено 15.10 (отключённые теперь тоже ≥ 1,5:1). Список может только уменьшаться.', red: red.map(keyOf) };
    fs.writeFileSync(out, `${JSON.stringify(body, null, 1)}
`, 'utf8');
  });

  it('отключённые кнопки не сливаются ни в одной теме: ≥ 1,5 : 1 к каждой поверхности, подпись ≥ 4,5 : 1 (координатор 15.10)', () => {
    const disabledRed = red.filter((r) => r.button === 'V2 отключённая').map(keyOf);
    expect(disabledRed).toEqual([]);
    const baselinePath = path.join(__dirname, '..', 'config', 'buttons-never-merge-baseline.json');
    const base = JSON.parse(fs.readFileSync(baselinePath, 'utf8')) as { red: string[] };
    expect(base.red.filter((k) => k.includes('V2 отключённая'))).toEqual([]);
  });

  it('число красных не растёт сверх зафиксированного (RED_BASELINE)', () => {
    const baselinePath = path.join(__dirname, '..', 'config', 'buttons-never-merge-baseline.json');
    if (!fs.existsSync(baselinePath)) { console.log(`[BUTTONS-AUDIT] красных ${red.length} из ${rows.length}; базовой линии ещё нет`); return; } // guard-ok: аудит до фиксации базы
    const base = JSON.parse(fs.readFileSync(baselinePath, 'utf8')) as { red: string[] };
    const known = new Set(base.red);
    const fresh = red.map(keyOf).filter((k) => !known.has(k));
    expect(fresh).toEqual([]);
  });
});
