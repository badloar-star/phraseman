import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import V2Pressable from '../../v2/V2Pressable';
import { V2, V2_TYPE } from '../../../constants/v2Style';
import { useV2Palette } from '../../v2/useV2Palette';
import { V2GlassSheen, V2IconTile, useV2GlassStyle } from '../../v2/V2Glass';
import type { HomeFeatureTile } from './home_v2_types';

/**
 * Три плитки новой Главной (референс 2.0): Уроки / Диалоги / Карточки.
 * Сверху место под арт (заглушка до ассета от Codex), ниже название, под ним
 * подпись в две строки и круглая стрелка справа внизу.
 */
export default function HomeV2FeatureTiles({ tiles }: { tiles: readonly HomeFeatureTile[] }) {
  const p = useV2Palette();
  const glass = useV2GlassStyle();
  return (
    <View testID="home-v2-feature-tiles" style={s.row}>
      {tiles.map((tile, index) => (
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
          <V2GlassSheen seed={index + 2} />
          <View pointerEvents="none" style={[s.art, { backgroundColor: p.glassRaised }]} />
          <Text numberOfLines={1} style={[s.title, { color: p.text }]}>{tile.title}</Text>
          <View style={s.footer}>
            <Text numberOfLines={2} style={[s.subtitle, { color: p.textSecondary }]}>{tile.subtitle}</Text>
            <View style={[s.arrow, { backgroundColor: p.glassRaised, borderColor: p.stroke }]}>
              <Ionicons name="chevron-forward" size={16} color={p.text} />
            </View>
          </View>
        </V2Pressable>
      ))}
    </View>
  );
}

const s = StyleSheet.create({
  row: { flexDirection: 'row', gap: V2.gapTight },
  tileSlot: { flex: 1 },
  tile: {
    flex: 1,
    minHeight: 156,
    borderRadius: V2.radius.tile,
    borderWidth: StyleSheet.hairlineWidth, // guard-ok: D43
    paddingHorizontal: 10,
    paddingBottom: 10,
    overflow: 'hidden',
  },
  art: { height: 76, marginHorizontal: -10, marginBottom: 10, opacity: 0.85 },
  title: { ...V2_TYPE.headline },
  footer: { flexDirection: 'row', alignItems: 'flex-end', gap: 4, marginTop: 4 },
  subtitle: { ...V2_TYPE.caption, fontSize: 12, lineHeight: 16, flex: 1 },
  arrow: { width: 26, height: 26, borderRadius: 13, borderWidth: StyleSheet.hairlineWidth, alignItems: 'center', justifyContent: 'center', marginRight: -2 }, // guard-ok: D43
});
