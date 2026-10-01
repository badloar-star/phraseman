import React from 'react';
import { StyleSheet, Text, View, type ImageSourcePropType } from 'react-native';
import { Image } from 'expo-image';
import Ionicons from '@expo/vector-icons/Ionicons';
import V2Pressable from '../../v2/V2Pressable';
import { V2, V2_TYPE } from '../../../constants/v2Style';
import { useV2Palette } from '../../v2/useV2Palette';
import { V2GlassSheen, useV2GlassStyle } from '../../v2/V2Glass';

type Props = {
  overline: string;
  title: string;
  done: number;
  total: number;
  /** Реальный тематически-независимый арт продолжения либо арт состояния ошибок. */
  art: ImageSourcePropType;
  /** «Урок 4» — плашка поверх арта справа. */
  badge?: string;
  accessibilityLabel: string;
  onPress: () => void;
  onLongPress?: () => void;
};

/**
 * «ПРОДОЛЖИТЬ ОБУЧЕНИЕ» новой Главной (референс 2.0): оверлайн, крупное
 * название, счётчик x / N и полоса прогресса, круглая стрелка; справа арт
 * из утверждённого ассета с плашкой номера урока.
 */
export default function HomeV2ContinueCard({ overline, title, done, total, art, badge, accessibilityLabel, onPress, onLongPress }: Props) {
  const p = useV2Palette();
  const glass = useV2GlassStyle();
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
      style={[s.card, glass]}
    >
      <V2GlassSheen seed={0} />
      <View pointerEvents="none" style={s.art}>
        <Image source={art} style={s.artImage} contentFit="contain" accessible={false} />
        {badge ? (
          <View
            style={[s.badge, { backgroundColor: p.control, borderColor: p.hairline }]} // guard-ok: D43
          >
            <Text style={[s.badgeText, { color: p.text }]}>{badge}</Text>
          </View>
        ) : null}
      </View>
      <View style={s.copy}>
        <Text style={[s.overline, { color: p.textSecondary }]}>{overline}</Text>
        <Text testID="home-continue-lesson-title" style={[s.title, { color: p.text }]}>{title}</Text>
        <Text style={[s.counter, { color: p.textSecondary }]}>{`${done} / ${total}`}</Text>
        <View style={s.progressRow}>
          <View style={[s.track, { backgroundColor: p.track }]}>
            {/* Ширина задаётся сразу — первый кадр = финальная геометрия. */}
            <View style={[s.fill, { width: `${ratio * 100}%`, backgroundColor: p.progressFill }]} />
          </View>
          <View style={[s.arrow, { backgroundColor: p.glassRaised, borderColor: p.stroke }]}>
            <Ionicons name="chevron-forward" size={18} color={p.text} />
          </View>
        </View>
      </View>
    </V2Pressable>
  );
}

const s = StyleSheet.create({
  card: {
    minHeight: 96,
    borderRadius: V2.radius.card,
    borderWidth: StyleSheet.hairlineWidth, // guard-ok: D43
    overflow: 'hidden',
    flexDirection: 'row',
  },
  art: { position: 'absolute', right: 0, top: 0, bottom: 0, width: '42%', opacity: 0.95, alignItems: 'flex-end', justifyContent: 'center' },
  artImage: { width: 130, height: 130, marginRight: 6 },
  badge: {
    position: 'absolute',
    right: 12,
    bottom: 10,
    minHeight: 26,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 13,
    borderWidth: StyleSheet.hairlineWidth, // guard-ok: D43
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: { fontSize: 13, lineHeight: 16, fontWeight: '700' },
  copy: { flex: 1, paddingVertical: 14, paddingLeft: 16, paddingRight: '43%' },
  overline: { ...V2_TYPE.overline },
  title: { fontSize: 16, lineHeight: 20, fontWeight: '700', letterSpacing: -0.3, marginTop: 6 },
  counter: { ...V2_TYPE.subtitle, marginTop: 6 },
  progressRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 6 },
  track: { flex: 1, height: V2.progress.height, borderRadius: V2.progress.height / 2, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: V2.progress.height / 2, minWidth: V2.progress.height * 2 },
  arrow: { width: 32, height: 32, borderRadius: 16, borderWidth: StyleSheet.hairlineWidth, alignItems: 'center', justifyContent: 'center' }, // guard-ok: D43
});
