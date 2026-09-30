// ═══════════════════════════════════════════════════════════════════════════
// SpireWeekResultCard.tsx — «Итог недели» карточкой на главном экране Шпиля (макет §9).
//
// зачем (владелец: «при первом заходе новой недели — карточка фактом, не модалка»):
// данные — документ spire_week_results, который записал крон (решения о повышении
// и понижении принимает только сервер). Крестик закрывает карточку навсегда для
// этой недели. Глаголы в настоящем времени — род игрока не угадываем.
// ═══════════════════════════════════════════════════════════════════════════
import React, { memo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import type { Lang } from '../../constants/i18n';
import type { SpireWeekResultView } from '../../app/spire/spire_week_result_client';
import { spireTierName } from '../../modules/spire/tier_names';
import AvatarView from '../AvatarView';
import V2Pressable from '../v2/V2Pressable';
import { useSpirePalette } from './useSpirePalette';
import { spireText } from './spire_strings';
import { spireGameText } from './spire_game_strings';

type Props = Readonly<{ lang: Lang; result: SpireWeekResultView; myCoinRank: number | null; onClose: () => void }>;

export function spireWeekResultLines(lang: Lang, r: SpireWeekResultView): Readonly<{ title: string; sub: string }> {
  const stone = spireTierName(r.newTier, lang);
  const title = r.promoted ? spireGameText(lang, 'weekUp', { stone }) // guard-ok: показ решения сервера
    : r.demoted ? spireGameText(lang, 'weekDown', { stone }) : spireGameText(lang, 'weekStay', { stone }); // guard-ok: показ решения сервера
  const parts = [
    r.roomRank > 0 ? spireGameText(lang, 'placeN', { n: r.roomRank }) : '—',
    `${r.steps} ${spireText(lang, 'steps')}`,
  ];
  const coins = [r.placeCoins, r.promotionCoins].filter((c) => c > 0);
  if (coins.length > 0) parts.push(`${coins.map((c) => `+${c}`).join(' · ')} ${spireGameText(lang, 'coins')}`);
  else parts.push(spireGameText(lang, 'newWeekFromOne'));
  return { title, sub: parts.join(' · ') };
}

function SpireWeekResultCard({ lang, result, myCoinRank, onClose }: Props) {
  const p = useSpirePalette();
  const { title, sub } = spireWeekResultLines(lang, result);
  return (
    <View style={[s.card, { backgroundColor: p.cardRaised }]} accessible={false} testID="spire-week-result">
      {myCoinRank !== null ? <AvatarView avatar="" coinRank={myCoinRank} size={52} /> : <View style={[s.dot, { backgroundColor: p.control }]} />}
      <View style={s.text} accessible accessibilityLabel={`${spireGameText(lang, 'weekResult')}. ${title}. ${sub}`}>
        <Text style={[s.over, { color: p.textSecondary }]}>{spireGameText(lang, 'weekResult').toUpperCase()}</Text>
        <Text style={[s.title, { color: p.text }]}>{title}</Text>
        <Text style={[s.sub, { color: p.textSecondary }]}>{sub}</Text>
      </View>
      <V2Pressable
        onPress={onClose}
        accessibilityRole="button"
        accessibilityLabel={spireGameText(lang, 'close')}
        style={[s.close, { backgroundColor: p.control }]}
        hitSlop={8}
        testID="spire-week-result-close"
      >
        <Ionicons name="close" size={16} color={p.text} />
      </V2Pressable>
    </View>
  );
}

const s = StyleSheet.create({
  card: { marginTop: 16, borderRadius: 20, padding: 16, flexDirection: 'row', alignItems: 'flex-start', gap: 14 },
  dot: { width: 52, height: 52, borderRadius: 26 },
  text: { flex: 1, minWidth: 0 },
  over: { fontSize: 12, fontWeight: '700', letterSpacing: 2 },
  title: { fontSize: 19, lineHeight: 24, fontWeight: '700', marginTop: 6 },
  sub: { fontSize: 15, lineHeight: 20, marginTop: 4 },
  close: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
});

export default memo(SpireWeekResultCard);
