import React, { useEffect, useRef, useState } from 'react';
import { Animated, Pressable, StyleSheet, Text, View, type LayoutChangeEvent } from 'react-native';
import { hapticTap } from '../../hooks/use-haptics';
import { useReduceMotion } from '../../hooks/use_reduce_motion';
import { V2, V2_TYPE } from '../../constants/v2Style';
import { useV2Palette } from './useV2Palette';
import { V2GlassSheen, useV2GlassStyle } from './V2Glass';
import { nestedBoxShadow, useShadowGlass } from './ShadowSurface';

export type V2Segment<K extends string> = Readonly<{ key: K; label: string }>;

type Props<K extends string> = {
  segments: readonly V2Segment<K>[];
  value: K;
  onChange: (key: K) => void;
  testID?: string;
};

/**
 * Переключатель разделов нового стиля (капсула на графите, выбранный сегмент —
 * светлая «таблетка»). Подложка едет на нативном драйвере, смена мгновенная:
 * раздел меняется на onPress, анимация только догоняет.
 */
export default function V2SegmentedControl<K extends string>({ segments, value, onChange, testID }: Props<K>) {
  const p = useV2Palette();
  const glass = useV2GlassStyle();
  const g = useShadowGlass();
  const reduceMotion = useReduceMotion();
  const [width, setWidth] = useState(0);
  const index = Math.max(0, segments.findIndex((s) => s.key === value));
  const anim = useRef(new Animated.Value(index)).current;

  useEffect(() => {
    if (reduceMotion) { anim.setValue(index); return; }
    Animated.spring(anim, { toValue: index, stiffness: 420, damping: 36, mass: 0.9, useNativeDriver: true }).start();
  }, [anim, index, reduceMotion]);

  const segmentWidth = width > 0 ? (width - PAD * 2) / segments.length : 0;
  const onLayout = (e: LayoutChangeEvent) => setWidth(e.nativeEvent.layout.width);

  return (
    <View
      testID={testID}
      accessibilityRole="tablist"
      onLayout={onLayout}
      style={[s.track, glass]}
    >
      <V2GlassSheen />
      {segmentWidth > 0 ? (
        <Animated.View
          pointerEvents="none"
          style={[
            s.thumb,
            {
              width: segmentWidth,
              // зачем (владелец 12.10, стиль «Тень»): выбранный сегмент — приподнятая плашка (заливка raised + малая тень), без кольца.
              backgroundColor: g.raisedFillFrom,
              boxShadow: nestedBoxShadow(g),
              transform: [{
                translateX: anim.interpolate({
                  inputRange: segments.map((_, i) => i),
                  outputRange: segments.map((_, i) => i * segmentWidth),
                  extrapolate: 'clamp',
                }),
              }],
            },
          ]}
        />
      ) : null}
      {segments.map((segment) => {
        const selected = segment.key === value;
        return (
          <Pressable
            key={segment.key}
            testID={testID ? `${testID}-${segment.key}` : undefined}
            accessibilityRole="tab"
            accessibilityState={{ selected }}
            onPressIn={() => { if (!selected) hapticTap(); }}
            onPress={() => { if (!selected) onChange(segment.key); }}
            style={s.segment}
          >
            <Text style={[s.label, { color: selected ? p.text : p.textSecondary }]}>
              {segment.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const PAD = 4;
const HEIGHT = 44;

const s = StyleSheet.create({
  track: {
    minHeight: HEIGHT, // зачем (text-integrity): длинная подпись de/fr переносится, а не режется

    borderRadius: V2.radius.control,
    flexDirection: 'row',
    padding: PAD,
  },
  thumb: {
    position: 'absolute',
    top: PAD,
    left: PAD,
    bottom: PAD,
    borderRadius: V2.radius.control,
  },
  segment: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 6, paddingVertical: 4 },
  label: { ...V2_TYPE.subtitle, fontWeight: '700', textAlign: 'center' },
});
