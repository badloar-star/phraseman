import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import V2Pressable from '../../v2/V2Pressable';
import { V2, V2_TYPE } from '../../../constants/v2Style';
import { useV2Palette } from '../../v2/useV2Palette';

type Props = {
  overline: string;
  title: string;
  done: number;
  total: number;
  /** «Урок 4» — плашка поверх арта справа. */
  badge?: string;
  accessibilityLabel: string;
  onPress: () => void;
  onLongPress?: () => void;
};

/**
 * «ПРОДОЛЖИТЬ ОБУЧЕНИЕ» новой Главной (референс 2.0): оверлайн, крупное
 * название, счётчик x / N и полоса прогресса, круглая стрелка; справа арт
 * (заглушка до ассета от Codex) с плашкой номера урока.
 */
export default function HomeV2ContinueCard({ overline, title, done, total, badge, accessibilityLabel, onPress, onLongPress }: Props) {
  const p = useV2Palette();
  const safeTotal = Math.max(1, total);
  const ratio = Math.max(0, Math.min(1, done / safeTotal));
  return (
    <V2Pressable
      testID="home-continue-lesson"
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      onPress={onPress}
      onLongPress={onLongPress}
      scaleTo={0.98}
      style={[s.card, { backgroundColor: p.card, borderColor: p.hairline }]} // guard-ok: D43
    >
      <View pointerEvents="none" style={[s.art, { backgroundColor: p.cardRaised }]}>
        {badge ? (
          <View
            style={[s.badge, { backgroundColor: p.control, borderColor: p.hairline }]} // guard-ok: D43
          >
            <Text numberOfLines={1} style={[s.badgeText, { color: p.text }]}>{badge}</Text>
          </View>
        ) : null}
      </View>
      <View style={s.copy}>
        <Text numberOfLines={1} style={[s.overline, { color: p.textSecondary }]}>{overline}</Text>
        <Text testID="home-continue-lesson-title" numberOfLines={2} style={[s.title, { color: p.text }]}>{title}</Text>
        <Text style={[s.counter, { color: p.textSecondary }]}>{`${done} / ${total}`}</Text>
        <View style={s.progressRow}>
          <View style={[s.track, { backgroundColor: p.track }]}>
            {/* Ширина задаётся сразу — первый кадр = финальная геометрия. */}
            <View style={[s.fill, { width: `${ratio * 100}%`, backgroundColor: p.progressFill }]} />
          </View>
          <View style={[s.arrow, { backgroundColor: p.control }]}>
            <Ionicons name="chevron-forward" size={18} color={p.text} />
          </View>
        </View>
      </View>
    </V2Pressable>
  );
}

const s = StyleSheet.create({
  card: {
    minHeight: 124,
    borderRadius: V2.radius.card,
    borderWidth: StyleSheet.hairlineWidth, // guard-ok: D43
    overflow: 'hidden',
    flexDirection: 'row',
  },
  art: { position: 'absolute', right: 0, top: 0, bottom: 0, width: '36%', opacity: 0.85 },
  badge: {
    position: 'absolute',
    right: 12,
    bottom: 14,
    height: 30,
    paddingHorizontal: 12,
    borderRadius: 15,
    borderWidth: StyleSheet.hairlineWidth, // guard-ok: D43
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: { fontSize: 14, lineHeight: 18, fontWeight: '700' },
  copy: { flex: 1, paddingVertical: 18, paddingLeft: 18, paddingRight: '38%' },
  overline: { ...V2_TYPE.overline },
  title: { fontSize: 20, lineHeight: 25, fontWeight: '800', letterSpacing: -0.3, marginTop: 8 },
  counter: { ...V2_TYPE.subtitle, marginTop: 10 },
  progressRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 6 },
  track: { flex: 1, height: V2.progress.height, borderRadius: V2.progress.height / 2, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: V2.progress.height / 2, minWidth: V2.progress.height * 2 },
  arrow: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
});
