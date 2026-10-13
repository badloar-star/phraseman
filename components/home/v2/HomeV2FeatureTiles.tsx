import React, { memo, useCallback, useRef } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { ThemedArtLayers } from '../../theme/ThemedArtLayers';
import V2Pressable from '../../v2/V2Pressable';
import { V2, V2_TYPE } from '../../../constants/v2Style';
import { useV2Palette } from '../../v2/useV2Palette';
import { useHomePlateStyle } from './homePlate';
import type { HomeFeatureTile } from './home_v2_types';

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
type TilesViewProps = Readonly<{ tiles: readonly HomeFeatureTile[]; pressRef: React.MutableRefObject<readonly HomeFeatureTile[]> }>;

function sameTileData(a: readonly HomeFeatureTile[], b: readonly HomeFeatureTile[]): boolean {
  if (a.length !== b.length) return false;
  return a.every((tile, i) => {
    const other = b[i];
    return tile.key === other.key && tile.title === other.title && tile.subtitle === other.subtitle && tile.art === other.art && tile.artAccent === other.artAccent;
  });
}

let wrapperRenders = 0;
let viewRenders = 0;

export default function HomeV2FeatureTiles({ tiles }: { tiles: readonly HomeFeatureTile[] }) {
  const pressRef = useRef<readonly HomeFeatureTile[]>(tiles);
  pressRef.current = tiles;
  if (__DEV__) {
    wrapperRenders += 1;
    console.log('[HOME-RENDER] tiles wrapper', JSON.stringify({ wrapperRenders, viewRenders, keys: tiles.map((tile) => tile.key) })); // guard-ok: счётчик рендеров плиток, только dev
  }
  return <HomeV2FeatureTilesView tiles={tiles} pressRef={pressRef} />;
}

const HomeV2FeatureTilesView = memo(function HomeV2FeatureTilesView({ tiles, pressRef }: TilesViewProps) {
  const p = useV2Palette();
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
  const glass = useHomePlateStyle(); // зачем: приказ владельца 11.10 19:2x — плашки Главной с фоном 50 % (альфа цвета фона), без блика/дымки; общий хук стекла остальных экранов не менялся
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
          <Text style={[s.title, { color: p.text }]}>{tile.title}</Text>
        </V2Pressable>
      ))}
    </View>
  );
}, (prev, next) => prev.pressRef === next.pressRef && sameTileData(prev.tiles, next.tiles));

const s = StyleSheet.create({
  // зачем («Тень» 12.10): между плашками ≥ 10, иначе тени слипаются
  row: { flexDirection: 'row', gap: 10 },
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
});
