// ─── ГИБРИД «Световод + Чекан»: сундук-бонус (Понедельник тайны и т.п.) ─────
// зачем: макет-эталон .motion-mockups/phraseman-hybrid.html, сцена M3
// «Сундук-награда» — блум → карточка выходит из света → тап по сундуку →
// герой-награда падает и БЬЁТ (squash + отдача карточки) → кольца/пыль по
// редкости → каскад строк/CTA. Один движок с BoonActivatedHybrid/остальной
// celebration-семьёй — useRewardImpactHybrid (constants/motionHybrid LUM/CHK).
// Подключается ТОЛЬКО через <BoonChestModal motionVariant="hybrid">, боевой
// путь (classic) не тронут.
import React, { memo, useEffect, useRef, useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import type { ImageSourcePropType } from 'react-native';
import { Image } from 'expo-image';
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
import { useTheme } from '../ThemeContext';
import DuoPressable from '../DuoPressable';
import PressableHybrid from '../PressableHybrid';
import { paletteForRarity } from '../level_gift_box';
import { useRewardImpactHybrid, type RewardImpactRarity } from './use_reward_impact_hybrid';
import RewardImpactRings from './RewardImpactRings';

export interface BoonChestHybridProps {
  visible: boolean;
  rarity: RewardImpactRarity;
  rewardIcon: ImageSourcePropType;
  title: string;
  rewardLine: string;
  tapHint: string;
  claimCta: string;
  closeLabel: string;
  onClaim: () => void;
  onClose: () => void;
}

type Phase = 'box' | 'reveal';

function BoonChestHybrid({
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
}: BoonChestHybridProps) {
  const { theme: t, f } = useTheme();
  const [phase, setPhase] = useState<Phase>('box');
  const wasVisibleRef = useRef(false);
  const reduceMotion = useReduceMotion();
  const palette = paletteForRarity(rarity);

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
        withTiming(-7, { duration: 1700, easing: Easing.inOut(Easing.ease) }),
        withTiming(2, { duration: 1700, easing: Easing.inOut(Easing.ease) }),
      ),
      -1,
    );
    return () => cancelAnimation(idleFloat);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, phase, impactArmed, reduceMotion]);
  const idleFloatStyle = useAnimatedStyle(() => ({ transform: [{ translateY: idleFloat.value }] }));

  const impact = useRewardImpactHybrid({
    visible: visible && impactArmed,
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

  useEffect(() => {
    impact.setOnImpact(() => {
      onClaim();
      setPhase('reveal');
    });
  }, [impact, onClaim]);

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
    onClaim();
    onClose();
  };

  return (
    <Modal transparent visible={visible} animationType="none" onRequestClose={requestClose}>
      <View style={styles.root}>
        <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, styles.scrim, impact.styles.backdrop]} />
        <Pressable style={StyleSheet.absoluteFill} accessibilityRole="button" accessibilityLabel={closeLabel} onPress={requestClose} />

        <View style={styles.stage} pointerEvents="box-none">
          <Animated.View pointerEvents="none" style={[styles.bloom, { backgroundColor: `${t.accent}38` }, impact.styles.bloom]} />

          <Animated.View style={[styles.card, { backgroundColor: t.bgCard, shadowColor: t.accent }, impact.styles.card]} pointerEvents="box-none">
            {phase === 'box' && (
              <PressableHybrid
                testID="boon-chest-hybrid-close"
                accessibilityLabel={closeLabel}
                onPress={requestClose}
                variant="icon"
                style={styles.closeX}
              >
                <Text style={[styles.closeXText, { color: t.textPrimary }]}>×</Text>
              </PressableHybrid>
            )}

            <Text style={[styles.title, { color: t.accent }]}>{title}</Text>

            <View style={styles.heroFrame}>
              <RewardImpactRings
                show={impact.showRings}
                dustCount={impact.dustCount}
                color={t.accent}
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
                  {/* зачем: до удара сундук — та же иконка награды в приглушённом виде; удар колец «открывает» её */}
                  <Image source={rewardIcon} contentFit="contain" style={[styles.heroImage, styles.heroClosed]} accessible={false} />
                </Pressable>
              ) : (
                <Animated.View style={impact.styles.hero}>
                  {/* guard-ok: декоративная иконка награды — rewardLine ниже уже
                      называет награду словами, дублировать accessibilityLabel незачем. */}
                  <Image source={rewardIcon} contentFit="contain" style={styles.heroImage} accessible={false} />
                </Animated.View>
              )}
            </View>

            {phase === 'box' && !impactArmed && (
              <Text style={[styles.hint, { color: t.textMuted }]}>{tapHint}</Text>
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
                  style={[styles.ctaBtn, { backgroundColor: t.accent }]}
                >
                  <Text style={[styles.ctaText, { color: t.correctText }]}>{claimCta}</Text>
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
    width: 32,
    height: 32,
    borderRadius: 16,
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
  heroImage: { width: 118, height: 118 },
  heroClosed: { opacity: 0.72, transform: [{ scale: 0.94 }] },
  hint: { fontSize: 13, marginTop: 8, textAlign: 'center', fontWeight: '400' },
  rewardText: { fontWeight: '700', textAlign: 'center', marginBottom: 18 },
  ctaWrap: { alignSelf: 'stretch' },
  ctaBtn: { height: 52, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  ctaText: { fontWeight: '700', fontSize: 16 },
});
