// PeakTopRow — строка рейтинга: место, монета ранга, имя, стрелка зоны, монеты недели. Без раскладки вокруг и без обводок.
// зачем (координатор 04.11): одна строка для топ-5 и для списка «Все участники», чтобы варианты A/B не дублировали разметку.
import React, { memo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import type { Lang } from '../../../constants/i18n';
import { useSpirePalette } from '../useSpirePalette';
import SpireRankCoin from '../SpireRankCoin';
import V2Pressable from '../../v2/V2Pressable';
import { spireGroupThousands, spireCoinsCount } from '../spire_plurals';
import type { PeakRow } from '../../../modules/spire/peak_model';

type Props = Readonly<{ lang: Lang; row: PeakRow; coinSize?: number; onPress?: (row: PeakRow) => void }>;

function PeakTopRow({ lang, row, coinSize = 40, onPress }: Props) {
  const p = useSpirePalette();
  const body = (
    <>
      <Text style={[s.place, { color: p.textSecondary }]}>{row.place}</Text>
      <SpireRankCoin rank={row.coinRank} size={coinSize} plus={row.isPremium} />
      <Text numberOfLines={1} style={[s.name, { color: p.text }]}>{row.name}</Text>
      {row.zone === 'up' ? <Ionicons name="arrow-up" size={18} color={p.correct} /> : null}
      {row.zone === 'down' ? <Ionicons name="arrow-down" size={18} color={p.wrong} /> : null}
      <Text style={[s.coins, { color: p.text }]}>{spireGroupThousands(row.weekCoins)}</Text>
    </>
  );
  const bg = row.isMe ? { backgroundColor: p.cardRaised } : null;
  const label = `${row.place}. ${row.name}, ${spireCoinsCount(lang, row.weekCoins)}`;
  if (!onPress) return <View accessible accessibilityLabel={label} style={[s.row, bg]} testID={`peak-row-${row.uid}`}>{body}</View>;
  return (
    <V2Pressable accessibilityRole="button" accessibilityLabel={label} onPress={() => onPress(row)} style={[s.row, bg]} testID={`peak-row-${row.uid}`}>
      {body}
    </V2Pressable>
  );
}

const s = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 56, paddingVertical: 6, paddingHorizontal: 12, borderRadius: 14 },
  place: { minWidth: 24, textAlign: 'center', fontSize: 16, fontWeight: '700' },
  name: { flex: 1, minWidth: 0, fontSize: 16, fontWeight: '700' },
  coins: { fontSize: 16, fontWeight: '800', fontVariant: ['tabular-nums'] },
});

export default memo(PeakTopRow);
