// зачем (владелец 17.10: «На Главной должен быть Пик тоже — кнопка-иконка… 4: Уроки, Диалоги, Карточки и Пик»):
// четвёртая плитка только когда все три раздела есть и Пик открыт для языка; вид — эталон #four-tiles (а): квадрат-иконка, название под ним.
import fs from 'node:fs';
import path from 'node:path';

import { spireHomePlaceFrom } from '../app/spire/spire_home_place';

const read = (rel: string) => fs.readFileSync(path.join(__dirname, '..', rel), 'utf8').replace(/\r\n/g, '\n');

describe('Главная: 4 плитки с Пиком', () => {
  const home = read('app/(tabs)/home.tsx');
  const tiles = read('components/home/v2/HomeV2FeatureTiles.tsx');

  it('Пик — четвёртым, только при трёх разделах и открытом Пике; иначе прежний ряд из трёх', () => {
    expect(home).toContain('const homeV2WithSpire = homeV2BaseTiles.length === 3 && homeV2SpireTile.available;');
    expect(home).toContain("available: isLearningSurfaceReady(studyTarget, 'spire') && spireTabEnabled,");
    expect(home).toMatch(/\.slice\(0, 3\);/);
  });

  it('журнал [HOME-TILES] со списком и причиной — только на смену набора', () => {
    expect(home).toContain('reason={`${homeV2TilesReason};lang=${studyTarget}`}');
    expect(tiles).toContain('if (tilesLog !== lastTilesLog) {');
    expect(tiles).toContain("console.log('[HOME-TILES]'");
  });

  it('вариант (в): бейдж места у Пика — заливка ctaFill/ctaFillInk, место из копии на устройстве (без сети)', () => {
    expect(tiles).toContain("tile.key === 'spire' && spirePlace !== null");
    expect(tiles).toContain('backgroundColor: g.ctaFill');
    const place = read('app/spire/spire_home_place.ts');
    expect(place).not.toMatch(/spireSyncRoom|getDoc|httpsCallable|fetch\(/);
    expect(read('app/spire/spire_load_trace.ts')).toContain("m.refreshSpireHomePlace(uid, lang, room)");
  });

  it('место: своя строка по порядку; новичок без ступеней — без бейджа', () => {
    expect(spireHomePlaceFrom([{ isMe: false, steps: 9 }, { isMe: false, steps: 5 }, { isMe: true, steps: 4 }])).toBe(3);
    expect(spireHomePlaceFrom([{ isMe: false, steps: 2 }, { isMe: true, steps: 0 }])).toBeNull();
    expect(spireHomePlaceFrom([{ isMe: false, steps: 2 }])).toBeNull();
  });

  // зачем (владелец 22.10, вариант 2: «иконки Уроки, Карточки — вот так же, без скролла, и внизу под блоком Сегодня»)
  it('со «Сценой»: 4 равные плитки одним рядом без прокрутки, под карточкой «Сегодня»; ленты видео на Главной нет', () => {
    expect(tiles).toContain('if (tiles.length === 4 && row) {');
    expect(tiles).toMatch(/<View testID="home-v2-feature-tiles" style=\{s.row\}>\n        \{tiles.map/);
    const home = read('app/(tabs)/home.tsx');
    const today = home.indexOf('<HomeV2TodayCard');
    const rowTiles = home.indexOf('uiLang={lang} row />');
    expect(today).toBeGreaterThan(0);
    expect(rowTiles).toBeGreaterThan(today);
    expect(home).toContain('{HOME_SCENE_V2_ENABLED ? null : (\n            <View style={{ gap: 4 }}>');
  });

  it('4 плитки — иконка с артом, название под плашкой с переносом, без обрезки и ужатия шрифта', () => {
    expect(tiles).toContain('if (tiles.length === 4) {');
    expect(tiles).not.toMatch(/numberOfLines=/);
    expect(tiles).not.toMatch(/adjustsFontSizeToFit/);
  });

  // зачем (владелец 18.10 через координатора, вариант (в) «затухание справа»): плитки ровно прежнего размера (три на экран), справа затухание 24 dp цветом фона темы, касания сквозь
  it('лента 4 плиток: ширина плитки = как у трёх в ряд; затухания справа нет, край без подсветки (владелец 22.10)', () => {
    expect(tiles).toContain('const tileW = Math.floor((windowW - V2.screenPad * 2 - TILE_GAP * 2) / 3);');
    for (const windowW of [360, 393, 412]) {
      const tileW = Math.floor((windowW - 20 * 2 - 10 * 2) / 3);
      const oldW = (windowW - 20 * 2 - 10 * 2) / 3; // ширина ячейки flex: 1 в прежнем ряду из трёх
      expect(oldW - tileW).toBeLessThan(1);
    }
    // зачем (владелец 22.10: «убери чёрную подсветку на горизонтальном скролле, где 4 кнопки»): затухание у края давало тёмную полосу — его нет;
    // край Android без подсветки; строка [HOME-RIBBON] на показ ленты говорит, чем закрыты края
    expect(tiles).not.toContain('home-v2-feature-tiles-fade');
    expect(tiles).not.toContain('TILE_FADE_W');
    expect(tiles).toContain('overScrollMode="never"');
    expect(tiles).toContain("'[HOME-RIBBON] edges'");
  });

  // зачем (координатор 08:01, кадр 11886ef5b): свайп по ленте переключал вкладку — пейджер TabSlider забирал жест, Пик был недостижим
  it('лента забирает горизонтальный жест: ScrollView из gesture-handler + замок вкладок на время касания', () => {
    expect(tiles).toContain("import { ScrollView as GestureScrollView } from 'react-native-gesture-handler';");
    expect(tiles).toMatch(/<GestureScrollView[\s\S]{0,200}horizontal[\s\S]{0,200}\{\.\.\.ribbonLock\}/);
    const lock = read('components/home/v2/use_ribbon_tab_lock.ts');
    expect(lock).toContain('tabSwipeLocked.value = true;');
    expect(lock).toContain('tabSwipeLocked.value = false;');
    expect(lock).toContain("'[HOME-RIBBON]'");
    expect(lock).toMatch(/onTouchStart: \(\) => lock\('touch_start'\)/);
    expect(lock).toMatch(/onTouchEnd: \(\) => scheduleUnlock\('touch_end'\)/);
    // пейджер вкладок по-прежнему слушает этот замок
    const slider = read('app/TabSlider.tsx');
    expect((slider.match(/if \(tabSwipeLocked\.value\) return;/g) ?? []).length).toBeGreaterThanOrEqual(2);
  });
});
