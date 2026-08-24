// ─── ГИБРИД «Световод + Чекан»: «бонус дня активирован» ─────────────────────
// зачем: макет-эталон .motion-mockups/phraseman-hybrid.html, сцена M3
// «Сундук-награда» — блум → карточка выходит из света → иконка бонуса падает
// и БЬЁТ (squash + отдача карточки) → кольца/пыль (rare-сила по умолчанию,
// у бонуса нет редкости героя) → каскад текста → CTA. После приёмки DEV Hub
// это production-default родительского BoonActivatedModal; classic оставлен для rollback.
import React, { memo } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import Animated from 'react-native-reanimated';
import { hapticTap } from '../../hooks/use-haptics';
import { useTheme } from '../ThemeContext';
import RetiredRasterFallback from '../feedback/RetiredRasterFallback';
import DuoPressable from '../DuoPressable';
import { useRewardImpactHybrid } from './use_reward_impact_hybrid';
import RewardImpactRings from './RewardImpactRings';

interface BoonActivatedHybridProps {
  visible: boolean;
  kicker: string;
  title: string;
  subtitle: string;
  ctaLabel: string;
  onClose: () => void;
}

function BoonActivatedHybrid({ visible, kicker, title, subtitle, ctaLabel, onClose }: BoonActivatedHybridProps) {
  const { theme: t, f } = useTheme();
  const impact = useRewardImpactHybrid({ visible, rarity: 'rare', scope: 'boon-activated-hybrid' });

  const handleClose = () => { void hapticTap(); onClose(); };

  return (
    <Modal transparent visible={visible} animationType="none" onRequestClose={handleClose}>
      <View style={styles.root}>
        <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, styles.scrim, impact.styles.backdrop]} />
        <Pressable style={StyleSheet.absoluteFill} accessibilityRole="button" accessibilityLabel={title} onPress={handleClose} />

        <View style={styles.stage} pointerEvents="box-none">
          <Animated.View pointerEvents="none" style={[styles.bloom, impact.styles.bloom]} />

          <Animated.View style={[styles.card, { backgroundColor: t.bgCard, shadowColor: t.accent }, impact.styles.card]} pointerEvents="box-none">
            <View style={styles.heroFrame}>
              <RewardImpactRings
                show={impact.showRings}
                dustCount={impact.dustCount}
                color={t.accent}
                ring0Style={impact.styles.ring0}
                ring1Style={impact.styles.ring1}
              />
              <Animated.View style={impact.styles.hero}>
                {/* guard-ok: декоративная иконка бонуса — заголовок карточки ниже уже
                    называет бонус словами, дублировать accessibilityLabel незачем. */}
                <RetiredRasterFallback kind="boon" size={104} color={t.accent} />
              </Animated.View>
            </View>

            <Animated.View style={impact.styles.text}>
              <Text style={[styles.kicker, { color: t.accent }]}>{kicker}</Text>
              <Text style={[styles.title, { color: t.textPrimary, fontSize: f.h2 }]}>{title}</Text>
              <Text style={[styles.subtitle, { color: t.textSecond, fontSize: f.body }]}>{subtitle}</Text>
            </Animated.View>

            <Animated.View style={[styles.ctaWrap, impact.styles.cta]}>
              <DuoPressable
                onPress={handleClose}
                edgeColor={t.bgSurface2}
                edgeHeight={4}
                style={[styles.ctaBtn, { backgroundColor: t.accent }]}
              >
                <Text style={[styles.ctaText, { color: t.correctText }]}>{ctaLabel}</Text>
              </DuoPressable>
            </Animated.View>
          </Animated.View>
        </View>
      </View>
    </Modal>
  );
}

export default memo(BoonActivatedHybrid);

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
    backgroundColor: 'rgba(233,201,99,0.22)',
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
    // guard-ok: тот же радиус тени, что и в шипнутом LeagueChestSlitOpen.tsx/
    // BoonActivatedModal.tsx классике — единый язык celebration-карточек,
    // не отдельная новая дорогая тень.
    shadowOpacity: 0.4,
    shadowRadius: 30,
    shadowOffset: { width: 0, height: 0 },
  },
  heroFrame: {
    width: 104,
    height: 104,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  heroImage: { width: 104, height: 104 },
  kicker: { fontSize: 12, fontWeight: '700', letterSpacing: 0.8, textTransform: 'uppercase', textAlign: 'center', marginBottom: 6 },
  title: { fontWeight: '700', textAlign: 'center', marginBottom: 8 },
  subtitle: { fontWeight: '400', lineHeight: 22, textAlign: 'center', marginBottom: 20 },
  ctaWrap: { alignSelf: 'stretch' },
  ctaBtn: { height: 52, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  ctaText: { fontWeight: '700', fontSize: 16 },
});
