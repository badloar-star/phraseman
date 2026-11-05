// ════════════════════════════════════════════════════════════════════════════
// PaywallPlanRows — две плоские плитки тарифа варианта C.
//
//  • две плитки рядом: кружок выбора, «Год/Месяц», под ним честное «N дней бесплатно»
//    (пробный — свой у каждой строки, из своего пакета магазина);
//  • справа цена КРУПНО (Inter 800, 26, табличные цифры — новый шрифт ради одной цифры не тащим), под ней мелко
//    «≈ X в месяц» у года и «в месяц» у месяца. Правило магазинов: крупнее всего — сумма списания;
//  • выбранная: тонкая рамка текста активной темы, без градиента, свечения и 3D;
//  • «−N%» — золотой бейдж на правом верхнем крае строки года; процент — из цен магазина (computeSavingsPct), не хардкод;
//  • выбор: хаптик; геометрия не меняется.
// ════════════════════════════════════════════════════════════════════════════
import React, { memo } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import type { Lang } from '../../constants/i18n';
import type { liquidGlassTokens } from '../../constants/liquidGlassThemePalette';
import type { PaywallPlan } from '../../app/paywall_purchase';
import type { StorePromoPricing } from '../../app/premium_store_promo_display';
import type { PaywallPriceSource } from '../../app/paywall_reference_prices';
import SkeletonBlock from '../SkeletonShimmer';
import V2Pressable from '../v2/V2Pressable';
import { paywallPlateBg } from './paywall_surfaces';
export { planRowSelectedPaint } from './paywallPlanRowPaint';
import { COPY, pick, trialFreeLabel } from './PaywallPlusCopy';
import { PAYWALL_V3_NO_TRIAL_LINE } from '../../app/paywall_v3_rows';

type GlassTokens = ReturnType<typeof liquidGlassTokens>;

/** Высота строки тарифа (и скелета на её месте): первый кадр без прыжка, когда придут цены. */
export const PLAN_ROW_MIN_HEIGHT = 84;
const PLAN_ROW_GAP = 10;
const PLAN_ROW_RADIUS = 16;
const DISABLED_OPACITY = 0.4;

/** Золото бейджа скидки — смысловой цвет «выгода», темой не красится (макет `--gold` / `#3a2700`). */
export const PAYWALL_SAVINGS_GOLD = '#FFD27A'; // theme-exempt: золотой бейдж скидки по макету paywall-redesign-1018 (смысловой цвет)
export const PAYWALL_SAVINGS_GOLD_INK = '#3A2700'; // theme-exempt: чернила бейджа скидки на золоте (≥ 4,5)

type RowProps = {
  lang: Lang; g: GlassTokens; on: boolean; disabled: boolean; onPress: () => void; testID: string; priceTestID: string;
  name: string; trialDays: number | null; price: string; promo: StorePromoPricing | null; approx: boolean;
  subPrice: string; savingsPct?: number | null;
};

const PlanRow = memo(function PlanRow({ lang, g, on, disabled, onPress, testID, priceTestID, name, trialDays, price, promo, approx, subPrice, savingsPct }: RowProps) {
  // зачем (ревью 05.11): пустая цена — «—», а не пустое место; кегль суммы по длине строки и масштабу шрифта (paywall_price_font)
  const shown = promo?.promoPriceString || (price ? `${approx ? '≈ ' : ''}${price}` : '—');
  // зачем (макет «Все окна Plus», вариант 3; слово владельца 05.11 «1 в 1»; правило сторов — цена из магазина видна на плитке): плитка = имя, цена с периодом («≈ 39,99 € в год»), строка пробного периода
  return (
    <V2Pressable
      testID={testID}
      accessibilityRole="radio"
      accessibilityState={{ selected: on, checked: on, disabled }}
      disabled={disabled || !price}
      onPress={onPress}
      // зачем (координатор 18.10): хаптик при выборе тарифа — управляющий элемент
      withHaptic
      scaleTo={0.985}
      outerStyle={S.planCell}
      style={[S.row, { backgroundColor: paywallPlateBg(g), borderColor: on ? g.text : 'transparent' }, disabled ? S.disabled : null]}
    >
      <View style={S.inner}>
        <Text style={[S.name, { color: g.text }]}>{name}</Text>
        {promo ? <Text style={[S.strike, { color: g.secondary }]}>{promo.standardPriceString}</Text> : null}
        <Text testID={priceTestID} style={[S.price, { color: g.text }]}>{`${shown}${subPrice ? ` ${subPrice}` : ''}`}</Text>
        <Text testID={`${testID}-trial`} style={[S.trial, { color: g.secondary }]}>{trialDays ? trialFreeLabel(lang, trialDays) : (PAYWALL_V3_NO_TRIAL_LINE[lang] ?? PAYWALL_V3_NO_TRIAL_LINE.en)}</Text>
      </View>
    </V2Pressable>
  );
});

export const PaywallPlanRows = memo(function PaywallPlanRows({
  lang, g, selected, onSelect, disabled, yearlyPrice, yearlyPerMonth, monthlyPrice, yearlyTrialDays, monthlyTrialDays,
  yearlyPromo, monthlyPromo, yearlyPriceSource, monthlyPriceSource, savingsPct,
}: {
  lang: Lang; g: GlassTokens; selected: PaywallPlan; onSelect: (plan: PaywallPlan) => void; disabled: boolean;
  yearlyPrice: string; yearlyPerMonth: string; monthlyPrice: string;
  yearlyTrialDays: number | null; monthlyTrialDays: number | null;
  yearlyPromo: StorePromoPricing | null; monthlyPromo: StorePromoPricing | null;
  yearlyPriceSource?: PaywallPriceSource; monthlyPriceSource?: PaywallPriceSource;
  /** Выгода года к 12 × месяц из цен магазина (computeSavingsPct); null — бейджа нет. */
  savingsPct: number | null;
}) {
  return (
    <View style={S.list}>
      <PlanRow
        lang={lang} g={g} on={selected === 'yearly'} disabled={disabled} onPress={() => onSelect('yearly')}
        testID="paywall-plan-yearly" priceTestID="paywall-year-price" name={pick(lang, COPY.year)}
        trialDays={yearlyTrialDays} price={yearlyPrice} promo={yearlyPromo} approx={yearlyPriceSource === 'reference'}
        // макет: «39,99 € в год» — сумма с периодом, без «≈ в месяц» и без бейджа скидки
        subPrice={pick(lang, COPY.perYear)}
        savingsPct={null}
      />
      <PlanRow
        lang={lang} g={g} on={selected === 'monthly'} disabled={disabled} onPress={() => onSelect('monthly')}
        testID="paywall-plan-monthly" priceTestID="paywall-month-price" name={pick(lang, COPY.month)}
        trialDays={monthlyTrialDays} price={monthlyPrice} promo={monthlyPromo} approx={monthlyPriceSource === 'reference'}
        subPrice={pick(lang, COPY.perMonth)}
      />
    </View>
  );
});

/** Цены грузятся: две строки-скелета той же высоты — первый кадр без прыжка. */
export const PaywallPlanRowsSkeleton = memo(function PaywallPlanRowsSkeleton({ g }: { g: GlassTokens }) {
  const baseColor = paywallPlateBg(g);
  const highlightColor = g.isLight ? g.opaqueSheet : `${g.text.slice(0, 7)}24`;
  return (
    <View testID="paywall-plans-skeleton" accessibilityRole="progressbar" style={S.list}>
      <View style={S.skeletonCell}><SkeletonBlock width="100%" height={PLAN_ROWS_BLOCK_HEIGHT} borderRadius={PLAN_ROW_RADIUS} baseColor={baseColor} highlightColor={highlightColor} /></View>
      <View style={S.skeletonCell}><SkeletonBlock width="100%" height={PLAN_ROWS_BLOCK_HEIGHT} borderRadius={PLAN_ROW_RADIUS} baseColor={baseColor} highlightColor={highlightColor} /></View>
    </View>
  );
});

/** Высота блока двух строк — для «цен нет» на том же месте. */
export const PLAN_ROWS_BLOCK_HEIGHT = 84;

const S = StyleSheet.create({
  list: { flexDirection: 'row', gap: PLAN_ROW_GAP, marginTop: 18 },
  planCell: { flex: 1, minWidth: 0 },
  skeletonCell: { flex: 1, minWidth: 0 },
  row: { flexGrow: 1, minHeight: 84, borderRadius: PLAN_ROW_RADIUS, borderWidth: 2, paddingVertical: 12, paddingHorizontal: 13, justifyContent: 'center' }, // shadow-ok: guard-ok: selection-control outline (контур выбранной плитки 2 px, как на макете)
  disabled: { opacity: DISABLED_OPACITY },
  inner: { flex: 1, alignItems: 'flex-start', gap: 2 },
  name: { fontSize: 15, lineHeight: 21, fontWeight: '800' },
  trial: { fontSize: 13, lineHeight: 17 },
  // зачем (правило магазинов): цена на плитке заметнее строки пробного периода — 13 жирным у строки 13 обычной
  price: { fontSize: 13, lineHeight: 17, fontWeight: '700', fontVariant: ['tabular-nums'] },
  // зачем (правило магазинов): сумма списания — самая крупная цифра строки; «≈ в месяц» — мелко под ней
  strike: { fontSize: 13, lineHeight: 17, textDecorationLine: 'line-through', fontVariant: ['tabular-nums'] },
});
