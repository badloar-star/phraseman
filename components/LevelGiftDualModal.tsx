/**
 * LevelGiftDualModal — премиум: два сундука за уровень (F2P + премиум).
 * Левый — картинка редкости; правый — GIFT PREMIUM. Открытие в любом порядке, затем общий экран.
 */

import { LinearGradient } from './SafeLinearGradient';
import { useRouter } from 'expo-router';
import React, { memo, useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
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
import { emitAppEvent } from '../app/events';
import { monoIcon, MONO_ICON } from '../constants/monoIcon';
import { hapticSuccess, hapticTap } from '../hooks/use-haptics';
import { useEnergy } from './EnergyContext';
import { useTheme, type Fonts } from './ThemeContext';
import type { Theme, ThemeMode } from '../constants/theme';
import { GiftOpenBurst, animTierF2p, animTierPrem, type GiftAnimTier } from './GiftOpenEffects';
import AvatarAura from './AvatarAura';
import AvatarView from './AvatarView';
import CustomAvatarBadge from './CustomAvatarBadge';
import PlusBadge from './PlusBadge';
import { GiftBox3D, paletteForRarity, GIFT_PALETTES } from './level_gift_box';
import { getBestAvatarForLevel } from '../constants/avatars';
import { getLevelGiftRewardIcon } from '../constants/levelGiftRewardIcons';
import {
  RewardModalPanelBackdrop,
  rewardModalAccentColor,
  rewardModalPanelBorder,
  rewardModalPrimaryButtonColors,
  rewardModalPrimaryButtonText,
} from './RewardModalBackdrop';
import {
  markDualGiftClaimed,
  markGiftClaimed,
  saveClaimedGiftRarity,
  saveRemainingGiftAfterPartialDualClaim,
  saveUnclaimedDualGift,
  setLevelHadDualClaim,
  type PremPair,
} from '../app/level_gift_inventory';
import type { RuntimeStudyTarget } from '../app/target_storage_keys';
import {
  captureAccountGeneration,
  isCurrentAccountGeneration,
  type AccountGenerationToken,
} from '../app/account_generation';
import { isCurrentLevelGiftOpening } from '../app/level_gift_opening_guard';

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

const emitDualGiftApplyOutcome = (appliedCount: 0 | 1 | 2): void => {
  if (appliedCount === 2) {
    emitAppEvent('action_toast', {
      type: 'success',
      messageRu: 'Оба подарка применены.',
      messageUk: 'Обидва подарунки застосовано.',
      messageEs: 'Ambos regalos se aplicaron.',
      messagePtBr: 'Os dois presentes foram aplicados.',
      messageVi: 'Đã áp dụng cả hai quà.',
      messageId: 'Kedua hadiah diterapkan.',
      messageTr: 'İki hediye de uygulandı.',
      messagePl: 'Oba prezenty zostały użyte.',
    });
    return;
  }
  if (appliedCount === 1) {
    emitAppEvent('action_toast', {
      type: 'warning',
      messageRu: 'Один подарок применён, второй остался в инвентаре.',
      messageUk: 'Один подарунок застосовано, другий залишився в інвентарі.',
      messageEs: 'Se aplicó un regalo; el otro sigue en el inventario.',
      messagePtBr: 'Um presente foi aplicado; o outro continua no inventário.',
      messageVi: 'Đã áp dụng một quà; quà còn lại vẫn ở trong kho.',
      messageId: 'Satu hadiah diterapkan; satu lagi tetap di inventaris.',
      messageTr: 'Bir hediye uygulandı; diğeri envanterde kaldı.',
      messagePl: 'Jeden prezent użyto; drugi pozostał w ekwipunku.',
    });
    return;
  }
  emitAppEvent('action_toast', {
    type: 'error',
    messageRu: 'Подарки не применились и остались в инвентаре.',
    messageUk: 'Подарунки не застосувалися й залишилися в інвентарі.',
    messageEs: 'Los regalos no se aplicaron y siguen en el inventario.',
    messagePtBr: 'Os presentes não foram aplicados e continuam no inventário.',
    messageVi: 'Quà chưa được áp dụng và vẫn còn trong kho.',
    messageId: 'Hadiah belum diterapkan dan tetap ada di inventaris.',
    messageTr: 'Hediyeler uygulanmadı ve envanterde kaldı.',
    messagePl: 'Prezenty nie zostały użyte i pozostały w ekwipunku.',
  });
};

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
    case 'minimalDark':
      return '#070B11';
    case 'sagePorcelain':
      return '#FCFDF9';
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
  /** open = show both chests; apply = apply an already revealed inventory pair. */
  presentationMode?: 'open' | 'apply';
  studyTarget?:      RuntimeStudyTarget;
}

/** pair: сундуки + мини-раскрытие (только названия); full: описания + «Получить всё» */
type Phase = 'pair' | 'full';

function LevelGiftDualModal({ visible, level, userName, lang, onClose, preRolledPair, deliveryMode = 'claim', presentationMode = 'open', studyTarget }: Props) {
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
  const fLid   = useRef(new Animated.Value(0)).current;
  // Правый
  const pFloat = useRef(new Animated.Value(0)).current;
  const pRock  = useRef(new Animated.Value(0)).current;
  const pScale = useRef(new Animated.Value(1)).current;
  const pShake = useRef(new Animated.Value(0)).current;
  const pLid   = useRef(new Animated.Value(0)).current;

  const fadeReveal = useRef(new Animated.Value(0)).current;
  const detailScale = useRef(new Animated.Value(0.96)).current;
  const ctaShine = useRef(new Animated.Value(0)).current;
  const modalEntrance = useRef(new Animated.Value(0)).current;
  const idleLeft  = useRef<Animated.CompositeAnimation | null>(null);
  const idleRight = useRef<Animated.CompositeAnimation | null>(null);
  const idleAll   = useRef<Animated.CompositeAnimation | null>(null);
  const f2pApplyPromiseRef = useRef<Promise<ApplyGiftResult> | null>(null);
  const premApplyPromiseRef = useRef<Promise<ApplyGiftResult> | null>(null);
  const doneClosingRef = useRef(false);
  const directApplyStartedRef = useRef(false);
  /** Крестик/«назад» во время анимации открытия сундука: дожидаемся конца
   *  анимации (она же запускает apply), затем закрываемся как partial claim. */
  const closeAfterOpenRef = useRef(false);
  /** Только false→true по `visible` — иначе лишний сброс `opened` (Strict Mode / смена deps) убирает уже открытые сундуки. */
  const wasVisibleRef = useRef(false);
  const openingAccountTokenRef = useRef<AccountGenerationToken | null>(null);
  const isCurrentOpening = (accountToken: AccountGenerationToken): boolean =>
    isCurrentLevelGiftOpening(openingAccountTokenRef.current, accountToken);

  const resetAnims = useCallback(() => {
    fFloat.setValue(0); fRock.setValue(0); fScale.setValue(1); fShake.setValue(0); fLid.setValue(0);
    pFloat.setValue(0); pRock.setValue(0); pScale.setValue(1); pShake.setValue(0); pLid.setValue(0);
    fadeReveal.setValue(0);
    detailScale.setValue(0.96);
    ctaShine.setValue(0);
    modalEntrance.setValue(0);
  }, [fFloat, fRock, fScale, fShake, fLid, pFloat, pRock, pScale, pShake, pLid, fadeReveal, detailScale, ctaShine, modalEntrance]);

  useEffect(() => {
    if (!visible) {
      wasVisibleRef.current = false;
      doneClosingRef.current = false;
      directApplyStartedRef.current = false;
      closeAfterOpenRef.current = false;
      idleAll.current?.stop();
      idleLeft.current?.stop();
      idleRight.current?.stop();
      f2pApplyPromiseRef.current = null;
      premApplyPromiseRef.current = null;
      return;
    }
    const justOpened = !wasVisibleRef.current;
    wasVisibleRef.current = true;
    if (justOpened) {
      directApplyStartedRef.current = false;
      openingAccountTokenRef.current = captureAccountGeneration();
      setOpened(presentationMode === 'apply' ? new Set<BoxKey>(['f2p', 'prem']) : new Set<BoxKey>());
      setPhase('pair');
      setOpening(null);
      setClaimNowBusy(false);
      setF2pAppliedMeta({ success: true });
      setPremAppliedMeta({ success: true });
      f2pApplyPromiseRef.current = null;
      premApplyPromiseRef.current = null;
      resetAnims();
      if (USE_ELITE_DUAL_LEVEL_GIFT_MODAL) {
        Animated.spring(modalEntrance, {
          toValue: 1,
          useNativeDriver: true,
          tension: 110,
          friction: 12,
        }).start();
      }
      setF2pGift(null);
      setPremGift(null);
      if (preRolledPair) {
        setF2pGift(preRolledPair.f2p);
        setPremGift(preRolledPair.prem);
      } else {
        const accountToken = openingAccountTokenRef.current;
        void (async () => {
          try {
            const [a, b] = await Promise.all([
              rollF2pLevelGiftForUser(level, { premiumSafe: true, studyTarget }),
              rollPremiumLevelGiftForUser(level, { studyTarget }),
            ]);
            if (!accountToken || !isCurrentOpening(accountToken)) return;
            setF2pGift(a);
            setPremGift(b);
          } catch {
            // Neither lane is locally minted when its server reservation is unavailable.
            if (accountToken && isCurrentOpening(accountToken)) {
              emitAppEvent('action_toast', {
                type: 'info',
                messageRu: 'Подарки не потеряны. Подключись к интернету и попробуй открыть их снова.',
                messageUk: 'Подарунки не втрачено. Підключися до інтернету й спробуй відкрити їх знову.',
                messageEs: 'Los regalos siguen guardados. Conéctate a internet e intenta abrirlos de nuevo.',
              });
              onClose(false);
            }
          }
        })();
      }
    }
  }, [visible, level, preRolledPair, resetAnims, modalEntrance, presentationMode, studyTarget, onClose]);

  useEffect(() => {
    if (!visible || presentationMode !== 'apply' || phase !== 'pair' || opened.size !== 2 || !f2pGift || !premGift) return;
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
  }, [visible, presentationMode, phase, opened.size, f2pGift, premGift, fadeReveal, detailScale, ctaShine]);

  useEffect(() => {
    if (!visible || !storesOnly || !f2pGift || !premGift) return;
    const accountToken = openingAccountTokenRef.current;
    if (!accountToken) return;
    void saveUnclaimedDualGift(level, { f2p: f2pGift, prem: premGift }, accountToken);
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

  const persistDualGiftOutcome = async (
    f2p: GiftDef,
    prem: GiftDef,
    f2pResult: ApplyGiftResult,
    premResult: ApplyGiftResult,
    accountToken: AccountGenerationToken,
  ) => {
    const f2pOk = f2pResult.success === true || f2pResult.alreadyClaimed === true;
    const premOk = premResult.success === true || premResult.alreadyClaimed === true;
    if (!isCurrentAccountGeneration(accountToken)) return;
    if (f2pOk && premOk) {
      await markDualGiftClaimed(level, accountToken);
      if (!isCurrentAccountGeneration(accountToken)) return;
      await markGiftClaimed(level, accountToken);
      if (!isCurrentAccountGeneration(accountToken)) return;
      await setLevelHadDualClaim(level, accountToken);
      if (!isCurrentAccountGeneration(accountToken)) return;
      const best = f2p.rarity === 'epic' || prem.rarity === 'epic'
        ? 'epic' : f2p.rarity === 'rare' || prem.rarity === 'rare' ? 'rare' : 'common';
      await saveClaimedGiftRarity(level, best, accountToken);
      emitDualGiftApplyOutcome(2);
      return;
    }
    if (f2pOk) {
      await saveRemainingGiftAfterPartialDualClaim(level, prem, accountToken);
      if (!isCurrentAccountGeneration(accountToken)) return;
      await saveClaimedGiftRarity(level, f2p.rarity, accountToken);
      emitDualGiftApplyOutcome(1);
      return;
    }
    if (premOk) {
      await saveRemainingGiftAfterPartialDualClaim(level, f2p, accountToken);
      if (!isCurrentAccountGeneration(accountToken)) return;
      await saveClaimedGiftRarity(level, prem.rarity, accountToken);
      emitDualGiftApplyOutcome(1);
      return;
    }
    await saveUnclaimedDualGift(level, { f2p, prem }, accountToken);
    emitDualGiftApplyOutcome(0);
  };

  /**
   * Закрытие «в середине»: один сундук открыт (и уже применён), второй нет.
   * Без подтверждения: открытое сохраняем как partial claim, оставшееся —
   * как «remaining gift», чтобы добрать позже. В витринном режиме (storesOnly)
   * пара уже сохранена эффектом — просто выходим.
   */
  const handleCloseMidWith = useCallback(
    async (openedKey: BoxKey) => {
      if (!f2pGift || !premGift || doneClosingRef.current) return;
      const accountToken = openingAccountTokenRef.current;
      if (!accountToken || !isCurrentOpening(accountToken)) return;
      doneClosingRef.current = true;
      if (storesOnly) {
        onClose(false);
        return;
      }
      const openedGift = openedKey === 'f2p' ? f2pGift : premGift;
      const remainingGift = openedKey === 'f2p' ? premGift : f2pGift;
      const applyP = openedKey === 'f2p' ? f2pApplyPromiseRef.current : premApplyPromiseRef.current;
      onClose(true);
      void (async () => {
        try {
          const result = await (applyP ?? Promise.resolve<ApplyGiftResult>({ success: false }));
          if (!isCurrentAccountGeneration(accountToken)) return;
          if (result.success === true) {
            await saveRemainingGiftAfterPartialDualClaim(level, remainingGift, accountToken);
            if (!isCurrentAccountGeneration(accountToken)) return;
            await saveClaimedGiftRarity(level, openedGift.rarity, accountToken);
          } else {
            // Apply не подтвердился — не теряем пару: оба остаются незабранными.
            await saveUnclaimedDualGift(level, { f2p: f2pGift, prem: premGift }, accountToken);
          }
        } catch {
          // Модалка уже закрыта оптимистично; фоновые ошибки хранилища не показываем.
        }
      })();
    },
    [f2pGift, premGift, storesOnly, level, onClose],
  );

  const runOpenAnim = (which: BoxKey, g: GiftDef, accountToken: AccountGenerationToken) => {
    const shakeA = which === 'f2p' ? fShake : pShake;
    const scaleA = which === 'f2p' ? fScale : pScale;
    const floatA = which === 'f2p' ? fFloat : pFloat;
    const rockA  = which === 'f2p' ? fRock  : pRock;
    const lidA   = which === 'f2p' ? fLid   : pLid;

    idleAll.current?.stop();
    idleLeft.current?.stop();
    idleRight.current?.stop();

    Animated.sequence([
      Animated.parallel([
        Animated.timing(shakeA, { toValue:  9,  duration: 34,  useNativeDriver: true }),
        Animated.timing(scaleA, { toValue: 0.96, duration: 66, useNativeDriver: true }),
      ]),
      Animated.timing(shakeA, { toValue: -11, duration: 34, useNativeDriver: true }),
      Animated.timing(shakeA, { toValue:   8, duration: 30, useNativeDriver: true }),
      Animated.timing(shakeA, { toValue:   0, duration: 24, useNativeDriver: true }),
    ]).start(() => {
      // Крышка отлетает (lidLift 0→1) + лёгкий «вдох» масштаба — затем мини-награда.
      Animated.parallel([
        Animated.spring(scaleA, { toValue: 1.06, tension: 200, friction: 8, useNativeDriver: true }),
        Animated.timing(lidA, { toValue: 1, duration: 340, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
      ]).start(() => {
        if (!isCurrentOpening(accountToken)) return;
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
        if (storesOnly) {
          // Крестик нажали во время анимации — закрываемся после её конца.
          if (closeAfterOpenRef.current) {
            closeAfterOpenRef.current = false;
            void handleCloseMidWith(which);
          }
          return;
        }
        const applyResultP = applyGift(g, userName, energy, maxEnergy, setEnergyFn, {
          isPremium: true,
          studyTarget,
          accountToken,
          occurrenceId: `level:${level}:${which}`,
          localOnly: true,
        })
          .catch(() => ({ success: false }));
        if (which === 'f2p') f2pApplyPromiseRef.current = applyResultP;
        else premApplyPromiseRef.current = applyResultP;
        void applyResultP.then((result) => {
          if (!isCurrentOpening(accountToken)) return;
          if (which === 'f2p') setF2pAppliedMeta(result);
          else setPremAppliedMeta(result);
        });
        // Крестик нажали во время анимации — apply уже стартовал, закрываемся
        // как partial claim (оставшийся сундук сохранится).
        if (closeAfterOpenRef.current) {
          closeAfterOpenRef.current = false;
          void handleCloseMidWith(which);
        }
      });
    });
  };

  const onTapF2p = () => {
    if (phase !== 'pair' || opening || !f2pGift || opened.has('f2p')) return;
    const accountToken = openingAccountTokenRef.current;
    if (!accountToken || !isCurrentOpening(accountToken)) return;
    hapticTap();
    setOpening('f2p');
    runOpenAnim('f2p', f2pGift, accountToken);
  };

  const onTapPrem = () => {
    if (phase !== 'pair' || opening || !premGift || opened.has('prem')) return;
    const accountToken = openingAccountTokenRef.current;
    if (!accountToken || !isCurrentOpening(accountToken)) return;
    hapticTap();
    setOpening('prem');
    runOpenAnim('prem', premGift, accountToken);
  };

  const handleSkip = async () => {
    const accountToken = openingAccountTokenRef.current;
    if (!accountToken || !isCurrentOpening(accountToken)) return;
    if (f2pGift && premGift && opened.size === 0) {
      await saveUnclaimedDualGift(level, { f2p: f2pGift, prem: premGift }, accountToken);
      if (!isCurrentOpening(accountToken)) return;
      onClose(false);
    }
  };

  const handleDone = async (openAvatar = false) => {
    if (!f2pGift || !premGift || doneClosingRef.current) return;
    const accountToken = openingAccountTokenRef.current;
    if (!accountToken || !isCurrentOpening(accountToken)) return;
    doneClosingRef.current = true;
    setClaimNowBusy(true);
    void hapticSuccess();
    if (storesOnly) {
      await saveUnclaimedDualGift(level, { f2p: f2pGift, prem: premGift }, accountToken);
      if (!isCurrentOpening(accountToken)) return;
      onClose(false);
      return;
    }
    const f2p = f2pGift;
    const prem = premGift;
    onClose(true);
    if (openAvatar) {
      setTimeout(() => {
        if (isCurrentOpening(accountToken)) router.push('/avatar_select' as any);
      }, 80);
    }
    void (async () => {
      try {
        const [f2pResult, premResult] = await Promise.all([
          f2pApplyPromiseRef.current ?? Promise.resolve(f2pAppliedMeta),
          premApplyPromiseRef.current ?? Promise.resolve(premAppliedMeta),
        ]);
        if (!isCurrentAccountGeneration(accountToken)) return;
        if (isCurrentOpening(accountToken)) {
          setF2pAppliedMeta(f2pResult);
          setPremAppliedMeta(premResult);
        }
        await persistDualGiftOutcome(f2p, prem, f2pResult, premResult, accountToken);
      } catch {
        // The modal already closed optimistically; failed parts stay retryable through persist fallback.
      } finally {
        if (isCurrentOpening(accountToken)) setClaimNowBusy(false);
      }
    })();
  };

  const handleUseNow = async (openAvatar = false) => {
    if (!f2pGift || !premGift || doneClosingRef.current || claimNowBusy) return;
    const accountToken = openingAccountTokenRef.current;
    if (!accountToken || !isCurrentOpening(accountToken)) return;
    setClaimNowBusy(true);
    doneClosingRef.current = true;
    void hapticSuccess();
    const f2p = f2pGift;
    const prem = premGift;
    onClose(true);
    if (openAvatar) {
        setTimeout(() => {
          if (isCurrentOpening(accountToken)) router.push('/avatar_select' as any);
        }, 80);
      }
    void (async () => {
      try {
        const [f2pResult, premResult] = await Promise.all([
          applyGift(f2p, userName, energy, maxEnergy, setEnergyFn, { isPremium: true, studyTarget, accountToken, occurrenceId: `level:${level}:f2p`, localOnly: true }).catch(() => ({ success: false })),
          applyGift(prem, userName, energy, maxEnergy, setEnergyFn, { isPremium: true, studyTarget, accountToken, occurrenceId: `level:${level}:premium`, localOnly: true }).catch(() => ({ success: false })),
        ]);
        if (!isCurrentAccountGeneration(accountToken)) return;
        if (isCurrentOpening(accountToken)) {
          setF2pAppliedMeta(f2pResult);
          setPremAppliedMeta(premResult);
        }
        await persistDualGiftOutcome(f2p, prem, f2pResult, premResult, accountToken);
      } catch {
        // The modal has already closed optimistically; do not surface background storage noise.
      } finally {
        if (isCurrentOpening(accountToken)) setClaimNowBusy(false);
      }
    })();
  };

  const handleApplyPreview = (openAvatar = false) => {
    if (presentationMode !== 'apply' || !visible || !f2pGift || !premGift) return;
    if (directApplyStartedRef.current) return;
    const accountToken = openingAccountTokenRef.current;
    if (!accountToken || !isCurrentOpening(accountToken)) return;
    directApplyStartedRef.current = true;
    setClaimNowBusy(true);
    void hapticSuccess();
    onClose(true);
    if (openAvatar) {
      setTimeout(() => {
        if (isCurrentOpening(accountToken)) router.push('/avatar_select' as any);
      }, 80);
    }
    const f2pResultP = applyGift(f2pGift, userName, energy, maxEnergy, setEnergyFn, {
      isPremium: true,
      studyTarget,
      accountToken,
      occurrenceId: `level:${level}:f2p`,
      localOnly: true,
    }).catch(() => ({ success: false }));
    const premResultP = applyGift(premGift, userName, energy, maxEnergy, setEnergyFn, {
      isPremium: true,
      studyTarget,
      accountToken,
      occurrenceId: `level:${level}:premium`,
      localOnly: true,
    }).catch(() => ({ success: false }));
    f2pApplyPromiseRef.current = f2pResultP;
    premApplyPromiseRef.current = premResultP;
    void Promise.all([f2pResultP, premResultP]).then(async ([f2pResult, premResult]) => {
      if (!isCurrentOpening(accountToken)) return;
      setF2pAppliedMeta(f2pResult);
      setPremAppliedMeta(premResult);
      await persistDualGiftOutcome(f2pGift, premGift, f2pResult, premResult, accountToken);
    }).finally(() => {
      if (isCurrentOpening(accountToken)) setClaimNowBusy(false);
    });
  };

  if (!visible || !f2pGift || !premGift) return null;

  const borderC = f2pGift.rarity === 'epic' || premGift.rarity === 'epic'
    ? RARITY_BORDER.epic
    : f2pGift.rarity === 'rare' || premGift.rarity === 'rare'
      ? RARITY_BORDER.rare
      : RARITY_BORDER.common;
  const hasCosmeticGift = !storesOnly && (isCosmeticGiftId(f2pGift?.id) || isCosmeticGiftId(premGift?.id));
  const modalScale = modalEntrance.interpolate({ inputRange: [0, 1], outputRange: [0.93, 1] });
  const modalY = modalEntrance.interpolate({ inputRange: [0, 1], outputRange: [18, 0] });
  const revealY = fadeReveal.interpolate({ inputRange: [0, 1], outputRange: [18, 0] });
  const ctaShineX = ctaShine.interpolate({ inputRange: [0, 1], outputRange: [-180, 220] });
  const modalAccent = rewardModalAccentColor(themeMode, t);
  const modalPanelBackground = dualGiftModalPanelBackground(themeMode, t);
  const primaryButtonColors = rewardModalPrimaryButtonColors(themeMode);
  const primaryButtonText = rewardModalPrimaryButtonText(themeMode);
  const isSagePorcelain = themeMode === 'sagePorcelain';
  const modalTitleColor = isSagePorcelain ? t.textPrimary : '#FFFFFF';
  const closeButtonBackground = isSagePorcelain ? t.bgSurface : USE_ELITE_DUAL_LEVEL_GIFT_MODAL ? 'rgba(3,5,10,0.42)' : 'rgba(0,0,0,0.16)';
  const closeButtonBorder = isSagePorcelain ? t.border : USE_ELITE_DUAL_LEVEL_GIFT_MODAL ? 'rgba(255,255,255,0.18)' : t.border;
  const closeButtonText = t.textPrimary;
  const screenDim = USE_ELITE_DUAL_LEVEL_GIFT_MODAL
    ? (false ? 'rgba(24,18,10,0.32)' : 'rgba(0,0,0,0.48)')
    : 'rgba(0,0,0,0.78)';

  // Крестик доступен ВСЕГДА. «В середине» (1 открыт) — сохранить открытое и
  // выйти без подтверждения; во время анимации открытия — дождаться её конца.
  const requestCloseModal = () => {
    if (presentationMode === 'apply') {
      onClose(false);
      return;
    }
    if (claimNowBusy || doneClosingRef.current) return;
    if (opening) {
      closeAfterOpenRef.current = true;
      return;
    }
    if (opened.size === 2 && f2pGift && premGift) {
      void handleDone();
      return;
    }
    if (opened.size === 1) {
      void handleCloseMidWith(opened.has('f2p') ? 'f2p' : 'prem');
      return;
    }
    if (phase === 'pair' && opened.size === 0) void handleSkip();
  };

  const onRequestCloseModal = requestCloseModal;

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
          borderWidth: USE_ELITE_DUAL_LEVEL_GIFT_MODAL ? 0 : 1.5,
          borderColor: USE_ELITE_DUAL_LEVEL_GIFT_MODAL ? rewardModalPanelBorder(themeMode, t, borderC === RARITY_BORDER.common ? undefined : borderC) : borderC,
          shadowColor: premGift?.rarity === 'epic' || f2pGift?.rarity === 'epic' ? '#FFD700' : USE_ELITE_DUAL_LEVEL_GIFT_MODAL ? '#D6B85C' : '#7C3AED',
          shadowOpacity: USE_ELITE_DUAL_LEVEL_GIFT_MODAL ? 0.32 : 0.35,
          shadowRadius: USE_ELITE_DUAL_LEVEL_GIFT_MODAL ? 32 : 20,
          transform: USE_ELITE_DUAL_LEVEL_GIFT_MODAL ? [{ scale: modalScale }, { translateY: modalY }] : [],
        }}>
          {USE_ELITE_DUAL_LEVEL_GIFT_MODAL && (
            <RewardModalPanelBackdrop themeMode={themeMode} intensity="strong" />
          )}

          {/* Крестик доступен всегда: в середине — сохранить открытое и выйти,
              без подтверждения; во время анимации открытия — дождаться её конца. */}
          <TouchableOpacity
            testID="level-gift-dual-close"
            accessibilityRole="button"
            accessibilityLabel={triLang(lang, { ru: 'Закрыть', uk: 'Закрити', es: 'Cerrar', 'pt-BR': 'Fechar', vi: 'Đóng', id: 'Tutup', tr: 'Kapat', pl: 'Zamknij' })}
            activeOpacity={0.76}
            onPress={requestCloseModal}
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
              backgroundColor: closeButtonBackground,
              borderWidth: isSagePorcelain ? 1 : 0,
              borderColor: closeButtonBorder,
            }}
          >
            <Text style={{ color: closeButtonText, fontSize: 24, lineHeight: 28, fontWeight: '800' }}>×</Text>
          </TouchableOpacity>

          <Text style={{ color: USE_ELITE_DUAL_LEVEL_GIFT_MODAL ? modalAccent : t.textPrimary, fontSize: f.label, fontWeight: '900', textTransform: 'uppercase', letterSpacing: 1.2, marginBottom: 4, textAlign: 'center' }}>
            {triLang(lang, {
              ru: `Плюс: уровень ${level}`,
              uk: `Плюс: рівень ${level}`,
              es: `Plus: nivel ${level}`,
              'pt-BR': `Plus: nível ${level}`,
              vi: `Plus: cấp ${level}`,
              id: `Plus: level ${level}`,
              tr: `Plus: seviye ${level}`,
              pl: `Plus: poziom ${level}`,
            })}
          </Text>
          <Text style={{ color: modalTitleColor, fontSize: USE_ELITE_DUAL_LEVEL_GIFT_MODAL ? f.h2 + 1 : f.bodyLg, fontWeight: '900', marginBottom: 3, textAlign: 'center' }}>
            {triLang(lang, { ru: 'Два подарка', uk: 'Два подарунки', es: 'Dos regalos', 'pt-BR': 'Dois presentes', vi: 'Hai phần quà', id: 'Dua hadiah', tr: 'İki hediye', pl: 'Dwa prezenty' })}
          </Text>
          <Text style={{ color: t.textMuted, fontSize: f.sub, fontWeight: '600', textAlign: 'center', marginBottom: USE_ELITE_DUAL_LEVEL_GIFT_MODAL ? 16 : 12 }}>
            {triLang(lang, { ru: 'Награда за твой путь', uk: 'Нагорода за твій шлях', es: 'Recompensa por progreso', 'pt-BR': 'Recompensa pelo progresso', vi: 'Phần thưởng cho tiến trình', id: 'Hadiah untuk progres', tr: 'İlerleme ödülü', pl: 'Nagroda za postęp' })}
          </Text>

          {phase === 'pair' && (
            <>
              {/* Слоты сундуков СИММЕТРИЧНЫ: равные колонки, равные отступы,
                  сцена фиксированной высоты (сундук и мини-награда занимают один
                  бокс), подписи одной высоты на общей базовой линии. */}
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: USE_ELITE_DUAL_LEVEL_GIFT_MODAL ? 10 : 6 }}>
                <View style={{ flex: 1, alignItems: 'center', minWidth: 0, backgroundColor: USE_ELITE_DUAL_LEVEL_GIFT_MODAL ? '#0B1018' : 'transparent', borderRadius: USE_ELITE_DUAL_LEVEL_GIFT_MODAL ? 18 : 0, borderWidth: 0, borderColor: USE_ELITE_DUAL_LEVEL_GIFT_MODAL ? rewardModalPanelBorder(themeMode, t) : 'transparent', paddingVertical: USE_ELITE_DUAL_LEVEL_GIFT_MODAL ? 12 : 0, paddingHorizontal: USE_ELITE_DUAL_LEVEL_GIFT_MODAL ? 6 : 0 }}>
                  <View style={{ height: MINI_REWARD_STAGE_SIZE, alignSelf: 'stretch', alignItems: 'center', justifyContent: 'center' }}>
                    {opened.has('f2p') && f2pGift ? (
                      <MiniRewardPeekStage
                        gift={f2pGift}
                        themeMode={themeMode}
                        burstTier={animTierF2p(f2pGift.rarity)}
                      />
                    ) : (
                      <TouchableOpacity
                        testID="level-gift-dual-f2p-open"
                        activeOpacity={0.88}
                        disabled={opening != null || opened.has('f2p') || !f2pGift}
                        onPress={onTapF2p}
                        style={{ alignItems: 'center' }}
                      >
                        <GiftBox3D
                          palette={paletteForRarity(f2pGift?.rarity ?? 'common')}
                          size={DUAL_CHEST_STAGE_SIZE}
                          idle={!opened.has('f2p') && opening !== 'f2p'}
                          opening={opening === 'f2p'}
                          floatY={fFloat}
                          rock={fRockI}
                          scale={fScale}
                          shakeX={fShake}
                          lidLift={fLid}
                        />
                      </TouchableOpacity>
                    )}
                  </View>
                  <Text style={{ color: t.textMuted, fontSize: 10, lineHeight: 13, height: 26, marginTop: 6, textAlign: 'center', fontWeight: USE_ELITE_DUAL_LEVEL_GIFT_MODAL ? '700' : '400', textTransform: USE_ELITE_DUAL_LEVEL_GIFT_MODAL ? 'uppercase' : 'none', letterSpacing: USE_ELITE_DUAL_LEVEL_GIFT_MODAL ? 0.5 : 0 }} numberOfLines={2}>
                    {firstChestLabel(lang)}
                  </Text>
                  {opened.has('f2p') && f2pGift ? (
                    <Text style={{ color: t.textPrimary, fontSize: f.sub, fontWeight: '800', textAlign: 'center', marginTop: 4 }} numberOfLines={3}>
                      {giftDisplayTitleForLang(f2pGift, lang)}
                    </Text>
                  ) : null}
                </View>
                <View style={{ flex: 1, alignItems: 'center', minWidth: 0, backgroundColor: USE_ELITE_DUAL_LEVEL_GIFT_MODAL ? '#0B1018' : 'transparent', borderRadius: USE_ELITE_DUAL_LEVEL_GIFT_MODAL ? 18 : 0, borderWidth: 0, borderColor: USE_ELITE_DUAL_LEVEL_GIFT_MODAL ? `${modalAccent}36` : 'transparent', paddingVertical: USE_ELITE_DUAL_LEVEL_GIFT_MODAL ? 12 : 0, paddingHorizontal: USE_ELITE_DUAL_LEVEL_GIFT_MODAL ? 6 : 0 }}>
                  <View style={{ height: MINI_REWARD_STAGE_SIZE, alignSelf: 'stretch', alignItems: 'center', justifyContent: 'center' }}>
                    {opened.has('prem') && premGift ? (
                      <MiniRewardPeekStage
                        gift={premGift}
                        themeMode={themeMode}
                        burstTier={animTierPrem()}
                      />
                    ) : (
                      <TouchableOpacity
                        testID="level-gift-dual-prem-open"
                        activeOpacity={0.88}
                        disabled={opening != null || opened.has('prem') || !premGift}
                        onPress={onTapPrem}
                        style={{ alignItems: 'center' }}
                      >
                        <GiftBox3D
                          palette={GIFT_PALETTES.gold}
                          size={DUAL_CHEST_STAGE_SIZE}
                          idle={!opened.has('prem') && opening !== 'prem'}
                          opening={opening === 'prem'}
                          floatY={pFloat}
                          rock={pRockI}
                          scale={pScale}
                          shakeX={pShake}
                          lidLift={pLid}
                        />
                      </TouchableOpacity>
                    )}
                  </View>
                  <Text style={{ color: monoIcon(themeMode, PREM_LABEL_COLOR), fontSize: 10, lineHeight: 13, height: 26, marginTop: 6, textAlign: 'center', fontWeight: '800', textTransform: USE_ELITE_DUAL_LEVEL_GIFT_MODAL ? 'uppercase' : 'none', letterSpacing: USE_ELITE_DUAL_LEVEL_GIFT_MODAL ? 0.5 : 0 }} numberOfLines={2}>
                    {secondChestLabel(lang)}
                  </Text>
                  {opened.has('prem') && premGift ? (
                    <View style={{ alignItems: 'center', marginTop: 4 }}>
                      <Text style={{ color: t.textPrimary, fontSize: f.sub, fontWeight: '800', textAlign: 'center' }} numberOfLines={3}>
                        {giftDisplayTitleForLang(premGift, lang)}
                      </Text>
                      <PlusBadge
                        themeMode={themeMode}
                        size="xs"
                        testID="level-gift-dual-peek-plus-badge"
                        style={{ marginTop: 5, alignSelf: 'center' }}
                      />
                    </View>
                  ) : null}
                </View>
              </View>
              {opened.size === 2 && f2pGift && premGift && (
                <Animated.View
                  testID="level-gift-dual-rewards"
                  style={{
                    marginTop: USE_ELITE_DUAL_LEVEL_GIFT_MODAL ? 16 : 14,
                    alignSelf: 'stretch',
                    opacity: presentationMode === 'apply' ? fadeReveal : 1,
                    transform: presentationMode === 'apply' && USE_ELITE_DUAL_LEVEL_GIFT_MODAL ? [{ translateY: revealY }, { scale: detailScale }] : [],
                  }}
                >
                  {presentationMode === 'apply' && (
                    <>
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
                      </ScrollView>
                    </>
                  )}
                  <TouchableOpacity
                    testID="level-gift-dual-claim"
                    activeOpacity={0.88}
                    disabled={claimNowBusy}
                    onPress={() => {
                      if (presentationMode === 'apply') handleApplyPreview();
                      else void (storesOnly ? handleUseNow() : handleDone());
                    }}
                    style={{
                      borderRadius: USE_ELITE_DUAL_LEVEL_GIFT_MODAL ? 18 : 14,
                      marginTop: 16,
                      overflow: 'hidden',
                      borderWidth: USE_ELITE_DUAL_LEVEL_GIFT_MODAL ? 0 : 1.5,
                      borderColor: USE_ELITE_DUAL_LEVEL_GIFT_MODAL ? rewardModalPanelBorder(themeMode, t) : '#A78BFA',
                      shadowColor: '#FFFFFF',
                      shadowOpacity: USE_ELITE_DUAL_LEVEL_GIFT_MODAL ? 0.18 : 0,
                      shadowRadius: USE_ELITE_DUAL_LEVEL_GIFT_MODAL ? 14 : 0,
                      shadowOffset: { width: 0, height: 0 },
                      opacity: claimNowBusy ? 0.85 : 1,
                    }}
                  >
                    <LinearGradient
                      colors={USE_ELITE_DUAL_LEVEL_GIFT_MODAL ? primaryButtonColors : ['#6D28D9', '#4C1D95']}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                      style={{ paddingVertical: USE_ELITE_DUAL_LEVEL_GIFT_MODAL ? 15 : 14, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 8 }}
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
                      {claimNowBusy ? (
                        <ActivityIndicator size="small" color={USE_ELITE_DUAL_LEVEL_GIFT_MODAL ? primaryButtonText : '#FFFFFF'} />
                      ) : null}
                      <Text style={{ color: USE_ELITE_DUAL_LEVEL_GIFT_MODAL ? primaryButtonText : '#FFFFFF', fontSize: f.bodyLg, fontWeight: '900' }}>
                        {claimNowBusy
                          ? triLang(lang, { ru: 'Применяем...', uk: 'Застосовуємо...', es: 'Aplicando...', 'pt-BR': 'Aplicando...', vi: 'Đang áp dụng...', id: 'Menerapkan...', tr: 'Uygulanıyor...', pl: 'Stosowanie...' })
                          : presentationMode === 'apply'
                          ? triLang(lang, { ru: 'Применить', uk: 'Застосувати', es: 'Aplicar', 'pt-BR': 'Usar', vi: 'Dùng', id: 'Pakai', tr: 'Kullan', pl: 'Użyj' })
                          : storesOnly
                          ? triLang(lang, { ru: 'Использовать сейчас', uk: 'Використати зараз', es: 'Usar ahora', 'pt-BR': 'Usar agora', vi: 'Dùng ngay', id: 'Gunakan sekarang', tr: 'Şimdi kullan', pl: 'Użyj teraz' })
                          : triLang(lang, { ru: 'Получить всё', uk: 'Отримати всі', es: 'Reclamar todo', 'pt-BR': 'Resgatar tudo', vi: 'Nhận tất cả', id: 'Klaim semua', tr: 'Hepsini al', pl: 'Odbierz wszystko' })}
                      </Text>
                    </LinearGradient>
                  </TouchableOpacity>
                  {hasCosmeticGift && (
                    <TouchableOpacity
                      testID="level-gift-dual-open-avatar"
                      activeOpacity={0.7}
                      onPress={() => {
                        if (presentationMode === 'apply') handleApplyPreview(true);
                        else void (storesOnly ? handleUseNow(true) : handleDone(true));
                      }}
                      disabled={claimNowBusy}
                      style={{ marginTop: 4, alignSelf: 'center', paddingVertical: 10, paddingHorizontal: 20, minHeight: 40, justifyContent: 'center', opacity: claimNowBusy ? 0.6 : 1 }}
                    >
                      <Text style={{ color: t.textMuted, fontSize: f.body, fontWeight: '600', textAlign: 'center' }}>
                        {triLang(lang, { ru: 'Открыть аватар', uk: 'Відкрити аватар', es: 'Abrir avatar', 'pt-BR': 'Abrir avatar', vi: 'Mở avatar', id: 'Buka avatar', tr: 'Avatarı aç', pl: 'Otwórz avatar' })}
                      </Text>
                    </TouchableOpacity>
                  )}
                  {storesOnly && (
                    <TouchableOpacity
                      testID="level-gift-dual-save-opened"
                      activeOpacity={0.7}
                      disabled={claimNowBusy}
                      onPress={() => { void handleDone(); }}
                      style={{ marginTop: hasCosmeticGift ? 0 : 4, alignSelf: 'center', paddingVertical: 10, paddingHorizontal: 20, minHeight: 40, justifyContent: 'center', opacity: claimNowBusy ? 0.6 : 1 }}
                    >
                      <Text style={{ color: t.textMuted, fontSize: f.body, textAlign: 'center', fontWeight: '600' }}>
                        {triLang(lang, { ru: 'Позже', uk: 'Пізніше', es: 'Más tarde', 'pt-BR': 'Mais tarde', vi: 'Để sau', id: 'Nanti saja', tr: 'Daha sonra', pl: 'Później' })}
                      </Text>
                    </TouchableOpacity>
                  )}
                </Animated.View>
              )}

              {opened.size === 0 && f2pGift && premGift && (
                <TouchableOpacity
                  testID="level-gift-dual-save-later"
                  activeOpacity={0.7}
                  onPress={handleSkip}
                  style={{
                    marginTop: USE_ELITE_DUAL_LEVEL_GIFT_MODAL ? 12 : 10,
                    alignSelf: 'center',
                    paddingVertical: 10,
                    paddingHorizontal: 20,
                    minHeight: 40,
                    justifyContent: 'center',
                  }}
                >
                  <Text style={{ color: t.textMuted, fontSize: f.body, textAlign: 'center', fontWeight: '600' }}>
                    {triLang(lang, { ru: 'Позже', uk: 'Пізніше', es: 'Más tarde', 'pt-BR': 'Mais tarde', vi: 'Để sau', id: 'Nanti saja', tr: 'Daha sonra', pl: 'Później' })}
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

/**
 * Сцена мини-награды сразу после открытия сундука: бёрст + иконка, пружинный
 * влёт. Название/бейдж рисует слот — так сцена обоих сундуков занимает
 * одинаковую высоту (симметрия слотов).
 */
function MiniRewardPeekStage({ gift, themeMode, burstTier }: {
  gift:        GiftDef;
  themeMode:   ThemeMode;
  burstTier:   GiftAnimTier;
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
    <Animated.View style={{ width: MINI_REWARD_STAGE_SIZE, height: MINI_REWARD_STAGE_SIZE, alignItems: 'center', justifyContent: 'center', opacity: entry, transform: [{ translateY: entryY }, { scale: entryScale }] }}>
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
  const borderCol  = premVisual ? 'rgba(214,184,92,0.45)' : (RARITY_BORDER[rarity] ?? RARITY_BORDER.common);
  const cosmeticLabel = cosmeticLabelForLang(meta, lang);
  return (
    <View style={{
      borderRadius: USE_ELITE_DUAL_LEVEL_GIFT_MODAL ? 18 : 16,
      borderWidth: USE_ELITE_DUAL_LEVEL_GIFT_MODAL ? 0 : 1.2,
      borderColor: borderCol,
      padding: USE_ELITE_DUAL_LEVEL_GIFT_MODAL ? 14 : 12,
      backgroundColor: USE_ELITE_DUAL_LEVEL_GIFT_MODAL ? '#0B1018' : 'rgba(0,0,0,0.15)',
      overflow: 'hidden',
    }}>
      <Text style={{ color: premVisual ? monoIcon(themeMode, PREM_LABEL_COLOR) : t.textMuted, fontSize: 10, fontWeight: '800', marginBottom: USE_ELITE_DUAL_LEVEL_GIFT_MODAL ? 8 : 4, textTransform: 'uppercase', letterSpacing: USE_ELITE_DUAL_LEVEL_GIFT_MODAL ? 0.5 : 0 }}>
        {label} · {giftRarityUiLabel(rarity, lang)}
      </Text>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <Image source={getLevelGiftRewardIcon(g.id, themeMode)} style={{ width: DETAIL_REWARD_ICON_SIZE, height: DETAIL_REWARD_ICON_SIZE }} contentFit="contain" />
        <View style={{ flex: 1 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 7, flexWrap: 'wrap' }}>
            <Text style={{ color: t.textPrimary, fontSize: f.h2 - 2, fontWeight: '900', flexShrink: 1 }}>{giftDisplayTitleForLang(g, lang)}</Text>
            {premVisual ? <PlusBadge themeMode={themeMode} size="xs" testID="level-gift-dual-result-plus-badge" /> : null}
          </View>
          {!!giftDisplayDescForLang(g, lang) && (
            <Text style={{ color: t.textSecond, fontSize: f.caption, marginTop: 2 }}>{giftDisplayDescForLang(g, lang)}</Text>
          )}
        </View>
      </View>
      {g.id && isEnergyBonusGiftId(g.id) && (
        <EnergyNote f={f} g={g} lang={lang} themeMode={themeMode} energyBoostAlreadyActive={!!meta.energyBoostAlreadyActive} />
      )}
      {!!cosmeticLabel && (
        <View testID="level-gift-dual-cosmetic-preview" style={{ marginTop: 8, padding: 8, backgroundColor: 'rgba(124,58,237,0.12)', borderRadius: 8, borderWidth: 0, borderColor: '#A78BFA55', alignItems: 'center', gap: 7 }}>
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
        <View style={{ marginTop: 8, padding: 8, backgroundColor: '#FEF3C7', borderRadius: 8, borderWidth: 0, borderColor: '#D97706' }}>
          <Text style={{ color: monoIcon(themeMode, '#78350F', MONO_ICON.onLight), fontSize: f.caption, textAlign: 'center', fontWeight: '600' }}>
            {triLang(lang, { ru: '2× буст обновлён', uk: '2× буст оновлено', es: 'Bono de XP ×2 actualizado', 'pt-BR': 'Bônus de XP ×2 atualizado', vi: 'Boost XP ×2 đã cập nhật', id: 'Boost XP ×2 diperbarui', tr: 'XP ×2 boost güncellendi', pl: 'Boost XP ×2 zaktualizowany' })}
          </Text>
        </View>
      )}
    </View>
  );
}

function EnergyNote({ f, g, lang, themeMode, energyBoostAlreadyActive }: {
  f:     Fonts;
  g:     GiftDef;
  lang:  Lang;
  themeMode: ThemeMode;
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
      borderWidth: 0,
      borderColor: '#D97706',
    }}>
      {energyBoostAlreadyActive
        ? (
            <Text style={{ color: monoIcon(themeMode, '#78350F', MONO_ICON.onLight), fontSize: f.caption, textAlign: 'center', fontWeight: '700' }}>
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
            <Text style={{ color: monoIcon(themeMode, '#78350F', MONO_ICON.onLight), fontSize: f.caption, textAlign: 'center', fontWeight: '600' }}>
              {triLang(lang, { ru: 'До полуночи', uk: 'Діє до півночі', es: 'Vigente hasta medianoche', 'pt-BR': 'Até meia-noite', vi: 'Đến nửa đêm', id: 'Sampai tengah malam', tr: 'Gece yarısına kadar', pl: 'Do północy' })}
            </Text>
          )}
    </View>
  );
}
