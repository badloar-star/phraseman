// ═══════════════════════════════════════════════════════════════════════════
// PaywallMHeaderCard.tsx — личная шапка пейвола «Вариант М»: «Ты на 3-м уроке из 32», крупный заголовок места и три цифры человека.
//
// зачем (макет AKuWv3RWqbu3a4Xe7EBj7q, владелец «Да, так»): окно начинается с человека, а не со списка функций. Цвета — только токены темы. Подложка шапки — тот же градиент
// «акцент 30 % → плашка», что у выбранного плана (planRowSelectedPaint); по замеру Тем (c843a230a, худший край градиента) надпись и заголовок на нём доводятся
// legibleOn к тексту/белому до 4,55 — это уже сделано в planRowSelectedPaint (trialInk / ink), поэтому берём оттуда. Плитки цифр — text / secondary на opaqueCard (M3/M4).
// ═══════════════════════════════════════════════════════════════════════════
import React, { memo, useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import type { GlassTokens } from '../../../constants/liquidGlassThemePalette';
import { LinearGradient } from '../../SafeLinearGradient';
import { planRowSelectedPaint } from '../paywallPlanRowPaint';

export type PaywallMStat = Readonly<{ value: string; total?: string; label: string }>;

export const PaywallMHeaderCard = memo(function PaywallMHeaderCard({ g, kicker, title, stats }: {
  g: GlassTokens; kicker: string; title: string; stats: readonly PaywallMStat[];
}) {
  const paint = useMemo(() => planRowSelectedPaint(g), [g]);
  return (
    <View testID="paywall-m-header" style={[S.card, { backgroundColor: g.opaqueCard }]}>
      <LinearGradient pointerEvents="none" colors={paint.gradient} style={StyleSheet.absoluteFill} />
      <Text style={[S.kicker, { color: paint.trialInk }]}>{kicker}</Text>
      <Text accessibilityRole="header" style={[S.title, { color: paint.ink }]}>{title}</Text>
      <View style={S.stats}>
        {stats.map((s) => (
          <View key={s.label} style={[S.tile, { backgroundColor: g.opaqueCard }]}>
            <Text style={[S.value, { color: g.text }]}>
              {s.value}
              {s.total ? <Text style={[S.total, { color: g.secondary }]}>{` ${s.total}`}</Text> : null}
            </Text>
            <Text style={[S.label, { color: g.secondary }]} numberOfLines={2}>{s.label}</Text>
          </View>
        ))}
      </View>
    </View>
  );
});

const S = StyleSheet.create({
  card: { borderRadius: 24, padding: 14, overflow: 'hidden' },
  kicker: { fontSize: 13, lineHeight: 17, fontWeight: '600' },
  title: { marginTop: 8, fontSize: 25, lineHeight: 30, fontWeight: '800', letterSpacing: -0.4 },
  stats: { marginTop: 14, flexDirection: 'row', gap: 8 },
  tile: { flex: 1, minHeight: 64, borderRadius: 16, paddingVertical: 10, paddingHorizontal: 12, justifyContent: 'center' },
  value: { fontSize: 22, lineHeight: 26, fontWeight: '800', fontVariant: ['tabular-nums'] },
  total: { fontSize: 13, fontWeight: '600' },
  label: { marginTop: 2, fontSize: 13, lineHeight: 17 },
});
