// ═════════════════════════════════════════════════════════════════════
// V2PillSwitch.tsx — переключатель-«таблетка» с равными ячейками (макеты dialogs-hub-v4 `.dv-sw` и words-lesson-course `.wd-sw`).
//
// зачем (владелец 22.10 «Да, переносить»): один вид переключателя вместо чипов и самодельных сегментов — таблетка 48, радиус 24, поля 4, ячейки 40 / радиус 20; выбранная заливается цветом текста темы, подпись инвертируется.
// Цвета — токены текущей темы (useLv2Glass), нажатие — V2Pressable, переключение — локальное состояние вызывающего экрана (мгновенно, без сети). Тап по выбранной ячейке ничего не делает.
// ═════════════════════════════════════════════════════════════════════
import React, { memo, useEffect, useRef, useState } from 'react';
import { Animated, Easing, StyleSheet, Text, View } from 'react-native';

import { useLv2Glass } from '../learning-v2/LearningV2Glass';
import V2Pressable from './V2Pressable';
import { useReduceMotion } from '../../hooks/use_reduce_motion';

const PAD = 4;
const GAP = 2;
const SLIDE_MS = 220;

export type V2PillSwitchCell = Readonly<{ id: string; label: string }>;

type Props = Readonly<{
  cells: readonly V2PillSwitchCell[];
  selected: string;
  onSelect: (id: string) => void;
  testID?: string;
}>;

function V2PillSwitch({ cells, selected, onSelect, testID }: Props) {
  const g = useLv2Glass();
  const reduceMotion = useReduceMotion();
  const [trackW, setTrackW] = useState(0);
  const index = Math.max(0, cells.findIndex((c) => c.id === selected));
  const cellW = cells.length > 0 && trackW > 0 ? (trackW - PAD * 2 - GAP * (cells.length - 1)) / cells.length : 0;
  const x = useRef(new Animated.Value(0)).current;
  const placed = useRef(false);
  // зачем (владелец 04.11, волна 1): выбранная ячейка — скользящая пластина (transform, нативный драйвер), а не мгновенная перекраска; при «Уменьшить движение» и на первом кадре — без скольжения
  useEffect(() => {
    if (cellW <= 0) return;
    const to = index * (cellW + GAP);
    if (!placed.current || reduceMotion) { x.setValue(to); placed.current = true; return; }
    Animated.timing(x, { toValue: to, duration: SLIDE_MS, easing: Easing.bezier(0.2, 1, 0.3, 1), useNativeDriver: true }).start();
  }, [cellW, index, reduceMotion, x]);
  return (
    <View testID={testID} accessibilityRole="tablist" onLayout={(e) => setTrackW(Math.round(e.nativeEvent.layout.width))} style={[styles.track, { backgroundColor: g.opaqueControl }]}>
      {cellW > 0 ? <Animated.View pointerEvents="none" testID={testID ? `${testID}-plate` : undefined} style={[styles.plate, { width: cellW, backgroundColor: g.text, transform: [{ translateX: x }] }]} /> : null}
      {cells.map((cell) => {
        const on = cell.id === selected;
        return (
          <V2Pressable
            key={cell.id}
            testID={testID ? `${testID}-${cell.id}` : undefined}
            accessibilityRole="tab"
            accessibilityState={{ selected: on }}
            accessibilityLabel={cell.label}
            onPress={() => { if (!on) onSelect(cell.id); }}
            outerStyle={styles.outer}
            scaleTo={0.97}
            style={[styles.cell, cellW > 0 ? null : { backgroundColor: on ? g.text : 'transparent' }]}
          >
            <Text style={[styles.text, { color: on ? g.bg : g.secondary }]} numberOfLines={1} maxFontSizeMultiplier={1.2}>{cell.label}</Text>
          </V2Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  track: { height: 48, borderRadius: 24, padding: 4, flexDirection: 'row', gap: 2 },
  outer: { flex: 1 },
  plate: { position: 'absolute', left: PAD, top: PAD, height: 40, borderRadius: 20 },
  cell: { height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 8 },
  text: { fontSize: 13, lineHeight: 17, fontWeight: '700' },
});

export default memo(V2PillSwitch);
