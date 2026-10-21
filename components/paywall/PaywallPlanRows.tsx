// ════════════════════════════════════════════════════════════════════════════
// PaywallPlanRows — тарифы окна Plus, вариант A «Строки, цена справа»
// (владелец 18.10, макет docs/design/v2-app/paywall-redesign-1018.html, блок `.A`).
//
//  • две строки одна под другой: слева кружок выбора, «Год/Месяц», под ним акцентом «N дней бесплатно»
//    (пробный — свой у каждой строки, из своего пакета магазина);
//  • справа цена КРУПНО (Inter 800, 26, табличные цифры — новый шрифт ради одной цифры не тащим), под ней мелко
//    «≈ X в месяц» у года и «в месяц» у месяца. Правило магазинов: крупнее всего — сумма списания;
//  • выбранная: градиент акцента внутри, тонкая кромка акцента 1,5 и мягкое свечение (`.plan.on`); невыбранная — плашка темы;
//  • «−N%» — золотой бейдж на правом верхнем крае строки года; процент — из цен магазина (computeSavingsPct), не хардкод;
//  • выбор: хаптик, перелив выбранного слоя на UI-потоке 240 мс, «уменьшить движение» — сразу.
// ════════════════════════════════════════════════════════════════════════════
import React, { memo, useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, { cancelAnimation, Easing, useAnimatedStyle, useReducedMotion, useSharedValue, withTiming } from 'react-native-reanimated';
import { KIT_MOTION } from '../../constants/motionHybrid';

import type { Lang } from '../../constants/i18n';
import type { liquidGlassTokens } from '../../constants/liquidGlassThemePalette';
import type { PaywallPlan } from '../../app/paywall_purchase';
import type { StorePromoPricing } from '../../app/premium_store_promo_display';
import type { PaywallPriceSource } from '../../app/paywall_reference_prices';
import SkeletonBlock from '../SkeletonShimmer';
import { LinearGradient } from '../SafeLinearGradient';
import V2Pressable from '../v2/V2Pressable';
import { paywallPlateBg, paywallSheetBg } from './paywall_surfaces';
import { planRowSelectedPaint } from './paywallPlanRowPaint';
export { planRowSelectedPaint } from './paywallPlanRowPaint';
import { COPY, pick, trialFreeLabel, yearPerMonthApprox } from './PaywallPlusCopy';

type GlassTokens = ReturnType<typeof liquidGlassTokens>;

/** Высота строки тарифа (и скелета на её месте): первый кадр без прыжка, когда придут цены. */
export const PLAN_ROW_MIN_HEIGHT = 96;
const PLAN_ROW_GAP = 12;
const PLAN_ROW_RADIUS = 22;
const SELECT_MS = KIT_MOTION.pressMs;
const DISABLED_OPACITY = 0.4;

/** Золото бейджа скидки — смысловой цвет «выгода», темой не красится (макет `--gold` / `#3a2700`). */
export const PAYWALL_SAVINGS_GOLD = '#FFD27A'; // theme-exempt: золотой бейдж скидки по макету paywall-redesign-1018 (смысловой цвет)
export const PAYWALL_SAVINGS_GOLD_INK = '#3A2700'; // theme-exempt: чернила бейджа скидки на золоте (≥ 4,5)

const alphaHex = (hex: string, a: number): string => `${hex.slice(0, 7)}${Math.round(Math.max(0, Math.min(1, a)) * 255).toString(16).padStart(2, '0')}`;

const PlanRadio = memo(function PlanRadio({ g, on }: { g: GlassTokens; on: boolean }) {
  // `.radio`: невыбранный — кольцо 2 тона текста; выбранный — диск цвета шторки с точкой акцента (inset 5 px макета)
  return on ? (
    <View style={[S.radio, { backgroundColor: paywallSheetBg(g) }]}>
      <View style={[S.radioDot, { backgroundColor: g.accentGraphic }]} />
    </View>
  ) : (
    <View style={[S.radio, S.radioRing, { borderColor: alphaHex(g.text.slice(0, 7), 0.35) }]} /> // guard-ok: кольцо радио — индикатор выбора, не контейнер
  );
});

type RowProps = {
  lang: Lang; g: GlassTokens; on: boolean; disabled: boolean; onPress: () => void; testID: string; priceTestID: string;
  name: string; trialDays: number | null; price: string; promo: StorePromoPricing | null; approx: boolean;
  subPrice: string; savingsPct?: number | null;
};

const PlanRow = memo(function PlanRow({ lang, g, on, disabled, onPress, testID, priceTestID, name, trialDays, price, promo, approx, subPrice, savingsPct }: RowProps) {
  const reduceMotion = useReducedMotion();
  const sel = useSharedValue(on ? 1 : 0);
  useEffect(() => {
    // зачем (макет: переход выбора плавный): перелив выбранного слоя на UI-потоке; «уменьшить движение» — сразу
    sel.value = reduceMotion ? (on ? 1 : 0) : withTiming(on ? 1 : 0, { duration: SELECT_MS, easing: Easing.bezier(0.2, 1, 0.3, 1) });
    return () => cancelAnimation(sel);
  }, [on, reduceMotion, sel]);
  const selStyle = useAnimatedStyle(() => ({ opacity: sel.value }));
  const paint = planRowSelectedPaint(g);
  const shown = promo?.promoPriceString || `${approx ? '≈ ' : ''}${price}`;
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
      style={[S.row, { backgroundColor: paywallPlateBg(g) }, on ? { boxShadow: [{ offsetX: 0, offsetY: 12, blurRadius: 30, color: paint.glow }] } : null, disabled ? S.disabled : null]}
    >
      {/* выбранный слой: градиент + кромка; сам слой скруглён, контейнер без overflow — свечение не режется */}
      {/* guard-ok: тонкая кромка 1,5 выбранной строки — по макету варианта A (утверждён владельцем 18.10) */}
      <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, S.selLayer, { borderColor: paint.edge }, selStyle]}>
        <LinearGradient pointerEvents="none" colors={[...paint.gradient]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} locations={[0, 0.6]} style={[StyleSheet.absoluteFill, { borderRadius: PLAN_ROW_RADIUS }]} />
      </Animated.View>
      {savingsPct ? (
        <View testID="paywall-savings-badge" style={S.tag}>
          <Text style={S.tagText}>{`−${savingsPct}%`}</Text>
        </View>
      ) : null}
      <View style={S.inner}>
        <PlanRadio g={g} on={on} />
        <View style={S.nameCol}>
          <Text style={[S.name, { color: paint.ink }]}>{name}</Text>
          {trialDays ? <Text testID={`${testID}-trial`} style={[S.trial, { color: paint.trialInk }]}>{trialFreeLabel(lang, trialDays)}</Text> : null}
        </View>
        <View style={S.priceCol}>
          {promo ? <Text style={[S.strike, { color: paint.mutedInk }]}>{promo.standardPriceString}</Text> : null}
          <Text testID={priceTestID} style={[S.big, { color: g.text }]}>{shown}</Text>
          {subPrice ? <Text style={[S.per, { color: paint.secondaryInk }]}>{subPrice}</Text> : null}
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
        lang={lang} g={g} on={selected === 'yearly'} disabled={disabled} onPress={() => onSelect('yearly')}
        testID="paywall-plan-yearly" priceTestID="paywall-year-price" name={pick(lang, COPY.year)}
        trialDays={yearlyTrialDays} price={yearlyPrice} promo={yearlyPromo} approx={yearlyPriceSource === 'reference'}
        // мелко «≈ X в месяц» у года; нет месячного эквивалента — «в год», чтобы сумма не осталась без периода
        subPrice={yearlyPerMonth ? yearPerMonthApprox(lang, yearlyPerMonth) : pick(lang, COPY.perYear)}
        savingsPct={yearlyPrice && monthlyPrice && yearlyPriceSource !== 'reference' && monthlyPriceSource !== 'reference' ? savingsPct : null}
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
      <SkeletonBlock width="100%" height={PLAN_ROW_MIN_HEIGHT} borderRadius={PLAN_ROW_RADIUS} baseColor={baseColor} highlightColor={highlightColor} />
      <SkeletonBlock width="100%" height={PLAN_ROW_MIN_HEIGHT} borderRadius={PLAN_ROW_RADIUS} baseColor={baseColor} highlightColor={highlightColor} />
    </View>
  );
});

/** Высота блока двух строк — для «цен нет» на том же месте. */
export const PLAN_ROWS_BLOCK_HEIGHT = PLAN_ROW_MIN_HEIGHT * 2 + PLAN_ROW_GAP;

const S = StyleSheet.create({
  list: { gap: PLAN_ROW_GAP, marginTop: 16 },
  row: { minHeight: PLAN_ROW_MIN_HEIGHT, borderRadius: PLAN_ROW_RADIUS, paddingVertical: 14, paddingHorizontal: 16, justifyContent: 'center' },
  selLayer: { borderRadius: PLAN_ROW_RADIUS, borderWidth: 1.5 }, // shadow-ok: guard-ok: тонкая кромка акцента выбранной строки по макету варианта A (`0 0 0 1.5px var(--acc)`), утверждён владельцем 18.10
  disabled: { opacity: DISABLED_OPACITY },
  inner: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  radio: { width: 22, height: 22, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  radioRing: { borderWidth: 2 }, // shadow-ok: guard-ok: кольцо радио — индикатор выбора, не контейнер
  radioDot: { width: 12, height: 12, borderRadius: 6 },
  nameCol: { flex: 1, minWidth: 0 },
  name: { fontSize: 16, lineHeight: 22, fontWeight: '800' },
  trial: { marginTop: 2, fontSize: 13, lineHeight: 17, fontWeight: '700' },
  priceCol: { alignItems: 'flex-end', flexShrink: 0 },
  // зачем (правило магазинов): сумма списания — самая крупная цифра строки; «≈ в месяц» — мелко под ней
  big: { fontSize: 26, lineHeight: 30, fontWeight: '800', letterSpacing: -0.4, fontVariant: ['tabular-nums'] },
  per: { marginTop: 4, fontSize: 13, lineHeight: 17, fontVariant: ['tabular-nums'] },
  strike: { fontSize: 13, lineHeight: 17, textDecorationLine: 'line-through', fontVariant: ['tabular-nums'] },
  tag: { position: 'absolute', top: -10, right: 16, zIndex: 3, minHeight: 22, borderRadius: 11, paddingHorizontal: 9, justifyContent: 'center', backgroundColor: PAYWALL_SAVINGS_GOLD },
  tagText: { fontSize: 13, lineHeight: 17, fontWeight: '800', color: PAYWALL_SAVINGS_GOLD_INK, fontVariant: ['tabular-nums'] },
});
