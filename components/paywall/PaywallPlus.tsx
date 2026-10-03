// ════════════════════════════════════════════════════════════════════════════
// PaywallPlus.tsx — ЕДИНСТВЕННЫЙ пейвол Plus (владелец 2026-09-30, макет
// paywall-v3.html «Честный пробный период»; все прочие пейволы A–G удалены, D78).
//
// Правила владельца, которые держит этот файл:
//  • цена за ГОД — главная и крупная, «≈ X в месяц» у года — мелко
//    («сторы отклоняют если наоборот», Apple 3.1.2);
//  • пробный период — ТОЛЬКО из магазина (purchase.yearlyTrialDays) и только если
//    доступен; лента пробного — если пробный есть И выбран год И цены загружены;
//  • кнопка закреплена внизу, сравнение раскрывается на месте, никаких окон;
//  • все цвета — токены АКТИВНОЙ темы (темы бесплатны), своих цветов нет.
// ════════════════════════════════════════════════════════════════════════════
import React, { memo, useEffect, useRef } from 'react';
import { ActivityIndicator, Animated, Linking, ScrollView, StyleSheet, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';

import type { Lang } from '../../constants/i18n';
import type { liquidGlassTokens } from '../../constants/liquidGlassThemePalette';
import type { PaywallPlan } from '../../app/paywall_purchase';
import type { StorePromoPricing } from '../../app/premium_store_promo_display';
import { canPromiseTrialReminder, trialReminderDayNumber } from '../../app/trial_end_reminder_schedule';
import { DebugLogger } from '../../app/debug-logger';
import { useReduceMotion } from '../../hooks/use_reduce_motion';
import { LinearGradient } from '../SafeLinearGradient';
import V2Pressable from '../v2/V2Pressable';
import { useV2GlassStyle, V2GlassSheen } from '../v2/V2Glass';
import { PaywallPlusBenefits, PaywallPlusComparison } from './PaywallBenefitComparison';
import {
  COPY, chargeLine, ctaBuyMonth, ctaBuyYear, ctaStartTrial, fineAfterTrial, fineThenMonth, heroTrialTitle,
  pick, reminderDayTitle, trialFreeLabel, yearPerMonthApprox,
} from './PaywallPlusCopy';

export type GlassTokens = ReturnType<typeof liquidGlassTokens>;
export type PaywallPlusState = 'ready' | 'loading' | 'error';

const TERMS_URL = 'https://phraseman.app/terms';
const PRIVACY_URL = 'https://phraseman.app/privacy';

// зачем (темы 2.0, проверка в эмуляторе 30.09): выбор тарифа, плашка «Выгоднее всего» и значок
// пробного периода красятся в цвет темы в «Акценте/Максимуме» — иначе в светлом режиме они
// оставались чёрными рядом с синей кнопкой. В «Спокойно» — прежние g.text / g.bg.
function markFill(g: GlassTokens): string { return g.level === 'accent' || g.level === 'max' ? g.accent : g.text; }
function markInk(g: GlassTokens): string { return g.level === 'accent' || g.level === 'max' ? g.accentInk : g.bg; }

function openLegal(url: string): void {
  Linking.openURL(url).catch((e: unknown) => {
    DebugLogger.error('[PAYWALL-PLUS] openLegal', e instanceof Error ? e : new Error(String(e)), 'warning');
  });
}

// ── шапка ───────────────────────────────────────────────────────────────────
export const PaywallPlusHeader = memo(function PaywallPlusHeader({ lang, g, trialDays, closeDisabled, onClose }: {
  lang: Lang; g: GlassTokens; trialDays: number | null; closeDisabled: boolean; onClose: () => void;
}) {
  return (
    <View>
      <View style={[S.handle, { backgroundColor: g.glassEdge }]} />
      <View style={S.topRow}>
        <Text style={[S.kicker, { color: g.secondary }]}>{pick(lang, COPY.kicker)}</Text>
        <V2Pressable
          testID="paywall-close"
          accessibilityLabel={pick(lang, COPY.close)}
          disabled={closeDisabled}
          onPress={onClose}
          withHaptic={false}
          scaleTo={0.92}
          style={[S.close, { backgroundColor: g.opaqueControl }]}
        >
          <Ionicons name="close" size={18} color={g.text} />
        </V2Pressable>
      </View>
      <Text accessibilityRole="header" style={[S.h1, { color: g.text }]}>
        {trialDays ? heroTrialTitle(lang, trialDays) : pick(lang, COPY.heroNoTrial)}
      </Text>
      {trialDays && canPromiseTrialReminder(trialDays)
        ? <Text style={[S.sub, { color: g.secondary }]}>{pick(lang, COPY.heroTrialSub)}</Text>
        : null}
    </View>
  );
});

// ── лента пробного: Сегодня → День N−2 → День N ────────────────────────────
export const PaywallPlusTrialTimeline = memo(function PaywallPlusTrialTimeline({ lang, g, trialDays, yearlyPrice }: {
  lang: Lang; g: GlassTokens; trialDays: number; yearlyPrice: string;
}) {
  const glass = useV2GlassStyle();
  const reminderDay = trialReminderDayNumber(trialDays);
  const steps: { icon: keyof typeof Ionicons.glyphMap; title: string; detail: string }[] = [
    { icon: 'gift-outline', title: pick(lang, COPY.today), detail: pick(lang, COPY.todayDetail) },
    ...(reminderDay ? [{ icon: 'notifications-outline' as const, title: reminderDayTitle(lang, reminderDay), detail: pick(lang, COPY.reminderDetail) }] : []),
    { icon: 'card-outline', title: reminderDayTitle(lang, trialDays), detail: chargeLine(lang, yearlyPrice) },
  ];
  return (
    <View testID="paywall-trial-timeline" style={[S.card, S.timeline, glass]}>
      <V2GlassSheen seed={0} />
      {steps.map((step, index) => {
        const first = index === 0;
        const last = index === steps.length - 1;
        return (
          <View key={step.icon} style={S.tlRow}>
            <View style={S.tlRail}>
              <View style={[S.tlDot, { backgroundColor: first ? markFill(g) : g.opaqueControl }]}>
                <Ionicons name={step.icon} size={16} color={first ? markInk(g) : g.text} />
              </View>
              {last ? null : <View style={[S.tlLine, { backgroundColor: g.glassEdge }]} />}
            </View>
            <View style={[S.tlCopy, !last && S.tlCopyGap]}>
              <Text style={[S.tlTitle, { color: g.text }]}>{step.title}</Text>
              <Text style={[S.tlDetail, { color: g.secondary }]}>{step.detail}</Text>
            </View>
          </View>
        );
      })}
    </View>
  );
});

// ── тарифы ──────────────────────────────────────────────────────────────────
function Radio({ on, g }: { on: boolean; g: GlassTokens }) {
  return (
    <View style={[S.radio, { backgroundColor: on ? markFill(g) : g.opaqueControl }]}>
      {on ? <Ionicons name="checkmark" size={14} color={markInk(g)} /> : null}
    </View>
  );
}

export const PaywallPlusPlans = memo(function PaywallPlusPlans({
  lang, g, selected, onSelect, disabled, yearlyPrice, yearlyPerMonth, monthlyPrice, yearlyTrialDays, monthlyTrialDays,
  yearlyPromo, monthlyPromo,
}: {
  lang: Lang; g: GlassTokens; selected: PaywallPlan; onSelect: (plan: PaywallPlan) => void; disabled: boolean;
  yearlyPrice: string; yearlyPerMonth: string; monthlyPrice: string;
  yearlyTrialDays: number | null; monthlyTrialDays: number | null;
  /** Скидка стора на первый период (владелец 2026-09-04: «написано = спишется»). */
  yearlyPromo: StorePromoPricing | null; monthlyPromo: StorePromoPricing | null;
}) {
  const glass = useV2GlassStyle();
  const yearOn = selected === 'yearly';
  const monthOn = selected === 'monthly';
  // Выбранный тариф: тон подложки + тонкая светлая кромка (исключение 2.0: 1px полупрозрачная).
  const selectedRing = { backgroundColor: g.selected, borderColor: g.level === 'accent' || g.level === 'max' ? g.accentCap : g.lightTint, borderWidth: 1 }; // guard-ok: D43 1px кромка выбора
  return (
    <View>
      <V2Pressable
        testID="paywall-plan-yearly"
        accessibilityRole="radio"
        accessibilityState={{ selected: yearOn, checked: yearOn, disabled }}
        disabled={disabled || !yearlyPrice}
        onPress={() => onSelect('yearly')}
        withHaptic={false}
        scaleTo={0.98}
        style={[S.card, S.plan, glass, yearOn && selectedRing]}
      >
        <V2GlassSheen seed={1} />
        <View style={S.planTop}>
          <Radio on={yearOn} g={g} />
          <View style={S.planMid}>
            <View style={S.planNameRow}>
              <Text style={[S.planName, { color: g.text }]}>{pick(lang, COPY.year)}</Text>
              <View style={[S.badge, { backgroundColor: markFill(g) }]}>
                <Text style={[S.badgeText, { color: markInk(g) }]}>{pick(lang, COPY.bestValue)}</Text>
              </View>
            </View>
            {/* Мелко: «≈ X в месяц». Главная цена года — справа, крупно. */}
            {yearlyPerMonth ? <Text style={[S.planSmall, { color: g.secondary }]}>{yearPerMonthApprox(lang, yearlyPerMonth)}</Text> : null}
          </View>
          <View style={S.planPrice}>
            {yearlyPromo ? <Text testID="paywall-year-standard" style={[S.priceStrike, { color: g.mutedText }]}>{yearlyPromo.standardPriceString}</Text> : null}
            <Text testID="paywall-year-price" style={[S.priceBig, { color: g.text }]}>{yearlyPromo?.promoPriceString || yearlyPrice}</Text>
            <Text style={[S.priceSmall, { color: g.secondary }]}>{pick(lang, COPY.perYear)}</Text>
          </View>
        </View>
        {yearlyTrialDays ? (
          <View testID="paywall-trial-plate" style={[S.trialPlate, { backgroundColor: g.selected }]}>
            <View style={[S.trialIcon, { backgroundColor: markFill(g) }]}>
              <Ionicons name="gift-outline" size={16} color={markInk(g)} />
            </View>
            <Text style={[S.trialText, { color: g.text }]}>{trialFreeLabel(lang, yearlyTrialDays)}</Text>
          </View>
        ) : null}
      </V2Pressable>

      <V2Pressable
        testID="paywall-plan-monthly"
        accessibilityRole="radio"
        accessibilityState={{ selected: monthOn, checked: monthOn, disabled }}
        disabled={disabled || !monthlyPrice}
        onPress={() => onSelect('monthly')}
        withHaptic={false}
        scaleTo={0.98}
        outerStyle={S.planGap}
        style={[S.card, S.plan, S.planTop, glass, monthOn && selectedRing]}
      >
        <V2GlassSheen seed={3} />
        <Radio on={monthOn} g={g} />
        <View style={S.planMid}>
          <Text style={[S.planName, { color: g.text }]}>{pick(lang, COPY.month)}</Text>
          <Text style={[S.planSmall, { color: g.secondary }]}>
            {monthlyTrialDays ? trialFreeLabel(lang, monthlyTrialDays) : pick(lang, COPY.noTrial)}
          </Text>
        </View>
        <View style={S.planPrice}>
          {monthlyPromo ? <Text style={[S.priceStrike, { color: g.mutedText }]}>{monthlyPromo.standardPriceString}</Text> : null}
          <Text testID="paywall-month-price" style={[S.priceMonth, { color: g.text }]}>{monthlyPromo?.promoPriceString || monthlyPrice}</Text>
          <Text style={[S.priceSmall, { color: g.secondary }]}>{pick(lang, COPY.perMonth)}</Text>
        </View>
      </V2Pressable>
    </View>
  );
});

// ── цены грузятся: скелет той же высоты, что и карточки ────────────────────
export const PaywallPlusPlansSkeleton = memo(function PaywallPlusPlansSkeleton({ g }: { g: GlassTokens }) {
  const reduceMotion = useReduceMotion();
  const pulse = useRef(new Animated.Value(0.55)).current;
  useEffect(() => {
    if (reduceMotion) { pulse.setValue(0.75); return undefined; }
    const loop = Animated.loop(Animated.sequence([
      Animated.timing(pulse, { toValue: 1, duration: 650, useNativeDriver: true }),
      Animated.timing(pulse, { toValue: 0.55, duration: 650, useNativeDriver: true }),
    ]));
    loop.start();
    return () => loop.stop();
  }, [pulse, reduceMotion]);
  return (
    <View testID="paywall-plans-skeleton" accessibilityRole="progressbar">
      <Animated.View style={[S.skeleton, { height: 132, opacity: pulse, backgroundColor: g.opaqueCard }]} />
      <Animated.View style={[S.skeleton, S.planGap, { height: 74, opacity: pulse, backgroundColor: g.opaqueCard }]} />
    </View>
  );
});

// ── цены недоступны после потолка загрузки: те же размеры, что у скелета, без красного и без иконки ──
// зачем (D158): вечный скелетон убран; на месте цен — спокойное «Сейчас недоступно», кнопка покупки жива.
export const PaywallPlusPlansUnavailable = memo(function PaywallPlusPlansUnavailable({ lang, g }: { lang: Lang; g: GlassTokens }) {
  return (
    <View testID="paywall-plans-unavailable">
      <View style={[S.skeleton, S.unavailableBox, { height: 132, backgroundColor: g.opaqueCard }]}>
        <Text style={[S.planSmall, { color: g.secondary }]}>{pick(lang, COPY.unavailable)}</Text>
      </View>
      <View style={[S.skeleton, S.planGap, { height: 74, backgroundColor: g.opaqueCard }]} />
    </View>
  );
});

// ── тело: «Что входит», «Free и Plus», ссылки ──────────────────────────────
export const PaywallPlusDetails = memo(function PaywallPlusDetails({ lang, g, restoring, restoreDisabled, onRestore }: {
  lang: Lang; g: GlassTokens; restoring: boolean; restoreDisabled: boolean; onRestore: () => void;
}) {
  return (
    <View>
      <Text style={[S.sectionLabel, { color: g.mutedText }]}>{pick(lang, COPY.whatsIncluded)}</Text>
      <PaywallPlusBenefits lang={lang} g={g} />
      <Text style={[S.sectionLabel, { color: g.mutedText }]}>{pick(lang, COPY.freeVsPlus)}</Text>
      <PaywallPlusComparison lang={lang} g={g} />
      <View style={S.links}>
        <V2Pressable testID="paywall-restore" withHaptic={false} scaleTo={0.95} disabled={restoreDisabled}
          accessibilityState={{ busy: restoring }} onPress={onRestore} style={S.linkHit}>
          <Text style={[S.link, { color: g.mutedText }]}>{pick(lang, restoring ? COPY.restoring : COPY.restore)}</Text>
        </V2Pressable>
        <V2Pressable accessibilityRole="link" scaleTo={0.95} onPress={() => openLegal(TERMS_URL)} style={S.linkHit}>
          <Text style={[S.link, { color: g.mutedText }]}>{pick(lang, COPY.terms)}</Text>
        </V2Pressable>
        <V2Pressable accessibilityRole="link" scaleTo={0.95} onPress={() => openLegal(PRIVACY_URL)} style={S.linkHit}>
          <Text style={[S.link, { color: g.mutedText }]}>{pick(lang, COPY.privacy)}</Text>
        </V2Pressable>
      </View>
    </View>
  );
});

// ── закреплённая кнопка ─────────────────────────────────────────────────────
export function paywallPlusCtaCopy(lang: Lang, args: {
  selected: PaywallPlan; yearlyPrice: string; monthlyPrice: string;
  yearlyTrialDays: number | null; monthlyTrialDays: number | null;
  yearlyPromo: StorePromoPricing | null; monthlyPromo: StorePromoPricing | null;
}): { label: string; fine: string } {
  // Списание = первая платная фаза стора (промо-цена, если есть), дальше — обычная.
  if (args.selected === 'monthly') {
    const charge = args.monthlyPromo?.promoPriceString || args.monthlyPrice;
    const fine = args.monthlyTrialDays || args.monthlyPromo ? fineThenMonth(lang, args.monthlyPromo?.standardPriceString || args.monthlyPrice) : pick(lang, COPY.fineMonth);
    return { label: args.monthlyTrialDays ? ctaStartTrial(lang, args.monthlyTrialDays) : ctaBuyMonth(lang, charge), fine };
  }
  const yearCharge = args.yearlyPromo?.promoPriceString || args.yearlyPrice;
  if (args.yearlyTrialDays) {
    return { label: ctaStartTrial(lang, args.yearlyTrialDays), fine: fineAfterTrial(lang, yearCharge) };
  }
  return {
    label: ctaBuyYear(lang, yearCharge),
    fine: args.yearlyPromo ? fineAfterTrial(lang, args.yearlyPromo.standardPriceString) : pick(lang, COPY.fineYear),
  };
}

export const PaywallPlusDock = memo(function PaywallPlusDock({ lang, g, state, label, fine, notice, purchasing, disabled, bottomInset, onPress }: {
  lang: Lang; g: GlassTokens; state: PaywallPlusState; label: string; fine: string; notice: boolean;
  purchasing: boolean; disabled: boolean; bottomInset: number; onPress: () => void;
}) {
  const ready = state === 'ready';
  // зачем (D158): кнопка покупки ВСЕГДА активна, кроме самой покупки/восстановления (disabled от экрана).
  // Нет цен — тап сам загрузит offerings и купит. Подпись под кнопкой — тихая: либо «Попробуй через минуту»
  // после сбоя тапа, либо мелкий текст тарифа; строка резервируется, чтобы геометрия не прыгала.
  const ctaDisabled = disabled;
  const fineText = notice ? pick(lang, COPY.tryInMinute) : ready ? fine : '\u00A0';
  return (
    <View style={[S.dock, { paddingBottom: Math.max(bottomInset, 16) }]}>
      <LinearGradient pointerEvents="none" colors={['transparent', g.bg]} locations={[0, 0.22]} style={StyleSheet.absoluteFill} />
      <V2Pressable
        testID="paywall-cta"
        accessibilityLabel={label}
        accessibilityState={{ disabled: ctaDisabled, busy: purchasing }}
        disabled={ctaDisabled}
        onPress={onPress}
        withHaptic={false}
        scaleTo={0.97}
        style={[S.cta, { backgroundColor: g.accent }]}
      >
        {purchasing
          ? <ActivityIndicator color={g.ctaInk} />
          : <Text style={[S.ctaText, { color: g.accentInk }]}>{label}</Text>}
      </V2Pressable>
      <Text testID="paywall-fine" style={[S.fine, { color: g.mutedText }]}>{fineText}</Text>
    </View>
  );
});

/** Прокручиваемое тело — отдельный экспорт, чтобы экран собирал порядок блоков по макету. */
export function PaywallPlusScroll({ children }: { children: React.ReactNode }) {
  return (
    <ScrollView style={S.scroll} contentContainerStyle={S.scrollContent} showsVerticalScrollIndicator={false}>
      {children}
    </ScrollView>
  );
}

const S = StyleSheet.create({
  handle: { width: 40, height: 5, borderRadius: 3, alignSelf: 'center', marginTop: 8 },
  topRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingLeft: 20, paddingRight: 14, marginTop: 6 },
  kicker: { fontSize: 13, fontWeight: '700', letterSpacing: 2.4 },
  close: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  h1: { marginTop: 8, marginHorizontal: 20, fontSize: 31, lineHeight: 36, fontWeight: '800', letterSpacing: -0.7 },
  sub: { marginTop: 6, marginHorizontal: 20, fontSize: 16, lineHeight: 22 },
  scroll: { flex: 1 },
  scrollContent: { paddingTop: 14, paddingHorizontal: 16, paddingBottom: 18 },
  card: { borderRadius: 22 },
  timeline: { paddingTop: 16, paddingHorizontal: 16, paddingBottom: 4, marginBottom: 12 },
  tlRow: { flexDirection: 'row', gap: 12 },
  tlRail: { width: 36, alignItems: 'center' },
  tlDot: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  tlLine: { flex: 1, width: 2, borderRadius: 1, marginVertical: 2 },
  tlCopy: { flex: 1, minWidth: 0, paddingTop: 2, paddingBottom: 12 },
  tlCopyGap: { paddingBottom: 16 },
  tlTitle: { fontSize: 16, lineHeight: 22, fontWeight: '700' },
  tlDetail: { marginTop: 2, fontSize: 13, lineHeight: 17 },
  plan: { paddingVertical: 16, paddingLeft: 18, paddingRight: 16 },
  planGap: { marginTop: 10 },
  planTop: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  planMid: { flex: 1, minWidth: 0 },
  planNameRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 8 },
  planName: { fontSize: 16, lineHeight: 22, fontWeight: '700' },
  planSmall: { marginTop: 3, fontSize: 13, lineHeight: 18 },
  planPrice: { alignItems: 'flex-end' },
  // зачем: сумма за год — самая крупная цена экрана (22), месяц — меньше (18),
  // «≈ в месяц» у года — мелкая подпись (13.5). Магазины требуют именно так.
  priceBig: { fontSize: 22, lineHeight: 27, fontWeight: '800', letterSpacing: -0.3, fontVariant: ['tabular-nums'] },
  priceMonth: { fontSize: 16, lineHeight: 22, fontWeight: '700', fontVariant: ['tabular-nums'] },
  priceSmall: { fontSize: 13, lineHeight: 18 },
  priceStrike: { fontSize: 13, lineHeight: 18, textDecorationLine: 'line-through', fontVariant: ['tabular-nums'] },
  radio: { width: 24, height: 24, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  badge: { minHeight: 22, paddingHorizontal: 9, borderRadius: 11, justifyContent: 'center' },
  badgeText: { fontSize: 13, fontWeight: '700' },
  trialPlate: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 12, paddingVertical: 10, paddingHorizontal: 12, borderRadius: 14 },
  trialIcon: { width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  trialText: { flex: 1, fontSize: 19, lineHeight: 24, fontWeight: '800', letterSpacing: -0.2 },
  skeleton: { borderRadius: 22 },
  unavailableBox: { alignItems: 'center', justifyContent: 'center' },
  errorRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 14, paddingLeft: 16, paddingRight: 14 },
  iconTile: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  errorCopy: { flex: 1, minWidth: 0 },
  errorTitle: { fontSize: 16, lineHeight: 22, fontWeight: '700' },
  errorSub: { marginTop: 2, fontSize: 13, lineHeight: 17 },
  retry: { minHeight: 44, paddingHorizontal: 16, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  retryText: { fontSize: 16, fontWeight: '700' },
  sectionLabel: { marginTop: 22, marginBottom: 10, marginHorizontal: 4, fontSize: 13, fontWeight: '700', letterSpacing: 2.2 },
  links: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', marginTop: 14 },
  linkHit: { minHeight: 44, paddingHorizontal: 10, justifyContent: 'center' },
  link: { fontSize: 13, lineHeight: 18 },
  dock: { paddingTop: 14, paddingHorizontal: 16 },
  cta: { minHeight: 58, borderRadius: 29, paddingHorizontal: 20, paddingVertical: 12, alignItems: 'center', justifyContent: 'center' },
  ctaWaiting: { opacity: 0.35 },
  ctaText: { fontSize: 16, lineHeight: 22, fontWeight: '700', textAlign: 'center' },
  fine: { marginTop: 9, fontSize: 13, lineHeight: 18, textAlign: 'center', fontVariant: ['tabular-nums'] },
});
