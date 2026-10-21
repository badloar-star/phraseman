/**
 * Финал занятия: карточки «Серия вдвоём» (идея 1).
 *
 * зачем (владелец 21.10, макет docs/design/v2-app/friends-full.html «Финал занятия»): сразу после занятия видно, что общая серия
 * выросла («Серия вдвоём · 13 дней · Ирина тоже сегодня занималась» + огонь), и кого позвать («Марк ещё не занимался» + «Позвать»).
 * Кого показать — pickFinishPairs; огонь пересчитан по свежим своим дням (recomputePairWithMyDays) — без сети.
 */
import React, { memo } from 'react';
import { StyleSheet, View } from 'react-native';

import { FlowText } from '../text-integrity';
import { useLang } from '../LangContext';
import { FriendsCoin, useFriendsGlass, type FriendsGlass } from '../friends/FriendsGlassKit';
import { plateBoxShadow } from '../v2/ShadowSurface';
import { pairDoneFriendAlsoToday, pairDoneFriendPending, pairDoneTitle } from '../../app/friends_together/pair_copy';
import type { PairStreakView } from '../../app/friends_together/pair_streak';
import PairFlameInline from './PairFlameInline';
import FriendCallPill, { type FriendCallState } from './FriendCallPill';

export type FinishPairPerson = Readonly<{ name: string; coinRank: number | null; isPlus: boolean }>;
export type FinishPairRow = FinishPairPerson & Readonly<{ friendUid: string; view: PairStreakView }>;

export interface FriendPairFinishRowsProps {
  me: FinishPairPerson;
  together: FinishPairRow | null;
  pending: (FinishPairRow & Readonly<{ callState: FriendCallState; onCall: () => void }>) | null;
}

const AVATAR = 36;
const RING = 3;

/** Две монеты внахлёст (`.pair` макета): кольцо цвета карточки 3 px отделяет вторую от первой, нахлёст 12. */
function PairCoins({ me, friend, glass }: Readonly<{ me: FinishPairPerson; friend: FinishPairPerson; glass: FriendsGlass }>) {
  const ring = { width: AVATAR + RING * 2, height: AVATAR + RING * 2, borderRadius: (AVATAR + RING * 2) / 2, backgroundColor: glass.opaqueCard };
  return (
    <View style={styles.pair} accessible={false} importantForAccessibility="no-hide-descendants">
      <View style={[styles.ring, ring]}><FriendsCoin coinRank={me.coinRank} name={me.name} size={AVATAR} glass={glass} plus={me.isPlus} /></View>
      <View style={[styles.ring, ring, styles.ringOverlap]}><FriendsCoin coinRank={friend.coinRank} name={friend.name} size={AVATAR} glass={glass} plus={friend.isPlus} /></View>
    </View>
  );
}

function FinishCard({ glass, testID, children }: Readonly<{ glass: FriendsGlass; testID: string; children: React.ReactNode }>) {
  // зачем (макет `.cd`): карточка радиус 22, поля 12/14, без обводки — тон карточки и малая внешняя тень (стиль «Тень»)
  return <View testID={testID} style={[styles.card, { backgroundColor: glass.opaqueCard, boxShadow: plateBoxShadow(glass) }]}>{children}</View>;
}

function FriendPairFinishRows({ me, together, pending }: FriendPairFinishRowsProps) {
  const { glass, textScale } = useFriendsGlass();
  const { lang } = useLang();
  if (!together && !pending) return null;
  const title = { color: glass.text, fontSize: 17 * textScale, lineHeight: 22 * textScale, fontWeight: '700' as const };
  const sub = { color: glass.secondary, fontSize: 14 * textScale, lineHeight: 19 * textScale };
  return (
    <View style={styles.stack} testID="friend-pair-finish-rows">
      {together ? (
        <FinishCard glass={glass} testID="friend-pair-finish-together">
          <PairCoins me={me} friend={together} glass={glass} />
          <View style={styles.text}>
            <FlowText testID="friend-pair-finish-together-title" provenance="authored" style={title}>{pairDoneTitle(lang, together.view.streak)}</FlowText>
            <FlowText testID="friend-pair-finish-together-sub" provenance="user" style={sub}>{pairDoneFriendAlsoToday(lang, together.name)}</FlowText>
          </View>
          <PairFlameInline glass={glass} textScale={textScale} view={together.view} />
        </FinishCard>
      ) : null}
      {pending ? (
        <FinishCard glass={glass} testID="friend-pair-finish-pending">
          <FriendsCoin coinRank={pending.coinRank} name={pending.name} size={AVATAR} glass={glass} plus={pending.isPlus} />
          <View style={styles.text}>
            <FlowText testID="friend-pair-finish-pending-title" provenance="user" style={title}>{pairDoneFriendPending(lang, pending.name)}</FlowText>
            <FlowText testID="friend-pair-finish-pending-sub" provenance="authored" style={sub}>{pairDoneTitle(lang, pending.view.streak)}</FlowText>
          </View>
          <FriendCallPill glass={glass} textScale={textScale} state={pending.callState} friendName={pending.name} onCall={pending.onCall} testID={`friend-pair-finish-call-${pending.callState}`} />
        </FinishCard>
      ) : null}
    </View>
  );
}

export default memo(FriendPairFinishRows);

const styles = StyleSheet.create({
  stack: { gap: 10 },
  card: { borderRadius: 22, paddingVertical: 12, paddingHorizontal: 14, flexDirection: 'row', alignItems: 'center', gap: 12 },
  text: { flex: 1, minWidth: 0, gap: 2 },
  pair: { flexDirection: 'row', alignItems: 'center', flexShrink: 0, marginLeft: -RING },
  ring: { alignItems: 'center', justifyContent: 'center' },
  // зачем: кружки по 36 с кольцом 3 → нахлёст самих монет ровно 12, как `.pair .av + .av { margin-left: -12px }`
  ringOverlap: { marginLeft: -(12 + RING * 2) },
});
