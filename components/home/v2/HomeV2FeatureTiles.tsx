import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';
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
export default function HomeV2FeatureTiles({ tiles }: { tiles: readonly HomeFeatureTile[] }) {
  const p = useV2Palette();
  const glass = useHomePlateStyle(); // зачем: приказ владельца 11.10 19:2x — плашки Главной с фоном 50 % (альфа цвета фона), без блика/дымки; общий хук стекла остальных экранов не менялся
  return (
    <View testID="home-v2-feature-tiles" style={s.row}>
      {tiles.map((tile) => (
        <V2Pressable
          key={tile.key}
          testID={`home-quick-tile-${tile.key}`}
          accessibilityRole="button"
          accessibilityLabel={`${tile.title}. ${tile.subtitle}`}
          onPress={tile.onPress}
          scaleTo={0.96}
          outerStyle={s.tileSlot}
          style={[s.tile, glass]}
        >
          <View pointerEvents="none" style={s.art}>
            <Image source={tile.art} style={s.artImage} contentFit="contain" accessible={false} /* guard-ok: декоративный арт, подпись на V2Pressable */ />
          </View>
          <Text style={[s.title, { color: p.text }]}>{tile.title}</Text>
        </V2Pressable>
      ))}
    </View>
  );
}

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
