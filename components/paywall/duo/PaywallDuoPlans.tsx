// PaywallDuoPlans — две кнопки-тарифа первого экрана пейвола «Два пути» (Ultra · год и Plus · месяц).
// зачем (владелец 11.11, макет docs/work/mockups/paywall-sell-2026-11-11/variant-a.html, «в точности 1 к 1»): на первом экране
// только заголовок и две кнопки; выбранная залита градиентом своего уровня с бегущим бликом, вторая — тихая. Нажатие на
// невыбранную перекрашивает окно, на выбранную — открывает оплату (решение в paywall_duo_tap.ts).
// Размеры из макета: высота 74, радиус 22, поля 14×18, зазор 10; название 17/700, подпись 13, цена 21/900.
// Цены, пробный период и скидка — только из магазина, как в PaywallPlanRows.
import React, { memo, useCallback, useEffect, useRef } from 'react';
import { ActivityIndicator, Animated, Easing, StyleSheet, Text, useWindowDimensions, View } from 'react-native';

import type { Lang } from '../../../constants/i18n';
import type { liquidGlassTokens } from '../../../constants/liquidGlassThemePalette';
import type { PaywallPlan } from '../../../app/paywall_purchase';
import type { StorePromoPricing } from '../../../app/premium_store_promo_display';
import { SUBSCRIPTION_TIER_NAME, type SubscriptionTier } from '../../../app/subscription_tier';
import { useReduceMotion } from '../../../hooks/use_reduce_motion';
import { useRuntimeActive } from '../../../hooks/use_runtime_active';
import { LinearGradient } from '../../SafeLinearGradient';
import V2Pressable from '../../v2/V2Pressable';
import { paywallPriceFontSize, paywallPriceLineHeight } from '../paywall_price_font';
import { COPY, LP, pick, trialFreeLabel } from '../PaywallPlusCopy';
import { DUO_TIER_COLORS, DUO_TIER_INK } from './PaywallDuoHero';
import { duoTapAction, logDuoTap } from './paywall_duo_tap';

type GlassTokens = ReturnType<typeof liquidGlassTokens>;

/** Высота кнопки-тарифа; скелет на её месте держит ту же высоту — без прыжка, когда придут цены. */
export const DUO_PLAN_MIN_HEIGHT = 74;
const DUO_PLAN_GAP = 10;
const DUO_PRICE_FONT_CAP = 21;
const DISABLED_OPACITY = 0.4;
// макет: блик идёт 28 % цикла 4,5 с и стартует через 1,2 с после показа
const SHEEN_CYCLE_MS = 4500;
const SHEEN_RUN_MS = 1260;
const SHEEN_DELAY_MS = 1200;
// theme-exempt: тихие цвета названия невыбранного уровня на тёмной плитке — макет (#ffb3c8 / #cfc7ff).
const DUO_NAME_SOFT: Readonly<Record<SubscriptionTier, string>> = Object.freeze({ ultra: '#FFB3C8', plus: '#CFC7FF' });
// theme-exempt: бейдж выгоды — макет (.save): на яркой кнопке чернила + #ffd9e4, на тихой rgba(255,95,143,.2) + #ffc2d3.
const SAVE_ON_INK = '#FFD9E4';
const SAVE_OFF_BG = '#FF5F8F33';
const SAVE_OFF_INK = '#FFC2D3';
// theme-exempt: блик поверх градиента — белый 38 %.
const SHEEN_COLORS = ['#FFFFFF00', '#FFFFFF61', '#FFFFFF00'] as const;

/** Подпись месячного тарифа, когда пробного у него нет (макет: «без пробного»). */
const NO_TRIAL = LP('без пробного', 'без пробного', 'no free trial', 'sin prueba', 'sem teste grátis', 'không dùng thử', 'tanpa uji coba', 'deneme yok', 'bez okresu próbnego');

const Sheen = memo(function Sheen({ width }: { width: number }) {
  const reduceMotion = useReduceMotion();
  const run = useRef(new Animated.Value(0)).current;
  // зачем (владелец 11.11, аудит скорости): блик крутился вечно, даже когда поверх пейвола открыт другой экран или приложение
  // свёрнуто — окно продолжало перерисовываться и греть телефон. Сам блик и его тайминги из макета не меняются: он просто
  // стоит, пока экран не на переднем плане, и стартует заново (с той же задержкой) при возврате.
  const active = useRuntimeActive();
  useEffect(() => {
    if (reduceMotion || width <= 0 || !active) return undefined;
    run.setValue(0);
    const loop = Animated.loop(Animated.sequence([
      Animated.timing(run, { toValue: 1, duration: SHEEN_RUN_MS, easing: Easing.bezier(0.23, 1, 0.32, 1), useNativeDriver: true }),
      Animated.delay(SHEEN_CYCLE_MS - SHEEN_RUN_MS),
      Animated.timing(run, { toValue: 0, duration: 0, useNativeDriver: true }),
    ]));
    const start = setTimeout(() => loop.start(), SHEEN_DELAY_MS);
    return () => { clearTimeout(start); loop.stop(); };
  }, [active, reduceMotion, run, width]);
  if (reduceMotion || width <= 0) return null;
  return (
    <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, { transform: [{ translateX: run.interpolate({ inputRange: [0, 1], outputRange: [-width * 1.2, width * 1.2] }) }] }]}>
      <LinearGradient pointerEvents="none" colors={[...SHEEN_COLORS]} locations={[0.35, 0.5, 0.65]} start={{ x: 0, y: 0.35 }} end={{ x: 1, y: 0.65 }} style={StyleSheet.absoluteFill} />
    </Animated.View>
  );
});

type RowProps = Readonly<{
  lang: Lang; g: GlassTokens; plan: PaywallPlan; tier: SubscriptionTier; on: boolean; busy: boolean; disabled: boolean;
  price: string; promo: StorePromoPricing | null; trialDays: number | null; savingsPct: number | null; onPress: (plan: PaywallPlan) => void;
}>;

const Row = memo(function Row({ lang, g, plan, tier, on, busy, disabled, price, promo, trialDays, savingsPct, onPress }: RowProps) {
  const { fontScale, width: windowWidth } = useWindowDimensions();
  const shown = promo?.promoPriceString || price || '—';
  const fontSize = Math.min(DUO_PRICE_FONT_CAP, paywallPriceFontSize(shown, fontScale));
  const colors = DUO_TIER_COLORS[tier];
  const ink = on ? DUO_TIER_INK[tier] : g.text;
  // зачем: в светлой теме мягкий розовый/сиреневый на светлой плитке не читается — там название цветом текста темы
  const nameColor = on ? ink : g.isLight ? g.text : DUO_NAME_SOFT[tier];
  const period = pick(lang, plan === 'yearly' ? COPY.year : COPY.month).toLowerCase();
  const name = `${tier === 'ultra' ? '✦' : '◆'} ${SUBSCRIPTION_TIER_NAME[tier]} · ${period}`;
  const press = useCallback(() => onPress(plan), [onPress, plan]);
  return (
    <V2Pressable
      testID={`paywall-duo-${plan}`}
      accessibilityRole="radio"
      accessibilityState={{ selected: on, checked: on, disabled, busy: on && busy }}
      accessibilityLabel={`${SUBSCRIPTION_TIER_NAME[tier]}, ${period}, ${shown}`}
      disabled={disabled}
      onPress={press}
      // зачем: кнопка-тариф — управляющий элемент (выбор и покупка), отклик хаптиком
      withHaptic
      scaleTo={0.97}
      // зачем: невыбранная плитка отделена тоном (opaqueControl), без обводки — правило владельца
      style={[S.row, { backgroundColor: on ? colors[1] : g.opaqueControl }, on ? { shadowColor: colors[1] } : null, on ? S.rowOn : null, disabled && !busy ? S.disabled : null]}
    >
      {on ? <LinearGradient pointerEvents="none" colors={[...colors]} locations={[0, 0.48, 1]} start={{ x: 0, y: 0.2 }} end={{ x: 1, y: 0.8 }} style={StyleSheet.absoluteFill} /> : null}
      {on && !busy ? <Sheen width={windowWidth} /> : null}
      <View style={S.side}>
        <View style={S.nameRow}>
          <Text style={[S.name, { color: nameColor }]}>{name}</Text>
          {savingsPct ? (
            <View testID={`paywall-duo-${plan}-save`} style={[S.save, { backgroundColor: on ? ink : SAVE_OFF_BG }]}>
              <Text style={[S.saveText, { color: on ? SAVE_ON_INK : g.isLight ? g.text : SAVE_OFF_INK }]}>{`−${savingsPct}%`}</Text>
            </View>
          ) : null}
        </View>
        <Text testID={`paywall-duo-${plan}-trial`} style={[S.small, { color: ink }]}>{trialDays ? trialFreeLabel(lang, trialDays) : plan === 'monthly' ? pick(lang, NO_TRIAL) : ' '}</Text>
      </View>
      <View style={S.cost}>
        {on && busy ? <ActivityIndicator color={ink} /> : (
          <>
            {promo ? <Text style={[S.strike, { color: ink }]}>{promo.standardPriceString}</Text> : null}
            <Text testID={`paywall-duo-${plan}-price`} style={[S.price, { color: ink, fontSize, lineHeight: paywallPriceLineHeight(fontSize) }]}>{shown}</Text>
            <Text style={[S.small, { color: ink }]}>{pick(lang, plan === 'yearly' ? COPY.perYear : COPY.perMonth)}</Text>
          </>
        )}
      </View>
    </V2Pressable>
  );
});

export const PaywallDuoPlans = memo(function PaywallDuoPlans({
  lang, g, selected, onSelect, onBuy, busy, yearlyPrice, monthlyPrice, yearlyTrialDays, monthlyTrialDays, yearlyPromo, monthlyPromo, savingsPct,
}: {
  lang: Lang; g: GlassTokens; selected: PaywallPlan;
  /** Мгновенная локальная смена тарифа (цвет, знак, тексты) — сети не ждёт. */
  onSelect: (plan: PaywallPlan) => void;
  /** Покупка выбранного тарифа. */
  onBuy: () => void;
  /** Идёт оплата/восстановление: кнопки заняты, повторный тап игнорируется. */
  busy: boolean;
  yearlyPrice: string; monthlyPrice: string; yearlyTrialDays: number | null; monthlyTrialDays: number | null;
  yearlyPromo: StorePromoPricing | null; monthlyPromo: StorePromoPricing | null;
  /** Выгода года к 12 × месяц из цен магазина; null — бейджа нет (ничего не выдумываем). */
  savingsPct: number | null;
}) {
  const onPress = useCallback((plan: PaywallPlan) => {
    const input = { tapped: plan, selected, busy, hasPrice: !!(plan === 'yearly' ? yearlyPrice : monthlyPrice) };
    const action = duoTapAction(input);
    logDuoTap(input, action);
    if (action === 'select') onSelect(plan);
    else if (action === 'buy') onBuy();
  }, [busy, monthlyPrice, onBuy, onSelect, selected, yearlyPrice]);
  return (
    <View testID="paywall-duo-plans" accessibilityRole="radiogroup" style={S.list}>
      <Row lang={lang} g={g} plan="yearly" tier="ultra" on={selected === 'yearly'} busy={busy} disabled={busy}
        price={yearlyPrice} promo={yearlyPromo} trialDays={yearlyTrialDays} savingsPct={savingsPct} onPress={onPress} />
      <Row lang={lang} g={g} plan="monthly" tier="plus" on={selected === 'monthly'} busy={busy} disabled={busy}
        price={monthlyPrice} promo={monthlyPromo} trialDays={monthlyTrialDays} savingsPct={null} onPress={onPress} />
    </View>
  );
});

const S = StyleSheet.create({
  list: { gap: DUO_PLAN_GAP },
  row: { overflow: 'hidden', minHeight: DUO_PLAN_MIN_HEIGHT, borderRadius: 22, paddingVertical: 14, paddingHorizontal: 18, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  // макет: тень 0 14 34 −12 цветом уровня под выбранной кнопкой
  rowOn: { shadowOpacity: 0.65, shadowRadius: 17, shadowOffset: { width: 0, height: 14 }, elevation: 8 },
  disabled: { opacity: DISABLED_OPACITY },
  side: { flex: 1, minWidth: 0 },
  nameRow: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 6 },
  name: { fontSize: 17, lineHeight: 22, fontWeight: '700', letterSpacing: -0.17 },
  save: { minHeight: 20, paddingHorizontal: 8, borderRadius: 10, justifyContent: 'center' },
  saveText: { fontSize: 13, lineHeight: 17, fontWeight: '700', fontVariant: ['tabular-nums'] },
  small: { fontSize: 13, lineHeight: 17, marginTop: 2, opacity: 0.86 },
  cost: { flexShrink: 0, alignItems: 'flex-end', justifyContent: 'center', minWidth: 72 },
  price: { fontWeight: '900', fontVariant: ['tabular-nums'], textAlign: 'right' },
  strike: { fontSize: 13, lineHeight: 17, opacity: 0.7, textDecorationLine: 'line-through', fontVariant: ['tabular-nums'] },
});
