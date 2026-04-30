/**
 * LevelGiftDualModal — премиум: два сундука за уровень (F2P + премиум).
 * Левый — картинка редкости; правый — GIFT PREMIUM. Открытие в любом порядке, затем общий экран.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Animated,
  Image,
  Modal,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import {
  applyGift, ApplyGiftResult, GiftDef, giftDescForLang, giftRarityUiLabel,
  giftShardAmount, giftTitleForLang, isEnergyBonusGiftId,
  rollF2pLevelGiftForUser, rollPremiumLevelGiftForUser,
} from '../app/level_gift_system';
import { triLang, type Lang } from '../constants/i18n';
import { oskolokImageForPackShards } from '../app/oskolok';
import { hapticSuccess, hapticTap } from '../hooks/use-haptics';
import { useEnergy } from './EnergyContext';
import { useTheme, type Fonts } from './ThemeContext';
import type { Theme } from '../constants/theme';
import { GiftOpenBurst, animTierF2p, animTierPrem, type GiftAnimTier } from './GiftOpenEffects';
import { markGiftClaimed, saveClaimedGiftRarity, UNCLAIMED_GIFTS_KEY } from './LevelGiftModal';

const F2P_IMAGES: Record<string, number> = {
  common: require('../assets/images/levels/GIF_COMMON.png'),
  rare:   require('../assets/images/levels/GIFT_RARE.png'),
  epic:   require('../assets/images/levels/GIFT_EPIC.png'),
};

/** Подписи сундуков/карточек — не «F2P»/англ. жаргон, а нормальные RU/UK/ES. */
const DUAL_UI = {
  firstChest:  { ru: 'Подарок за уровень', uk: 'Подарунок за рівень', es: 'Regalo por nivel' },
  secondChest: { ru: 'Бонус премиум',     uk: 'Преміум-бонус',     es: 'Bono premium' },
} as const;

/** Заголовок карточки премиум-награды: тёмный фиолетовый на светлом фоне (не бледный #C4B5FD). */
const PREM_LABEL_COLOR = '#5B21B6';
/** Без пробела в имени — иначе Metro/бандл на части девайсов не подхватывают `require` и `Image` пустой. */
const PREMIUM_CHEST = require('../assets/images/levels/GIFT_PREMIUM.png');

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

export const UNCLAIMED_DUAL_GIFTS_KEY = 'unclaimed_level_gifts_dual_v1';
const CLAIMED_DUAL_LEVELS_KEY = 'claimed_level_gift_dual_flag_v1';

type BoxKey = 'f2p' | 'prem';

export interface PremPair {
  f2p:  GiftDef;
  prem: GiftDef;
}

export const saveUnclaimedDualGift = async (level: number, pair: PremPair): Promise<void> => {
  try {
    const raw = await AsyncStorage.getItem(UNCLAIMED_DUAL_GIFTS_KEY);
    const map: Record<number, PremPair> = raw ? JSON.parse(raw) : {};
    map[level] = pair;
    await AsyncStorage.setItem(UNCLAIMED_DUAL_GIFTS_KEY, JSON.stringify(map));
    // взаимоисключение с одиночным
    const raw1 = await AsyncStorage.getItem(UNCLAIMED_GIFTS_KEY);
    if (raw1) {
      const m: Record<number, GiftDef> = JSON.parse(raw1);
      delete m[level];
      await AsyncStorage.setItem(UNCLAIMED_GIFTS_KEY, JSON.stringify(m));
    }
  } catch { /* */ }
};

export const loadUnclaimedDualGifts = async (): Promise<Record<number, PremPair>> => {
  try {
    const raw = await AsyncStorage.getItem(UNCLAIMED_DUAL_GIFTS_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch { return {}; }
};

export const markDualGiftClaimed = async (level: number): Promise<void> => {
  try {
    const raw = await AsyncStorage.getItem(UNCLAIMED_DUAL_GIFTS_KEY);
    if (!raw) return;
    const map: Record<number, PremPair> = JSON.parse(raw);
    delete map[level];
    await AsyncStorage.setItem(UNCLAIMED_DUAL_GIFTS_KEY, JSON.stringify(map));
  } catch { /* */ }
};

export const setLevelHadDualClaim = async (level: number): Promise<void> => {
  try {
    const raw = await AsyncStorage.getItem(CLAIMED_DUAL_LEVELS_KEY);
    const set: number[] = raw ? JSON.parse(raw) : [];
    if (!set.includes(level)) {
      set.push(level);
      await AsyncStorage.setItem(CLAIMED_DUAL_LEVELS_KEY, JSON.stringify(set));
    }
  } catch { /* */ }
};

export const loadDualClaimedLevels = async (): Promise<Set<number>> => {
  try {
    const raw = await AsyncStorage.getItem(CLAIMED_DUAL_LEVELS_KEY);
    const a: number[] = raw ? JSON.parse(raw) : [];
    return new Set(a);
  } catch { return new Set(); }
};

interface Props {
  visible:           boolean;
  level:             number;
  userName:          string;
  lang:              Lang;
  onClose:           (claimed: boolean) => void;
  preRolledPair?:    PremPair;
}

/** pair: сундуки + мини-раскрытие (только названия); full: описания + «Получить всё» */
type Phase = 'pair' | 'full';

export default function LevelGiftDualModal({ visible, level, userName, lang, onClose, preRolledPair }: Props) {
  const { theme: t, f } = useTheme();
  const { energy, maxEnergy, reload: reloadEnergy } = useEnergy();

  const [f2pGift, setF2pGift]   = useState<GiftDef | null>(null);
  const [premGift, setPremGift] = useState<GiftDef | null>(null);
  const [opened, setOpened]   = useState<Set<BoxKey>>(() => new Set());
  const [phase, setPhase]     = useState<Phase>('pair');
  const [opening, setOpening] = useState<BoxKey | null>(null);
  const [f2pAppliedMeta, setF2pAppliedMeta] = useState<ApplyGiftResult>({ success: true });
  const [premAppliedMeta, setPremAppliedMeta] = useState<ApplyGiftResult>({ success: true });

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
  const idleLeft  = useRef<Animated.CompositeAnimation | null>(null);
  const idleRight = useRef<Animated.CompositeAnimation | null>(null);
  const idleAll   = useRef<Animated.CompositeAnimation | null>(null);
  const doneClosingRef = useRef(false);
  /** Только false→true по `visible` — иначе лишний сброс `opened` (Strict Mode / смена deps) убирает уже открытые сундуки. */
  const wasVisibleRef = useRef(false);

  const resetAnims = useCallback(() => {
    fFloat.setValue(0); fRock.setValue(0); fScale.setValue(1); fShake.setValue(0);
    pFloat.setValue(0); pRock.setValue(0); pScale.setValue(1); pShake.setValue(0);
    fadeReveal.setValue(0);
  }, [fFloat, fRock, fScale, fShake, pFloat, pRock, pScale, pShake, fadeReveal]);

  useEffect(() => {
    if (!visible) {
      wasVisibleRef.current = false;
      doneClosingRef.current = false;
      idleAll.current?.stop();
      idleLeft.current?.stop();
      idleRight.current?.stop();
      return;
    }
    const justOpened = !wasVisibleRef.current;
    wasVisibleRef.current = true;
    if (justOpened) {
      setOpened(new Set());
      setPhase('pair');
      setOpening(null);
      setF2pAppliedMeta({ success: true });
      setPremAppliedMeta({ success: true });
      resetAnims();
      setF2pGift(null);
      setPremGift(null);
      if (preRolledPair) {
        setF2pGift(preRolledPair.f2p);
        setPremGift(preRolledPair.prem);
      } else {
        void (async () => {
          const [a, b] = await Promise.all([
            rollF2pLevelGiftForUser(level, { premiumSafe: true }),
            rollPremiumLevelGiftForUser(level),
          ]);
          setF2pGift(a);
          setPremGift(b);
        })();
      }
    }
  }, [visible, level, preRolledPair, resetAnims]);

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
      Animated.timing(shakeA, { toValue:  9,  duration: 40,  useNativeDriver: true }),
      Animated.timing(shakeA, { toValue: -9,  duration: 40,  useNativeDriver: true }),
      Animated.timing(shakeA, { toValue:  0,  duration: 34,  useNativeDriver: true }),
    ]).start(() => {
      Animated.sequence([
        Animated.timing(scaleA, { toValue: 1.32,  duration: 120, useNativeDriver: true }),
        Animated.timing(scaleA, { toValue: 0,   duration: 100,  useNativeDriver: true }),
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
          const result = await applyGift(g, userName, energy, maxEnergy, setEnergyFn, { isPremium: true });
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

  const handleDone = async () => {
    if (!f2pGift || !premGift || doneClosingRef.current) return;
    doneClosingRef.current = true;
    void hapticSuccess();
    await markDualGiftClaimed(level);
    await markGiftClaimed(level);
    await setLevelHadDualClaim(level);
    const best = f2pGift.rarity === 'epic' || premGift.rarity === 'epic'
      ? 'epic' : f2pGift.rarity === 'rare' || premGift.rarity === 'rare' ? 'rare' : 'common';
    await saveClaimedGiftRarity(level, best);
    onClose(true);
  };

  if (!visible) return null;

  const borderC = f2pGift
    ? (f2pGift.rarity === 'epic' || (premGift?.rarity === 'epic') ? RARITY_BORDER.epic : f2pGift.rarity === 'rare' || premGift?.rarity === 'rare' ? RARITY_BORDER.rare : RARITY_BORDER.common)
    : RARITY_BORDER.common;
  const bgTint  = f2pGift
    ? (f2pGift.rarity === 'epic' || premGift?.rarity === 'epic' ? RARITY_BG.epic
      : f2pGift.rarity === 'rare' || premGift?.rarity === 'rare' ? RARITY_BG.rare
        : RARITY_BG.common) : RARITY_BG.common;

  const onRequestCloseModal = () => {
    if (phase === 'full' && f2pGift && premGift) {
      void handleDone();
      return;
    }
    if (phase === 'pair' && opened.size === 0) void handleSkip();
  };

  return (
    <Modal transparent visible animationType="fade" onRequestClose={onRequestCloseModal}>
      <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.78)', justifyContent: 'center', alignItems: 'center' }}>
        <View style={{
          backgroundColor: t.bgCard,
          borderRadius: 28,
          padding: 24,
          width: 320,
          maxHeight: '88%',
          borderWidth: 1.5,
          borderColor: borderC,
          shadowColor: premGift?.rarity === 'epic' || f2pGift?.rarity === 'epic' ? '#FFD700' : '#7C3AED',
          shadowOpacity: 0.35,
          shadowRadius: 20,
        }}>
          {bgTint !== 'transparent' && (
            <View style={{ ...{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, borderRadius: 28 }, backgroundColor: bgTint, pointerEvents: 'none' }} />
          )}

          <Text style={{ color: t.textPrimary, fontSize: f.label, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 1.2, marginBottom: 4, textAlign: 'center' }}>
            {triLang(lang, { ru: `Премиум: уровень ${level}`, uk: `Преміум: рівень ${level}`, es: `Premium: nivel ${level}` })}
          </Text>
          <Text style={{ color: t.textPrimary, fontSize: f.bodyLg, fontWeight: '800', marginBottom: 12, textAlign: 'center' }}>
            {triLang(lang, { ru: '🎁 Два подарка', uk: '🎁 Два подарунки', es: '🎁 Dos regalos' })}
          </Text>

          {phase === 'pair' && (
            <>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 6 }}>
                <View style={{ flex: 1, alignItems: 'center', minWidth: 0 }}>
                  {opened.has('f2p') && f2pGift ? (
                    <MiniRewardPeek
                      gift={f2pGift}
                      lang={lang}
                      theme={t}
                      fonts={f}
                      burstTier={animTierF2p(f2pGift.rarity)}
                      premVisual={false}
                    />
                  ) : (
                    <TouchableOpacity
                      activeOpacity={0.88}
                      disabled={opening != null || opened.has('f2p') || !f2pGift}
                      onPress={onTapF2p}
                      style={{ alignItems: 'center' }}
                    >
                      <Animated.View style={{
                        transform: [
                          { translateY: !opened.has('f2p') && opening !== 'f2p' ? fFloat : 0 },
                          { rotateZ: !opened.has('f2p') && opening !== 'f2p' ? fRockI : '0deg' },
                          { scale: fScale },
                          { translateX: fShake },
                        ],
                      }}>
                        <Image
                          source={F2P_IMAGES[f2pGift?.rarity ?? 'common']}
                          style={{ width: 88, height: 88 }}
                          resizeMode="contain"
                        />
                      </Animated.View>
                    </TouchableOpacity>
                  )}
                  <Text style={{ color: t.textMuted, fontSize: 10, marginTop: 6, textAlign: 'center' }}>
                    {triLang(lang, DUAL_UI.firstChest)}
                  </Text>
                </View>
                <View style={{ flex: 1, alignItems: 'center', minWidth: 0 }}>
                  {opened.has('prem') && premGift ? (
                    <MiniRewardPeek
                      gift={premGift}
                      lang={lang}
                      theme={t}
                      fonts={f}
                      burstTier={animTierPrem()}
                      premVisual
                    />
                  ) : (
                    <TouchableOpacity
                      activeOpacity={0.88}
                      disabled={opening != null || opened.has('prem') || !premGift}
                      onPress={onTapPrem}
                      style={{ alignItems: 'center' }}
                    >
                      <Animated.View style={{
                        transform: [
                          { translateY: !opened.has('prem') && opening !== 'prem' ? pFloat : 0 },
                          { rotateZ: !opened.has('prem') && opening !== 'prem' ? pRockI : '0deg' },
                          { scale: pScale },
                          { translateX: pShake },
                        ],
                      }}>
                        <Image source={PREMIUM_CHEST} style={{ width: 88, height: 88 }} resizeMode="contain" />
                      </Animated.View>
                    </TouchableOpacity>
                  )}
                  <Text style={{ color: PREM_LABEL_COLOR, fontSize: 10, marginTop: 6, textAlign: 'center', fontWeight: '700' }}>
                    {triLang(lang, DUAL_UI.secondChest)}
                  </Text>
                </View>
              </View>
              {opened.size === 0 && (
                <Text style={{ color: t.textMuted, fontSize: f.caption, marginTop: 10, textAlign: 'center' }}>
                  {(!f2pGift || !premGift)
                    ? triLang(lang, { ru: 'Готовим сундуки…', uk: 'Готуємо сундики…', es: 'Preparando cofres…' })
                    : triLang(lang, {
                      ru: 'Открой оба (в любом порядке)',
                      uk: 'Відкрий обидва (будь-який порядок)',
                      es: 'Abre ambos (en cualquier orden)',
                    })}
                </Text>
              )}
              {opened.size === 1 && (
                <Text style={{ color: t.gold, fontSize: f.caption, marginTop: 10, textAlign: 'center' }}>
                  {triLang(lang, {
                    ru: 'Ещё награда!',
                    uk: 'Ще одна винагорода!',
                    es: '¡Otra recompensa!',
                  })}
                </Text>
              )}

              {opened.size === 2 && f2pGift && premGift && (
                <TouchableOpacity
                  activeOpacity={0.88}
                  onPress={() => {
                    setPhase('full');
                    fadeReveal.setValue(0);
                    requestAnimationFrame(() => {
                      Animated.spring(fadeReveal, { toValue: 1, useNativeDriver: true, tension: 120, friction: 8 }).start();
                    });
                  }}
                  style={{
                    marginTop:  16,
                    alignSelf:  'stretch',
                    backgroundColor: 'rgba(91, 33, 182, 0.35)',
                    borderRadius: 14,
                    paddingVertical: 12,
                    borderWidth: 1,
                    borderColor: '#A78BFA88',
                  }}
                >
                  <Text style={{ color: '#E9D5FF', fontSize: f.sub, fontWeight: '800', textAlign: 'center' }}>
                    {triLang(lang, { ru: 'Подробности…', uk: 'Детальніше…', es: 'Detalles…' })}
                  </Text>
                </TouchableOpacity>
              )}

              {opened.size === 0 && f2pGift && premGift && (
                <TouchableOpacity activeOpacity={0.7} onPress={handleSkip} style={{ marginTop: 12 }}>
                  <Text style={{ color: t.textGhost, fontSize: f.sub, textAlign: 'center', textDecorationLine: 'underline' }}>
                    {triLang(lang, { ru: 'Забрать позже', uk: 'Забрати пізніше', es: 'Reclamar más tarde' })}
                  </Text>
                </TouchableOpacity>
              )}
            </>
          )}

          {phase === 'full' && f2pGift && premGift && (
            <ScrollView
              style={{ maxHeight: 400 }}
              showsVerticalScrollIndicator={false}
            >
              <Text style={{ color: t.textMuted, fontSize: f.caption, textAlign: 'center', marginBottom: 10 }}>
                {triLang(lang, {
                  ru: 'Что именно ты получил',
                  uk: 'Що саме ти отримав',
                  es: '¿Qué has recibido?',
                })}
              </Text>
              <Animated.View style={{ opacity: fadeReveal, alignItems: 'stretch' }}>
                <GiftResultBlock
                  t={t} f={f} g={f2pGift} lang={lang}
                  label={triLang(lang, DUAL_UI.firstChest)}
                  meta={f2pAppliedMeta}
                />
                <View style={{ height: 10 }} />
                <GiftResultBlock
                  t={t} f={f} g={premGift} lang={lang}
                  label={triLang(lang, DUAL_UI.secondChest)}
                  premVisual
                  meta={premAppliedMeta}
                />
                <TouchableOpacity
                  onPress={handleDone}
                  style={{
                    backgroundColor: '#5B21B6',
                    borderRadius: 14,
                    paddingVertical: 14,
                    marginTop: 18,
                    alignItems: 'center',
                    borderWidth: 1.5,
                    borderColor: '#A78BFA',
                  }}
                >
                  <Text style={{ color: '#FFFFFF', fontSize: f.bodyLg, fontWeight: '800' }}>
                    {triLang(lang, { ru: 'Получить всё', uk: 'Отримати всі', es: 'Reclamar todo' })}
                  </Text>
                </TouchableOpacity>
              </Animated.View>
            </ScrollView>
          )}
        </View>
      </View>
    </Modal>
  );
}

/** Сразу после открытия: только иконка + название, без описания (анимация по редкости). */
function MiniRewardPeek({ gift, lang, theme: t, fonts: f, burstTier, premVisual }: {
  gift:        GiftDef;
  lang:        Lang;
  theme:       Theme;
  fonts:       Fonts;
  burstTier:   GiftAnimTier;
  premVisual:  boolean;
}) {
  return (
    <View style={{ width: '100%', minHeight: 108, alignItems: 'center', justifyContent: 'flex-start' }}>
      <View style={{ width: 100, height: 100, alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
        <GiftOpenBurst key={`${gift.id}-${burstTier}`} tier={burstTier} size={100} />
        {premVisual ? (
          <Image
            source={PREMIUM_CHEST}
            style={{ width: 56, height: 56, zIndex: 2, position: 'relative' }}
            resizeMode="contain"
          />
        ) : giftShardAmount(gift.id) > 0 ? (
          <Image
            source={oskolokImageForPackShards(giftShardAmount(gift.id))}
            style={{ width: 60, height: 60, zIndex: 2, position: 'relative' }}
            resizeMode="contain"
          />
        ) : (
          <Text style={{ fontSize: 44, zIndex: 2, position: 'relative' }}>{gift.icon}</Text>
        )}
      </View>
      <Text
        numberOfLines={2}
        style={{
          color:            t.textPrimary,
          fontSize:         f.body,
          fontWeight:       '800',
          textAlign:        'center',
          marginTop:        4,
          zIndex:           2,
          position:         'relative',
          paddingHorizontal: 2,
        }}
      >
        {giftTitleForLang(gift, lang)}
      </Text>
    </View>
  );
}

function GiftResultBlock({ t, f, g, lang, label, premVisual, meta }: {
  t:     Theme;
  f:     Fonts;
  g:     GiftDef;
  lang:  Lang;
  label: string;
  premVisual?: boolean;
  meta:  ApplyGiftResult;
}) {
  const rarity     = g.rarity;
  const borderCol  = premVisual ? '#7C3AED88' : (RARITY_BORDER[rarity] ?? RARITY_BORDER.common);
  return (
    <View style={{
      borderRadius: 16,
      borderWidth: 1.2,
      borderColor: borderCol,
      padding: 12,
      backgroundColor: 'rgba(0,0,0,0.15)',
    }}>
      <Text style={{ color: premVisual ? PREM_LABEL_COLOR : t.textMuted, fontSize: 10, fontWeight: '700', marginBottom: 4, textTransform: 'uppercase' }}>
        {label} · {giftRarityUiLabel(rarity, lang)}
      </Text>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        {premVisual
          ? <Image source={PREMIUM_CHEST} style={{ width: 40, height: 40 }} resizeMode="contain" />
          : giftShardAmount(g.id) > 0
            ? <Image source={oskolokImageForPackShards(giftShardAmount(g.id))} style={{ width: 44, height: 44 }} resizeMode="contain" />
            : <Text style={{ fontSize: 36 }}>{g.icon}</Text>}
        <View style={{ flex: 1 }}>
          <Text style={{ color: t.textPrimary, fontSize: f.h2 - 2, fontWeight: '800' }}>{giftTitleForLang(g, lang)}</Text>
          <Text style={{ color: t.textSecond, fontSize: f.caption, marginTop: 2 }}>{giftDescForLang(g, lang)}</Text>
        </View>
      </View>
      {g.id && isEnergyBonusGiftId(g.id) && (
        <EnergyNote f={f} g={g} lang={lang} energyBoostAlreadyActive={!!meta.energyBoostAlreadyActive} />
      )}
      {(g.id === 'xp_2x_24h' || g.id === 'xp_2x_48h') && meta.xpBoostAlreadyActive && (
        <View style={{ marginTop: 8, padding: 8, backgroundColor: '#FEF3C7', borderRadius: 8, borderWidth: 1, borderColor: '#D97706' }}>
          <Text style={{ color: '#78350F', fontSize: f.caption, textAlign: 'center', fontWeight: '600' }}>
            {triLang(lang, { ru: '2× буст обновлён', uk: '2× буст оновлено', es: 'Bono de XP ×2 actualizado' })}
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
              })}
            </Text>
          )
        : (
            <Text style={{ color: '#78350F', fontSize: f.caption, textAlign: 'center', fontWeight: '600' }}>
              {triLang(lang, { ru: 'До полуночи', uk: 'Діє до півночі', es: 'Vigente hasta medianoche' })}
            </Text>
          )}
    </View>
  );
}
