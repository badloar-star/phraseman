import { useStableSafeAreaInsets } from '../app/stable_safe_area_metrics';
/**
 * Визитка игрока PhraseMan 2.0 (Liquid Glass) — перенос утверждённого макета
 * profile-card-pro.html (владелец 2026-09-30, D73/D93/D108/D114).
 *
 * • Две визитки: обычная и «Про» (6 стилей A–F). «Про» явно отличается: бейдж PRO,
 *   свой фон/украшения/кант/главная кнопка, свой текст до 80 символов.
 * • Идентичность = монета ранга (авторитетная проекция). Нет публичного ранга —
 *   нейтральный диск; чужой визитке НИКОГДА не подставляется ранг текущего аккаунта.
 * • Косметики нет (D108): ни аур, ни купленных аватаров.
 * • Своя визитка: «Повысить ранг» с эпичной анимацией прямо в визитке, «Про визитка»
 *   (покупка со стилем) / «Стиль» (бесплатно), карандаш у своего текста (только «Про»).
 */
import React, { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  Easing,
  Modal,
  Platform,
  Pressable,
  Share,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
  type LayoutChangeEvent,
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter } from 'expo-router';

import { useLang } from './LangContext';
import { triLang, type Lang } from '../constants/i18n';
import { isSyntheticUid } from '../app/synthetic_friend_requests';
import ReportUserModal from './ReportUserModal';
import { hapticTap } from '../hooks/use-haptics';
import { normalizeSafeAreaBottomInset } from '../hooks/use-screen';
import { useReduceMotion } from '../hooks/use_reduce_motion';
import { useMyCoinRank } from '../hooks/use_my_coin_rank';
import { coinRankRowForDisplay, coinRankTitle } from '../app/coin_rank_table_v1';
import { resolvePlayerProfileVisibleRank } from '../app/player_profile_v2_state';
import { DebugLogger } from '../app/debug-logger';
import { fetchPublicProfileCard, loadPublicProfileCardDisk, peekPublicProfileCardOrStale, type PublicProfileCard } from '../app/profile_card_public';
import { PROFILE_CARD_PRO_PRICE_COINS } from '../app/profile_card_pro_v1';
import { resolveProfileCardLook } from '../app/profile_card_styles';
import InGameToast from './InGameToast';
import ThemedConfirmModal from './ThemedConfirmModal';
import ProfileCardBackdrop from './profile-card/ProfileCardBackdrop';
import ProfileCardBioSheet from './profile-card/ProfileCardBioSheet';
import ProfileCardBody from './profile-card/ProfileCardBody';
import ProfileCardCoin, { CoinImage, GoldRing } from './profile-card/ProfileCardCoin';
import { useIsPlus } from './plus/use_is_plus';
import { isPlusProfile } from './plus/plus_ring_spec';
import { ProfileCardOtherFooter, ProfileCardSelfFooter } from './profile-card/ProfileCardFooter';
import { ProBadge } from './profile-card/ProfileCardParts';
import ProfileCardProSheet from './profile-card/ProfileCardProSheet';
import { RankUpCardGlow, RankUpStageFx, useRankChipStyles, useRankUpTimeline } from './profile-card/ProfileCardRankUp';
import { PROFILE_CARD_LOOKS } from './profile-card/profile_card_looks';
import { PC, t4 } from './profile-card/profile_card_copy';
import { usePlayerProfileSocial } from './profile-card/usePlayerProfileSocial';
import { useSelfProfileCard } from './profile-card/useSelfProfileCard';
import ReanimatedView from 'react-native-reanimated';
import { noAndroidOutline } from '../constants/androidGlow';
import { SheetSwipeRoot } from './modal_fx/SheetSwipeClose';
import { NATIVE_MODAL_DISMISS_GAP_MS } from '../app/safe_modal_navigation';
import FriendCardStats from './friends_together/FriendCardStats';
// зачем (координатор 22.10, tsc на HEAD): тип — прямо из модуля, где он объявлен, без переэкспорта через компонент
import type { FriendCardStatsData } from '../app/friends_together/pair_card_stats';

const EXEMPT_COLOR_1 = '#FFFFFF'; // theme-exempt: слой поверх обложки профиля — постоянные белый/чёрный
const EXEMPT_COLOR_2 = '#FFFFFF'; // theme-exempt: слой поверх обложки профиля — постоянные белый/чёрный
const EXEMPT_COLOR_3 = 'rgba(255,255,255,0.14)'; // theme-exempt: слой поверх обложки профиля — постоянные белый/чёрный

const LOG = '[PROFILE-CARD]';

export interface PlayerInfo {
  name: string;
  points: number;
  isMe: boolean;
  uid?: string;
  friendUid?: string;
  /** Public rank supplied by an authoritative public-profile projection. */
  coinRank?: number | null;
  isPremium?: boolean;
  isVip?: boolean;
  isLifetime?: boolean;
  /** Настоящий Plus и срок (Ядро 22.10) — кольцо чужого по isPlusProfile. */
  isPlus?: boolean | null;
  plusUntilMs?: number | null;
  /** Retained only for caller compatibility while the retired card system is removed elsewhere. */
  avatar?: string;
  frame?: string;
  aura?: string;
  streak?: number | null;
  profileCardLevel?: number;
  profileCardTheme?: string;
  profileCardMotion?: string;
  profileCardPublicFocus?: string;
  devProfileCardLevelOverride?: number;
  /** Визитка «Про» (public_profiles): если вызывающий уже знает — без лишнего чтения. */
  profileCardPro?: boolean;
  profileCardStyle?: string;
  profileCardBio?: string;
  /**
   * «Серия вдвоём» (идея 1): дни серии · этаж Пика · дней вдвоём — только визитка друга и только при выключателе «Вместе»;
   * нет поля — визитка прежняя.
   */
  pairStats?: FriendCardStatsData | null;
}

interface MyInfo {
  name: string;
  avatar: string;
  frame: string;
  aura?: string;
  streak?: number | null;
}

interface Props {
  player: PlayerInfo | null;
  myInfo: MyInfo;
  onClose: () => void;
  /** Native dismissal completed; callers can safely present another modal. */
  onDismissed?: () => void;
  /** Kept as a no-op compatibility prop for the retired showcase. */
  motionVariant?: 'classic' | 'hybrid';
}

const CARD_RADIUS = 38;
/** Окно защиты от двойного тапа «Повысить ранг» на визитке (после него кнопка снова ведёт на /coin_rank). */
const RANK_UPGRADE_TAP_GUARD_MS = 1000;
const CARD_CY = 0.36;

type BodyProps = {
  player: PlayerInfo;
  myInfo: MyInfo;
  slideAnim: Animated.Value;
  fadeAnim: Animated.Value;
  onBackdropPress: () => void;
  onClose: () => void;
  onFriendRequestToast: (message: string, toastType?: 'error' | 'info') => void;
  backInterceptRef?: React.MutableRefObject<(() => boolean) | null>;
};

function PlayerProfileModalBody({
  player,
  myInfo,
  slideAnim,
  fadeAnim,
  onBackdropPress,
  onClose,
  onFriendRequestToast,
  backInterceptRef,
}: BodyProps) {
  const { lang } = useLang();
  const L = lang as Lang;
  const insets = useStableSafeAreaInsets();
  const { height: windowHeight } = useWindowDimensions();
  const reduceMotion = useReduceMotion();
  const topInset = Math.max(0, insets.top);
  const bottomInset = normalizeSafeAreaBottomInset(insets.bottom);
  const cardBottom = Math.max(12, bottomInset - 4);
  const cardHeight = Math.max(420, Math.min(640, windowHeight - topInset - bottomInset - 10));
  const isMe = player.isMe;
  // зачем (владелец 21.10, реестр №6): Plus у человека на визитке — кольцо у монеты и метка «◆ Plus» у имени. Себе — живой статус, другим — публичный профиль
  const myIsPlus = useIsPlus();
  const plus = isMe ? myIsPlus : isPlusProfile(player);
  const myCoinRank = useMyCoinRank();
  const publicRank = player.coinRank ?? null;
  const visibleRank = resolvePlayerProfileVisibleRank({
    isMe,
    myRank: myCoinRank,
    publicRank: publicRank,
  });
  const rankRow = visibleRank === null ? null : coinRankRowForDisplay(visibleRank);

  // ── Своя визитка: ранг, баланс, «Про», свой текст (components/profile-card/useSelfProfileCard) ──
  const self = useSelfProfileCard(isMe, L, onFriendRequestToast);
  const { myPro, myProOwned, sheet, setSheet, visibleCeremony } = self;
  const router = useRouter();
  // зачем (координатор 05.10, Сверка 04:45): «Повысить ранг» на визитке НЕ тратит монеты — закрывает визитку и
  // открывает экран подтверждения app/coin_rank.tsx (стоимость, баланс, «Проверяем повышение», трата только по его
  // кнопке, защита от повтора). При нехватке монет кнопка визитки неактивна, как и раньше (ProfileCardFooter).
  // Два быстрых тапа до того, как окно убрано, не кладут экран подтверждения в стек дважды. Флаг сбрасывается при
  // каждом открытии визитки (смена player), чтобы после закрытия и повторного открытия кнопка снова работала —
  // даже если тело визитки не размонтировалось (координатор 05.10).
  const rankUpgradeNavigatedRef = useRef(false);
  useEffect(() => {
    rankUpgradeNavigatedRef.current = false;
  }, [player]);
  const describeRankUpgradeTap = self.describeRankUpgradeTap;
  const openRankUpgradeConfirm = useCallback(() => {
    if (rankUpgradeNavigatedRef.current) return;
    rankUpgradeNavigatedRef.current = true;
    describeRankUpgradeTap();
    onClose();
    router.push('/coin_rank' as never);
    // Второй сброс — на случай повторного открытия с тем же player без размонтирования: окно от двойного тапа 1 с.
    setTimeout(() => { rankUpgradeNavigatedRef.current = false; }, RANK_UPGRADE_TAP_GUARD_MS);
  }, [describeRankUpgradeTap, onClose, router]);
  // зачем (30.09): системный «Назад» сначала закрывает открытую шторку (покупка/стиль/текст),
  // и только потом — всю визитку. Шторка живёт здесь, «Назад» ловит внешний <Modal>.
  useEffect(() => {
    if (!backInterceptRef) return undefined;
    backInterceptRef.current = () => {
      if (sheet === 'none') return false;
      setSheet('none');
      return true;
    };
    return () => { backInterceptRef.current = null; };
  }, [backInterceptRef, setSheet, sheet]);

  // ── Чужая визитка: «Про», стиль, свой текст из public_profiles ──
  const targetUid = player.friendUid || player.uid || '';
  const providedCard: PublicProfileCard | null = player.profileCardPro !== undefined
    ? { pro: player.profileCardPro === true, style: null, bio: '' }
    : null;
  // зачем (координатор 13.10): первый кадр берёт свежую ИЛИ устаревшую копию (память, диск) — Pro-друг не мигает «обычным»; свежесть обеспечивает fetchPublicProfileCard ниже, число чтений прежнее.
  const [otherCard, setOtherCard] = useState<PublicProfileCard | null>(() => (
    !isMe && targetUid ? peekPublicProfileCardOrStale(targetUid) : null
  ));
  useEffect(() => {
    if (isMe || !targetUid || isSyntheticUid(targetUid)) {
      setOtherCard(null);
      return undefined;
    }
    let cancelled = false;
    void loadPublicProfileCardDisk().then(() => {
      if (!cancelled) setOtherCard((current) => current ?? peekPublicProfileCardOrStale(targetUid));
    });
    setOtherCard(peekPublicProfileCardOrStale(targetUid));
    void fetchPublicProfileCard(targetUid).then((card) => {
      if (!cancelled) setOtherCard(card);
    });
    return () => { cancelled = true; };
  }, [isMe, targetUid]);

  const cardPro = isMe
    ? myProOwned
    : (otherCard?.pro ?? providedCard?.pro ?? false);
  const cardStyle: unknown = isMe
    ? myPro?.style ?? null
    : otherCard?.style ?? player.profileCardStyle ?? null;
  const look = resolveProfileCardLook({ pro: cardPro, style: cardStyle });
  const tokens = PROFILE_CARD_LOOKS[look];
  const isPro = look !== 'normal';
  const bioText = isMe
    ? (myProOwned ? self.myBio : '')
    : (isPro ? (otherCard?.bio ?? player.profileCardBio ?? '') : '');

  // ── Социальные действия: друзья, лайк, жалоба (components/profile-card/usePlayerProfileSocial) ──
  const social = usePlayerProfileSocial(player, myInfo.name, L, onFriendRequestToast);
  const {
    friendRequestTargetUid, showAddFriend, isAlreadyFriend, isFriendRequestSent, friendRequestBusy,
    canLike, likedThisProfile, likeBusy, activityLikeTotal, relationshipText, friendActionLabel,
    handleFriendButtonPress, handleToggleLike, handleRemoveFriendConfirm,
    removeFriendConfirmOpen, setRemoveFriendConfirmOpen, reportUserOpen, setReportUserOpen,
  } = social;
  useEffect(() => {
    setSheet('none');
  }, [player.friendUid, player.uid, setSheet]);

  // ── Повышение ранга прямо в визитке ──
  const rankUpT = useRankUpTimeline(visibleCeremony !== null, reduceMotion, self.dismissCeremony);
  const chipStyles = useRankChipStyles(rankUpT);

  const handleShare = useCallback(() => {
    hapticTap();
    // зачем (Сверка 04:45: при rank=5 визитка писала «ранг 6»): ранги 0…19 показываются как есть — так же, как
    // макет coins.html («Лектор · ранг 5», «Ранг 5 → 6») и экран coin_rank.tsx.
    const title = rankRow ? `${coinRankTitle(rankRow.rank, L)} · ${t4(L, PC.rank)} ${rankRow.rank}` : '';
    const message = `${t4(L, PC.shareText)}: ${player.name}${title ? ` — ${title}` : ''}${bioText ? `\n«${bioText}»` : ''}`;
    DebugLogger.info(LOG, `поделиться: открываем системное окно ${JSON.stringify({ look, hasBio: !!bioText })}`);
    Share.share({ message }).catch((error: unknown) => {
      DebugLogger.warn(LOG, `поделиться: системное окно упало ${String(error)}`);
    });
  }, [bioText, L, look, player.name, rankRow]);

  // ── Геометрия сцены ──
  const [stage, setStage] = useState({ width: 0, height: 0 });
  const onStageLayout = useCallback((event: LayoutChangeEvent) => {
    const { width, height } = event.nativeEvent.layout;
    setStage((prev) => (prev.width === width && prev.height === height ? prev : { width, height }));
  }, []);
  const k = stage.width > 0 ? Math.max(0.82, Math.min(1.1, stage.width / 370)) : 1;
  const coinSize = Math.round(tokens.coin * k);
  const cx = stage.width / 2;
  const cy = stage.height * CARD_CY;
  const animate = !reduceMotion && sheet === 'none';

  const cardEnter = useMemo(() => ({
    opacity: slideAnim.interpolate({ inputRange: [0, 60], outputRange: [1, 0.4], extrapolate: 'clamp' }),
    transform: [
      { translateY: slideAnim },
      { scale: slideAnim.interpolate({ inputRange: [0, 60], outputRange: [1, 0.97], extrapolate: 'clamp' }) },
    ],
  }), [slideAnim]);

  const closeLabel = t4(L, PC.close);
  const topIcon = (testID: string, icon: React.ComponentProps<typeof Ionicons>['name'], label: string, onPress: () => void) => (
    <Pressable
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel={label}
      hitSlop={4}
      onPress={onPress}
      style={({ pressed }) => [styles.topIcon, { opacity: pressed ? 0.7 : 1 }]}
    >
      <Ionicons name={icon} size={20} color={EXEMPT_COLOR_1} />
    </Pressable>
  );

  return (
    <>
      <Animated.View style={[styles.backdrop, { opacity: fadeAnim }]}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={closeLabel}
          style={StyleSheet.absoluteFillObject}
          onPress={onBackdropPress}
        />
        <Animated.View
          testID="player-profile-modal-sheet"
          accessibilityViewIsModal
          accessibilityLabel={`${relationshipText}: ${player.name}`}
          style={[styles.card, { height: cardHeight, bottom: cardBottom, backgroundColor: tokens.bg }, cardEnter]}
        >
          <View style={styles.stage} onLayout={onStageLayout}>
            {stage.width > 0 ? (
              <ProfileCardBackdrop look={look} width={stage.width} height={stage.height} cy={CARD_CY} animate={animate} k={k} />
            ) : null}
            {visibleCeremony && stage.width > 0 ? (
              <>
                {look === 'obs' ? (
                  <View pointerEvents="none" style={{ position: 'absolute', left: cx - coinSize / 2, top: cy - coinSize / 2, width: coinSize, height: coinSize }}>
                    <GoldRing size={coinSize} />
                  </View>
                ) : null}
                <RankUpStageFx
                  t={rankUpT}
                  width={stage.width}
                  height={stage.height}
                  cx={cx}
                  cy={cy}
                  coin={coinSize}
                  pro={isPro}
                  fromRank={visibleCeremony.fromRank}
                  toRank={visibleCeremony.toRank}
                />
              </>
            ) : stage.width > 0 ? (
              <View
                testID="profile-card-coin"
                accessible
                accessibilityLabel={rankRow ? coinRankTitle(rankRow.rank, L) : t4(L, PC.rankUnknown)}
                style={{ position: 'absolute', left: cx - coinSize / 2, top: cy - coinSize / 2 }}
              >
                <ProfileCardCoin look={look} rank={visibleRank} size={coinSize} animate={animate} plus={plus} plusSurface={tokens.bg} />
              </View>
            ) : null}

            <View style={styles.top} pointerEvents="box-none">
              <View style={styles.topGroup}>
                {isPro && tokens.badge ? <ProBadge fill={tokens.badge.fill} text={tokens.badge.text} radius={tokens.badge.radius} /> : null}
              </View>
              <View style={styles.topGroup}>
                {isMe
                  ? topIcon('profile-card-share', 'share-outline', t4(L, PC.share), handleShare)
                  : friendRequestTargetUid
                    ? topIcon('player-profile-report-user', 'ellipsis-horizontal', t4(L, PC.more), () => {
                        hapticTap();
                        setReportUserOpen(true);
                      })
                    : null}
                <Pressable
                  testID="player-profile-close"
                  accessibilityRole="button"
                  accessibilityLabel={closeLabel}
                  hitSlop={4}
                  onPress={onClose}
                  style={({ pressed }) => [styles.topIcon, { opacity: pressed ? 0.7 : 1 }]}
                >
                  <Ionicons name="close" size={20} color={EXEMPT_COLOR_2} />
                </Pressable>
              </View>
            </View>

            {visibleCeremony ? (
              <ReanimatedView.View testID="profile-card-rankup-banner" pointerEvents="none" style={[styles.bannerWrap, chipStyles.banner]}>
                <View style={styles.banner}>
                  <CoinImage rank={visibleCeremony.toRank} size={24} />
                  <Text style={styles.bannerText}>
                    {`${t4(L, PC.newRank)}: ${coinRankTitle(visibleCeremony.toRank, L)}`}
                  </Text>
                </View>
              </ReanimatedView.View>
            ) : null}

            <ProfileCardBody
              lang={L}
              tokens={tokens}
              name={player.name}
              rank={visibleRank}
              ceremony={visibleCeremony}
              chipStyles={chipStyles}
              bioText={bioText}
              canEditBio={isMe && myProOwned}
              showLock={isMe && myPro !== null && !myProOwned}
              onEditBio={() => setSheet('bio')}
              onOpenBuy={() => setSheet('buy')}
              plus={plus}
            />
            {!isMe && player.pairStats ? <FriendCardStats stats={player.pairStats} tokens={tokens} lang={L} /> : null}
          </View>
          {isMe ? (
            <ProfileCardSelfFooter
              lang={L}
              tokens={tokens}
              rank={visibleRank}
              next={self.next}
              isMaxRank={self.isMaxRank}
              balance={self.balance}
              eligible={self.eligible}
              busy={self.upgrading}
              upgradingNow={visibleCeremony !== null}
              proOwned={myPro === null ? null : myProOwned}
              proPrice={PROFILE_CARD_PRO_PRICE_COINS}
              onUpgrade={openRankUpgradeConfirm}
              onOpenBuy={() => setSheet('buy')}
              onOpenStyle={() => setSheet('style')}
            />
          ) : (
            <ProfileCardOtherFooter
              lang={L}
              tokens={tokens}
              showAddFriend={showAddFriend}
              isFriend={isAlreadyFriend}
              requestSent={isFriendRequestSent}
              friendBusy={friendRequestBusy}
              friendLabel={friendActionLabel}
              onFriendPress={handleFriendButtonPress}
              canLike={canLike}
              liked={likedThisProfile}
              likeBusy={likeBusy}
              likeTotal={activityLikeTotal}
              onLikePress={handleToggleLike}
            />
          )}
          <View pointerEvents="none" style={[styles.edge, { borderColor: tokens.edge, borderWidth: tokens.edgeWidth }]} />
          {visibleCeremony && isPro ? <RankUpCardGlow t={rankUpT} radius={CARD_RADIUS} /> : null}
        </Animated.View>

        {sheet !== 'none' ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t4(L, PC.cancel)}
            style={styles.dim2}
            onPress={() => setSheet('none')}
          />
        ) : null}
        {isMe && (sheet === 'buy' || (sheet === 'style' && myProOwned)) ? (
          <ProfileCardProSheet
            mode={sheet === 'buy' ? 'buy' : 'change'}
            lang={L}
            name={player.name}
            rank={visibleRank}
            currentStyle={myPro?.style ?? null}
            balance={self.balance}
            price={PROFILE_CARD_PRO_PRICE_COINS}
            busy={self.proBusy}
            animate={!reduceMotion}
            bottomInset={bottomInset}
            onConfirm={(style) => { void self.handleProConfirm(style); }}
            onClose={() => setSheet('none')}
          />
        ) : null}
        {/* Поле своего текста — ТОЛЬКО владельцу «Про» на своей визитке. */}
        {sheet === 'bio' && isMe && myProOwned ? (
          <ProfileCardBioSheet
            lang={L}
            initialText={self.myBio}
            saving={self.bioSaving}
            bottomInset={bottomInset}
            onSave={self.handleSaveBio}
            onClose={() => setSheet('none')}
          />
        ) : null}
      </Animated.View>

      {renderProfileModalOverlays(
        player,
        lang,
        removeFriendConfirmOpen,
        setRemoveFriendConfirmOpen,
        handleRemoveFriendConfirm,
        reportUserOpen,
        setReportUserOpen,
        bioText,
      )}
    </>
  );
}

// зачем: подтверждение удаления друга и жалоба рендерятся ВНЕ визитки (свои Modal).
// Жалоба знает свой текст визитки — там появляется причина «неприемлемый текст визитки».
function renderProfileModalOverlays(
  player: PlayerInfo,
  lang: string,
  removeFriendConfirmOpen: boolean,
  setRemoveFriendConfirmOpen: (v: boolean) => void,
  handleRemoveFriendConfirm: () => void,
  reportUserOpen: boolean,
  setReportUserOpen: (v: boolean) => void,
  profileText: string,
) {
  return (
    <>
      <ThemedConfirmModal
        visible={removeFriendConfirmOpen}
        title={triLang(lang as Lang, {
          ru: 'Удалить друга?', uk: 'Видалити друга?', es: '¿Eliminar amigo?', en: 'Delete friend?', 'pt-BR': 'Remover amigo?',
          vi: 'Xóa bạn bè?', id: 'Hapus teman?', tr: 'Arkadaş silinsin mi?', pl: 'Usunąć znajomego?',
        })}
        message={player.name}
        cancelLabel={triLang(lang as Lang, {
          ru: 'Отмена', uk: 'Скасувати', es: 'Cancelar', en: 'Cancel', 'pt-BR': 'Cancelar', vi: 'Hủy', id: 'Batal', tr: 'İptal', pl: 'Anuluj',
        })}
        confirmLabel={triLang(lang as Lang, {
          ru: 'Удалить', uk: 'Видалити', es: 'Eliminar', en: 'Delete', 'pt-BR': 'Remover', vi: 'Xóa', id: 'Hapus', tr: 'Sil', pl: 'Usuń',
        })}
        confirmVariant="default"
        onCancel={() => setRemoveFriendConfirmOpen(false)}
        onConfirm={handleRemoveFriendConfirm}
      />
      <ReportUserModal
        visible={reportUserOpen}
        reportedUid={player.friendUid || player.uid || ''}
        reportedName={player.name}
        reportedProfileText={profileText}
        screen="profile"
        lang={lang as Lang}
        onClose={() => setReportUserOpen(false)}
      />
    </>
  );
}

function PlayerProfileModal({ player, myInfo, onClose, onDismissed }: Props) {
  const slideAnim = useRef(new Animated.Value(60)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const [friendToast, setFriendToast] = useState<string | null>(null);
  const [friendToastType, setFriendToastType] = useState<'error' | 'info'>('info');
  const reduceMotion = useReduceMotion();
  const modalOpen = !!player;
  const modalOpenRef = useRef(modalOpen);
  modalOpenRef.current = modalOpen;
  const wasPresentedRef = useRef(modalOpen);
  if (modalOpen) wasPresentedRef.current = true;
  const onDismissedRef = useRef(onDismissed);
  onDismissedRef.current = onDismissed;
  const notifyDismissed = useCallback(() => {
    if (modalOpenRef.current || !wasPresentedRef.current) return;
    wasPresentedRef.current = false;
    onDismissedRef.current?.();
  }, []);
  useEffect(() => {
    // iOS supplies the native completion event. Android does not guarantee it;
    // a bounded gap prevents the next sheet racing the closing native window.
    if (modalOpen || Platform.OS === 'ios' || !wasPresentedRef.current) return;
    const timer = setTimeout(notifyDismissed, NATIVE_MODAL_DISMISS_GAP_MS);
    return () => clearTimeout(timer);
  }, [modalOpen, notifyDismissed]);

  useEffect(() => {
    if (modalOpen) return;
    slideAnim.setValue(60);
    fadeAnim.setValue(0);
    setFriendToast(null);
  }, [fadeAnim, modalOpen, slideAnim]);

  useEffect(() => {
    if (!modalOpen) return;
    slideAnim.stopAnimation();
    fadeAnim.stopAnimation();
    if (reduceMotion) slideAnim.setValue(0);
    // Макет .vz-card: появление 560 мс, cubic-bezier(.18,1,.3,1).
    Animated.parallel([
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: reduceMotion ? 0 : 560,
        easing: Easing.bezier(0.18, 1, 0.3, 1),
        useNativeDriver: true,
      }),
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: reduceMotion ? 150 : 220,
        useNativeDriver: true,
      }),
    ]).start();
  }, [fadeAnim, modalOpen, reduceMotion, slideAnim]);

  const handleClose = useCallback(() => {
    onClose();
  }, [onClose]);
  const backInterceptRef = useRef<(() => boolean) | null>(null);
  const handleHardwareBack = useCallback(() => {
    if (backInterceptRef.current?.()) return;
    onClose();
  }, [onClose]);

  const showFriendRequestToast = useCallback(
    (message: string, toastType: 'error' | 'info' = 'info') => {
      setFriendToastType(toastType);
      setFriendToast(message);
    },
    [],
  );

  return (
    <Modal
      visible={modalOpen}
      transparent
      animationType="none"
      onRequestClose={handleHardwareBack}
      onDismiss={notifyDismissed}
      hardwareAccelerated
      statusBarTranslucent
      navigationBarTranslucent
    >
      {/* зачем (координатор 14.10, «ручка ⇒ свайп»): корень жестов внутри Modal — шторки «Про»/«О себе» закрываются свайпом вниз */}
      <SheetSwipeRoot>
      {player ? (
        <View style={styles.modalFill} pointerEvents="box-none">
          <PlayerProfileModalBody
            player={player}
            myInfo={myInfo}
            slideAnim={slideAnim}
            fadeAnim={fadeAnim}
            onBackdropPress={handleClose}
            onClose={handleClose}
            onFriendRequestToast={showFriendRequestToast}
            backInterceptRef={backInterceptRef}
          />
          <InGameToast
            message={friendToast}
            type={friendToastType}
            onHide={() => setFriendToast(null)}
          />
        </View>
      ) : null}
      </SheetSwipeRoot>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalFill: { flex: 1 },
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.58)' }, // theme-exempt: слой поверх обложки профиля — постоянные белый/чёрный
  card: {
    position: 'absolute',
    left: 10,
    right: 10,
    borderRadius: CARD_RADIUS,
    overflow: 'hidden',
    shadowColor: '#000', // theme-exempt: слой поверх обложки профиля — постоянные белый/чёрный
    shadowOpacity: 0.6,
    shadowRadius: 40, // guard-ok: одна тень визитки (.vz-card box-shadow 0 30 80)
    shadowOffset: { width: 0, height: 30 },
    elevation: 24,
  },
  stage: { flex: 1, minHeight: 0, overflow: 'hidden' },
  edge: { ...StyleSheet.absoluteFillObject, borderRadius: CARD_RADIUS }, // guard-ok: кант визитки .vz-edge (1–1,5pt полупрозрачный, стиль 2.0)
  top: {
    position: 'absolute', top: 16, left: 16, right: 16, zIndex: 12,
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
  },
  topGroup: { flexDirection: 'row', alignItems: 'center', gap: 8, minHeight: 44 },
  topIcon: {
    width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.34)', // theme-exempt: слой поверх обложки профиля — постоянные белый/чёрный
    borderWidth: 1, borderColor: EXEMPT_COLOR_3, // guard-ok: .vz-ic hairline из макета shadow-ok: кромка круглой кнопки поверх обложки профиля из макета, не контейнер
  },
  bannerWrap: { position: 'absolute', top: 66, left: 0, right: 0, alignItems: 'center', zIndex: 13 },
  banner: {
    height: 38, borderRadius: 19, paddingLeft: 8, paddingRight: 16, flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: 'rgba(255,255,255,0.95)', // theme-exempt: слой поверх обложки профиля — постоянные белый/чёрный
    shadowColor: '#000', shadowOpacity: 0.35, shadowRadius: 15, shadowOffset: { width: 0, height: 10 }, ...noAndroidOutline, // theme-exempt: слой поверх обложки профиля — постоянные белый/чёрный
  },
  bannerText: { color: '#111111', fontSize: 16, fontWeight: '700' }, // theme-exempt: слой поверх обложки профиля — постоянные белый/чёрный
  dim2: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.5)' }, // theme-exempt: слой поверх обложки профиля — постоянные белый/чёрный
});

export default memo(PlayerProfileModal);
