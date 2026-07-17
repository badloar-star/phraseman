import { useStableSafeAreaInsets } from './stable_safe_area_metrics';
// ════════════════════════════════════════════════════════════════════════════
// paywall_b.tsx — вариант B «Стори» (эксперимент paywall_ab).
//
// Гипотеза B: длинная страница убеждения (кейс OMENA: лендинг-пейвол удвоил
// старты триала) — лента триала, контекст-герой, личные теги, зеркало
// прогресса, сравнение, отзывы (ТОЛЬКО verified — пока их нет, секции нет),
// планы и CTA внизу. (Плавающий sticky-CTA убран — основной кнопки «открыть
// полный доступ» достаточно, дублирующая плашка мешала.)
// ════════════════════════════════════════════════════════════════════════════
import React, { useEffect, useRef, useState } from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, Stack } from 'expo-router';
import * as Crypto from 'expo-crypto';
import { useLang } from '../components/LangContext';
import { type Lang } from '../constants/i18n';
import { normalizePremiumContext, getPaywallCopy, getHeroPlannedCopy, makeLP, applyWinBackCopy, applyWinBackPlannedCopy } from './paywall_copy';
import { getStatsCache } from './statsCache';
import { usePaywallPurchase } from './paywall_purchase';
import { parseResumeLessonId } from './paywall_lesson_continuation';
import { logPaywallFunnel } from './paywall_funnel';
import { trackEvent } from './analytics';
import { trackPaywallExperimentExposure } from './analytics_experiments';
import { createPaywallAnalyticsImpression, paywallImpressionParams } from './paywall_analytics_impression';
import { collectPaywallStats, pickPaywallTags, trackPaywallTagsShown, type PersonalizedTag } from './paywall_personalization';
import { readProgressMirror, isMirrorWorthShowing, type ProgressMirror } from './paywall_progress_mirror';
import { readPaywallProfile, type PaywallProfile, type PaywallLang } from './paywall_profile';
import { pickPercentileLine } from './paywall_percentile_line';
import { loadPercentileData } from './daily_analytics_sync';
import { pickTestimonials, type Testimonial } from './paywall_testimonials';
import { isPaywallReviewsEnabled } from './remote_flags';
import {
  usePaywallChrome, PaywallGlyphCapsule, PaywallSocialRow,
  PaywallCloseButton,
  PaywallPriceRetry, PaywallTestimonials, PaywallBackground, type PaywallBackgroundHandle,
  usePaywallScreenStackOptions, PaywallStickyBar, useStickyCta,
} from '../components/paywall/paywallShared';
import PaywallPlanCards from '../components/paywall/PaywallPlanCards';
import PaywallCtaBlock from '../components/paywall/PaywallCtaBlock';
import { normalizeSafeAreaBottomInset } from '../hooks/use-screen';
import { PersonalizationProofCard, CompareCard, FaqCard } from '../components/paywall/PaywallProofCards';
import PaywallTrialTimeline from '../components/paywall/PaywallTrialTimeline';
import PaywallPriceUrgency from '../components/paywall/PaywallPriceUrgency';
import PaywallLegalDisclosure from '../components/paywall/PaywallLegalDisclosure';
import { ctaLabelFor, ctaSubLineFor, periodLabelFor, stickyStringsFor } from '../components/paywall/paywallScreenCopy';
import { hapticTap } from '../hooks/use-haptics';

const VARIANT = 'B' as const;

export default function PaywallB() {
  const params = useLocalSearchParams<{ context?: string; source?: string; _force_trial_ui?: string; resume_kind?: string; resume_lesson_id?: string }>();
  const ctx = normalizePremiumContext(params.context);
  const source = (Array.isArray(params.source) ? params.source[0] : params.source) || 'direct';
  const forceTrialUI = (Array.isArray(params._force_trial_ui) ? params._force_trial_ui[0] : params._force_trial_ui) === '1';
  const resumeLessonId = params.resume_kind === 'course_lesson'
    ? parseResumeLessonId(params.resume_lesson_id)
    : null;
  const isOnboarding = source === 'onboarding_plan';
  // Стабильная ссылка опций экрана — иначе <Stack.Screen> зацикливает setOptions.
  const screenOptions = usePaywallScreenStackOptions(isOnboarding);
  const { lang } = useLang();
  const LP = makeLP(lang as Lang);
  const chrome = usePaywallChrome(isOnboarding ? 'midnight' : undefined);
  const insets = useStableSafeAreaInsets();
  const bottomInset = normalizeSafeAreaBottomInset(insets.bottom);
  const [analyticsImpression] = useState(() => createPaywallAnalyticsImpression(Crypto.randomUUID));
  const p = usePaywallPurchase({ variant: VARIANT, context: ctx, source, lang: lang as Lang, forceTrialUI, resumeLessonId, impression: analyticsImpression });
  const sticky = useStickyCta();

  const [tags, setTags] = useState<PersonalizedTag[]>([]);
  const [mirror, setMirror] = useState<ProgressMirror | null>(null);
  const [profile, setProfile] = useState<PaywallProfile | null>(null);
  const [percentileLine, setPercentileLine] = useState<string | null>(null);
  const [testimonials, setTestimonials] = useState<Testimonial[]>([]);

  // Онбординг: перед уходом на следующий шаг проигрываем обратное осветление фона.
  const bgRef = useRef<PaywallBackgroundHandle>(null);
  const closeWithDim = (reason: 'close' | 'continue_free') => {
    if (isOnboarding && bgRef.current) {
      bgRef.current.animateExit(() => p.handleClose(reason));
    } else {
      p.handleClose(reason);
    }
  };

  useEffect(() => {
    void trackEvent('paywall_shown', { context: ctx, source, paywall: VARIANT, ...paywallImpressionParams(analyticsImpression) });
    void trackPaywallExperimentExposure(VARIANT, analyticsImpression.id);
    logPaywallFunnel('shown', { variant: VARIANT, context: ctx });
  }, [analyticsImpression, ctx, source]);

  useEffect(() => {
    let dead = false;
    void (async () => {
      try {
        const stats = await collectPaywallStats();
        if (!dead) {
          const tags = pickPaywallTags(stats, 2);
          setTags(tags);
          trackPaywallTagsShown(tags, VARIANT, source);
        }
      } catch { /* некритично */ }
      try {
        const m = await readProgressMirror();
        if (!dead && isMirrorWorthShowing(m)) setMirror(m);
      } catch { /* некритично */ }
      try {
        const prof = await readPaywallProfile(lang as PaywallLang);
        if (!dead) setProfile(prof);
      } catch { /* некритично */ }
    })();
    // Анти-фейк гард: в прод уходят только verified-отзывы; нет verified — секции нет.
    // Плюс живой рубильник из «Пульта»: выкл → отзывы просто пропадают (пустой массив).
    try {
      const dayHash = Math.floor(Date.now() / 86_400_000);
      setTestimonials(isPaywallReviewsEnabled() ? pickTestimonials(lang as Lang, ctx, dayHash, 4, false) : []);
    } catch { /* некритично */ }
    return () => { dead = true; };
  }, [ctx, lang, source]);

  // Перцентиль «твоё место» из собственных данных (перенесено из C — теперь и в B).
  useEffect(() => {
    let dead = false;
    void (async () => {
      try {
        const { percentiles } = await loadPercentileData();
        const line = pickPercentileLine(ctx, percentiles, { streak: mirror?.streak ?? 0 }, lang as Lang);
        if (!dead && line) setPercentileLine(line);
      } catch { /* нет данных — молчим */ }
    })();
    return () => { dead = true; };
  }, [ctx, lang, mirror?.streak]);

  const hadPremiumEver = getStatsCache().hadPremiumEver;
  const copy = applyWinBackCopy(getPaywallCopy(ctx), ctx, hadPremiumEver);
  const planned = applyWinBackPlannedCopy(getHeroPlannedCopy(ctx, 0), ctx, hadPremiumEver);
  const title = LP(copy.titleRu, copy.titleUk, copy.titleEs, planned.title);

  const isLifetimeSel = p.selected === 'lifetime';
  const price = isLifetimeSel ? p.lifetimePrice : p.selected === 'yearly' ? p.yearlyPrice : p.monthlyPrice;
  const period = periodLabelFor(lang as Lang, p.selected);
  const ctaLabel = ctaLabelFor(lang as Lang, p.trialDays, isLifetimeSel);
  const subLine = ctaSubLineFor(lang as Lang, { price, period, hasTrial: !!p.trialDays, isLifetime: isLifetimeSel });
  const priceLine = price ? `${price}${period}` : '';
  const stickyCopy = stickyStringsFor(lang as Lang, { trialDays: p.trialDays, price, period, isLifetime: isLifetimeSel });

  return (
    <PaywallBackground ref={bgRef} isOnboarding={isOnboarding} gradientColors={chrome.bgColors} style={S.root}>
      <Stack.Screen options={screenOptions} />
      <SafeAreaView style={S.safe}>
        <View style={S.wrap}>
          <ScrollView
            showsVerticalScrollIndicator={false}
            decelerationRate="normal"
            contentContainerStyle={[S.scrollContent, isOnboarding && S.scrollOnboardingStickyPad]}
            onLayout={isOnboarding ? sticky.onViewportLayout : undefined}
            onScroll={isOnboarding ? sticky.onScroll : undefined}
            scrollEventThrottle={32}
          >
            {!isOnboarding ? (
              <PaywallCloseButton
                onPress={() => { hapticTap(); closeWithDim('close'); }}
                chrome={chrome}
              />
            ) : null}

            {/* Про триал говорит таймлайн ниже (честный «сегодня→напомним→списание»);
                верхний ribbon убран, чтобы не дублировать (P1-5). */}
            <PaywallGlyphCapsule ctx={ctx} chrome={chrome} />
            <Text style={[S.title, { color: chrome.textPrimary }]} numberOfLines={2}>{title}</Text>

            {p.offeringsFailed ? (
              <PaywallPriceRetry lang={lang as Lang} chrome={chrome} onRetry={p.reloadOfferings} />
            ) : (
              <PaywallPlanCards
                lang={lang as Lang}
                chrome={chrome}
                selected={p.selected}
                onSelect={p.selectPlan}
                yearlyPerMonth={p.yearlyPerMonth || p.yearlyPrice}
                yearlyFull={p.yearlyPrice}
                monthlyPrice={p.monthlyPerMonth || p.monthlyPrice}
                savingsPct={p.savingsPct}
                perDayLabel={p.perDayLabel}
                trialDays={null /* триал объяснён лентой ниже — без дубля */}
                loading={p.loading}
                disabled={p.purchasing}
                lifetimePrice={p.lifetimePrice}
                lifetimeAvailable={p.lifetimeAvailable}
              />
            )}

            <PaywallPriceUrgency
              lang={lang as Lang}
              chrome={chrome}
              urgency={p.urgency}
              currentPrice={price}
              futurePrice={p.futurePrice}
              period={period}
              compact
              isLifetime={isLifetimeSel}
            />

            <View style={S.ctaWrap} onLayout={isOnboarding ? sticky.onCtaLayout : undefined}>
              <PaywallCtaBlock
                lang={lang as Lang}
                chrome={chrome}
                label={ctaLabel}
                subLine={subLine}
                disabled={p.ctaDisabled}
                busy={p.purchasing}
                onPress={() => { void p.handlePurchase(); }}
                onRestore={() => { void p.handleRestore(); }}
                restoring={p.restoring}
                onContinueFree={() => closeWithDim('continue_free')}
                trustHasTrial={!!p.trialDays}
                isOnboarding={isOnboarding}
              />
            </View>

            <PaywallSocialRow lang={lang as Lang} chrome={chrome} />

            <PersonalizationProofCard
              lang={lang as Lang}
              chrome={chrome}
              tagTexts={tags.map((tag) => LP(tag.ru, tag.uk, tag.es, tag))}
              profile={profile}
              mirror={mirror}
              percentileLine={percentileLine}
            />
            <CompareCard lang={lang as Lang} chrome={chrome} />

            <PaywallTestimonials items={testimonials} lang={lang as Lang} chrome={chrome} />
            <FaqCard lang={lang as Lang} chrome={chrome} trialDays={p.trialDays} priceLine={priceLine} />

            {p.trialDays && (
              <PaywallTrialTimeline
                lang={lang as Lang}
                chrome={chrome}
                days={p.trialDays}
                priceLabel={price || '…'}
                periodLabel={period}
              />
            )}

            <PaywallLegalDisclosure
              lang={lang as Lang}
              chrome={chrome}
              priceLabel={price}
              periodLabel={period}
              hasTrial={!!p.trialDays}
              trialDays={p.trialDays}
              isLifetime={isLifetimeSel}
            />
            <View style={{ height: Math.max(bottomInset, 10) }} />
          </ScrollView>
          <PaywallStickyBar
            visible={isOnboarding && sticky.visible && !p.ctaDisabled}
            title={stickyCopy.title}
            sub={stickyCopy.sub}
            button={stickyCopy.button}
            onPress={() => { void p.handlePurchase(); }}
            chrome={chrome}
          />
        </View>
      </SafeAreaView>
    </PaywallBackground>
  );
}

const S = StyleSheet.create({
  root: { flex: 1 },
  safe: { flex: 1 },
  wrap: { flex: 1 },
  scrollContent: { paddingHorizontal: 22, paddingBottom: 14 },
  scrollOnboardingStickyPad: { paddingBottom: 96 },
  title: {
    fontSize: 31, fontWeight: '900', letterSpacing: 0,
    lineHeight: 36, textAlign: 'center', marginTop: 15,
  },
  ctaWrap: { marginTop: 17 },
});
