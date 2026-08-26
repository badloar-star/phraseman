// ─── ГИБРИД «Световод + Чекан»: сундук-бонус (Понедельник тайны и т.п.) ─────
// зачем: макет-эталон .motion-mockups/phraseman-hybrid.html, сцена M3
// «Сундук-награда» — блум → карточка выходит из света → тап по сундуку →
// герой-награда падает и БЬЁТ (squash + отдача карточки) → кольца/пыль по
// редкости → каскад строк/CTA. Один движок с BoonActivatedHybrid/остальной
// celebration-семьёй — useRewardImpactHybrid (constants/motionHybrid LUM/CHK).
// После приёмки DEV Hub это production-default родительского BoonChestModal;
// classic оставлен для QA/rollback.
import React, { memo, useEffect, useRef, useState } from 'react';
import { Animated as RNAnimated, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, {
  Easing,
  cancelAnimation,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { hapticTap } from '../../hooks/use-haptics';
import { useReduceMotion } from '../../hooks/use_reduce_motion';
import { SUITE } from '../../constants/motionHybrid';
import { useTheme } from '../ThemeContext';
import DuoPressable from '../DuoPressable';
import PressableHybrid from '../PressableHybrid';
import { GiftBox3D, type RegisterPalette } from '../level_gift_box';
import { useRewardImpactHybrid, type RewardImpactRarity } from './use_reward_impact_hybrid';
import RewardImpactRings from './RewardImpactRings';
import RetiredRasterFallback from '../feedback/RetiredRasterFallback';
import SpinTicketArt from '../SpinTicketArt';
import { rewardModalAccentColor, rewardModalPrimaryButtonColors, rewardModalPrimaryButtonText } from '../RewardModalBackdrop';

export interface BoonChestHybridProps {
  visible: boolean;
  rarity: RewardImpactRarity;
  palette: RegisterPalette;
  title: string;
  rewardLine: string;
  /** Картинка награды: спин рисуется своим узнаваемым значком, не коробкой. */
  rewardArt?: 'gift' | 'spin';
  tapHint: string;
  claimCta: string;
  closeLabel: string;
  laterLabel: string;
  onClaim: () => void;
  onClose: () => void;
}

type Phase = 'box' | 'reveal';

function BoonChestHybrid({
  visible,
  rarity,
  palette,
  title,
  rewardLine,
  rewardArt = 'gift',
  tapHint,
  claimCta,
  closeLabel,
  laterLabel,
  onClaim,
  onClose,
}: BoonChestHybridProps) {
  const { theme: t, f, themeMode } = useTheme();
  // зачем: владелец 2026-08-23 — заголовок/кнопка сундука-награды красились в
  // жёсткий цвет РЕДКОСТИ (palette.accent: голубой/фиолетовый/золотой), не
  // связанный с активной темой приложения — модалка «не слушалась» темы.
  // modalAccent = тот же хелпер, что уже красит LevelGiftModal по теме;
  // palette (редкость) остаётся только на самом сундуке/эффектах открытия.
  const modalAccent = rewardModalAccentColor(themeMode, t);
  const primaryButtonColors = rewardModalPrimaryButtonColors(themeMode);
  const primaryButtonText = rewardModalPrimaryButtonText(themeMode);
  const [phase, setPhase] = useState<Phase>('box');
  const wasVisibleRef = useRef(false);
  const reduceMotion = useReduceMotion();
  const closedFloat = useRef(new RNAnimated.Value(0)).current;
  const closedRockValue = useRef(new RNAnimated.Value(0)).current;
  const closedScale = useRef(new RNAnimated.Value(1)).current;
  const closedShake = useRef(new RNAnimated.Value(0)).current;
  const closedLid = useRef(new RNAnimated.Value(0)).current;
  const closedRock = closedRockValue.interpolate({ inputRange: [-1, 1], outputRange: ['0deg', '0deg'] });

  // зачем: лёгкое парение закрытого сундука (закон Световода — без отскока,
  // просто мягкий вертикальный дрейф), ЖИВЁТ отдельно от useRewardImpactHybrid
  // (тот управляет только фазой удара) и гасится сразу после тапа.
  const idleFloat = useSharedValue(0);
  // зачем: удар героя (открытие сундука) наступает только после тапа —
  // видимость самого движка запускаем сразу (карточка входит из света),
  // а фазу удара держим на отдельном булевом входе impactArmed.
  const [impactArmed, setImpactArmed] = useState(false);
  useEffect(() => {
    if (!visible || phase !== 'box' || impactArmed || reduceMotion) {
      cancelAnimation(idleFloat);
      idleFloat.value = 0;
      return;
    }
    idleFloat.value = withRepeat(
      withSequence(
        withTiming(SUITE.idleFloatMinPx, { duration: SUITE.idleFloatMs, easing: Easing.inOut(Easing.ease) }),
        withTiming(SUITE.idleFloatMaxPx, { duration: SUITE.idleFloatMs, easing: Easing.inOut(Easing.ease) }),
      ),
      -1,
    );
    return () => cancelAnimation(idleFloat);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, phase, impactArmed, reduceMotion]);
  const idleFloatStyle = useAnimatedStyle(() => ({ transform: [{ translateY: idleFloat.value }] }));

  // зачем: карточка входит из света сразу (visible), удар героя — только по тапу (armed).
  // Раньше visible гейтился impactArmed — до тапа всё было с opacity 0: «гибрид не запускается».
  const impact = useRewardImpactHybrid({
    visible,
    armed: impactArmed,
    rarity,
    scope: 'boon-chest-hybrid',
  });

  useEffect(() => {
    if (!visible) {
      wasVisibleRef.current = false;
      return;
    }
    if (wasVisibleRef.current) return;
    wasVisibleRef.current = true;
    setPhase('box');
    setImpactArmed(false);
  }, [visible]);

  // Регистрируем синхронно с рендером: при Reduce Motion armed-эффект может
  // завершиться в первый же проход после тапа и не должен обогнать useEffect.
  impact.setOnImpact(() => {
    onClaim();
    setPhase('reveal');
  });

  const handleTap = () => {
    if (phase !== 'box' || impactArmed) return;
    void hapticTap();
    setImpactArmed(true);
  };

  const requestClose = () => {
    // Крестик/«Позже» до тапа по сундуку — честное «отложить», без открытия.
    if (phase === 'box' && !impactArmed) {
      onClose();
      return;
    }
    // После удара награда уже выдана через onImpact. CTA только закрывает
    // модалку; повторный onClaim здесь создавал второй grant на один показ.
    if (phase !== 'reveal') return;
    onClose();
  };

  return (
    <Modal transparent visible={visible} animationType="none" onRequestClose={requestClose}>
      <View style={styles.root}>
        <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, styles.scrim, impact.styles.backdrop]} />
        <Pressable style={StyleSheet.absoluteFill} accessibilityRole="button" accessibilityLabel={closeLabel} onPress={requestClose} />

        <View style={styles.stage} pointerEvents="box-none">
          <Animated.View pointerEvents="none" style={[styles.bloom, { backgroundColor: `${modalAccent}38` }, impact.styles.bloom]} />

          <Animated.View style={[styles.card, { backgroundColor: t.bgCard, shadowColor: modalAccent }, impact.styles.card]} pointerEvents="box-none">
            {phase === 'box' && (
              <PressableHybrid
                testID="boon-chest-hybrid-close"
                accessibilityLabel={closeLabel}
                onPress={requestClose}
                variant="icon"
                style={styles.closeX}
                contentStyle={{ alignItems: 'center', justifyContent: 'center' }}
              >
                <Text style={[styles.closeXText, { color: t.textPrimary }]}>×</Text>
              </PressableHybrid>
            )}

            <Text style={[styles.title, { color: modalAccent }]}>{title}</Text>

            <View style={styles.heroFrame}>
              <RewardImpactRings
                show={impact.showRings}
                dustCount={impact.dustCount}
                color={palette.accent}
                ring0Style={impact.styles.ring0}
                ring1Style={impact.styles.ring1}
              />
              {phase === 'box' ? (
                <Pressable
                  testID="boon-chest-hybrid-open"
                  accessibilityRole="button"
                  onPress={handleTap}
                  disabled={impactArmed}
                  style={styles.chestTap}
                >
                  <Animated.View style={idleFloatStyle}>
                    <GiftBox3D
                      palette={palette}
                      size={150}
                      idle={false}
                      opening={false}
                      floatY={closedFloat}
                      rock={closedRock}
                      scale={closedScale}
                      shakeX={closedShake}
                      lidLift={closedLid}
                    />
                  </Animated.View>
                </Pressable>
              ) : (
                <Animated.View style={impact.styles.hero}>
                  {/* guard-ok: декоративная иконка награды — rewardLine ниже уже
                      называет награду словами, дублировать accessibilityLabel незачем. */}
                  {rewardArt === 'spin'
                    ? <SpinTicketArt size={118} accessibilityLabel="" />
                    : <RetiredRasterFallback kind="gift" size={118} color={palette.accent} />}
                </Animated.View>
              )}
            </View>

            {phase === 'box' && !impactArmed && (
              <>
                <Text style={[styles.hint, { color: t.textMuted }]}>{tapHint}</Text>
                <PressableHybrid
                  testID="boon-chest-hybrid-later"
                  accessibilityLabel={laterLabel}
                  onPress={requestClose}
                  style={styles.laterButton}
                  contentStyle={{ alignItems: 'center', justifyContent: 'center' }}
                >
                  <Text style={[styles.laterText, { color: t.textMuted }]}>{laterLabel}</Text>
                </PressableHybrid>
              </>
            )}

            {phase === 'reveal' && (
              <Animated.View style={impact.styles.text}>
                <Text style={[styles.rewardText, { color: t.textPrimary, fontSize: f.h2 }]}>{rewardLine}</Text>
              </Animated.View>
            )}

            {phase === 'reveal' && (
              <Animated.View style={[styles.ctaWrap, impact.styles.cta]}>
                <DuoPressable
                  testID="boon-chest-hybrid-cta"
                  onPress={requestClose}
                  edgeColor={t.bgSurface2}
                  edgeHeight={4}
                  gradientColors={primaryButtonColors}
                  style={styles.ctaBtn}
                >
                  <Text style={[styles.ctaText, { color: primaryButtonText }]}>{claimCta}</Text>
                </DuoPressable>
              </Animated.View>
            )}
          </Animated.View>
        </View>
      </View>
    </Modal>
  );
}

export default memo(BoonChestHybrid);

const styles = StyleSheet.create({
  root: { flex: 1 },
  scrim: { backgroundColor: 'rgba(0,0,0,0.6)' },
  stage: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24 },
  bloom: {
    position: 'absolute',
    left: '-30%',
    right: '-30%',
    bottom: -240,
    height: 520,
    borderRadius: 300,
  },
  card: {
    width: '100%',
    maxWidth: 360,
    borderRadius: 24,
    paddingHorizontal: 22,
    paddingTop: 24,
    paddingBottom: 22,
    alignItems: 'center',
    overflow: 'hidden',
    // guard-ok: тот же радиус тени, что и в классике BoonChestModal.tsx —
    // единый язык celebration-карточек, не отдельная новая дорогая тень.
    shadowOpacity: 0.4,
    shadowRadius: 30,
    shadowOffset: { width: 0, height: 0 },
  },
  closeX: {
    position: 'absolute',
    top: 12,
    right: 12,
    zIndex: 5,
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(3,5,10,0.42)',
  },
  closeXText: { fontSize: 22, lineHeight: 26, fontWeight: '700' },
  title: { fontSize: 21, fontWeight: '700', textAlign: 'center', marginBottom: 14 },
  heroFrame: {
    width: 150,
    height: 150,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  chestTap: { alignItems: 'center', justifyContent: 'center' },
  hint: { fontSize: 13, marginTop: 8, textAlign: 'center', fontWeight: '400' },
  laterButton: { minHeight: 44, paddingHorizontal: 18, alignItems: 'center', justifyContent: 'center' },
  laterText: { fontSize: 14, fontWeight: '700' },
  rewardText: { fontWeight: '700', textAlign: 'center', marginBottom: 18 },
  ctaWrap: { alignSelf: 'stretch' },
  ctaBtn: { height: 52, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  ctaText: { fontWeight: '700', fontSize: 16 },
});
