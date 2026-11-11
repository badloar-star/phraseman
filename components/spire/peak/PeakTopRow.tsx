// PeakTopRow — строка топ-5 экрана Пика B: монета ранга, имя, монеты недели (по макету variant_B_*: без номера и стрелок). Без раскладки вокруг.
// зачем (координатор 04.11): одна строка для топ-5 и для списка «Все участники», чтобы варианты A/B не дублировали разметку.
import React, { memo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import type { Lang } from '../../../constants/i18n';
import { useSpirePalette } from '../useSpirePalette';
import SpireRankCoin from '../SpireRankCoin';
import V2Pressable from '../../v2/V2Pressable';
import { spireGroupThousands, spireCoinsCount } from '../spire_plurals';
import type { PeakRow } from '../../../modules/spire/peak_model';

type Props = Readonly<{ lang: Lang; row: PeakRow; coinSize?: number; onPress?: (row: PeakRow) => void }>;

function PeakTopRow({ lang, row, coinSize = 40, onPress }: Props) {
  const p = useSpirePalette();
  // зачем (владелец 05.11, «Макеты как были одобрены», «1 в 1» с variant_B_*): строка топ-5 — монета, имя целиком, приглушённое число; БЕЗ номера места, БЕЗ стрелок зоны (зону показывает зелёная линия слева), БЕЗ значка Plus;
  // кольцо вокруг монеты — только у «я»; имя переносится на вторую строку, а не усекается («Татьяна Г…»)
  const coin = <SpireRankCoin rank={row.coinRank} size={coinSize} plus={row.isPremium} plusTier={row.plusTier ?? 'plus'} />;
  const body = (
    <>
      {/* зачем (владелец 11.11: «серая рамка на аватарке» у себя на Пике → «Да, убрать»): у подписчика кольцо Plus/Ultra почти того же диаметра ложилось поверх серого кольца «это ты»,
          от серого оставался обломок дуги. Одно кольцо на монете (как замок Главной 28.10): есть кольцо подписки — серое не рисуется. Раскладка не меняется: серое кольцо и так не занимало места (отрицательные поля). */}
      {row.isMe && !row.isPremium ? (
        // кольцо без рамки (замок «без обводок»): внешний круг цвета кольца, внутренний — цвет экрана, поверх монета
        <View style={[s.ringOuter, { width: coinSize + 12, height: coinSize + 12, borderRadius: (coinSize + 12) / 2, backgroundColor: p.textSecondary }]}>
          <View style={[s.ringInner, { width: coinSize + 7, height: coinSize + 7, borderRadius: (coinSize + 7) / 2, backgroundColor: p.bg }]}>{coin}</View>
        </View>
      ) : coin}
      <Text numberOfLines={2} style={[s.name, { color: p.text }]}>{row.name}</Text>
      <Text style={[s.coins, { color: p.textSecondary }]}>{spireGroupThousands(row.value)}</Text>
    </>
  );
  const bg = null;
  const label = `${row.place}. ${row.name}, ${spireCoinsCount(lang, row.weekCoins)}`;
  if (!onPress) return <View accessible accessibilityLabel={label} style={[s.row, bg]} testID={`peak-row-${row.uid}`}>{body}</View>;
  return (
    <V2Pressable accessibilityRole="button" accessibilityLabel={label} onPress={() => onPress(row)} style={[s.row, bg]} testID={`peak-row-${row.uid}`}>
      {body}
    </V2Pressable>
  );
}

const s = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 56, paddingVertical: 6, paddingHorizontal: 8, paddingLeft: 14, borderRadius: 14 },
  ringOuter: { alignItems: 'center', justifyContent: 'center', marginHorizontal: -6 },
  ringInner: { alignItems: 'center', justifyContent: 'center' },
  name: { flex: 1, minWidth: 0, fontSize: 16, fontWeight: '700' },
  coins: { fontSize: 16, fontWeight: '800', fontVariant: ['tabular-nums'] },
});

export default memo(PeakTopRow);
