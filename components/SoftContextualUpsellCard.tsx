import Ionicons from '@expo/vector-icons/Ionicons';
import React, { useCallback, useRef } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import type { SoftUpsellOpportunity } from '../app/soft_upsell_core';
import TonalSurface from './TonalSurface';
import { useTheme } from './ThemeContext';

type Props = {
  title: string;
  body: string;
  ctaLabel: string;
  dismissLabel: string;
  dismissAccessibilityLabel: string;
  dismissAccessibilityHint: string;
  ctaAccessibilityLabel: string;
  ctaAccessibilityHint: string;
  opportunity: SoftUpsellOpportunity;
  onImpression: () => void | Promise<void>;
  onDismiss: () => void | Promise<void>;
  onCta: () => void | Promise<void | boolean>;
};

export default function SoftContextualUpsellCard({
  title, body, ctaLabel, dismissLabel, dismissAccessibilityLabel, dismissAccessibilityHint,
  ctaAccessibilityLabel, ctaAccessibilityHint, onImpression, onDismiss, onCta,
}: Props) {
  const { theme: t, f } = useTheme();
  const reportedRef = useRef(false);
  const impressionInFlightRef = useRef<Promise<void> | null>(null);
  const handleLayout = useCallback((event: { nativeEvent: { layout: { width: number; height: number } } }) => {
    const { width, height } = event.nativeEvent.layout;
    if (reportedRef.current || impressionInFlightRef.current || width <= 0 || height <= 0) return;
    const operation = Promise.resolve(onImpression())
      .then(() => { reportedRef.current = true; })
      .catch(() => undefined)
      .finally(() => { impressionInFlightRef.current = null; });
    impressionInFlightRef.current = operation;
  }, [onImpression]);

  return (
    <TonalSurface
      testID="soft-upsell-card"
      accessibilityLabel={`${title}. ${body}`}
      onLayout={handleLayout}
      radius={16}
      style={styles.card}
    >
      <View style={styles.headingRow}>
        <Ionicons name="sparkles-outline" size={22} color={t.textPrimary} />
        <Text style={[styles.title, { color: t.textPrimary, fontSize: f.body }]}>{title}</Text>
      </View>
      <Text style={[styles.body, { color: t.textMuted, fontSize: f.caption }]}>{body}</Text>
      <View style={styles.actions}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={dismissAccessibilityLabel}
          accessibilityHint={dismissAccessibilityHint}
          onPress={() => { void onDismiss(); }}
          style={styles.dismiss}
        >
          <Ionicons name="close" size={22} color={t.textMuted} />
          <Text style={[styles.actionText, { color: t.textMuted, fontSize: f.label }]}>{dismissLabel}</Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={ctaAccessibilityLabel}
          accessibilityHint={ctaAccessibilityHint}
          onPress={() => { void onCta(); }}
          style={({ pressed }) => [styles.cta, { backgroundColor: t.accent, opacity: pressed ? 0.82 : 1 }]}
        >
          <Text style={[styles.ctaText, { color: t.correctText, fontSize: f.label }]}>{ctaLabel}</Text>
          <Ionicons name="arrow-forward" size={19} color={t.correctText} />
        </Pressable>
      </View>
    </TonalSurface>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: 16, borderWidth: 0, gap: 10, padding: 16 },
  headingRow: { alignItems: 'center', flexDirection: 'row', gap: 9 },
  title: { flex: 1, fontWeight: '800' },
  body: { lineHeight: 20 },
  actions: { alignItems: 'stretch', flexDirection: 'row', flexWrap: 'wrap', gap: 8, justifyContent: 'flex-end' },
  dismiss: { alignItems: 'center', flexDirection: 'row', flexGrow: 1, flexShrink: 1, gap: 4, justifyContent: 'center', minHeight: 44, minWidth: 44, paddingHorizontal: 8 },
  cta: { alignItems: 'center', borderRadius: 12, flexDirection: 'row', flexGrow: 1, flexShrink: 1, gap: 7, justifyContent: 'center', minHeight: 44, minWidth: 44, paddingHorizontal: 16 },
  actionText: { flexShrink: 1 },
  ctaText: { flexShrink: 1, fontWeight: '800' },
});
