// зачем (координатор 22.10 после съёмки Сверки: «нужна сетка без пересечений на 360–430 dp»; владелец 22.10 выбрал вариант 2
// scenes-compact.html — высота всех сцен 46 %): сторож расчёта сетки компактной «Сцены» Пика (components/spire/scene/spire_scene_layout.ts)
// на каждой ширине 360–430, высотах экрана 640–960, шрифтах 1,0 и 1,3 и длине слова «страж» всех девяти языков.
import fs from 'node:fs';
import { SPIRE_TOWER_GEOM } from '../components/spire/spire_tower_model';
import { spireText } from '../components/spire/spire_strings';
import type { Lang } from '../constants/i18n';
import {
  SPIRE_SCENE_COPY_LEFT, SPIRE_SCENE_HEADER_H, SPIRE_SCENE_PANEL_OVERLAP, SPIRE_SCENE_PODIUM, spireSceneFrame, spireSceneHiddenRows,
  spireSceneLabelLeft, spireSceneRivalRowW, spireSceneRivalsFit, spireSceneRowHalf,
} from '../components/spire/scene/spire_scene_layout';

const LANGS: readonly Lang[] = ['ru', 'uk', 'en', 'es', 'pt-BR', 'vi', 'id', 'tr', 'pl'];
const GUARD_CHARS = [...new Set(LANGS.map((l) => spireText(l, 'guard').toUpperCase().length))];
const WIDTHS = Array.from({ length: 71 }, (_, i) => 360 + i);
const HEIGHTS = [640, 740, 844, 915, 960];
const FONTS = [1, 1.3];
const EPS = 1e-6;
const contentH = (scale: number): number => SPIRE_TOWER_GEOM.height * scale;
const read = (rel: string): string => fs.readFileSync(rel, 'utf8').replace(/\r\n/g, '\n');
const frameOf = (width: number, windowH = 915, fontScale = 1, guardChars = 5) => spireSceneFrame({ width, windowH, topInset: 48, fontScale, guardChars });

describe('компактная «Сцена» Пика (вариант 2): сетка без пересечений на 360–430 dp', () => {
  it('высота сцены — 392 из 844 вместе со строкой статуса и вкладками; на низком экране не ниже 280', () => {
    expect(spireSceneFrame({ width: 390, windowH: 844, topInset: 44, fontScale: 1, guardChars: 5 }).sceneH).toBe(392 - 44 - SPIRE_SCENE_HEADER_H);
    for (const windowH of HEIGHTS) for (const width of [360, 412]) {
      const fr = spireSceneFrame({ width, windowH, topInset: 48, fontScale: 1, guardChars: 5 });
      expect(fr.sceneH).toBeGreaterThanOrEqual(280);
      expect(fr.sceneH + 48 + SPIRE_SCENE_HEADER_H).toBeLessThanOrEqual(Math.max(Math.round(windowH * 392 / 844), 280 + 48 + SPIRE_SCENE_HEADER_H));
    }
  });

  it('ряд соперников стоит между подписью этажа и телом башни при 1–29 соперниках; при обычном шрифте число людей не теряется', () => {
    let checked = 0;
    for (const width of WIDTHS) for (const fontScale of FONTS) for (const guardChars of GUARD_CHARS) {
      const { scale } = frameOf(width, 915, fontScale, guardChars);
      for (const fl of SPIRE_TOWER_GEOM.floors) for (let count = 1; count <= 29; count += 1) {
        const fit = spireSceneRivalsFit({ floor: fl.f, count, scale, fontScale, guardChars });
        const rowW = spireSceneRivalRowW(fit.coins, fit.extra, scale, fontScale);
        expect(fit.rightX).toBeLessThan(fl.x0 * scale);
        expect(fit.rightX - rowW).toBeGreaterThanOrEqual(fit.leftLimitX - EPS);
        expect(fit.coins + fit.extra).toBeGreaterThan(0);
        expect(fit.coins).toBeLessThanOrEqual(2);
        if (fontScale === 1) expect(fit.coins + fit.extra).toBe(count);
        checked += 1;
      }
    }
    expect(checked).toBe(WIDTHS.length * FONTS.length * GUARD_CHARS.length * SPIRE_TOWER_GEOM.floors.length * 29);
  });

  it('окно прижато к низу башни: ряд первого этажа кончается над панелью «Комната недели», которая наезжает на 22', () => {
    const f1 = SPIRE_TOWER_GEOM.floors[0];
    for (const width of WIDTHS) for (const windowH of HEIGHTS) for (const fontScale of FONTS) {
      const fr = frameOf(width, windowH, fontScale);
      const windowBottom = fr.windowTop + fr.windowH;
      expect(windowBottom).toBe(fr.sceneH);
      const center = windowBottom - (contentH(fr.scale) - (f1.y + f1.h / 2) * fr.scale);
      expect(center + spireSceneRowHalf(fr.scale, fontScale)).toBeLessThanOrEqual(fr.sceneH - SPIRE_SCENE_PANEL_OVERLAP - 3 + EPS);
      expect(spireSceneHiddenRows({ offsetY: Math.max(0, contentH(fr.scale) - fr.windowH), windowH: fr.windowH, clearBottom: fr.rowsClearBottom, scale: fr.scale })).toBe(0);
    }
  });

  it('окно прокручено (своя метка высоко или ручная прокрутка): ряды ниже края панели прячутся, остальные кончаются над ней', () => {
    for (const width of [360, 393, 412, 430]) {
      const fr = frameOf(width);
      const maxY = Math.max(0, contentH(fr.scale) - fr.windowH);
      expect(spireSceneHiddenRows({ offsetY: 0, windowH: fr.windowH, clearBottom: fr.rowsClearBottom, scale: fr.scale })).toBeGreaterThan(0);
      for (const offsetY of [0, maxY / 3, maxY / 2, maxY]) {
        const hidden = spireSceneHiddenRows({ offsetY, windowH: fr.windowH, clearBottom: fr.rowsClearBottom, scale: fr.scale });
        for (const fl of SPIRE_TOWER_GEOM.floors.filter((f) => f.f > hidden)) {
          const center = fr.windowTop + (fl.y + fl.h / 2) * fr.scale - offsetY;
          if (center > fr.windowTop + fr.windowH) continue;
          expect(center + spireSceneRowHalf(fr.scale, 1)).toBeLessThanOrEqual(fr.sceneH - SPIRE_SCENE_PANEL_OVERLAP - 3 + 0.5 + EPS);
        }
      }
    }
  });

  it('верхний край окна не режет номер этажа', () => {
    for (const width of WIDTHS) for (const windowH of HEIGHTS) {
      const fr = frameOf(width, windowH);
      const topUnit = SPIRE_TOWER_GEOM.height - fr.windowH / fr.scale;
      for (const fl of SPIRE_TOWER_GEOM.floors) {
        const c = fl.y + fl.h / 2;
        expect(topUnit > c - 10 && topUnit < c + 14).toBe(false);
      }
    }
  });

  it('колонка текста кончается левее подписей этажей и не уже 160', () => {
    for (const width of WIDTHS) for (const guardChars of GUARD_CHARS) {
      const fr = frameOf(width, 915, 1, guardChars);
      expect(SPIRE_SCENE_COPY_LEFT + fr.copyW).toBeLessThanOrEqual(fr.towerLeft + spireSceneLabelLeft(guardChars) * fr.scale - 2 + EPS);
      expect(fr.copyW).toBeGreaterThanOrEqual(160);
    }
  });

  it('башня — доля эталона (188 из 390); шире только там, где длинное слово «страж» иначе отняло бы «+29» у 5-го этажа', () => {
    expect(frameOf(390).towerW).toBe(188);
    for (const width of WIDTHS) for (const guardChars of GUARD_CHARS) {
      const share = Math.round((188 * width) / 390);
      const { towerW } = frameOf(width, 915, 1, guardChars);
      expect(towerW).toBeGreaterThanOrEqual(share);
      if (guardChars <= 8) expect(towerW).toBe(share);
      else expect(towerW - share).toBeLessThanOrEqual(9);
    }
  });

  it('шрифт 1,3: заголовок не растёт, мелкие подписи растут с межстрочным; панель и пьедестал вмещают строки', () => {
    const scene = read('components/spire/scene/SpireScene.tsx');
    expect(scene).toContain('const ts = useScaledTextStyles(s, TEXT_MAX_SCALE);');
    expect(scene).toContain('const TEXT_MAX_SCALE = 1.3;');
    expect(scene).toContain('const DISPLAY_MAX_SCALE = 1;');
    expect(scene.match(/testID="spire-scene-title" maxFontSizeMultiplier=\{DISPLAY_MAX_SCALE\}/g)).toHaveLength(2);
    expect(scene).not.toMatch(/adjustsFontSizeToFit/);
    const podium = read('components/spire/scene/SpireScenePodium.tsx');
    expect(podium).toContain('<Text style={[ts.name, { color: pal.text }]} numberOfLines={1} maxFontSizeMultiplier={FACE_MAX_SCALE}>{m.name}</Text>');
    expect(podium).not.toMatch(/adjustsFontSizeToFit/);
    // лицо самого низкого блока: заход монеты + 4, место 24 (не растёт), зазор 2, ник и монеты по 17 × 1,1
    for (const i of [0, 1, 2] as const) {
      const overlap = Math.round(SPIRE_SCENE_PODIUM.coin[i] * SPIRE_SCENE_PODIUM.coinOverlap);
      expect(overlap + 4 + 24 + 2 + 2 * 17 * 1.1).toBeLessThanOrEqual(SPIRE_SCENE_PODIUM.blockH[i]);
    }
  });
});
