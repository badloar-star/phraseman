/**
 * LevelGiftModal — модальное окно подарка за повышение уровня.
 * Показывает покачивающийся ящик → тап → раскрытие → результат.
 * Цвет карточки зависит от редкости: common=нейтрал, rare=синий, epic=золотой.
 *
 * Кнопка «Не забирать» сохраняет подарок как непринятый — его можно забрать
 * позже в «Пути героя» (progress_map).
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { useEffect, useRef, useState } from 'react';
import {
  Animated, Image, Modal, Text, TouchableOpacity, View,
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

const GIFT_IMAGES: Record<string, number> = {
  common: require('../assets/images/levels/GIF_COMMON.png'),
  rare:   require('../assets/images/levels/GIFT_RARE.png'),
  epic:   require('../assets/images/levels/GIFT_EPIC.png'),
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
  const { theme: t, f } = useTheme();
  const { energy, maxEnergy, reload: reloadEnergy } = useEnergy();

  const [phase, setPhase] = useState<Phase>('box');
  const [gift, setGift]   = useState<GiftDef | null>(null);
  const [xpBoostAlreadyActive, setXpBoostAlreadyActive] = useState(false);
  const [energyBoostAlreadyActive, setEnergyBoostAlreadyActive] = useState(false);

  const floatAnim  = useRef(new Animated.Value(0)).current;
  const rockAnim   = useRef(new Animated.Value(0)).current;
  const scaleAnim  = useRef(new Animated.Value(1)).current;
  const fadeReveal = useRef(new Animated.Value(0)).current;
  const shakeAnim  = useRef(new Animated.Value(0)).current;
  const idleLoop   = useRef<Animated.CompositeAnimation | null>(null);

  // Roll (or use pre-rolled) gift when the modal becomes visible; премиум — отдельный пул
  useEffect(() => {
    if (visible) {
      setPhase('box');
      setXpBoostAlreadyActive(false);
      setEnergyBoostAlreadyActive(false);
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
    } else {
      idleLoop.current?.stop();
    }
  }, [visible, level, preRolledGift, fadeReveal, floatAnim, rockAnim, scaleAnim, shakeAnim]);

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
    const applyP: Promise<ApplyGiftResult> = (async () => {
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
        setPhase('reveal');
        fadeReveal.setValue(0);
        Animated.spring(fadeReveal, { toValue: 1, useNativeDriver: true, tension: 160, friction: 9 }).start();
      })();
    };
    safetyTimer = setTimeout(finalize, 900);

    Animated.sequence([
      Animated.timing(shakeAnim, { toValue:  10, duration: 42, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -10, duration: 42, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue:   0, duration: 36, useNativeDriver: true }),
    ]).start(() => {
      Animated.sequence([
        Animated.timing(scaleAnim, { toValue: 1.35, duration: 130, useNativeDriver: true }),
        Animated.timing(scaleAnim, { toValue: 0,   duration: 95,  useNativeDriver: true }),
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

  if (!visible) return null;

  const rarity      = gift?.rarity ?? 'common';
  const borderColor = gift ? RARITY_BORDER[rarity] : '#B8860B44';
  const bgTint      = gift ? RARITY_BG[rarity] : 'transparent';
  const rarityLabel = gift ? giftRarityUiLabel(rarity, lang) : '';

  return (
    <Modal transparent visible animationType="fade" onRequestClose={handleSkip}>
      <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.75)', justifyContent: 'center', alignItems: 'center' }}>

        <View style={{
          backgroundColor: t.bgCard,
          borderRadius: 28,
          padding: 32,
          width: 300,
          alignItems: 'center',
          borderWidth: 1.5,
          borderColor,
          shadowColor: rarity === 'epic' ? '#FFD700' : '#2563EB',
          shadowOpacity: gift ? 0.3 : 0,
          shadowRadius: 24,
          shadowOffset: { width: 0, height: 0 },
          elevation: 24,
        }}>
          {/* Tint overlay for rare/epic */}
          {bgTint !== 'transparent' && (
            <View style={{
              ...{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, borderRadius: 28 },
              backgroundColor: bgTint,
              pointerEvents: 'none',
            }} />
          )}

          {/* Header */}
          <Text style={{ color: t.gold, fontSize: f.label, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1.5, marginBottom: 6 }}>
            {triLang(lang, { ru: `Уровень ${level}`, uk: `Рівень ${level}`, es: `Nivel ${level}` })}
          </Text>
          <Text style={{ color: t.textPrimary, fontSize: f.numMd, fontWeight: '800', marginBottom: 24, textAlign: 'center' }}>
            {triLang(lang, { ru: '🎁 Твой подарок!', uk: '🎁 Твій подарунок!', es: '🎁 ¡Tu regalo!' })}
          </Text>

          {phase !== 'reveal' ? (
            <>
              <TouchableOpacity activeOpacity={0.8} onPress={handleTap} disabled={phase === 'opening' || !gift} style={{ alignItems: 'center' }}>
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
                    style={{ width: 100, height: 100 }}
                    resizeMode="contain"
                  />
                </Animated.View>

                {phase === 'box' && (
                  <Text style={{ color: t.textMuted, fontSize: f.caption, marginTop: 20, textAlign: 'center' }}>
                    {!gift
                      ? triLang(lang, { ru: 'Готовим подарок…', uk: 'Підготовка подарунка…', es: 'Preparando tu regalo…' })
                      : triLang(lang, {
                        ru: 'Нажми, чтобы открыть',
                        uk: 'Натисни, щоб відкрити',
                        es: 'Toca para abrir',
                      })}
                  </Text>
                )}
              </TouchableOpacity>

              {/* Skip button — only visible while box is showing (not during open animation) */}
              {phase === 'box' && (
                <TouchableOpacity
                  activeOpacity={0.7}
                  onPress={handleSkip}
                  style={{ marginTop: 24 }}
                >
                  <Text style={{ color: t.textGhost, fontSize: f.sub, textDecorationLine: 'underline' }}>
                    {triLang(lang, { ru: 'Забрать позже', uk: 'Забрати пізніше', es: 'Reclamar más tarde' })}
                  </Text>
                </TouchableOpacity>
              )}
            </>
          ) : (
            <Animated.View style={{ opacity: fadeReveal, alignItems: 'center' }}>
              {gift && giftShardAmount(gift.id) > 0 ? (
                <Image
                  source={oskolokImageForPackShards(giftShardAmount(gift.id))}
                  style={{ width: 96, height: 96, marginBottom: 8 }}
                  resizeMode="contain"
                />
              ) : (
                <Text style={{ fontSize: 72, marginBottom: 8 }}>{gift?.icon}</Text>
              )}

              {/* Rarity badge */}
              <Text style={{
                color: rarity === 'epic' ? t.gold : rarity === 'rare' ? '#60A5FA' : t.textMuted,
                fontSize: f.sub, fontWeight: '700', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 6,
              }}>
                {rarityLabel}
              </Text>

              <Text style={{ color: t.textPrimary, fontSize: f.h2 + 6, fontWeight: '800', marginBottom: 6, textAlign: 'center' }}>
                {gift ? giftTitleForLang(gift, lang) : ''}
              </Text>
              <Text style={{ color: t.textSecond, fontSize: f.body, textAlign: 'center', marginBottom: (gift?.id && isEnergyBonusGiftId(gift.id)) || xpBoostAlreadyActive ? 12 : 28 }}>
                {gift ? giftDescForLang(gift, lang) : ''}
              </Text>

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
                        🔄 {triLang(lang, { ru: 'Буст заменён', uk: 'Буст замінено', es: 'Bono reemplazado' })}
                      </Text>
                      <Text style={{ color: '#92400E', fontSize: f.caption, textAlign: 'center', marginTop: 2 }}>
                        {triLang(lang, {
                          ru: `Бусты энергии не суммируются — предыдущий заменён новым (+${n} до завтра)`,
                          uk: `Бусти енергії не сумуються — попередній замінено новим (+${n} до завтра)`,
                          es: `Los bonos de energía no se acumulan: el anterior queda reemplazado por uno nuevo (+${n} hasta mañana)`,
                        })}
                      </Text>
                    </>
                  ) : (
                    <>
                      <Text style={{ color: '#78350F', fontSize: f.sub, fontWeight: '700', textAlign: 'center' }}>
                        ⚡ {triLang(lang, { ru: 'Действует до полуночи', uk: 'Діє до опівночі', es: 'Vigente hasta medianoche' })}
                      </Text>
                      <Text style={{ color: '#92400E', fontSize: f.caption, textAlign: 'center', marginTop: 2 }}>
                        {triLang(lang, {
                          ru: `Эти ${n} ед. энергии исчезнут в начале следующего дня`,
                          uk: `Ці ${n} од. енергії зникнуть на початку наступного дня`,
                          es: `Estas ${n} unidades extra de energía caducan al empezar el día siguiente`,
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
                    🔄 {triLang(lang, { ru: 'Буст обновлён', uk: 'Буст оновлено', es: 'Bono actualizado' })}
                  </Text>
                  <Text style={{ color: '#92400E', fontSize: f.caption, textAlign: 'center', marginTop: 2 }}>
                    {triLang(lang, {
                      ru: 'Бусты 2× XP не суммируются — активный буст заменён новым. Таймер запущен заново.',
                      uk: 'Бусти 2× XP не сумуються — активний буст замінено новим. Таймер запущено заново.',
                      es: 'Los bonos de XP ×2 no se acumulan: el activo se sustituyó y el temporizador se reinició.',
                    })}
                  </Text>
                </View>
              )}

              <TouchableOpacity
                activeOpacity={0.85}
                onPress={() => {
                  void hapticSuccess();
                  onClose(true);
                }}
                style={{
                  backgroundColor: rarity === 'epic' ? '#B8860B' : rarity === 'rare' ? '#1D4ED8' : t.bgSurface2,
                  borderRadius: 14,
                  paddingVertical: 14,
                  paddingHorizontal: 40,
                  borderWidth: 1.5,
                  borderColor: rarity === 'epic' ? '#FFD700' : rarity === 'rare' ? '#60A5FA' : t.border,
                }}
              >
                <Text style={{
                  color: rarity !== 'common' ? '#FFFFFF' : t.textPrimary,
                  fontSize: f.bodyLg, fontWeight: '800',
                }}>
                  {triLang(lang, { ru: 'Получить!', uk: 'Отримати!', es: '¡Reclamar!' })}
                </Text>
              </TouchableOpacity>
            </Animated.View>
          )}
        </View>
      </View>
    </Modal>
  );
}
