import Ionicons from '@expo/vector-icons/Ionicons';
import React, { useCallback, useRef } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import type { SoftUpsellOpportunity } from '../app/soft_upsell_core';
import { liquidGlassTokens } from '../constants/liquidGlassThemePalette';
import KitTouchable from './KitTouchable';
import TonalSurface from './TonalSurface';
import { useTheme } from './ThemeContext';
import { noteSwallowedHandler } from '../app/swallow_log'; // зачем: PM-229 — немой catch → причина в журнале, значение по умолчанию прежнее

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
  const { theme: t, f, liquidGlassThemeId } = useTheme();
  const glass = liquidGlassTokens(liquidGlassThemeId);
  const reportedRef = useRef(false);
  const impressionInFlightRef = useRef<Promise<void> | null>(null);
  // зачем (координатор 10.10, деньги): CTA ведёт на пейвол, «не сейчас» пишет отказ — второй тап в том же кадре открывал бы пейвол дважды
  // или писал отказ дважды; ref-замок синхронный и снимается, когда обработчик закончил (успех или сбой).
  const actionLockRef = useRef(false);
  const runLocked = useCallback((name: string, action: () => void | Promise<unknown>) => {
    if (actionLockRef.current) {
      console.warn(`[SOFT-UPSELL] ${name}: повторный тап пропущен, предыдущее действие ещё идёт`);
      return;
    }
    actionLockRef.current = true;
    let pending: void | Promise<unknown>;
    try {
      pending = action(); // синхронно, как раньше: тап сразу вызывает обработчик
    } catch (error: unknown) {
      console.warn(`[SOFT-UPSELL] ${name}: сбой обработчика`, error instanceof Error ? error.message : String(error));
      actionLockRef.current = false;
      return;
    }
    Promise.resolve(pending)
      .catch((error: unknown) => { console.warn(`[SOFT-UPSELL] ${name}: сбой обработчика`, error instanceof Error ? error.message : String(error)); })
      .finally(() => { actionLockRef.current = false; });
  }, []);
  const handleLayout = useCallback((event: { nativeEvent: { layout: { width: number; height: number } } }) => {
    const { width, height } = event.nativeEvent.layout;
    if (reportedRef.current || impressionInFlightRef.current || width <= 0 || height <= 0) return;
    const operation = Promise.resolve(onImpression())
      .then(() => { reportedRef.current = true; })
      .catch(noteSwallowedHandler('SoftContextualUpsellCard:useCallback.resolve'))
      .finally(() => { impressionInFlightRef.current = null; });
    impressionInFlightRef.current = operation;
  }, [onImpression]);

  return (
    <TonalSurface
      testID="soft-upsell-card"
      accessibilityLabel={`${title}. ${body}`}
      onLayout={handleLayout}
      radius={16}
      style={[styles.card, { borderColor: glass.glassEdge }]}
    >
      <View style={styles.headingRow}>
        <Ionicons name="sparkles-outline" size={22} color={glass.accentText} />
        <Text style={[styles.title, { color: t.textPrimary, fontSize: f.body }]}>{title}</Text>
      </View>
      <Text style={[styles.body, { color: t.textMuted, fontSize: f.caption }]}>{body}</Text>
      <View style={styles.actions}>
        <KitTouchable
          accessibilityRole="button"
          accessibilityLabel={dismissAccessibilityLabel}
          accessibilityHint={dismissAccessibilityHint}
          onPress={() => runLocked('dismiss', () => onDismiss())}
          style={styles.dismiss}
        >
          <Ionicons name="close" size={22} color={t.textMuted} />
          <Text style={[styles.actionText, { color: t.textMuted, fontSize: f.label }]}>{dismissLabel}</Text>
        </KitTouchable>
        <KitTouchable
          accessibilityRole="button"
          accessibilityLabel={ctaAccessibilityLabel}
          accessibilityHint={ctaAccessibilityHint}
          onPress={() => runLocked('cta', () => onCta())}
          style={[styles.cta, { backgroundColor: glass.accent }]}
        >
          <Text style={[styles.ctaText, { color: glass.accentInk, fontSize: f.label }]}>{ctaLabel}</Text>
          <Ionicons name="arrow-forward" size={19} color={glass.ctaInk} />
        </KitTouchable>
      </View>
    </TonalSurface>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: 16, borderWidth: 1, gap: 10, padding: 16 },
  headingRow: { alignItems: 'center', flexDirection: 'row', gap: 9 },
  title: { flex: 1, fontWeight: '800' },
  body: { lineHeight: 20 },
  actions: { alignItems: 'stretch', flexDirection: 'row', flexWrap: 'wrap', gap: 8, justifyContent: 'flex-end' },
  dismiss: { alignItems: 'center', flexDirection: 'row', flexGrow: 1, flexShrink: 1, gap: 4, justifyContent: 'center', minHeight: 44, minWidth: 44, paddingHorizontal: 8 },
  cta: { alignItems: 'center', borderRadius: 12, flexDirection: 'row', flexGrow: 1, flexShrink: 1, gap: 7, justifyContent: 'center', minHeight: 44, minWidth: 44, paddingHorizontal: 16 },
  actionText: { flexShrink: 1 },
  ctaText: { flexShrink: 1, fontWeight: '800' },
});
