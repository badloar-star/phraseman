// ════════════════════════════════════════════════════════════════════════════
// PaywallPlusScreen.tsx — экран единственного пейвола Plus.
//
// Рендерится диспетчером /premium_modal после проверки доступа (entry). Покупка,
// восстановление, цены и пробный — общий хук usePaywallPurchase (логика покупки
// не менялась). Здесь: сборка блоков по макету paywall-v3, аналитика показа,
// защита жестов на время оплаты и экран «Напомнить о конце пробного?» после покупки.
// ════════════════════════════════════════════════════════════════════════════
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { BackHandler, Platform, StyleSheet, View } from 'react-native';
import { Stack, useLocalSearchParams } from 'expo-router';

import { useLang } from '../LangContext';
import { useTheme } from '../ThemeContext';
import { LinearGradient } from '../SafeLinearGradient';
import type { Lang } from '../../constants/i18n';
import { liquidGlassTokens } from '../../constants/liquidGlassThemePalette';
import { useStableSafeAreaInsets } from '../../app/stable_safe_area_metrics';
import { usePaywallPurchase, type PaywallPlan } from '../../app/paywall_purchase';
import { paywallEntryAnalyticsParams, type PaywallEntry } from '../../app/paywall_entry_contract';
import { parseResumeLessonId } from '../../app/paywall_lesson_continuation';
import { logPaywallFunnel } from '../../app/paywall_funnel';
import { trackEvent } from '../../app/analytics';
import { createPaywallAnalyticsImpression, paywallImpressionParams } from '../../app/paywall_analytics_impression';
import { animateNextLayoutTransition } from '../../app/smooth_layout';
import { DebugLogger } from '../../app/debug-logger';
import { usePaywallScreenStackOptions } from './paywallShared';
import {
  PaywallPlusDetails, PaywallPlusDock, PaywallPlusHeader, PaywallPlusPlans, PaywallPlusPlansSkeleton,
  PaywallPlusPricesError, PaywallPlusScroll, PaywallPlusTrialTimeline, paywallPlusCtaCopy,
  type PaywallPlusState,
} from './PaywallPlus';
import PaywallTrialReminderPrompt from './PaywallTrialReminderPrompt';

/** Метка единственного пейвола в аналитике и воронке. */
export const PAYWALL_PLUS_VARIANT = 'PLUS' as const;

type Params = { _force_trial_ui?: string | string[]; resume_kind?: string; resume_lesson_id?: string };

function firstParam(raw: string | string[] | undefined): string | undefined {
  return Array.isArray(raw) ? raw[0] : raw;
}

export default function PaywallPlusScreen({ entry }: { readonly entry: PaywallEntry }) {
  const params = useLocalSearchParams<Params>();
  const { lang: rawLang } = useLang();
  const lang = rawLang as Lang;
  const { liquidGlassThemeId } = useTheme();
  // зачем: пейвол целиком на токенах АКТИВНОЙ темы — меняешь тему, меняется пейвол.
  // зачем (темы 2.0): без useMemo — токены зависят ещё от уровня цвета и оформления; поиск кэширован.
  const g = liquidGlassTokens(liquidGlassThemeId);
  const insets = useStableSafeAreaInsets();
  const ctx = entry.context;
  const source = entry.source;
  const forceTrialUI = firstParam(params._force_trial_ui) === '1';
  const resumeLessonId = params.resume_kind === 'course_lesson' ? parseResumeLessonId(params.resume_lesson_id) : null;
  const [impression] = useState(() => createPaywallAnalyticsImpression(() => entry.impressionId));
  const entryAnalytics = useMemo(() => paywallEntryAnalyticsParams(entry), [entry]);

  const p = usePaywallPurchase({
    variant: PAYWALL_PLUS_VARIANT, context: ctx, source, lang, forceTrialUI, resumeLessonId, impression,
    disableExitOffer: true,
  });

  useEffect(() => {
    void trackEvent('paywall_shown', { context: ctx, source, paywall: PAYWALL_PLUS_VARIANT, ...entryAnalytics, ...paywallImpressionParams(impression) });
    logPaywallFunnel('shown', { variant: PAYWALL_PLUS_VARIANT, context: ctx });
  }, [ctx, entryAnalytics, impression, source]);

  const state: PaywallPlusState = p.offeringsFailed ? 'error' : p.loading ? 'loading' : 'ready';
  const pricesReady = state === 'ready' && !!p.yearlyPrice;
  // Пробный — ТОЛЬКО из магазина и только когда цены реально пришли.
  const yearlyTrialDays = pricesReady ? p.yearlyTrialDays : null;
  const monthlyTrialDays = pricesReady && p.selected === 'monthly' ? p.trialDays : null;
  const showTimeline = !!yearlyTrialDays && p.selected === 'yearly';

  useEffect(() => {
    DebugLogger.info('[PAYWALL-PLUS]', `состояние=${state} план=${p.selected} год=${p.yearlyPrice || '—'} месяц=${p.monthlyPrice || '—'} `
      + `пробныйГода=${yearlyTrialDays ?? 'нет'} лента=${showTimeline} ctx=${ctx} source=${source}`);
  }, [ctx, p.monthlyPrice, p.selected, p.yearlyPrice, showTimeline, source, state, yearlyTrialDays]);

  // Мгновенный выбор тарифа; лента пробного появляется/уходит плавно, без скачка.
  const { selected, selectPlan: selectPlanInHook } = p;
  const selectPlan = useCallback((plan: PaywallPlan) => {
    if (plan === selected) return;
    animateNextLayoutTransition();
    selectPlanInHook(plan);
  }, [selectPlanInHook, selected]);

  const checkoutInFlight = p.purchasing || p.restoring;
  const prompt = p.trialReminderPrompt;
  const baseOptions = usePaywallScreenStackOptions(false);
  const screenOptions = useMemo(() => (checkoutInFlight || prompt
    ? { ...baseOptions, gestureEnabled: false }
    : baseOptions), [baseOptions, checkoutInFlight, prompt]);

  // Android «назад»: во время оплаты — игнор; на экране напоминания — как «Не сейчас».
  const { skipTrialReminder } = p;
  useEffect(() => {
    if (Platform.OS !== 'android' || (!checkoutInFlight && !prompt)) return undefined;
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      if (prompt) skipTrialReminder();
      return true;
    });
    return () => sub.remove();
  }, [checkoutInFlight, prompt, skipTrialReminder]);

  // зачем: въезд листа из макета (pw-in) здесь НЕ повторяем — Performance Bible и
  // paywall_navigation_smooth_contract требуют готовый контент в первом кадре модала.

  const yearlyPromo = pricesReady ? p.storePromo.yearly : null;
  const monthlyPromo = pricesReady ? p.storePromo.monthly : null;
  const cta = paywallPlusCtaCopy(lang, {
    selected: p.selected, yearlyPrice: p.yearlyPrice, monthlyPrice: p.monthlyPrice, yearlyTrialDays, monthlyTrialDays,
    yearlyPromo, monthlyPromo,
  });

  return (
    <View style={[S.root, { backgroundColor: g.bg }]}>
      <Stack.Screen options={screenOptions} />
      <LinearGradient pointerEvents="none" colors={[g.bgTop, g.bg, g.bgBottom]} style={StyleSheet.absoluteFill} />
      {prompt ? (
        <PaywallTrialReminderPrompt lang={lang} g={g} topInset={insets.top} bottomInset={insets.bottom}
          onAllow={p.allowTrialReminder} onSkip={p.skipTrialReminder} />
      ) : (
        <View style={[S.sheet, { paddingTop: insets.top }]}>
          <PaywallPlusHeader lang={lang} g={g} trialDays={yearlyTrialDays} closeDisabled={checkoutInFlight}
            onClose={() => p.handleClose('close')} />
          <PaywallPlusScroll>
            {showTimeline && yearlyTrialDays
              ? <PaywallPlusTrialTimeline lang={lang} g={g} trialDays={yearlyTrialDays} yearlyPrice={yearlyPromo?.promoPriceString || p.yearlyPrice} />
              : null}
            {state === 'loading' ? <PaywallPlusPlansSkeleton g={g} /> : null}
            {state === 'error' ? <PaywallPlusPricesError lang={lang} g={g} onRetry={p.reloadOfferings} /> : null}
            {state === 'ready' ? (
              <PaywallPlusPlans lang={lang} g={g} selected={p.selected} onSelect={selectPlan} disabled={checkoutInFlight}
                yearlyPrice={p.yearlyPrice} yearlyPerMonth={p.yearlyPerMonth} monthlyPrice={p.monthlyPrice}
                yearlyTrialDays={yearlyTrialDays} monthlyTrialDays={monthlyTrialDays}
                yearlyPromo={yearlyPromo} monthlyPromo={monthlyPromo} />
            ) : null}
            <PaywallPlusDetails lang={lang} g={g} restoring={p.restoring}
              restoreDisabled={checkoutInFlight || state === 'loading'} onRestore={() => { void p.handleRestore(); }} />
          </PaywallPlusScroll>
          <PaywallPlusDock lang={lang} g={g} state={state} label={cta.label} fine={cta.fine}
            purchasing={p.purchasing} disabled={p.ctaDisabled} bottomInset={insets.bottom}
            onPress={() => { void p.handlePurchase(); }} />
        </View>
      )}
    </View>
  );
}

const S = StyleSheet.create({
  root: { flex: 1 },
  sheet: { flex: 1 },
});
