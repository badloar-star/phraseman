import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { useTheme } from '../ThemeContext';
import { formatLevelExamRemaining, getLevelExamTimerUrgency } from './levelExamTime';

export { formatLevelExamRemaining, getLevelExamTimerUrgency } from './levelExamTime';

type Props = {
  remainingMs: number;
  totalMs: number;
};

export default function LevelExamTimer({ remainingMs, totalMs }: Props) {
  const { theme: t, f, ds } = useTheme();
  const urgency = getLevelExamTimerUrgency(remainingMs);
  const fraction = totalMs <= 0 ? 0 : Math.max(0, Math.min(1, remainingMs / totalMs));
  const color = urgency === 'normal' ? t.accent : t.wrong;

  return (
    <View
      accessibilityRole="timer"
      accessibilityLiveRegion={urgency === 'normal' ? 'none' : 'polite'}
      accessibilityLabel={formatLevelExamRemaining(remainingMs)}
      style={styles.root}
    >
      <View style={styles.labelRow}>
        <Ionicons name="timer-outline" size={18} color={color} />
        <Text style={{ color, fontSize: f.caption, fontFamily: ds.fontFamily, fontWeight: '900' }}>
          {formatLevelExamRemaining(remainingMs)}
        </Text>
      </View>
      <View style={[styles.track, { backgroundColor: urgency === 'normal' ? t.bgSurface2 : t.wrongBg }]}> 
        <View style={[styles.fill, { width: `${fraction * 100}%`, backgroundColor: color }]} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, gap: 5 },
  labelRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: 5 },
  track: { height: 7, borderRadius: 4, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: 4 },
});
