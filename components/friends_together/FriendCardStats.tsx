/**
 * Визитка друга: три числа — дни серии · этаж Пика · дней вдвоём (идея 1).
 *
 * зачем (владелец 21.10, макет docs/design/v2-app/friends-full.html «Визитка», `.vstat`): по визитке друга сразу видно, насколько он
 * в деле и сколько вы уже занимаетесь вместе. Цвета — из вида визитки (ProfileCardLookTokens), а не из темы приложения:
 * визитка живёт в своей палитре. Плашки разделяет тон, без обводок. Какие числа показать — friendCardCells.
 */
import React, { memo } from 'react';
import { StyleSheet, View } from 'react-native';

import { FlowText } from '../text-integrity';
import type { Lang } from '../../constants/i18n';
import type { ProfileCardLookTokens } from '../profile-card/profile_card_looks';
import { friendCardCells, type FriendCardStatsData } from '../../app/friends_together/pair_card_stats';

export type { FriendCardStatsData } from '../../app/friends_together/pair_card_stats';

function FriendCardStats({ stats, tokens, lang }: Readonly<{
  stats: FriendCardStatsData;
  tokens: Pick<ProfileCardLookTokens, 'title' | 'rankBg' | 'rankText'>;
  lang: Lang;
}>) {
  const cells = friendCardCells(stats, lang);
  if (cells.length === 0) return null;
  return (
    <View testID="friend-card-stats" style={styles.row} accessible accessibilityLabel={cells.map((c) => `${c.value} ${c.label}`).join(', ')}>
      {cells.map((cell) => (
        <View key={cell.key} style={[styles.cell, { backgroundColor: tokens.rankBg }]} accessible={false} importantForAccessibility="no-hide-descendants">
          <FlowText testID={`friend-card-stat-${cell.key}`} provenance="authored" style={[styles.value, { color: tokens.title }]}>{cell.value}</FlowText>
          <FlowText testID={`friend-card-stat-${cell.key}-label`} provenance="authored" style={[styles.label, { color: tokens.rankText }]}>{cell.label}</FlowText>
        </View>
      ))}
    </View>
  );
}

export default memo(FriendCardStats);

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: 8, marginTop: 16 },
  cell: { flex: 1, minWidth: 0, borderRadius: 16, paddingVertical: 10, paddingHorizontal: 4, alignItems: 'center' },
  value: { fontSize: 20, lineHeight: 24, fontWeight: '700', textAlign: 'center', fontVariant: ['tabular-nums'] },
  // зачем (макет `.vstat small`): подпись под числом — короткая, приглушённая; 62 % — как в макете
  label: { fontSize: 12, lineHeight: 16, textAlign: 'center', opacity: 0.62 }, // guard-ok: подпись числа в ячейке статистики (макет 2.0 `.vstat`), не расшифровка названия
});
