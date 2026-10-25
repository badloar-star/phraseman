// зачем (замер Тем 25.10, efbcf6f17 / da40bb689, docs/work/speaking-panel-contrast-2026-10-25.md): места панели голосового ответа не читались в
// части тем. Сторож: звёзды «хорошо/почти» доводятся до 3:1 на карточке, «Готово» берёт correctText, «нечётко» и «стоп» — через legibleOn.
// Панель целиком jest не грузит (expo-модули), поэтому поведение проверяем на legibleOn с теми же оттенками, а места — по исходнику.
import fs from 'node:fs';
import path from 'node:path';

import { legibleOn } from '../constants/liquidGlassSurfaceRoles';

const lum = (hex: string): number => {
  const n = Number.parseInt(hex.slice(1, 7), 16);
  const ch = (s: number) => { const c = ((n >> s) & 255) / 255; return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; };
  return 0.2126 * ch(16) + 0.7152 * ch(8) + 0.0722 * ch(0);
};
const ratio = (a: string, b: string): number => { const [hi, lo] = [lum(a), lum(b)].sort((x, y) => y - x); return (hi! + 0.05) / (lo! + 0.05); };
const read = (rel: string): string => fs.readFileSync(path.join(__dirname, '..', rel), 'utf8').replace(/\r\n/g, '\n');

describe('панель голосового ответа: контраст по замеру Тем', () => {
  it('те же оттенки доводятся до порога на светлой карточке и не меняются на тёмной', () => {
    for (const tone of ['#F2C94C', '#F2994A']) expect(ratio(legibleOn(tone, '#1A1A1A', ['#FFFFFF'], 3.05), '#FFFFFF')).toBeGreaterThanOrEqual(3);
    expect(ratio(legibleOn('#E6A23C', '#1A1A1A', ['#FFFFFF'], 4.55), '#FFFFFF')).toBeGreaterThanOrEqual(4.5);
    expect(legibleOn('#F2C94C', '#F5F5F5', ['#101010'], 3.05)).toBe('#F2C94C');
    expect(ratio(legibleOn('#FFFFFF', '#FFFFFF', ['#D9534F'], 4.5), '#D9534F')).toBeGreaterThan(3.5);
  });

  it('панель: «Готово» onCorrect = correctText, звёзды/«нечётко»/«стоп» через legibleOn, подсказка textMuted', () => {
    const panel = read('components/SpeakingPanel.tsx');
    expect(panel).toContain('onCorrect: t.correctText ?? t.textOnGold');
    expect(panel).toContain('color: mTheme.onCorrect ?? mTheme.onAccent');
    expect(panel).toContain('legibleOn(tone, theme.textPrimary, [theme.card], 3.05)');
    expect(panel).toContain('legibleOn(WARN_COLOR_FALLBACK, sheet.text, [sheet.opaqueSheet], 4.55)');
    expect(panel).toContain("const stopInk = legibleOn(mTheme.card, '#FFFFFF', [mTheme.wrong], 4.5);");
    expect(panel).toContain('color={listening ? stopInk : mTheme.onAccent}');
    expect(panel).toContain('<Text style={[styles.hintLine, { color: mTheme.textMuted }]}>{hintLine}</Text>');
  });

  it('урок: бейдж счётчика подсказок — пары темы (ctaInk на cta, buttonInkDisabled на buttonFillDisabled)', () => {
    const lesson = read('app/lesson1.tsx');
    expect(lesson).toContain('backgroundColor: canUse50 ? glass.cta : glass.buttonFillDisabled');
    expect(lesson).toContain('color: canUse50 ? glass.ctaInk : glass.buttonInkDisabled');
    expect(lesson).not.toContain('{ color: glass.accentInk, fontSize: 13');
  });
});
