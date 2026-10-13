// ═══════════════════════════════════════════════════════════════════════════
// SpireFriendsRow.tsx — «Друзья на этой неделе»: чипы с монетой и камнем (.friends макета).
//
// зачем: макет подписывает чип «N этаж», но сервер (friends_profiles.spireFloor) отдаёт
// tier+1 — номер камня, не этаж башни. Поэтому подпись здесь — имя камня; расхождение
// записано в отчёте пакета. Пока список друзей не подключён (пакет B), секция скрыта целиком.
// ═══════════════════════════════════════════════════════════════════════════
import React, { memo } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import AvatarView from '../AvatarView';
import type { Lang } from '../../constants/i18n';
import { V2 } from '../../constants/v2Style';
import { spireTierName } from '../../modules/spire/tier_names';
import { useSpirePalette } from './useSpirePalette';
import { useSpireShadow } from './useSpireShadow';
import { spireText } from './spire_strings';
import type { SpireFriendChip } from './spire_room_types';

function SpireFriendsRow({ lang, friends }: Readonly<{ lang: Lang; friends: readonly SpireFriendChip[] }>) {
  const p = useSpirePalette(); const sh = useSpireShadow();
  // зачем (отчёт тем 14.10): заглушка аватара была зашитой белой rgba(255,255,255,0.12) — на светлой теме почти невидима; берём тон темы (hairline).
  if (friends.length === 0) return null;
  return (
    <View testID="spire-friends">
      <Text accessibilityRole="header" style={[s.head, { color: p.text }]}>{spireText(lang, 'friendsWeek')}</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.list} decelerationRate="fast">
        {friends.map((f) => {
          const stone = f.tier === null ? '—' : spireTierName(f.tier, lang);
          return (
            <View key={f.uid} style={[s.chip, { backgroundColor: p.control }, sh.nested]} accessible accessibilityLabel={`${f.name}, ${stone}`}>
              {f.coinRank !== null ? <AvatarView avatar="" coinRank={f.coinRank} size={30} /> : <View style={[s.dot, { backgroundColor: p.hairline }]} />}
              <Text style={[s.name, { color: p.text }]}>{f.name}</Text>
              <Text style={[s.stone, { color: p.textSecondary }]}>{stone}</Text>
            </View>
          );
        })}
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  head: { marginTop: 26, marginBottom: 12, marginHorizontal: 2, fontSize: 16, lineHeight: 21, fontWeight: '700' },
  list: { gap: 10, paddingRight: V2.screenPad },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 46, paddingLeft: 8, paddingRight: 14, borderRadius: 23 },
  dot: { width: 30, height: 30, borderRadius: 15 },
  name: { fontSize: 16, fontWeight: '700', maxWidth: 140 },
  stone: { fontSize: 16, fontWeight: '700' },
});

export default memo(SpireFriendsRow);
