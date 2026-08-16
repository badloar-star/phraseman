/**
 * BoonChestModal — общий объёмный сундук-награда для модальных бонусов
 * (Сундук недели, День возвращения, Идеальная неделя). Один визуальный язык:
 * парящий GiftBox3D → тап → крышка отлетает → награда-орб (осколки) всплывает.
 * Тот же движок, что у подарка за уровень (level_gift_box / GiftOpenEffects).
 *
 * Хост-обёртка отвечает за: когда показывать (eligibility), что начислить (claim),
 * редкость (цвет сундука), тексты. Сам модал — только презентация + анимации фаз.
 *
 * Видимостью управляет OverlayArbiter в хосте; сюда приходит готовый visible.
 */
import React, { useEffect, useRef, useState } from 'react';
import { Animated, Easing, Image, Modal, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import type { ImageSourcePropType } from 'react-native';
import { LinearGradient } from './SafeLinearGradient';
import { useTheme } from './ThemeContext';
import { useLang } from './LangContext';
import { triLang } from '../constants/i18n';
import { hapticSuccess, hapticTap } from '../hooks/use-haptics';
import { GiftBox3D, paletteForRarity } from './level_gift_box';
import { GiftOpenBurst, animTierF2p } from './GiftOpenEffects';
import { RewardModalLiquidGlass } from './RewardModalBackdrop';
import { soundDirector } from '../modules/audio/sound_director';
import BoonChestHybrid from './celebration/BoonChestHybrid';
import type { RewardImpactRarity } from './celebration/use_reward_impact_hybrid';

import { noAndroidOutline } from '../constants/androidGlow';
const STAGE_SIZE = 150;
/** Подстраховка: даже если spring не доиграет колбэк — раскрытие произойдёт. */
const OPEN_SAFETY_MS = 520;

type Phase = 'box' | 'opening' | 'reveal';

export type BoonChestRarity = 'common' | 'rare' | 'epic';

export interface BoonChestModalProps {
  /** Слот выдан арбитром — показываем сундук. */
  visible: boolean;
  /** Цвет/«дороговизна» сундука. */
  rarity: BoonChestRarity;
  /** Иконка награды-орба (тематический осколок и т.п.). */
  rewardIcon: ImageSourcePropType;
  /** Заголовок окна (над сундуком). */
  title: string;
  /** Подпись под наградой в фазе reveal (напр. «5 осколков — теперь твои»). */
  rewardLine: string;
  /** Текст «Нажми, чтобы открыть» под закрытым сундуком. */
  tapHint: string;
  /** Подпись кнопки в фазе reveal. */
  claimCta: string;
  /** A11y-подпись крестика. */
  closeLabel: string;
  /** Начислить награду (идемпотентно на стороне хоста). */
  onClaim: () => void;
  /** Отпустить слот арбитра (закрыть). */
  onClose: () => void;
  /**
   * зачем: гибрид «Световод + Чекан» (макет .motion-mockups/phraseman-hybrid.html,
   * сцена M3 «Сундук-награда») живёт РЯДОМ со старой версией под флагом.
   * Боевой дефолт — 'classic', ничего не меняется без явного включения.
   */
  motionVariant?: 'classic' | 'hybrid';
}

/** Редкость сундука шире словаря удара (нет legendary) — сводим common/rare/epic 1:1. */
function toImpactRarity(rarity: BoonChestRarity): RewardImpactRarity {
  return rarity;
}

export default function BoonChestModal({
  visible,
  rarity,
  rewardIcon,
  title,
  rewardLine,
  tapHint,
  claimCta,
  closeLabel,
  onClaim,
  onClose,
  motionVariant = 'classic',
}: BoonChestModalProps) {
  const { theme: t, themeMode } = useTheme();
  const { lang } = useLang();
  const isClassic = motionVariant === 'classic';
  const [phase, setPhase] = useState<Phase>('box');

  const modalEntrance = useRef(new Animated.Value(0)).current;
  const floatAnim = useRef(new Animated.Value(0)).current;
  const rockAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const shakeAnim = useRef(new Animated.Value(0)).current;
  const lidLift = useRef(new Animated.Value(0)).current;
  const fadeReveal = useRef(new Animated.Value(0)).current;
  const orbRise = useRef(new Animated.Value(0)).current;
  // зачем: пульсация награды живёт на ОТДЕЛЬНОМ значении от влёта (orbRise).
  // Раньше цикл гонял сам orbRise 1↔1.12, из-за чего иконка бесконечно
  // «выезжала» — выглядело как зацикленная анимация появления.
  const orbPulse = useRef(new Animated.Value(0)).current;
  const idleLoop = useRef<Animated.CompositeAnimation | null>(null);
  const orbHoverLoop = useRef<Animated.CompositeAnimation | null>(null);

  // Появление карточки + парение сундука, когда слот выдан.
  // зачем: в hybrid-варианте всю анимацию ведёт BoonChestHybrid — классический
  // Animated-цикл гасим сразу, чтобы не тратить кадры на невидимый рендер.
  useEffect(() => {
    if (!visible || !isClassic) {
      idleLoop.current?.stop();
      orbHoverLoop.current?.stop();
      return;
    }
    setPhase('box');
    modalEntrance.setValue(0);
    floatAnim.setValue(0);
    rockAnim.setValue(0);
    scaleAnim.setValue(1);
    shakeAnim.setValue(0);
    lidLift.setValue(0);
    fadeReveal.setValue(0);
    orbRise.setValue(0);
    orbPulse.setValue(0);

    Animated.spring(modalEntrance, { toValue: 1, useNativeDriver: true, tension: 115, friction: 12 }).start();

    idleLoop.current?.stop();
    idleLoop.current = Animated.parallel([
      Animated.loop(
        Animated.sequence([
          Animated.timing(floatAnim, { toValue: -7, duration: 1700, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
          Animated.timing(floatAnim, { toValue: 2, duration: 1700, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        ]),
      ),
      Animated.loop(
        Animated.sequence([
          Animated.timing(rockAnim, { toValue: -5, duration: 1700, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
          Animated.timing(rockAnim, { toValue: 5, duration: 1700, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        ]),
      ),
    ]);
    idleLoop.current.start();
    return () => {
      idleLoop.current?.stop();
      orbHoverLoop.current?.stop();
    };
  }, [visible, isClassic, modalEntrance, floatAnim, rockAnim, scaleAnim, shakeAnim, lidLift, fadeReveal, orbRise, orbPulse]);

  const handleTap = () => {
    if (phase !== 'box') return;
    hapticTap();
    soundDirector.request('pm.reward.chest_open', {
      scope: 'boon-chest',
      dedupeKey: title,
    });
    setPhase('opening');
    idleLoop.current?.stop();
    floatAnim.setValue(0);
    rockAnim.setValue(0);

    // Награду начисляем сразу (в фоне на стороне хоста, идемпотентно).
    onClaim();

    let finalized = false;
    const finalize = () => {
      if (finalized) return;
      finalized = true;
      void hapticSuccess();
      setPhase('reveal');
      fadeReveal.setValue(0);
      orbRise.setValue(0);
      orbPulse.setValue(0);
      Animated.parallel([
        Animated.spring(fadeReveal, { toValue: 1, useNativeDriver: true, tension: 160, friction: 9 }),
        Animated.spring(orbRise, { toValue: 1, useNativeDriver: true, tension: 120, friction: 9 }),
      ]).start(() => {
        // зачем: после влёта — ТОЛЬКО пульсация масштаба на месте.
        // Никакого вертикального хода, иначе цикл читается как повтор появления.
        orbHoverLoop.current?.stop();
        orbHoverLoop.current = Animated.loop(
          Animated.sequence([
            Animated.timing(orbPulse, { toValue: 1, duration: 1250, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
            Animated.timing(orbPulse, { toValue: 0, duration: 1250, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
          ]),
        );
        orbHoverLoop.current.start();
      });
    };
    const safety = setTimeout(finalize, OPEN_SAFETY_MS);

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
      ]).start(() => {
        clearTimeout(safety);
        finalize();
      });
    });
  };

  const requestClose = () => {
    // Крестик/«Позже» в фазе сундука — честное «отложить», БЕЗ открытия.
    // Награда не теряется: PerfectWeek уже начислил приз до показа, а
    // MysteryMonday/Comeback покажут сундук снова при следующем запуске,
    // пока награда не забрана.
    if (phase === 'box') {
      onClose();
      return;
    }
    if (phase === 'opening') return; // идёт анимация — дождёмся reveal
    onClaim(); // страховка-идемпотент (claim не должен пропасть)
    onClose();
  };

  const laterLabel = triLang(lang, {
    ru: 'Позже', uk: 'Пізніше', es: 'Más tarde', 'pt-BR': 'Mais tarde',
    vi: 'Để sau', id: 'Nanti', tr: 'Daha sonra', pl: 'Później',
  });

  if (!visible) return null;

  if (motionVariant === 'hybrid') {
    return (
      <BoonChestHybrid
        visible={visible}
        rarity={toImpactRarity(rarity)}
        rewardIcon={rewardIcon}
        title={title}
        rewardLine={rewardLine}
        tapHint={tapHint}
        claimCta={claimCta}
        closeLabel={closeLabel}
        onClaim={onClaim}
        onClose={onClose}
      />
    );
  }

  const palette = paletteForRarity(rarity);
  const accent = palette.accent;

  const rock = rockAnim.interpolate({ inputRange: [-6, 6], outputRange: ['-6deg', '6deg'] });
  const modalScale = modalEntrance.interpolate({ inputRange: [0, 1], outputRange: [0.94, 1] });
  const modalY = modalEntrance.interpolate({ inputRange: [0, 1], outputRange: [18, 0] });
  const revealY = fadeReveal.interpolate({ inputRange: [0, 1], outputRange: [14, 0] });
  // Влёт: снизу вверх, 0.2 → 1. Дальше значение не меняется — иконка стоит на месте.
  const orbTranslateY = orbRise.interpolate({ inputRange: [0, 1], outputRange: [16, 0] });
  const orbEnterScale = orbRise.interpolate({ inputRange: [0, 1], outputRange: [0.2, 1] });
  // Пульсация: только масштаб, отдельным значением поверх влёта.
  const orbPulseScale = orbPulse.interpolate({ inputRange: [0, 1], outputRange: [1, 1.055] });

  const solidPanel = (t as { bgCard?: string; bgPrimary?: string }).bgCard
    ?? (t as { bgPrimary?: string }).bgPrimary ?? '#15181a';
  const textMuted = (t as { textMuted?: string }).textMuted ?? 'rgba(255,255,255,0.6)';

  return (
    <Modal visible transparent animationType="fade" statusBarTranslucent onRequestClose={requestClose}>
      <View style={styles.screen}>
        <Animated.View
          testID="boon-chest-card"
          style={[
            styles.card,
            {
              backgroundColor: solidPanel,
              borderColor: `${accent}55`,
              shadowColor: accent,
              transform: [{ scale: modalScale }, { translateY: modalY }],
            },
          ]}
        >
          <LinearGradient
            pointerEvents="none"
            colors={[palette.panelTop, palette.panelBottom]}
            start={{ x: 0.5, y: 0 }}
            end={{ x: 0.5, y: 1 }}
            style={[StyleSheet.absoluteFill, { opacity: 0.92 }]}
          />
          <View pointerEvents="none" style={[styles.topGlow, { backgroundColor: palette.accentSoft }]} />
          <RewardModalLiquidGlass themeMode={themeMode} accent={accent} intensity="strong" />

          {phase === 'box' && (
            <TouchableOpacity
              testID="boon-chest-close"
              accessibilityRole="button"
              accessibilityLabel={closeLabel}
              activeOpacity={0.76}
              onPress={requestClose}
              style={styles.closeX}
            >
              <Text style={styles.closeXText}>×</Text>
            </TouchableOpacity>
          )}

          <Text style={[styles.title, { color: accent }]}>{title}</Text>

          {phase !== 'reveal' ? (
            <>
              <TouchableOpacity
                testID="boon-chest-box-open"
                activeOpacity={0.85}
                onPress={handleTap}
                disabled={phase === 'opening'}
                style={{ alignItems: 'center' }}
              >
                <GiftBox3D
                  palette={palette}
                  size={STAGE_SIZE}
                  idle={phase === 'box'}
                  opening={phase === 'opening'}
                  floatY={floatAnim}
                  rock={rock}
                  scale={scaleAnim}
                  shakeX={shakeAnim}
                  lidLift={lidLift}
                />
                {phase === 'box' && <Text style={[styles.tapHint, { color: textMuted }]}>{tapHint}</Text>}
              </TouchableOpacity>
              {phase === 'box' && (
                <TouchableOpacity
                  testID="boon-chest-later"
                  accessibilityRole="button"
                  activeOpacity={0.7}
                  onPress={requestClose}
                  style={styles.laterBtn}
                >
                  <Text style={[styles.laterText, { color: textMuted }]}>{laterLabel}</Text>
                </TouchableOpacity>
              )}
            </>
          ) : (
            <Animated.View style={{ opacity: fadeReveal, alignItems: 'center', transform: [{ translateY: revealY }] }}>
              <View style={styles.orbStage}>
                <GiftOpenBurst key={`${rarity}-burst`} tier={animTierF2p(rarity)} size={STAGE_SIZE} />
                <Animated.View style={{ transform: [{ translateY: orbTranslateY }, { scale: orbEnterScale }, { scale: orbPulseScale }], zIndex: 2 }}>
                  <Image source={rewardIcon} resizeMode="contain" style={styles.orbIcon} />
                </Animated.View>
              </View>

              <Text style={styles.rewardText}>{rewardLine}</Text>

              <TouchableOpacity
                testID="boon-chest-cta"
                accessibilityRole="button"
                activeOpacity={0.85}
                onPress={requestClose}
                style={styles.claimBtn}
              >
                <LinearGradient
                  pointerEvents="none"
                  colors={palette.button}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={StyleSheet.absoluteFill}
                />
                <View pointerEvents="none" style={styles.claimBtnGloss} />
                <Text style={[styles.claimBtnText, { color: palette.buttonInk }]}>{claimCta}</Text>
              </TouchableOpacity>
              {/* зачем: «Позже» в фазе reveal вела на тот же requestClose, что и
                  «Продолжить» — награда уже начислена, откладывать нечего. Две
                  кнопки с одинаковым исходом только заставляли выбирать впустую.
                  В фазе закрытого сундука «Позже» остаётся: там это честное
                  «не открывать сейчас». */}
            </Animated.View>
          )}
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  card: {
    width: 326,
    borderRadius: 30,
    paddingTop: 24,
    paddingBottom: 22,
    paddingHorizontal: 22,
    alignItems: 'center',
    overflow: 'hidden',
    borderWidth: 0,
    shadowOpacity: 0.42,
    shadowRadius: 34,
    shadowOffset: { width: 0, height: 0 },
    ...noAndroidOutline,
  },
  topGlow: { position: 'absolute', top: 0, left: 0, right: 0, height: 80 },
  closeX: {
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
  },
  closeXText: { color: '#CFC8EE', fontSize: 22, lineHeight: 26, fontWeight: '800' },
  title: { fontSize: 21, fontWeight: '900', textAlign: 'center', marginBottom: 14 },
  tapHint: { fontSize: 13, marginTop: 8, textAlign: 'center', fontWeight: '600' },
  orbStage: {
    width: STAGE_SIZE,
    height: STAGE_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  orbIcon: { width: 108, height: 108 },
  rewardText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '900',
    textAlign: 'center',
    marginBottom: 18,
  },
  claimBtn: {
    alignSelf: 'stretch',
    height: 52,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  claimBtnGloss: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: '50%',
    backgroundColor: 'rgba(255,255,255,0.22)',
  },
  claimBtnText: { fontSize: 16, fontWeight: '900' },
  laterBtn: {
    alignSelf: 'stretch',
    marginTop: 12,
    paddingVertical: 8,
    alignItems: 'center',
  },
  laterText: { fontSize: 14, fontWeight: '700' },
});
