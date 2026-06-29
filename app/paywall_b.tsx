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
import { View, Text, Animated, Easing, ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, Stack } from 'expo-router';
import { useLang } from '../components/LangContext';
import { type Lang } from '../constants/i18n';
import { MOTION_SPRING_LEGACY } from '../constants/motion';
import { normalizePremiumContext, getPaywallCopy, getHeroPlannedCopy, makeLP, applyWinBackCopy, applyWinBackPlannedCopy } from './paywall_copy';
import { getStatsCache } from './statsCache';
import { usePaywallPurchase } from './paywall_purchase';
import { logPaywallFunnel } from './paywall_funnel';
import { trackEvent } from './analytics';
import { collectPaywallStats, pickPaywallTags, trackPaywallTagsShown, type PersonalizedTag } from './paywall_personalization';
import { readProgressMirror, isMirrorWorthShowing, type ProgressMirror } from './paywall_progress_mirror';
import { readPaywallProfile, type PaywallProfile, type PaywallLang } from './paywall_profile';
import { pickPercentileLine } from './paywall_percentile_line';
import { loadPercentileData } from './daily_analytics_sync';
import { pickTestimonials, type Testimonial } from './paywall_testimonials';
import {
  usePaywallChrome, PaywallGlyphCapsule, PaywallSocialRow,
  PaywallPersonalTags, PaywallCloseButton,
  PaywallPriceRetry, PaywallTestimonials, PaywallBackground, type PaywallBackgroundHandle,
  usePaywallScreenStackOptions,
} from '../components/paywall/paywallShared';
import PaywallGreetingLine from '../components/paywall/PaywallGreetingLine';
import PaywallPlanCards from '../components/paywall/PaywallPlanCards';
import PaywallCtaBlock from '../components/paywall/PaywallCtaBlock';
import { MirrorCard, PercentileCard, CompareCard, FaqCard } from '../components/paywall/PaywallProofCards';
import PaywallTrialTimeline from '../components/paywall/PaywallTrialTimeline';
import PaywallPriceUrgency from '../components/paywall/PaywallPriceUrgency';
import PaywallLegalDisclosure from '../components/paywall/PaywallLegalDisclosure';
import { ctaLabelFor, ctaSubLineFor, periodLabelFor } from '../components/paywall/paywallScreenCopy';
import { hapticTap } from '../hooks/use-haptics';

const VARIANT = 'B' as const;

export default function PaywallB() {
  const params = useLocalSearchParams<{ context?: string; source?: string; _force_trial_ui?: string }>();
  const ctx = normalizePremiumContext(params.context);
  const source = (Array.isArray(params.source) ? params.source[0] : params.source) || 'direct';
  const forceTrialUI = (Array.isArray(params._force_trial_ui) ? params._force_trial_ui[0] : params._force_trial_ui) === '1';
  const isOnboarding = source === 'onboarding_plan';
  // Стабильная ссылка опций экрана — иначе <Stack.Screen> зацикливает setOptions.
  const screenOptions = usePaywallScreenStackOptions(isOnboarding);
  const { lang } = useLang();
  const LP = makeLP(lang as Lang);
  const chrome = usePaywallChrome();
  const insets = useSafeAreaInsets();
  const p = usePaywallPurchase({ variant: VARIANT, context: ctx, source, lang: lang as Lang, forceTrialUI });

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
    void trackEvent('paywall_shown', { context: ctx, source, paywall: VARIANT });
    logPaywallFunnel('shown', { variant: VARIANT, context: ctx });
  }, [ctx, source]);

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
    try {
      const dayHash = Math.floor(Date.now() / 86_400_000);
      setTestimonials(pickTestimonials(lang as Lang, ctx, dayHash, 2, false));
    } catch { /* некритично */ }
    return () => { dead = true; };
  }, [ctx, lang]);

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

  const opacity = useRef(new Animated.Value(0)).current;
  const slideY = useRef(new Animated.Value(20)).current;
  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, { toValue: 1, duration: 260, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
      Animated.spring(slideY, { toValue: 0, tension: MOTION_SPRING_LEGACY.panel.tension, friction: MOTION_SPRING_LEGACY.panel.friction, useNativeDriver: true }),
    ]).start();
  }, [opacity, slideY]);

  const hadPremiumEver = getStatsCache().hadPremiumEver;
  const copy = applyWinBackCopy(getPaywallCopy(ctx), ctx, hadPremiumEver);
  const planned = applyWinBackPlannedCopy(getHeroPlannedCopy(ctx, 0), ctx, hadPremiumEver);
  const title = LP(copy.titleRu, copy.titleUk, copy.titleEs, planned.title);
  const subtitle = LP(copy.subtitleRu, copy.subtitleUk, copy.subtitleEs, planned.subtitle);

  const isLifetimeSel = p.selected === 'lifetime';
  const price = isLifetimeSel ? p.lifetimePrice : p.selected === 'yearly' ? p.yearlyPrice : p.monthlyPrice;
  const period = periodLabelFor(lang as Lang, p.selected);
  const ctaLabel = ctaLabelFor(lang as Lang, p.trialDays, isLifetimeSel);
  const subLine = ctaSubLineFor(lang as Lang, { price, period, hasTrial: !!p.trialDays, isLifetime: isLifetimeSel });
  const priceLine = price ? `${price}${period}` : '';

  return (
    <PaywallBackground ref={bgRef} isOnboarding={isOnboarding} gradientColors={chrome.bgColors} style={S.root}>
      <Stack.Screen options={screenOptions} />
      <SafeAreaView style={S.safe}>
        <Animated.View style={[S.wrap, { opacity, transform: [{ translateY: slideY }] }]}>
          <ScrollView
            showsVerticalScrollIndicator={false}
            decelerationRate="normal"
            contentContainerStyle={S.scrollContent}
          >
            <PaywallCloseButton
              onPress={() => { hapticTap(); closeWithDim('close'); }}
              chrome={chrome}
            />

            {/* Про триал говорит таймлайн ниже (честный «сегодня→напомним→списание»);
                верхний ribbon убран, чтобы не дублировать (P1-5). */}
            <PaywallGlyphCapsule ctx={ctx} chrome={chrome} />
            <Text style={[S.title, { color: chrome.textPrimary }]} numberOfLines={2}>{title}</Text>
            <Text style={[S.subtitle, { color: chrome.textMuted }]}>{subtitle}</Text>

            <PaywallSocialRow lang={lang as Lang} chrome={chrome} />

            {tags.length > 0 && (
              <PaywallPersonalTags texts={tags.map((tag) => LP(tag.ru, tag.uk, tag.es, tag))} chrome={chrome} />
            )}

            {/* Персональное обращение по имени + прогресс + цель. */}
            <PaywallGreetingLine lang={lang as Lang} chrome={chrome} profile={profile} mirror={mirror} />

            {mirror && <MirrorCard lang={lang as Lang} chrome={chrome} mirror={mirror} />}
            {percentileLine && <PercentileCard lang={lang as Lang} chrome={chrome} line={percentileLine} />}
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
              trialDays={null /* триал объяснён лентой выше — без дубля */}
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
              isLifetime={isLifetimeSel}
            />

            <View style={S.ctaWrap}>
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
              />
            </View>

            <PaywallLegalDisclosure
              lang={lang as Lang}
              chrome={chrome}
              priceLabel={price}
              periodLabel={period}
              hasTrial={!!p.trialDays}
              trialDays={p.trialDays}
              isLifetime={isLifetimeSel}
            />
            <View style={{ height: Math.max(insets.bottom, 10) }} />
          </ScrollView>
        </Animated.View>
      </SafeAreaView>
    </PaywallBackground>
  );
}

const S = StyleSheet.create({
  root: { flex: 1 },
  safe: { flex: 1 },
  wrap: { flex: 1 },
  scrollContent: { paddingHorizontal: 20, paddingBottom: 12 },
  title: {
    fontSize: 27, fontWeight: '800', letterSpacing: -1.1,
    lineHeight: 32, textAlign: 'center', marginTop: 14,
  },
  subtitle: { fontSize: 13, lineHeight: 18.5, textAlign: 'center', marginTop: 8 },
  ctaWrap: { marginTop: 16 },
});
