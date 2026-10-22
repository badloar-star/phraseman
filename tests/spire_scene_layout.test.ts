// зачем (координатор 22.10 после съёмки Сверки: «нужна сетка без пересечений на 360–430 dp»; владелец 22.10 кнопкой: «Сцена выше, башня
// крупнее» — Пик исключение из 46 %): сторож расчёта высокой «Сцены» Пика (components/spire/scene/spire_scene_layout.ts) — башня целиком
// в масштабе эталона V2 над закреплённой «Играть», ряды соперников без пересечений и без потери числа людей, на ширинах 360–430, высотах
// экрана, шрифтах 1,0 и 1,3, запасе короны любой лиги и длине слова «страж» всех девяти языков.
import { SPIRE_TOWER_GEOM, SPIRE_TW } from '../components/spire/spire_tower_model';
import { spireText } from '../components/spire/spire_strings';
import type { Lang } from '../constants/i18n';
import {
  SPIRE_SCENE_COPY_LEFT, SPIRE_SCENE_MIN_VISIBLE, SPIRE_SCENE_PODIUM, SPIRE_SCENE_WORD_MIN_DP, spireSceneFrame, spireSceneLabelLeft,
  spireSceneRivalRowW, spireSceneRivalsFit, spireSceneVisibleH, spireSceneWordsHidden,
} from '../components/spire/scene/spire_scene_layout';

const LANGS: readonly Lang[] = ['ru', 'uk', 'en', 'es', 'pt-BR', 'vi', 'id', 'tr', 'pl'];
const GUARD_CHARS = [...new Set(LANGS.map((l) => spireText(l, 'guard').toUpperCase().length))];
const WIDTHS = Array.from({ length: 71 }, (_, i) => 360 + i);
const FONTS = [1, 1.3];
/** Видимая под шапкой высота до верха «Играть»: низкий экран (до нижней границы), 390×844, 412×915, высокий. */
const VISIBLE = [400, 520, 591, 686, 800];
/** Запас над верхним этажом под корону лиги (spire_tower_bounds: барабан 34 + конус 168 + ореол, у вершины премиум-лиги ×2,6, + поле 16); 376 — наибольший. */
const HEADROOMS = [266, 282, 320, 352, 376];
/** Числа людей у этажа: одна и две монеты, «+N» в один и два знака, вся комната. */
const COUNTS = [1, 2, 3, 4, 9, 10, 29];
const EPS = 1e-6;
const F1 = SPIRE_TOWER_GEOM.floors[0];
const FLOOR1_BOTTOM = F1.y + F1.h;
const colScale = (width: number): number => (240 * width) / 430 / SPIRE_TW;
const frameOf = (width: number, visibleH = 591, fontScale = 1, guardChars = 5, headroom = 282) => spireSceneFrame({ width, visibleH, fontScale, guardChars, headroom });

describe('высокая «Сцена» Пика: башня целиком над «Играть», сетка без пересечений на 360–430 dp', () => {
  it('видимая высота — экран минус шапка «Сообщества» (не ниже 58) и зона «Играть»', () => {
    expect(spireSceneVisibleH(844, 48, 150)).toBe(844 - (55 + 48) - 150);
    expect(spireSceneVisibleH(800, 0, 150)).toBe(800 - 58 - 150);
  });

  it('масштаб — колонки эталона V2; меньше — только если иначе башня от короны до 1-го этажа не встаёт над «Играть»', () => {
    for (const width of WIDTHS) for (const visibleH of VISIBLE) for (const headroom of HEADROOMS) {
      const fr = frameOf(width, visibleH, 1, 5, headroom);
      const fit = (Math.max(SPIRE_SCENE_MIN_VISIBLE, visibleH) - 14) / (FLOOR1_BOTTOM - (SPIRE_TOWER_GEOM.top - headroom));
      expect(fr.scale).toBeLessThanOrEqual(colScale(width) + EPS);
      expect(fr.scale).toBeGreaterThanOrEqual(Math.min(colScale(width), fit) - 1 / SPIRE_TW - EPS);
    }
    // 390×844, обычная лига: башня в масштабе V2 (с точностью до пикселя ширины)
    expect(frameOf(390, 591, 1, 5, 266).scale).toBeGreaterThan(colScale(390) - 2 / SPIRE_TW);
  });

  it('башня целиком: корона с ореолом и все 15 этажей в окне, верх не выше верха сцены, низ 1-го этажа над «Играть»', () => {
    for (const width of WIDTHS) for (const visibleH of VISIBLE) for (const headroom of HEADROOMS) {
      const fr = frameOf(width, visibleH, 1, 5, headroom);
      const crownTop = SPIRE_TOWER_GEOM.top - headroom;
      const visibleTopUnit = SPIRE_TOWER_GEOM.height - fr.windowH / fr.scale;
      expect(visibleTopUnit).toBeLessThanOrEqual(crownTop + EPS);
      expect(fr.windowTop).toBeGreaterThanOrEqual(-EPS);
      const floor1Y = fr.windowTop + (FLOOR1_BOTTOM - visibleTopUnit) * fr.scale;
      expect(floor1Y).toBeLessThanOrEqual(Math.max(SPIRE_SCENE_MIN_VISIBLE, visibleH) + EPS);
      expect(fr.sceneH).toBeGreaterThanOrEqual(fr.windowTop + fr.windowH - EPS);
      expect(fr.towerLeft + fr.towerW).toBeLessThanOrEqual(width + 6 + 1);
    }
  });

  it('ряд соперников стоит между подписью этажа и телом башни; при обычном шрифте число людей не теряется', () => {
    let checked = 0;
    for (const width of WIDTHS) for (const fontScale of FONTS) for (const guardChars of GUARD_CHARS) for (const headroom of [266, 376]) for (const visibleH of [440, 591]) {
      const fr = frameOf(width, visibleH, fontScale, guardChars, headroom);
      for (const fl of SPIRE_TOWER_GEOM.floors) for (const count of COUNTS) {
        const fit = spireSceneRivalsFit({ floor: fl.f, count, scale: fr.scale, fontScale, guardChars: fr.guardChars });
        const rowW = spireSceneRivalRowW(fit.coins, fit.extra, fr.scale, fontScale);
        expect(fit.rightX).toBeLessThan(fl.x0 * fr.scale);
        expect(fit.rightX - rowW).toBeGreaterThanOrEqual(fit.leftLimitX - EPS);
        expect(fit.coins).toBeLessThanOrEqual(2);
        if (fontScale === 1) expect(fit.coins + fit.extra).toBe(count);
        checked += 1;
      }
    }
    expect(checked).toBe(WIDTHS.length * FONTS.length * GUARD_CHARS.length * 2 * 2 * SPIRE_TOWER_GEOM.floors.length * COUNTS.length);
  });

  it('слова под номерами мельче 4 dp не рисуются — ряд меряется от номера этажа', () => {
    for (const width of WIDTHS) for (const visibleH of VISIBLE) for (const guardChars of GUARD_CHARS) {
      const fr = frameOf(width, visibleH, 1, guardChars, 376);
      expect(fr.wordsHidden).toBe(fr.scale * 7.5 < SPIRE_SCENE_WORD_MIN_DP);
      expect(fr.guardChars).toBe(fr.wordsHidden ? 0 : guardChars);
    }
    expect(spireSceneWordsHidden(0.615)).toBe(false);
    expect(spireSceneWordsHidden(0.42)).toBe(true);
  });

  it('своя метка на любом этаже 1–15 целиком в окне и в рисунке башни', () => {
    for (const width of WIDTHS) for (const visibleH of VISIBLE) for (const headroom of HEADROOMS) {
      const fr = frameOf(width, visibleH, 1, 5, headroom);
      const visibleTopUnit = SPIRE_TOWER_GEOM.height - fr.windowH / fr.scale;
      for (const fl of SPIRE_TOWER_GEOM.floors) {
        const cy = (fl.y + fl.h / 2 + 2 - visibleTopUnit) * fr.scale;
        const cx = (fl.x0 + fl.w + 34) * fr.scale;
        expect(cy - 20).toBeGreaterThanOrEqual(-EPS);
        expect(cx + 20).toBeLessThanOrEqual(fr.towerW + EPS);
      }
    }
  });

  it('шрифт 1,3: крупные числа не растут, мелкие подписи растут вместе с межстрочным, лица блоков пьедестала вмещают строки', () => {
    const read = (rel: string): string => require('node:fs').readFileSync(rel, 'utf8').replace(/\r\n/g, '\n');
    const scene = read('components/spire/scene/SpireScene.tsx');
    expect(scene).toContain('const ts = useScaledTextStyles(s, TEXT_MAX_SCALE);');
    expect(scene).toContain('const TEXT_MAX_SCALE = 1.3;');
    expect(scene).toContain('const DISPLAY_MAX_SCALE = 1;');
    expect(scene.match(/testID="spire-scene-title" maxFontSizeMultiplier=\{DISPLAY_MAX_SCALE\}/g)).toHaveLength(2);
    expect(scene).not.toMatch(/adjustsFontSizeToFit/);
    const podium = read('components/spire/scene/SpireScenePodium.tsx');
    expect(podium).toContain('<Text style={[ts.name, { color: pal.text }]} numberOfLines={1} maxFontSizeMultiplier={FACE_MAX_SCALE}>{m.name}</Text>');
    expect(podium).not.toMatch(/adjustsFontSizeToFit/);
    // лицо блока: заход монеты + 4, место 24 (не растёт), зазор 2, ник и монеты по 17 × 1,1
    for (const i of [0, 1, 2] as const) {
      const overlap = Math.round(SPIRE_SCENE_PODIUM.coin[i] * SPIRE_SCENE_PODIUM.coinOverlap);
      expect(overlap + 4 + 24 + 2 + 2 * 17 * 1.1).toBeLessThanOrEqual(SPIRE_SCENE_PODIUM.blockH[i]);
    }
  });

  it('колонка текста кончается левее подписей этажей и не уже 140', () => {
    for (const width of WIDTHS) for (const guardChars of GUARD_CHARS) for (const visibleH of VISIBLE) {
      const fr = frameOf(width, visibleH, 1, guardChars, 282);
      expect(SPIRE_SCENE_COPY_LEFT + fr.copyW).toBeLessThanOrEqual(fr.towerLeft + spireSceneLabelLeft(fr.guardChars) * fr.scale - 2 + EPS);
      expect(fr.copyW).toBeGreaterThanOrEqual(140);
    }
  });
});
