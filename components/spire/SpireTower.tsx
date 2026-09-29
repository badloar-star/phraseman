// ═══════════════════════════════════════════════════════════════════════════
// SpireTower.tsx — окно с башней: прокрутка к своему этажу, маркер игрока, доступность.
//
// зачем: макет держит башню в окне .tview 400px и выносит маркер вправо от своего
// этажа. Маркер здесь — обычный RN-слой поверх SVG (монета ранга — настоящая картинка
// аватара), его перелёт на этаж выше идёт на нативном драйвере, без покадровых setState.
// Если локальной недели нет, маркера нет вовсе — не выдумываем этаж.
// ═══════════════════════════════════════════════════════════════════════════
import React, { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Easing, ScrollView, StyleSheet, View, type LayoutChangeEvent } from 'react-native';
import AvatarView from '../AvatarView';
import type { Lang } from '../../constants/i18n';
import { useReduceMotion } from '../../hooks/use_reduce_motion';
import { useV2Palette } from '../v2/useV2Palette';
import SpireTowerSvg from './SpireTowerSvg';
import { spireText } from './spire_strings';
import { SPIRE_FLOOR_COUNT, SPIRE_TOWER_GEOM, SPIRE_TW, spireMarkerXY } from './spire_tower_model';

const WINDOW_HEIGHT = 400;
const MARKER_SIZE = 40;

type Props = Readonly<{
  lang: Lang;
  myFloor: number | null;
  selected: number;
  onSelect: (floor: number) => void;
  /** Ранг монеты игрока (0..19) из useMyCoinRank; null = нейтральный кружок. */
  myCoinRank: number | null;
}>;

function markerTarget(floor: number, scale: number): Readonly<{ x: number; y: number }> {
  const fl = SPIRE_TOWER_GEOM.floors[Math.min(Math.max(floor, 1), SPIRE_FLOOR_COUNT) - 1];
  const p = spireMarkerXY(fl);
  return { x: p.x * scale - MARKER_SIZE / 2, y: p.y * scale - MARKER_SIZE / 2 };
}

function SpireTower({ lang, myFloor, selected, onSelect, myCoinRank }: Props) {
  const p = useV2Palette();
  const reduceMotion = useReduceMotion();
  const scrollRef = useRef<ScrollView>(null);
  const [width, setWidth] = useState(0);
  const scale = width > 0 ? width / SPIRE_TW : 0;
  const tx = useRef(new Animated.Value(0)).current;
  const ty = useRef(new Animated.Value(0)).current;
  const placedRef = useRef(false);

  const onLayout = useCallback((e: LayoutChangeEvent) => {
    const next = Math.round(e.nativeEvent.layout.width);
    if (next > 0) setWidth((prev) => (prev === next ? prev : next));
  }, []);

  // Прокрутка к этажу: свой этаж по центру окна (как data-center в макете), иначе низ башни.
  const scrollToFloor = useCallback((floor: number | null, animated: boolean) => {
    if (scale <= 0) return;
    const fl = floor === null ? SPIRE_TOWER_GEOM.floors[0] : SPIRE_TOWER_GEOM.floors[Math.min(floor, SPIRE_FLOOR_COUNT) - 1];
    const cy = (fl.y + fl.h / 2) * scale;
    scrollRef.current?.scrollTo({ y: Math.max(0, cy - WINDOW_HEIGHT / 2), animated });
  }, [scale]);

  useEffect(() => {
    if (scale <= 0) return;
    if (myFloor === null) { placedRef.current = false; scrollToFloor(null, false); return; }
    const target = markerTarget(myFloor, scale);
    if (!placedRef.current || reduceMotion) {
      // Первый кадр и «уменьшить движение»: маркер сразу на месте.
      tx.setValue(target.x);
      ty.setValue(target.y);
      placedRef.current = true;
      scrollToFloor(myFloor, false);
      return;
    }
    // Подъём на этаж выше: перелёт на нативном драйвере, окно догоняет.
    Animated.parallel([
      Animated.timing(tx, { toValue: target.x, duration: 900, easing: Easing.bezier(0.2, 0.9, 0.2, 1), useNativeDriver: true }),
      Animated.timing(ty, { toValue: target.y, duration: 900, easing: Easing.bezier(0.2, 0.9, 0.2, 1), useNativeDriver: true }),
    ]).start();
    scrollToFloor(myFloor, true);
  }, [myFloor, scale, reduceMotion, tx, ty, scrollToFloor]);

  const label = useMemo(
    () => `${spireText(lang, 'floor')} ${selected}`,
    [lang, selected],
  );

  // зачем: SVG-этажи не читаются скринридером — башня целиком одна «регулируемая» область,
  // свайп вверх/вниз меняет выбранный этаж, карточка под башней озвучивает его.
  const onA11yAction = useCallback((e: { nativeEvent: { actionName: string } }) => {
    if (e.nativeEvent.actionName === 'increment') onSelect(Math.min(SPIRE_FLOOR_COUNT, selected + 1));
    if (e.nativeEvent.actionName === 'decrement') onSelect(Math.max(1, selected - 1));
  }, [onSelect, selected]);

  return (
    <View
      style={[s.window, { backgroundColor: '#131315', borderColor: p.hairline }]}
      onLayout={onLayout}
      accessible
      accessibilityRole="adjustable"
      accessibilityLabel={`${spireText(lang, 'title')}. ${label}`}
      accessibilityValue={{ min: 1, max: SPIRE_FLOOR_COUNT, now: selected }}
      accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
      onAccessibilityAction={onA11yAction}
      testID="spire-tower"
    >
      <ScrollView ref={scrollRef} showsVerticalScrollIndicator={false} nestedScrollEnabled bounces={false}>
        {width > 0 ? (
          <View style={{ width, height: SPIRE_TOWER_GEOM.height * scale }}>
            <SpireTowerSvg lang={lang} myFloor={myFloor} selected={selected} onSelect={onSelect} width={width} />
            {myFloor !== null ? (
              <Animated.View pointerEvents="none" style={[s.marker, { transform: [{ translateX: tx }, { translateY: ty }] }]}>
                <View style={s.markerGlow} />
                <View style={s.markerRing}>
                  <View style={s.markerInner}>
                    {myCoinRank !== null ? <AvatarView avatar="" coinRank={myCoinRank} size={MARKER_SIZE - 6} /> : null}
                  </View>
                </View>
              </Animated.View>
            ) : null}
          </View>
        ) : null}
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  // Тонкая (1px) полупрозрачная кромка окна, как .tview в макете; толстых рамок нет.
  window: { height: WINDOW_HEIGHT, borderRadius: 22, overflow: 'hidden', borderWidth: 1 },
  marker: { position: 'absolute', left: 0, top: 0, width: MARKER_SIZE, height: MARKER_SIZE, alignItems: 'center', justifyContent: 'center' },
  markerGlow: { position: 'absolute', width: MARKER_SIZE + 24, height: MARKER_SIZE + 24, borderRadius: (MARKER_SIZE + 24) / 2, backgroundColor: 'rgba(255,255,255,0.12)' },
  markerRing: { width: MARKER_SIZE, height: MARKER_SIZE, borderRadius: MARKER_SIZE / 2, backgroundColor: '#F2F1F6', alignItems: 'center', justifyContent: 'center' },
  markerInner: { width: MARKER_SIZE - 4, height: MARKER_SIZE - 4, borderRadius: (MARKER_SIZE - 4) / 2, backgroundColor: '#0C0C0D', alignItems: 'center', justifyContent: 'center' },
});

export default memo(SpireTower);
