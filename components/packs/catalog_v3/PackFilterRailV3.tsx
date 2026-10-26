// ═══════════════════════════════════════════════════════════════════════════
// PackFilterRailV3.tsx — фильтр каталога: одна стеклянная дорожка и скользящая «шайба» вместо двух плоских чипов «Популярные / Новые».
//
// зачем (слово владельца 26.10: «фильтры вместо Популярные / Новые — компактно и удобно, по-игровому»): два режима в одной дорожке высотой 44 (минимум зоны
// нажатия), выбранный отмечен светлой шайбой, которая переезжает за 220 мс кривой шторки (cubic-bezier(.2,1,.3,1), как у kit), значок + слово. Без
// обводок: шайба — блик и тень. Смена режима — мгновенная (клиентская сортировка над одним списком), хаптик — на нажатие, не на плитки. reduceMotion — без переезда.
// ═══════════════════════════════════════════════════════════════════════════
import Ionicons from '@expo/vector-icons/Ionicons';
import React, { memo, useEffect, useMemo, useRef } from 'react';
import { Animated, Easing, StyleSheet, Text, View } from 'react-native';

import type { Lang } from '../../../constants/i18n';
import { hapticTap } from '../../../hooks/use-haptics';
import { useReduceMotion } from '../../../hooks/use_reduce_motion';
import { useScaledTextStyles } from '../../../hooks/useLineScale';
import { communitySortLabel } from '../../../app/community_packs/communityCatalogFilter';
import { SPIRE_SCENE_INK } from '../../spire/scene/spire_scene_palette';
import { colorWithAlpha } from '../../v2/plateAlpha';
import V2Pressable from '../../v2/V2Pressable';

export type PackFilterId = 'popular' | 'new';

const TEXT_MAX_SCALE = 1.3;
const RAIL_H = 44;
const THUMB_INSET = 4;
const MOVE_MS = 220;
const SEGMENTS: readonly Readonly<{ id: PackFilterId; icon: 'flame' | 'sparkles' }>[] = [
  { id: 'popular', icon: 'flame' },
  { id: 'new', icon: 'sparkles' },
];

const TRACK = colorWithAlpha(SPIRE_SCENE_INK.text, 0.1);
const THUMB = colorWithAlpha(SPIRE_SCENE_INK.text, 0.26);
const THUMB_EDGE = colorWithAlpha(SPIRE_SCENE_INK.text, 0.42);
const THUMB_SHADOW = colorWithAlpha(SPIRE_SCENE_INK.blockShadow, 0.3);

type Props = Readonly<{
  lang: Lang;
  value: PackFilterId;
  width: number;
  onChange: (next: PackFilterId) => void;
}>;

function PackFilterRailV3({ lang, value, width, onChange }: Props) {
  const ts = useScaledTextStyles(s, TEXT_MAX_SCALE);
  const reduceMotion = useReduceMotion();
  const segmentW = width / SEGMENTS.length;
  const index = Math.max(0, SEGMENTS.findIndex((segment) => segment.id === value));
  const x = useRef(new Animated.Value(index * segmentW)).current;
  useEffect(() => {
    const to = index * segmentW;
    if (reduceMotion) { x.setValue(to); return undefined; }
    const anim = Animated.timing(x, { toValue: to, duration: MOVE_MS, easing: Easing.bezier(0.2, 1, 0.3, 1), useNativeDriver: true });
    anim.start();
    return () => anim.stop();
  }, [index, segmentW, reduceMotion, x]);
  const thumbStyle = useMemo(() => [s.thumb, { width: segmentW - THUMB_INSET * 2, transform: [{ translateX: x }] }], [segmentW, x]);
  return (
    <View testID="packs-v3-filter" accessibilityRole="tablist" style={[s.rail, { width }]}>
      <Animated.View pointerEvents="none" style={thumbStyle} />
      {SEGMENTS.map((segment) => {
        const active = segment.id === value;
        return (
          <V2Pressable
            key={segment.id}
            testID={`packs-v3-filter-${segment.id}`}
            accessibilityRole="tab"
            accessibilityState={{ selected: active }}
            withHaptic={false}
            scaleTo={0.97}
            outerStyle={{ width: segmentW, height: RAIL_H }}
            style={s.segment}
            onPress={() => { if (!active) { void hapticTap(); onChange(segment.id); } }}
          >
            <Ionicons name={segment.icon} size={16} color={active ? SPIRE_SCENE_INK.text : SPIRE_SCENE_INK.muted} />
            <Text style={[ts.label, { color: active ? SPIRE_SCENE_INK.text : SPIRE_SCENE_INK.muted }]} numberOfLines={1} maxFontSizeMultiplier={TEXT_MAX_SCALE}>{communitySortLabel(segment.id, lang)}</Text>
          </V2Pressable>
        );
      })}
    </View>
  );
}

export default memo(PackFilterRailV3);

const s = StyleSheet.create({
  rail: { height: RAIL_H, borderRadius: RAIL_H / 2, backgroundColor: TRACK, flexDirection: 'row', alignItems: 'center' },
  thumb: {
    position: 'absolute',
    left: THUMB_INSET,
    top: THUMB_INSET,
    height: RAIL_H - THUMB_INSET * 2,
    borderRadius: (RAIL_H - THUMB_INSET * 2) / 2,
    backgroundColor: THUMB,
    boxShadow: [
      { offsetX: 0, offsetY: 1, blurRadius: 0, spreadDistance: 0, color: THUMB_EDGE, inset: true },
      { offsetX: 0, offsetY: 4, blurRadius: 10, spreadDistance: -3, color: THUMB_SHADOW },
    ],
  },
  segment: { flex: 1, height: RAIL_H, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
  label: { fontSize: 13, lineHeight: 18, fontWeight: '700' },
});
