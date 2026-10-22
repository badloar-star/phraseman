// ─── Визитка 2.0: кнопки низа (.vz-foot) ─────────────────────────────────────
// зачем (макет VC-SELF-* / VC-UP-*): на своей визитке две компактные кнопки одной
// высоты — «Повысить ранг» с ценой (монет не хватает — «ещё N», высший ранг —
// «Высший ранг · Титан») и «Про визитка 10 000» (у владельца «Про» — «Стиль ·
// бесплатно»). Во время повышения — одна выключенная «Повышаем ранг…».
import Ionicons from '@expo/vector-icons/Ionicons';
import React, { memo } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { coinRankTitle, COIN_RANK_MAX, type CoinRankRow } from '../../app/coin_rank_table_v1';
import type { Lang } from '../../constants/i18n';
import { buttonInk, ProfileCardButton, TwoLine } from './ProfileCardParts';
import { useProfileCardArtInk } from './profile_card_art_ink';
import type { ProfileCardLookTokens } from './profile_card_looks';
import { formatCoins, PC, t4 } from './profile_card_copy';

type SelfProps = Readonly<{
  lang: Lang;
  tokens: ProfileCardLookTokens;
  rank: number | null;
  next: CoinRankRow | null;
  isMaxRank: boolean;
  balance: number | null;
  eligible: boolean;
  busy: boolean;
  upgradingNow: boolean;
  /** null — статус «Про» ещё читается (вторую кнопку не показываем, чтобы не мигала). */
  proOwned: boolean | null;
  proPrice: number;
  onUpgrade: () => void;
  onOpenBuy: () => void;
  onOpenStyle: () => void;
}>;

function ProfileCardSelfFooterBase({
  lang, tokens, rank, next, isMaxRank, balance, eligible, busy, upgradingNow, proOwned, proPrice,
  onUpgrade, onOpenBuy, onOpenStyle,
}: SelfProps) {
  const art = useProfileCardArtInk();
  if (upgradingNow) {
    return (
      <View style={styles.foot}>
        <ProfileCardButton testID="profile-card-upgrading" tone="off" label={t4(lang, PC.upgrading)} busy outerStyle={styles.flex1} paint={art.button}>
          <Text style={[styles.buttonText, { color: buttonInk('off', null, false, art.button) }]}>{t4(lang, PC.upgrading)}</Text>
        </ProfileCardButton>
      </View>
    );
  }
  const missing = balance !== null && next ? Math.max(0, next.priceToReach - balance) : null;
  const upTone = isMaxRank || !eligible ? 'off' : 'primary';
  const upInk = buttonInk(upTone, tokens.primary, false, art.button);
  const upSub = isMaxRank
    ? coinRankTitle(COIN_RANK_MAX, lang)
    : busy
      ? '…'
      : missing !== null && missing > 0
        ? `${t4(lang, PC.more2)} ${formatCoins(missing)}`
        : next ? formatCoins(next.priceToReach) : '—';
  const altInk = buttonInk('alt', null, false, art.button);
  return (
    <View style={styles.foot}>
      <ProfileCardButton
        testID="profile-card-upgrade-rank"
        paint={art.button}
        tone={upTone}
        label={isMaxRank ? t4(lang, PC.maxRank) : `${t4(lang, PC.upgrade)} ${upSub}`}
        onPress={onUpgrade}
        disabled={upTone === 'off'}
        busy={busy}
        fill={tokens.primary}
        outerStyle={styles.flex1}
      >
        <Ionicons name="arrow-up" size={22} color={upInk} />
        <TwoLine
          title={isMaxRank ? t4(lang, PC.maxRank) : t4(lang, PC.upgrade)}
          sub={upSub}
          ink={upInk}
          subCoinRank={isMaxRank ? undefined : rank}
        />
      </ProfileCardButton>
      {proOwned === null ? (
        <View style={styles.flex1} />
      ) : proOwned ? (
        <ProfileCardButton
          testID="profile-card-style-open"
          paint={art.button}
          tone="alt"
          label={`${t4(lang, PC.style)}, ${t4(lang, PC.free)}`}
          onPress={onOpenStyle}
          outerStyle={styles.flex1}
        >
          <Ionicons name="color-palette-outline" size={20} color={altInk} />
          <TwoLine title={t4(lang, PC.style)} sub={t4(lang, PC.free)} ink={altInk} />
        </ProfileCardButton>
      ) : (
        <ProfileCardButton
          testID="profile-card-pro-open"
          paint={art.button}
          tone="alt"
          label={`${t4(lang, PC.proCard)} ${formatCoins(proPrice)}`}
          onPress={onOpenBuy}
          outerStyle={styles.flex1}
        >
          <Ionicons name="star" size={20} color={altInk} />
          <TwoLine title={t4(lang, PC.proCard)} sub={formatCoins(proPrice)} ink={altInk} subCoinRank={rank} />
        </ProfileCardButton>
      )}
    </View>
  );
}

export const ProfileCardSelfFooter = memo(ProfileCardSelfFooterBase);

type OtherProps = Readonly<{
  lang: Lang;
  tokens: ProfileCardLookTokens;
  showAddFriend: boolean;
  isFriend: boolean;
  requestSent: boolean;
  friendBusy: boolean;
  friendLabel: string;
  onFriendPress: () => void;
  canLike: boolean;
  liked: boolean;
  likeBusy: boolean;
  likeTotal: number;
  onLikePress: () => void;
}>;

function ProfileCardOtherFooterBase({
  lang, tokens, showAddFriend, isFriend, requestSent, friendBusy, friendLabel, onFriendPress,
  canLike, liked, likeBusy, likeTotal, onLikePress,
}: OtherProps) {
  const art = useProfileCardArtInk();
  const friendTone = isFriend || requestSent ? 'alt' : 'primary';
  const friendOff = friendBusy || requestSent;
  const friendInk = buttonInk(friendTone, tokens.primary, friendOff, art.button);
  return (
    <View style={styles.foot}>
      {showAddFriend ? (
        <ProfileCardButton
          testID="player-profile-add-friend"
          paint={art.button}
          tone={friendTone}
          label={friendLabel}
          onPress={onFriendPress}
          disabled={friendOff}
          busy={friendBusy}
          fill={tokens.primary}
          outerStyle={styles.flex1}
        >
          <Ionicons name={isFriend || requestSent ? 'checkmark' : 'add'} size={20} color={friendInk} />
          <Text style={[styles.buttonText, { color: friendInk }]}>
            {isFriend ? t4(lang, PC.friends) : requestSent ? t4(lang, PC.requestSent) : t4(lang, PC.addFriend)}
          </Text>
        </ProfileCardButton>
      ) : null}
      <ProfileCardButton
        testID="player-profile-activity-like"
        paint={art.button}
        tone="alt"
        label={t4(lang, PC.like)}
        selected={liked}
        onPress={canLike && !likeBusy ? onLikePress : undefined}
        disabled={!canLike}
        outerStyle={showAddFriend ? styles.iconButton : styles.flex1}
      >
        <Ionicons name={liked ? 'heart' : 'heart-outline'} size={20} color={liked ? art.liked : art.ink} />
        <Text style={[styles.buttonText, { color: art.ink }]}>{likeTotal.toLocaleString()}</Text>
      </ProfileCardButton>
    </View>
  );
}

export const ProfileCardOtherFooter = memo(ProfileCardOtherFooterBase);

const styles = StyleSheet.create({
  foot: { flexDirection: 'row', gap: 10, alignItems: 'stretch', paddingTop: 12, paddingHorizontal: 16, paddingBottom: 16, zIndex: 8 },
  flex1: { flex: 1, minWidth: 0 },
  iconButton: { width: 80 },
  buttonText: { fontSize: 16, fontWeight: '800' },
});
