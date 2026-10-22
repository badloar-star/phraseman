// зачем (координатор 22.10, выпуск: владелец включает у людей все сцены — Главная, Диалоги, «Сегодня», Пик): аудит контраста подписей, кнопок и строки «Нет сети»
// по ВСЕМ темам каталога на уровне «Максимум», в тёмном и светлом оформлении, днём и вечером. Нормы: обычный текст ≥ 4,5:1, крупный текст и значки ≥ 3:1.
// Сцены Главной, «Сегодня» и Пика красятся одной формулой (homeSceneTokensForTheme), «Диалогов» — своей (dialogsSceneColors). Сторож проверяет пары без правки компонентов.
// Таблица для людей: SCENE_AUDIT_OUT=<файл.json> npm run test:one -- tests/scene_contrast_audit.test.ts (используется при подготовке docs/work/tasks/scene-contrast-audit-2026-10-22.md).
import fs from 'node:fs';
import { readSource } from './helpers/read_source';

import { LIQUID_GLASS_THEME_IDS, liquidGlassTokens } from '../constants/liquidGlassThemePalette';
import { homeSceneTokensForTheme } from '../components/home/v2/scene/home_scene_tokens';
import { contrastRatio, dialogsSceneColors, dialogsSceneTokensForTheme } from '../components/dialogs/scene/dialogs_scene_tokens';

const TEXT = 4.5;
const LARGE = 3;
const WHITE = '#FFFFFF';
const CTA_INK = '#121318'; // текст белой кнопки сцены (HomeSceneStage / TodaySceneView)
const WARM = '#FFD9D0'; // тёплая строка вечера (была #FFD0C4: 4,45 в светлых sage/grad_aurora)
const GLASS_ALPHA = 0.14; // подложка полосы «Нет сети» и чипов (была 16 %)

const hexToRgb = (h: string): [number, number, number] => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16)) as [number, number, number];
const toHex = (c: readonly number[]): string => '#' + c.map((v) => Math.round(v).toString(16).padStart(2, '0')).join('');
/** Цвет с прозрачностью поверх подложки → непрозрачный #rrggbb. */
const over = (fg: string, alpha: number, bg: string): string => {
  const f = hexToRgb(fg);
  const b = hexToRgb(bg);
  return toHex(f.map((v, i) => v * alpha + b[i]! * (1 - alpha)));
};

type Row = { scene: string; theme: string; appearance: string; state: string; pair: string; ratio: number; need: number; info?: boolean };
// зачем: формула цветов сцены Главной заперта эталоном (tests/home_scene_theme_tokens.test.ts), поэтому два граничных случая светлых тем не лечатся токенами, а только
// константами компонентов (белая полоса 16 % → 14 %, тёплая строка #FFD0C4 → светлее) — это файлы 3 · МАКЕТЫ. Пока так, они перечислены здесь ПОИМЁННО; новый промах или исчезновение
// старого валит сторожа (список обязан сокращаться).
const KNOWN_MARGINAL: ReadonlySet<string> = new Set<string>([]); // 22.10: пусто — граничные случаи закрыты константами компонентов (14 %, #FFD9D0)
const MARGINAL_FLOOR = 4.4;
const keyOf = (r: Row): string => `${r.theme}|${r.appearance}|${r.state}|${r.pair}`;
const rows: Row[] = [];
const push = (scene: string, theme: string, appearance: string, state: string, pair: string, ratio: number, need: number, info = false) => {
  rows.push({ scene, theme, appearance, state, pair, ratio: Math.round(ratio * 100) / 100, need, ...(info ? { info: true } : {}) });
};

for (const themeId of LIQUID_GLASS_THEME_IDS) {
  for (const appearance of ['dark', 'light'] as const) {
    for (const evening of [false, true]) {
      const t = homeSceneTokensForTheme(themeId, appearance, evening);
      const state = evening ? 'вечер' : 'день';
      for (const [zone, bg] of [['верх сцены', t.sceneTop], ['низ сцены', t.sceneBottom]] as const) {
        push('Главная/Сегодня/Пик', themeId, appearance, state, `заголовок белый на ${zone}`, contrastRatio(WHITE, bg), TEXT);
        push('Главная/Сегодня/Пик', themeId, appearance, state, `подпись над заголовком (белый 86 %) на ${zone}`, contrastRatio(over(WHITE, 0.86, bg), bg), TEXT);
        push('Главная/Сегодня/Пик', themeId, appearance, state, `строка под заголовком (белый 88 %) на ${zone}`, contrastRatio(over(WHITE, 0.88, bg), bg), TEXT);
        push('Главная/Сегодня/Пик', themeId, appearance, state, `тёплая строка вечера на ${zone}`, contrastRatio(WARM, bg), TEXT);
        const strip = over(WHITE, GLASS_ALPHA, bg);
        push('Главная', themeId, appearance, state, `«Нет сети»: белый текст на полосе на ${zone}`, contrastRatio(WHITE, strip), TEXT);
        push('Главная', themeId, appearance, state, `значок «Нет сети» на полосе на ${zone}`, contrastRatio(WHITE, strip), LARGE);
        push('Главная/Сегодня/Пик', themeId, appearance, state, `чип (белый текст на белом 14 %) на ${zone}`, contrastRatio(WHITE, over(WHITE, GLASS_ALPHA, bg)), TEXT);
        push('Главная/Сегодня/Пик', themeId, appearance, state, `белая кнопка на ${zone} (форма кнопки)`, contrastRatio(WHITE, bg), LARGE);
      }
      push('Главная/Сегодня/Пик', themeId, appearance, state, 'текст на белой кнопке', contrastRatio(CTA_INK, WHITE), TEXT);
    }
    // «Диалоги»: свои цвета сцены
    const g = dialogsSceneTokensForTheme(themeId, appearance);
    const c = dialogsSceneColors(g);
    push('Диалоги', themeId, appearance, '—', 'основной текст на зоне текста', contrastRatio(c.text, c.textZone), TEXT);
    push('Диалоги', themeId, appearance, '—', 'вторичный текст на зоне текста', contrastRatio(c.secondary, c.textZone), TEXT);
    push('Диалоги', themeId, appearance, '—', 'акцентный текст на зоне текста', contrastRatio(c.accent, c.textZone), TEXT);
    push('Диалоги', themeId, appearance, '—', 'текст на кнопке', contrastRatio(c.ctaInk, c.cta), TEXT);
    // справочно: подпись кнопки читается (≥ 4,5), а сама заливка кнопки в части светлых тем близка к цвету сцены (cta темы ≈ основа сцены) — решение за «Дизайном»/владельцем, сторож не валит
    push('Диалоги', themeId, appearance, '—', 'заливка кнопки на зоне текста (справочно)', contrastRatio(c.cta, c.textZone), LARGE, true);
  }
}

if (process.env.SCENE_AUDIT_OUT) fs.writeFileSync(process.env.SCENE_AUDIT_OUT, JSON.stringify(rows, null, 1));

describe('аудит контраста сцен: все темы, уровень «Максимум», тёмное и светлое оформление', () => {
  it('в каталоге есть что проверять', () => {
    expect(LIQUID_GLASS_THEME_IDS.length).toBeGreaterThanOrEqual(20);
    expect(rows.length).toBeGreaterThan(1500);
  });

  it('каждая пара подпись/кнопка/«Нет сети» проходит свою норму', () => {
    const failed = rows.filter((r) => !r.info && r.ratio < r.need && !(KNOWN_MARGINAL.has(keyOf(r)) && r.ratio >= MARGINAL_FLOOR));
    const sample = failed.slice(0, 12).map((r) => `${r.scene} · ${r.theme} · ${r.appearance} · ${r.state} · ${r.pair}: ${r.ratio} < ${r.need}`);
    expect(sample).toEqual([]);
  });

  it('список граничных случаев не устарел: каждый всё ещё ниже нормы (иначе убрать из списка)', () => {
    const stale = [...KNOWN_MARGINAL].filter((k) => !rows.some((r) => keyOf(r) === k && r.ratio < r.need));
    expect(stale).toEqual([]);
  });

  it('константы теста совпадают с компонентами: подложка 14 % и тёплая строка #FFD9D0 на Главной и в «Сегодня»', () => {
    const home = readSource('components/home/v2/scene/HomeScene.tsx');
    const stage = readSource('components/home/v2/scene/HomeSceneStage.tsx');
    const today = readSource('components/home/v2/today_scene/TodaySceneView.tsx');
    expect(home).toContain("backgroundColor: 'rgba(255,255,255,0.14)'");
    expect(stage).toContain("backgroundColor: 'rgba(255,255,255,0.14)'");
    expect(stage).toContain("warm: { color: '#FFD9D0'");
    expect(today).toContain("warm: { color: '#FFD9D0'");
  });

  it('пары берут токены уровня «Максимум» (светлое/тёмное оформление различаются)', () => {
    const dark = homeSceneTokensForTheme(LIQUID_GLASS_THEME_IDS[0]!, 'dark');
    const light = homeSceneTokensForTheme(LIQUID_GLASS_THEME_IDS[0]!, 'light');
    expect(dark.sceneTop).not.toBe(light.sceneTop);
    expect(liquidGlassTokens(LIQUID_GLASS_THEME_IDS[0]!, { level: 'max', appearance: 'dark' }).isLight).toBe(false);
  });
});
