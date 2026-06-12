/**
 * LevelGiftDualModal — премиум: два сундука за уровень (F2P + премиум).
 * Левый — картинка редкости; правый — GIFT PREMIUM. Открытие в любом порядке, затем общий экран.
 */

import { LinearGradient } from './SafeLinearGradient';
import { useRouter } from 'expo-router';
import React, { memo, useCallback, useEffect, useRef, useState } from 'react';
import {
  Animated,
  Easing,
  Modal,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Image } from 'expo-image';
import {
  applyGift, ApplyGiftResult, GiftDef, giftDisplayDescForLang, giftDisplayTitleForLang, giftRarityUiLabel,
  isEnergyBonusGiftId,
  rollF2pLevelGiftForUser, rollPremiumLevelGiftForUser,
} from '../app/level_gift_system';
import { triLang, type Lang } from '../constants/i18n';
import { hapticSuccess, hapticTap } from '../hooks/use-haptics';
import { useEnergy } from './EnergyContext';
import { useTheme, type Fonts } from './ThemeContext';
import type { Theme, ThemeMode } from '../constants/theme';
import { GiftOpenBurst, animTierF2p, animTierPrem, type GiftAnimTier } from './GiftOpenEffects';
import AvatarAura from './AvatarAura';
import AvatarView from './AvatarView';
import CustomAvatarBadge from './CustomAvatarBadge';
import LevelGiftArt from './LevelGiftArt';
import { getBestAvatarForLevel } from '../constants/avatars';
import { getLevelGiftRewardIcon } from '../constants/levelGiftRewardIcons';
import {
  RewardModalPanelBackdrop,
  rewardModalAccentColor,
  rewardModalPanelBorder,
  rewardModalPrimaryButtonColors,
  rewardModalPrimaryButtonText,
  rewardModalSoftSurface,
} from './RewardModalBackdrop';
import {
  markDualGiftClaimed,
  markGiftClaimed,
  saveClaimedGiftRarity,
  saveUnclaimedDualGift,
  setLevelHadDualClaim,
  type PremPair,
} from '../app/level_gift_inventory';
import type { RuntimeStudyTarget } from '../app/target_storage_keys';

export {
  loadDualClaimedLevels,
  loadUnclaimedDualGifts,
  markDualGiftClaimed,
  saveUnclaimedDualGift,
  setLevelHadDualClaim,
  UNCLAIMED_DUAL_GIFTS_KEY,
  type PremPair,
} from '../app/level_gift_inventory';

/** Подписи сундуков/карточек — не «F2P»/англ. жаргон, а нормальные RU/UK/ES. */
const DUAL_UI = {
  firstChest:  { ru: 'Подарок за уровень', uk: 'Подарунок за рівень', es: 'Regalo por nivel', 'pt-BR': 'Presente de nível', vi: 'Quà cấp độ', id: 'Hadiah level', tr: 'Seviye hediyesi', pl: 'Prezent za poziom' },
  secondChest: { ru: 'Бонус',             uk: 'Бонус',             es: 'Bono',              'pt-BR': 'Bônus',            vi: 'Thưởng',         id: 'Bonus',         tr: 'Bonus',           pl: 'Bonus' },
} as const;

const firstChestLabel = (lang: Lang) => triLang(lang, {
  ru: DUAL_UI.firstChest.ru,
  uk: DUAL_UI.firstChest.uk,
  es: DUAL_UI.firstChest.es,
  'pt-BR': DUAL_UI.firstChest['pt-BR'],
  vi: DUAL_UI.firstChest.vi,
  id: DUAL_UI.firstChest.id,
  tr: DUAL_UI.firstChest.tr,
  pl: DUAL_UI.firstChest.pl,
});

const secondChestLabel = (lang: Lang) => triLang(lang, {
  ru: DUAL_UI.secondChest.ru,
  uk: DUAL_UI.secondChest.uk,
  es: DUAL_UI.secondChest.es,
  'pt-BR': DUAL_UI.secondChest['pt-BR'],
  vi: DUAL_UI.secondChest.vi,
  id: DUAL_UI.secondChest.id,
  tr: DUAL_UI.secondChest.tr,
  pl: DUAL_UI.secondChest.pl,
});

/** Заголовок карточки премиум-награды: тёмный фиолетовый на светлом фоне (не бледный #C4B5FD). */
const PREM_LABEL_COLOR = '#D6B85C';
/** Без пробела в имени — иначе Metro/бандл на части девайсов не подхватывают `require` и `Image` пустой. */
const RARITY_BORDER: Record<string, string> = {
  common: '#44444488',
  rare:   '#2563EB88',
  epic:   '#B8860B88',
};
const RARITY_BG: Record<string, string> = {
  common: 'transparent',
  rare:   'rgba(37, 99, 235, 0.10)',
  epic:   'rgba(245, 158, 11, 0.12)',
};

const USE_ELITE_DUAL_LEVEL_GIFT_MODAL = true;
const DUAL_CHEST_IMAGE_SIZE = USE_ELITE_DUAL_LEVEL_GIFT_MODAL ? 88 : 82;
const DUAL_CHEST_STAGE_SIZE = USE_ELITE_DUAL_LEVEL_GIFT_MODAL ? 108 : 98;
const MINI_REWARD_STAGE_SIZE = 116;
const MINI_REWARD_ICON_SIZE = 94;
const DETAIL_REWARD_ICON_SIZE = 58;

const dualGiftModalPanelBackground = (themeMode: ThemeMode, t: Theme): string => {
  switch (themeMode) {
    case 'gold':
      return '#140E06';
    case 'coral':
      return '#1E0C10';
    case 'minimalDark':
      return '#070B11';
    case 'dark':
    default:
      return t.bgCard || '#07100B';
  }
};

const isCosmeticGiftId = (id?: string): boolean =>
  id === 'cosmetic_avatar_common' ||
  id === 'premium_cosmetic_avatar' ||
  id === 'cosmetic_avatar_aura' ||
  id === 'premium_cosmetic_aura';

const cosmeticLabelForLang = (result: ApplyGiftResult | null | undefined, lang: Lang): string => {
  const unlocked = result?.cosmeticUnlocked;
  if (!unlocked) return '';
  if (lang === 'uk') return unlocked.labelUk;
  if (lang === 'es') return unlocked.labelEs;
  return unlocked.labelRu;
};

function CosmeticGiftPreview({ result, level }: { result: ApplyGiftResult | null | undefined; level: number }) {
  const unlocked = result?.cosmeticUnlocked;
  if (!unlocked) return null;

  if (unlocked.kind === 'avatar' && unlocked.gradientId) {
    return (
      <CustomAvatarBadge
        avatarId={unlocked.id}
        gradientId={unlocked.gradientId}
        logoColor={unlocked.logoColor ?? 'black'}
        size={58}
      />
    );
  }

  if (unlocked.kind === 'aura') {
    return (
      <AvatarAura auraId={unlocked.id} size={52}>
        <AvatarView avatar={String(getBestAvatarForLevel(level))} level={level} size={52} />
      </AvatarAura>
    );
  }

  return null;
}

type BoxKey = 'f2p' | 'prem';

interface Props {
  visible:           boolean;
  level:             number;
  userName:          string;
  lang:              Lang;
  onClose:           (claimed: boolean) => void;
  preRolledPair?:    PremPair;
  /** claim = apply now; inventory = reveal and save for later application */
  deliveryMode?:     'claim' | 'inventory';
  studyTarget?:      RuntimeStudyTarget;
}

/** pair: сундуки + мини-раскрытие (только названия); full: описания + «Получить всё» */
type Phase = 'pair' | 'full';

function LevelGiftDualModal({ visible, level, userName, lang, onClose, preRolledPair, deliveryMode = 'claim', studyTarget }: Props) {
  const router = useRouter();
  const { theme: t, f, themeMode } = useTheme();
  const { energy, maxEnergy, reload: reloadEnergy } = useEnergy();
  const storesOnly = deliveryMode === 'inventory';

  const [f2pGift, setF2pGift]   = useState<GiftDef | null>(null);
  const [premGift, setPremGift] = useState<GiftDef | null>(null);
  const [opened, setOpened]   = useState<Set<BoxKey>>(() => new Set());
  const [phase, setPhase]     = useState<Phase>('pair');
  const [opening, setOpening] = useState<BoxKey | null>(null);
  const [f2pAppliedMeta, setF2pAppliedMeta] = useState<ApplyGiftResult>({ success: true });
  const [premAppliedMeta, setPremAppliedMeta] = useState<ApplyGiftResult>({ success: true });
  const [claimNowBusy, setClaimNowBusy] = useState(false);

  // Левый сундук
  const fFloat = useRef(new Animated.Value(0)).current;
  const fRock  = useRef(new Animated.Value(0)).current;
  const fScale = useRef(new Animated.Value(1)).current;
  const fShake = useRef(new Animated.Value(0)).current;
  // Правый
  const pFloat = useRef(new Animated.Value(0)).current;
  const pRock  = useRef(new Animated.Value(0)).current;
  const pScale = useRef(new Animated.Value(1)).current;
  const pShake = useRef(new Animated.Value(0)).current;

  const fadeReveal = useRef(new Animated.Value(0)).current;
  const detailScale = useRef(new Animated.Value(0.96)).current;
  const ctaShine = useRef(new Animated.Value(0)).current;
  const modalEntrance = useRef(new Animated.Value(0)).current;
  const modalGlow = useRef(new Animated.Value(0)).current;
  const idleLeft  = useRef<Animated.CompositeAnimation | null>(null);
  const idleRight = useRef<Animated.CompositeAnimation | null>(null);
  const idleAll   = useRef<Animated.CompositeAnimation | null>(null);
  const glowLoop  = useRef<Animated.CompositeAnimation | null>(null);
  const doneClosingRef = useRef(false);
  /** Только false→true по `visible` — иначе лишний сброс `opened` (Strict Mode / смена deps) убирает уже открытые сундуки. */
  const wasVisibleRef = useRef(false);

  const resetAnims = useCallback(() => {
    fFloat.setValue(0); fRock.setValue(0); fScale.setValue(1); fShake.setValue(0);
    pFloat.setValue(0); pRock.setValue(0); pScale.setValue(1); pShake.setValue(0);
    fadeReveal.setValue(0);
    detailScale.setValue(0.96);
    ctaShine.setValue(0);
    modalEntrance.setValue(0);
    modalGlow.setValue(0);
  }, [fFloat, fRock, fScale, fShake, pFloat, pRock, pScale, pShake, fadeReveal, detailScale, ctaShine, modalEntrance, modalGlow]);

  useEffect(() => {
    if (!visible) {
      wasVisibleRef.current = false;
      doneClosingRef.current = false;
      idleAll.current?.stop();
      idleLeft.current?.stop();
      idleRight.current?.stop();
      glowLoop.current?.stop();
      return;
    }
    const justOpened = !wasVisibleRef.current;
    wasVisibleRef.current = true;
    if (justOpened) {
      setOpened(new Set());
      setPhase('pair');
      setOpening(null);
      setClaimNowBusy(false);
      setF2pAppliedMeta({ success: true });
      setPremAppliedMeta({ success: true });
      resetAnims();
      if (USE_ELITE_DUAL_LEVEL_GIFT_MODAL) {
        Animated.spring(modalEntrance, {
          toValue: 1,
          useNativeDriver: true,
          tension: 110,
          friction: 12,
        }).start();
        glowLoop.current?.stop();
        glowLoop.current = Animated.loop(
          Animated.sequence([
            Animated.timing(modalGlow, { toValue: 1, duration: 1500, useNativeDriver: true }),
            Animated.timing(modalGlow, { toValue: 0, duration: 1500, useNativeDriver: true }),
          ])
        );
        glowLoop.current.start();
      }
      setF2pGift(null);
      setPremGift(null);
      if (preRolledPair) {
        setF2pGift(preRolledPair.f2p);
        setPremGift(preRolledPair.prem);
      } else {
        void (async () => {
          const [a, b] = await Promise.all([
            rollF2pLevelGiftForUser(level, { premiumSafe: true, studyTarget }),
            rollPremiumLevelGiftForUser(level, { studyTarget }),
          ]);
          setF2pGift(a);
          setPremGift(b);
        })();
      }
    }
  }, [visible, level, preRolledPair, resetAnims, modalEntrance, modalGlow, studyTarget]);

  useEffect(() => {
    if (!visible || phase !== 'pair' || opened.size !== 2 || !f2pGift || !premGift) return;
    fadeReveal.setValue(0);
    detailScale.setValue(0.96);
    ctaShine.setValue(0);
    const reveal = Animated.parallel([
      Animated.timing(fadeReveal, {
        toValue: 1,
        duration: 420,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.spring(detailScale, {
        toValue: 1,
        tension: 115,
        friction: 11,
        useNativeDriver: true,
      }),
    ]);
    const shine = Animated.loop(
      Animated.sequence([
        Animated.delay(420),
        Animated.timing(ctaShine, {
          toValue: 1,
          duration: 1500,
          easing: Easing.inOut(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.delay(900),
        Animated.timing(ctaShine, {
          toValue: 0,
          duration: 1,
          useNativeDriver: true,
        }),
      ]),
    );
    reveal.start();
    shine.start();
    return () => {
      reveal.stop();
      shine.stop();
    };
  }, [visible, phase, opened.size, f2pGift, premGift, fadeReveal, detailScale, ctaShine]);

  useEffect(() => {
    if (!visible || !storesOnly || !f2pGift || !premGift) return;
    void saveUnclaimedDualGift(level, { f2p: f2pGift, prem: premGift });
  }, [visible, storesOnly, level, f2pGift, premGift]);

  // Idle: оба сундука (или один оставшийся) качаются с разной фазой
  useEffect(() => {
    if (!visible || !f2pGift || !premGift || phase !== 'pair' || opening) return;
    const mkLoop = (fA: Animated.Value, delayMs: number) => {
      const loop = Animated.loop(
        Animated.sequence([
          Animated.timing(fA, { toValue: -5, duration: 420, useNativeDriver: true, delay: delayMs }),
          Animated.timing(fA, { toValue: 0,  duration: 420, useNativeDriver: true }),
        ])
      );
      loop.start();
      return loop;
    };
    const mkr = (rA: Animated.Value) => Animated.loop(
      Animated.sequence([
        Animated.timing(rA, { toValue: -4, duration: 360, useNativeDriver: true }),
        Animated.timing(rA, { toValue:  4, duration: 360, useNativeDriver: true }),
        Animated.timing(rA, { toValue:  0, duration: 300, useNativeDriver: true }),
      ])
    );
    if (opened.size === 0) {
      const a = Animated.parallel([mkLoop(fFloat, 0), mkLoop(pFloat, 180), mkr(fRock), mkr(pRock)]);
      a.start();
      idleAll.current = a;
    } else if (opened.size === 1) {
      const wiggle = !opened.has('f2p')
        ? [mkLoop(fFloat, 0), mkr(fRock)]
        : [mkLoop(pFloat, 0), mkr(pRock)];
      const a = Animated.parallel(wiggle);
      a.start();
      if (!opened.has('f2p')) idleLeft.current = a; else idleRight.current = a;
    }
    return () => {
      idleAll.current?.stop();
      idleLeft.current?.stop();
      idleRight.current?.stop();
    };
  }, [visible, f2pGift, premGift, phase, opening, opened, fFloat, fRock, pFloat, pRock]);

  const fRockI = fRock.interpolate({ inputRange: [-6, 6], outputRange: ['-6deg', '6deg'] });
  const pRockI = pRock.interpolate({ inputRange: [-6, 6], outputRange: ['-6deg', '6deg'] });

  const setEnergyFn = useCallback(
    async (_n: number) => { await reloadEnergy(); },
    [reloadEnergy],
  );

  const runOpenAnim = (which: BoxKey, g: GiftDef) => {
    const shakeA = which === 'f2p' ? fShake : pShake;
    const scaleA = which === 'f2p' ? fScale : pScale;
    const floatA = which === 'f2p' ? fFloat : pFloat;
    const rockA  = which === 'f2p' ? fRock  : pRock;

    idleAll.current?.stop();
    idleLeft.current?.stop();
    idleRight.current?.stop();

    Animated.sequence([
      Animated.parallel([
        Animated.timing(shakeA, { toValue:  9,  duration: 34,  useNativeDriver: true }),
        Animated.timing(scaleA, { toValue: 0.94, duration: 66, useNativeDriver: true }),
      ]),
      Animated.timing(shakeA, { toValue: -12, duration: 34, useNativeDriver: true }),
      Animated.timing(shakeA, { toValue:  10, duration: 30, useNativeDriver: true }),
      Animated.timing(shakeA, { toValue:   0, duration: 24, useNativeDriver: true }),
    ]).start(() => {
      Animated.sequence([
        Animated.spring(scaleA, { toValue: 1.18, tension: 240, friction: 7, useNativeDriver: true }),
        Animated.timing(scaleA, { toValue: 1.42, duration: 96, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
        Animated.timing(scaleA, { toValue: 0, duration: 76, easing: Easing.in(Easing.cubic), useNativeDriver: true }),
      ]).start(() => {
        floatA.setValue(0);
        rockA.setValue(0);
        scaleA.setValue(1);
        // Сразу показываем мини-награду (иконка + название) — не ждём AsyncStorage/apply.
        setOpening(null);
        setOpened(prev => {
          const next = new Set(prev);
          next.add(which);
          return next;
        });
        if (which === 'prem' || g.rarity === 'epic' || g.rarity === 'rare') void hapticSuccess();
        else void hapticTap();
        void (async () => {
          if (storesOnly) return;
          const result = await applyGift(g, userName, energy, maxEnergy, setEnergyFn, { isPremium: true, studyTarget });
          if (which === 'f2p') setF2pAppliedMeta(result);
          else setPremAppliedMeta(result);
        })();
      });
    });
  };

  const onTapF2p = () => {
    if (phase !== 'pair' || opening || !f2pGift || opened.has('f2p')) return;
    hapticTap();
    setOpening('f2p');
    runOpenAnim('f2p', f2pGift);
  };

  const onTapPrem = () => {
    if (phase !== 'pair' || opening || !premGift || opened.has('prem')) return;
    hapticTap();
    setOpening('prem');
    runOpenAnim('prem', premGift);
  };

  const handleSkip = async () => {
    if (f2pGift && premGift && opened.size === 0) {
      await saveUnclaimedDualGift(level, { f2p: f2pGift, prem: premGift });
      onClose(false);
    }
  };

  const handleDone = async (openAvatar = false) => {
    if (!f2pGift || !premGift || doneClosingRef.current) return;
    doneClosingRef.current = true;
    void hapticSuccess();
    if (storesOnly) {
      await saveUnclaimedDualGift(level, { f2p: f2pGift, prem: premGift });
      onClose(false);
      return;
    }
    await markDualGiftClaimed(level);
    await markGiftClaimed(level);
    await setLevelHadDualClaim(level);
    const best = f2pGift.rarity === 'epic' || premGift.rarity === 'epic'
      ? 'epic' : f2pGift.rarity === 'rare' || premGift.rarity === 'rare' ? 'rare' : 'common';
    await saveClaimedGiftRarity(level, best);
    onClose(true);
    if (openAvatar) {
      setTimeout(() => router.push('/avatar_select' as any), 80);
    }
  };

  const handleUseNow = async (openAvatar = false) => {
    if (!f2pGift || !premGift || doneClosingRef.current || claimNowBusy) return;
    setClaimNowBusy(true);
    doneClosingRef.current = true;
    void hapticSuccess();
    try {
      const [f2pResult, premResult] = await Promise.all([
        applyGift(f2pGift, userName, energy, maxEnergy, setEnergyFn, { isPremium: true, studyTarget }).catch(() => ({ success: false })),
        applyGift(premGift, userName, energy, maxEnergy, setEnergyFn, { isPremium: true, studyTarget }).catch(() => ({ success: false })),
      ]);
      setF2pAppliedMeta(f2pResult);
      setPremAppliedMeta(premResult);
      await markDualGiftClaimed(level);
      await markGiftClaimed(level);
      await setLevelHadDualClaim(level);
      const best = f2pGift.rarity === 'epic' || premGift.rarity === 'epic'
        ? 'epic' : f2pGift.rarity === 'rare' || premGift.rarity === 'rare' ? 'rare' : 'common';
      await saveClaimedGiftRarity(level, best);
      onClose(true);
      if (openAvatar) {
        setTimeout(() => router.push('/avatar_select' as any), 80);
      }
    } finally {
      setClaimNowBusy(false);
    }
  };

  if (!visible || !f2pGift || !premGift) return null;

  const borderC = f2pGift.rarity === 'epic' || premGift.rarity === 'epic'
    ? RARITY_BORDER.epic
    : f2pGift.rarity === 'rare' || premGift.rarity === 'rare'
      ? RARITY_BORDER.rare
      : RARITY_BORDER.common;
  const bgTint  = f2pGift.rarity === 'epic' || premGift.rarity === 'epic'
    ? RARITY_BG.epic
    : f2pGift.rarity === 'rare' || premGift.rarity === 'rare'
      ? RARITY_BG.rare
      : RARITY_BG.common;
  const hasCosmeticGift = !storesOnly && (isCosmeticGiftId(f2pGift?.id) || isCosmeticGiftId(premGift?.id));
  const modalScale = modalEntrance.interpolate({ inputRange: [0, 1], outputRange: [0.93, 1] });
  const modalY = modalEntrance.interpolate({ inputRange: [0, 1], outputRange: [18, 0] });
  const glowOpacity = modalGlow.interpolate({ inputRange: [0, 1], outputRange: [0.16, 0.44] });
  const revealY = fadeReveal.interpolate({ inputRange: [0, 1], outputRange: [18, 0] });
  const ctaShineX = ctaShine.interpolate({ inputRange: [0, 1], outputRange: [-180, 220] });
  const modalAccent = rewardModalAccentColor(themeMode, t);
  const modalPanelBackground = dualGiftModalPanelBackground(themeMode, t);
  const primaryButtonColors = rewardModalPrimaryButtonColors(themeMode);
  const primaryButtonText = rewardModalPrimaryButtonText(themeMode);
  const canCloseWithIcon = !opening && (opened.size === 0 || opened.size === 2);
  const screenDim = USE_ELITE_DUAL_LEVEL_GIFT_MODAL
    ? (false ? 'rgba(24,18,10,0.32)' : 'rgba(0,0,0,0.48)')
    : 'rgba(0,0,0,0.78)';

  const onRequestCloseModal = () => {
    if (opened.size === 2 && f2pGift && premGift) {
      void handleDone();
      return;
    }
    if (phase === 'pair' && opened.size === 0) void handleSkip();
  };

  return (
    <Modal transparent visible animationType="fade" onRequestClose={onRequestCloseModal}>
      <View style={{ flex: 1, backgroundColor: screenDim, justifyContent: 'center', alignItems: 'center', overflow: 'hidden' }}>
        <Animated.View testID="level-gift-dual-modal" style={{
          backgroundColor: USE_ELITE_DUAL_LEVEL_GIFT_MODAL ? modalPanelBackground : t.bgCard,
          borderRadius: USE_ELITE_DUAL_LEVEL_GIFT_MODAL ? 30 : 28,
          padding: USE_ELITE_DUAL_LEVEL_GIFT_MODAL ? 22 : 24,
          width: USE_ELITE_DUAL_LEVEL_GIFT_MODAL ? 334 : 320,
          maxHeight: '88%',
          overflow: 'hidden',
          borderWidth: USE_ELITE_DUAL_LEVEL_GIFT_MODAL ? 1 : 1.5,
          borderColor: USE_ELITE_DUAL_LEVEL_GIFT_MODAL ? rewardModalPanelBorder(themeMode, t, borderC === RARITY_BORDER.common ? undefined : borderC) : borderC,
          shadowColor: premGift?.rarity === 'epic' || f2pGift?.rarity === 'epic' ? '#FFD700' : USE_ELITE_DUAL_LEVEL_GIFT_MODAL ? '#D6B85C' : '#7C3AED',
          shadowOpacity: USE_ELITE_DUAL_LEVEL_GIFT_MODAL ? 0.32 : 0.35,
          shadowRadius: USE_ELITE_DUAL_LEVEL_GIFT_MODAL ? 32 : 20,
          transform: USE_ELITE_DUAL_LEVEL_GIFT_MODAL ? [{ scale: modalScale }, { translateY: modalY }] : [],
        }}>
          {USE_ELITE_DUAL_LEVEL_GIFT_MODAL && (
            <RewardModalPanelBackdrop themeMode={themeMode} intensity="strong" />
          )}
          {USE_ELITE_DUAL_LEVEL_GIFT_MODAL && (
            <>
              <Animated.View
                pointerEvents="none"
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 30,
                  right: 30,
                  height: 1,
                  backgroundColor: modalAccent,
                  opacity: glowOpacity,
                }}
              />
              <View
                pointerEvents="none"
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  height: 84,
                  backgroundColor: rewardModalSoftSurface(themeMode, t),
                }}
              />
            </>
          )}
          {bgTint !== 'transparent' && (
            <View style={{ ...{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, borderRadius: 28 }, backgroundColor: bgTint, pointerEvents: 'none' }} />
          )}

          {canCloseWithIcon && (
            <TouchableOpacity
              testID="level-gift-dual-close"
              accessibilityRole="button"
              accessibilityLabel={triLang(lang, { ru: 'Закрыть', uk: 'Закрити', es: 'Cerrar', 'pt-BR': 'Fechar', vi: 'Đóng', id: 'Tutup', tr: 'Kapat', pl: 'Zamknij' })}
              activeOpacity={0.76}
              onPress={() => {
                if (opened.size === 2) void handleDone();
                else void handleSkip();
              }}
              style={{
                position: 'absolute',
                top: 10,
                right: 10,
                zIndex: 5,
                width: 34,
                height: 34,
                borderRadius: 17,
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: USE_ELITE_DUAL_LEVEL_GIFT_MODAL ? 'rgba(3,5,10,0.42)' : 'rgba(0,0,0,0.16)',
                borderWidth: 1,
                borderColor: USE_ELITE_DUAL_LEVEL_GIFT_MODAL ? 'rgba(255,255,255,0.18)' : t.border,
              }}
            >
              <Text style={{ color: t.textPrimary, fontSize: 24, lineHeight: 28, fontWeight: '800' }}>×</Text>
            </TouchableOpacity>
          )}

          <Text style={{ color: USE_ELITE_DUAL_LEVEL_GIFT_MODAL ? modalAccent : t.textPrimary, fontSize: f.label, fontWeight: '900', textTransform: 'uppercase', letterSpacing: 1.2, marginBottom: 4, textAlign: 'center' }}>
            {triLang(lang, {
              ru: `Премиум: уровень ${level}`,
              uk: `Преміум: рівень ${level}`,
              es: `Premium: nivel ${level}`,
              'pt-BR': `Premium: nível ${level}`,
              vi: `Premium: cấp ${level}`,
              id: `Premium: level ${level}`,
              tr: `Premium: seviye ${level}`,
              pl: `Premium: poziom ${level}`,
            })}
          </Text>
          <Text style={{ color: t.textPrimary, fontSize: USE_ELITE_DUAL_LEVEL_GIFT_MODAL ? f.h2 + 1 : f.bodyLg, fontWeight: '900', marginBottom: USE_ELITE_DUAL_LEVEL_GIFT_MODAL ? 16 : 12, textAlign: 'center' }}>
            {triLang(lang, { ru: '🎁 Два подарка', uk: '🎁 Два подарунки', es: '🎁 Dos regalos', 'pt-BR': '🎁 Dois presentes', vi: '🎁 Hai phần quà', id: '🎁 Dua hadiah', tr: '🎁 İki hediye', pl: '🎁 Dwa prezenty' })}
          </Text>

          {phase === 'pair' && (
            <>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: USE_ELITE_DUAL_LEVEL_GIFT_MODAL ? 10 : 6 }}>
                <View style={{ flex: 1, alignItems: 'center', minWidth: 0, backgroundColor: USE_ELITE_DUAL_LEVEL_GIFT_MODAL ? rewardModalSoftSurface(themeMode, t) : 'transparent', borderRadius: USE_ELITE_DUAL_LEVEL_GIFT_MODAL ? 18 : 0, borderWidth: USE_ELITE_DUAL_LEVEL_GIFT_MODAL ? 1 : 0, borderColor: USE_ELITE_DUAL_LEVEL_GIFT_MODAL ? rewardModalPanelBorder(themeMode, t) : 'transparent', paddingVertical: USE_ELITE_DUAL_LEVEL_GIFT_MODAL ? 12 : 0, paddingHorizontal: USE_ELITE_DUAL_LEVEL_GIFT_MODAL ? 6 : 0 }}>
                  {opened.has('f2p') && f2pGift ? (
                    <MiniRewardPeek
                      gift={f2pGift}
                      lang={lang}
                      theme={t}
                      fonts={f}
                      themeMode={themeMode}
                      burstTier={animTierF2p(f2pGift.rarity)}
                      premVisual={false}
                    />
                  ) : (
                    <TouchableOpacity
                      testID="level-gift-dual-f2p-open"
                      activeOpacity={0.88}
                      disabled={opening != null || opened.has('f2p') || !f2pGift}
                      onPress={onTapF2p}
                      style={{ alignItems: 'center' }}
                    >
                      <Animated.View style={{
                        width: DUAL_CHEST_STAGE_SIZE,
                        height: DUAL_CHEST_STAGE_SIZE,
                        alignItems: 'center',
                        justifyContent: 'center',
                        transform: [
                          { translateY: !opened.has('f2p') && opening !== 'f2p' ? fFloat : 0 },
                          { rotateZ: !opened.has('f2p') && opening !== 'f2p' ? fRockI : '0deg' },
                          { scale: fScale },
                          { translateX: fShake },
                        ],
                      }}>
                        <LevelGiftArt
                          themeMode={themeMode}
                          variant={f2pGift?.rarity ?? 'common'}
                          size={DUAL_CHEST_IMAGE_SIZE}
                          opacity={opening === 'f2p' ? 0.72 : 1}
                        />
                      </Animated.View>
                    </TouchableOpacity>
                  )}
                  <Text style={{ color: t.textMuted, fontSize: 10, marginTop: 6, textAlign: 'center', fontWeight: USE_ELITE_DUAL_LEVEL_GIFT_MODAL ? '700' : '400', textTransform: USE_ELITE_DUAL_LEVEL_GIFT_MODAL ? 'uppercase' : 'none', letterSpacing: USE_ELITE_DUAL_LEVEL_GIFT_MODAL ? 0.5 : 0 }}>
                    {firstChestLabel(lang)}
                  </Text>
                </View>
                <View style={{ flex: 1, alignItems: 'center', minWidth: 0, backgroundColor: USE_ELITE_DUAL_LEVEL_GIFT_MODAL ? `${modalAccent}14` : 'transparent', borderRadius: USE_ELITE_DUAL_LEVEL_GIFT_MODAL ? 18 : 0, borderWidth: USE_ELITE_DUAL_LEVEL_GIFT_MODAL ? 1 : 0, borderColor: USE_ELITE_DUAL_LEVEL_GIFT_MODAL ? `${modalAccent}36` : 'transparent', paddingVertical: USE_ELITE_DUAL_LEVEL_GIFT_MODAL ? 12 : 0, paddingHorizontal: USE_ELITE_DUAL_LEVEL_GIFT_MODAL ? 6 : 0 }}>
                  {opened.has('prem') && premGift ? (
                    <MiniRewardPeek
                      gift={premGift}
                      lang={lang}
                      theme={t}
                      fonts={f}
                      themeMode={themeMode}
                      burstTier={animTierPrem()}
                      premVisual
                    />
                  ) : (
                    <TouchableOpacity
                      testID="level-gift-dual-prem-open"
                      activeOpacity={0.88}
                      disabled={opening != null || opened.has('prem') || !premGift}
                      onPress={onTapPrem}
                      style={{ alignItems: 'center' }}
                    >
                      <Animated.View style={{
                        width: DUAL_CHEST_STAGE_SIZE,
                        height: DUAL_CHEST_STAGE_SIZE,
                        alignItems: 'center',
                        justifyContent: 'center',
                        transform: [
                          { translateY: !opened.has('prem') && opening !== 'prem' ? pFloat : 0 },
                          { rotateZ: !opened.has('prem') && opening !== 'prem' ? pRockI : '0deg' },
                          { scale: pScale },
                          { translateX: pShake },
                        ],
                      }}>
                        <LevelGiftArt
                          themeMode={themeMode}
                          variant="premium"
                          size={DUAL_CHEST_IMAGE_SIZE}
                          opacity={opening === 'prem' ? 0.72 : 1}
                        />
                      </Animated.View>
                    </TouchableOpacity>
                  )}
                  <Text style={{ color: PREM_LABEL_COLOR, fontSize: 10, marginTop: 6, textAlign: 'center', fontWeight: '800', textTransform: USE_ELITE_DUAL_LEVEL_GIFT_MODAL ? 'uppercase' : 'none', letterSpacing: USE_ELITE_DUAL_LEVEL_GIFT_MODAL ? 0.5 : 0 }}>
                    {secondChestLabel(lang)}
                  </Text>
                </View>
              </View>
              {opened.size === 0 && (
                <Text style={{ color: t.textMuted, fontSize: f.caption, marginTop: 10, textAlign: 'center' }}>
                  {triLang(lang, {
                      ru: 'Открой оба (в любом порядке)',
                      uk: 'Відкрий обидва (будь-який порядок)',
                      es: 'Abre ambos (en cualquier orden)',
                      'pt-BR': 'Abra os dois em qualquer ordem',
                      vi: 'Mở cả hai theo thứ tự bất kỳ',
                      id: 'Buka keduanya dalam urutan bebas',
                      tr: 'İkisini de istediğin sırayla aç',
                      pl: 'Otwórz oba w dowolnej kolejności',
                    })}
                </Text>
              )}
              {opened.size === 1 && (
                <Text style={{ color: t.gold, fontSize: f.caption, marginTop: 10, textAlign: 'center' }}>
                  {triLang(lang, {
                    ru: 'Ещё награда!',
                    uk: 'Ще одна винагорода!',
                    es: '¡Otra recompensa!',
                    'pt-BR': 'Mais uma recompensa!',
                    vi: 'Thêm một phần thưởng!',
                    id: 'Hadiah lagi!',
                    tr: 'Bir ödül daha!',
                    pl: 'Jeszcze jedna nagroda!',
                  })}
                </Text>
              )}

              {opened.size === 2 && f2pGift && premGift && (
                <Animated.View
                  testID="level-gift-dual-rewards"
                  style={{
                    marginTop: USE_ELITE_DUAL_LEVEL_GIFT_MODAL ? 16 : 14,
                    alignSelf: 'stretch',
                    opacity: fadeReveal,
                    transform: USE_ELITE_DUAL_LEVEL_GIFT_MODAL ? [{ translateY: revealY }, { scale: detailScale }] : [],
                  }}
                >
                  <Text style={{ color: t.textMuted, fontSize: f.caption, textAlign: 'center', marginBottom: 10, fontWeight: '700' }}>
                    {triLang(lang, {
                      ru: 'Что именно ты получил',
                      uk: 'Що саме ти отримав',
                      es: 'Lo que has recibido',
                      'pt-BR': 'O que você recebeu',
                      vi: 'Chính xác bạn đã nhận được gì',
                      id: 'Apa yang kamu dapatkan',
                      tr: 'Tam olarak ne aldın',
                      pl: 'Co dokładnie otrzymujesz',
                    })}
                  </Text>
                  <ScrollView
                    style={{ maxHeight: USE_ELITE_DUAL_LEVEL_GIFT_MODAL ? 310 : 290 }}
                    contentContainerStyle={{ paddingBottom: 2 }}
                    showsVerticalScrollIndicator={false}
                  >
                    <GiftResultBlock
                      t={t} f={f} g={f2pGift} lang={lang}
                      label={firstChestLabel(lang)}
                      meta={f2pAppliedMeta}
                      level={level}
                      themeMode={themeMode}
                    />
                    <View style={{ height: 10 }} />
                    <GiftResultBlock
                      t={t} f={f} g={premGift} lang={lang}
                      label={secondChestLabel(lang)}
                      premVisual
                      meta={premAppliedMeta}
                      level={level}
                      themeMode={themeMode}
                    />
                    {hasCosmeticGift && (
                    <TouchableOpacity
                      testID="level-gift-dual-open-avatar"
                      activeOpacity={0.86}
                      onPress={() => { void (storesOnly ? handleUseNow(true) : handleDone(true)); }}
                      disabled={claimNowBusy}
                      style={{
                          backgroundColor: USE_ELITE_DUAL_LEVEL_GIFT_MODAL ? 'rgba(255,255,255,0.045)' : t.bgSurface,
                          borderRadius: USE_ELITE_DUAL_LEVEL_GIFT_MODAL ? 16 : 14,
                          paddingVertical: 12,
                          marginTop: 14,
                          alignItems: 'center',
                          borderWidth: 1,
                          borderColor: USE_ELITE_DUAL_LEVEL_GIFT_MODAL ? 'rgba(255,255,255,0.12)' : t.border,
                        }}
                      >
                        <Text style={{ color: t.textPrimary, fontSize: f.sub, fontWeight: '800' }}>
                          {triLang(lang, { ru: 'Открыть аватар', uk: 'Відкрити аватар', es: 'Abrir avatar', 'pt-BR': 'Abrir avatar', vi: 'Mở avatar', id: 'Buka avatar', tr: 'Avatarı aç', pl: 'Otwórz avatar' })}
                        </Text>
                      </TouchableOpacity>
                    )}
                  </ScrollView>
                  <TouchableOpacity
                    testID="level-gift-dual-claim"
                    activeOpacity={0.88}
                    disabled={claimNowBusy}
                    onPress={() => { void (storesOnly ? handleUseNow() : handleDone()); }}
                    style={{
                      borderRadius: USE_ELITE_DUAL_LEVEL_GIFT_MODAL ? 18 : 14,
                      marginTop: hasCosmeticGift ? 10 : 16,
                      overflow: 'hidden',
                      borderWidth: USE_ELITE_DUAL_LEVEL_GIFT_MODAL ? 1 : 1.5,
                      borderColor: USE_ELITE_DUAL_LEVEL_GIFT_MODAL ? rewardModalPanelBorder(themeMode, t) : '#A78BFA',
                      shadowColor: '#FFFFFF',
                      shadowOpacity: USE_ELITE_DUAL_LEVEL_GIFT_MODAL ? 0.18 : 0,
                      shadowRadius: USE_ELITE_DUAL_LEVEL_GIFT_MODAL ? 14 : 0,
                      shadowOffset: { width: 0, height: 0 },
                    }}
                  >
                    <LinearGradient
                      colors={USE_ELITE_DUAL_LEVEL_GIFT_MODAL ? primaryButtonColors : ['#6D28D9', '#4C1D95']}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                      style={{ paddingVertical: USE_ELITE_DUAL_LEVEL_GIFT_MODAL ? 15 : 14, alignItems: 'center', justifyContent: 'center' }}
                    >
                      {USE_ELITE_DUAL_LEVEL_GIFT_MODAL && (
                        <Animated.View
                          pointerEvents="none"
                          style={{
                            position: 'absolute',
                            top: -20,
                            bottom: -20,
                            width: 58,
                            backgroundColor: 'rgba(255,255,255,0.55)',
                            opacity: 0.55,
                            transform: [{ translateX: ctaShineX }, { rotate: '18deg' }],
                          }}
                        />
                      )}
                      <Text style={{ color: USE_ELITE_DUAL_LEVEL_GIFT_MODAL ? primaryButtonText : '#FFFFFF', fontSize: f.bodyLg, fontWeight: '900' }}>
                        {storesOnly
                          ? triLang(lang, { ru: claimNowBusy ? 'Применяем...' : 'Использовать сейчас', uk: claimNowBusy ? 'Застосовуємо...' : 'Використати зараз', es: claimNowBusy ? 'Aplicando...' : 'Usar ahora', 'pt-BR': claimNowBusy ? 'Aplicando...' : 'Usar agora', vi: claimNowBusy ? 'Đang áp dụng...' : 'Dùng ngay', id: claimNowBusy ? 'Menerapkan...' : 'Gunakan sekarang', tr: claimNowBusy ? 'Uygulanıyor...' : 'Şimdi kullan', pl: claimNowBusy ? 'Stosowanie...' : 'Użyj teraz' })
                          : triLang(lang, { ru: 'Получить всё', uk: 'Отримати всі', es: 'Reclamar todo', 'pt-BR': 'Resgatar tudo', vi: 'Nhận tất cả', id: 'Klaim semua', tr: 'Hepsini al', pl: 'Odbierz wszystko' })}
                      </Text>
                    </LinearGradient>
                  </TouchableOpacity>
                  {storesOnly && (
                    <TouchableOpacity
                      testID="level-gift-dual-save-opened"
                      activeOpacity={0.82}
                      disabled={claimNowBusy}
                      onPress={() => { void handleDone(); }}
                      style={{
                        marginTop: 10,
                        paddingVertical: USE_ELITE_DUAL_LEVEL_GIFT_MODAL ? 11 : 10,
                        paddingHorizontal: 18,
                        borderRadius: USE_ELITE_DUAL_LEVEL_GIFT_MODAL ? 16 : 14,
                        borderWidth: 1,
                        borderColor: USE_ELITE_DUAL_LEVEL_GIFT_MODAL ? rewardModalPanelBorder(themeMode, t) : t.border,
                        backgroundColor: USE_ELITE_DUAL_LEVEL_GIFT_MODAL ? rewardModalSoftSurface(themeMode, t) : t.bgSurface,
                        alignItems: 'center',
                        opacity: claimNowBusy ? 0.6 : 1,
                      }}
                    >
                      <Text style={{ color: t.textPrimary, fontSize: f.sub, textAlign: 'center', fontWeight: '800' }}>
                        {triLang(lang, { ru: 'Сохранить в подарках', uk: 'Зберегти в подарунках', es: 'Guardar en regalos', 'pt-BR': 'Salvar nos presentes', vi: 'Lưu vào quà', id: 'Simpan ke hadiah', tr: 'Hediyelere kaydet', pl: 'Zapisz w prezentach' })}
                      </Text>
                    </TouchableOpacity>
                  )}
                </Animated.View>
              )}

              {opened.size === 0 && f2pGift && premGift && (
                <TouchableOpacity
                  testID="level-gift-dual-save-later"
                  activeOpacity={0.82}
                  onPress={handleSkip}
                  style={{
                    marginTop: USE_ELITE_DUAL_LEVEL_GIFT_MODAL ? 14 : 12,
                    paddingVertical: USE_ELITE_DUAL_LEVEL_GIFT_MODAL ? 11 : 10,
                    paddingHorizontal: 18,
                    borderRadius: USE_ELITE_DUAL_LEVEL_GIFT_MODAL ? 16 : 14,
                    borderWidth: 1,
                    borderColor: USE_ELITE_DUAL_LEVEL_GIFT_MODAL ? rewardModalPanelBorder(themeMode, t) : t.border,
                    backgroundColor: USE_ELITE_DUAL_LEVEL_GIFT_MODAL ? rewardModalSoftSurface(themeMode, t) : t.bgSurface,
                    alignItems: 'center',
                  }}
                >
                  <Text style={{ color: t.textPrimary, fontSize: f.sub, textAlign: 'center', fontWeight: '800' }}>
                    {triLang(lang, { ru: 'Забрать позже', uk: 'Забрати пізніше', es: 'Reclamar más tarde', 'pt-BR': 'Resgatar mais tarde', vi: 'Nhận sau', id: 'Klaim nanti', tr: 'Daha sonra al', pl: 'Odbierz później' })}
                  </Text>
                </TouchableOpacity>
              )}
            </>
          )}
        </Animated.View>
      </View>
    </Modal>
  );
}

export default memo(LevelGiftDualModal);

/** Сразу после открытия: только иконка + название, без описания (анимация по редкости). */
function MiniRewardPeek({ gift, lang, theme: t, fonts: f, themeMode, burstTier, premVisual }: {
  gift:        GiftDef;
  lang:        Lang;
  theme:       Theme;
  fonts:       Fonts;
  themeMode:   ThemeMode;
  burstTier:   GiftAnimTier;
  premVisual:  boolean;
}) {
  const entry = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    entry.setValue(0);
    const pop = Animated.spring(entry, {
      toValue: 1,
      tension: 145,
      friction: 8,
      useNativeDriver: true,
    });
    pop.start();
    return () => pop.stop();
  }, [entry, gift.id]);

  const entryScale = entry.interpolate({ inputRange: [0, 1], outputRange: [0.68, 1] });
  const entryY = entry.interpolate({ inputRange: [0, 1], outputRange: [10, 0] });

  return (
    <Animated.View style={{ width: '100%', minHeight: 136, alignItems: 'center', justifyContent: 'flex-start', opacity: entry, transform: [{ translateY: entryY }, { scale: entryScale }] }}>
      <View style={{ width: MINI_REWARD_STAGE_SIZE, height: MINI_REWARD_STAGE_SIZE, alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
        <GiftOpenBurst key={`${gift.id}-${burstTier}`} tier={burstTier} size={MINI_REWARD_STAGE_SIZE} />
        <Image
          source={getLevelGiftRewardIcon(gift.id, themeMode)}
          style={{
            width: MINI_REWARD_ICON_SIZE,
            height: MINI_REWARD_ICON_SIZE,
            zIndex: 2,
            position: 'relative',
          }}
          contentFit="contain"
        />
      </View>
      <Text
        numberOfLines={2}
        style={{
          color:            t.textPrimary,
          fontSize:         f.body,
          fontWeight:       '800',
          textAlign:        'center',
          marginTop:        2,
          zIndex:           2,
          position:         'relative',
          paddingHorizontal: 2,
        }}
      >
        {giftDisplayTitleForLang(gift, lang)}
      </Text>
    </Animated.View>
  );
}

function GiftResultBlock({ t, f, g, lang, label, premVisual, meta, level, themeMode }: {
  t:     Theme;
  f:     Fonts;
  g:     GiftDef;
  lang:  Lang;
  label: string;
  premVisual?: boolean;
  meta:  ApplyGiftResult;
  level: number;
  themeMode: ThemeMode;
}) {
  const rarity     = g.rarity;
  const accentCol  = premVisual ? PREM_LABEL_COLOR : rarity === 'epic' ? '#FFD700' : rarity === 'rare' ? '#60A5FA' : 'rgba(255,255,255,0.28)';
  const borderCol  = premVisual ? 'rgba(214,184,92,0.45)' : (RARITY_BORDER[rarity] ?? RARITY_BORDER.common);
  const cosmeticLabel = cosmeticLabelForLang(meta, lang);
  return (
    <View style={{
      borderRadius: USE_ELITE_DUAL_LEVEL_GIFT_MODAL ? 18 : 16,
      borderWidth: USE_ELITE_DUAL_LEVEL_GIFT_MODAL ? 1 : 1.2,
      borderColor: borderCol,
      padding: USE_ELITE_DUAL_LEVEL_GIFT_MODAL ? 14 : 12,
      backgroundColor: USE_ELITE_DUAL_LEVEL_GIFT_MODAL ? 'rgba(255,255,255,0.045)' : 'rgba(0,0,0,0.15)',
      overflow: 'hidden',
    }}>
      {USE_ELITE_DUAL_LEVEL_GIFT_MODAL && (
        <>
          <LinearGradient
            pointerEvents="none"
            colors={premVisual
              ? ['rgba(214,184,92,0.13)', 'rgba(124,58,237,0.06)', 'rgba(255,255,255,0.025)']
              : rarity === 'epic'
                ? ['rgba(245,158,11,0.14)', 'rgba(255,255,255,0.035)', 'rgba(0,0,0,0)']
                : rarity === 'rare'
                  ? ['rgba(37,99,235,0.13)', 'rgba(255,255,255,0.035)', 'rgba(0,0,0,0)']
                  : ['rgba(255,255,255,0.055)', 'rgba(255,255,255,0.02)', 'rgba(0,0,0,0)']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
          />
          <View
            pointerEvents="none"
            style={{
              position: 'absolute',
              top: 0,
              left: 14,
              right: 14,
              height: 1,
              backgroundColor: accentCol,
              opacity: 0.7,
            }}
          />
        </>
      )}
      <Text style={{ color: premVisual ? PREM_LABEL_COLOR : t.textMuted, fontSize: 10, fontWeight: '800', marginBottom: USE_ELITE_DUAL_LEVEL_GIFT_MODAL ? 8 : 4, textTransform: 'uppercase', letterSpacing: USE_ELITE_DUAL_LEVEL_GIFT_MODAL ? 0.5 : 0 }}>
        {label} · {giftRarityUiLabel(rarity, lang)}
      </Text>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <Image source={getLevelGiftRewardIcon(g.id, themeMode)} style={{ width: DETAIL_REWARD_ICON_SIZE, height: DETAIL_REWARD_ICON_SIZE }} contentFit="contain" />
        <View style={{ flex: 1 }}>
          <Text style={{ color: t.textPrimary, fontSize: f.h2 - 2, fontWeight: '900' }}>{giftDisplayTitleForLang(g, lang)}</Text>
          {!!giftDisplayDescForLang(g, lang) && (
            <Text style={{ color: t.textSecond, fontSize: f.caption, marginTop: 2 }}>{giftDisplayDescForLang(g, lang)}</Text>
          )}
        </View>
      </View>
      {g.id && isEnergyBonusGiftId(g.id) && (
        <EnergyNote f={f} g={g} lang={lang} energyBoostAlreadyActive={!!meta.energyBoostAlreadyActive} />
      )}
      {!!cosmeticLabel && (
        <View testID="level-gift-dual-cosmetic-preview" style={{ marginTop: 8, padding: 8, backgroundColor: 'rgba(124,58,237,0.12)', borderRadius: 8, borderWidth: 1, borderColor: '#A78BFA55', alignItems: 'center', gap: 7 }}>
          <CosmeticGiftPreview result={meta} level={level} />
          <Text style={{ color: t.textPrimary, fontSize: f.caption, textAlign: 'center', fontWeight: '700' }}>
            {triLang(lang, {
              ru: `Открыто: ${cosmeticLabel}`,
              uk: `Відкрито: ${cosmeticLabel}`,
              es: `Desbloqueado: ${cosmeticLabel}`,
              'pt-BR': `Desbloqueado: ${cosmeticLabel}`,
              vi: `Đã mở khóa: ${cosmeticLabel}`,
              id: `Terbuka: ${cosmeticLabel}`,
              tr: `Açıldı: ${cosmeticLabel}`,
              pl: `Odblokowano: ${cosmeticLabel}`,
            })}
          </Text>
        </View>
      )}
      {(g.id === 'xp_2x_24h' || g.id === 'xp_2x_48h') && meta.xpBoostAlreadyActive && (
        <View style={{ marginTop: 8, padding: 8, backgroundColor: '#FEF3C7', borderRadius: 8, borderWidth: 1, borderColor: '#D97706' }}>
          <Text style={{ color: '#78350F', fontSize: f.caption, textAlign: 'center', fontWeight: '600' }}>
            {triLang(lang, { ru: '2× буст обновлён', uk: '2× буст оновлено', es: 'Bono de XP ×2 actualizado', 'pt-BR': 'Bônus de XP ×2 atualizado', vi: 'Boost XP ×2 đã cập nhật', id: 'Boost XP ×2 diperbarui', tr: 'XP ×2 boost güncellendi', pl: 'Boost XP ×2 zaktualizowany' })}
          </Text>
        </View>
      )}
    </View>
  );
}

function EnergyNote({ f, g, lang, energyBoostAlreadyActive }: {
  f:     Fonts;
  g:     GiftDef;
  lang:  Lang;
  energyBoostAlreadyActive: boolean;
}) {
  const n = g.id === 'energy_plus1' ? 1 : g.id === 'energy_plus3' ? 3 : 2;
  return (
    <View style={{
      marginTop: 8,
      paddingVertical: 8,
      paddingHorizontal: 10,
      backgroundColor: '#FEF3C7',
      borderRadius: 8,
      borderWidth: 1,
      borderColor: '#D97706',
    }}>
      {energyBoostAlreadyActive
        ? (
            <Text style={{ color: '#78350F', fontSize: f.caption, textAlign: 'center', fontWeight: '700' }}>
              {triLang(lang, {
                ru: `Буст заменён (+${n})`,
                uk: `Буст замінено (+${n})`,
                es: `Bono reemplazado (+${n})`,
                'pt-BR': `Bônus substituído (+${n})`,
                vi: `Boost đã được thay (+${n})`,
                id: `Boost diganti (+${n})`,
                tr: `Boost değiştirildi (+${n})`,
                pl: `Boost zastąpiony (+${n})`,
              })}
            </Text>
          )
        : (
            <Text style={{ color: '#78350F', fontSize: f.caption, textAlign: 'center', fontWeight: '600' }}>
              {triLang(lang, { ru: 'До полуночи', uk: 'Діє до півночі', es: 'Vigente hasta medianoche', 'pt-BR': 'Até meia-noite', vi: 'Đến nửa đêm', id: 'Sampai tengah malam', tr: 'Gece yarısına kadar', pl: 'Do północy' })}
            </Text>
          )}
    </View>
  );
}
