import Ionicons from '@expo/vector-icons/Ionicons';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useCallback, useEffect, useRef } from 'react';
import {
  Modal,
  Pressable,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import Animated, {
  cancelAnimation,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import type { SoftUpsellOpportunity } from '../app/soft_upsell_core';
import TonalSurface from './TonalSurface';
import { useTheme } from './ThemeContext';

type Props = {
  visible?: boolean;
  presentation?: 'inline' | 'modal';
  proof?: string;
  title: string;
  body: string;
  ctaLabel: string;
  dismissLabel?: string;
  dismissAccessibilityLabel: string;
  dismissAccessibilityHint: string;
  ctaAccessibilityLabel: string;
  ctaAccessibilityHint: string;
  opportunity: SoftUpsellOpportunity;
  onImpression: () => void | Promise<void>;
  onDismiss: () => void | Promise<void>;
  onCta: () => void | boolean | Promise<void | boolean>;
};

const GOLD = '#E8C56A';
const GOLD_BORDER = 'rgba(232,197,106,0.52)';
const MODAL_SURFACE = '#11100F';
const MODAL_TEXT = '#FFF8E8';
const MODAL_MUTED = '#C9C0AE';

function iconFor(trigger: SoftUpsellOpportunity['trigger']): React.ComponentProps<typeof Ionicons>['name'] {
  switch (trigger) {
    case 'first_lesson': return 'map-outline';
    case 'free_lessons_complete': return 'school-outline';
    case 'weekly_review': return 'analytics-outline';
    case 'second_ai_dialogue': return 'chatbubbles-outline';
    case 'streak_milestone': return 'flame-outline';
    case 'repeated_training': return 'repeat-outline';
  }
}

export default function SoftContextualUpsellCard({
  visible = true,
  presentation = 'inline',
  proof,
  title,
  body,
  ctaLabel,
  dismissLabel = 'Не сейчас',
  dismissAccessibilityLabel,
  dismissAccessibilityHint,
  ctaAccessibilityLabel,
  ctaAccessibilityHint,
  opportunity,
  onImpression,
  onDismiss,
  onCta,
}: Props) {
  const { theme: t, f } = useTheme();
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const isTablet = width >= 700;
  const reduceMotion = useReducedMotion();
  const entrance = useSharedValue(0);
  const shimmer = useSharedValue(0);
  const reportedRef = useRef(false);
  const impressionInFlightRef = useRef<Promise<void> | null>(null);
  const actionTakenRef = useRef(false);

  useEffect(() => {
    if (!visible || presentation !== 'modal') {
      actionTakenRef.current = false;
      entrance.value = presentation === 'inline' ? 1 : 0;
      shimmer.value = 0;
      return;
    }
    entrance.value = withTiming(1, { duration: reduceMotion ? 0 : 250 });
    shimmer.value = reduceMotion ? 1 : withDelay(220, withTiming(1, { duration: 760 }));
    return () => {
      cancelAnimation(entrance);
      cancelAnimation(shimmer);
    };
  }, [entrance, presentation, reduceMotion, shimmer, visible]);

  const modalSurfaceMotion = useAnimatedStyle(() => ({
    opacity: entrance.value,
    transform: [{ translateY: (1 - entrance.value) * 24 }],
  }));
  const shimmerMotion = useAnimatedStyle(() => ({
    opacity: shimmer.value < 0.02 || shimmer.value > 0.98 ? 0 : 0.34,
    transform: [{ translateX: -220 + shimmer.value * 680 }, { rotate: '-18deg' }],
  }));

  const handleLayout = useCallback((event: { nativeEvent: { layout: { width: number; height: number } } }) => {
    const { width: layoutWidth, height } = event.nativeEvent.layout;
    if (reportedRef.current || impressionInFlightRef.current || layoutWidth <= 0 || height <= 0) return;
    const operation = Promise.resolve(onImpression())
      .then(() => { reportedRef.current = true; })
      .catch(() => undefined)
      .finally(() => { impressionInFlightRef.current = null; });
    impressionInFlightRef.current = operation;
  }, [onImpression]);

  const handleDismiss = useCallback(() => {
    if (actionTakenRef.current) return;
    actionTakenRef.current = true;
    void Promise.resolve(onDismiss()).catch(() => { actionTakenRef.current = false; });
  }, [onDismiss]);

  const handleCta = useCallback(() => {
    if (actionTakenRef.current) return;
    actionTakenRef.current = true;
    void Promise.resolve(onCta())
      .then((accepted) => { if (accepted === false) actionTakenRef.current = false; })
      .catch(() => { actionTakenRef.current = false; });
  }, [onCta]);

  if (!visible) return null;

  if (presentation === 'inline') {
    return (
      <TonalSurface
        testID="soft-upsell-card"
        accessibilityLabel={`${title}. ${body}`}
        onLayout={handleLayout}
        radius={16}
        style={styles.inlineCard}
      >
        <View style={styles.inlineHeadingRow}>
          <Ionicons name="sparkles-outline" size={22} color={t.textPrimary} />
          <Text style={[styles.inlineTitle, { color: t.textPrimary, fontSize: f.body }]}>{title}</Text>
        </View>
        <Text style={[styles.inlineBody, { color: t.textMuted, fontSize: f.caption }]}>{body}</Text>
        <View style={styles.inlineActions}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={dismissAccessibilityLabel}
            accessibilityHint={dismissAccessibilityHint}
            onPress={() => { void onDismiss(); }}
            style={styles.inlineDismiss}
          >
            <Ionicons name="close" size={22} color={t.textMuted} />
            <Text style={[styles.inlineActionText, { color: t.textMuted, fontSize: f.label }]}>{dismissLabel}</Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={ctaAccessibilityLabel}
            accessibilityHint={ctaAccessibilityHint}
            onPress={() => { void onCta(); }}
            style={({ pressed }) => [styles.inlineCta, { backgroundColor: t.accent, opacity: pressed ? 0.82 : 1 }]}
          >
            <Text style={[styles.inlineCtaText, { color: t.correctText, fontSize: f.label }]}>{ctaLabel}</Text>
            <Ionicons name="arrow-forward" size={19} color={t.correctText} />
          </Pressable>
        </View>
      </TonalSurface>
    );
  }

  return (
    <Modal
      visible
      transparent
      animationType="none"
      statusBarTranslucent
      onRequestClose={handleDismiss}
      accessibilityViewIsModal
    >
      <Pressable
        testID="soft-upsell-backdrop"
        accessibilityRole="button"
        accessibilityLabel={dismissAccessibilityLabel}
        accessibilityHint={dismissAccessibilityHint}
        onPress={handleDismiss}
        style={[styles.modalBackdrop, isTablet ? styles.modalCentered : styles.modalBottom]}
      >
        <Animated.View
          testID="soft-upsell-card"
          accessibilityLabel={`${proof ? `${proof}. ` : ''}${title}. ${body}`}
          onLayout={handleLayout}
          style={[
            styles.modalSurface,
            isTablet ? styles.modalTabletSurface : styles.modalPhoneSurface,
            { paddingBottom: Math.max(20, insets.bottom + 12) },
            modalSurfaceMotion,
          ]}
        >
          <Pressable onPress={() => {}} accessibilityRole="none">
            <LinearGradient colors={['#191612', MODAL_SURFACE, '#080808']} style={StyleSheet.absoluteFill} />
            <View pointerEvents="none" style={styles.modalGoldGlow} />
            <Animated.View pointerEvents="none" style={[styles.modalShimmer, shimmerMotion]} />
            <View style={styles.modalContent}>
              {!!proof && <Text style={styles.modalProof}>{proof}</Text>}
              <View style={styles.modalIconHalo}>
                <Ionicons name={iconFor(opportunity.trigger)} size={28} color={GOLD} />
              </View>
              <Text style={[styles.modalTitle, { fontSize: Math.max(24, f.body + 7) }]}>{title}</Text>
              <Text style={[styles.modalBody, { fontSize: Math.max(16, f.caption + 2) }]}>{body}</Text>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={ctaAccessibilityLabel}
                accessibilityHint={ctaAccessibilityHint}
                onPress={handleCta}
                style={({ pressed }) => [styles.modalCta, { opacity: pressed ? 0.84 : 1 }]}
              >
                <Text style={[styles.modalCtaText, { fontSize: Math.max(16, f.label) }]}>{ctaLabel}</Text>
                <Ionicons name="arrow-forward" size={20} color="#07110A" />
              </Pressable>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={dismissAccessibilityLabel}
                accessibilityHint={dismissAccessibilityHint}
                onPress={handleDismiss}
                style={styles.modalDismiss}
              >
                <Text style={[styles.modalDismissText, { fontSize: Math.max(15, f.label) }]}>{dismissLabel}</Text>
              </Pressable>
            </View>
          </Pressable>
        </Animated.View>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  inlineCard: { borderRadius: 16, borderWidth: 0, gap: 10, padding: 16 },
  inlineHeadingRow: { alignItems: 'center', flexDirection: 'row', gap: 9 },
  inlineTitle: { flex: 1, fontWeight: '800' },
  inlineBody: { lineHeight: 20 },
  inlineActions: { alignItems: 'stretch', flexDirection: 'row', flexWrap: 'wrap', gap: 8, justifyContent: 'flex-end' },
  inlineDismiss: { alignItems: 'center', flexDirection: 'row', flexGrow: 1, flexShrink: 1, gap: 4, justifyContent: 'center', minHeight: 44, minWidth: 44, paddingHorizontal: 8 },
  inlineCta: { alignItems: 'center', borderRadius: 12, flexDirection: 'row', flexGrow: 1, flexShrink: 1, gap: 7, justifyContent: 'center', minHeight: 44, minWidth: 44, paddingHorizontal: 16 },
  inlineActionText: { flexShrink: 1 },
  inlineCtaText: { flexShrink: 1, fontWeight: '800' },
  modalBackdrop: { backgroundColor: 'rgba(0,0,0,0.72)', flex: 1, paddingHorizontal: 14 },
  modalBottom: { justifyContent: 'flex-end' },
  modalCentered: { alignItems: 'center', justifyContent: 'center' },
  modalSurface: { borderColor: GOLD_BORDER, borderRadius: 28, borderWidth: 1, maxWidth: 560, overflow: 'hidden', shadowColor: '#000', shadowOffset: { width: 0, height: 18 }, shadowOpacity: 0.48, shadowRadius: 30, width: '100%' },
  modalTabletSurface: { borderRadius: 28 },
  modalPhoneSurface: { borderBottomLeftRadius: 0, borderBottomRightRadius: 0 },
  modalGoldGlow: { backgroundColor: 'rgba(232,197,106,0.10)', borderRadius: 120, height: 240, position: 'absolute', right: -90, top: -130, width: 240 },
  modalShimmer: { backgroundColor: 'rgba(255,246,210,0.85)', height: 520, position: 'absolute', top: -120, width: 42 },
  modalContent: { alignItems: 'center', gap: 15, paddingHorizontal: 24, paddingTop: 26 },
  modalProof: { color: GOLD, fontSize: 12, fontWeight: '900', letterSpacing: 1.35, textAlign: 'center' },
  modalIconHalo: { alignItems: 'center', backgroundColor: 'rgba(232,197,106,0.10)', borderColor: 'rgba(232,197,106,0.25)', borderRadius: 25, borderWidth: 1, height: 50, justifyContent: 'center', width: 50 },
  modalTitle: { color: MODAL_TEXT, fontWeight: '900', letterSpacing: -0.45, lineHeight: 31, textAlign: 'center' },
  modalBody: { color: MODAL_MUTED, lineHeight: 24, maxWidth: 480, textAlign: 'center' },
  modalCta: { alignItems: 'center', backgroundColor: GOLD, borderRadius: 15, flexDirection: 'row', gap: 8, justifyContent: 'center', marginTop: 8, minHeight: 52, paddingHorizontal: 18, width: '100%' },
  modalCtaText: { color: '#07110A', flexShrink: 1, fontWeight: '900', textAlign: 'center' },
  modalDismiss: { alignItems: 'center', justifyContent: 'center', minHeight: 44, width: '100%' },
  modalDismissText: { color: '#B9B1A2', fontWeight: '700', textAlign: 'center' },
});
