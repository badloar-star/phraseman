/**
 * Огонь пары в строке друга (`.pf` макета): значок огня + число дней серии вдвоём.
 *
 * зачем (владелец 21.10, макет docs/design/v2-app/friends-full.html, «Огонь пары: горит · ждёт · погас»):
 * по строке сразу видно, с кем серия жива сегодня, кто ждёт, а у кого она прервалась — без открытия шторки.
 * Цвет огня один на строку, шторку, Главную и финал занятия — `pairFlameColor`.
 */
import React, { memo } from 'react';
import { StyleSheet, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';

import { FlowText } from '../text-integrity';
import type { FriendsGlass } from '../friends/FriendsGlassKit';
import { pairFlameStage, type PairFlameState, type PairStreakView } from '../../app/friends_together/pair_streak';

export type PairFlameTone = 'on' | 'dim' | 'out';

/** Горит — оба сегодня; ждёт — серия жива, но сегодня ещё не оба; погас — серия прервалась. */
export function pairFlameTone(state: PairFlameState): PairFlameTone | null {
  if (state === 'none') return null;
  if (state === 'both_today') return 'on';
  if (state === 'broken') return 'out';
  return 'dim';
}

/** Цвет горящего огня: база — графика цвета темы (≥ 3:1), от 30 дней голубой (info темы), от 100 — белый (текст темы). */
export function pairFlameColor(glass: FriendsGlass, streak: number): string {
  // зачем (макет «Серия вдвоём — 30 дней»: «Огонь пары стал голубым»): стадии огня — награда за длинную серию без монет
  const stage = pairFlameStage(streak);
  if (stage === 'white') return glass.text;
  if (stage === 'blue') return glass.info;
  return glass.accentGraphic;
}

function PairFlameInline({ glass, textScale, view, testID }: Readonly<{ glass: FriendsGlass; textScale: number; view: PairStreakView; testID?: string }>) {
  const tone = pairFlameTone(view.state);
  if (!tone) return null;
  const value = tone === 'out' ? 0 : view.streak;
  // зачем (макет `.pf.dim` / `.pf.out`): ждёт — огонь цвета вторичного текста на 55 %, погас — на 35 %; число — вторичным
  const iconColor = tone === 'on' ? pairFlameColor(glass, view.streak) : glass.secondary;
  return (
    <View testID={testID ?? `pair-flame-${tone}`} style={styles.row} accessible={false} importantForAccessibility="no-hide-descendants">
      <Ionicons name="flame" size={15 * textScale} color={iconColor} style={tone === 'on' ? null : { opacity: tone === 'dim' ? 0.55 : 0.35 }} accessible={false} />
      <FlowText testID="pair-flame-value" provenance="authored" style={{ color: tone === 'on' ? glass.text : glass.secondary, fontSize: 14 * textScale, lineHeight: 18 * textScale, fontWeight: '700', fontVariant: ['tabular-nums'] }}>
        {value}
      </FlowText>
    </View>
  );
}

export default memo(PairFlameInline);

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 3, flexShrink: 0 },
});
