import { Ionicons } from '@expo/vector-icons';
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
import { useTheme } from './ThemeContext';

type Props = {
  visible?: boolean;
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
  onCta: () => void | Promise<void | boolean>;
};

const GOLD = '#E8C56A';
const GOLD_BORDER = 'rgba(232,197,106,0.52)';
const SURFACE = '#11100F';
const TEXT = '#FFF8E8';
const MUTED = '#C9C0AE';

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
  const { f } = useTheme();
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
    if (!visible) {
      actionTakenRef.current = false;
      reportedRef.current = false;
      entrance.value = 0;
      shimmer.value = 0;
      return;
    }
    entrance.value = withTiming(1, { duration: reduceMotion ? 0 : 250 });
    shimmer.value = reduceMotion ? 1 : withDelay(220, withTiming(1, { duration: 760 }));
    return () => {
      cancelAnimation(entrance);
      cancelAnimation(shimmer);
    };
  }, [entrance, reduceMotion, shimmer, visible]);

  const surfaceMotion = useAnimatedStyle(() => ({
    opacity: entrance.value,
    transform: [{ translateY: (1 - entrance.value) * 24 }],
  }));
  const shimmerMotion = useAnimatedStyle(() => ({
    opacity: shimmer.value < 0.02 || shimmer.value > 0.98 ? 0 : 0.34,
    transform: [{ translateX: -220 + shimmer.value * 680 }, { rotate: '-18deg' }],
  }));

  const handleLayout = useCallback((event: { nativeEvent: { layout: { width: number; height: number } } }) => {
    const layout = event.nativeEvent.layout;
    if (reportedRef.current || impressionInFlightRef.current || layout.width <= 0 || layout.height <= 0) return;
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

  return (
    <Modal
      visible={visible}
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
        style={[styles.backdrop, isTablet ? styles.centered : styles.bottom]}
      >
        <Animated.View
          testID="soft-upsell-card"
          accessibilityLabel={`${proof ? `${proof}. ` : ''}${title}. ${body}`}
          onLayout={handleLayout}
          style={[
            styles.surface,
            isTablet ? styles.tabletSurface : styles.phoneSurface,
            { paddingBottom: Math.max(20, insets.bottom + 12) },
            surfaceMotion,
          ]}
        >
          <Pressable onPress={() => {}} accessibilityRole="none">
            <LinearGradient colors={['#191612', SURFACE, '#080808']} style={StyleSheet.absoluteFill} />
            <View pointerEvents="none" style={styles.goldGlow} />
            <Animated.View pointerEvents="none" style={[styles.shimmer, shimmerMotion]} />
            <View style={styles.content}>
              {!!proof && <Text style={styles.proof}>{proof}</Text>}
              <View style={styles.iconHalo}>
                <Ionicons name={iconFor(opportunity.trigger)} size={28} color={GOLD} />
              </View>
              <Text style={[styles.title, { fontSize: Math.max(24, f.body + 7) }]}>{title}</Text>
              <Text style={[styles.body, { fontSize: Math.max(16, f.caption + 2) }]}>{body}</Text>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={ctaAccessibilityLabel}
                accessibilityHint={ctaAccessibilityHint}
                onPress={handleCta}
                style={({ pressed }) => [styles.cta, { opacity: pressed ? 0.84 : 1 }]}
              >
                <Text style={[styles.ctaText, { fontSize: Math.max(16, f.label) }]}>{ctaLabel}</Text>
                <Ionicons name="arrow-forward" size={20} color="#07110A" />
              </Pressable>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={dismissAccessibilityLabel}
                accessibilityHint={dismissAccessibilityHint}
                onPress={handleDismiss}
                style={styles.dismiss}
              >
                <Text style={[styles.dismissText, { fontSize: Math.max(15, f.label) }]}>{dismissLabel}</Text>
              </Pressable>
            </View>
          </Pressable>
        </Animated.View>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { backgroundColor: 'rgba(0,0,0,0.72)', flex: 1, paddingHorizontal: 14 },
  bottom: { justifyContent: 'flex-end' },
  centered: { alignItems: 'center', justifyContent: 'center' },
  surface: { borderColor: GOLD_BORDER, borderRadius: 28, borderWidth: 1, maxWidth: 560, overflow: 'hidden', shadowColor: '#000', shadowOffset: { width: 0, height: 18 }, shadowOpacity: 0.48, shadowRadius: 30, width: '100%' },
  tabletSurface: { borderRadius: 28 },
  phoneSurface: { borderBottomLeftRadius: 0, borderBottomRightRadius: 0 },
  goldGlow: { backgroundColor: 'rgba(232,197,106,0.10)', borderRadius: 120, height: 240, position: 'absolute', right: -90, top: -130, width: 240 },
  shimmer: { backgroundColor: 'rgba(255,246,210,0.85)', height: 520, position: 'absolute', top: -120, width: 42 },
  content: { alignItems: 'center', gap: 15, paddingHorizontal: 24, paddingTop: 26 },
  proof: { color: GOLD, fontSize: 12, fontWeight: '900', letterSpacing: 1.35, textAlign: 'center' },
  iconHalo: { alignItems: 'center', backgroundColor: 'rgba(232,197,106,0.10)', borderColor: 'rgba(232,197,106,0.25)', borderRadius: 25, borderWidth: 1, height: 50, justifyContent: 'center', width: 50 },
  title: { color: TEXT, fontWeight: '900', letterSpacing: -0.45, lineHeight: 31, textAlign: 'center' },
  body: { color: MUTED, lineHeight: 24, maxWidth: 480, textAlign: 'center' },
  cta: { alignItems: 'center', backgroundColor: GOLD, borderRadius: 15, flexDirection: 'row', gap: 8, justifyContent: 'center', marginTop: 8, minHeight: 52, paddingHorizontal: 18, width: '100%' },
  ctaText: { color: '#07110A', flexShrink: 1, fontWeight: '900', textAlign: 'center' },
  dismiss: { alignItems: 'center', justifyContent: 'center', minHeight: 44, width: '100%' },
  dismissText: { color: '#B9B1A2', fontWeight: '700', textAlign: 'center' },
});
