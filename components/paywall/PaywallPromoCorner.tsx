import React from 'react';
import { StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';

import type { Lang } from '../../constants/i18n';
import type { StorePromoPricing } from '../../app/premium_store_promo_display';
import type { PaywallChrome } from './paywallShared';
import { PaywallBadgePop } from './PaywallMotion';
import { promoBadgeLabel } from './PaywallPromoBanner';

/**
 * Утверждённый сезонный вариант A: диагональный −N% в правом углу ценовой
 * зоны. Данные только из текущего пакета стора: флаг админки не может
 * подменить сумму или процент, которые реально выставит Apple/Google.
 */
export default function PaywallPromoCorner({
  lang,
  chrome,
  promo,
  style,
  compact = false,
}: {
  lang: Lang;
  chrome: PaywallChrome;
  promo: StorePromoPricing | null;
  style?: StyleProp<ViewStyle>;
  compact?: boolean;
}) {
  if (!promo) return null;
  const { tc } = chrome;

  return (
    <View pointerEvents="none" style={[S.anchor, style]}>
      <View style={S.tilt}>
        <PaywallBadgePop
          pulse
          style={[
            S.badge,
            compact ? S.badgeCompact : null,
            { backgroundColor: tc.savingsBadgeBg },
          ]}
        >
          <Text
            maxFontSizeMultiplier={1.2}
            style={[S.label, compact ? S.labelCompact : null, { color: tc.savingsBadgeText }]}
          >
            {promoBadgeLabel(lang, promo.discountPercent)}
          </Text>
        </PaywallBadgePop>
      </View>
    </View>
  );
}

const S = StyleSheet.create({
  anchor: { position: 'absolute', zIndex: 3 },
  // Наклон разрешён ТОЛЬКО тут, на ценовой карточке. Бейдж Главной остаётся
  // ровным в потоке хедера.
  tilt: { transform: [{ rotate: '-10deg' }] },
  badge: {
    paddingHorizontal: 11,
    paddingVertical: 7,
    borderRadius: 10,
    shadowColor: '#000',
    shadowOpacity: 0.34,
    shadowOffset: { width: 0, height: 6 },
    shadowRadius: 12,
    elevation: 5,
  },
  badgeCompact: { paddingHorizontal: 7, paddingVertical: 4, borderRadius: 8 },
  label: { fontSize: 15, fontWeight: '900', letterSpacing: 0.1 },
  labelCompact: { fontSize: 11 },
});
