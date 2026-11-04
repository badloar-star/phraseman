// PeakFloorStepper — стрелки «этаж ниже / выше» с тап-целью ≥44 dp. Подпись этажа даёт родитель (label).
// зачем (координатор 04.11): тап-цель этажа ≥44 dp для обоих вариантов экрана; границы 1..15 держит родитель через canDown/canUp.
import React, { memo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useSpirePalette } from '../useSpirePalette';
import V2Pressable from '../../v2/V2Pressable';

import { PEAK_TAP_TARGET } from './peak_text';

type Props = Readonly<{ label: string; canDown: boolean; canUp: boolean; onDown: () => void; onUp: () => void; downLabel: string; upLabel: string }>;

function PeakFloorStepper({ label, canDown, canUp, onDown, onUp, downLabel, upLabel }: Props) {
  const p = useSpirePalette();
  return (
    <View style={s.row} testID="peak-floor-stepper">
      <V2Pressable accessibilityRole="button" accessibilityLabel={downLabel} disabled={!canDown} onPress={onDown} style={[s.btn, { backgroundColor: p.cardRaised, opacity: canDown ? 1 : 0.4 }]} testID="peak-floor-down">
        <Ionicons name="chevron-down" size={22} color={p.text} />
      </V2Pressable>
      <Text style={[s.label, { color: p.text }]}>{label}</Text>
      <V2Pressable accessibilityRole="button" accessibilityLabel={upLabel} disabled={!canUp} onPress={onUp} style={[s.btn, { backgroundColor: p.cardRaised, opacity: canUp ? 1 : 0.4 }]} testID="peak-floor-up">
        <Ionicons name="chevron-up" size={22} color={p.text} />
      </V2Pressable>
    </View>
  );
}

const s = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  btn: { width: PEAK_TAP_TARGET, height: PEAK_TAP_TARGET, borderRadius: PEAK_TAP_TARGET / 2, alignItems: 'center', justifyContent: 'center' },
  label: { minWidth: 72, textAlign: 'center', fontSize: 17, fontWeight: '700' },
});

export default memo(PeakFloorStepper);
