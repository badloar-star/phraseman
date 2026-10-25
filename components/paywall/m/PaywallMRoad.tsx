// ═══════════════════════════════════════════════════════════════════════════
// PaywallMRoad.tsx — «Что ты скажешь через 30 дней»: лента из фраз следующих уроков курса (день 10 · 20 · 30).
//
// зачем (макет AKuWv3RWqbu3a4Xe7EBj7q, карта Тем P1–P4): человек видит настоящие фразы, которые его ждут. «День · урок» — accentTextSafe, фраза — text, перевод — secondary,
// точки и линия ленты — accentGraphic на листе, карточки — opaqueCard. Пока фразы не прочитаны — раздел не рисуется (он ниже графика, остальное не сдвигается).
// ═══════════════════════════════════════════════════════════════════════════
import React, { memo } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import type { GlassTokens } from '../../../constants/liquidGlassThemePalette';

export type PaywallMRoadLine = Readonly<{ key: string; meta: string; english: string; translation: string | null }>;

export const PaywallMRoad = memo(function PaywallMRoad({ g, title, items }: { g: GlassTokens; title: string; items: readonly PaywallMRoadLine[] }) {
  if (items.length === 0) return null;
  return (
    <View testID="paywall-m-road">
      <Text accessibilityRole="header" style={[S.h2, { color: g.text }]}>{title}</Text>
      <View>
        {items.map((it, i) => (
          <View key={it.key} style={S.row}>
            <View style={S.rail}>
              <View style={[S.dot, { backgroundColor: g.accentGraphic }]} />
              {i < items.length - 1 ? <View style={[S.line, { backgroundColor: g.accentGraphic }]} /> : null}
            </View>
            <View style={[S.card, { backgroundColor: g.opaqueCard }]}>
              <Text style={[S.meta, { color: g.accentTextSafe }]}>{it.meta}</Text>
              <Text style={[S.english, { color: g.text }]}>{it.english}</Text>
              {it.translation ? <Text style={[S.tr, { color: g.secondary }]}>{it.translation}</Text> : null}
            </View>
          </View>
        ))}
      </View>
    </View>
  );
});

const S = StyleSheet.create({
  h2: { fontSize: 20, lineHeight: 26, fontWeight: '800', letterSpacing: -0.2, marginBottom: 14 },
  row: { flexDirection: 'row', gap: 12 },
  rail: { width: 12, alignItems: 'center', paddingTop: 16 },
  dot: { width: 12, height: 12, borderRadius: 6 },
  line: { width: 2, flex: 1, marginTop: 2, opacity: 0.45 },
  card: { flex: 1, borderRadius: 18, paddingVertical: 12, paddingHorizontal: 14, marginBottom: 12 },
  meta: { fontSize: 12, lineHeight: 16, fontWeight: '700' },
  english: { marginTop: 2, fontSize: 18, lineHeight: 24, fontWeight: '800', letterSpacing: -0.2 },
  tr: { marginTop: 2, fontSize: 13, lineHeight: 18 },
});
