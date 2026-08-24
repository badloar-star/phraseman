/**
 * Production bottom sheet for the informational «Бонус дня» reveal.
 * The boon is already active before this surface mounts; closing only releases
 * overlay ownership and never mutates a reward entitlement.
 */
import React, { memo } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import Animated from 'react-native-reanimated';
import { triLang } from '../constants/i18n';
import { getBoonCopy } from '../app/boons/boon_copy';
import { getBoonActiveStatusText } from '../app/boons/boon_active_status_copy';
import type { BoonId } from '../app/boons/boon_types';
import { buttonForegroundForBackground, readableOn } from '../constants/color_contrast';
import { useLang } from './LangContext';
import HybridSheetShell from './modal_fx/HybridSheetShell';
import PressableHybrid from './PressableHybrid';
import { useTheme } from './ThemeContext';
import RewardImpactRings from './celebration/RewardImpactRings';
import { useRewardImpactHybrid } from './celebration/use_reward_impact_hybrid';
import RetiredRasterFallback from './feedback/RetiredRasterFallback';

interface BoonActivatedSheetProps {
  visible: boolean;
  boon: BoonId;
  onClose: () => void;
}

function BoonActivatedSheet({ visible, boon, onClose }: BoonActivatedSheetProps) {
  const { theme: t, f } = useTheme();
  const { lang } = useLang();
  const copy = getBoonCopy(boon, lang);
  const activeStatusLabel = getBoonActiveStatusText(boon, lang);
  const ctaForeground = buttonForegroundForBackground(t.accent);
  const statusColor = readableOn(t.accent, t.bgCard, 4.5);
  const impact = useRewardImpactHybrid({
    visible,
    rarity: 'rare',
    scope: `boon-activated-sheet:${boon}`,
  });

  const ctaLabel = triLang(lang, {
    ru: 'Отлично',
    uk: 'Чудово',
    es: 'Genial',
    'pt-BR': 'Ótimo',
    vi: 'Tuyệt',
    id: 'Mantap',
    tr: 'Harika',
    pl: 'Świetnie',
  });
  const closeLabel = triLang(lang, {
    ru: 'Закрыть бонус дня',
    uk: 'Закрити бонус дня',
    es: 'Cerrar el bonus del día',
    'pt-BR': 'Fechar o bônus do dia',
    vi: 'Đóng phần thưởng hôm nay',
    id: 'Tutup bonus hari ini',
    tr: 'Günün bonusunu kapat',
    pl: 'Zamknij bonus dnia',
  });

  return (
    <HybridSheetShell
      visible={visible}
      onClose={onClose}
      closeLabel={closeLabel}
      backdropAccessible={false}
      glowColor={t.accent}
      testID="boon-activated-sheet"
    >
      {({ requestDismiss }) => (
        <>
          <ScrollView
            style={styles.scroll}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
            nestedScrollEnabled
          >
            <View style={styles.heroFrame}>
              <RewardImpactRings
                show={impact.showRings && !impact.reduceMotion}
                dustCount={0}
                ringCount={1}
                color={t.accent}
                ring0Style={impact.styles.ring0}
                ring1Style={impact.styles.ring1}
              />
              <Animated.View style={impact.styles.hero}>
                <RetiredRasterFallback kind="boon" size={104} color={t.accent} />
              </Animated.View>
            </View>

            <Animated.View style={impact.styles.text}>
              <Text
                accessibilityRole="header"
                maxFontSizeMultiplier={2}
                style={[
                  styles.title,
                  { color: t.textPrimary, fontSize: f.h1, lineHeight: Math.round(f.h1 * 1.15) },
                ]}
              >
                {copy.title}
              </Text>
            </Animated.View>
            <Animated.View style={impact.styles.subtitle}>
              <Text
                maxFontSizeMultiplier={2}
                style={[
                  styles.subtitle,
                  { color: t.textSecond, fontSize: f.body, lineHeight: Math.round(f.body * 1.4) },
                ]}
              >
                {copy.subtitle}
              </Text>
            </Animated.View>

            <Animated.View style={[styles.statusRow, impact.styles.rows]}>
              <View accessible={false} style={[styles.statusDot, { backgroundColor: statusColor }]} />
              <Text maxFontSizeMultiplier={2} style={[styles.statusText, { color: statusColor }]}>
                {activeStatusLabel}
              </Text>
            </Animated.View>
          </ScrollView>

          <Animated.View style={[styles.ctaWrap, impact.styles.cta]}>
            <PressableHybrid
              accessibilityLabel={ctaLabel}
              accessibilityHint={closeLabel}
              variant="primary"
              onPress={requestDismiss}
              contentStyle={[styles.cta, { backgroundColor: t.accent }]}
            >
              <Text maxFontSizeMultiplier={2} style={[styles.ctaText, { color: ctaForeground }]}>
                {ctaLabel}
              </Text>
            </PressableHybrid>
          </Animated.View>
        </>
      )}
    </HybridSheetShell>
  );
}

export default memo(BoonActivatedSheet);

const styles = StyleSheet.create({
  scroll: {
    flexShrink: 1,
  },
  scrollContent: {
    paddingBottom: 8,
  },
  heroFrame: {
    height: 132,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroImage: {
    width: 104,
    height: 104,
  },
  title: {
    fontWeight: '700',
    letterSpacing: -0.3,
    textAlign: 'center',
  },
  subtitle: {
    marginTop: 8,
    fontWeight: '400',
    textAlign: 'center',
  },
  statusRow: {
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 10,
  },
  statusDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },
  statusText: {
    fontSize: 13,
    fontWeight: '700',
  },
  cta: {
    minHeight: 52,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ctaWrap: {
    flexShrink: 0,
    marginTop: 8,
  },
  ctaText: {
    fontSize: 16,
    fontWeight: '700',
  },
});
