/**
 * LevelGiftModal — модальное окно подарка за повышение уровня.
 * Объёмный парящий сундук → тап → крышка отлетает, награда выплывает → результат.
 * Анимация раскрытия зависит от редкости (БЕЗ конфетти):
 *   common → энергия и осколки (холодный голубой)
 *   rare   → свечение и лучи (фиолетовый)
 *   epic   → золото и шёлковый блик
 *
 * Кнопка «Забрать позже» сохраняет подарок как непринятый — его можно забрать
 * позже в разделе подарков.
 */

import { useRouter } from 'expo-router';
import { LinearGradient } from './SafeLinearGradient';
import React, { memo, useEffect, useRef, useState } from 'react';
import {
  Animated, Easing, Modal, ScrollView, StyleSheet, Text, TouchableOpacity, View,
} from 'react-native';
import { Image } from 'expo-image';
import {
  applyGift, ApplyGiftResult, GiftDef, giftDisplayDescForLang, giftDisplayTitleForLang, giftRarityUiLabel,
  isEnergyBonusGiftId, isPremiumLevelGiftId, rollF2pLevelGiftForUser,
} from '../app/level_gift_system';
import { triLang, type Lang } from '../constants/i18n';
import { emitAppEvent } from '../app/events';
import { monoIcon, MONO_ICON } from '../constants/monoIcon';
import { hapticSuccess, hapticTap } from '../hooks/use-haptics';
import { useEnergy } from './EnergyContext';
import { useTheme } from './ThemeContext';
import AvatarAura from './AvatarAura';
import AvatarView from './AvatarView';
import CustomAvatarBadge from './CustomAvatarBadge';
import { getBestAvatarForLevel } from '../constants/avatars';
import { getLevelGiftRewardIcon } from '../constants/levelGiftRewardIcons';
import { GiftOpenBurst, animTierF2p } from './GiftOpenEffects';
import { GiftBox3D, paletteForRarity } from './level_gift_box';
import PlusBadge from './PlusBadge';
import {
  RewardModalPanelBackdrop,
  RewardModalLiquidGlass,
  rewardModalAccentColor,
  rewardModalPanelBorder,
  rewardModalPanelColors,
  rewardModalPrimaryButtonColors,
  rewardModalPrimaryButtonText,
  rewardModalSoftSurface,
} from './RewardModalBackdrop';
import {
  markGiftClaimed,
  saveClaimedGiftRarity,
  saveUnclaimedGift,
} from '../app/level_gift_inventory';
import type { RuntimeStudyTarget } from '../app/target_storage_keys';
import {
  captureAccountGeneration,
  isCurrentAccountGeneration,
  type AccountGenerationToken,
} from '../app/account_generation';
import { isCurrentLevelGiftOpening } from '../app/level_gift_opening_guard';

import { noAndroidOutline } from '../constants/androidGlow';
export {
  CLAIMED_GIFTS_KEY,
  loadClaimedGiftRarities,
  loadUnclaimedGifts,
  markGiftClaimed,
  saveClaimedGiftRarity,
  saveUnclaimedGift,
  UNCLAIMED_GIFTS_KEY,
} from '../app/level_gift_inventory';

interface Props {
  visible:        boolean;
  level:          number;
  userName:       string;
  lang:           Lang;
  onClose:        (claimed: boolean) => void;
  /** If provided, shows this specific gift instead of rolling a new one */
  preRolledGift?: GiftDef;
  /** claim = apply now; inventory = reveal and save for later application */
  deliveryMode?: 'claim' | 'inventory';
  /** open = show the chest ritual; apply = apply an already revealed inventory gift. */
  presentationMode?: 'open' | 'apply';
  /** Override cleanup for gifts that are stored in a split source, such as one part of a premium pair. */
  onGiftClaimed?: (gift: GiftDef, accountToken: AccountGenerationToken) => Promise<void>;
  /** Restores a split entitlement if its reward effect cannot be confirmed. */
  onGiftApplyFailed?: (gift: GiftDef, accountToken: AccountGenerationToken) => Promise<void>;
  /** Refreshes inventory only after the background effect and claim journal settle. */
  onGiftApplySettled?: () => void | Promise<void>;
  /** Whether dismissing the unopened claim modal should save the gift back to inventory. */
  saveOnDismiss?: boolean;
  /** Force premium application semantics for gifts that came from a premium pair. */
  applyAsPremium?: boolean;
  /** Stable entitlement occurrence used to make reward application idempotent. */
  occurrenceId?: string;
  studyTarget?: RuntimeStudyTarget;
}

type Phase = 'box' | 'opening' | 'reveal';

const LEVEL_GIFT_OPEN_SAFETY_MS = 520;
const LEVEL_GIFT_STAGE_SIZE = 150;

const isCosmeticGiftId = (id?: string): boolean =>
  id === 'cosmetic_avatar_common' ||
  id === 'premium_cosmetic_avatar' ||
  id === 'cosmetic_avatar_aura' ||
  id === 'premium_cosmetic_aura';

const cosmeticLabelForLang = (result: ApplyGiftResult | null, lang: Lang): string => {
  const unlocked = result?.cosmeticUnlocked;
  if (!unlocked) return '';
  if (lang === 'uk') return unlocked.labelUk;
  if (lang === 'es') return unlocked.labelEs;
  return unlocked.labelRu;
};

const emitGiftApplyOutcome = (success: boolean): void => {
  emitAppEvent('action_toast', success ? {
    type: 'success',
    messageRu: 'Подарок применён.',
    messageUk: 'Подарунок застосовано.',
    messageEs: 'Regalo aplicado.',
    messagePtBr: 'Presente aplicado.',
    messageVi: 'Đã áp dụng quà.',
    messageId: 'Hadiah diterapkan.',
    messageTr: 'Hediye uygulandı.',
    messagePl: 'Prezent zastosowany.',
  } : {
    type: 'error',
    messageRu: 'Подарок не применился и остался в инвентаре.',
    messageUk: 'Подарунок не застосувався й залишився в інвентарі.',
    messageEs: 'El regalo no se aplicó y sigue en el inventario.',
    messagePtBr: 'O presente não foi aplicado e continua no inventário.',
    messageVi: 'Quà chưa được áp dụng và vẫn còn trong kho.',
    messageId: 'Hadiah belum diterapkan dan tetap ada di inventaris.',
    messageTr: 'Hediye uygulanmadı ve envanterde kaldı.',
    messagePl: 'Prezent nie został użyty i pozostał w ekwipunku.',
  });
};

function CosmeticGiftPreview({ result, level }: { result: ApplyGiftResult | null; level: number }) {
  const unlocked = result?.cosmeticUnlocked;
  if (!unlocked) return null;

  if (unlocked.kind === 'avatar' && unlocked.gradientId) {
    return (
      <CustomAvatarBadge
        avatarId={unlocked.id}
        gradientId={unlocked.gradientId}
        logoColor={unlocked.logoColor ?? 'black'}
        size={74}
      />
    );
  }

  if (unlocked.kind === 'aura') {
    return (
      <AvatarAura auraId={unlocked.id} size={62}>
        <AvatarView avatar={String(getBestAvatarForLevel(level))} level={level} size={62} />
      </AvatarAura>
    );
  }

  return null;
}

function LevelGiftModal({
  visible,
  level,
  userName,
  lang,
  onClose,
  preRolledGift,
  deliveryMode = 'claim',
  presentationMode = 'open',
  onGiftClaimed,
  onGiftApplyFailed,
  onGiftApplySettled,
  saveOnDismiss = true,
  applyAsPremium,
  occurrenceId,
  studyTarget,
}: Props) {
  const router = useRouter();
  const { theme: t, f, themeMode } = useTheme();
  const { energy, maxEnergy, reload: reloadEnergy } = useEnergy();
  const storesOnly = deliveryMode === 'inventory';

  const [phase, setPhase] = useState<Phase>('box');
  const [gift, setGift]   = useState<GiftDef | null>(null);
  const [xpBoostAlreadyActive, setXpBoostAlreadyActive] = useState(false);
  const [energyBoostAlreadyActive, setEnergyBoostAlreadyActive] = useState(false);
  const [choiceBusy, setChoiceBusy] = useState(false);
  const [appliedResult, setAppliedResult] = useState<ApplyGiftResult | null>(null);

  const floatAnim  = useRef(new Animated.Value(0)).current;
  const rockAnim   = useRef(new Animated.Value(0)).current;
  const scaleAnim  = useRef(new Animated.Value(1)).current;
  const fadeReveal = useRef(new Animated.Value(0)).current;
  const shakeAnim  = useRef(new Animated.Value(0)).current;
  const lidLift    = useRef(new Animated.Value(0)).current;
  const orbRise    = useRef(new Animated.Value(0)).current;
  // зачем: пульсация награды живёт на ОТДЕЛЬНОМ значении от влёта (orbRise).
  // Раньше цикл гонял сам orbRise 1↔1.12, из-за чего иконка бесконечно
  // «выезжала» — выглядело как зацикленная анимация появления.
  const orbPulse   = useRef(new Animated.Value(0)).current;
  const modalEntrance = useRef(new Animated.Value(0)).current;
  const modalGlow = useRef(new Animated.Value(0)).current;
  const idleLoop   = useRef<Animated.CompositeAnimation | null>(null);
  const glowLoop   = useRef<Animated.CompositeAnimation | null>(null);
  const orbHoverLoop = useRef<Animated.CompositeAnimation | null>(null);
  const isVisibleRef = useRef(false);
  const openingAccountTokenRef = useRef<AccountGenerationToken | null>(null);
  const isCurrentOpening = (accountToken: AccountGenerationToken): boolean =>
    isCurrentLevelGiftOpening(openingAccountTokenRef.current, accountToken);

  // Roll (or use pre-rolled) gift when the modal becomes visible; премиум — отдельный пул
  useEffect(() => {
    const justOpened = visible && !isVisibleRef.current;
    isVisibleRef.current = visible;
    if (!visible) {
      idleLoop.current?.stop();
      glowLoop.current?.stop();
      orbHoverLoop.current?.stop();
      return;
    }
    if (!justOpened) return;
    openingAccountTokenRef.current = captureAccountGeneration();
    {
      setPhase('box');
      setXpBoostAlreadyActive(false);
      setEnergyBoostAlreadyActive(false);
      setChoiceBusy(false);
      setAppliedResult(null);
      setGift(null);
      if (preRolledGift) {
        setGift(preRolledGift);
      } else {
        const accountToken = openingAccountTokenRef.current;
        void (async () => {
          try {
            const rolledGift = await rollF2pLevelGiftForUser(level, { studyTarget });
            if (accountToken && isCurrentOpening(accountToken)) setGift(rolledGift);
          } catch {
            // Reservation remains unclaimed and can be retried after connectivity returns.
            if (accountToken && isCurrentOpening(accountToken)) {
              emitAppEvent('action_toast', {
                type: 'info',
                messageRu: 'Подарок не потерян. Подключись к интернету и попробуй открыть его снова.',
                messageUk: 'Подарунок не втрачено. Підключися до інтернету й спробуй відкрити його знову.',
                messageEs: 'El regalo sigue guardado. Conéctate a internet e intenta abrirlo de nuevo.',
              });
              onClose(false);
            }
          }
        })();
      }
      fadeReveal.setValue(presentationMode === 'apply' ? 1 : 0);
      scaleAnim.setValue(1);
      shakeAnim.setValue(0);
      floatAnim.setValue(0);
      rockAnim.setValue(0);
      lidLift.setValue(0);
      orbRise.setValue(presentationMode === 'apply' ? 1 : 0);
      orbPulse.setValue(0);
      modalEntrance.setValue(0);
      modalGlow.setValue(0);
      Animated.spring(modalEntrance, {
        toValue: 1,
        useNativeDriver: true,
        tension: 115,
        friction: 12,
      }).start();
      glowLoop.current?.stop();
      glowLoop.current = Animated.loop(
        Animated.sequence([
          Animated.timing(modalGlow, { toValue: 1, duration: 1450, useNativeDriver: true }),
          Animated.timing(modalGlow, { toValue: 0, duration: 1450, useNativeDriver: true }),
        ])
      );
      glowLoop.current.start();
    }
  }, [visible, level, preRolledGift, fadeReveal, floatAnim, rockAnim, scaleAnim, shakeAnim, lidLift, orbRise, orbPulse, modalEntrance, modalGlow, presentationMode, studyTarget, onClose]);

  useEffect(() => {
    if (!visible || !gift) {
      idleLoop.current?.stop();
      return;
    }
    const floatLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(floatAnim, { toValue: -7, duration: 1700, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(floatAnim, { toValue: 2,  duration: 1700, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      ])
    );
    const rockLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(rockAnim, { toValue: -5, duration: 1700, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(rockAnim, { toValue:  5, duration: 1700, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      ])
    );
    idleLoop.current = Animated.parallel([floatLoop, rockLoop]);
    idleLoop.current.start();
    return () => { idleLoop.current?.stop(); };
  }, [visible, gift, floatAnim, rockAnim]);

  useEffect(() => {
    if (!visible || !storesOnly || !gift) return;
    const accountToken = openingAccountTokenRef.current;
    if (!accountToken || !isCurrentAccountGeneration(accountToken)) return;
    void saveUnclaimedGift(level, gift, accountToken);
  }, [visible, storesOnly, level, gift]);

  const rock = rockAnim.interpolate({ inputRange: [-6, 6], outputRange: ['-6deg', '6deg'] });

  const handleTap = (skipOpeningAnimation = false) => {
    if (phase !== 'box' || !gift) return;
    const accountToken = openingAccountTokenRef.current;
    if (!accountToken || !isCurrentOpening(accountToken)) return;
    if (!skipOpeningAnimation) hapticTap();
    setPhase('opening');

    idleLoop.current?.stop();
    floatAnim.setValue(0);
    rockAnim.setValue(0);

    // Награда грузится в фоне — не await до старта анимации, иначе JS-поток блокируется
    // и открытие «подвисает». Итог дожидаем в finalize.
    // Reveal is driven by the chest animation; storage/application finishes in the background.
    const g = gift;
    const setEnergyFn = async (_n: number) => { await reloadEnergy(); };
    const giftOccurrenceId = occurrenceId ?? `level:${level}:${applyAsPremium ? 'premium' : 'f2p'}`;
    const applyP: Promise<ApplyGiftResult> = g.choices?.length || storesOnly
      ? Promise.resolve({ success: true })
      : (async () => {
          try {
            const result = await applyGift(
              g,
              userName,
              energy,
              maxEnergy,
              setEnergyFn,
              { ...(applyAsPremium === undefined ? {} : { isPremium: applyAsPremium }), studyTarget, accountToken, occurrenceId: giftOccurrenceId, localOnly: true },
            );
            if (!isCurrentAccountGeneration(accountToken)) return { success: false };
            if (result.success) {
              await (onGiftClaimed ? onGiftClaimed(g, accountToken) : markGiftClaimed(level, accountToken));
              await saveClaimedGiftRarity(level, g.rarity, accountToken);
            } else if (result.alreadyClaimed) {
              await (onGiftClaimed ? onGiftClaimed(g, accountToken) : markGiftClaimed(level, accountToken));
            } else if (onGiftApplyFailed) {
              await onGiftApplyFailed(g, accountToken);
            }
            if (presentationMode === 'apply') emitGiftApplyOutcome(result.success);
            return result;
          } finally {
            if (presentationMode === 'apply') {
              try { await onGiftApplySettled?.(); } catch {}
            }
          }
        })();
    const applyResultP: Promise<ApplyGiftResult> = applyP.catch(() => ({ success: false }));
    const updateAppliedMeta = () => {
      void applyResultP.then((result) => {
        if (!isCurrentOpening(accountToken)) return;
        if (result.xpBoostAlreadyActive) setXpBoostAlreadyActive(true);
        if (result.energyBoostAlreadyActive) setEnergyBoostAlreadyActive(true);
        setAppliedResult(result);
      });
    };

    let safetyTimer: ReturnType<typeof setTimeout> | undefined;
    let finalized = false;
    const finalize = () => {
      if (finalized || !isCurrentOpening(accountToken)) return;
      finalized = true;
      if (safetyTimer) clearTimeout(safetyTimer);
      if (storesOnly) {
        void saveUnclaimedGift(level, g, accountToken);
      }
      setAppliedResult({ success: true });
      setPhase('reveal');
      fadeReveal.setValue(0);
      orbRise.setValue(0);
      orbPulse.setValue(0);
      Animated.parallel([
        Animated.spring(fadeReveal, { toValue: 1, useNativeDriver: true, tension: 160, friction: 9 }),
        Animated.spring(orbRise, { toValue: 1, useNativeDriver: true, tension: 120, friction: 9 }),
      ]).start(() => {
        if (!isCurrentOpening(accountToken)) return;
        // зачем: после влёта — ТОЛЬКО пульсация масштаба на месте.
        // Никакого вертикального хода, иначе цикл читается как повтор появления.
        orbHoverLoop.current?.stop();
        orbHoverLoop.current = Animated.loop(
          Animated.sequence([
            Animated.timing(orbPulse, { toValue: 1, duration: 1250, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
            Animated.timing(orbPulse, { toValue: 0, duration: 1250, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
          ])
        );
        orbHoverLoop.current.start();
      });
      updateAppliedMeta();
    };
    if (skipOpeningAnimation) {
      finalize();
      return;
    }
    safetyTimer = setTimeout(finalize, LEVEL_GIFT_OPEN_SAFETY_MS);

    // Короткая дрожь → крышка отлетает (lidLift) → finalize раскрывает награду.
    Animated.sequence([
      Animated.parallel([
        Animated.timing(shakeAnim, { toValue: 9, duration: 34, useNativeDriver: true }),
        Animated.timing(scaleAnim, { toValue: 0.96, duration: 66, useNativeDriver: true }),
      ]),
      Animated.timing(shakeAnim, { toValue: -11, duration: 34, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 8, duration: 30, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 0, duration: 24, useNativeDriver: true }),
    ]).start(() => {
      Animated.parallel([
        Animated.spring(scaleAnim, { toValue: 1.06, tension: 200, friction: 8, useNativeDriver: true }),
        Animated.timing(lidLift, { toValue: 1, duration: 360, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
      ]).start(() => { finalize(); });
    });
  };

  const handleSkip = async () => {
    const accountToken = openingAccountTokenRef.current;
    if (!accountToken || !isCurrentOpening(accountToken)) return;
    if (presentationMode === 'apply') {
      if (phase === 'opening') return;
      onClose(phase === 'reveal');
      return;
    }
    if (!gift) { onClose(false); return; }
    if (phase === 'opening') return;
    if (storesOnly || saveOnDismiss) {
      // Save as unclaimed so user can pick it up later in the gifts inventory.
      await saveUnclaimedGift(level, gift, accountToken);
      if (!isCurrentOpening(accountToken)) return;
    }
    onClose(false);
  };

  const handleChoice = async (chosen: GiftDef) => {
    if (choiceBusy) return;
    const accountToken = openingAccountTokenRef.current;
    if (!accountToken || !isCurrentOpening(accountToken)) return;
    setChoiceBusy(true);
    const chosenWithReservation = {
      ...chosen,
      ...(gift?.levelGiftReservation ? { levelGiftReservation: gift.levelGiftReservation } : {}),
      ...(chosen.spinRewardReceipt
        ? { spinRewardReceipt: chosen.spinRewardReceipt }
        : gift?.spinRewardReceipt ? { spinRewardReceipt: gift.spinRewardReceipt } : {}),
    };
    const giftOccurrenceId = occurrenceId ?? `level:${level}:${applyAsPremium ? 'premium' : 'f2p'}`;
    setGift(chosenWithReservation);
    void hapticSuccess();
    if (presentationMode === 'apply' && phase === 'box') {
      setChoiceBusy(false);
      return;
    }
    if (storesOnly) {
      void saveUnclaimedGift(level, chosenWithReservation, accountToken).catch(() => {});
      if (!isCurrentOpening(accountToken)) return;
      onClose(false);
      return;
    }
    if (presentationMode === 'apply') {
      setAppliedResult({ success: true });
      setChoiceBusy(false);
    } else {
      setAppliedResult({ success: true });
      onClose(true);
    }
    if (presentationMode !== 'apply' && isCosmeticGiftId(chosen.id)) {
      setTimeout(() => {
        if (isCurrentOpening(accountToken)) router.push('/avatar_select' as any);
      }, 80);
    }
    void (async () => {
      try {
        const setEnergyFn = async (_n: number) => { await reloadEnergy(); };
        const result = await applyGift(
          chosenWithReservation,
          userName,
          energy,
          maxEnergy,
          setEnergyFn,
          { ...(applyAsPremium === undefined ? {} : { isPremium: applyAsPremium }), studyTarget, accountToken, occurrenceId: giftOccurrenceId, localOnly: true },
        );
        if (!isCurrentAccountGeneration(accountToken)) return;
        if (isCurrentOpening(accountToken)) {
          if (result.xpBoostAlreadyActive) setXpBoostAlreadyActive(true);
          if (result.energyBoostAlreadyActive) setEnergyBoostAlreadyActive(true);
          setAppliedResult(result);
        }
        if (result.success) {
          await (onGiftClaimed ? onGiftClaimed(chosenWithReservation, accountToken) : markGiftClaimed(level, accountToken));
          await saveClaimedGiftRarity(level, chosenWithReservation.rarity, accountToken);
        } else if (result.alreadyClaimed) {
          await (onGiftClaimed ? onGiftClaimed(chosenWithReservation, accountToken) : markGiftClaimed(level, accountToken));
        } else if (onGiftApplyFailed) {
          await onGiftApplyFailed(chosenWithReservation, accountToken);
        }
        if (presentationMode === 'apply') emitGiftApplyOutcome(result.success);
      } catch {
        // The user already saw the optimistic choice; keep retry paths/background logs quiet.
      } finally {
        if (presentationMode === 'apply') {
          try { await onGiftApplySettled?.(); } catch {}
        }
        if (isCurrentOpening(accountToken)) {
          setChoiceBusy(false);
        }
      }
    })();
  };

  const closeForCurrentOpening = (claimed: boolean, openAvatar = false) => {
    const accountToken = openingAccountTokenRef.current;
    if (!accountToken || !isCurrentOpening(accountToken)) return;
    onClose(claimed);
    if (openAvatar) {
      setTimeout(() => {
        if (isCurrentOpening(accountToken)) router.push('/avatar_select' as any);
      }, 80);
    }
  };

  const previewingStoredGift = presentationMode === 'apply' && phase === 'box';

  if (!visible || !gift) return null;

  const rarity      = gift.rarity;
  const rarityPalette = paletteForRarity(rarity);
  const rarityAccent = rarityPalette.accent;
  const modalAccent = rewardModalAccentColor(themeMode, t);
  const primaryButtonColors = rewardModalPrimaryButtonColors(themeMode);
  const primaryButtonText = rewardModalPrimaryButtonText(themeMode);
  const rarityLabel = giftRarityUiLabel(rarity, lang);
  const showPlusBadge = applyAsPremium === true || isPremiumLevelGiftId(gift.id);
  const cosmeticLabel = cosmeticLabelForLang(appliedResult, lang);
  const modalScale = modalEntrance.interpolate({ inputRange: [0, 1], outputRange: [0.94, 1] });
  const modalY = modalEntrance.interpolate({ inputRange: [0, 1], outputRange: [18, 0] });
  const glowOpacity = modalGlow.interpolate({ inputRange: [0, 1], outputRange: [0.3, 0.7] });
  const revealY = fadeReveal.interpolate({ inputRange: [0, 1], outputRange: [14, 0] });
  // Влёт: снизу вверх, 0.2 → 1. Дальше значение не меняется — иконка стоит на месте.
  const orbTranslateY = orbRise.interpolate({ inputRange: [0, 1], outputRange: [16, 0] });
  const orbEnterScale = orbRise.interpolate({ inputRange: [0, 1], outputRange: [0.2, 1] });
  // Пульсация: только масштаб, отдельным значением поверх влёта.
  const orbPulseScale = orbPulse.interpolate({ inputRange: [0, 1], outputRange: [1, 1.055] });
  // Непрозрачный фон панели — обязателен (modal_opaque_surfaces_contract).
  const solidPanel = rewardModalPanelColors(themeMode, t)[1];
  const canCloseWithIcon = phase !== 'opening' && !choiceBusy;
  const screenDim = 'rgba(0,0,0,0.52)';

  return (
    <Modal transparent visible animationType="fade" onRequestClose={handleSkip}>
      {/* зачем 2026-08-02 (владелец: «на маленьких экранах кнопки нет»):
          карточка подарка центрировалась во весь рост без прокрутки. Пока она
          помещалась — вид верный, но на низком экране обрезалась сверху и
          снизу вместе с кнопкой, и доскроллить было нечем. ScrollView с
          flexGrow:1 сохраняет центрирование на больших экранах и даёт
          прокрутку на маленьких. */}
      <ScrollView
        style={{ flex: 1, backgroundColor: screenDim }}
        contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', alignItems: 'center' }}
        showsVerticalScrollIndicator={false}
      >
        <Animated.View testID="level-gift-modal" style={{
          backgroundColor: solidPanel,
          borderRadius: 30,
          paddingTop: 24,
          paddingBottom: 22,
          paddingHorizontal: 22,
          width: 326,
          alignItems: 'center',
          overflow: 'hidden',
          borderWidth: 0,
          borderColor: rewardModalPanelBorder(themeMode, t),
          shadowColor: modalAccent,
          shadowOpacity: 0.42,
          shadowRadius: 34,
          shadowOffset: { width: 0, height: 0 },
          ...noAndroidOutline,
          transform: [{ scale: modalScale }, { translateY: modalY }],
        }}>
          {/* Базовый материал reward-панели (непрозрачная подложка уже задана выше) */}
          <RewardModalPanelBackdrop themeMode={themeMode} intensity="strong" />

          <RewardModalLiquidGlass themeMode={themeMode} accent={modalAccent} intensity="strong" />

          {/* Верхняя линия-свечение */}
          <Animated.View
            pointerEvents="none"
            style={{
              position: 'absolute',
              top: 0,
              left: 30,
              right: 30,
              height: 1.5,
              backgroundColor: modalAccent,
              opacity: glowOpacity,
            }}
          />
          {/* мягкая верхняя зона активной темы */}
          <View
            pointerEvents="none"
            style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 80, backgroundColor: rewardModalSoftSurface(themeMode, t) }}
          />

          {canCloseWithIcon && (
            <TouchableOpacity
              testID="level-gift-close"
              accessibilityRole="button"
              accessibilityLabel={triLang(lang, { ru: 'Закрыть', uk: 'Закрити', es: 'Cerrar', 'pt-BR': 'Fechar', vi: 'Đóng', id: 'Tutup', tr: 'Kapat', pl: 'Zamknij' })}
              activeOpacity={0.76}
              onPress={() => { void handleSkip(); }}
              style={{
                position: 'absolute',
                top: 12,
                right: 12,
                zIndex: 5,
                width: 32,
                height: 32,
                borderRadius: 16,
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: 'rgba(3,5,10,0.42)',
                borderWidth: 0,
                borderColor: 'rgba(255,255,255,0.18)',
              }}
            >
              <Text style={{ color: monoIcon(themeMode, '#CFC8EE'), fontSize: 22, lineHeight: 26, fontWeight: '800' }}>×</Text>
            </TouchableOpacity>
          )}

          {/* Header */}
          <Text style={{ color: modalAccent, fontSize: f.label, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 1.4, marginBottom: 5 }}>
            {triLang(lang, { ru: `Уровень ${level}`, uk: `Рівень ${level}`, es: `Nivel ${level}`, 'pt-BR': `Nível ${level}`, vi: `Cấp ${level}`, id: `Level ${level}`, tr: `Seviye ${level}`, pl: `Poziom ${level}` })}
          </Text>
          <Text style={{ color: t.textPrimary, fontSize: f.numMd + 2, fontWeight: '900', marginBottom: 3, textAlign: 'center' }}>
            {triLang(lang, { ru: 'Подарок за уровень', uk: 'Твій подарунок', es: 'Tu regalo', 'pt-BR': 'Seu presente', vi: 'Quà của bạn', id: 'Hadiahmu', tr: 'Hediyen', pl: 'Twój prezent' })}
          </Text>
          <Text style={{ color: t.textMuted, fontSize: f.sub, fontWeight: '600', textAlign: 'center', marginBottom: 16 }}>
            {triLang(lang, { ru: 'Награда за твой путь', uk: 'Нагорода за твій шлях', es: 'Recompensa por progreso', 'pt-BR': 'Recompensa pelo progresso', vi: 'Phần thưởng cho tiến trình', id: 'Hadiah untuk progres', tr: 'İlerleme ödülü', pl: 'Nagroda za postęp' })}
          </Text>

          {phase !== 'reveal' && !previewingStoredGift ? (
            <>
              <TouchableOpacity testID="level-gift-box-open" activeOpacity={0.85} onPress={() => handleTap()} disabled={phase === 'opening' || !gift} style={{ alignItems: 'center' }}>
                <GiftBox3D
                  palette={rarityPalette}
                  size={LEVEL_GIFT_STAGE_SIZE}
                  idle={phase === 'box'}
                  opening={phase === 'opening'}
                  floatY={floatAnim}
                  rock={rock}
                  scale={scaleAnim}
                  shakeX={shakeAnim}
                  lidLift={lidLift}
                />

                {phase === 'box' && (
                  <Text style={{ color: t.textMuted, fontSize: f.caption, marginTop: 8, textAlign: 'center' }}>
                    {triLang(lang, {
                        ru: 'Нажми, чтобы открыть',
                        uk: 'Натисни, щоб відкрити',
                        es: 'Toca para abrir',
                        'pt-BR': 'Toque para abrir',
                        vi: 'Nhấn để mở',
                        id: 'Ketuk untuk membuka',
                        tr: 'Açmak için dokun',
                        pl: 'Dotknij, aby otworzyć',
                      })}
                  </Text>
                )}
              </TouchableOpacity>

              {/* Skip button — only visible while box is showing (not during open animation) */}
              {phase === 'box' && (
                <TouchableOpacity
                  testID="level-gift-save-later"
                  activeOpacity={0.7}
                  onPress={handleSkip}
                  style={{
                    marginTop: 14,
                    paddingVertical: 8,
                    alignItems: 'center',
                    alignSelf: 'stretch',
                  }}
                >
                  <Text style={{ color: t.textMuted, fontSize: f.sub, fontWeight: '700' }}>
                    {triLang(lang, { ru: 'Позже', uk: 'Пізніше', es: 'Más tarde', 'pt-BR': 'Mais tarde', vi: 'Để sau', id: 'Nanti', tr: 'Daha sonra', pl: 'Później' })}
                  </Text>
                </TouchableOpacity>
              )}
            </>
          ) : (
            <Animated.View style={{ opacity: fadeReveal, alignItems: 'center', transform: [{ translateY: revealY }] }}>
              {gift?.choices?.length ? (
                <>
                  <Image
                    source={getLevelGiftRewardIcon(gift.id, themeMode)}
                    style={{ width: 82, height: 82, marginBottom: 8 }}
                    contentFit="contain"
                  />
                  <Text style={{ color: t.textPrimary, fontSize: f.h2 + 2, fontWeight: '800', marginBottom: 8, textAlign: 'center' }}>
                    {giftDisplayTitleForLang(gift, lang)}
                  </Text>
                  <Text style={{ color: t.textSecond, fontSize: f.sub, textAlign: 'center', marginBottom: 16 }}>
                    {giftDisplayDescForLang(gift, lang)}
                  </Text>
                  <View style={{ alignSelf: 'stretch', gap: 8, marginBottom: 8 }}>
                    {gift.choices.map((choice) => (
                      <TouchableOpacity
                        key={choice.id}
                        activeOpacity={0.86}
                        disabled={choiceBusy}
                        onPress={() => { void handleChoice(choice); }}
                        style={{
                          borderRadius: 14,
                          borderWidth: 0,
                          borderColor: choice.rarity === 'epic' ? '#FFD70088' : choice.rarity === 'rare' ? '#60A5FA88' : t.border,
                          backgroundColor: choice.rarity === 'epic' ? 'rgba(245,158,11,0.12)' : choice.rarity === 'rare' ? 'rgba(37,99,235,0.10)' : t.bgSurface2,
                          paddingVertical: 10,
                          paddingHorizontal: 12,
                          flexDirection: 'row',
                          alignItems: 'center',
                          gap: 10,
                          opacity: choiceBusy ? 0.65 : 1,
                        }}
                      >
                        <Image
                          source={getLevelGiftRewardIcon(choice.id, themeMode)}
                          style={{ width: 38, height: 38 }}
                          contentFit="contain"
                        />
                        <View style={{ flex: 1 }}>
                          <Text style={{ color: t.textPrimary, fontSize: f.body, fontWeight: '800' }}>
                            {giftDisplayTitleForLang(choice, lang)}
                          </Text>
                          <Text style={{ color: t.textMuted, fontSize: f.caption, marginTop: 2 }}>
                            {giftDisplayDescForLang(choice, lang)}
                          </Text>
                        </View>
                      </TouchableOpacity>
                    ))}
                  </View>
                  {storesOnly && (
                    <TouchableOpacity
                      testID="level-gift-save-choice-later"
                      activeOpacity={0.7}
                      onPress={() => {
                        void hapticTap();
                        closeForCurrentOpening(false);
                      }}
                      style={{
                        paddingVertical: 8,
                        alignItems: 'center',
                        alignSelf: 'stretch',
                      }}
                    >
                      <Text style={{ color: t.textMuted, fontSize: f.sub, fontWeight: '700' }}>
                        {triLang(lang, { ru: 'Позже', uk: 'Пізніше', es: 'Más tarde', 'pt-BR': 'Mais tarde', vi: 'Để sau', id: 'Nanti', tr: 'Daha sonra', pl: 'Później' })}
                      </Text>
                    </TouchableOpacity>
                  )}
                </>
              ) : (
              <>
              {/* Награда: объёмные эффекты по редкости + парящая иконка-«орб» */}
              <View style={{ width: LEVEL_GIFT_STAGE_SIZE, height: LEVEL_GIFT_STAGE_SIZE, alignItems: 'center', justifyContent: 'center', marginBottom: 4 }}>
                {gift && <GiftOpenBurst key={`${gift.id}-${rarity}-single`} tier={animTierF2p(rarity)} size={LEVEL_GIFT_STAGE_SIZE} />}
                {gift && (
                  <Animated.View style={{ transform: [{ translateY: orbTranslateY }, { scale: orbEnterScale }, { scale: orbPulseScale }], zIndex: 2 }}>
                    <Image
                      source={getLevelGiftRewardIcon(gift.id, themeMode)}
                      style={{ width: 108, height: 108 }}
                      contentFit="contain"
                    />
                  </Animated.View>
                )}
              </View>

              {/* Rarity badge (капсула) */}
              <View style={{
                flexDirection: 'row',
                alignItems: 'center',
                borderWidth: 0,
                borderColor: `${rarityAccent}55`,
                borderRadius: 999,
                paddingVertical: 5,
                paddingHorizontal: 12,
                backgroundColor: rarityPalette.accentSoft,
                marginBottom: 8,
              }}>
                <Text style={{
                  color: rarity === 'common' ? t.textSecond : rarityAccent,
                  fontSize: f.caption,
                  fontWeight: '800',
                  letterSpacing: 1.2,
                  textTransform: 'uppercase',
                }}>
                  {rarityLabel}
                </Text>
              </View>

              <View style={{ alignItems: 'center', marginBottom: 6, gap: 6 }}>
                <Text style={{ color: t.textPrimary, fontSize: f.h2 + 4, fontWeight: '900', textAlign: 'center' }}>
                  {gift ? giftDisplayTitleForLang(gift, lang) : ''}
                </Text>
                {showPlusBadge ? <PlusBadge themeMode={themeMode} size="xs" testID="level-gift-plus-badge" /> : null}
              </View>
              <Text style={{ color: t.textSecond, fontSize: f.body, lineHeight: f.body + 6, textAlign: 'center', marginBottom: storesOnly ? 10 : (gift?.id && isEnergyBonusGiftId(gift.id)) || xpBoostAlreadyActive ? 12 : 24 }}>
                {gift ? giftDisplayDescForLang(gift, lang) : ''}
              </Text>
              {storesOnly && (
                <Text style={{ color: t.textGhost, fontSize: f.caption, fontWeight: '700', textAlign: 'center', marginBottom: 18 }}>
                  {triLang(lang, {
                    ru: 'Сохранено в разделе «Подарки» в результатах',
                    uk: 'Збережено в розділі «Подарунки» у результатах',
                    es: 'Guardado en Regalos dentro de Estadísticas',
                    'pt-BR': 'Salvo em Presentes nas Estatísticas',
                    vi: 'Đã lưu trong Quà ở Thống kê',
                    id: 'Disimpan di Hadiah pada Statistik',
                    tr: 'İstatistikler içindeki Hediyeler bölümüne kaydedildi',
                    pl: 'Zapisano w Prezentach w statystykach',
                  })}
                </Text>
              )}
              {!!cosmeticLabel && (
                <View testID="level-gift-cosmetic-preview" style={{
                  backgroundColor: t.bgSurface2,
                  borderRadius: 12,
                  paddingVertical: 8,
                  paddingHorizontal: 12,
                  marginBottom: 14,
                  borderWidth: 0,
                  borderColor: t.border,
                  alignItems: 'center',
                  gap: 8,
                }}>
                  <CosmeticGiftPreview result={appliedResult} level={level} />
                  <Text style={{ color: t.textPrimary, fontSize: f.caption, fontWeight: '800', textAlign: 'center' }}>
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

              {/* Bonus energy note */}
              {gift?.id && isEnergyBonusGiftId(gift.id) && (() => {
                const n = gift.id === 'energy_plus1' ? 1 : gift.id === 'energy_plus3' ? 3 : 2;
                return (
                <View style={{
                  backgroundColor: '#FEF3C7',
                  borderRadius: 10,
                  paddingVertical: 8,
                  paddingHorizontal: 14,
                  marginBottom: 16,
                  borderWidth: 0,
                  borderColor: '#D97706',
                  alignItems: 'center',
                }}>
                  {energyBoostAlreadyActive ? (
                    <>
                      <Text style={{ color: monoIcon(themeMode, '#78350F', MONO_ICON.onLight), fontSize: f.sub, fontWeight: '700', textAlign: 'center' }}>
                        🔄 {triLang(lang, { ru: 'Буст заменён', uk: 'Буст замінено', es: 'Bono reemplazado', 'pt-BR': 'Bônus substituído', vi: 'Đã thay boost', id: 'Boost diganti', tr: 'Güçlendirme değiştirildi', pl: 'Bonus zastąpiony' })}
                      </Text>
                      <Text style={{ color: monoIcon(themeMode, '#92400E', MONO_ICON.onLight), fontSize: f.caption, textAlign: 'center', marginTop: 2 }}>
                        {triLang(lang, {
                          ru: `Бусты энергии не суммируются — предыдущий заменён новым (+${n} до завтра)`,
                          uk: `Бусти енергії не сумуються — попередній замінено новим (+${n} до завтра)`,
                          es: `Los bonos de energía no se acumulan: el anterior queda reemplazado por uno nuevo (+${n} hasta mañana)`,
                          'pt-BR': `Bônus de energia não acumulam — o anterior foi substituído por um novo (+${n} até amanhã)`,
                          vi: `Boost năng lượng không cộng dồn — boost trước đã được thay bằng boost mới (+${n} đến ngày mai)`,
                          id: `Boost energi tidak ditumpuk — yang lama diganti dengan yang baru (+${n} sampai besok)`,
                          tr: `Enerji güçlendirmeleri birikmez — önceki yeni olanla değiştirildi (yarına kadar +${n})`,
                          pl: `Bonusy energii się nie sumują — poprzedni zastąpiono nowym (+${n} do jutra)`,
                        })}
                      </Text>
                    </>
                  ) : (
                    <>
                      <Text style={{ color: monoIcon(themeMode, '#78350F', MONO_ICON.onLight), fontSize: f.sub, fontWeight: '700', textAlign: 'center' }}>
                        ⚡ {triLang(lang, { ru: 'Действует до полуночи', uk: 'Діє до опівночі', es: 'Vigente hasta medianoche', 'pt-BR': 'Vale até meia-noite', vi: 'Có hiệu lực đến nửa đêm', id: 'Berlaku sampai tengah malam', tr: 'Gece yarısına kadar geçerli', pl: 'Działa do północy' })}
                      </Text>
                      <Text style={{ color: monoIcon(themeMode, '#92400E', MONO_ICON.onLight), fontSize: f.caption, textAlign: 'center', marginTop: 2 }}>
                        {triLang(lang, {
                          ru: `Эти ${n} ед. энергии исчезнут в начале следующего дня`,
                          uk: `Ці ${n} од. енергії зникнуть на початку наступного дня`,
                          es: `Estas ${n} unidades extra de energía caducan al empezar el día siguiente`,
                          'pt-BR': `Estas ${n} unidades extras de energia expiram no começo do próximo dia`,
                          vi: `${n} năng lượng thêm này sẽ biến mất vào đầu ngày tiếp theo`,
                          id: `${n} energi ekstra ini akan hilang di awal hari berikutnya`,
                          tr: `Bu ekstra ${n} enerji bir sonraki günün başında kaybolur`,
                          pl: `Te dodatkowe ${n} jednostki energii znikną na początku następnego dnia`,
                        })}
                      </Text>
                    </>
                  )}
                </View>
                );
              })()}

              {/* XP boost non-stacking warning */}
              {xpBoostAlreadyActive && (gift?.id === 'xp_2x_24h' || gift?.id === 'xp_2x_48h') && (
                <View style={{
                  backgroundColor: '#FEF3C7',
                  borderRadius: 10,
                  paddingVertical: 8,
                  paddingHorizontal: 14,
                  marginBottom: 16,
                  borderWidth: 0,
                  borderColor: '#D97706',
                  alignItems: 'center',
                }}>
                  <Text style={{ color: monoIcon(themeMode, '#78350F', MONO_ICON.onLight), fontSize: f.sub, fontWeight: '700', textAlign: 'center' }}>
                    🔄 {triLang(lang, { ru: 'Буст обновлён', uk: 'Буст оновлено', es: 'Bono actualizado', 'pt-BR': 'Bônus atualizado', vi: 'Boost đã cập nhật', id: 'Boost diperbarui', tr: 'Güçlendirme güncellendi', pl: 'Bonus zaktualizowany' })}
                  </Text>
                  <Text style={{ color: monoIcon(themeMode, '#92400E', MONO_ICON.onLight), fontSize: f.caption, textAlign: 'center', marginTop: 2 }}>
                    {triLang(lang, {
                      ru: 'Бусты 2× XP не суммируются — активный буст заменён новым. Таймер запущен заново.',
                      uk: 'Бусти 2× XP не сумуються — активний буст замінено новим. Таймер запущено заново.',
                      es: 'Los bonos de XP ×2 no se acumulan: el activo se sustituyó y el temporizador se reinició.',
                      'pt-BR': 'Bônus de XP ×2 não acumulam: o bônus ativo foi substituído e o timer reiniciou.',
                      vi: 'Boost XP ×2 không cộng dồn: boost đang bật đã được thay mới và thời gian được khởi động lại.',
                      id: 'Boost XP ×2 tidak ditumpuk: boost aktif diganti dan timer dimulai ulang.',
                      tr: '2× XP güçlendirmeleri birikmez: aktif güçlendirme yenisiyle değiştirildi ve süre yeniden başladı.',
                      pl: 'Bonusy XP ×2 się nie sumują: aktywny bonus zastąpiono nowym, a licznik ruszył od nowa.',
                    })}
                  </Text>
                </View>
              )}

              {!storesOnly && !previewingStoredGift && isCosmeticGiftId(gift?.id) && (
                <TouchableOpacity
                  testID="level-gift-open-avatar"
                  activeOpacity={0.85}
                  onPress={() => {
                    void hapticSuccess();
                    closeForCurrentOpening(true, true);
                  }}
                  style={{
                    backgroundColor: t.bgSurface2,
                    borderRadius: 14,
                    paddingVertical: 12,
                    paddingHorizontal: 24,
                    borderWidth: 0,
                    borderColor: t.border,
                    marginBottom: 10,
                  }}
                >
                  <Text style={{ color: t.textPrimary, fontSize: f.body, fontWeight: '800' }}>
                    {triLang(lang, { ru: 'Открыть аватар', uk: 'Відкрити аватар', es: 'Abrir avatar', 'pt-BR': 'Abrir avatar', vi: 'Mở avatar', id: 'Buka avatar', tr: 'Avatarı aç', pl: 'Otwórz awatar' })}
                  </Text>
                </TouchableOpacity>
              )}

              <TouchableOpacity
                testID="level-gift-claim"
                activeOpacity={0.85}
                onPress={() => {
                  void hapticSuccess();
                  if (previewingStoredGift) {
                    // Apply starts first and continues in the background. claimed=true closes
                    // immediately, hides the tile, and refreshes the Active gifts list.
                    handleTap(true);
                    closeForCurrentOpening(true);
                    return;
                  }
                  closeForCurrentOpening(!storesOnly);
                }}
                style={{
                  alignSelf: 'stretch',
                  borderRadius: 18,
                  paddingVertical: 15,
                  alignItems: 'center',
                  borderWidth: 0,
                  borderColor: `${modalAccent}66`,
                  shadowColor: modalAccent,
                  shadowOpacity: 0.28,
                  shadowRadius: 16,
                  shadowOffset: { width: 0, height: 0 },
                  overflow: 'hidden',
                }}
              >
                <LinearGradient
                  pointerEvents="none"
                  colors={primaryButtonColors}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={StyleSheet.absoluteFill}
                />
                {/* верхний блик на кнопке */}
                <View pointerEvents="none" style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '50%', backgroundColor: 'rgba(255,255,255,0.22)' }} />
                <Text style={{ color: primaryButtonText, fontSize: f.bodyLg, fontWeight: '900' }}>
                  {presentationMode === 'apply' && phase === 'box'
                    ? triLang(lang, { ru: 'Применить', uk: 'Застосувати', es: 'Aplicar', 'pt-BR': 'Usar', vi: 'Dùng', id: 'Pakai', tr: 'Kullan', pl: 'Użyj' })
                    : presentationMode === 'apply'
                    ? triLang(lang, { ru: 'Готово', uk: 'Готово', es: 'Listo', 'pt-BR': 'Pronto', vi: 'Xong', id: 'Selesai', tr: 'Tamam', pl: 'Gotowe' })
                    : storesOnly
                    ? triLang(lang, { ru: 'Продолжить', uk: 'Продовжити', es: 'Continuar', 'pt-BR': 'Continuar', vi: 'Tiếp tục', id: 'Lanjutkan', tr: 'Devam et', pl: 'Kontynuuj' })
                    : triLang(lang, { ru: 'Забрать', uk: 'Забрати', es: 'Reclamar', 'pt-BR': 'Receber', vi: 'Nhận', id: 'Klaim', tr: 'Al', pl: 'Odbierz' })}
                </Text>
              </TouchableOpacity>
              </>
              )}
            </Animated.View>
          )}
        </Animated.View>
      </ScrollView>
    </Modal>
  );
}

export default memo(LevelGiftModal);
