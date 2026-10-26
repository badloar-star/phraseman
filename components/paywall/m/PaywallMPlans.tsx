// ═══════════════════════════════════════════════════════════════════════════
// PaywallMPlans.tsx — «Выбери план»: год выбран заранее (крупная сумма за год, «≈ в месяц», бейдж скидки) и месяц рядом.
//
// зачем (макет AKuWv3RWqbu3a4Xe7EBj7q, карта Тем Y1–Y6): цена честно — сумма за год крупно; цены и скидка — только строки магазина (ни одной цифры здесь
// не пишем руками). Выбранный план — тот же градиент и доводка текста, что у текущего пейвола (planRowSelectedPaint, legibleOn 4,55), рамка accentGraphic;
// бейдж скидки — утверждённое золото. Выбор мгновенный (локальное состояние экрана), тап по уже выбранному ничего не делает.
// ═══════════════════════════════════════════════════════════════════════════
import React, { memo, useMemo } from 'react';
import { StyleSheet, Text, View, useWindowDimensions } from 'react-native';

import type { GlassTokens } from '../../../constants/liquidGlassThemePalette';
import type { PaywallPlan } from '../../../app/paywall_purchase';
import V2Pressable from '../../v2/V2Pressable';
import { LinearGradient } from '../../SafeLinearGradient';
import { planRowSelectedPaint } from '../paywallPlanRowPaint';
import { paywallPlateBg } from '../paywall_surfaces';
import { PAYWALL_SAVINGS_GOLD, PAYWALL_SAVINGS_GOLD_INK } from '../PaywallPlanRows';
import { paywallMCompactLayout } from './paywall_m_panels';

export type PaywallMPlansTexts = Readonly<{ title: string; year: string; month: string; yearPerMonth: string | null; monthNote: string | null; badge: string | null }>;

export const PaywallMPlans = memo(function PaywallMPlans({ g, selected, onSelect, disabled, yearlyPrice, monthlyPrice, texts }: {
  g: GlassTokens; selected: PaywallPlan; onSelect: (plan: PaywallPlan) => void; disabled: boolean;
  yearlyPrice: string; monthlyPrice: string; texts: PaywallMPlansTexts;
}) {
  const paint = useMemo(() => planRowSelectedPaint(g), [g]);
  const plate = paywallPlateBg(g);
  // зачем (крайние случаи 26.10): два тарифа в ряд оставляют цене ~119 dp на 360 dp; «R$ 199,90» / «3 999,00 ₽» крупным шрифтом рвались посреди числа. В тесной раскладке тарифы друг под другом.
  const { width: windowWidth, fontScale } = useWindowDimensions();
  const compact = paywallMCompactLayout(windowWidth, fontScale);
  // зачем (4 · ТЕМЫ 25.10): плашка есть и у выбранного плана — градиент ложится на неё (как в PaywallPlanRows), иначе «≈ в месяц» в светлых grad_full_* не дотягивает
  const yearOn = selected === 'yearly';
  const monthOn = selected === 'monthly';
  return (
    <View testID="paywall-m-plans">
      <Text accessibilityRole="header" style={[S.h2, { color: g.text }]}>{texts.title}</Text>
      <View style={compact ? S.rowStacked : S.row}>
        <V2Pressable testID="paywall-m-plan-yearly" accessibilityRole="radio" accessibilityState={{ selected: yearOn, disabled }} disabled={disabled}
          onPress={() => onSelect('yearly')} scaleTo={0.98} outerStyle={compact ? S.cellStacked : S.cell}
          style={[S.plan, { backgroundColor: plate, borderColor: yearOn ? paint.edge : 'transparent' }]}>
          {yearOn ? <LinearGradient pointerEvents="none" colors={paint.gradient} style={[StyleSheet.absoluteFill, S.fill]} /> : null}
          <Text style={[S.name, { color: yearOn ? paint.ink : g.text }]}>{texts.year}</Text>
          <Text style={[S.price, { color: yearOn ? paint.ink : g.text }]}>{yearlyPrice}</Text>
          {texts.yearPerMonth ? <Text style={[S.sub, { color: yearOn ? paint.mutedInk : g.secondary }]}>{texts.yearPerMonth}</Text> : null}
          {texts.badge ? <View style={[S.badge, { backgroundColor: PAYWALL_SAVINGS_GOLD }]}><Text style={[S.badgeText, { color: PAYWALL_SAVINGS_GOLD_INK }]}>{texts.badge}</Text></View> : null}
        </V2Pressable>
        <V2Pressable testID="paywall-m-plan-monthly" accessibilityRole="radio" accessibilityState={{ selected: monthOn, disabled }} disabled={disabled}
          onPress={() => onSelect('monthly')} scaleTo={0.98} outerStyle={compact ? S.cellStacked : S.cell}
          style={[S.plan, { backgroundColor: plate, borderColor: monthOn ? paint.edge : 'transparent' }]}>
          {monthOn ? <LinearGradient pointerEvents="none" colors={paint.gradient} style={[StyleSheet.absoluteFill, S.fill]} /> : null}
          <Text style={[S.name, { color: monthOn ? paint.ink : g.text }]}>{texts.month}</Text>
          <Text style={[S.price, { color: monthOn ? paint.ink : g.text }]}>{monthlyPrice}</Text>
          {texts.monthNote ? <Text style={[S.sub, { color: monthOn ? paint.mutedInk : g.secondary }]}>{texts.monthNote}</Text> : null}
        </V2Pressable>
      </View>
    </View>
  );
});

const S = StyleSheet.create({
  h2: { fontSize: 20, lineHeight: 26, fontWeight: '800', letterSpacing: -0.2, marginBottom: 12 },
  row: { flexDirection: 'row', gap: 10 },
  // зачем: у плана overflow visible (бейдж скидки выступает за край), поэтому градиент сам скруглён под плашку
  fill: { borderRadius: 19 },
  cell: { flex: 1 },
  rowStacked: { flexDirection: 'column', gap: 14 }, // зазор больше: бейдж скидки выступает над плиткой на 10 dp
  cellStacked: { alignSelf: 'stretch' },
  // guard-ok: рамка выбранного плана 1 px — по макету и карте Тем Y3/Y4 (accentGraphic), исключение PhraseMan 2.0 (владелец 24.09); у невыбранного рамка прозрачная, размер не прыгает
  plan: { minHeight: 96, borderRadius: 20, borderWidth: 1, paddingVertical: 14, paddingHorizontal: 14, overflow: 'visible' }, // guard-ok: кольцо выбранного плана; shadow-ok: индикатор выбора (как радио-кольцо), а не обводка контейнера — у невыбранного плана рамка прозрачная (карта Тем Y3/Y4)
  name: { fontSize: 13, lineHeight: 18, fontWeight: '700' },
  price: { marginTop: 2, fontSize: 28, lineHeight: 34, fontWeight: '800', letterSpacing: -0.4, fontVariant: ['tabular-nums'] },
  sub: { marginTop: 2, fontSize: 13, lineHeight: 17 },
  badge: { position: 'absolute', top: -10, right: 12, borderRadius: 10, paddingVertical: 3, paddingHorizontal: 8 },
  badgeText: { fontSize: 13, lineHeight: 17, fontWeight: '800' },
});
