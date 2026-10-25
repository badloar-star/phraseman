// ═══════════════════════════════════════════════════════════════════════════
// PaywallMCompare.tsx — «Бесплатно и Plus»: шесть строк, числа из кода (paywall_m_model.paywallMCompareRows).
//
// зачем (макет AKuWv3RWqbu3a4Xe7EBj7q, карта Тем T1–T6): сравнение честное и короткое; цвета — secondary для «бесплатно», accentTextSafe для шапки Plus,
// text жирным для значений Plus, галочка accentGraphic, разделители hairline (тонкая полупрозрачная разрешена в 2.0), а не заливка строк.
// ═══════════════════════════════════════════════════════════════════════════
import React, { memo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';

import type { GlassTokens } from '../../../constants/liquidGlassThemePalette';

export type PaywallMCompareLine = Readonly<{ id: string; label: string; free: string; plus: string }>;

export const PaywallMCompare = memo(function PaywallMCompare({ g, title, freeHead, plusHead, rows }: {
  g: GlassTokens; title: string; freeHead: string; plusHead: string; rows: readonly PaywallMCompareLine[];
}) {
  return (
    <View testID="paywall-m-compare">
      <Text accessibilityRole="header" style={[S.h2, { color: g.text }]}>{title}</Text>
      <View style={[S.card, { backgroundColor: g.opaqueCard }]}>
        <View style={S.row}>
          <View style={S.label} />
          <Text style={[S.head, S.freeCol, { color: g.secondary }]}>{freeHead}</Text>
          <Text style={[S.head, S.plusCol, { color: g.accentTextSafe }]}>{plusHead}</Text>
        </View>
        {rows.map((r) => (
          <View key={r.id} style={[S.row, S.rowLine, { borderTopColor: g.line }]}>
            <Text style={[S.label, S.labelText, { color: g.text }]}>{r.label}</Text>
            <Text style={[S.value, S.freeCol, { color: g.secondary }]}>{r.free}</Text>
            <View style={[S.plusCol, S.plusCell]}>
              <Ionicons name="checkmark" size={15} color={g.accentGraphic} />
              <Text style={[S.plusText, { color: g.text }]}>{r.plus}</Text>
            </View>
          </View>
        ))}
      </View>
    </View>
  );
});

const S = StyleSheet.create({
  h2: { fontSize: 20, lineHeight: 26, fontWeight: '800', letterSpacing: -0.2, marginBottom: 12 },
  card: { borderRadius: 22, paddingHorizontal: 14, paddingVertical: 6 },
  row: { flexDirection: 'row', alignItems: 'center', minHeight: 40 },
  rowLine: { minHeight: 48, borderTopWidth: StyleSheet.hairlineWidth },
  label: { flex: 1 },
  labelText: { fontSize: 15, lineHeight: 20, paddingVertical: 8, paddingRight: 8 },
  head: { fontSize: 13, lineHeight: 17, fontWeight: '700' },
  freeCol: { width: 92, textAlign: 'center' },
  plusCol: { width: 112, paddingLeft: 10 },
  value: { fontSize: 13, lineHeight: 17 },
  plusCell: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  plusText: { flexShrink: 1, fontSize: 14, lineHeight: 18, fontWeight: '800' },
});
