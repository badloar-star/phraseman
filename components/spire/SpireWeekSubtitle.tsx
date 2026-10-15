// SpireWeekSubtitle.tsx — подпись недели Шпиля со значком ранга слева.
// зачем (решение владельца 15.10: значок ранга Codex сохранить и вынести; экран Шпиля держит потолок 400 строк): блок «значок + подпись» жил прямо в SpireHomeScreen.tsx (+6 строк) и ломал tests/spire_home_week_module.test.ts (экран <= 400 строк).
// Значок — шесть утверждённых бейджей, по одному на два соседних камня (modules/spire/tier_badge.ts); пока ранг неизвестен (tier === null), значка нет.
import React, { memo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { spireRankArtName } from '../../modules/spire/tier_badge';
import { ThemedArt } from '../theme/ThemedArt';

export type SpireWeekSubtitleProps = Readonly<{ text: string; tier: unknown; color: string }>;

function SpireWeekSubtitle({ text, tier, color }: SpireWeekSubtitleProps) {
  return (
    <View style={s.row}>
      {tier !== null && tier !== undefined ? <ThemedArt name={spireRankArtName(tier)} size={25} /> : null}
      <Text style={[s.subtitle, { color }]}>{text}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 7, marginTop: 6 },
  // зачем (бета-тест А4, 15.10): рядом с подписью плашка энергии — при крупном шрифте или длинном переводе подпись переносится, а не уезжает под плашку
  subtitle: { fontSize: 16, lineHeight: 20, flexShrink: 1 },
});

export default memo(SpireWeekSubtitle);
