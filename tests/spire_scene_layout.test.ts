// зачем (координатор 22.10 после съёмки Сверки: «нижние этажи перекрыты монетами жителей, монета первого места наезжает на башню — нужна
// сетка без пересечений на 360–430 dp»): сторож расчёта сетки «Сцены» Пика (components/spire/scene/spire_scene_layout.ts) на каждой
// ширине 360–430, шрифтах 1,0 и 1,3 и длине слова «страж» всех девяти языков.
import { SPIRE_TOWER_GEOM } from '../components/spire/spire_tower_model';
import { spireText } from '../components/spire/spire_strings';
import type { Lang } from '../constants/i18n';
import {
  SPIRE_SCENE_COIN_BAND_TOP, SPIRE_SCENE_COPY_LEFT, SPIRE_SCENE_PODIUM, spireSceneFrame, spireSceneHiddenRows, spireSceneLabelLeft,
  spireSceneRivalRowW, spireSceneRivalsFit, spireSceneRowHalf,
} from '../components/spire/scene/spire_scene_layout';

const LANGS: readonly Lang[] = ['ru', 'uk', 'en', 'es', 'pt-BR', 'vi', 'id', 'tr', 'pl'];
const GUARD_CHARS = [...new Set(LANGS.map((l) => spireText(l, 'guard').toUpperCase().length))];
const WIDTHS = Array.from({ length: 71 }, (_, i) => 360 + i);
const FONTS = [1, 1.3];
const EPS = 1e-6;
const contentH = (scale: number): number => SPIRE_TOWER_GEOM.height * scale;

describe('сетка «Сцены» Пика без пересечений на 360–430 dp', () => {
  it('монета первого места — верх пьедестала: 568 − 124 − 48 + 23', () => {
    expect(SPIRE_SCENE_COIN_BAND_TOP).toBe(SPIRE_SCENE_PODIUM.bottom - SPIRE_SCENE_PODIUM.blockH[0] - SPIRE_SCENE_PODIUM.coin[0] + 23);
    expect(SPIRE_SCENE_COIN_BAND_TOP).toBe(419);
  });

  it('ряд соперников стоит между подписью этажа и телом башни при 1–29 соперниках; при обычном шрифте число людей не теряется', () => {
    let checked = 0;
    for (const width of WIDTHS) for (const fontScale of FONTS) for (const guardChars of GUARD_CHARS) {
      const { scale } = spireSceneFrame({ width, fontScale, myFloor: 4, guardChars });
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

  it('как в эталоне на 412 и 430: у первого этажа шестеро — две монеты и «+4»', () => {
    for (const width of [412, 430]) {
      const { scale } = spireSceneFrame({ width, fontScale: 1, myFloor: 4, guardChars: 5 });
      expect(spireSceneRivalsFit({ floor: 1, count: 6, scale, fontScale: 1, guardChars: 5 })).toMatchObject({ coins: 2, extra: 4 });
    }
  });

  it('окно прижато к низу башни: ряд первого этажа кончается над монетой первого места; низ окна не ниже эталонного 488', () => {
    const f1 = SPIRE_TOWER_GEOM.floors[0];
    for (const width of WIDTHS) for (const fontScale of FONTS) {
      const fr = spireSceneFrame({ width, fontScale, myFloor: 4, guardChars: 5 });
      const windowBottom = fr.windowTop + fr.windowH;
      const center = windowBottom - (contentH(fr.scale) - (f1.y + f1.h / 2) * fr.scale);
      expect(center + spireSceneRowHalf(fr.scale, fontScale)).toBeLessThanOrEqual(SPIRE_SCENE_COIN_BAND_TOP - 3 + EPS);
      expect(windowBottom).toBeLessThanOrEqual(488);
      expect(spireSceneHiddenRows({ offsetY: Math.max(0, contentH(fr.scale) - fr.windowH), windowH: fr.windowH, clearBottom: fr.rowsClearBottom, scale: fr.scale })).toBe(0);
    }
  });

  it('своя метка на этажах 1–13 целиком в окне, прижатом к низу; окно не выше верха сцены', () => {
    for (const width of WIDTHS) for (const fontScale of FONTS) for (let myFloor = 1; myFloor <= 13; myFloor += 1) {
      const fr = spireSceneFrame({ width, fontScale, myFloor, guardChars: 5 });
      const fl = SPIRE_TOWER_GEOM.floors[myFloor - 1];
      const visibleTop = contentH(fr.scale) - fr.windowH;
      const markTop = (fl.y + fl.h / 2) * fr.scale - Math.max((fl.h / 2) * fr.scale, 20);
      expect(markTop).toBeGreaterThanOrEqual(visibleTop - EPS);
      expect(fr.windowTop).toBeGreaterThanOrEqual(0);
      expect(fr.windowTop).toBeLessThanOrEqual(38 + 25 * fr.scale); // зачем: край окна может опуститься под номер этажа (не резать подпись)
    }
  });

  it('у вершины (окно прокручено вверх) ряды ниже монет пьедестала прячутся, остальные кончаются над монетой', () => {
    for (const width of [360, 393, 412, 430]) {
      const fr = spireSceneFrame({ width, fontScale: 1, myFloor: 15, guardChars: 5 });
      const maxY = Math.max(0, contentH(fr.scale) - fr.windowH);
      expect(spireSceneHiddenRows({ offsetY: 0, windowH: fr.windowH, clearBottom: fr.rowsClearBottom, scale: fr.scale })).toBeGreaterThan(0);
      for (const offsetY of [0, maxY / 3, maxY / 2, maxY]) {
        const hidden = spireSceneHiddenRows({ offsetY, windowH: fr.windowH, clearBottom: fr.rowsClearBottom, scale: fr.scale });
        for (const fl of SPIRE_TOWER_GEOM.floors.filter((f) => f.f > hidden)) {
          const center = fr.windowTop + (fl.y + fl.h / 2) * fr.scale - offsetY;
          if (center > fr.windowTop + fr.windowH) continue;
          expect(center + spireSceneRowHalf(fr.scale, 1)).toBeLessThanOrEqual(SPIRE_SCENE_COIN_BAND_TOP - 3 + 0.5 + EPS);
        }
      }
    }
  });

  it('верхний край окна не режет номер этажа (Сверка r3: на 412 сверху «13», как в эталоне)', () => {
    for (const width of WIDTHS) for (const fontScale of FONTS) {
      const fr = spireSceneFrame({ width, fontScale, myFloor: 4, guardChars: 5 });
      const topUnit = SPIRE_TOWER_GEOM.height - fr.windowH / fr.scale;
      for (const fl of SPIRE_TOWER_GEOM.floors) {
        const c = fl.y + fl.h / 2;
        expect(topUnit > c - 10 && topUnit < c + 14).toBe(false);
      }
    }
    const at412 = spireSceneFrame({ width: 412, fontScale: 1, myFloor: 4, guardChars: 5 });
    const top412 = SPIRE_TOWER_GEOM.height - at412.windowH / at412.scale;
    const f13 = SPIRE_TOWER_GEOM.floors[12];
    expect(top412).toBeLessThanOrEqual(f13.y);
    expect(top412).toBeGreaterThan(SPIRE_TOWER_GEOM.floors[13].y + SPIRE_TOWER_GEOM.floors[13].h / 2);
  });

  it('шрифт 1,3: крупные числа не растут, мелкие подписи растут вместе с межстрочным, лицо третьего блока вмещает строки', () => {
    const read = (rel: string): string => require('node:fs').readFileSync(rel, 'utf8').replace(/\r\n/g, '\n');
    const scene = read('components/spire/scene/SpireScene.tsx');
    expect(scene).toContain('const ts = useScaledTextStyles(s, TEXT_MAX_SCALE);');
    expect(scene).toContain('const TEXT_MAX_SCALE = 1.3;');
    expect(scene).toContain('const DISPLAY_MAX_SCALE = 1;');
    expect(scene.match(/testID="spire-scene-title" maxFontSizeMultiplier=\{DISPLAY_MAX_SCALE\}/g)).toHaveLength(2);
    expect(scene).not.toMatch(/adjustsFontSizeToFit/);
    const podium = read('components/spire/scene/SpireScenePodium.tsx');
    expect(podium).toContain('<Text style={ts.name} numberOfLines={1} maxFontSizeMultiplier={FACE_MAX_SCALE}>{m.name}</Text>');
    expect(podium).not.toMatch(/adjustsFontSizeToFit/);
    // лицо третьего блока: заход монеты + 4, место 24 (не растёт), зазор 2, ник и монеты по 17 × 1,1
    const overlap = Math.round(SPIRE_SCENE_PODIUM.coin[2] * SPIRE_SCENE_PODIUM.coinOverlap);
    expect(overlap + 4 + 24 + 2 + 2 * 17 * 1.1).toBeLessThanOrEqual(SPIRE_SCENE_PODIUM.blockH[2]);
  });

  it('колонка текста и «своё место» кончаются левее подписей этажей и не уже 140', () => {
    for (const width of WIDTHS) for (const guardChars of GUARD_CHARS) {
      const fr = spireSceneFrame({ width, fontScale: 1, myFloor: 4, guardChars });
      expect(SPIRE_SCENE_COPY_LEFT + fr.copyW).toBeLessThanOrEqual(fr.towerLeft + spireSceneLabelLeft(guardChars) * fr.scale - 2 + EPS);
      expect(fr.copyW).toBeGreaterThanOrEqual(140);
    }
  });
});
