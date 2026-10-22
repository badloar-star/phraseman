import React, { memo, useCallback, useEffect, useRef } from 'react';
import { PixelRatio, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
// зачем (координатор 08:01): лента — ScrollView из gesture-handler, чтобы её жест жил в одной арене с пейджером вкладок (TabSlider) и не отдавался ему
import { ScrollView as GestureScrollView } from 'react-native-gesture-handler';
import { useRibbonTabLock } from './use_ribbon_tab_lock';
import type { LayoutChangeEvent, TextLayoutEvent } from 'react-native';
import { ThemedArtLayers } from '../../theme/ThemedArtLayers';
import V2Pressable from '../../v2/V2Pressable';
import { V2, V2_TYPE } from '../../../constants/v2Style';
import { useV2Palette } from '../../v2/useV2Palette';
import { useHomePlateStyle } from './homePlate';
import type { HomeFeatureTile } from './home_v2_types';
import { renderWindowEpoch, useRenderCause } from '../../../app/render_cause_probe';
import { plateBoxShadow, useShadowGlass } from '../../v2/ShadowSurface';
import { useSpireHomePlace } from '../../../app/spire/spire_home_place';
// зачем (координатор 18.10): подпись бейджа — из лёгкого модуля, а не из components/spire/moments (сторож запрещает; модуль моментов не нужен в холодном старте Главной)
import { spirePlaceBadgeText } from './home_spire_place_badge';
import type { Lang } from '../../../constants/i18n';

/**
 * Три плитки новой Главной (референс 2.0): Уроки / Диалоги / Карточки.
 * зачем (владелец 04.10, по скриншоту: «убери подтексты, убери стрелочки и сделай их
 * не высокими, а равными, как квадраты»): плитка — квадрат, в ней только предмет и
 * название. Подпись осталась в данных — её читает экранный диктор.
 */

/**
 * зачем (аудит скорости Авторизации 13.10, п.2; координатор: «сперва лог [HOME-RENDER], потом memo»): Главная — один компонент с ~100 useState, каждый setState
 * пересобирает плитки: новый массив, новые onPress-замыкания, новые объекты арта — и дети перерисовывались впустую. Здесь плитки разделены на тонкую обёртку
 * (рендерится с родителем, только кладёт свежие tiles в ref) и memo-вид, который сравнивает ДАННЫЕ плитки (ключ, тексты, арт) и не смотрит на onPress:
 * тап зовёт самый свежий onPress из ref, поэтому устаревших замыканий нет. Счётчики [HOME-RENDER] tiles — только dev, снять после проверки Сверкой.
 */
type TilesViewProps = Readonly<{ tiles: readonly HomeFeatureTile[]; pressRef: React.MutableRefObject<readonly HomeFeatureTile[]>; spireLang: string | null; uiLang: Lang; row: boolean }>;

function sameTileData(a: readonly HomeFeatureTile[], b: readonly HomeFeatureTile[]): boolean {
  if (a.length !== b.length) return false;
  return a.every((tile, i) => {
    const other = b[i];
    return tile.key === other.key && tile.title === other.title && tile.subtitle === other.subtitle && tile.art === other.art && tile.artAccent === other.artAccent;
  });
}

let wrapperRenders = 0;
let viewRenders = 0;
let lastTilesLog = '';

export default function HomeV2FeatureTiles({ tiles, reason, spireLang = null, uiLang = 'en', row = false }: { tiles: readonly HomeFeatureTile[]; reason?: string; spireLang?: string | null; uiLang?: Lang; row?: boolean }) {
  useRenderCause('home:tiles', () => ({ tiles }), renderWindowEpoch()); // зачем (координатор 15.10): причина каждой перерисовки в окне 10 с, [HOME-RENDERS]; в релизе пустая функция
  const pressRef = useRef<readonly HomeFeatureTile[]>(tiles);
  pressRef.current = tiles;
  // [HOME-TILES] — набор плиток и почему он такой (4 с Пиком или 3); строка только при смене, не на каждую перерисовку Главной.
  const tilesLog = `${tiles.map((tile) => tile.key).join(',')}|${reason ?? 'none'}`;
  if (tilesLog !== lastTilesLog) {
    lastTilesLog = tilesLog;
    console.log('[HOME-TILES]', JSON.stringify({ keys: tiles.map((tile) => tile.key), count: tiles.length, reason: reason ?? null })); // guard-ok: строка на смену набора плиток
  }
  if (__DEV__) {
    wrapperRenders += 1;
    console.log('[HOME-RENDER] tiles wrapper', JSON.stringify({ wrapperRenders, viewRenders, keys: tiles.map((tile) => tile.key) })); // guard-ok: счётчик рендеров плиток, только dev
  }
  return <HomeV2FeatureTilesView tiles={tiles} pressRef={pressRef} spireLang={spireLang} uiLang={uiLang} row={row} />;
}

const HomeV2FeatureTilesView = memo(function HomeV2FeatureTilesView({ tiles, pressRef, spireLang, uiLang, row }: TilesViewProps) {
  const p = useV2Palette();
  const g = useShadowGlass(); // зачем (Темы 17.10): заливка бейджа — ctaFill/ctaFillInk, сырой accent на светлых темах сливается с фоном
  const spirePlace = useSpireHomePlace(tiles.length === 4 ? spireLang : null); // только из копии на устройстве, без сети
  const press = useCallback((key: HomeFeatureTile['key']) => {
    const current = pressRef.current.find((tile) => tile.key === key);
    if (!current) {
      console.warn('[HOME-RENDER] tiles press:ignored', JSON.stringify({ key, reason: 'tile_missing_in_latest' })); // guard-ok: ранний выход логирует причину
      return;
    }
    current.onPress();
  }, [pressRef]);
  if (__DEV__) {
    viewRenders += 1;
    console.log('[HOME-RENDER] tiles view', JSON.stringify({ wrapperRenders, viewRenders })); // guard-ok: счётчик рендеров плиток, только dev
  }
  // зачем (слово владельца 18.10: «Пик оставляем, но показываем только три штуки в старом размере, как было, а остальные дальше — горизонтальный скролл»): при 4 плитках видны три плитки прежней ширины
  // (как было при трёх), четвёртая (Пик) — за краем, прокрутка вбок. Ширина считается от окна, а не от замера: первый кадр = финальная геометрия.
  const { width: windowW } = useWindowDimensions();
  const ribbonLock = useRibbonTabLock('feature_tiles');
  const tileW = Math.floor((windowW - V2.screenPad * 2 - TILE_GAP * 2) / 3);
  const glass = useHomePlateStyle(); // зачем: приказ владельца 11.10 19:2x — плашки Главной с фоном 50 % (альфа цвета фона), без блика/дымки; общий хук стекла остальных экранов не менялся
  // зачем (владелец 22.10: «убери чёрную подсветку на горизонтальном скролле»): одна строка на показ ленты — чем закрыты края и какая тень у плашек
  useEffect(() => {
    if (tiles.length === 4) console.log('[HOME-RIBBON] edges', JSON.stringify({ fade: 'нет (владелец 22.10)', overScrollMode: 'never', plateShadow: glass.boxShadow ?? null })); // guard-ok: одна строка на показ ленты
  // eslint-disable-next-line react-hooks/exhaustive-deps -- зачем: строка на показ ленты, не на каждую смену темы
  }, [tiles.length]);
  // зачем (владелец 17.10, «Пик — кнопка-иконка»; эталон #four-tiles вариант (а)): 4 плитки — квадрат только с артом по центру, название ПОД плашкой.
  // На 360 dp внутри плашки ~72 dp название не помещается, а ужимать шрифт запрещено; длинное переносится, не обрезается.
  // зачем (владелец 22.10, вариант 2: «иконки Уроки, Карточки — вот так же, без скролла»): со «Сценой» четыре равные плитки одним рядом, все видны
  if (tiles.length === 4 && row) {
    return (
      <View testID="home-v2-feature-tiles" style={s.row}>
        {tiles.map((tile) => (
          <V2Pressable
            key={tile.key}
            testID={`home-quick-tile-${tile.key}`}
            accessibilityRole="button"
            accessibilityLabel={`${tile.title}. ${tile.subtitle}`}
            onPress={() => press(tile.key)}
            scaleTo={0.96}
            outerStyle={s.tileSlot}
            style={[s.sceneTile, { backgroundColor: g.opaqueCard, boxShadow: plateBoxShadow(g) }]}
          >
            {/* зачем (Сверка home4, scenes-compact `.tile`; координатор: «подпись ВНУТРИ плитки, без подписи снизу»): плитка — карточка r20, картинка 58 сверху, подпись 13/700 внутри; поля 6/4/10 */}
            <View pointerEvents="none" style={s.sceneArt}>
              <ThemedArtLayers source={tile.art} accent={tile.artAccent} style={s.sceneArtImage} />
              {tile.key === 'spire' && spirePlace !== null ? (
                <View style={[s.badge, { backgroundColor: g.ctaFill }]}>
                  <Text style={[s.badgeText, { color: g.ctaFillInk }]}>{spirePlaceBadgeText(uiLang, spirePlace)}</Text>
                </View>
              ) : null}
            </View>
            <Text style={[s.sceneTileTitle, { color: g.text }]} maxFontSizeMultiplier={1.05}>{tile.title}</Text>
          </V2Pressable>
        ))}
      </View>
    );
  }
  if (tiles.length === 4) {
    return (
      <View style={s.scroller}>
      <GestureScrollView
        testID="home-v2-feature-tiles"
        horizontal
        nestedScrollEnabled
        showsHorizontalScrollIndicator={false}
        overScrollMode="never"
        style={s.scrollerInner}
        contentContainerStyle={s.scrollRow}
        {...ribbonLock}
      >
        {tiles.map((tile) => (
          <V2Pressable
            key={tile.key}
            testID={`home-quick-tile-${tile.key}`}
            accessibilityRole="button"
            accessibilityLabel={`${tile.title}. ${tile.subtitle}`}
            onPress={() => press(tile.key)}
            scaleTo={0.96}
            outerStyle={[s.tileSlot, { width: tileW, flex: 0 }]}
          >
            <View pointerEvents="none">
              <View style={[s.iconPlate, glass]}>
                {/* зачем (владелец 18.10, снимок Главной: «1 место» вылезала за верх плитки и ScrollView её резал; арт Пика был не целиком): с плашкой арт ниже и меньше, чтобы плашка его не перекрывала */}
                <ThemedArtLayers source={tile.art} accent={tile.artAccent} style={tile.key === 'spire' && spirePlace !== null ? s.iconArtWithBadge : s.iconArt} />
                {/* зачем (координатор 17.10, вариант (в); владелец 18.10): место в лиге — бейдж ВНУТРИ плашки, в правом верхнем углу с отступом: за границу плитки ничего не выходит, резать нечего (overflow visible в ScrollView на Android не спасает) */}
                {tile.key === 'spire' && spirePlace !== null ? (
                  <View testID="home-quick-tile-spire-place" style={[s.badge, { backgroundColor: g.ctaFill }]}>
                    <Text style={[s.badgeText, { color: g.ctaFillInk }]}>{spirePlaceBadgeText(uiLang, spirePlace)}</Text>
                  </View>
                ) : null}
              </View>
            </View>
            {/* зачем: плитка 72 dp, подпись не должна ломаться при крупном шрифте; потолок роста кегля 1,05, не ужатие ([LABEL-FIT] 18.10, решение координатора) */}
            <Text style={[s.iconTitle, { color: p.text }]} maxFontSizeMultiplier={1.05} onLayout={(e) => logTileLabel('box', tile, uiLang, e)} onTextLayout={(e) => logTileLabel('lines', tile, uiLang, e)}>{tile.title}</Text>
          </V2Pressable>
        ))}
      </GestureScrollView>
      {/* зачем (владелец 22.10: «убери чёрную подсветку на горизонтальном скролле»): затухания у правого края больше нет — сплошной bg поверх
          полотна с пятнами давал тёмную полосу; что лента продолжается, видно по обрезанной четвёртой плитке */}
      </View>
    );
  }
  return (
    <View testID="home-v2-feature-tiles" style={s.row}>
      {tiles.map((tile) => (
        <V2Pressable
          key={tile.key}
          testID={`home-quick-tile-${tile.key}`}
          accessibilityRole="button"
          accessibilityLabel={`${tile.title}. ${tile.subtitle}`}
          onPress={() => press(tile.key)}
          scaleTo={0.96}
          outerStyle={s.tileSlot}
          style={[s.tile, glass]}
        >
          <View pointerEvents="none" style={s.art}>
            {/* зачем (координатор 15.10): основа + необязательный слой .accent в цвет темы (tile.artAccent из того же resolve); без слоя — один Image, как раньше */}
            <ThemedArtLayers source={tile.art} accent={tile.artAccent} style={s.artImage} />
          </View>
          {/* зачем (Сверка font13, home_es_13_light: на живом кадре при шрифте 1,3 «Lecciones» рвалось «Leccione/s» — боевая ветка плиток этот Text, а не iconTitle): потолок роста кегля 1,05 (16→16,8 dp, слово ≈81 из 87 dp), не ужатие; цифры — [TILE-LABEL] */}
          <Text style={[s.title, { color: p.text }]} maxFontSizeMultiplier={1.05} onLayout={(e) => logTileLabel('box', tile, uiLang, e)} onTextLayout={(e) => logTileLabel('lines', tile, uiLang, e)}>{tile.title}</Text>
        </V2Pressable>
      ))}
    </View>
  );
}, (prev, next) => prev.pressRef === next.pressRef && prev.spireLang === next.spireLang && prev.uiLang === next.uiLang && prev.row === next.row && sameTileData(prev.tiles, next.tiles));

// зачем (координатор 18.10, Сверка font13: на es при шрифте 1,3 «Lecciones» рвётся «Leccione/s»; правило «сперва логи»): фактическая ширина слова и плитки, fontScale,
// итоговый множитель, число строк — чтобы чинить по цифрам, а не по догадке. Снять после починки; [TILE-LABEL] — префикс для grep.
const TILE_LABEL_CAP = 1.05;
const tileLabelBox = new Map<string, number>();
function logTileLabel(kind: 'box' | 'lines', tile: HomeFeatureTile, lang: string, e: LayoutChangeEvent | TextLayoutEvent): void {
  try {
    if (kind === 'box') {
      const w = (e as LayoutChangeEvent).nativeEvent.layout.width;
      tileLabelBox.set(tile.key, w);
      console.log('[TILE-LABEL] box', JSON.stringify({ key: tile.key, lang, title: tile.title, boxWidth: Math.round(w * 10) / 10 }));
      return;
    }
    const lines = (e as TextLayoutEvent).nativeEvent.lines;
    const fontScale = PixelRatio.getFontScale();
    console.log('[TILE-LABEL] lines', JSON.stringify({
      key: tile.key, lang, title: tile.title, fontScale, effectiveMultiplier: Math.min(fontScale, TILE_LABEL_CAP),
      numberOfLines: lines.length, brokenMidWord: lines.length > 1 && !tile.title.includes(' '), lineTexts: lines.map((l) => l.text), lineWidths: lines.map((l) => Math.round(l.width * 10) / 10), boxWidth: tileLabelBox.get(tile.key) ?? null,
    }));
  } catch (err) {
    console.warn('[TILE-LABEL] log failed', String(err)); // зачем: даже диагностика не глотает причину молча
  }
}

const TILE_GAP = 10; // зачем: «Тень» 12.10 — между плашками ≥ 10, иначе тени слипаются

const s = StyleSheet.create({
  // зачем («Тень» 12.10): между плашками ≥ 10, иначе тени слипаются
  row: { flexDirection: 'row', gap: TILE_GAP },
  // горизонтальная лента: выходит за поля страницы (отрицательный margin) и возвращает их отступом внутри, чтобы плитки скроллились до края экрана
  scroller: { marginHorizontal: -V2.screenPad, flexGrow: 0 },
  scrollerInner: { flexGrow: 0 },
  scrollRow: { flexDirection: 'row', gap: TILE_GAP, paddingHorizontal: V2.screenPad },
  tileSlot: { flex: 1 },
  // Квадрат от ширины ячейки — первый кадр сразу финальной геометрии, без замеров.
  tile: {
    aspectRatio: 1,
    borderRadius: V2.radius.tile,
    paddingHorizontal: 10,
    paddingBottom: 10,
    overflow: 'hidden',
  },
  // Предмет занимает всё место над названием и прижат влево, как раньше.
  art: { flex: 1, marginHorizontal: -10, marginBottom: 4, paddingLeft: 10, paddingTop: 6, alignItems: 'flex-start', justifyContent: 'center' },
  artImage: { width: '86%', height: '100%', maxWidth: 84, maxHeight: 84 },
  title: { ...V2_TYPE.headline },
  // Вариант (а): плашка-иконка, арт по центру (башня Пика целиком в кадре), название под плашкой.
  // зачем (ратчет typography_two_sizes, D145; координатор 17.10): ниже заголовка допустимы только 16 и 13 — название 14→13, цифра места на бейдже 11→13 (бейдж на 2 dp выше, текст всё так же в одну строку).
  sceneTile: { borderRadius: 20, paddingTop: 6, paddingHorizontal: 4, paddingBottom: 10, alignItems: 'center' },
  sceneArt: { width: '100%', height: 58 },
  sceneArtImage: { width: '100%', height: '100%' },
  sceneTileTitle: { fontSize: 13, lineHeight: 17, fontWeight: '700', textAlign: 'center' },
  iconPlate: { aspectRatio: 1, borderRadius: V2.radius.tile, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  iconArt: { width: '74%', height: '74%' },
  // зачем (владелец 18.10): арт 60% и сдвиг вниз на 24% (процент от ширины квадратной плашки) — корона целиком под плашкой места, верх плашки свободен
  iconArtWithBadge: { width: '60%', height: '60%', marginTop: '24%' },
  iconTitle: { marginTop: 8, fontSize: 13, lineHeight: 17, fontWeight: '700', textAlign: 'center' },
  // бейдж внутри угла плашки с отступом 4 dp, растёт влево на длинных языках
  badge: { position: 'absolute', top: 4, right: 4, minHeight: 22, paddingHorizontal: 7, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  badgeText: { fontSize: 13, lineHeight: 17, fontWeight: '700', fontVariant: ['tabular-nums'] },
});
