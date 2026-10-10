// ─── ГИБРИД «Световод + Чекан»: «друг принёс ключ» ──────────────────────────
// зачем: макет-эталон .motion-mockups/phraseman-hybrid.html, сцена M3
// «Сундук-награда» (celebration-семья) — блум → карточка выходит из света →
// ключ падает и БЬЁТ (squash + отдача карточки, закон №1 «удар только у героя
// кульминации») → кольца/пыль → каскад текста → CTA. Общий движок —
// useRewardImpactHybrid, герой — ключ в
// золотом медальоне вместо иконки бонуса. Подключается ТОЛЬКО через
// <ReferralFriendRewardModal motionVariant="hybrid">, боевой путь не тронут.
//
// зачем плотный бэкдроп: владелец (скриншот) — «где модал?? фон??» — на
// классике бэкдроп визуально терялся. Здесь фон — токен t.overlayScrim через
// общий backdropStyle хука (непрозрачность 0→1, не «прозрачный чёрный»).
import React, { memo } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import Animated from 'react-native-reanimated';
import { hapticTap } from '../../hooks/use-haptics';
import { useTheme } from '../ThemeContext';
import { liquidGlassTokens } from '../../constants/liquidGlassThemePalette';
import { useRewardImpactHybrid } from './use_reward_impact_hybrid';
import RewardImpactRings from './RewardImpactRings';

const EXEMPT_COLOR_1 = '#000000'; // theme-exempt: затемнение под окном/шторкой и тень — постоянные в любой теме

interface ReferralFriendRewardHybridProps {
  visible: boolean;
  title: string;
  subtitle: string;
  ctaLabel: string;
  onClose: () => void;
}

function ReferralFriendRewardHybrid({ visible, title, subtitle, ctaLabel, onClose }: ReferralFriendRewardHybridProps) {
  // зачем (overlays-more OM-REFERRAL-FRIEND-REWARD): движение гибрида владелец оставил (16.08),
  // а вид — кадр макета: окно r26/p21 в материале темы, сцена 202×160 с ключом, заголовок 25/31,
  // текст 16/22 (D145), кнопка 48/24. Свечение и кольца — нейтральным тоном темы, без цветного акцента.
  const { liquidGlassThemeId } = useTheme();
  const glass = liquidGlassTokens(liquidGlassThemeId);
  const impact = useRewardImpactHybrid({ visible, rarity: 'rare', scope: 'referral-friend-reward-hybrid' });

  const handleClose = () => { void hapticTap(); onClose(); };

  return (
    <Modal transparent visible={visible} animationType="none" onRequestClose={handleClose} statusBarTranslucent>
      <View style={styles.root}>
        <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, styles.scrim, impact.styles.backdrop]} />
        <Pressable style={StyleSheet.absoluteFill} accessibilityRole="button" accessibilityLabel={ctaLabel} onPress={handleClose} />

        <View style={styles.stage} pointerEvents="box-none">
          <Animated.View pointerEvents="none" style={[styles.bloom, { backgroundColor: glass.selected }, impact.styles.bloom]} />

          <Animated.View style={[styles.card, { backgroundColor: glass.opaqueSheet, shadowColor: EXEMPT_COLOR_1 }, impact.styles.card]} pointerEvents="box-none">
            <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} bounces={false} decelerationRate="fast">
            <View style={[styles.heroFrame, { backgroundColor: glass.selected }]}>
              <RewardImpactRings
                show={impact.showRings}
                dustCount={impact.dustCount}
                color={glass.text}
                ring0Style={impact.styles.ring0}
                ring1Style={impact.styles.ring1}
              />
              <Animated.View style={[styles.medallion, impact.styles.hero]}>
                <Ionicons name="key" size={48} color={glass.text} />
              </Animated.View>
            </View>

            <Animated.View style={impact.styles.text}>
              <Text accessibilityRole="header" style={[styles.title, { color: glass.text }]}>{title}</Text>
              <Text style={[styles.subtitle, { color: glass.secondary }]}>{subtitle}</Text>
            </Animated.View>

            <Animated.View style={[styles.ctaWrap, impact.styles.cta]}>
              <Pressable
                testID="referral-friend-reward-claim"
                accessibilityRole="button"
                accessibilityLabel={ctaLabel}
                onPress={handleClose}
                style={({ pressed }) => [styles.ctaBtn, { backgroundColor: glass.accent, opacity: pressed ? 0.88 : 1 }]}
              >
                <Text style={[styles.ctaText, { color: glass.accentInk }]}>{ctaLabel}</Text>
              </Pressable>
            </Animated.View>
            </ScrollView>
          </Animated.View>
        </View>
      </View>
    </Modal>
  );
}

export default memo(ReferralFriendRewardHybrid);

const styles = StyleSheet.create({
  root: { flex: 1 },
  scrim: { backgroundColor: 'rgba(0,0,0,0.68)' }, // theme-exempt: затемнение под окном/шторкой и тень — постоянные в любой теме
  stage: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 22, paddingVertical: 24 },
  scroll: { flexShrink: 1, minHeight: 0, width: '100%' },
  scrollContent: { alignItems: 'center' },
  bloom: {
    position: 'absolute',
    left: '-30%',
    right: '-30%',
    bottom: -240,
    height: 520,
    borderRadius: 300,
  },
  card: {
    maxHeight: '100%',
    width: '100%',
    maxWidth: 440,
    borderRadius: 26,
    padding: 21,
    alignItems: 'center',
    overflow: 'hidden',
    shadowOpacity: 0.38,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 12 },
  },
  // `.om-art`: сцена 202×160, радиус 22, 14 от верха.
  heroFrame: {
    width: 202,
    height: 160,
    marginTop: 14,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  medallion: {
    width: 72,
    height: 72,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: { marginTop: 7, fontSize: 25, lineHeight: 31, fontWeight: '800', textAlign: 'center' },
  subtitle: { marginTop: 9, fontSize: 16, lineHeight: 22, fontWeight: '400', textAlign: 'center' },
  ctaWrap: { alignSelf: 'stretch', marginTop: 18 },
  ctaBtn: { minHeight: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
  ctaText: { fontSize: 16, fontWeight: '700' },
});
