// PeakStepChips — выбор ступени 1..max в шторке рекорда; каждая плашка ≥44 dp. Без обводок: выбранная — цветом кнопки.
import React, { memo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useSpirePalette } from '../useSpirePalette';
import V2Pressable from '../../v2/V2Pressable';
import { PEAK_TAP_TARGET } from './peak_text';

type Props = Readonly<{ max: number; selected: number; onSelect: (step: number) => void }>;

function PeakStepChips({ max, selected, onSelect }: Props) {
  const p = useSpirePalette();
  return (
    <View style={s.row} testID="peak-step-chips">
      {Array.from({ length: max }, (_, i) => i + 1).map((n) => (
        <V2Pressable key={n} accessibilityRole="button" accessibilityState={{ selected: n === selected }} onPress={() => onSelect(n)} style={[s.chip, { backgroundColor: n === selected ? p.cta : p.cardRaised }]} testID={`peak-step-chip-${n}`}>
          <Text style={[s.text, { color: n === selected ? p.ctaText : p.text }]}>{n}</Text>
        </V2Pressable>
      ))}
    </View>
  );
}

const s = StyleSheet.create({
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, justifyContent: 'center' },
  chip: { width: PEAK_TAP_TARGET, height: PEAK_TAP_TARGET, borderRadius: PEAK_TAP_TARGET / 2, alignItems: 'center', justifyContent: 'center' },
  text: { fontSize: 16, fontWeight: '700' },
});

export default memo(PeakStepChips);
