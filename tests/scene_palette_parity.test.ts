// зачем (координатор 29.10, шаг 1: «tests сверяют вывод TS с выводом JS макета на всех темах × оформлениях, разница 0»; эталон Макетов 4b3e5eea9):
// components/scene/scene_palette.ts — дословный порт docs/design/v2-app/scene-approved.js. Тест подгружает ЭТОТ файл эталона и сравнивает его выход
// с выходом TS-порта на снимке токенов тем со страницы макета: светлое — всё до последнего знака; тёмное — всё, кроме стража по пикселям
// (в приложении нет канвы — страж считается по формуле; сверяется с manifest.json кадров эталона). Меняется эталон — тест покажет, что перенести.
import fs from 'node:fs';
import path from 'node:path';

import { liquidGlassTokens, LIQUID_GLASS_THEME_IDS } from '../constants/liquidGlassThemePalette';
import { approvedScene, scenePalette, type SceneAppearance, type SceneScreen } from '../components/scene/scene_palette';

const MOCK = path.join(__dirname, '..', 'docs', 'design', 'v2-app');
// eslint-disable-next-line @typescript-eslint/no-var-requires
const REF = require(path.join(MOCK, 'scene-approved.js')) as {
  approved: (t: unknown, ap: string, screen: string, W: number, H: number, opts?: { premium?: boolean }) => Record<string, unknown> & { guard?: unknown; spec?: unknown };
};
const MANIFEST = JSON.parse(fs.readFileSync(path.join(MOCK, 'assets', 'approved', 'scene', 'manifest.json'), 'utf8')) as { frames: Record<string, { screen: string; theme: string; ap: string; check?: { guard?: { bottom: number; top: number } } }> };

/** Снимок токенов тем со страницы макета: JSON после `window.__THEMES = `, конец ищем по балансу скобок. */
function pageThemes(): Record<string, Record<string, { accent: string; opaqueCard: string }>> {
  const html = fs.readFileSync(path.join(MOCK, 'scene-palettes.html'), 'utf8');
  const start = html.indexOf('{', html.indexOf('window.__THEMES'));
  let depth = 0;
  let inStr = false;
  for (let i = start; i < html.length; i += 1) {
    const c = html[i]!;
    if (inStr) {
      if (c === '\\') i += 1;
      else if (c === '"') inStr = false;
    } else if (c === '"') inStr = true;
    else if (c === '{') depth += 1;
    else if (c === '}') {
      depth -= 1;
      if (depth === 0) return JSON.parse(html.slice(start, i + 1));
    }
  }
  throw new Error('не нашла конец window.__THEMES');
}

/** Размеры области сцены на кадре 1080 × 2400: Главная и Диалоги 1082, Пик 1950, Сезон 1029. */
const SIZE: Record<SceneScreen, [number, number]> = { home: [1080, 1082], dialogs: [1080, 1082], peak: [1080, 1950], season: [1080, 1029] };
const SCREENS = Object.keys(SIZE) as SceneScreen[];
const PREMIUM = new Set(['grad_full_olive', 'grad_full_ref_signal_lime', 'grad_full_ref_storm_violet', 'grad_full_titanium', 'grad_full_horizon', 'grad_full_ref_gravity_blue']);

const themes = pageThemes();
const PAGE_IDS = Object.keys(themes);
// все темы приложения (23 обычные + 6 премиум); вход обоим — одни и те же токены уровня «Максимум» из приложения
const IDS = [...LIQUID_GLASS_THEME_IDS] as string[];
const appTokens = (id: string, ap: SceneAppearance) => liquidGlassTokens(id, { level: 'max', appearance: ap });
const CASES = IDS.flatMap((id) => (['dark', 'light'] as const).flatMap((ap) => SCREENS.map((screen) => [id, ap, screen] as const)));

/** Структуры без guard (у тёмного он считается иначе) — для точного сравнения. */
const withoutGuard = (o: Record<string, unknown>): Record<string, unknown> => {
  const { guard, ...rest } = o;
  void guard;
  return JSON.parse(JSON.stringify(rest));
};

describe('scenePalette = scene-approved.js эталона, разница 0', () => {
  it('в приложении 29 тем, в снимке страницы — 23 обычные (премиум страница достраивает сама)', () => {
    expect(IDS.length).toBeGreaterThanOrEqual(29);
    expect(PAGE_IDS.length).toBe(23);
  });

  it.each(CASES)('%s %s %s', (id, ap, screen) => {
    const [W, H] = SIZE[screen];
    const opts = { premium: PREMIUM.has(id) };
    const tokens = appTokens(id, ap as SceneAppearance);
    const ref = REF.approved(tokens, ap, screen, W, H, opts);
    const ts = approvedScene(tokens, ap as SceneAppearance, screen, W, H, opts) as unknown as Record<string, unknown>;
    if (ap === 'light') {
      // светлое: всё, включая страж (число шагов) и итоговые альфы
      expect(JSON.parse(JSON.stringify(ts))).toEqual(JSON.parse(JSON.stringify(ref)));
      return;
    }
    // тёмное: слои, цвета и список звёзд — точно; страж по формуле против стража по пикселям из эталона — в пределах 0,02 по альфе затемнения
    expect(withoutGuard(ts)).toEqual(withoutGuard(ref));
    const g = ts.guard as { aBottom: number; aTop: number };
    const frame = Object.values(MANIFEST.frames).find((f) => f.theme === id && f.ap === 'dark' && f.screen === screen);
    if (frame?.check?.guard) {
      expect(Math.abs(g.aBottom - frame.check.guard.bottom)).toBeLessThan(0.02);
      expect(Math.abs(g.aTop - frame.check.guard.top)).toBeLessThan(0.02);
    }
  });

  it.each(PAGE_IDS)('%s: токены приложения дают ту же сцену, что снимок страницы', (id) => {
    for (const ap of ['dark', 'light'] as const) {
      const fromApp = scenePalette(id, ap, 'home', 1080, 1082) as unknown as Record<string, unknown>;
      const fromPage = approvedScene(themes[id]![ap]!, ap, 'home', 1080, 1082) as unknown as Record<string, unknown>;
      expect(JSON.parse(JSON.stringify(fromApp))).toEqual(JSON.parse(JSON.stringify(fromPage)));
    }
  });
});
