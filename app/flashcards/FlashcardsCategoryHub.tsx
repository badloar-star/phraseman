/**
 * cards-2.0 (E3): хаб карточек → дашборд из секций (§3.1 мастер-плана).
 * Секции сверху вниз: хедер с балансом, hero-CTA (review/тренер/empty),
 * «Продолжить», «Мои колоды», «Режимы практики», «Магазин наборов»,
 * «Сообщество» (UGC), футер «Сообщить о баге».
 * Вход секций — каскад FadeInDown (FC_STAGGER), spring-press на плитках,
 * всё уважает reduceMotion / lowPower.
 */
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AccessibilityInfo,
  Modal,
  Pressable,
  Platform,
  ScrollView,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View,
  type ImageSourcePropType,
  type ViewStyle,
} from 'react-native';
import Reanimated, {
  Easing,
  FadeInDown,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { triLang } from '../../constants/i18n';
import type { Lang } from '../../constants/i18n';
import type { Theme, ThemeMode } from '../../constants/theme';
import { FC_SPRING, FC_TIMING, fcStaggerDelay } from '../../constants/flashcards_motion';
import { CATEGORIES } from './constants';
import { packHubCodeName, packTitleForInterface, packCategoryIonIcon, type FlashcardMarketPack } from './marketplace';
import { useCardPackShardPaywall } from './useCardPackShardPaywall';
import { selectHeroCta, phrasesAndCardsCountLabel, badgeCountLabel, type HeroCtaKind } from './hub_hero';
import { isLowPowerEffective } from './low_power';
import { readCustomCards, readFlashcardsProgress, type FlashcardsProgress } from './storage';
import DeckPickerSheet, { type DeckSheetOption } from './DeckPickerSheet';
import { getLastPreset, type FcModePreset } from './mode_prefs';
import {
  claimCheckpoint,
  claimMilestone,
  getDeckBestMap,
  getMilestonesState,
  getStarsState,
  getWeeklyProgress,
  isDeckFaded,
  type DeckBestMap,
  type MilestonesState,
} from './stars_system';
import { PERFECT_SESSION_XP_BOOST_MULT, WEEKLY_STAR_CHECKPOINTS } from './stars_config';

import { oskolokImageForPackShards } from '../oskolok';
import { actionToastTri, emitAppEvent, onAppEvent } from '../events';
import { stageOwnedPackCardsForNavigation } from '../flashcards_collection';
import { hasMeaningfulCommunityPackCreateDraft } from '../community_packs/communityPackDraftStorage';
import { stageCommunityPackCardsForNavigation } from '../community_packs/staging';
import { bundledPackTilePng } from './packMarketplaceIcons';
import ReportErrorButton from '../../components/ReportErrorButton';
import ThemedConfirmModal from '../../components/ThemedConfirmModal';
import ReportPackModal from '../../components/ReportPackModal';
import { hideCommunityPackOnDevice, loadHiddenCommunityPackIds } from '../community_packs/communityPackHiddenStorage';
import { getEffectivePlatformOS } from '../platform_ui_preview';
import { hapticSuccess, hapticTap } from '../../hooks/use-haptics';
import { countDueItemsToday } from '../active_recall';
import { getTrainerTotalDue } from '../trainer_store';
import { loadFlashcards } from '../../hooks/use-flashcards';

const ReanimatedPressable = Reanimated.createAnimatedComponent(Pressable);

type Props = {
  lang: Lang;
  t: Theme;
  marketPacks: FlashcardMarketPack[];
  ownedPackIds: string[];
  shardBalance: number;
  onMarketRefresh: () => void | Promise<void>;
  /** Вкладки «Мої / Спільнота» + UGC-каталог (без Expo Go, з cloud). */
  cloudCommunityEnabled?: boolean;
  communityPacks?: FlashcardMarketPack[];
  ownedCommunityPackIds?: string[];
  /** Stable id автора — кнопка «редагувати» на своїх UGC. */
  hubAuthorStableId?: string | null;
  /** Для контрасту підписей / сегментів на `ScreenGradient` (Океан / Сакура). */
  themeMode: ThemeMode;
};

const COLS = 3;
const GAP = 10;
const H_PAD = 16;
const TILE_RADIUS = 18;
const OSKOLOK_SINGLE = oskolokImageForPackShards(0);

/** Каскад секций §3.1: FadeInDown.duration(300).delay(min(i,8)*60).springify().damping(14) */
const sectionEntering = (i: number) =>
  FadeInDown.duration(FC_TIMING.enter).delay(fcStaggerDelay(i)).springify().damping(14);

const SPRING_CFG = { ...FC_SPRING.press, mass: 0.35 } as const;

function shadowForTile(t: Theme, kind: 'base' | 'owned' | 'shop'): ViewStyle {
  const os = getEffectivePlatformOS();
  if (os === 'web') {
    return {};
  }
  if (os === 'android') {
    return { elevation: kind === 'base' ? 3 : 4 };
  }
  if (kind === 'shop') {
    return {
      shadowColor: t.accent,
      shadowOffset: { width: 0, height: 3 },
      shadowOpacity: 0.14,
      shadowRadius: 10,
    };
  }
  if (kind === 'owned') {
    return {
      shadowColor: t.accent,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.12,
      shadowRadius: 8,
    };
  }
  return {
    shadowColor: t.cardShadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
  };
}

type HubTileShellProps = {
  testID: string;
  a11y: string;
  onPress: () => void;
  onLongPress?: () => void;
  disabled?: boolean;
  reduceMotion: boolean;
  width: number;
  children: React.ReactNode;
};

/** Пружина на нажатии — як у в polished apps (scale ~0,96). */
function HubTileShell({ testID, a11y, onPress, onLongPress, disabled, reduceMotion, width, children }: HubTileShellProps) {
  const s = useSharedValue(1);
  const aStyle = useAnimatedStyle(() => ({ transform: [{ scale: s.value }] }));

  return (
    <ReanimatedPressable
      testID={testID}
      accessibilityLabel={a11y}
      accessible
      onPress={onPress}
      onLongPress={onLongPress}
      delayLongPress={onLongPress ? 420 : undefined}
      disabled={disabled}
      onPressIn={() => {
        if (reduceMotion) {
          s.value = withTiming(0.99, { duration: 50 });
        } else {
          s.value = withSpring(0.96, SPRING_CFG);
        }
      }}
      onPressOut={() => {
        s.value = reduceMotion ? withTiming(1, { duration: 90 }) : withSpring(1, SPRING_CFG);
      }}
      style={[{ width, alignItems: 'center' }, aStyle]}
    >
      {children}
    </ReanimatedPressable>
  );
}

type UnownedCardProps = {
  t: Theme;
  tileW: number;
  pack: FlashcardMarketPack;
  ion: string;
  /** Вбудована PNG-іконка набору; інакше `ion` (Ionicons). */
  packPng?: ImageSourcePropType;
  iconSize: number;
  cardShadow: ViewStyle;
  reduceMotion: boolean;
};

/** Картка магазину: глянець, ціник з пульсом, «живі» деталі. Кольори ценника — з теми (§3.1 п.6). */
function UnownedMarketPackCard({
  t,
  tileW,
  pack,
  ion,
  packPng,
  iconSize,
  cardShadow,
  reduceMotion,
}: UnownedCardProps) {
  const pfOs = getEffectivePlatformOS();
  const ctaScale = useSharedValue(1);

  useEffect(() => {
    if (reduceMotion) {
      ctaScale.value = 1;
      return;
    }
    ctaScale.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 2000, easing: Easing.inOut(Easing.ease) }),
        withTiming(1.03, { duration: 2000, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      true
    );
  }, [reduceMotion, ctaScale]);

  const ctaStyle = useAnimatedStyle(() => ({
    transform: [{ scale: ctaScale.value }],
  }));

  const glimmerH = Math.max(32, Math.floor(tileW * 0.42));

  return (
    <View
      style={[
        {
          width: tileW,
          height: tileW,
          borderRadius: TILE_RADIUS,
          overflow: 'hidden',
          borderWidth: 1,
          borderColor: t.border,
        },
        cardShadow,
      ]}
    >
      <LinearGradient
        colors={t.cardGradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{ width: tileW, height: tileW, flexDirection: 'column' }}
      >
        <LinearGradient
          colors={[`${t.textPrimary}12`, `${t.textPrimary}00`, 'transparent']}
          start={{ x: 0.5, y: 0 }}
          end={{ x: 0.5, y: 1 }}
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: glimmerH,
          }}
        />
        <View
          pointerEvents="none"
          style={{
            position: 'absolute',
            top: 8,
            left: 8,
            width: 28,
            height: 28,
            borderRadius: 14,
            backgroundColor: t.bgCard,
            borderWidth: 1,
            borderColor: t.border,
            alignItems: 'center',
            justifyContent: 'center',
            ...(pfOs === 'ios'
              ? {
                  shadowColor: t.cardShadow,
                  shadowOffset: { width: 0, height: 1 },
                  shadowOpacity: 0.35,
                  shadowRadius: 2,
                }
              : pfOs === 'android'
                ? { elevation: 2 }
                : {}),
          }}
        >
          <Ionicons name="lock-closed" size={12} color={t.textSecond} style={{ opacity: 0.9 }} />
        </View>
        <View
          style={{
            flex: 1,
            alignItems: 'center',
            justifyContent: 'center',
            paddingBottom: 10,
            paddingHorizontal: 2,
          }}
        >
          {packPng ? (
            <Image source={packPng} style={{ width: iconSize, height: iconSize }} contentFit="contain" />
          ) : (
            <Ionicons name={ion as any} size={iconSize} color={t.textPrimary} />
          )}
        </View>
        <Reanimated.View
          style={[
            ctaStyle,
            {
              position: 'absolute',
              right: 8,
              bottom: 8,
              zIndex: 10,
              ...(pfOs === 'ios'
                ? {
                    shadowColor: t.cardShadow,
                    shadowOffset: { width: 0, height: 2 },
                    shadowOpacity: 0.45,
                    shadowRadius: 4,
                  }
                : pfOs === 'android'
                  ? { elevation: 8 }
                  : {}),
            },
          ]}
        >
          <View
            style={{
              borderRadius: 12,
              borderWidth: 1,
              borderColor: `${t.accent}88`,
              backgroundColor: t.bgCard,
              paddingVertical: 5,
              paddingHorizontal: 8,
            }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
              <Image source={oskolokImageForPackShards(pack.priceShards)} style={{ width: 12, height: 12 }} contentFit="contain" />
              <Text style={{ fontSize: 11, fontWeight: '800', color: t.textPrimary, letterSpacing: 0.2 }}>
                {pack.priceShards}
              </Text>
            </View>
          </View>
        </Reanimated.View>
      </LinearGradient>
    </View>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// E6: недельный star-трек 21★ с сундуками-чекпоинтами 7/14/21 (§4 мастер-плана)
// ════════════════════════════════════════════════════════════════════════════

type WeeklyTrackData = { earned: number; target: number; checkpoints: number[]; claimed: number[] };
type ChestState = 'locked' | 'available' | 'claimed';

const CHEST_SIZE = 38;
const CHEST_HIT_W = 52;
const CHEST_BURST_PARTICLES = 14;

/** Одна частица burst-а: transform+opacity, живёт один прогон withTiming. */
function ChestBurstParticle({ dx, dy, color, delay }: { dx: number; dy: number; color: string; delay: number }) {
  const p = useSharedValue(0);
  useEffect(() => {
    p.value = withDelay(delay, withTiming(1, { duration: 520, easing: Easing.out(Easing.cubic) }));
  }, [p, delay]);
  const st = useAnimatedStyle(() => ({
    transform: [
      { translateX: dx * p.value },
      { translateY: dy * p.value },
      { scale: 1 - 0.6 * p.value },
    ],
    opacity: 1 - p.value,
  }));
  return (
    <Reanimated.View
      pointerEvents="none"
      style={[{ position: 'absolute', width: 7, height: 7, borderRadius: 4, backgroundColor: color }, st]}
    />
  );
}

/** Burst 12–16 View-частиц из центра сундука (§4). Родитель размонтирует через ~700мс. */
function ChestBurst({ colors }: { colors: string[] }) {
  const parts = useMemo(
    () =>
      Array.from({ length: CHEST_BURST_PARTICLES }, (_, i) => {
        const angle = (Math.PI * 2 * i) / CHEST_BURST_PARTICLES + Math.random() * 0.5;
        const dist = 26 + Math.random() * 20;
        return {
          dx: Math.cos(angle) * dist,
          dy: Math.sin(angle) * dist,
          color: colors[i % colors.length]!,
          delay: Math.floor(Math.random() * 60),
        };
      }),
    [colors],
  );
  return (
    <View
      pointerEvents="none"
      style={{ position: 'absolute', top: CHEST_SIZE / 2 - 3, left: CHEST_SIZE / 2 - 3, width: 0, height: 0, zIndex: 20 }}
    >
      {parts.map((pt, i) => (
        <ChestBurstParticle key={i} {...pt} />
      ))}
    </View>
  );
}

type CheckpointChestProps = {
  t: Theme;
  state: ChestState;
  /** Порог для отображения (при стрик-скидке последний = 18★). */
  threshold: number;
  /** Канонический чекпоинт 7/14/21 — ключ клейма и testID. */
  canonical: number;
  disabled: boolean;
  /** burst-частицы: выкл на web/lowPower/reduceMotion — фолбэк пульс+хаптика (§4). */
  effectsEnabled: boolean;
  /** Лёгкий idle-пульс доступного сундука. */
  pulseEnabled: boolean;
  onClaim: (canonical: number) => void;
  /** E12: реюз для milestone-сундуков — свой testID-префикс. */
  testIDPrefix?: string;
};

/** Сундук-чекпоинт: закрыт (серый) / доступен (золотой, пульс) / заклеймлен (галочка). */
function CheckpointChest({
  t,
  state,
  threshold,
  canonical,
  disabled,
  effectsEnabled,
  pulseEnabled,
  onClaim,
  testIDPrefix = 'flashcards-hub-chest',
}: CheckpointChestProps) {
  const shakeX = useSharedValue(0);
  const pressScale = useSharedValue(1);
  const idle = useSharedValue(1);
  const [burst, setBurst] = useState(false);
  const timersRef = React.useRef<Array<ReturnType<typeof setTimeout>>>([]);

  useEffect(() => {
    if (state === 'available' && pulseEnabled) {
      idle.value = withRepeat(
        withSequence(
          withTiming(1.07, { duration: 900, easing: Easing.inOut(Easing.ease) }),
          withTiming(1, { duration: 900, easing: Easing.inOut(Easing.ease) }),
        ),
        -1,
        true,
      );
    } else {
      idle.value = withTiming(1, { duration: 150 });
    }
  }, [state, pulseEnabled, idle]);

  useEffect(
    () => () => {
      timersRef.current.forEach((id) => clearTimeout(id));
      timersRef.current = [];
    },
    [],
  );

  const aStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: shakeX.value }, { scale: idle.value * pressScale.value }],
  }));

  const onPress = () => {
    if (state !== 'available' || disabled) return;
    void hapticTap();
    if (effectsEnabled) {
      // Тряска 3×80мс (§4) → burst частиц → клейм
      shakeX.value = withSequence(
        withTiming(-4, { duration: 40 }),
        withTiming(4, { duration: 80 }),
        withTiming(-4, { duration: 80 }),
        withTiming(4, { duration: 80 }),
        withTiming(0, { duration: 40 }),
      );
    } else {
      // lowPower/web/reduceMotion-фолбэк: пульс + хаптика без частиц (§4)
      pressScale.value = withSequence(
        withTiming(1.12, { duration: 110 }),
        withTiming(1, { duration: 150 }),
      );
    }
    timersRef.current.push(
      setTimeout(() => {
        if (effectsEnabled) {
          setBurst(true);
          timersRef.current.push(setTimeout(() => setBurst(false), 700));
        }
        onClaim(canonical);
      }, 300),
    );
  };

  const isClaimed = state === 'claimed';
  const isAvailable = state === 'available';
  const pfOs = getEffectivePlatformOS();

  return (
    <Pressable
      testID={`${testIDPrefix}-${canonical}`}
      accessibilityLabel={`qa-${testIDPrefix}-${canonical}`}
      accessible
      onPress={onPress}
      disabled={disabled || state !== 'available'}
      style={{ alignItems: 'center', width: CHEST_HIT_W }}
    >
      <Reanimated.View
        style={[
          aStyle,
          {
            width: CHEST_SIZE,
            height: CHEST_SIZE,
            borderRadius: 14,
            borderWidth: 1.5,
            alignItems: 'center',
            justifyContent: 'center',
            borderColor: isAvailable ? t.gold : isClaimed ? `${t.gold}55` : t.border,
            backgroundColor: isAvailable ? t.goldBg : t.bgCard,
            ...(isAvailable && pfOs === 'ios'
              ? { shadowColor: t.gold, shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.45, shadowRadius: 8 }
              : isAvailable && pfOs === 'android'
                ? { elevation: 5 }
                : {}),
          },
        ]}
      >
        <Ionicons
          name="gift"
          size={20}
          color={isAvailable ? t.gold : isClaimed ? `${t.gold}88` : t.textGhost}
          style={isClaimed ? { opacity: 0.55 } : undefined}
        />
        {isClaimed ? (
          <View
            style={{
              position: 'absolute',
              top: -6,
              right: -6,
              borderRadius: 9,
              backgroundColor: t.bgSurface,
            }}
          >
            <Ionicons name="checkmark-circle" size={17} color={t.correct} />
          </View>
        ) : null}
        {burst ? <ChestBurst colors={[t.gold, '#FFE9A3', '#FFF6D6', t.accent]} /> : null}
      </Reanimated.View>
      <Text
        style={{
          marginTop: 4,
          fontSize: 10,
          fontWeight: '800',
          letterSpacing: 0.2,
          color: isAvailable ? t.gold : isClaimed ? t.textMuted : t.textGhost,
        }}
      >
        {threshold}★
      </Text>
    </Pressable>
  );
}

type WeeklyStarTrackProps = {
  t: Theme;
  lang: Lang;
  width: number;
  weekly: WeeklyTrackData;
  claimingChest: number | null;
  effectsEnabled: boolean;
  pulseEnabled: boolean;
  onClaim: (canonical: number) => void;
  /** E12: milestone-сундуки lifetime best-звёзд колод (10/25/50★) в раскрытии трека. */
  milestones: MilestonesState | null;
  milestonesOpen: boolean;
  onToggleMilestones: () => void;
  claimingMilestone: number | null;
  onClaimMilestone: (milestone: number) => void;
};

/** Горизонтальная полоса прогресса звёзд недели X/21 с тремя сундуками 7/14/21 (§3.1 п.2). */
function WeeklyStarTrack({
  t,
  lang,
  width,
  weekly,
  claimingChest,
  effectsEnabled,
  pulseEnabled,
  onClaim,
  milestones,
  milestonesOpen,
  onToggleMilestones,
  claimingMilestone,
  onClaimMilestone,
}: WeeklyStarTrackProps) {
  const PAD_H = 14;
  const innerW = width - PAD_H * 2;
  const frac = weekly.target > 0 ? Math.min(1, weekly.earned / weekly.target) : 0;

  return (
    <View
      testID="flashcards-hub-week-track"
      accessibilityLabel="qa-flashcards-hub-week-track"
      accessible
      style={{
        width,
        marginTop: 10,
        borderRadius: 18,
        borderWidth: 1,
        borderColor: t.border,
        backgroundColor: t.bgSurface,
        paddingHorizontal: PAD_H,
        paddingTop: 12,
        paddingBottom: 10,
      }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
        <Text style={{ color: t.textSecond, fontSize: 12, fontWeight: '800', letterSpacing: 0.3 }}>
          {triLang(lang, { ru: 'Звёзды недели', uk: 'Зірки тижня', es: 'Estrellas de la semana' })}
        </Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
          <Ionicons name="star" size={13} color={t.gold} />
          <Text style={{ color: t.textPrimary, fontSize: 13, fontWeight: '900' }}>
            {weekly.earned}
            <Text style={{ color: t.textMuted, fontWeight: '700' }}>/{weekly.target}</Text>
          </Text>
        </View>
      </View>

      {/* Полоса + сундуки поверх неё (центр сундука = порог/target доли ширины) */}
      <View style={{ height: 64, justifyContent: 'flex-start' }}>
        <View
          style={{
            position: 'absolute',
            top: CHEST_SIZE / 2 - 4,
            left: 0,
            width: innerW,
            height: 8,
            borderRadius: 4,
            backgroundColor: `${t.gold}22`,
            overflow: 'hidden',
          }}
        >
          <View
            style={{
              width: Math.round(innerW * frac),
              height: 8,
              borderRadius: 4,
              backgroundColor: t.gold,
            }}
          />
        </View>
        {weekly.checkpoints.map((threshold, idx) => {
          const canonical = (WEEKLY_STAR_CHECKPOINTS as readonly number[])[idx] ?? threshold;
          const state: ChestState = weekly.claimed.includes(canonical)
            ? 'claimed'
            : weekly.earned >= threshold
              ? 'available'
              : 'locked';
          const centerX = (threshold / weekly.target) * innerW;
          const left = Math.max(0, Math.min(innerW - CHEST_HIT_W, Math.round(centerX - CHEST_HIT_W / 2)));
          return (
            <View key={canonical} style={{ position: 'absolute', top: 0, left }}>
              <CheckpointChest
                t={t}
                state={state}
                threshold={threshold}
                canonical={canonical}
                disabled={claimingChest !== null}
                effectsEnabled={effectsEnabled}
                pulseEnabled={pulseEnabled}
                onClaim={onClaim}
              />
            </View>
          );
        })}
      </View>

      {/* ── E12: milestone-сундуки lifetime best-звёзд колод (10/25/50★, §4) ── */}
      {milestones ? (
        <>
          <Pressable
            testID="flashcards-hub-milestones-toggle"
            accessibilityLabel="qa-flashcards-hub-milestones-toggle"
            accessible
            onPress={() => {
              void hapticTap();
              onToggleMilestones();
            }}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              borderTopWidth: 1,
              borderTopColor: t.border,
              marginTop: 2,
              paddingTop: 8,
            }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Ionicons name="trophy-outline" size={14} color={t.gold} />
              <Text style={{ color: t.textSecond, fontSize: 12, fontWeight: '800', letterSpacing: 0.3 }}>
                {triLang(lang, { ru: 'Сундуки колод', uk: 'Скрині колод', es: 'Cofres de mazos' })}
              </Text>
              <Text style={{ color: t.textMuted, fontSize: 12, fontWeight: '800' }}>
                {milestones.totalBest}★
              </Text>
              {milestones.milestones.some((m) => m.reached && !m.claimed) ? (
                <View style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: t.gold }} />
              ) : null}
            </View>
            <Ionicons name={milestonesOpen ? 'chevron-up' : 'chevron-down'} size={16} color={t.textMuted} />
          </Pressable>
          {milestonesOpen ? (
            <View style={{ paddingTop: 10 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-around' }}>
                {milestones.milestones.map((m) => {
                  const state: ChestState = m.claimed ? 'claimed' : m.reached ? 'available' : 'locked';
                  return (
                    <CheckpointChest
                      key={m.milestone}
                      t={t}
                      state={state}
                      threshold={m.milestone}
                      canonical={m.milestone}
                      disabled={claimingMilestone !== null}
                      effectsEnabled={effectsEnabled}
                      pulseEnabled={pulseEnabled}
                      onClaim={onClaimMilestone}
                      testIDPrefix="flashcards-hub-milestone"
                    />
                  );
                })}
              </View>
              <Text style={{ color: t.textGhost, fontSize: 10, fontWeight: '600', textAlign: 'center', marginTop: 6 }}>
                {triLang(lang, {
                  ru: 'За суммарные best-звёзды всех колод · выплата один раз',
                  uk: 'За сумарні best-зірки всіх колод · виплата один раз',
                  es: 'Por las mejores estrellas de todos los mazos · pago único',
                })}
              </Text>
            </View>
          ) : null}
        </>
      ) : null}
    </View>
  );
}

type ChestRewardInfo = {
  checkpoint: number;
  amount: number;
  jackpot: boolean;
  /** E12: сундук-milestone lifetime best-звёзд колод (не недельный чекпоинт). */
  milestone?: boolean;
};

/** Мини-модалка награды сундука (в стиле ShardRewardModal, компактная). */
function ChestRewardModal({
  reward,
  t,
  lang,
  onClose,
}: {
  reward: ChestRewardInfo | null;
  t: Theme;
  lang: Lang;
  onClose: () => void;
}) {
  const { width: winW, height: winH } = useWindowDimensions();
  useEffect(() => {
    if (reward) void hapticSuccess();
  }, [reward]);
  if (!reward) return null;
  /** Web: fixed-контейнер Modal в RNW равен window.innerWidth (может быть > layout
      viewport) — flex-центрирование уводит карточку за экран. Явный размер из
      useWindowDimensions ставит бэкдроп ровно на видимый viewport. */
  const backdropSize =
    getEffectivePlatformOS() === 'web'
      ? ({ position: 'absolute', top: 0, left: 0, width: winW, height: winH } as const)
      : ({ flex: 1 } as const);
  return (
    <Modal transparent animationType="fade" visible onRequestClose={onClose}>
      <Pressable
        style={{
          ...backdropSize,
          backgroundColor: 'rgba(0,0,0,0.62)',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 28,
        }}
        onPress={onClose}
      >
        <Pressable onPress={() => {}} style={{ width: '100%', maxWidth: 340 }}>
          {/* Без Reanimated entering: внутри Modal на web layout-анимация смещает карточку;
              вход анимирует сам Modal (animationType="fade"). */}
          <View>
            <LinearGradient
              colors={t.cardGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={{
                borderRadius: 24,
                borderWidth: 1.5,
                borderColor: `${t.gold}88`,
                padding: 24,
                alignItems: 'center',
              }}
            >
              <Text style={{ color: t.gold, fontSize: 12, fontWeight: '900', letterSpacing: 2 }}>
                {triLang(lang, { ru: 'СУНДУК ОТКРЫТ', uk: 'СКРИНЮ ВІДКРИТО', es: 'COFRE ABIERTO' })}
              </Text>
              <View
                style={{
                  width: 76,
                  height: 76,
                  borderRadius: 26,
                  marginTop: 14,
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: t.goldBg,
                  borderWidth: 1.5,
                  borderColor: `${t.gold}88`,
                }}
              >
                <Ionicons name="gift" size={40} color={t.gold} />
              </View>
              {reward.jackpot ? (
                <View
                  style={{
                    marginTop: 10,
                    paddingHorizontal: 10,
                    paddingVertical: 4,
                    borderRadius: 10,
                    backgroundColor: t.goldBg,
                    borderWidth: 1,
                    borderColor: `${t.gold}88`,
                  }}
                >
                  <Text style={{ color: t.gold, fontSize: 12, fontWeight: '900', letterSpacing: 0.5 }}>
                    {triLang(lang, { ru: 'Джекпот ×2!', uk: 'Джекпот ×2!', es: '¡Bote ×2!' })}
                  </Text>
                </View>
              ) : null}
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 14 }}>
                <Image
                  source={oskolokImageForPackShards(reward.amount)}
                  style={{ width: 30, height: 30 }}
                  contentFit="contain"
                />
                <Text
                  testID="flashcards-hub-chest-reward-amount"
                  accessibilityLabel="qa-flashcards-hub-chest-reward-amount"
                  accessible
                  style={{ color: t.textOnCard, fontSize: 30, fontWeight: '900' }}
                >
                  +{reward.amount}
                </Text>
              </View>
              <Text style={{ color: t.textMuted, fontSize: 13, fontWeight: '600', marginTop: 6, textAlign: 'center' }}>
                {reward.milestone
                  ? triLang(lang, {
                      ru: `${reward.checkpoint}★ колод собрано — осколки уже в кошельке`,
                      uk: `${reward.checkpoint}★ колод зібрано — осколки вже в гаманці`,
                      es: `${reward.checkpoint}★ de mazos: fragmentos ya en tu cartera`,
                    })
                  : triLang(lang, {
                      ru: `Чекпоинт ${reward.checkpoint}★ — осколки уже в кошельке`,
                      uk: `Чекпоінт ${reward.checkpoint}★ — осколки вже в гаманці`,
                      es: `Checkpoint ${reward.checkpoint}★ — fragmentos ya en tu cartera`,
                    })}
              </Text>
              <TouchableOpacity
                testID="flashcards-hub-chest-reward-close"
                accessibilityLabel="qa-flashcards-hub-chest-reward-close"
                accessible
                activeOpacity={0.85}
                onPress={onClose}
                style={{
                  marginTop: 18,
                  alignSelf: 'stretch',
                  borderRadius: 16,
                  paddingVertical: 14,
                  alignItems: 'center',
                  backgroundColor: t.gold,
                }}
              >
                <Text style={{ color: t.textOnGold, fontSize: 15, fontWeight: '900' }}>
                  {triLang(lang, { ru: 'Забрать', uk: 'Забрати', es: 'Recoger' })}
                </Text>
              </TouchableOpacity>
            </LinearGradient>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

/** Дашборд-хаб: секції §3.1; вертикальна прокрутка — на екрані-хабі (`flashcards.tsx`). */
export default function FlashcardsCategoryHub({
  lang,
  t,
  marketPacks,
  ownedPackIds,
  shardBalance,
  onMarketRefresh,
  cloudCommunityEnabled = false,
  communityPacks = [],
  ownedCommunityPackIds = [],
  hubAuthorStableId = null,
  themeMode,
}: Props) {
  const router = useRouter();
  const [buyingPackId, setBuyingPackId] = useState<string | null>(null);
  const [reduceMotion, setReduceMotion] = useState(false);
  const [hasUnfinishedPackDraft, setHasUnfinishedPackDraft] = useState(false);
  const [discardDraftForNewOpen, setDiscardDraftForNewOpen] = useState(false);
  const [hiddenCommunityPackIds, setHiddenCommunityPackIds] = useState<Set<string>>(() => new Set());
  const [ugcReportHintPackId, setUgcReportHintPackId] = useState<string | null>(null);
  const [reportModalPack, setReportModalPack] = useState<FlashcardMarketPack | null>(null);

  /** Данные дашборда: SRS-очередь, тренер, сохранённые, resume-прогресс. */
  const [srsDueCount, setSrsDueCount] = useState(0);
  const [trainerDueCount, setTrainerDueCount] = useState(0);
  const [savedCount, setSavedCount] = useState<number | null>(null);
  const [resumeProgress, setResumeProgress] = useState<FlashcardsProgress | null>(null);
  /** E8: быстрый старт тренера — последний пресет (fc_mode_prefs_v1) + DeckPickerSheet. */
  const [customCount, setCustomCount] = useState(0);
  const [trainerPreset, setTrainerPreset] = useState<FcModePreset | null>(null);
  const [deckSheetOpen, setDeckSheetOpen] = useState(false);
  /** E10: режим «Слушание» — свой пресет быстрого старта и свой заход в шит. */
  const [listeningPreset, setListeningPreset] = useState<FcModePreset | null>(null);
  const [deckSheetMode, setDeckSheetMode] = useState<'trainer' | 'listening' | 'blitz'>('trainer');
  /** E12: режим «Блиц» — пресет быстрого старта (дефолт — все сохранённые+custom). */
  const [blitzPreset, setBlitzPreset] = useState<FcModePreset | null>(null);
  /** E4: чип звёзд в хедере — lifetime-баланс N★; E6: полный недельный трек с сундуками. */
  const [starsTotal, setStarsTotal] = useState(0);
  const [starsWeekly, setStarsWeekly] = useState<WeeklyTrackData | null>(null);
  /** E13: XP-буст ×1.5 за perfect session (fc_stars_v1.xpBoostUntil) — бейдж с таймером. */
  const [xpBoostUntil, setXpBoostUntil] = useState(0);
  const [nowTick, setNowTick] = useState(() => Date.now());
  /** E6: клейм сундука — guard от двойного тапа + модалка награды. */
  const [claimingChest, setClaimingChest] = useState<number | null>(null);
  const [chestReward, setChestReward] = useState<ChestRewardInfo | null>(null);
  /** E12: best-звёзды колод (мини ★★☆ на плитках) + milestone-сундуки 10/25/50★. */
  const [deckBest, setDeckBest] = useState<DeckBestMap>({});
  const [milestones, setMilestones] = useState<MilestonesState | null>(null);
  const [milestonesOpen, setMilestonesOpen] = useState(false);
  const [claimingMilestone, setClaimingMilestone] = useState<number | null>(null);

  const lowPower = isLowPowerEffective();
  /** Каскад входа выключаем при reduceMotion / lowPower (декоративная ветка §2). */
  const animateSections = !reduceMotion && !lowPower;
  const enterProps = (i: number) => (animateSections ? { entering: sectionEntering(i) } : {});

  const refreshHiddenCommunityPacks = useCallback(async () => {
    const ids = await loadHiddenCommunityPackIds();
    setHiddenCommunityPackIds(new Set(ids));
  }, []);

  const loadDashboardStats = useCallback(async () => {
    const [due, tDue, saved, progress, starsState, weekly, customRaw, preset, listenPreset, bPreset, best, ms] =
      await Promise.all([
        countDueItemsToday().catch(() => 0),
        getTrainerTotalDue().catch(() => 0),
        loadFlashcards().catch(() => []),
        readFlashcardsProgress().catch(() => null),
        getStarsState().catch(() => null),
        getWeeklyProgress().catch(() => null),
        readCustomCards().catch((): unknown[] => []),
        getLastPreset('trainer').catch(() => null),
        getLastPreset('listening').catch(() => null),
        getLastPreset('blitz').catch(() => null),
        getDeckBestMap().catch((): DeckBestMap => ({})),
        getMilestonesState().catch(() => null),
      ]);
    setSrsDueCount(due);
    setTrainerDueCount(tDue);
    setSavedCount(saved.length);
    setResumeProgress(progress);
    setCustomCount(Array.isArray(customRaw) ? customRaw.length : 0);
    setTrainerPreset(preset);
    setListeningPreset(listenPreset);
    setBlitzPreset(bPreset);
    setDeckBest(best);
    if (ms) setMilestones(ms);
    if (starsState) {
      setStarsTotal(starsState.lifetime.stars);
      setXpBoostUntil(starsState.xpBoostUntil);
      setNowTick(Date.now());
    }
    if (weekly) {
      setStarsWeekly({
        earned: weekly.earned,
        target: weekly.target,
        checkpoints: weekly.checkpoints,
        claimed: weekly.claimed,
      });
    }
  }, []);

  /** E13: тикаем раз в 30с, пока буст активен — бейдж ×1.5 сам гаснет и обновляет минуты. */
  const xpBoostActive = xpBoostUntil > nowTick;
  useEffect(() => {
    if (!xpBoostActive) return;
    const timer = setInterval(() => setNowTick(Date.now()), 30_000);
    return () => clearInterval(timer);
  }, [xpBoostActive]);
  const xpBoostMinutesLeft = Math.max(1, Math.ceil((xpBoostUntil - nowTick) / 60_000));

  /** E4: оптимистик-начисление звёзд (E5 подключит сессии) — чип обновляется мгновенно. */
  useEffect(() => {
    const sub = onAppEvent('fc_stars_earned', ({ awarded, weeklyEarned }) => {
      setStarsTotal((cur) => cur + awarded);
      setStarsWeekly((cur) => (cur ? { ...cur, earned: weeklyEarned } : cur));
    });
    return () => sub.remove();
  }, []);

  /** E6: клейм чекпоинта где угодно (второй экран/оптимистик) — трек помечает сундук сразу. */
  useEffect(() => {
    const sub = onAppEvent('fc_checkpoint_claimed', ({ checkpoint }) => {
      setStarsWeekly((cur) =>
        cur && !cur.claimed.includes(checkpoint)
          ? { ...cur, claimed: [...cur.claimed, checkpoint].sort((a, b) => a - b) }
          : cur,
      );
    });
    return () => sub.remove();
  }, []);

  /** E12: milestone-сундук заклеймлен (оптимистик/второй экран) — гасим сразу. */
  useEffect(() => {
    const sub = onAppEvent('fc_milestone_claimed', ({ milestone }) => {
      setMilestones((cur) =>
        cur
          ? {
              ...cur,
              milestones: cur.milestones.map((m) =>
                m.milestone === milestone ? { ...m, claimed: true } : m,
              ),
            }
          : cur,
      );
    });
    return () => sub.remove();
  }, []);

  /** E12: есть доступный milestone-сундук → раскрываем ряд сам (одноразово на маунт). */
  const milestonesAutoOpenedRef = React.useRef(false);
  useEffect(() => {
    if (milestonesAutoOpenedRef.current || !milestones) return;
    if (milestones.milestones.some((m) => m.reached && !m.claimed)) {
      milestonesAutoOpenedRef.current = true;
      setMilestonesOpen(true);
    }
  }, [milestones]);

  /** E12: тап доступного milestone-сундука → клейм (one-time событие) + модалка. */
  const onMilestoneClaim = useCallback(
    (milestone: number) => {
      if (claimingMilestone !== null) return;
      setClaimingMilestone(milestone);
      void (async () => {
        try {
          const outcome = await claimMilestone(milestone);
          if (outcome.ok) {
            // Оптимистик уже пришёл событием fc_milestone_claimed; модалка — с суммой.
            setChestReward({
              checkpoint: outcome.milestone,
              amount: outcome.amount,
              jackpot: false,
              milestone: true,
            });
          } else if (outcome.reason === 'already_claimed') {
            // «Второй девайс» / переустановка: one-time событие уже есть — гасим без денег.
            setMilestones((cur) =>
              cur
                ? {
                    ...cur,
                    milestones: cur.milestones.map((m) =>
                      m.milestone === milestone ? { ...m, claimed: true } : m,
                    ),
                  }
                : cur,
            );
            emitAppEvent(
              'action_toast',
              actionToastTri('info', {
                ru: 'Этот сундук уже открыт',
                uk: 'Цю скриню вже відкрито',
                es: 'Este cofre ya está abierto',
              }),
            );
          }
        } catch {
          // fail-soft: можно тапнуть ещё раз
        } finally {
          setClaimingMilestone(null);
        }
      })();
    },
    [claimingMilestone],
  );

  /** E6: тап доступного сундука (после тряски/пульса в CheckpointChest) → клейм + модалка. */
  const onChestClaim = useCallback(
    (canonical: number) => {
      if (claimingChest !== null) return;
      setClaimingChest(canonical);
      void (async () => {
        try {
          const outcome = await claimCheckpoint(canonical);
          if (outcome.ok) {
            // Оптимистик уже пришёл событием fc_checkpoint_claimed; модалка — с фактической суммой.
            setChestReward({
              checkpoint: outcome.checkpoint,
              amount: outcome.amount,
              jackpot: outcome.tier === 'jackpot',
            });
          } else if (outcome.reason === 'already_claimed') {
            // «Второй девайс» / гонка: помечаем сундук без денег.
            setStarsWeekly((cur) =>
              cur && !cur.claimed.includes(canonical)
                ? { ...cur, claimed: [...cur.claimed, canonical].sort((a, b) => a - b) }
                : cur,
            );
            emitAppEvent(
              'action_toast',
              actionToastTri('info', {
                ru: 'Этот сундук уже открыт',
                uk: 'Цю скриню вже відкрито',
                es: 'Este cofre ya está abierto',
              }),
            );
          }
        } catch {
          // fail-soft: баланс/клейм не тронуты — можно тапнуть ещё раз
        } finally {
          setClaimingChest(null);
        }
      })();
    },
    [claimingChest],
  );

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      void (async () => {
        const ok = await hasMeaningfulCommunityPackCreateDraft();
        if (!cancelled) setHasUnfinishedPackDraft(ok);
      })();
      void refreshHiddenCommunityPacks();
      void loadDashboardStats();
      return () => {
        cancelled = true;
      };
    }, [refreshHiddenCommunityPacks, loadDashboardStats]),
  );

  const { openPaywall, CardPackPaywallModalEl } = useCardPackShardPaywall({
    balance: shardBalance,
    lang,
    router,
    onAfterPurchase: onMarketRefresh,
    onPurchaseStart: (id) => setBuyingPackId(id),
    onPurchaseEnd: () => setBuyingPackId(null),
    onCommunityPackHiddenOnDevice: refreshHiddenCommunityPacks,
  });
  const { width: winW } = useWindowDimensions();
  const tileW = useMemo(() => {
    const inner = winW - H_PAD * 2 - GAP * (COLS - 1);
    return Math.max(96, Math.floor(inner / COLS));
  }, [winW]);

  /** Категорії хабу — компактні Ionicons. */
  const iconSize = Math.min(32, Math.floor(tileW * 0.38));
  /** Лента магазина: ~3,35 плитки в кадре — четвёртая выглядывает, лента читается как скролл. */
  const shopTileW = Math.max(88, Math.floor((winW - H_PAD * 2 - GAP * 3) / 3.35));
  /** Платні набори: PNG/лінія — більший центр, щоб читалось як на скріні. */
  const packTileIconSize = Math.max(72, Math.floor(tileW * 0.86));
  const labelSize = Math.max(9, Math.min(11, Math.floor(tileW * 0.11)));

  const isGradientSurface = themeMode === 'ocean' || themeMode === 'sakura';
  /** Підписи під плитками рендеряться на градієнті — `t.textPrimary` там тьмяний (як у налаштуваннях). */
  const hubLabelPrimary = isGradientSurface
    ? (themeMode === 'ocean' ? 'rgba(246,252,255,0.98)' : 'rgba(255,250,252,0.98)')
    : t.textPrimary;
  const hubLabelMuted = isGradientSurface
    ? (themeMode === 'ocean' ? 'rgba(215,236,255,0.88)' : 'rgba(255,215,232,0.86)')
    : t.textMuted;
  const hubLabelAccent = isGradientSurface
    ? (themeMode === 'ocean' ? 'rgba(200,236,255,0.95)' : 'rgba(255,200,228,0.95)')
    : t.accent;

  /**
   * Куплений UGC, авторський набір, або UGC id у спільному `ownedPackIds` (легасі/гілка без isCommunityUgc).
   */
  const isCommunityPackMine = useCallback(
    (p: FlashcardMarketPack) =>
      ownedCommunityPackIds.includes(p.id) ||
      (!!hubAuthorStableId && !!p.authorStableId && p.authorStableId === hubAuthorStableId) ||
      (!!p.isCommunityUgc && ownedPackIds.includes(p.id)),
    [ownedCommunityPackIds, hubAuthorStableId, ownedPackIds],
  );

  /** «Мои колоды»: куплені офіційні + свої/куплені UGC. */
  const mineOwnedPacks = useMemo(() => {
    const catalogOwnedOrdered = marketPacks.filter((p) => ownedPackIds.includes(p.id));
    const catalogIds = new Set(marketPacks.map((p) => p.id));
    const extraOwnedCommunity = communityPacks.filter(
      (p) => isCommunityPackMine(p) && !catalogIds.has(p.id),
    );
    return [...catalogOwnedOrdered, ...extraOwnedCommunity];
  }, [marketPacks, communityPacks, ownedPackIds, isCommunityPackMine]);

  /**
   * «Магазин наборов»: unowned офіційні паки з цінниками (без фільтра mineTabPacksOnlyOwned —
   * FIX(cards-2.0 E3): раніше paywall був недосяжний з хаба).
   */
  const shopPacks = useMemo(
    () => marketPacks.filter((p) => !ownedPackIds.includes(p.id) && !p.isCommunityUgc),
    [marketPacks, ownedPackIds],
  );

  const visibleCommunityPacks = useMemo(
    () => communityPacks.filter((p) => !hiddenCommunityPackIds.has(p.id)),
    [communityPacks, hiddenCommunityPackIds],
  );

  useEffect(() => {
    if (Platform.OS === 'web') {
      setReduceMotion(false);
      return;
    }
    AccessibilityInfo.isReduceMotionEnabled().then(setReduceMotion);
    const sub = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduceMotion);
    return () => sub.remove();
  }, []);

  const openOwnedPack = async (pack: FlashcardMarketPack) => {
    setUgcReportHintPackId(null);
    if (pack.isCommunityUgc) {
      const ok = await stageCommunityPackCardsForNavigation(pack.id);
      if (!ok) {
        emitAppEvent(
          'action_toast',
          actionToastTri('error', {
            ru: 'Не удалось загрузить карточки набора.',
            uk: 'Не вдалося завантажити картки набору.',
            es: 'No se pudieron cargar las tarjetas del pack.',
          }),
        );
        return;
      }
    } else {
      /** КРИТИЧНО: staging СИНХРОННО перед router.push — перший кадр колекції вже з картками. */
      stageOwnedPackCardsForNavigation(pack.id);
    }
    router.push({ pathname: '/flashcards_collection', params: { pack: pack.id } } as any);
  };

  const onLockedPackPress = useCallback(
    (pack: FlashcardMarketPack) => {
      if (buyingPackId) return;
      setUgcReportHintPackId(null);
      openPaywall(pack);
    },
    [buyingPackId, openPaywall],
  );

  // ── E8: быстрый старт тренера + DeckPickerSheet (§3.1 п.5) ─────────────────
  /** Роут words-сессии с пресетом: 'weak' — обычная due-очередь, остальное — deck-режим. */
  const pushTrainerSession = useCallback(
    (preset: FcModePreset) => {
      const params: Record<string, string> = { size: String(preset.size) };
      if (preset.deckId !== 'weak') params.deck = preset.deckId;
      router.push({ pathname: '/trainer_words_session', params } as any);
    },
    [router],
  );

  /**
   * Тап по плитке «Тренер» = быстрый старт: есть пресет → сразу сессия (1 тап
   * до первой карточки); нет — прежнее поведение, хаб тренера (2 тапа).
   */
  const onTrainerQuickStart = useCallback(() => {
    if (trainerPreset) {
      pushTrainerSession(trainerPreset);
    } else {
      router.push('/trainer' as any);
    }
  }, [trainerPreset, pushTrainerSession, router]);

  /** Long-press / ⚙ на плитке «Тренер» → шит выбора набора и размера. */
  const openDeckSheet = useCallback(() => {
    void hapticTap();
    setDeckSheetMode('trainer');
    setDeckSheetOpen(true);
  }, []);

  // ── E10: режим «Слушание» — быстрый старт + шит (§3.8) ─────────────────────
  const pushListeningSession = useCallback(
    (preset: FcModePreset) => {
      // 'weak' для слушания не имеет смысла (due-очередь тренера) → сохранённые
      const deck = preset.deckId === 'weak' ? 'saved' : preset.deckId;
      router.push({
        pathname: '/flashcards_listening_session',
        params: { deck, size: String(preset.size) },
      } as any);
    },
    [router],
  );

  const openListeningSheet = useCallback(() => {
    void hapticTap();
    setDeckSheetMode('listening');
    setDeckSheetOpen(true);
  }, []);

  /** Тап по плитке «Слушание»: есть пресет → сразу плеер (1 тап); нет → шит. */
  const onListeningQuickStart = useCallback(() => {
    if (listeningPreset) {
      pushListeningSession(listeningPreset);
    } else {
      openListeningSheet();
    }
  }, [listeningPreset, pushListeningSession, openListeningSheet]);

  // ── E12: режим «Блиц» — быстрый старт + шит (§3.9) ─────────────────────────
  const pushBlitzSession = useCallback(
    (preset: FcModePreset | null) => {
      // Без пресета — дефолт §3.9: все сохранённые + мои карточки (без ?deck=)
      const params: Record<string, string> = {};
      if (preset && preset.deckId !== 'weak') params.deck = preset.deckId;
      router.push({ pathname: '/flashcards_blitz_session', params } as any);
    },
    [router],
  );

  const openBlitzSheet = useCallback(() => {
    void hapticTap();
    setDeckSheetMode('blitz');
    setDeckSheetOpen(true);
  }, []);

  /** Тап по плитке «Блиц» = быстрый старт (пресет или дефолтная смешанная колода). */
  const onBlitzQuickStart = useCallback(() => {
    pushBlitzSession(blitzPreset);
  }, [blitzPreset, pushBlitzSession]);

  const deckSheetOptions = useMemo((): DeckSheetOption[] => {
    const opts: DeckSheetOption[] = [
      {
        deckId: 'weak',
        title: triLang(lang, { ru: 'Слабые слова', uk: 'Слабкі слова', es: 'Palabras débiles' }),
        count: trainerDueCount,
        icon: 'barbell-outline',
      },
      {
        deckId: 'saved',
        title: triLang(lang, { ru: 'Все сохранённые', uk: 'Усі збережені', es: 'Todas las guardadas' }),
        count: savedCount ?? 0,
        icon: 'bookmark-outline',
      },
      {
        deckId: 'custom',
        title: triLang(lang, { ru: 'Мои карточки', uk: 'Мої картки', es: 'Mis tarjetas' }),
        count: customCount,
        icon: 'pencil-outline',
      },
    ];
    for (const pack of mineOwnedPacks) {
      opts.push({
        deckId: `pack:${pack.id}`,
        title: packTitleForInterface(pack, lang),
        count: pack.cardCount || 0,
        icon: packCategoryIonIcon(pack.category) as DeckSheetOption['icon'],
      });
    }
    return opts;
  }, [lang, trainerDueCount, savedCount, customCount, mineOwnedPacks]);

  /** E10/E12: наборы для слушания и блица — без 'weak' (due-очередь тренера). */
  const listeningSheetOptions = useMemo(
    (): DeckSheetOption[] => deckSheetOptions.filter((d) => d.deckId !== 'weak'),
    [deckSheetOptions],
  );

  const onDeckSheetStart = useCallback(
    (preset: FcModePreset) => {
      setDeckSheetOpen(false);
      // Оптимистик: fc_mode_prefs_v1 пишет очередь mode_prefs
      if (deckSheetMode === 'listening') {
        setListeningPreset(preset);
        pushListeningSession(preset);
      } else if (deckSheetMode === 'blitz') {
        setBlitzPreset(preset);
        pushBlitzSession(preset);
      } else {
        setTrainerPreset(preset);
        pushTrainerSession(preset);
      }
    },
    [deckSheetMode, pushTrainerSession, pushListeningSession, pushBlitzSession],
  );

  // ── Hero-CTA (§3.1 п.2) ────────────────────────────────────────────────────
  const heroKind: HeroCtaKind = selectHeroCta(srsDueCount, trainerDueCount);
  const onHeroPress = useCallback(() => {
    void hapticTap();
    if (heroKind === 'review') {
      router.push('/review' as any);
    } else if (heroKind === 'trainer') {
      router.push('/trainer' as any);
    } else {
      router.push({ pathname: '/flashcards_card_editor', params: { create: '1', cat: 'custom' } } as any);
    }
  }, [heroKind, router]);

  const heroTitle =
    heroKind === 'review'
      ? triLang(lang, { ru: 'Повторить сегодня', uk: 'Повторити сьогодні', es: 'Repasar hoy' })
      : heroKind === 'trainer'
        ? triLang(lang, { ru: 'Тренировка', uk: 'Тренування', es: 'Entrenamiento' })
        : triLang(lang, { ru: 'Открой колоду', uk: 'Відкрий колоду', es: 'Abre un mazo' });
  const heroSub =
    heroKind === 'review'
      ? phrasesAndCardsCountLabel(lang, srsDueCount)
      : heroKind === 'trainer'
        ? triLang(lang, { ru: 'Повтори свои ошибки', uk: 'Повтори свої помилки', es: 'Repasa tus errores' })
        : triLang(lang, {
            ru: 'Создай первую карточку или открой стартовый набор',
            uk: 'Створи першу картку або відкрий стартовий набір',
            es: 'Crea tu primera tarjeta o abre un pack inicial',
          });
  const heroIcon: keyof typeof Ionicons.glyphMap =
    heroKind === 'review' ? 'refresh-circle' : heroKind === 'trainer' ? 'barbell' : 'sparkles';

  /** E13: онбординг новичка — совсем нет контента (0 карточек и пустые очереди). */
  const showNewbieOnboarding =
    heroKind === 'empty' && savedCount === 0 && customCount === 0;

  // ── Resume-плитка «Продолжить» (§3.1 п.3) ──────────────────────────────────
  const resumeCategory = useMemo(() => {
    if (!resumeProgress) return null;
    return CATEGORIES.find((c) => c.id === resumeProgress.cat) ?? null;
  }, [resumeProgress]);

  // ── Общие стили секций ─────────────────────────────────────────────────────
  const hubBarW = winW - H_PAD * 2;
  const sectionHeaderStyle = {
    fontSize: 12,
    fontWeight: '800' as const,
    letterSpacing: 0.8,
    textTransform: 'uppercase' as const,
    color: hubLabelMuted,
    marginBottom: 10,
  };
  const sectionGapStyle = { marginBottom: 22 } as const;

  const labelStyle = (owned: boolean) => ({
    marginTop: 8,
    fontSize: labelSize,
    fontWeight: '600' as const,
    letterSpacing: 0.15,
    color: owned ? hubLabelMuted : hubLabelPrimary,
    textAlign: 'center' as const,
    lineHeight: labelSize + 2,
  });

  const packCodeLabelStyle = (owned: boolean) => ({
    marginTop: 8,
    fontSize: labelSize,
    fontWeight: '600' as const,
    letterSpacing: 0.15,
    color: owned ? hubLabelAccent : hubLabelPrimary,
    textAlign: 'center' as const,
    lineHeight: labelSize + 2,
  });

  /** Пилюля счётчика на плитке (число карточек пака / сохранённых). */
  const countPill = (label: string) => (
    <View
      pointerEvents="none"
      style={{
        position: 'absolute',
        right: 6,
        bottom: 6,
        borderRadius: 10,
        paddingHorizontal: 7,
        paddingVertical: 2,
        backgroundColor: t.bgCard,
        borderWidth: 1,
        borderColor: t.border,
      }}
    >
      <Text style={{ fontSize: 10, fontWeight: '800', color: t.textSecond }}>{label}</Text>
    </View>
  );

  /**
   * E12: мини best-звёзды колоды (★★☆) на плитке — fc_deck_best_stars_v1.
   * «Тускнение»: колода не тренировалась 7 дней → opacity 0.4 (§3.1 п.4).
   */
  const deckBestPill = (deckKey: string) => {
    const row = deckBest[deckKey];
    if (!row || row.best <= 0) return null;
    const faded = isDeckFaded(row.lastTrainedISO);
    return (
      <View
        pointerEvents="none"
        testID={`flashcards-hub-deckstars-${deckKey}`}
        style={{
          position: 'absolute',
          left: 6,
          bottom: 6,
          flexDirection: 'row',
          alignItems: 'center',
          gap: 1,
          borderRadius: 10,
          paddingHorizontal: 5,
          paddingVertical: 3,
          backgroundColor: t.bgCard,
          borderWidth: 1,
          borderColor: faded ? t.border : `${t.gold}66`,
          opacity: faded ? 0.4 : 1,
        }}
      >
        {[0, 1, 2].map((i) => (
          <Ionicons key={i} name={i < row.best ? 'star' : 'star-outline'} size={9} color={t.gold} />
        ))}
      </View>
    );
  };

  const renderPackTile = (
    pack: FlashcardMarketPack,
    owned: boolean,
    ugcCommunityCatalog: boolean,
    /** Витрина магазина: плитка уже, чтобы четвёртая «выглядывала» — лента читается как скролл. */
    widthOverride?: number,
  ) => {
    const packTileW = widthOverride ?? tileW;
    const showUgcReportShortcut = ugcCommunityCatalog && !!pack.isCommunityUgc && !owned;
    const displayTitle = packTitleForInterface(pack, lang);
    const hubCode = packHubCodeName(pack);
    /** UGC: під плиткою показуємо назву набору, а не id / похідний codeName. */
    const packTileLabel =
      pack.isCommunityUgc && displayTitle.trim().length > 0 ? displayTitle.trim() : hubCode;
    const ion = packCategoryIonIcon(pack.category) as any;
    const packPng = bundledPackTilePng(pack.id);
    const dimWhileOtherBuying = !owned && buyingPackId && buyingPackId !== pack.id;
    const cardShadow: ViewStyle = !owned ? shadowForTile(t, 'shop') : {};
    const showAuthorEdit =
      !!hubAuthorStableId &&
      !!pack.isCommunityUgc &&
      !!pack.authorStableId &&
      pack.authorStableId === hubAuthorStableId;
    return (
      <View
        key={`mkt_${pack.id}`}
        style={{ width: packTileW, alignItems: 'center', paddingBottom: 6, position: 'relative' }}
      >
        <HubTileShell
          testID={`flashcards-hub-pack-${pack.id}`}
          a11y={pack.isCommunityUgc ? `${pack.titleRu}. ${pack.titleUk}` : `${hubCode}. ${displayTitle}`}
          width={packTileW}
          reduceMotion={reduceMotion}
          disabled={!owned && !!buyingPackId}
          onPress={() => (owned ? void openOwnedPack(pack) : onLockedPackPress(pack))}
          onLongPress={
            showUgcReportShortcut
              ? () => {
                  void hapticTap();
                  setUgcReportHintPackId((cur) => (cur === pack.id ? null : pack.id));
                }
              : undefined
          }
        >
          <View style={{ width: packTileW, position: 'relative', opacity: dimWhileOtherBuying ? 0.55 : 1 }}>
            {owned ? (
              <View
                style={[
                  {
                    width: packTileW,
                    height: packTileW,
                    borderRadius: TILE_RADIUS,
                    borderWidth: 1.5,
                    borderColor: t.accent,
                    backgroundColor: t.bgSurface,
                    alignItems: 'center',
                    justifyContent: 'center',
                    paddingHorizontal: 4,
                    position: 'relative',
                  },
                  shadowForTile(t, 'owned'),
                ]}
              >
                {packPng ? (
                  <Image source={packPng} style={{ width: packTileIconSize, height: packTileIconSize }} contentFit="contain" />
                ) : (
                  <Ionicons name={ion} size={packTileIconSize} color={t.textPrimary} />
                )}
                {/* Прогресс колоды: «N карточек» + best-звёзды 0–3★ с тускнением (E12) */}
                {pack.cardCount > 0 ? countPill(String(pack.cardCount)) : null}
                {deckBestPill(`pack:${pack.id}`)}
              </View>
            ) : (
              <UnownedMarketPackCard
                t={t}
                tileW={packTileW}
                pack={pack}
                iconSize={Math.min(packTileIconSize, Math.floor(packTileW * 0.76))}
                ion={ion}
                packPng={packPng}
                cardShadow={cardShadow}
                reduceMotion={reduceMotion}
              />
            )}
          </View>
        </HubTileShell>
        {showUgcReportShortcut && ugcReportHintPackId === pack.id ? (
          <View style={{ marginTop: 4, width: '100%' }}>
            <TouchableOpacity
              onPress={() => {
                void hapticTap();
                setReportModalPack(pack);
                setUgcReportHintPackId(null);
              }}
              style={{ paddingVertical: 4, width: '100%' }}
              hitSlop={{ top: 6, bottom: 6, left: 8, right: 8 }}
            >
              <Text
                style={{
                  color: t.wrong,
                  fontSize: Math.max(9, labelSize),
                  fontWeight: '800',
                  textAlign: 'center',
                  textDecorationLine: 'underline',
                }}
              >
                {triLang(lang, {
                  ru: 'Пожаловаться на набор',
                  uk: 'Поскаржитися на набір',
                  es: 'Reportar el pack',
                })}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={async () => {
                void hapticTap();
                setUgcReportHintPackId(null);
                try {
                  await hideCommunityPackOnDevice(pack.id);
                  await refreshHiddenCommunityPacks();
                } catch {
                  // no-op: AsyncStorage unavailable
                }
              }}
              style={{ paddingVertical: 4, width: '100%' }}
              hitSlop={{ top: 6, bottom: 6, left: 8, right: 8 }}
            >
              <Text
                style={{
                  color: isGradientSurface ? hubLabelMuted : t.textMuted,
                  fontSize: Math.max(9, labelSize),
                  fontWeight: '800',
                  textAlign: 'center',
                  textDecorationLine: 'underline',
                }}
              >
                {triLang(lang, {
                  ru: 'Не показывать мне',
                  uk: 'Не показувати мені',
                  es: 'No mostrarme',
                })}
              </Text>
            </TouchableOpacity>
          </View>
        ) : null}
        {showAuthorEdit ? (
          <TouchableOpacity
            onPress={() =>
              router.push({ pathname: '/community_pack_create', params: { packId: pack.id } } as any)
            }
            style={{
              position: 'absolute',
              top: 2,
              right: 2,
              zIndex: 8,
              padding: 7,
              borderRadius: 12,
              backgroundColor: `${t.bgPrimary}CC`,
            }}
            hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
          >
            <Ionicons name="create-outline" size={17} color={t.textPrimary} />
          </TouchableOpacity>
        ) : null}
        <Text style={packCodeLabelStyle(owned)} numberOfLines={2}>
          {packTileLabel}
        </Text>
        {pack.isPendingUpdateReview ? (
          <Text style={{ fontSize: 9, color: hubLabelAccent, fontWeight: '800', marginTop: 3, textAlign: 'center' }}>
            {triLang(lang, { ru: 'На модерации', uk: 'На модерації', es: 'En moderación' })}
          </Text>
        ) : null}
        {pack.isCommunityUgc && pack.ratingCount > 0 ? (
          <Text style={{ fontSize: 9, color: hubLabelMuted, marginTop: 2, textAlign: 'center', fontWeight: '700' }}>
            ★ {pack.ratingAvg.toFixed(1)} ({pack.ratingCount})
          </Text>
        ) : null}
      </View>
    );
  };

  /** Плитка «Сохранённые» с числом карточек + плитка «Создать». */
  const renderMyDeckBaseTiles = () => {
    const savedCat = CATEGORIES.find((c) => c.id === 'saved');
    const customCat = CATEGORIES.find((c) => c.id === 'custom');
    return (
      <>
        {savedCat ? (
          <View key="saved" style={{ width: tileW, alignItems: 'center', paddingBottom: 6 }}>
            <HubTileShell
              testID="flashcards-hub-tile-saved"
              a11y="qa-flashcards-hub-tile-saved"
              width={tileW}
              reduceMotion={reduceMotion}
              onPress={() => router.push({ pathname: '/flashcards_collection', params: { cat: 'saved' } } as any)}
            >
              <View
                style={[
                  {
                    width: tileW,
                    height: tileW,
                    borderRadius: TILE_RADIUS,
                    borderWidth: 1,
                    borderColor: t.border,
                    backgroundColor: t.bgSurface,
                    alignItems: 'center',
                    justifyContent: 'center',
                    position: 'relative',
                  },
                  shadowForTile(t, 'base'),
                ]}
              >
                <Ionicons name={savedCat.icon as any} size={iconSize} color={t.textPrimary} />
                {savedCount != null && savedCount > 0 ? countPill(String(savedCount)) : null}
                {deckBestPill('saved')}
              </View>
            </HubTileShell>
            <Text style={labelStyle(true)} numberOfLines={2}>
              {triLang(lang, { ru: savedCat.labelRU, uk: savedCat.labelUK, es: savedCat.labelES })}
            </Text>
          </View>
        ) : null}
        {customCat ? (
          <View key="custom" style={{ width: tileW, alignItems: 'center', paddingBottom: 6 }}>
            <HubTileShell
              testID="flashcards-hub-tile-custom"
              a11y="qa-flashcards-hub-tile-custom"
              width={tileW}
              reduceMotion={reduceMotion}
              onPress={() =>
                router.push({ pathname: '/flashcards_card_editor', params: { create: '1', cat: 'custom' } } as any)
              }
            >
              <View
                style={[
                  {
                    width: tileW,
                    height: tileW,
                    borderRadius: TILE_RADIUS,
                    borderWidth: 1,
                    borderStyle: 'dashed',
                    borderColor: `${t.accent}AA`,
                    backgroundColor: t.bgSurface,
                    alignItems: 'center',
                    justifyContent: 'center',
                  },
                  shadowForTile(t, 'base'),
                ]}
              >
                <Ionicons name="add" size={iconSize + 6} color={t.accent} />
              </View>
            </HubTileShell>
            <Text style={labelStyle(true)} numberOfLines={2}>
              {triLang(lang, { ru: customCat.labelRU, uk: customCat.labelUK, es: customCat.labelES })}
            </Text>
          </View>
        ) : null}
      </>
    );
  };

  /** Карточка режима практики: Тренер / Повторение / Слушание (E10) / Блиц (E12).
   * E8: long-press и иконка ⚙ открывают DeckPickerSheet (быстрый старт — мимо шита). */
  const renderModeCard = (
    key: 'trainer' | 'review' | 'listening' | 'blitz',
    title: string,
    sub: string,
    icon: keyof typeof Ionicons.glyphMap,
    badgeCount: number,
    onPress: () => void,
    onOpenSettings?: () => void,
  ) => {
    const modeW = Math.floor((hubBarW - GAP) / 2);
    return (
      <HubTileShell
        key={key}
        testID={`flashcards-hub-mode-${key}`}
        a11y={`qa-flashcards-hub-mode-${key}`}
        width={modeW}
        reduceMotion={reduceMotion}
        onPress={() => {
          void hapticTap();
          onPress();
        }}
        onLongPress={onOpenSettings}
      >
        <View
          style={[
            {
              width: modeW,
              borderRadius: TILE_RADIUS,
              borderWidth: 1,
              borderColor: badgeCount > 0 ? `${t.accent}66` : t.border,
              backgroundColor: t.bgSurface,
              paddingVertical: 14,
              paddingHorizontal: 14,
              gap: 8,
            },
            shadowForTile(t, 'base'),
          ]}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <View
              style={{
                width: 36,
                height: 36,
                borderRadius: 12,
                backgroundColor: `${t.accent}1F`,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Ionicons name={icon} size={20} color={t.accent} />
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              {badgeCount > 0 ? (
                <View
                  style={{
                    minWidth: 24,
                    height: 24,
                    borderRadius: 12,
                    paddingHorizontal: 6,
                    backgroundColor: t.accent,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Text style={{ color: t.correctText, fontSize: 11, fontWeight: '900' }}>
                    {badgeCountLabel(badgeCount)}
                  </Text>
                </View>
              ) : null}
              {onOpenSettings ? (
                <TouchableOpacity
                  testID={`flashcards-hub-mode-${key}-settings`}
                  accessibilityLabel={`qa-flashcards-hub-mode-${key}-settings`}
                  accessible
                  onPress={onOpenSettings}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  style={{
                    width: 24,
                    height: 24,
                    borderRadius: 12,
                    backgroundColor: `${t.textMuted}1A`,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Ionicons name="options-outline" size={14} color={t.textMuted} />
                </TouchableOpacity>
              ) : null}
            </View>
          </View>
          <View>
            <Text style={{ color: t.textPrimary, fontSize: labelSize + 4, fontWeight: '800' }} numberOfLines={1}>
              {title}
            </Text>
            <Text style={{ color: t.textMuted, fontSize: labelSize, fontWeight: '600', marginTop: 2 }} numberOfLines={1}>
              {sub}
            </Text>
          </View>
        </View>
      </HubTileShell>
    );
  };

  return (
    <View style={{ paddingHorizontal: H_PAD }}>
      {/* ── 1. Хедер: заголовок + баланс осколков (место под звёзды N/21★ — E4) ── */}
      <Reanimated.View {...enterProps(0)} style={sectionGapStyle}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <Text style={{ color: hubLabelPrimary, fontSize: 26, fontWeight: '800', letterSpacing: 0.2 }}>
            {triLang(lang, { ru: 'Карточки', uk: 'Картки', es: 'Tarjetas' })}
          </Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            {/* E13: активный XP-буст ×1.5 (perfect session, §4) — бейдж с таймером */}
            {xpBoostActive ? (
              <View
                testID="flashcards-hub-xpboost"
                accessibilityLabel="qa-flashcards-hub-xpboost"
                accessible
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 4,
                  paddingHorizontal: 8,
                  paddingVertical: 6,
                  borderRadius: 14,
                  borderWidth: 1,
                  borderColor: `${t.accent}77`,
                  backgroundColor: `${t.accent}1C`,
                }}
              >
                <Ionicons name="flash" size={12} color={t.accent} />
                <Text style={{ color: t.accent, fontSize: 11, fontWeight: '800', letterSpacing: 0.2 }}>
                  ×{PERFECT_SESSION_XP_BOOST_MULT} XP
                </Text>
                <Text style={{ color: t.textMuted, fontSize: 10, fontWeight: '700' }}>
                  {xpBoostMinutesLeft}
                  {triLang(lang, { ru: 'м', uk: 'хв', es: 'm' })}
                </Text>
              </View>
            ) : null}
            {/* E4: чип звёзд — баланс N★ + недельный трек X/21.
                E6: сам трек с сундуками-чекпоинтами — под hero-CTA ниже. */}
            {starsWeekly ? (
              <View
                testID="flashcards-hub-stars"
                accessibilityLabel="qa-flashcards-hub-stars"
                accessible
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 5,
                  paddingHorizontal: 10,
                  paddingVertical: 6,
                  borderRadius: 14,
                  borderWidth: 1,
                  borderColor: `${t.gold}66`,
                  backgroundColor: t.goldBg,
                }}
              >
                <Ionicons name="star" size={15} color={t.gold} />
                <Text style={{ color: t.textPrimary, fontSize: 13, fontWeight: '800' }}>{starsTotal}</Text>
                <View style={{ width: 1, height: 12, backgroundColor: `${t.gold}55` }} />
                <Text style={{ color: t.textSecond, fontSize: 11, fontWeight: '800', letterSpacing: 0.2 }}>
                  {starsWeekly.earned}/{starsWeekly.target}
                </Text>
              </View>
            ) : null}
            <TouchableOpacity
              testID="flashcards-hub-shards"
              accessibilityLabel="qa-flashcards-hub-shards"
              accessible
              activeOpacity={0.75}
              onPress={() => {
                void hapticTap();
                router.push({ pathname: '/shards_shop', params: { tab: 'catalog', source: 'flashcards_hub' } } as any);
              }}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 5,
                paddingHorizontal: 10,
                paddingVertical: 6,
                borderRadius: 14,
                borderWidth: 1,
                borderColor: t.border,
                backgroundColor: t.bgCard,
              }}
            >
              <Image source={OSKOLOK_SINGLE} style={{ width: 18, height: 18 }} contentFit="contain" />
              <Text style={{ color: t.textPrimary, fontSize: 13, fontWeight: '800' }}>{shardBalance}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Reanimated.View>

      {/* ── 2. Hero-CTA: review → тренер → empty-state ── */}
      <Reanimated.View {...enterProps(1)} style={sectionGapStyle}>
        <HubTileShell
          testID="flashcards-hub-hero-cta"
          a11y="qa-flashcards-hub-hero-cta"
          width={hubBarW}
          reduceMotion={reduceMotion}
          onPress={onHeroPress}
        >
          <View
            style={[
              {
                width: hubBarW,
                borderRadius: 20,
                borderWidth: 1.5,
                borderColor: `${t.accent}88`,
                overflow: 'hidden',
              },
              shadowForTile(t, 'shop'),
            ]}
          >
            <LinearGradient
              colors={t.cardGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={{ flexDirection: 'row', alignItems: 'center', gap: 14, padding: 16 }}
            >
              <View
                style={{
                  width: 52,
                  height: 52,
                  borderRadius: 18,
                  backgroundColor: `${t.accent}26`,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Ionicons name={heroIcon} size={30} color={t.accent} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ color: t.textOnCard, fontSize: 17, fontWeight: '800' }} numberOfLines={1}>
                  {heroTitle}
                </Text>
                <Text
                  style={{ color: heroKind === 'review' ? t.accent : t.textMuted, fontSize: 13, fontWeight: '700', marginTop: 3 }}
                  numberOfLines={2}
                >
                  {heroSub}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={22} color={t.textMuted} />
            </LinearGradient>
          </View>
        </HubTileShell>
        {/* E13: онбординг-блок новичка (0 карточек): цепочка «уроки → тренировки → ★» */}
        {showNewbieOnboarding ? (
          <View
            testID="flashcards-hub-onboarding"
            accessibilityLabel="qa-flashcards-hub-onboarding"
            accessible
            style={{
              width: hubBarW,
              marginTop: 12,
              borderRadius: 20,
              borderWidth: 1,
              borderColor: t.border,
              backgroundColor: t.bgSurface,
              padding: 16,
            }}
          >
            <Text style={{ color: hubLabelPrimary, fontSize: 15, fontWeight: '800' }}>
              {triLang(lang, {
                ru: 'Как это работает',
                uk: 'Як це працює',
                es: 'Cómo funciona',
              })}
            </Text>
            {[
              {
                icon: 'bookmark-outline' as const,
                text: triLang(lang, {
                  ru: 'Сохраняй фразы из уроков — они станут карточками',
                  uk: 'Зберігай фрази з уроків — вони стануть картками',
                  es: 'Guarda frases de las lecciones: se convertirán en tarjetas',
                }),
              },
              {
                icon: 'barbell-outline' as const,
                text: triLang(lang, {
                  ru: 'Тренируй их в повторении, слушании и блице',
                  uk: 'Тренуй їх у повторенні, слуханні та бліці',
                  es: 'Entrénalas con repaso, escucha y blitz',
                }),
              },
              {
                icon: 'star-outline' as const,
                text: triLang(lang, {
                  ru: 'Зарабатывай ★ и открывай сундуки с осколками',
                  uk: 'Заробляй ★ і відкривай скрині з осколками',
                  es: 'Gana ★ y abre cofres con fragmentos',
                }),
              },
            ].map((step, i) => (
              <View key={i} style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 12 }}>
                <View
                  style={{
                    width: 34,
                    height: 34,
                    borderRadius: 12,
                    backgroundColor: `${t.accent}1C`,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Ionicons name={step.icon} size={18} color={t.accent} />
                </View>
                <Text style={{ color: hubLabelMuted, fontSize: 13, fontWeight: '600', flex: 1, lineHeight: 18 }}>
                  {step.text}
                </Text>
              </View>
            ))}
            <View style={{ flexDirection: 'row', gap: 10, marginTop: 16 }}>
              <TouchableOpacity
                testID="flashcards-hub-onboarding-lessons"
                accessibilityLabel="qa-flashcards-hub-onboarding-lessons"
                accessible
                activeOpacity={0.8}
                onPress={() => {
                  void hapticTap();
                  router.push('/(tabs)/lessons' as any);
                }}
                style={{
                  flex: 1,
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 6,
                  borderRadius: 14,
                  backgroundColor: t.accent,
                  paddingVertical: 12,
                }}
              >
                <Ionicons name="book-outline" size={16} color={t.correctText} />
                <Text style={{ color: t.correctText, fontSize: 13, fontWeight: '800' }}>
                  {triLang(lang, { ru: 'К урокам', uk: 'До уроків', es: 'A las lecciones' })}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                testID="flashcards-hub-onboarding-create"
                accessibilityLabel="qa-flashcards-hub-onboarding-create"
                accessible
                activeOpacity={0.8}
                onPress={() => {
                  void hapticTap();
                  router.push({ pathname: '/flashcards_card_editor', params: { create: '1', cat: 'custom' } } as any);
                }}
                style={{
                  flex: 1,
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 6,
                  borderRadius: 14,
                  borderWidth: 1.5,
                  borderColor: `${t.accent}88`,
                  backgroundColor: `${t.accent}12`,
                  paddingVertical: 12,
                }}
              >
                <Ionicons name="add" size={17} color={t.accent} />
                <Text style={{ color: t.accent, fontSize: 13, fontWeight: '800' }}>
                  {triLang(lang, { ru: 'Создать', uk: 'Створити', es: 'Crear' })}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : null}
        {/* E6: недельный star-трек 21★ с сундуками-чекпоинтами 7/14/21 (§3.1 п.2, §4) */}
        {starsWeekly ? (
          <WeeklyStarTrack
            t={t}
            lang={lang}
            width={hubBarW}
            weekly={starsWeekly}
            claimingChest={claimingChest}
            effectsEnabled={animateSections && getEffectivePlatformOS() !== 'web'}
            pulseEnabled={animateSections}
            onClaim={onChestClaim}
            milestones={milestones}
            milestonesOpen={milestonesOpen}
            onToggleMilestones={() => setMilestonesOpen((v) => !v)}
            claimingMilestone={claimingMilestone}
            onClaimMilestone={onMilestoneClaim}
          />
        ) : null}
      </Reanimated.View>

      {/* ── 3. «Продолжить»: resume-плитка последней колоды ── */}
      {resumeCategory && resumeProgress ? (
        <Reanimated.View {...enterProps(2)} style={sectionGapStyle}>
          <TouchableOpacity
            testID="flashcards-hub-resume"
            accessibilityLabel="qa-flashcards-hub-resume"
            accessible
            activeOpacity={0.8}
            onPress={() => {
              void hapticTap();
              router.push({ pathname: '/flashcards_collection', params: { cat: resumeCategory.id } } as any);
            }}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 10,
              borderRadius: 16,
              borderWidth: 1,
              borderColor: t.border,
              backgroundColor: t.bgSurface,
              paddingVertical: 10,
              paddingHorizontal: 14,
            }}
          >
            <Ionicons name="play-circle-outline" size={22} color={t.accent} />
            <View style={{ flex: 1 }}>
              <Text style={{ color: t.textPrimary, fontSize: labelSize + 3, fontWeight: '700' }} numberOfLines={1}>
                {triLang(lang, { ru: 'Продолжить', uk: 'Продовжити', es: 'Continuar' })}
                {' · '}
                {triLang(lang, {
                  ru: resumeCategory.fullLabelRU,
                  uk: resumeCategory.fullLabelUK,
                  es: resumeCategory.fullLabelES,
                })}
              </Text>
              <Text style={{ color: t.textMuted, fontSize: labelSize, fontWeight: '600', marginTop: 1 }}>
                {triLang(lang, { ru: 'карточка', uk: 'картка', es: 'tarjeta' })} {resumeProgress.idx + 1}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={t.textMuted} />
          </TouchableOpacity>
        </Reanimated.View>
      ) : null}

      {/* ── 4. «Мои колоды»: Сохранённые + Создать + owned-паки ── */}
      <Reanimated.View {...enterProps(3)} style={sectionGapStyle}>
        <Text style={sectionHeaderStyle}>
          {triLang(lang, { ru: 'Мои колоды', uk: 'Мої колоди', es: 'Mis mazos' })}
        </Text>
        <View style={{ width: hubBarW, flexDirection: 'row', flexWrap: 'wrap', gap: GAP, justifyContent: 'flex-start' }}>
          {renderMyDeckBaseTiles()}
          {mineOwnedPacks.map((pack) => renderPackTile(pack, true, false))}
        </View>
      </Reanimated.View>

      {/* ── 5. «Режимы практики»: Тренер + Повторение + Слушание (E10; блиц — E12) ── */}
      <Reanimated.View {...enterProps(4)} style={sectionGapStyle}>
        <Text style={sectionHeaderStyle}>
          {triLang(lang, { ru: 'Режимы практики', uk: 'Режими практики', es: 'Modos de práctica' })}
        </Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: GAP }}>
          {renderModeCard(
            'trainer',
            triLang(lang, { ru: 'Тренер', uk: 'Тренер', es: 'Entrenador' }),
            trainerDueCount > 0
              ? triLang(lang, { ru: 'ждут сегодня', uk: 'чекають сьогодні', es: 'esperan hoy' })
              : triLang(lang, { ru: 'работа над ошибками', uk: 'робота над помилками', es: 'repaso de errores' }),
            'barbell-outline',
            trainerDueCount,
            onTrainerQuickStart,
            openDeckSheet,
          )}
          {renderModeCard(
            'review',
            triLang(lang, { ru: 'Повторение', uk: 'Повторення', es: 'Repaso' }),
            srsDueCount > 0
              ? triLang(lang, { ru: 'фразы на сегодня', uk: 'фрази на сьогодні', es: 'frases para hoy' })
              : triLang(lang, { ru: 'интервальный повтор', uk: 'інтервальний повтор', es: 'repaso espaciado' }),
            'refresh-outline',
            srsDueCount,
            () => router.push('/review' as any),
          )}
          {/* E10: НОВЫЙ режим «Слушание» — аудио-повтор без рук (§3.8) */}
          {renderModeCard(
            'listening',
            triLang(lang, { ru: 'Слушание', uk: 'Слухання', es: 'Escucha' }),
            triLang(lang, { ru: 'аудио-повтор без рук', uk: 'аудіо-повтор без рук', es: 'repaso de audio' }),
            'headset-outline',
            0,
            onListeningQuickStart,
            openListeningSheet,
          )}
          {/* E12: НОВЫЙ режим «Блиц» — 60 секунд на скорость (§3.9) */}
          {renderModeCard(
            'blitz',
            triLang(lang, { ru: 'Блиц', uk: 'Бліц', es: 'Blitz' }),
            triLang(lang, { ru: '60 секунд · 3 жизни', uk: '60 секунд · 3 життя', es: '60 s · 3 vidas' }),
            'flash-outline',
            0,
            onBlitzQuickStart,
            openBlitzSheet,
          )}
        </View>
      </Reanimated.View>

      {/* ── 6. «Магазин наборов»: горизонтальная лента unowned паков → paywall ── */}
      {shopPacks.length > 0 ? (
        <Reanimated.View {...enterProps(5)} style={sectionGapStyle}>
          <Text style={sectionHeaderStyle}>
            {triLang(lang, { ru: 'Магазин наборов', uk: 'Магазин наборів', es: 'Tienda de packs' })}
          </Text>
          {/* Без отрицательных полей: элемент шире страницы раздувает layout viewport на web
              (mobile Chrome фиксирует ширину > device-width → модалки уезжают за экран). */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ gap: GAP }}
            style={{ width: hubBarW }}
          >
            {shopPacks.map((pack) => renderPackTile(pack, false, false, shopTileW))}
          </ScrollView>
        </Reanimated.View>
      ) : null}

      {/* ── 7. «Сообщество» (UGC) ── */}
      {cloudCommunityEnabled ? (
        <Reanimated.View {...enterProps(6)} style={sectionGapStyle}>
          <Text style={sectionHeaderStyle}>
            {triLang(lang, { ru: 'Сообщество', uk: 'Спільнота', es: 'Comunidad' })}
          </Text>
          {hasUnfinishedPackDraft ? (
            <TouchableOpacity
              onPress={() => router.push('/community_pack_create' as any)}
              style={{
                width: hubBarW,
                marginBottom: 10,
                paddingVertical: 12,
                paddingHorizontal: 14,
                borderRadius: 14,
                borderWidth: 1.5,
                borderColor: t.accent,
                backgroundColor: isGradientSurface ? t.bgCard : `${t.accent}1A`,
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
              }}
            >
              <Ionicons name="document-text-outline" size={20} color={t.accent} />
              <Text style={{ color: isGradientSurface ? t.textPrimary : t.accent, fontWeight: '800', fontSize: labelSize + 2 }}>
                {triLang(lang, {
                  ru: 'Продолжить создание набора',
                  uk: 'Продовжити створення набору',
                  es: 'Seguir creando el pack',
                })}
              </Text>
            </TouchableOpacity>
          ) : null}
          <TouchableOpacity
            onPress={() => {
              if (hasUnfinishedPackDraft) {
                setDiscardDraftForNewOpen(true);
                return;
              }
              router.push('/community_pack_create' as any);
            }}
            style={{
              width: hubBarW,
              marginBottom: 12,
              paddingVertical: 12,
              paddingHorizontal: 14,
              borderRadius: 14,
              backgroundColor: t.accent,
              alignItems: 'center',
            }}
          >
            <Text style={{ color: t.correctText, fontWeight: '800', fontSize: labelSize + 2 }}>
              {triLang(lang, { ru: '+ Создать набор', uk: '+ Створити набір', es: '+ Crear pack' })}
            </Text>
          </TouchableOpacity>
          {visibleCommunityPacks.length === 0 ? (
            communityPacks.length === 0 ? (
              <Text style={{ color: hubLabelMuted, fontSize: labelSize + 2, marginBottom: 8 }}>
                {triLang(lang, {
                  ru: 'Здесь появятся наборы после публикации и модерации.',
                  uk: 'Тут з\'являться набори після публікації та модерації.',
                  es: 'Aquí verás packs tras publicarlos y moderarlos.',
                })}
              </Text>
            ) : null
          ) : (
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: GAP }}>
              {visibleCommunityPacks.map((pack) => renderPackTile(pack, isCommunityPackMine(pack), true))}
            </View>
          )}
        </Reanimated.View>
      ) : null}

      {/* ── 8. Футер: «Сообщить о баге» ── */}
      <Reanimated.View {...enterProps(7)} style={{ alignItems: 'center', marginTop: 2, marginBottom: 8, width: '100%' }}>
        <ReportErrorButton
          screen="flashcards_hub"
          dataId="flashcards_hub_main"
          dataText={triLang(lang, {
            ru: 'Карточки: категории и пакеты',
            uk: 'Картки: категорії та пакети',
            es: 'Tarjetas: categorías y packs',
          })}
        />
      </Reanimated.View>

      <ThemedConfirmModal
        visible={discardDraftForNewOpen}
        title={triLang(lang, { ru: 'Новый набор', uk: 'Новий набір', es: 'Nuevo pack' })}
        message={triLang(lang, {
          ru: 'Черновик на устройстве будет удалён. Продолжить?',
          uk: 'Чернетку на пристрої буде видалено. Продовжити?',
          es: 'Se borrará el borrador en el dispositivo. ¿Continuar?',
        })}
        cancelLabel={triLang(lang, { ru: 'Отмена', uk: 'Скасувати', es: 'Cancelar' })}
        confirmLabel={triLang(lang, {
          ru: 'Удалить и создать новый',
          uk: 'Видалити й створити новий',
          es: 'Eliminar y crear otro',
        })}
        confirmVariant="default"
        onCancel={() => setDiscardDraftForNewOpen(false)}
        onConfirm={() => {
          setDiscardDraftForNewOpen(false);
          router.push({ pathname: '/community_pack_create', params: { fresh: '1' } } as any);
        }}
      />
      {reportModalPack ? (
        <ReportPackModal
          visible
          packId={reportModalPack.id}
          packTitle={packTitleForInterface(reportModalPack, lang)}
          authorStableId={reportModalPack.authorStableId ?? null}
          lang={lang}
          onClose={() => setReportModalPack(null)}
          onPackHiddenOnDevice={refreshHiddenCommunityPacks}
        />
      ) : null}
      {/* E6: модалка награды сундука-чекпоинта */}
      <ChestRewardModal reward={chestReward} t={t} lang={lang} onClose={() => setChestReward(null)} />
      {/* E8/E10/E12: шит выбора набора + размера (long-press / ⚙ на плитках режимов) */}
      <DeckPickerSheet
        visible={deckSheetOpen}
        onClose={() => setDeckSheetOpen(false)}
        onStart={onDeckSheetStart}
        decks={deckSheetMode === 'trainer' ? deckSheetOptions : listeningSheetOptions}
        initialPreset={
          deckSheetMode === 'listening' ? listeningPreset : deckSheetMode === 'blitz' ? blitzPreset : trainerPreset
        }
        mode={deckSheetMode}
        lang={lang}
        t={t}
        f={{ h3: 17, body: 15, sub: 13, caption: 11 }}
        reduceMotion={reduceMotion}
      />
      {CardPackPaywallModalEl}
    </View>
  );
}
