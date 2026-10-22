/**
 * «Дуэль на 5 фраз» (идея 3) — шапка «ты против друга»: две монеты, имена, счёт и время, посередине — «против / ход отправлен / итог».
 * зачем (макет docs/design/v2-app/friends-full.html, идея 3, .vs): одна шапка на вызов, ожидание, вызов у друга и итог.
 * Чужой счёт до своего хода — «?» (счёт вызвавшего открывается только после хода друга). Имена не склоняем — они под монетами.
 */
import React, { memo } from 'react';
import { StyleSheet, View } from 'react-native';

import { FlowText } from '../text-integrity';
import { FriendsCoin, type FriendsGlass } from '../friends/FriendsGlassKit';

export type DuelSide = Readonly<{
  name: string;
  coinRank: number | null;
  isPlus: boolean;
  /** «4», «?» или null — счёта ещё нет (вызов). */
  score?: string | null;
  /** «0:48», «ходит» или null. */
  note?: string | null;
}>;

function Side({ side, glass, textScale, coin, testID }: Readonly<{ side: DuelSide; glass: FriendsGlass; textScale: number; coin: number; testID: string }>) {
  return (
    <View style={styles.side} accessible accessibilityLabel={[side.name, side.score, side.note].filter(Boolean).join(', ')}>
      <FriendsCoin coinRank={side.coinRank} name={side.name} size={coin} glass={glass} plus={side.isPlus} />
      <FlowText testID={`${testID}-name`} provenance="user" style={[styles.center, { marginTop: 6, color: glass.secondary, fontSize: 13 * textScale, lineHeight: 17 * textScale }]}>{/* guard-ok: имя под монетой в шапке .vs макета, не расшифровка */}
        {side.name}
      </FlowText>
      {side.score ? (
        <FlowText testID={`${testID}-score`} provenance="authored" style={[styles.center, { marginTop: 2, color: glass.text, fontSize: 25 * textScale, lineHeight: 31 * textScale, fontWeight: '700', fontVariant: ['tabular-nums'] }]}>
          {side.score}
        </FlowText>
      ) : null}
      {side.note ? (
        <FlowText testID={`${testID}-note`} provenance="authored" style={[styles.center, { color: glass.secondary, fontSize: 13 * textScale, lineHeight: 17 * textScale, fontVariant: ['tabular-nums'] }]}>{/* guard-ok: время хода под счётом (.vs .s13 макета) */}
          {side.note}
        </FlowText>
      ) : null}
    </View>
  );
}

function DuelVersus({ me, friend, mid, glass, textScale, coin = 60 }: Readonly<{ me: DuelSide; friend: DuelSide; mid: string; glass: FriendsGlass; textScale: number; coin?: number }>) {
  return (
    <View style={styles.row} testID="duel-versus">
      <Side side={me} glass={glass} textScale={textScale} coin={coin} testID="duel-versus-me" />
      <FlowText testID="duel-versus-mid" provenance="authored" style={[styles.mid, { color: glass.secondary, fontSize: 13 * textScale, lineHeight: 17 * textScale }]}>{/* guard-ok: «против / итог» между монетами (.vs .mid макета) */}
        {mid}
      </FlowText>
      <Side side={friend} glass={glass} textScale={textScale} coin={coin} testID="duel-versus-friend" />
    </View>
  );
}

export default memo(DuelVersus);

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'center', gap: 12, marginTop: 16 },
  side: { flex: 1, alignItems: 'center', minWidth: 0 },
  mid: { marginTop: 22, textAlign: 'center', maxWidth: 96 },
  center: { textAlign: 'center' },
});
