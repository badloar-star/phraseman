import React from 'react';
import { StyleSheet, Text, View, type ImageSourcePropType } from 'react-native';
import { Image } from 'expo-image';
import Ionicons from '@expo/vector-icons/Ionicons';
import V2Pressable from '../../v2/V2Pressable';
import { V2, V2_TYPE } from '../../../constants/v2Style';
import { useV2Palette } from '../../v2/useV2Palette';
import { V2GlassSheen, useV2GlassStyle } from '../../v2/V2Glass';

type Props = {
  title: string;
  done: number;
  total: number;
  /** Реальный тематически-независимый арт продолжения либо арт состояния ошибок. */
  art: ImageSourcePropType;
  /** зачем (ассеты 2.0, continue 1536×1024, предмет справа): заполнить блок с привязкой к правому краю, а не ужимать. */
  artWide?: boolean;
  /** «Урок 4» — плашка поверх арта справа. */
  badge?: string;
  accessibilityLabel: string;
  onPress: () => void;
  onLongPress?: () => void;
  /**
   * зачем (координатор 01.10, эмулятор: карточка появлялась позже и сдвигала Главную на ~290 px):
   * урок ещё читается с диска — карточка стоит на своём месте той же геометрии, вместо текста
   * заготовки. Первый кадр = финальная геометрия (Performance Bible).
   */
  pending?: boolean;
};

/**
 * Карточка «продолжить» новой Главной: название, ниже полоса прогресса со счётчиком
 * x / N и круглой стрелкой; справа арт из утверждённого ассета с плашкой номера урока.
 * зачем (владелец 04.10, по скриншоту: «этот блок в два раза ниже, убери текст
 * “Продолжить обучение”»): надписи-оверлайна нет, счётчик переехал в строку полосы —
 * две строки вместо четырёх, высота 80 вместо ≈ 158.
 */
export default function HomeV2ContinueCard({ title, done, total, art, artWide = false, badge, accessibilityLabel, onPress, onLongPress, pending = false }: Props) {
  const p = useV2Palette();
  const glass = useV2GlassStyle();
  const safeTotal = Math.max(1, total);
  const ratio = Math.max(0, Math.min(1, done / safeTotal));
  return (
    <V2Pressable
      testID={pending ? 'home-continue-lesson-pending' : 'home-continue-lesson'}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ busy: pending }}
      disabled={pending}
      onPress={onPress}
      onLongPress={onLongPress}
      scaleTo={0.98}
      style={[s.card, glass]}
    >
      <V2GlassSheen seed={0} />
      <View pointerEvents="none" style={[s.art, pending ? s.artPending : null]}>
        <Image source={art} style={s.artImage} contentFit={artWide ? 'cover' : 'contain'} contentPosition={artWide ? 'right' : 'center'} accessible={false} />
        {badge && !pending ? (
          <View
            style={[s.badge, { backgroundColor: p.control, borderColor: p.hairline }]} // guard-ok: D43
          >
            <Text style={[s.badgeText, { color: p.text }]}>{badge}</Text>
          </View>
        ) : null}
      </View>
      <View style={s.copy}>
        {pending ? (
          <View style={[s.titleBar, { backgroundColor: p.control }]} />
        ) : (
          <Text testID="home-continue-lesson-title" style={[s.title, { color: p.text }]}>{title}</Text>
        )}
        <View style={s.progressRow}>
          <View style={[s.track, { backgroundColor: p.track }]}>
            {/* Ширина задаётся сразу — первый кадр = финальная геометрия. */}
            {pending ? null : <View style={[s.fill, { width: `${ratio * 100}%`, backgroundColor: p.progressFill }]} />}
          </View>
          {pending ? (
            <View style={[s.counterBar, { backgroundColor: p.control }]} />
          ) : (
            <Text style={[s.counter, { color: p.textSecondary }]}>{`${done} / ${total}`}</Text>
          )}
          <View style={[s.arrow, { backgroundColor: p.glassRaised, borderColor: p.stroke }]}>
            <Ionicons name="chevron-forward" size={16} color={p.text} />
          </View>
        </View>
      </View>
    </V2Pressable>
  );
}

const s = StyleSheet.create({
  card: {
    height: 80,
    borderRadius: V2.radius.card,
    borderWidth: StyleSheet.hairlineWidth, // guard-ok: D43
    overflow: 'hidden',
    flexDirection: 'row',
  },
  art: { position: 'absolute', right: 0, top: 0, bottom: 0, width: '32%', opacity: 0.95, alignItems: 'flex-end', justifyContent: 'center' },
  // Арт вписан в высоту карточки (80): не вылезает и не режется.
  artImage: { width: 96, height: 76, marginRight: 8 },
  artPending: { opacity: 0.35 },
  // Заготовки повторяют строки: заголовок 20, счётчик — в строке полосы.
  titleBar: { height: 14, width: '78%', borderRadius: 7, marginTop: 3, marginBottom: 3 },
  counterBar: { height: 12, width: 40, borderRadius: 6 },
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
  copy: { flex: 1, justifyContent: 'center', paddingVertical: 10, paddingLeft: 16, paddingRight: '34%' },
  title: { fontSize: 16, lineHeight: 20, fontWeight: '700', letterSpacing: -0.3 },
  counter: { ...V2_TYPE.subtitle, fontVariant: ['tabular-nums'] },
  progressRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 8 },
  track: { flex: 1, height: V2.progress.height, borderRadius: V2.progress.height / 2, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: V2.progress.height / 2, minWidth: V2.progress.height * 2 },
  arrow: { width: 28, height: 28, borderRadius: 14, borderWidth: StyleSheet.hairlineWidth, alignItems: 'center', justifyContent: 'center' }, // guard-ok: D43
});
