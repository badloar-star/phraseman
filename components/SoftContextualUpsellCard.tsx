import { Ionicons } from '@expo/vector-icons';
import React, { useCallback, useRef } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import type { SoftUpsellOpportunity } from '../app/soft_upsell_core';
import { useTheme } from './ThemeContext';

type Props = {
  title: string;
  body: string;
  ctaLabel: string;
  opportunity: SoftUpsellOpportunity;
  onImpression: () => void | Promise<void>;
  onDismiss: () => void | Promise<void>;
  onCta: () => void | Promise<void>;
};

export default function SoftContextualUpsellCard({
  title, body, ctaLabel, opportunity, onImpression, onDismiss, onCta,
}: Props) {
  const { theme: t, f } = useTheme();
  const reportedRef = useRef(false);
  const handleLayout = useCallback((event: { nativeEvent: { layout: { width: number; height: number } } }) => {
    const { width, height } = event.nativeEvent.layout;
    if (reportedRef.current || width <= 0 || height <= 0) return;
    reportedRef.current = true;
    void onImpression();
  }, [onImpression]);

  return (
    <View
      testID="soft-upsell-card"
      accessibilityLabel={`${title}. ${body}`}
      onLayout={handleLayout}
      style={[styles.card, { backgroundColor: t.bgCard, borderColor: t.border }]}
    >
      <View style={styles.headingRow}>
        <Ionicons name="sparkles-outline" size={22} color={t.textPrimary} />
        <Text style={[styles.title, { color: t.textPrimary, fontSize: f.body }]}>{title}</Text>
      </View>
      <Text style={[styles.body, { color: t.textMuted, fontSize: f.caption }]}>{body}</Text>
      <View style={styles.actions}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Dismiss"
          accessibilityHint="Closes this suggestion"
          onPress={() => { void onDismiss(); }}
          style={styles.dismiss}
        >
          <Ionicons name="close" size={22} color={t.textMuted} />
          <Text style={{ color: t.textMuted, fontSize: f.label }}>Dismiss</Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={ctaLabel}
          accessibilityHint={`Opens ${opportunity.destination === 'paywall' ? 'premium options' : 'your personal plan'}`}
          onPress={() => { void onCta(); }}
          style={({ pressed }) => [styles.cta, { backgroundColor: t.accent, opacity: pressed ? 0.82 : 1 }]}
        >
          <Text style={[styles.ctaText, { color: t.correctText, fontSize: f.label }]}>{ctaLabel}</Text>
          <Ionicons name="arrow-forward" size={19} color={t.correctText} />
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: 16, borderWidth: 1, gap: 10, padding: 16 },
  headingRow: { alignItems: 'center', flexDirection: 'row', gap: 9 },
  title: { flex: 1, fontWeight: '800' },
  body: { lineHeight: 20 },
  actions: { alignItems: 'center', flexDirection: 'row', gap: 8, justifyContent: 'flex-end' },
  dismiss: { alignItems: 'center', flexDirection: 'row', gap: 4, justifyContent: 'center', minHeight: 44, minWidth: 44, paddingHorizontal: 8 },
  cta: { alignItems: 'center', borderRadius: 12, flexDirection: 'row', gap: 7, justifyContent: 'center', minHeight: 44, minWidth: 44, paddingHorizontal: 16 },
  ctaText: { fontWeight: '800' },
});
