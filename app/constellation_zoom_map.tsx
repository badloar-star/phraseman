// ════════════════════════════════════════════════════════════════════════════
// constellation_zoom_map.tsx — зумируемая/панорамируемая обёртка карты (2.5).
//
// Оборачивает ConstellationSkyMap в Pinch+Pan (Gesture.Simultaneous) на
// reanimated worklets — карта не перерисовывается на кадр (жест двигает только
// transform контейнера, цель F9). Кнопки ＋/－/центр дублируют жест для тех, кто
// не знает про pinch. Тап по звезде проходит сквозь (onStarPress) — жесты
// одновременны с нажатием благодаря Gesture.Simultaneous + быстрым порогам.
//
// Performance Bible: НИКАКИХ бесконечных анимаций тут — только жест-driven
// transform и разовые withTiming для кнопок. Ничего не крутится в фоне.
// ════════════════════════════════════════════════════════════════════════════

import { Ionicons } from '@expo/vector-icons';
import React, { memo, useCallback } from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { ConstellationSkyMap, type SkyMapProps } from './constellation_sky_map';

const MIN_SCALE = 0.7;
const MAX_SCALE = 2.4;
const PAN_LIMIT = 260; // насколько далеко можно утащить карту (px)

function clamp(v: number, lo: number, hi: number): number {
  'worklet';
  return Math.min(hi, Math.max(lo, v));
}

function ConstellationZoomMapInner(props: SkyMapProps) {
  const scale = useSharedValue(1);
  const savedScale = useSharedValue(1);
  const tx = useSharedValue(0);
  const ty = useSharedValue(0);
  const savedTx = useSharedValue(0);
  const savedTy = useSharedValue(0);

  const pinch = Gesture.Pinch()
    .onUpdate((e) => {
      scale.value = clamp(savedScale.value * e.scale, MIN_SCALE, MAX_SCALE);
    })
    .onEnd(() => {
      savedScale.value = scale.value;
    });

  const pan = Gesture.Pan()
    .minDistance(6)
    .onUpdate((e) => {
      tx.value = clamp(savedTx.value + e.translationX, -PAN_LIMIT, PAN_LIMIT);
      ty.value = clamp(savedTy.value + e.translationY, -PAN_LIMIT, PAN_LIMIT);
    })
    .onEnd(() => {
      savedTx.value = tx.value;
      savedTy.value = ty.value;
    });

  const composed = Gesture.Simultaneous(pinch, pan);

  const animStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: tx.value },
      { translateY: ty.value },
      { scale: scale.value },
    ],
  }));

  const applyScale = useCallback((delta: number) => {
    const next = clamp(savedScale.value + delta, MIN_SCALE, MAX_SCALE);
    scale.value = withTiming(next, { duration: 160 });
    savedScale.value = next;
  }, [scale, savedScale]);

  const recenter = useCallback(() => {
    scale.value = withTiming(1, { duration: 200 });
    tx.value = withTiming(0, { duration: 200 });
    ty.value = withTiming(0, { duration: 200 });
    savedScale.value = 1;
    savedTx.value = 0;
    savedTy.value = 0;
  }, [scale, tx, ty, savedScale, savedTx, savedTy]);

  return (
    <View style={styles.root}>
      <GestureDetector gesture={composed}>
        <Animated.View style={[styles.mapWrap, animStyle]}>
          <ConstellationSkyMap {...props} />
        </Animated.View>
      </GestureDetector>

      <View style={styles.zoomCtl} pointerEvents="box-none">
        <TouchableOpacity
          testID="constellation-zoom-in"
          style={styles.zbtn}
          onPress={() => applyScale(0.4)}
          hitSlop={8}
        >
          <Ionicons name="add" size={20} color="#93A3CB" />
        </TouchableOpacity>
        <TouchableOpacity
          testID="constellation-zoom-out"
          style={styles.zbtn}
          onPress={() => applyScale(-0.4)}
          hitSlop={8}
        >
          <Ionicons name="remove" size={20} color="#93A3CB" />
        </TouchableOpacity>
        <TouchableOpacity
          testID="constellation-zoom-center"
          style={styles.zbtn}
          onPress={recenter}
          hitSlop={8}
        >
          <Ionicons name="scan-outline" size={17} color="#93A3CB" />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, overflow: 'hidden' },
  mapWrap: { flex: 1 },
  zoomCtl: {
    position: 'absolute',
    right: 8,
    top: 8, // верх карты — не перекрывает квиз/шторку снизу (баг «точки внизу»)
    gap: 7,
  },
  zbtn: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(12,18,44,0.86)',
  },
});

// memo: карта тяжёлая (37 SVG-гексов). Родитель тикает nowSec каждую секунду —
// без memo карта перерисовывалась бы каждую секунду (главный источник лагов).
// Пропсы стабилизированы в родителе (onStarPress через ref).
export const ConstellationZoomMap = memo(ConstellationZoomMapInner);
