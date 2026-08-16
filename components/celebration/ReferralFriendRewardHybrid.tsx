// ─── ГИБРИД «Световод + Чекан»: «друг принёс ключ» ──────────────────────────
// зачем: макет-эталон .motion-mockups/phraseman-hybrid.html, сцена M3
// «Сундук-награда» (celebration-семья) — блум → карточка выходит из света →
// ключ падает и БЬЁТ (squash + отдача карточки, закон №1 «удар только у героя
// кульминации») → кольца/пыль → каскад текста → CTA. Общий движок —
// useRewardImpactHybrid (тот же, что и BoonActivatedHybrid), герой — ключ в
// золотом медальоне вместо иконки бонуса. Подключается ТОЛЬКО через
// <ReferralFriendRewardModal motionVariant="hybrid">, боевой путь не тронут.
//
// зачем плотный бэкдроп: владелец (скриншот) — «где модал?? фон??» — на
// классике бэкдроп визуально терялся. Здесь фон — токен t.overlayScrim через
// общий backdropStyle хука (непрозрачность 0→1, не «прозрачный чёрный»).
import React, { memo } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import Animated from 'react-native-reanimated';
import { hapticTap } from '../../hooks/use-haptics';
import { useTheme } from '../ThemeContext';
import DuoPressable from '../DuoPressable';
import { useRewardImpactHybrid } from './use_reward_impact_hybrid';
import RewardImpactRings from './RewardImpactRings';

interface ReferralFriendRewardHybridProps {
  visible: boolean;
  title: string;
  subtitle: string;
  ctaLabel: string;
  onClose: () => void;
}

function ReferralFriendRewardHybrid({ visible, title, subtitle, ctaLabel, onClose }: ReferralFriendRewardHybridProps) {
  const { theme: t, f } = useTheme();
  const impact = useRewardImpactHybrid({ visible, rarity: 'rare', scope: 'referral-friend-reward-hybrid' });

  const handleClose = () => { void hapticTap(); onClose(); };

  return (
    <Modal transparent visible={visible} animationType="none" onRequestClose={handleClose} statusBarTranslucent>
      <View style={styles.root}>
        <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, styles.scrim, impact.styles.backdrop]} />
        <Pressable style={StyleSheet.absoluteFill} accessibilityRole="button" accessibilityLabel={ctaLabel} onPress={handleClose} />

        <View style={styles.stage} pointerEvents="box-none">
          <Animated.View pointerEvents="none" style={[styles.bloom, { backgroundColor: `${t.accent}38` }, impact.styles.bloom]} />

          <Animated.View style={[styles.card, { backgroundColor: t.bgCard, shadowColor: t.accent }, impact.styles.card]} pointerEvents="box-none">
            <View style={styles.heroFrame}>
              <RewardImpactRings
                show={impact.showRings}
                dustCount={impact.dustCount}
                color={t.accent}
                ring0Style={impact.styles.ring0}
                ring1Style={impact.styles.ring1}
              />
              <Animated.View style={[styles.medallion, { backgroundColor: t.accentBg }, impact.styles.hero]}>
                <Ionicons name="key" size={32} color={t.accent} />
              </Animated.View>
            </View>

            <Animated.View style={impact.styles.text}>
              <Text style={[styles.title, { color: t.textPrimary, fontSize: f.h2 }]}>{title}</Text>
              <Text style={[styles.subtitle, { color: t.textMuted, fontSize: f.sub }]}>{subtitle}</Text>
            </Animated.View>

            <Animated.View style={[styles.ctaWrap, impact.styles.cta]}>
              <DuoPressable
                accessibilityLabel={ctaLabel}
                onPress={handleClose}
                edgeColor={t.bgSurface2}
                edgeHeight={4}
                style={[styles.ctaBtn, { backgroundColor: t.accent }]}
              >
                <Text style={[styles.ctaText, { color: t.correctText, fontSize: f.bodyLg }]}>{ctaLabel}</Text>
              </DuoPressable>
            </Animated.View>
          </Animated.View>
        </View>
      </View>
    </Modal>
  );
}

export default memo(ReferralFriendRewardHybrid);

const styles = StyleSheet.create({
  root: { flex: 1 },
  scrim: { backgroundColor: 'rgba(0,0,0,0.68)' },
  stage: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32 },
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
    paddingTop: 26,
    paddingBottom: 22,
    alignItems: 'center',
    overflow: 'hidden',
    shadowOpacity: 0.4,
    shadowRadius: 30,
    shadowOffset: { width: 0, height: 0 },
  },
  heroFrame: {
    width: 104,
    height: 104,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  medallion: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: { fontWeight: '700', textAlign: 'center', marginBottom: 8 },
  subtitle: { fontWeight: '400', lineHeight: 20, textAlign: 'center', marginBottom: 20 },
  ctaWrap: { alignSelf: 'stretch' },
  ctaBtn: { height: 52, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  ctaText: { fontWeight: '700' },
});
