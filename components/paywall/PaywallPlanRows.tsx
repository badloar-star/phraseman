import React, { memo } from 'react';
import { StyleSheet, Text, useWindowDimensions, View } from 'react-native';

import type { Lang } from '../../constants/i18n';
import type { liquidGlassTokens } from '../../constants/liquidGlassThemePalette';
import type { PaywallPlan } from '../../app/paywall_purchase';
import type { StorePromoPricing } from '../../app/premium_store_promo_display';
import type { PaywallPriceSource } from '../../app/paywall_reference_prices';
import { mixSurfaceHex } from '../../constants/liquidGlassSurfaceRoles';
import { pinColorsForTier } from '../plus/plus_ring_spec';
import { LinearGradient } from '../SafeLinearGradient';
import SkeletonBlock from '../SkeletonShimmer';
import V2Pressable from '../v2/V2Pressable';
import { paywallPriceFontSize, paywallPriceLineHeight } from './paywall_price_font';
export { planRowSelectedPaint } from './paywallPlanRowPaint';
import { COPY, pick, trialFreeLabel } from './PaywallPlusCopy';
import { SUBSCRIPTION_TIER_NAME } from '../../app/subscription_tier';

type GlassTokens = ReturnType<typeof liquidGlassTokens>;

/** Высота строки тарифа (и скелета на её месте): первый кадр без прыжка, когда придут цены. */
export const PLAN_ROW_MIN_HEIGHT = 92;
const PLAN_ROW_GAP = 10;
const PLAN_ROW_RADIUS = 16;
const DISABLED_OPACITY = 0.4;

/** Золото бейджа скидки — смысловой цвет «выгода», темой не красится (макет `--gold` / `#3a2700`). */
export const PAYWALL_SAVINGS_GOLD = '#FFD27A'; // theme-exempt: золотой бейдж скидки по макету paywall-redesign-1018 (смысловой цвет)
export const PAYWALL_SAVINGS_GOLD_INK = '#3A2700'; // theme-exempt: чернила бейджа скидки на золоте (≥ 4,5)

type RowProps = {
  lang: Lang; g: GlassTokens; on: boolean; disabled: boolean; onPress: () => void; testID: string; priceTestID: string;
  tier: 'plus' | 'ultra'; name: string; trialDays: number | null; price: string; promo: StorePromoPricing | null;
  subPrice: string; savingsPct?: number | null;
};

const PlanRow = memo(function PlanRow({ lang, g, on, disabled, onPress, testID, priceTestID, tier, name, trialDays, price, promo, subPrice }: RowProps) {
  const shown = promo?.promoPriceString || price || '—';
  const { fontScale } = useWindowDimensions();
  const fontSize = paywallPriceFontSize(shown, fontScale);
  const [aura, reflection] = pinColorsForTier(tier, g.isLight);
  const shade = '#160E29'; // theme-exempt: fixed shadow of the subscription gradients.
  const metal = [
    mixSurfaceHex(shade, aura, 0.46),
    mixSurfaceHex(shade, aura, 0.65),
    mixSurfaceHex(shade, reflection, 0.7),
    mixSurfaceHex(shade, aura, 0.51),
    mixSurfaceHex(shade, reflection, 0.45),
  ] as const;
  return (
    <V2Pressable
      testID={testID}
      accessibilityRole="radio"
      accessibilityState={{ selected: on, checked: on, disabled: disabled || !price }}
      disabled={disabled || !price}
      onPress={onPress}
      // зачем (координатор 18.10): хаптик при выборе тарифа — управляющий элемент
      withHaptic
      scaleTo={0.985}
      outerStyle={S.planCell}
      style={[S.row, { backgroundColor: metal[0], borderColor: on ? aura : 'transparent' }, disabled ? S.disabled : null]}
    >
      <LinearGradient pointerEvents="none" colors={[...metal]} locations={[0, 0.31, 0.49, 0.64, 1]}
        start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
      <View style={S.inner}>
        <View style={S.side}>
          <View style={S.nameRow}>
            <Text style={S.glyph}>{tier === 'plus' ? '◆' : '✦'}</Text>
            <Text style={S.name}>{name}</Text>
          </View>
        </View>
        <View style={S.cost}>
          {promo ? <Text style={S.strike}>{promo.standardPriceString}</Text> : null}
          <Text testID={priceTestID} style={[S.price, { fontSize, lineHeight: paywallPriceLineHeight(fontSize) }]}>{shown}</Text>
          <Text style={S.trial}>{subPrice}</Text>
          {trialDays ? <Text testID={`${testID}-trial`} style={S.trial}>{trialFreeLabel(lang, trialDays)}</Text> : null}
        </View>
        <View style={[S.side, S.selection]}>
          <View style={[S.radio, on && S.radioSelected]} />
        </View>
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
        lang={lang} g={g} on={selected === 'monthly'} disabled={disabled} onPress={() => onSelect('monthly')}
        testID="paywall-plan-monthly" priceTestID="paywall-month-price" tier="plus" name={SUBSCRIPTION_TIER_NAME.plus}
        trialDays={monthlyTrialDays} price={monthlyPrice} promo={monthlyPromo}
        subPrice={pick(lang, COPY.perMonth)}
      />
      <PlanRow
        lang={lang} g={g} on={selected === 'yearly'} disabled={disabled} onPress={() => onSelect('yearly')}
        testID="paywall-plan-yearly" priceTestID="paywall-year-price" tier="ultra" name={SUBSCRIPTION_TIER_NAME.ultra}
        trialDays={yearlyTrialDays} price={yearlyPrice} promo={yearlyPromo}
        // макет: «39,99 € в год» — сумма с периодом, без «≈ в месяц» и без бейджа скидки
        subPrice={pick(lang, COPY.perYear)}
        savingsPct={null}
      />
    </View>
  );
});

/** Цены грузятся: две строки-скелета той же высоты — первый кадр без прыжка. */
export const PaywallPlanRowsSkeleton = memo(function PaywallPlanRowsSkeleton({ g, stacked = true }: { g: GlassTokens; stacked?: boolean }) {
  const baseColor = g.opaqueCard;
  const highlightColor = g.isLight ? g.opaqueSheet : `${g.text.slice(0, 7)}24`;
  return (
    <View testID="paywall-plans-skeleton" accessibilityRole="progressbar" style={[S.list, !stacked && S.horizontalSkeleton]}>
      <View style={stacked ? undefined : S.skeletonCell}><SkeletonBlock width="100%" height={PLAN_ROW_MIN_HEIGHT} borderRadius={PLAN_ROW_RADIUS} baseColor={baseColor} highlightColor={highlightColor} /></View>
      <View style={stacked ? undefined : S.skeletonCell}><SkeletonBlock width="100%" height={PLAN_ROW_MIN_HEIGHT} borderRadius={PLAN_ROW_RADIUS} baseColor={baseColor} highlightColor={highlightColor} /></View>
    </View>
  );
});

/** Высота блока двух строк — для «цен нет» на том же месте. */
export const PLAN_ROWS_BLOCK_HEIGHT = PLAN_ROW_MIN_HEIGHT * 2 + PLAN_ROW_GAP;

// theme-exempt: light ink on the dark subscription gradients.
const INK = '#FFFFFF';

const S = StyleSheet.create({
  list: { gap: PLAN_ROW_GAP, marginTop: 12 },
  horizontalSkeleton: { flexDirection: 'row' },
  planCell: { minWidth: 0 },
  skeletonCell: { flex: 1, minWidth: 0 },
  row: { overflow: 'hidden', minHeight: PLAN_ROW_MIN_HEIGHT, borderRadius: PLAN_ROW_RADIUS, borderWidth: 2, paddingVertical: 10, paddingHorizontal: 12, justifyContent: 'center' },
  disabled: { opacity: DISABLED_OPACITY },
  inner: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  side: { flex: 1, minWidth: 0 },
  nameRow: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 4 },
  name: { color: INK, fontSize: 14, lineHeight: 20, fontWeight: '800' },
  glyph: { color: INK, fontSize: 17, lineHeight: 20 },
  cost: { flexShrink: 1, maxWidth: '60%', alignItems: 'center' },
  selection: { alignItems: 'flex-end' },
  radio: { width: 17, height: 17, borderRadius: 9, borderWidth: 1, borderColor: INK },
  radioSelected: { borderWidth: 5 },
  trial: { color: INK, textAlign: 'center', fontSize: 13, lineHeight: 17 },
  price: { color: INK, textAlign: 'center', fontWeight: '800', fontVariant: ['tabular-nums'] },
  strike: { color: INK, textAlign: 'center', fontSize: 13, lineHeight: 17, textDecorationLine: 'line-through', fontVariant: ['tabular-nums'] },
});
