/**
 * LevelGiftModal — модальное окно подарка за повышение уровня.
 * Показывает покачивающийся ящик → тап → раскрытие → результат.
 * Цвет карточки зависит от редкости: common=нейтрал, rare=синий, epic=золотой.
 *
 * Кнопка «Не забирать» сохраняет подарок как непринятый — его можно забрать
 * позже в «Пути героя» (progress_map).
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import {
  Animated, Easing, Image, Modal, Text, TouchableOpacity, View,
} from 'react-native';
import {
  applyGift, ApplyGiftResult, GiftDef, giftDescForLang, giftRarityUiLabel,
  giftShardAmount, giftTitleForLang,
  isEnergyBonusGiftId, rollF2pLevelGiftForUser,
} from '../app/level_gift_system';
import { triLang, type Lang } from '../constants/i18n';
import { oskolokImageForPackShards } from '../app/oskolok';
import { hapticSuccess, hapticTap } from '../hooks/use-haptics';
import { useEnergy } from './EnergyContext';
import { useTheme } from './ThemeContext';
import AvatarAura from './AvatarAura';
import AvatarView from './AvatarView';
import CustomAvatarBadge from './CustomAvatarBadge';
import { getBestAvatarForLevel } from '../constants/avatars';
import { GiftOpenBurst, animTierF2p } from './GiftOpenEffects';

const GIFT_IMAGES: Record<string, number> = {
  common: require('../assets/images/levels/GIF_COMMON.webp'),
  rare:   require('../assets/images/levels/GIFT_RARE.webp'),
  epic:   require('../assets/images/levels/GIFT_EPIC.webp'),
};

interface Props {
  visible:        boolean;
  level:          number;
  userName:       string;
  lang:           Lang;
  onClose:        (claimed: boolean) => void;
  /** If provided, shows this specific gift instead of rolling a new one */
  preRolledGift?: GiftDef;
}

type Phase = 'box' | 'opening' | 'reveal';

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

const USE_ELITE_LEVEL_GIFT_MODAL = true;

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

/** AsyncStorage key for unclaimed level gifts. Value: Record<level, GiftDef> */
export const UNCLAIMED_GIFTS_KEY = 'unclaimed_level_gifts';
export const CLAIMED_GIFTS_KEY = 'claimed_level_gifts';

/** Save claimed gift rarity for display purposes */
export const saveClaimedGiftRarity = async (level: number, rarity: string): Promise<void> => {
  try {
    const raw = await AsyncStorage.getItem(CLAIMED_GIFTS_KEY);
    const map: Record<number, string> = raw ? JSON.parse(raw) : {};
    map[level] = rarity;
    await AsyncStorage.setItem(CLAIMED_GIFTS_KEY, JSON.stringify(map));
  } catch {}
};

/** Load all claimed gift rarities */
export const loadClaimedGiftRarities = async (): Promise<Record<number, string>> => {
  try {
    const raw = await AsyncStorage.getItem(CLAIMED_GIFTS_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch { return {}; }
};

/** Save a gift as unclaimed for the given level */
const UNCLAIMED_DUAL_IN_SINGLE_FLOW = 'unclaimed_level_gifts_dual_v1';

export const saveUnclaimedGift = async (level: number, gift: GiftDef): Promise<void> => {
  try {
    const raw = await AsyncStorage.getItem(UNCLAIMED_GIFTS_KEY);
    const map: Record<number, GiftDef> = raw ? JSON.parse(raw) : {};
    map[level] = gift;
    await AsyncStorage.setItem(UNCLAIMED_GIFTS_KEY, JSON.stringify(map));
    const dRaw = await AsyncStorage.getItem(UNCLAIMED_DUAL_IN_SINGLE_FLOW);
    if (dRaw) {
      const dm: Record<number, unknown> = JSON.parse(dRaw);
      delete dm[level];
      await AsyncStorage.setItem(UNCLAIMED_DUAL_IN_SINGLE_FLOW, JSON.stringify(dm));
    }
  } catch {}
};

/** Mark a gift as claimed (remove from unclaimed map) */
export const markGiftClaimed = async (level: number): Promise<void> => {
  try {
    const raw = await AsyncStorage.getItem(UNCLAIMED_GIFTS_KEY);
    if (!raw) return;
    const map: Record<number, GiftDef> = JSON.parse(raw);
    delete map[level];
    await AsyncStorage.setItem(UNCLAIMED_GIFTS_KEY, JSON.stringify(map));
  } catch {}
};

/** Load all unclaimed gifts */
export const loadUnclaimedGifts = async (): Promise<Record<number, GiftDef>> => {
  try {
    const raw = await AsyncStorage.getItem(UNCLAIMED_GIFTS_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch { return {}; }
};

export default function LevelGiftModal({ visible, level, userName, lang, onClose, preRolledGift }: Props) {
  const router = useRouter();
  const { theme: t, f } = useTheme();
  const { energy, maxEnergy, reload: reloadEnergy } = useEnergy();

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
  const modalEntrance = useRef(new Animated.Value(0)).current;
  const modalGlow = useRef(new Animated.Value(0)).current;
  const idleLoop   = useRef<Animated.CompositeAnimation | null>(null);
  const glowLoop   = useRef<Animated.CompositeAnimation | null>(null);

  // Roll (or use pre-rolled) gift when the modal becomes visible; премиум — отдельный пул
  useEffect(() => {
    if (visible) {
      setPhase('box');
      setXpBoostAlreadyActive(false);
      setEnergyBoostAlreadyActive(false);
      setChoiceBusy(false);
      setAppliedResult(null);
      setGift(null);
      if (preRolledGift) {
        setGift(preRolledGift);
      } else {
        void (async () => {
          setGift(await rollF2pLevelGiftForUser(level));
        })();
      }
      fadeReveal.setValue(0);
      scaleAnim.setValue(1);
      shakeAnim.setValue(0);
      floatAnim.setValue(0);
      rockAnim.setValue(0);
      modalEntrance.setValue(0);
      modalGlow.setValue(0);
      if (USE_ELITE_LEVEL_GIFT_MODAL) {
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
    } else {
      idleLoop.current?.stop();
      glowLoop.current?.stop();
    }
  }, [visible, level, preRolledGift, fadeReveal, floatAnim, rockAnim, scaleAnim, shakeAnim, modalEntrance, modalGlow]);

  useEffect(() => {
    if (!visible || !gift) {
      idleLoop.current?.stop();
      return;
    }
    const floatLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(floatAnim, { toValue: -6, duration: 450, useNativeDriver: true }),
        Animated.timing(floatAnim, { toValue: 0,  duration: 450, useNativeDriver: true }),
      ])
    );
    const rockLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(rockAnim, { toValue: -5, duration: 380, useNativeDriver: true }),
        Animated.timing(rockAnim, { toValue:  5, duration: 380, useNativeDriver: true }),
        Animated.timing(rockAnim, { toValue:  0, duration: 320, useNativeDriver: true }),
      ])
    );
    idleLoop.current = Animated.parallel([floatLoop, rockLoop]);
    idleLoop.current.start();
    return () => { idleLoop.current?.stop(); };
  }, [visible, gift, floatAnim, rockAnim]);

  const rock = rockAnim.interpolate({ inputRange: [-6, 6], outputRange: ['-6deg', '6deg'] });

  const handleTap = () => {
    if (phase !== 'box' || !gift) return;
    hapticTap();
    setPhase('opening');

    idleLoop.current?.stop();
    floatAnim.setValue(0);
    rockAnim.setValue(0);

    // Награда грузится в фоне — не await до старта анимации, иначе JS-поток блокируется
    // и открытие «подвисает». Итог дожидаем в finalize.
    const g = gift;
    const setEnergyFn = async (_n: number) => { await reloadEnergy(); };
    const applyP: Promise<ApplyGiftResult> = g.choices?.length
      ? Promise.resolve({ success: true })
      : (async () => {
          const result = await applyGift(g, userName, energy, maxEnergy, setEnergyFn);
          await markGiftClaimed(level);
          await saveClaimedGiftRarity(level, g.rarity);
          return result;
        })();

    let safetyTimer: ReturnType<typeof setTimeout> | undefined;
    let finalized = false;
    const finalize = () => {
      if (finalized) return;
      finalized = true;
      if (safetyTimer) clearTimeout(safetyTimer);
      void (async () => {
        const result = await applyP;
        if (result.xpBoostAlreadyActive) setXpBoostAlreadyActive(true);
        if (result.energyBoostAlreadyActive) setEnergyBoostAlreadyActive(true);
        setAppliedResult(result);
        setPhase('reveal');
        fadeReveal.setValue(0);
        Animated.spring(fadeReveal, { toValue: 1, useNativeDriver: true, tension: 160, friction: 9 }).start();
      })();
    };
    safetyTimer = setTimeout(finalize, 900);

    Animated.sequence([
      Animated.parallel([
        Animated.timing(shakeAnim, { toValue: 10, duration: 44, useNativeDriver: true }),
        Animated.timing(scaleAnim, { toValue: 0.94, duration: 90, useNativeDriver: true }),
      ]),
      Animated.timing(shakeAnim, { toValue: -12, duration: 46, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 10, duration: 42, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 0, duration: 34, useNativeDriver: true }),
    ]).start(() => {
      Animated.sequence([
        Animated.spring(scaleAnim, { toValue: 1.18, tension: 190, friction: 6, useNativeDriver: true }),
        Animated.timing(scaleAnim, { toValue: 1.42, duration: 140, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
        Animated.timing(scaleAnim, { toValue: 0, duration: 120, easing: Easing.in(Easing.cubic), useNativeDriver: true }),
      ]).start(() => { finalize(); });
    });
  };

  const handleSkip = async () => {
    if (!gift) { onClose(false); return; }
    if (phase === 'opening') return;
    // Save as unclaimed so user can pick it up later in progress_map
    await saveUnclaimedGift(level, gift);
    onClose(false);
  };

  const handleChoice = async (chosen: GiftDef) => {
    if (choiceBusy) return;
    setChoiceBusy(true);
    try {
      const setEnergyFn = async (_n: number) => { await reloadEnergy(); };
      const result = await applyGift(chosen, userName, energy, maxEnergy, setEnergyFn);
      if (result.xpBoostAlreadyActive) setXpBoostAlreadyActive(true);
      if (result.energyBoostAlreadyActive) setEnergyBoostAlreadyActive(true);
      setAppliedResult(result);
      await markGiftClaimed(level);
      await saveClaimedGiftRarity(level, chosen.rarity);
      setGift(chosen);
      void hapticSuccess();
      onClose(true);
      if (isCosmeticGiftId(chosen.id)) {
        setTimeout(() => router.push('/avatar_select' as any), 80);
      }
    } finally {
      setChoiceBusy(false);
    }
  };

  if (!visible || !gift) return null;

  const rarity      = gift.rarity;
  const giftAccent = (r: string) => r === 'epic' ? '#FFD700' : r === 'rare' ? '#60A5FA' : t.gold;
  const giftBorder = (r: string) => (RARITY_BORDER[r] ?? RARITY_BORDER.common);
  const giftBg = (r: string) => (RARITY_BG[r] ?? RARITY_BG.common);
  const borderColor = giftBorder(rarity);
  const bgTint      = giftBg(rarity);
  const rarityLabel = giftRarityUiLabel(rarity, lang);
  const cosmeticLabel = cosmeticLabelForLang(appliedResult, lang);
  const modalScale = modalEntrance.interpolate({ inputRange: [0, 1], outputRange: [0.94, 1] });
  const modalY = modalEntrance.interpolate({ inputRange: [0, 1], outputRange: [18, 0] });
  const glowOpacity = modalGlow.interpolate({ inputRange: [0, 1], outputRange: [0.16, 0.42] });
  const revealY = fadeReveal.interpolate({ inputRange: [0, 1], outputRange: [14, 0] });

  return (
    <Modal transparent visible animationType="fade" onRequestClose={handleSkip}>
      <View style={{ flex: 1, backgroundColor: USE_ELITE_LEVEL_GIFT_MODAL ? 'rgba(3,5,10,0.86)' : 'rgba(0,0,0,0.75)', justifyContent: 'center', alignItems: 'center' }}>

        <Animated.View testID="level-gift-modal" style={{
          backgroundColor: USE_ELITE_LEVEL_GIFT_MODAL ? t.bgSurface : t.bgCard,
          borderRadius: USE_ELITE_LEVEL_GIFT_MODAL ? 30 : 28,
          padding: USE_ELITE_LEVEL_GIFT_MODAL ? 26 : 32,
          width: USE_ELITE_LEVEL_GIFT_MODAL ? 326 : 300,
          alignItems: 'center',
          overflow: 'hidden',
          borderWidth: USE_ELITE_LEVEL_GIFT_MODAL ? 1 : 1.5,
          borderColor: USE_ELITE_LEVEL_GIFT_MODAL ? (rarity === 'common' ? t.border : borderColor) : borderColor,
          shadowColor: rarity === 'epic' ? '#FFD700' : rarity === 'rare' ? '#60A5FA' : '#000000',
          shadowOpacity: gift ? (USE_ELITE_LEVEL_GIFT_MODAL ? 0.42 : 0.3) : 0,
          shadowRadius: USE_ELITE_LEVEL_GIFT_MODAL ? 34 : 24,
          shadowOffset: { width: 0, height: 0 },
          elevation: 24,
          transform: USE_ELITE_LEVEL_GIFT_MODAL ? [{ scale: modalScale }, { translateY: modalY }] : [],
        }}>
          {USE_ELITE_LEVEL_GIFT_MODAL && (
            <>
              <Animated.View
                pointerEvents="none"
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 28,
                  right: 28,
                  height: 1,
                  backgroundColor: giftAccent(rarity),
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
                  height: 74,
                  backgroundColor: rarity === 'epic'
                      ? 'rgba(245,158,11,0.08)'
                      : rarity === 'rare'
                        ? 'rgba(96,165,250,0.08)'
                        : 'rgba(255,255,255,0.035)',
                }}
              />
            </>
          )}
          {/* Tint overlay for rare/epic */}
          {bgTint !== 'transparent' && (
            <View style={{
              ...{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, borderRadius: 28 },
              backgroundColor: bgTint,
              pointerEvents: 'none',
            }} />
          )}

          {/* Header */}
          <Text style={{ color: t.gold, fontSize: f.label, fontWeight: '800', textTransform: 'uppercase', letterSpacing: USE_ELITE_LEVEL_GIFT_MODAL ? 1.2 : 1.5, marginBottom: USE_ELITE_LEVEL_GIFT_MODAL ? 7 : 6 }}>
            {triLang(lang, { ru: `Уровень ${level}`, uk: `Рівень ${level}`, es: `Nivel ${level}`, 'pt-BR': `Nível ${level}`, vi: `Cấp ${level}`, id: `Level ${level}`, tr: `Seviye ${level}`, pl: `Poziom ${level}` })}
          </Text>
          <Text style={{ color: t.textPrimary, fontSize: USE_ELITE_LEVEL_GIFT_MODAL ? f.numMd + 4 : f.numMd, fontWeight: '900', marginBottom: 24, textAlign: 'center' }}>
            {triLang(lang, { ru: '🎁 Твой подарок!', uk: '🎁 Твій подарунок!', es: '🎁 ¡Tu regalo!', 'pt-BR': '🎁 Seu presente!', vi: '🎁 Quà của bạn!', id: '🎁 Hadiahmu!', tr: '🎁 Hediyen!', pl: '🎁 Twój prezent!' })}
          </Text>

          {USE_ELITE_LEVEL_GIFT_MODAL && (
            <Text style={{ color: t.textMuted, fontSize: f.sub, fontWeight: '600', textAlign: 'center', marginTop: -16, marginBottom: 24 }}>
              {triLang(lang, { ru: 'Подарок за прогресс', uk: 'Подарунок за прогрес', es: 'Recompensa por progreso', 'pt-BR': 'Recompensa pelo progresso', vi: 'Phần thưởng cho tiến trình', id: 'Hadiah untuk progres', tr: 'İlerleme ödülü', pl: 'Nagroda za postęp' })}
            </Text>
          )}

          {phase !== 'reveal' ? (
            <>
              <TouchableOpacity testID="level-gift-box-open" activeOpacity={0.8} onPress={handleTap} disabled={phase === 'opening' || !gift} style={{ alignItems: 'center', paddingTop: USE_ELITE_LEVEL_GIFT_MODAL ? 2 : 0 }}>
                <Animated.View style={{
                  transform: [
                    { translateY: phase === 'box' ? floatAnim : 0 },
                    { rotateZ:   phase === 'box' ? rock : '0deg' },
                    { scale: scaleAnim },
                    { translateX: shakeAnim },
                  ],
                }}>
                  <Image
                    source={GIFT_IMAGES[gift?.rarity ?? 'common'] ?? GIFT_IMAGES.common}
                    style={{ width: USE_ELITE_LEVEL_GIFT_MODAL ? 114 : 100, height: USE_ELITE_LEVEL_GIFT_MODAL ? 114 : 100 }}
                    resizeMode="contain"
                  />
                </Animated.View>

                {phase === 'box' && (
                  <Text style={{ color: t.textMuted, fontSize: f.caption, marginTop: 20, textAlign: 'center' }}>
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
                  activeOpacity={0.7}
                  onPress={handleSkip}
                  style={{ marginTop: USE_ELITE_LEVEL_GIFT_MODAL ? 22 : 24, paddingVertical: USE_ELITE_LEVEL_GIFT_MODAL ? 8 : 0, paddingHorizontal: USE_ELITE_LEVEL_GIFT_MODAL ? 14 : 0 }}
                >
                  <Text style={{ color: t.textGhost, fontSize: f.sub, textDecorationLine: USE_ELITE_LEVEL_GIFT_MODAL ? 'none' : 'underline', fontWeight: USE_ELITE_LEVEL_GIFT_MODAL ? '700' : '400' }}>
                    {triLang(lang, { ru: 'Забрать позже', uk: 'Забрати пізніше', es: 'Reclamar más tarde', 'pt-BR': 'Receber mais tarde', vi: 'Nhận sau', id: 'Klaim nanti', tr: 'Daha sonra al', pl: 'Odbierz później' })}
                  </Text>
                </TouchableOpacity>
              )}
            </>
          ) : (
            <Animated.View style={{ opacity: fadeReveal, alignItems: 'center', transform: USE_ELITE_LEVEL_GIFT_MODAL ? [{ translateY: revealY }] : [] }}>
              {gift?.choices?.length ? (
                <>
                  <Text style={{ fontSize: 54, marginBottom: 8 }}>{gift.icon}</Text>
                  <Text style={{ color: t.textPrimary, fontSize: f.h2 + 2, fontWeight: '800', marginBottom: 8, textAlign: 'center' }}>
                    {giftTitleForLang(gift, lang)}
                  </Text>
                  <Text style={{ color: t.textSecond, fontSize: f.sub, textAlign: 'center', marginBottom: 16 }}>
                    {giftDescForLang(gift, lang)}
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
                          borderWidth: 1.2,
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
                        <Text style={{ fontSize: 26 }}>{choice.icon}</Text>
                        <View style={{ flex: 1 }}>
                          <Text style={{ color: t.textPrimary, fontSize: f.body, fontWeight: '800' }}>
                            {giftTitleForLang(choice, lang)}
                          </Text>
                          <Text style={{ color: t.textMuted, fontSize: f.caption, marginTop: 2 }} numberOfLines={2}>
                            {giftDescForLang(choice, lang)}
                          </Text>
                        </View>
                      </TouchableOpacity>
                    ))}
                  </View>
                </>
              ) : (
              <>
              <View style={{ width: 132, height: 118, alignItems: 'center', justifyContent: 'center', marginBottom: 2 }}>
                {gift && <GiftOpenBurst key={`${gift.id}-${rarity}-single`} tier={animTierF2p(rarity)} size={132} />}
                {gift && giftShardAmount(gift.id) > 0 ? (
                  <Image
                    source={oskolokImageForPackShards(giftShardAmount(gift.id))}
                    style={{ width: 96, height: 96, zIndex: 2 }}
                    resizeMode="contain"
                  />
                ) : (
                  <Text style={{ fontSize: 72, zIndex: 2 }}>{gift?.icon}</Text>
                )}
              </View>

              {/* Rarity badge */}
              <Text style={{
                color: rarity === 'common' ? t.textMuted : giftAccent(rarity),
                fontSize: USE_ELITE_LEVEL_GIFT_MODAL ? f.caption : f.sub,
                fontWeight: '800',
                letterSpacing: USE_ELITE_LEVEL_GIFT_MODAL ? 1.2 : 1,
                textTransform: 'uppercase',
                marginBottom: USE_ELITE_LEVEL_GIFT_MODAL ? 8 : 6,
                borderWidth: USE_ELITE_LEVEL_GIFT_MODAL ? 1 : 0,
                borderColor: rarity === 'epic' ? '#FFD70055' : rarity === 'rare' ? '#60A5FA55' : t.border,
                borderRadius: USE_ELITE_LEVEL_GIFT_MODAL ? 999 : 0,
                paddingVertical: USE_ELITE_LEVEL_GIFT_MODAL ? 5 : 0,
                paddingHorizontal: USE_ELITE_LEVEL_GIFT_MODAL ? 10 : 0,
                backgroundColor: USE_ELITE_LEVEL_GIFT_MODAL ? 'rgba(255,255,255,0.045)' : 'transparent',
              }}>
                {rarityLabel}
              </Text>

              <Text style={{ color: t.textPrimary, fontSize: USE_ELITE_LEVEL_GIFT_MODAL ? f.h2 + 4 : f.h2 + 6, fontWeight: '900', marginBottom: 6, textAlign: 'center' }}>
                {gift ? giftTitleForLang(gift, lang) : ''}
              </Text>
              <Text style={{ color: t.textSecond, fontSize: f.body, lineHeight: USE_ELITE_LEVEL_GIFT_MODAL ? f.body + 6 : undefined, textAlign: 'center', marginBottom: (gift?.id && isEnergyBonusGiftId(gift.id)) || xpBoostAlreadyActive ? 12 : 28 }}>
                {gift ? giftDescForLang(gift, lang) : ''}
              </Text>
              {!!cosmeticLabel && (
                <View testID="level-gift-cosmetic-preview" style={{
                  backgroundColor: t.bgSurface2,
                  borderRadius: 12,
                  paddingVertical: 8,
                  paddingHorizontal: 12,
                  marginBottom: 14,
                  borderWidth: 1,
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
                  borderWidth: 1,
                  borderColor: '#D97706',
                  alignItems: 'center',
                }}>
                  {energyBoostAlreadyActive ? (
                    <>
                      <Text style={{ color: '#78350F', fontSize: f.sub, fontWeight: '700', textAlign: 'center' }}>
                        🔄 {triLang(lang, { ru: 'Буст заменён', uk: 'Буст замінено', es: 'Bono reemplazado', 'pt-BR': 'Bônus substituído', vi: 'Đã thay boost', id: 'Boost diganti', tr: 'Güçlendirme değiştirildi', pl: 'Bonus zastąpiony' })}
                      </Text>
                      <Text style={{ color: '#92400E', fontSize: f.caption, textAlign: 'center', marginTop: 2 }}>
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
                      <Text style={{ color: '#78350F', fontSize: f.sub, fontWeight: '700', textAlign: 'center' }}>
                        ⚡ {triLang(lang, { ru: 'Действует до полуночи', uk: 'Діє до опівночі', es: 'Vigente hasta medianoche', 'pt-BR': 'Vale até meia-noite', vi: 'Có hiệu lực đến nửa đêm', id: 'Berlaku sampai tengah malam', tr: 'Gece yarısına kadar geçerli', pl: 'Działa do północy' })}
                      </Text>
                      <Text style={{ color: '#92400E', fontSize: f.caption, textAlign: 'center', marginTop: 2 }}>
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
                  borderWidth: 1,
                  borderColor: '#D97706',
                  alignItems: 'center',
                }}>
                  <Text style={{ color: '#78350F', fontSize: f.sub, fontWeight: '700', textAlign: 'center' }}>
                    🔄 {triLang(lang, { ru: 'Буст обновлён', uk: 'Буст оновлено', es: 'Bono actualizado', 'pt-BR': 'Bônus atualizado', vi: 'Boost đã cập nhật', id: 'Boost diperbarui', tr: 'Güçlendirme güncellendi', pl: 'Bonus zaktualizowany' })}
                  </Text>
                  <Text style={{ color: '#92400E', fontSize: f.caption, textAlign: 'center', marginTop: 2 }}>
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

              {isCosmeticGiftId(gift?.id) && (
                <TouchableOpacity
                  testID="level-gift-open-avatar"
                  activeOpacity={0.85}
                  onPress={() => {
                    void hapticSuccess();
                    onClose(true);
                    setTimeout(() => router.push('/avatar_select' as any), 80);
                  }}
                  style={{
                    backgroundColor: t.bgSurface2,
                    borderRadius: 14,
                    paddingVertical: 12,
                    paddingHorizontal: 24,
                    borderWidth: 1,
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
                  onClose(true);
                }}
                style={{
                  backgroundColor: USE_ELITE_LEVEL_GIFT_MODAL
                      ? (rarity === 'epic' ? '#B8860B' : rarity === 'rare' ? '#2563EB' : t.textPrimary)
                      : (rarity === 'epic' ? '#B8860B' : rarity === 'rare' ? '#1D4ED8' : t.bgSurface2),
                  borderRadius: USE_ELITE_LEVEL_GIFT_MODAL ? 18 : 14,
                  paddingVertical: USE_ELITE_LEVEL_GIFT_MODAL ? 15 : 14,
                  paddingHorizontal: USE_ELITE_LEVEL_GIFT_MODAL ? 44 : 40,
                  borderWidth: USE_ELITE_LEVEL_GIFT_MODAL ? 1 : 1.5,
                  borderColor: rarity === 'epic' ? '#FFD700' : rarity === 'rare' ? '#60A5FA' : USE_ELITE_LEVEL_GIFT_MODAL ? 'rgba(255,255,255,0.18)' : t.border,
                  shadowColor: rarity === 'epic' ? '#FFD700' : rarity === 'rare' ? '#60A5FA' : '#FFFFFF',
                  shadowOpacity: USE_ELITE_LEVEL_GIFT_MODAL ? 0.22 : 0,
                  shadowRadius: USE_ELITE_LEVEL_GIFT_MODAL ? 14 : 0,
                  shadowOffset: { width: 0, height: 0 },
                }}
              >
                {USE_ELITE_LEVEL_GIFT_MODAL && (
                  <Text style={{
                    color: rarity === 'common' ? t.bgPrimary : '#FFFFFF',
                    fontSize: f.bodyLg,
                    fontWeight: '900',
                  }}>
                    {triLang(lang, { ru: 'Продолжить', uk: 'Продовжити', es: 'Continuar', 'pt-BR': 'Continuar', vi: 'Tiếp tục', id: 'Lanjutkan', tr: 'Devam et', pl: 'Kontynuuj' })}
                  </Text>
                )}
                {!USE_ELITE_LEVEL_GIFT_MODAL && (
                  <Text style={{
                    color: rarity !== 'common' ? '#FFFFFF' : t.textPrimary,
                    fontSize: f.bodyLg,
                    fontWeight: '900',
                  }}>
                    {triLang(lang, { ru: 'Получить!', uk: 'Отримати!', es: '¡Reclamar!', 'pt-BR': 'Receber!', vi: 'Nhận!', id: 'Klaim!', tr: 'Al!', pl: 'Odbierz!' })}
                  </Text>
                )}
              </TouchableOpacity>
              </>
              )}
            </Animated.View>
          )}
        </Animated.View>
      </View>
    </Modal>
  );
}
