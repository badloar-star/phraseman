/**
 * Unified player/bot profile card.
 * Used in Hall of Fame AND Clubs — same component, no differences.
 *
 * Props:
 *   player      — the player to display (null = hidden). Modal `visible` tied only to this — no
 *                 post-close snapshot, so Android never keeps an invisible touch-blocking layer.
 *   myInfo      — current user's own data (to detect isMe)
 *   onClose     — called when modal should close (parent sets player to null immediately)
 */
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Animated, Easing, Image, InteractionManager, Modal, Pressable, Text, View,
} from 'react-native';
import firestore from '@react-native-firebase/firestore';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from './ThemeContext';
import { useLang } from './LangContext';
import { usePremium } from './PremiumContext';
import AnimatedFrame from './AnimatedFrame';
import PremiumAvatarHalo from './PremiumAvatarHalo';
import { premiumMemberNameStyle } from './premiumMemberStyles';
import { getAvatarImageByIndex, getBestAvatarForLevel, getBestFrameForLevel } from '../constants/avatars';
import { getLevelFromXP } from '../constants/theme';
import { getTitleString } from '../constants/titles';
import { triLang, type Lang } from '../constants/i18n';
import { CLUBS, clubTierShortName } from '../app/league_engine';
import { arenaTierLabel } from '../app/arena_rating';
import type { RankTier } from '../app/types/arena';
import { getCurrentMultiplierBreakdown, MultiplierBreakdown, normalizeArenaMultipliersFirestore } from '../app/xp_manager';

export interface PlayerInfo {
  name: string;
  points: number;      // total XP (or weekXp when from club room)
  totalXp?: number;    // actual total XP (overrides points for level calc)
  weekXp?: number;
  isMe: boolean;
  avatar?: string;
  frame?: string;
  streak?: number | null;
  leagueId?: number;
  uid?: string;
  isPremium?: boolean;
}

interface MyInfo {
  name: string;
  avatar: string;
  frame: string;
  totalXP: number;
  leagueId?: number;
  streak?: number | null;
}

interface Props {
  player: PlayerInfo | null;
  myInfo: MyInfo;
  onClose: () => void;
}

const RANK_TIER_EMOJIS: Record<string, string> = {
  bronze: '🥉', silver: '🥈', gold: '🥇', platinum: '💎',
  diamond: '👑', master: '🔥', grandmaster: '⚡', legend: '🌟',
};

type BodyProps = {
  player: PlayerInfo;
  myInfo: MyInfo;
  resolvedTotalXp: number | null;
  slideAnim: Animated.Value;
  fadeAnim: Animated.Value;
  shimmerAnim: Animated.Value;
  onBackdropPress: () => void;
  duelRank: { tier: string; level: string; xp: number } | null;
  multipliers: MultiplierBreakdown | null;
};

function PlayerProfileModalBody({
  player,
  myInfo,
  resolvedTotalXp,
  slideAnim,
  fadeAnim,
  shimmerAnim,
  onBackdropPress,
  duelRank,
  multipliers,
}: BodyProps) {
  const { theme: t, themeMode, f } = useTheme();
  const { lang } = useLang();
  const { isPremium: myIsPremium } = usePremium();
  const isMe = player.isMe;
  const needsRemoteTotalXp = !isMe && !!player.uid && resolvedTotalXp === null && player.totalXp === undefined;
  const totalXp = isMe ? myInfo.totalXP : (resolvedTotalXp ?? player.totalXp ?? null);
  const safeTotalXp = totalXp ?? 0;
  const displayXp = isMe ? myInfo.totalXP : (totalXp ?? 0);
  const xp = displayXp;
  const level = getLevelFromXP(safeTotalXp);
  const streak = isMe ? (myInfo.streak ?? null) : (player.streak ?? null);
  const avatarStr = isMe
    ? String(getBestAvatarForLevel(level))
    : (player.avatar ? String(player.avatar) : String(getBestAvatarForLevel(level)));
  const frameId   = isMe ? myInfo.frame  : (player.frame  || getBestFrameForLevel(level).id);
  const avatarImage = getAvatarImageByIndex(parseInt(avatarStr));
  const leagueIdx = isMe
    ? (myInfo.leagueId ?? 0)
    : (player.leagueId ?? 0);
  const club = CLUBS[Math.max(0, Math.min(leagueIdx, CLUBS.length - 1))];
  const showPremium = isMe ? myIsPremium : (player.isPremium ?? false);
  const shimmerOpacity = shimmerAnim.interpolate({ inputRange: [0, 1], outputRange: [0.7, 1] });

  return (
    <Animated.View
      style={{
        flex: 1,
        backgroundColor: themeMode === 'ocean' || themeMode === 'sakura' ? 'rgba(0,0,0,0.42)' : 'rgba(0,0,0,0.55)',
        opacity: fadeAnim,
        justifyContent: 'flex-end',
      }}
    >
      <Pressable style={{ flex: 1 }} onPress={onBackdropPress} />
      <Animated.View style={{
        backgroundColor: t.bgCard,
        borderTopLeftRadius: 28, borderTopRightRadius: 28,
        padding: 24, paddingBottom: 40,
        transform: [{ translateY: slideAnim }],
        borderTopWidth: 0.5, borderColor: t.border,
      }}>
        <View style={{ width: 40, height: 4, borderRadius: 2, backgroundColor: t.border, alignSelf: 'center', marginBottom: 20 }} />
        {showPremium && (
          <Animated.View style={{
            opacity: shimmerOpacity,
            alignSelf: 'center',
            marginBottom: 12,
            backgroundColor: t.gold,
            borderRadius: 20,
            paddingHorizontal: 18,
            paddingVertical: 5,
            flexDirection: 'row',
            alignItems: 'center',
            gap: 6,
            shadowColor: t.gold,
            shadowOpacity: 0.6,
            shadowRadius: 8,
            elevation: 6,
          }}>
            <Ionicons name="star" size={13} color={t.correctText} />
            <Text style={{ color: t.correctText, fontWeight: '800', fontSize: f.label, letterSpacing: 1 }}>
              PREMIUM
            </Text>
            <Ionicons name="star" size={13} color={t.correctText} />
          </Animated.View>
        )}
        <View style={{ alignItems: 'center', marginBottom: 18 }}>
          <PremiumAvatarHalo enabled={showPremium} avatarSize={76} maskColor={t.bgCard}>
            <AnimatedFrame image={avatarImage} emoji={avatarStr} frameId={frameId} size={76} />
          </PremiumAvatarHalo>
          <Text style={premiumMemberNameStyle(
            { fontSize: f.h2, fontWeight: '700', color: t.textPrimary, marginTop: 10 },
            showPremium,
            themeMode,
          )}>
            {player.name}{isMe ? triLang(lang as Lang, { ru: ' (ты)', uk: ' (ти)', es: ' (tú)' }) : ''}
          </Text>
          <Text style={{ color: t.gold, fontSize: f.label, fontWeight: '600', marginTop: 2 }}>
            {needsRemoteTotalXp ? '...' : getTitleString(level, lang)}
          </Text>
        </View>
        <View style={{ flexDirection: 'row', gap: 10, marginBottom: 10 }}>
          <View style={{ flex: 1, backgroundColor: t.bgSurface, borderRadius: 14, padding: 14, alignItems: 'center' }}>
            <Text style={{ fontSize: f.numMd, fontWeight: '700', color: t.gold }}>
              {needsRemoteTotalXp ? '...' : xp.toLocaleString()}
            </Text>
            <Text style={{ color: t.textMuted, fontSize: f.label, marginTop: 3 }}>
              {triLang(lang as Lang, { ru: 'опыт', uk: 'досвід', es: 'experiencia' })}
            </Text>
          </View>
          <View style={{ flex: 1, backgroundColor: t.bgSurface, borderRadius: 14, padding: 14, alignItems: 'center' }}>
            <Text style={{ fontSize: f.numMd, fontWeight: '700', color: t.textPrimary }}>
              {needsRemoteTotalXp ? 'Lv...' : `Lv.${level}`}
            </Text>
            <Text style={{ color: t.textMuted, fontSize: f.label, marginTop: 3 }}>
              {triLang(lang as Lang, { ru: 'уровень', uk: 'рівень', es: 'nivel' })}
            </Text>
          </View>
          {streak !== null && (
            <View style={{ flex: 1, backgroundColor: t.bgSurface, borderRadius: 14, padding: 14, alignItems: 'center' }}>
              <Text style={{ fontSize: f.numMd, fontWeight: '700', color: t.textPrimary }}>🔥{streak}</Text>
              <Text style={{ color: t.textMuted, fontSize: f.label, marginTop: 3 }}>
                {triLang(lang as Lang, { ru: 'дней подряд', uk: 'днів поспіль', es: 'días seguidos' })}
              </Text>
            </View>
          )}
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: t.bgSurface, borderRadius: 14, padding: 14, marginBottom: 10 }}>
          {club.imageUri
            ? <Image source={club.imageUri} style={{ width: 32, height: 32, borderRadius: 6 }} resizeMode="contain" />
            : <Ionicons name={club.ionIcon as any} size={28} color={club.color} />
          }
          <View>
            <Text style={{ color: t.textPrimary, fontSize: f.body, fontWeight: '700' }}>
              {clubTierShortName(club, lang as Lang)}
            </Text>
            <Text style={{ color: t.textMuted, fontSize: f.sub }}>
              {triLang(lang as Lang, {
                ru: 'текущая лига',
                uk: 'поточна ліга',
                es: 'Liga actual',
              })}
            </Text>
          </View>
        </View>
        {isMe && multipliers && (
          <View style={{ backgroundColor: t.bgSurface, borderRadius: 14, padding: 14, marginBottom: 10 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <Text style={{ color: t.textPrimary, fontSize: f.body, fontWeight: '700' }}>
                {triLang(lang as Lang, {
                  ru: 'Модификаторы XP',
                  uk: 'Модифікатори XP',
                  es: 'Modificadores de XP',
                })}
              </Text>
              <View style={{ backgroundColor: multipliers.total > 1 ? t.correct : t.bgCard, borderRadius: 10, paddingHorizontal: 10, paddingVertical: 3 }}>
                <Text style={{ color: multipliers.total > 1 ? t.correctText : t.textMuted, fontWeight: '800', fontSize: f.label }}>
                  ×{multipliers.total.toFixed(2)}
                </Text>
              </View>
            </View>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
              {multipliers.clubM > 1 && (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: t.bgCard, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4 }}>
                  <Text style={{ fontSize: 13 }}>🏛️</Text>
                  <Text style={{ color: t.textSecond, fontSize: f.sub }}>
                    {triLang(lang as Lang, { ru: 'Лига', uk: 'Ліга', es: 'Liga' })} ×{multipliers.clubM.toFixed(1)}
                  </Text>
                </View>
              )}
              {multipliers.streakM > 1 && (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: t.bgCard, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4 }}>
                  <Text style={{ fontSize: 13 }}>🔥</Text>
                  <Text style={{ color: t.textSecond, fontSize: f.sub }}>
                    {triLang(lang as Lang, { ru: 'Стрик', uk: 'Стрік', es: 'Racha' })} ×{multipliers.streakM.toFixed(1)}
                  </Text>
                </View>
              )}
              {multipliers.comebackM > 1 && (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: t.bgCard, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4 }}>
                  <Text style={{ fontSize: 13 }}>⚡</Text>
                  <Text style={{ color: t.textSecond, fontSize: f.sub }}>
                    {triLang(lang as Lang, { ru: 'Камбэк', uk: 'Повернення', es: 'Vuelta' })} ×{multipliers.comebackM.toFixed(1)}
                  </Text>
                </View>
              )}
              {multipliers.giftM > 1 && (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: t.bgCard, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4 }}>
                  <Text style={{ fontSize: 13 }}>🎁</Text>
                  <Text style={{ color: t.textSecond, fontSize: f.sub }}>
                    {triLang(lang as Lang, { ru: 'Подарок', uk: 'Подарунок', es: 'Regalo' })} ×{multipliers.giftM.toFixed(1)}
                  </Text>
                </View>
              )}
              {multipliers.total === 1 && (
                <Text style={{ color: t.textMuted, fontSize: f.sub }}>
                  {triLang(lang as Lang, {
                    ru: 'Нет активных бонусов',
                    uk: 'Немає активних бонусів',
                    es: 'No hay bonificaciones activas',
                  })}
                </Text>
              )}
            </View>
          </View>
        )}
        {duelRank && (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: t.bgSurface, borderRadius: 14, padding: 14, marginBottom: 10 }}>
            <Text style={{ fontSize: f.numLg }}>{RANK_TIER_EMOJIS[duelRank.tier] ?? '⚔️'}</Text>
            <View>
              <Text style={{ color: t.textPrimary, fontSize: f.body, fontWeight: '700' }}>
                {arenaTierLabel(duelRank.tier as RankTier, lang as Lang)} {duelRank.level} · {duelRank.xp} XP
              </Text>
              <Text style={{ color: t.textMuted, fontSize: f.sub }}>
                {triLang(lang as Lang, {
                  ru: 'Ранг арены',
                  uk: 'Ранг арени',
                  es: 'Rango en la arena',
                })}
              </Text>
            </View>
          </View>
        )}
      </Animated.View>
    </Animated.View>
  );
}

function PlayerProfileModal({ player, myInfo, onClose }: Props) {
  const slideAnim = useRef(new Animated.Value(500)).current;
  const fadeAnim  = useRef(new Animated.Value(0)).current;
  const shimmerAnim = useRef(new Animated.Value(0)).current;

  const [duelRank, setDuelRank] = useState<{ tier: string; level: string; xp: number } | null>(null);
  const [multipliers, setMultipliers] = useState<MultiplierBreakdown | null>(null);
  const [resolvedTotalXp, setResolvedTotalXp] = useState<number | null>(null);

  // Только `player` с родителя — никакого «снимка» после onClose. Иначе на Android
  // прозрачный Modal с visible=true оставался невидимым перехватчиком касаний.
  const modalOpen = !!player;

  // Gold shimmer — пока открыт профиль
  useEffect(() => {
    if (!player) {
      return;
    }
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(shimmerAnim, { toValue: 1, duration: 1200, useNativeDriver: true }),
        Animated.timing(shimmerAnim, { toValue: 0, duration: 1200, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [player, shimmerAnim]);

  // Сброс при полном закрытии
  useEffect(() => {
    if (player) return;
    slideAnim.setValue(500);
    fadeAnim.setValue(0);
    setDuelRank(null);
    setMultipliers(null);
    setResolvedTotalXp(null);
  }, [player, slideAnim, fadeAnim]);

  // Открытие: анимация; данные — после interactions.
  useEffect(() => {
    if (!player) return;

    setDuelRank(null);
    setMultipliers(null);
    setResolvedTotalXp(player.totalXp ?? null);

    slideAnim.stopAnimation();
    fadeAnim.stopAnimation();
    Animated.parallel([
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 300,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(fadeAnim, { toValue: 1, duration: 220, useNativeDriver: true }),
    ]).start();

    let cancelled = false;
    const task: { cancel: () => void } = InteractionManager.runAfterInteractions(() => {
      if (cancelled) return;
      if (player.isMe) {
        getCurrentMultiplierBreakdown().then((m) => { if (!cancelled) setMultipliers(m); }).catch(() => {});
      }
      if (player.uid) {
        Promise.all([
          firestore().collection('arena_profiles').doc(player.uid).get(),
          firestore().collection('leaderboard').doc(player.uid).get(),
        ])
          .then(([arenaSnap, lbSnap]) => {
            if (cancelled) return;
            if (lbSnap.exists) {
              const lbData = lbSnap.data() as { points?: unknown };
              const lbTotal = Number(lbData?.points);
              if (Number.isFinite(lbTotal) && lbTotal >= 0) {
                setResolvedTotalXp(Math.floor(lbTotal));
              }
            }
            if (arenaSnap.exists) {
              const d = arenaSnap.data() as {
                rank?: { tier: string; level: string };
                xp?: number;
                stats?: { matchesPlayed?: number };
                multipliers?: unknown;
              };
              const mp = d.stats?.matchesPlayed;
              const hasPlayedAtLeastOne =
                typeof mp === 'number'
                  ? mp >= 1
                  : (d.stats === undefined ? (d.xp ?? 0) > 0 : false);
              if (hasPlayedAtLeastOne && d?.rank) {
                setDuelRank({ tier: d.rank.tier, level: d.rank.level, xp: d.xp ?? 0 });
              }
              if (!player.isMe && d?.multipliers) {
                const norm = normalizeArenaMultipliersFirestore(d.multipliers);
                if (norm) setMultipliers(norm);
              }
            }
          })
          .catch(() => {});
      }
    });
    return () => {
      cancelled = true;
      task?.cancel?.();
    };
  }, [player]);

  const handleClose = useCallback(() => {
    onClose();
  }, [onClose]);

  return (
    <Modal
      visible={modalOpen}
      transparent
      animationType="none"
      onRequestClose={handleClose}
      hardwareAccelerated
      statusBarTranslucent
    >
      {player && (
        <PlayerProfileModalBody
          player={player}
          myInfo={myInfo}
          resolvedTotalXp={resolvedTotalXp}
          slideAnim={slideAnim}
          fadeAnim={fadeAnim}
          shimmerAnim={shimmerAnim}
          onBackdropPress={handleClose}
          duelRank={duelRank}
          multipliers={multipliers}
        />
      )}
    </Modal>
  );
}

export default PlayerProfileModal;
