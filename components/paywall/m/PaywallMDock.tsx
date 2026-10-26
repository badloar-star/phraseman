// ═══════════════════════════════════════════════════════════════════════════
// PaywallMDock.tsx — низ окна М: кнопка покупки, строка про деньги, ссылки «Восстановить покупки · Условия · Конфиденциальность».
//
// зачем (макет AKuWv3RWqbu3a4Xe7EBj7q, карта Тем Y7–Y9; правило Apple): «Восстановить покупки» и условия видны ВСЕГДА (переключатель админки их здесь
// не прячет); «Не сейчас» живёт в шапке окна и тоже виден всегда. Кнопка — ctaFill с подписью ctaFillInk, как у прежнего окна; строка про деньги — secondary,
// резервируется по высоте, чтобы кнопка не прыгала, когда цены приходят позже. Промокод — тихая ссылка, только если админка его включила.
// ═══════════════════════════════════════════════════════════════════════════
import React, { memo } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

import { ctaFillGradient } from '../../../constants/accentFill';
import type { GlassTokens } from '../../../constants/liquidGlassThemePalette';
import { KNOWLY_LEGAL_PRIVACY_URL, KNOWLY_LEGAL_TERMS_URL } from '../../../app/config';
import { openLegalLink } from '../../../app/open_legal_link';
import V2Pressable from '../../v2/V2Pressable';
import { LinearGradient } from '../../SafeLinearGradient';

export type PaywallMDockTexts = Readonly<{ cta: string; fine: string | null; restore: string; restoring: string; terms: string; privacy: string; promo: string }>;

export const PaywallMDock = memo(function PaywallMDock({ g, texts, purchasing, disabled, bottomInset, onPress, restoring, restoreDisabled, onRestore, promoVisible, promoDisabled, onPromo }: {
  g: GlassTokens; texts: PaywallMDockTexts; purchasing: boolean; disabled: boolean; bottomInset: number; onPress: () => void;
  restoring: boolean; restoreDisabled: boolean; onRestore: () => void; promoVisible: boolean; promoDisabled: boolean; onPromo: () => void;
}) {
  return (
    <View style={[S.dock, { paddingBottom: Math.max(bottomInset, 14), backgroundColor: g.opaqueSheet }]}>
      <V2Pressable
        testID="paywall-cta"
        accessibilityRole="button"
        accessibilityLabel={texts.cta}
        accessibilityState={{ disabled, busy: purchasing }}
        disabled={disabled}
        onPress={onPress}
        withHaptic={false}
        scaleTo={0.97}
        style={[S.cta, { backgroundColor: g.ctaFill }]}
      >
        <LinearGradient pointerEvents="none" colors={[...ctaFillGradient(g)]} style={StyleSheet.absoluteFill} />
        {purchasing ? <ActivityIndicator color={g.ctaFillInk} /> : <Text style={[S.ctaText, { color: g.ctaFillInk }]}>{texts.cta}</Text>}
      </V2Pressable>
      <Text testID="paywall-fine" style={[S.fine, { color: g.secondary }]}>{texts.fine ?? ' '}</Text>
      <View style={S.links}>
        <V2Pressable testID="paywall-restore" accessibilityRole="link" accessibilityState={{ disabled: restoreDisabled, busy: restoring }} disabled={restoreDisabled}
          withHaptic={false} scaleTo={0.95} onPress={onRestore} style={S.linkHit}>
          {restoring ? <ActivityIndicator size="small" color={g.secondary} /> : null}
          <Text style={[S.link, { color: g.secondary }]}>{restoring ? texts.restoring : texts.restore}</Text>
        </V2Pressable>
        <V2Pressable accessibilityRole="link" scaleTo={0.95} onPress={() => openLegalLink(KNOWLY_LEGAL_TERMS_URL, 'paywall_plus')} style={S.linkHit}>
          <Text style={[S.link, { color: g.secondary }]}>{texts.terms}</Text>
        </V2Pressable>
        <V2Pressable accessibilityRole="link" scaleTo={0.95} onPress={() => openLegalLink(KNOWLY_LEGAL_PRIVACY_URL, 'paywall_plus')} style={S.linkHit}>
          <Text style={[S.link, { color: g.secondary }]}>{texts.privacy}</Text>
        </V2Pressable>
        {promoVisible ? (
          <V2Pressable testID="paywall-promo-code" accessibilityRole="link" accessibilityState={{ disabled: promoDisabled }} disabled={promoDisabled}
            withHaptic={false} scaleTo={0.95} onPress={onPromo} style={S.linkHit}>
            <Text style={[S.link, { color: g.secondary }]}>{texts.promo}</Text>
          </V2Pressable>
        ) : null}
      </View>
    </View>
  );
});

const S = StyleSheet.create({
  dock: { paddingHorizontal: 16, paddingTop: 10 },
  // зачем (крайние случаи 26.10): минимум 56 — длинная подпись при шрифте ×1,3 переносится, кнопка растёт, текст не режется
  cta: { minHeight: 56, borderRadius: 28, paddingVertical: 12, paddingHorizontal: 16, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  ctaText: { fontSize: 16, lineHeight: 22, fontWeight: '800', letterSpacing: -0.2 },
  fine: { marginTop: 8, minHeight: 34, fontSize: 13, lineHeight: 17, textAlign: 'center' },
  links: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', alignItems: 'center' },
  linkHit: { minHeight: 44, paddingHorizontal: 10, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
  link: { fontSize: 13, lineHeight: 18, fontWeight: '600' },
});
