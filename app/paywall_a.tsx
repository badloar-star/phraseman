import { useStableSafeAreaInsets } from './stable_safe_area_metrics';
// ════════════════════════════════════════════════════════════════════════════
// paywall_a.tsx — вариант A «Компакт» (эксперимент paywall_ab).
//
// Гипотеза A: всё решающее на одном экране, ноль скролла, минимум текста.
// Наследник v2 после чистки: контекстный заголовок (26 контекстов из
// paywall_copy — у v2 был один generic), честная соцстрока (рейтинг только из
// конфига), годовой default + честный −N% + цена/день, CTA с ценой под ним.
// Без таймлайна и галереи доказательств — это дифференциаторы C.
// ════════════════════════════════════════════════════════════════════════════
import React, { useEffect, useRef, useState } from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, Stack } from 'expo-router';
import * as Crypto from 'expo-crypto';
import Ionicons from '@expo/vector-icons/Ionicons';

import { useLang } from '../components/LangContext';
import { type Lang } from '../constants/i18n';
import {
  normalizePremiumContext, getPaywallCopy, getHeroPlannedCopy,
  applyWinBackCopy, applyWinBackPlannedCopy,
  CONTEXT_BENEFITS, getContextBenefitPlanned, makeLP,
} from './paywall_copy';
import { getStatsCache } from './statsCache';
import { usePaywallPurchase } from './paywall_purchase';
import { logPaywallFunnel } from './paywall_funnel';
import { trackEvent } from './analytics';
import { trackPaywallExperimentExposure } from './analytics_experiments';
import { createPaywallAnalyticsImpression, paywallImpressionParams } from './paywall_analytics_impression';
import { collectPaywallStats, pickPaywallTags, trackPaywallTagsShown, type PersonalizedTag } from './paywall_personalization';
import { readProgressMirror, isMirrorWorthShowing, type ProgressMirror } from './paywall_progress_mirror';
import { readPaywallProfile, type PaywallProfile, type PaywallLang } from './paywall_profile';
import { pickTestimonials, type Testimonial } from './paywall_testimonials';
import { isPaywallReviewsEnabled } from './remote_flags';
import {
  usePaywallChrome, PaywallGlyphCapsule, PaywallSocialRow, PaywallCloseButton,
  PaywallPriceRetry, PaywallTestimonials, PaywallBackground, type PaywallBackgroundHandle,
  usePaywallScreenStackOptions, PaywallStickyBar, useStickyCta,
} from '../components/paywall/paywallShared';
import { PersonalizationProofCard } from '../components/paywall/PaywallProofCards';
import PaywallPlanCards from '../components/paywall/PaywallPlanCards';
import PaywallCtaBlock from '../components/paywall/PaywallCtaBlock';
import PaywallPriceUrgency from '../components/paywall/PaywallPriceUrgency';
import PaywallTrialTimeline from '../components/paywall/PaywallTrialTimeline';
import PaywallLegalDisclosure from '../components/paywall/PaywallLegalDisclosure';
import { ctaLabelFor, ctaSubLineFor, periodLabelFor, stickyStringsFor } from '../components/paywall/paywallScreenCopy';
import { hapticTap } from '../hooks/use-haptics';
import { parseSoftUpsellAttribution, softUpsellAnalyticsParams } from './soft_upsell_attribution';

const VARIANT = 'A' as const;

export default function PaywallA() {
  const params = useLocalSearchParams<Record<string, string | string[]>>();
  const [softAttribution] = useState(() => parseSoftUpsellAttribution(params));
  const ctx = normalizePremiumContext(params.context);
  const source = (Array.isArray(params.source) ? params.source[0] : params.source) || 'direct';
  const forceTrialUI = (Array.isArray(params._force_trial_ui) ? params._force_trial_ui[0] : params._force_trial_ui) === '1';
  const isOnboarding = source === 'onboarding_plan';
  // Стабильная ссылка опций экрана — иначе <Stack.Screen> зацикливает setOptions.
  const screenOptions = usePaywallScreenStackOptions(isOnboarding);
  const { lang } = useLang();
  const LP = makeLP(lang as Lang);
  const chrome = usePaywallChrome(isOnboarding ? 'midnight' : undefined);
  const insets = useStableSafeAreaInsets();
  const [analyticsImpression] = useState(() => createPaywallAnalyticsImpression(Crypto.randomUUID));
  const p = usePaywallPurchase({ variant: VARIANT, context: ctx, source, lang: lang as Lang, forceTrialUI, impression: analyticsImpression, softAttribution });
  const sticky = useStickyCta();

  const [personalTag, setPersonalTag] = useState<PersonalizedTag | null>(null);
  const [mirror, setMirror] = useState<ProgressMirror | null>(null);
  const [profile, setProfile] = useState<PaywallProfile | null>(null);
  const [testimonials, setTestimonials] = useState<Testimonial[]>([]);

  // Онбординг: перед уходом на следующий шаг (закрытие/«продолжить бесплатно»)
  // проигрываем обратное осветление фона, затем навигируем.
  const bgRef = useRef<PaywallBackgroundHandle>(null);
  const closeWithDim = (reason: 'close' | 'continue_free') => {
    if (isOnboarding && bgRef.current) {
      bgRef.current.animateExit(() => p.handleClose(reason));
    } else {
      p.handleClose(reason);
    }
  };

  useEffect(() => {
    void trackEvent('paywall_shown', { context: ctx, source, paywall: VARIANT, ...paywallImpressionParams(analyticsImpression), ...softUpsellAnalyticsParams(softAttribution, 'paywall_shown') } as never);
    void trackPaywallExperimentExposure(VARIANT, analyticsImpression.id);
    logPaywallFunnel('shown', { variant: VARIANT, context: ctx });
  }, [analyticsImpression, ctx, softAttribution, source]);

  useEffect(() => {
    let dead = false;
    void (async () => {
      try {
        const stats = await collectPaywallStats();
        const tags = pickPaywallTags(stats, 1);
        if (!dead) {
          if (tags.length > 0) setPersonalTag(tags[0]);
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
      setTestimonials(isPaywallReviewsEnabled() ? pickTestimonials(lang as Lang, ctx, dayHash, 3, false) : []);
    } catch { /* некритично */ }
    return () => { dead = true; };
  }, [source, ctx, lang]);

  // Вернувшийся юзер (Premium стал фри/истёк) видит win-back заголовок «верни
  // доступ» вместо неактуального «получить впервые». См. applyWinBackCopy.
  const hadPremiumEver = getStatsCache().hadPremiumEver;
  const copy = applyWinBackCopy(getPaywallCopy(ctx), ctx, hadPremiumEver);
  const planned = applyWinBackPlannedCopy(getHeroPlannedCopy(ctx, 0), ctx, hadPremiumEver);
  const title = LP(copy.titleRu, copy.titleUk, copy.titleEs, planned.title);
  const benefits = (CONTEXT_BENEFITS[ctx] ?? CONTEXT_BENEFITS.generic).slice(0, 4);

  const price = p.selected === 'lifetime' ? p.lifetimePrice : p.selected === 'yearly' ? p.yearlyPrice : p.monthlyPrice;
  const period = periodLabelFor(lang as Lang, p.selected);
  const isLifetimeSel = p.selected === 'lifetime';
  const stickyCopy = stickyStringsFor(lang as Lang, { trialDays: p.trialDays, price, period, isLifetime: isLifetimeSel });

  return (
    <PaywallBackground ref={bgRef} isOnboarding={isOnboarding} gradientColors={chrome.bgColors} style={S.root}>
      <Stack.Screen options={screenOptions} />
      <SafeAreaView style={S.safe}>
        <View style={S.wrap}>
          {!isOnboarding ? (
            <PaywallCloseButton
              onPress={() => { hapticTap(); closeWithDim('close'); }}
              chrome={chrome}
              style={{ marginTop: Math.max(insets.top - 38, 6) }}
            />
          ) : null}

          {/* На обычных телефонах помещается без скролла (flexGrow:1 + спейсер
              прижимает CTA вниз); на маленьких — мягко скроллится. */}
          <ScrollView
            showsVerticalScrollIndicator={false}
            decelerationRate="normal"
            contentContainerStyle={[S.scroll, isOnboarding && S.scrollOnboardingStickyPad]}
            onLayout={isOnboarding ? sticky.onViewportLayout : undefined}
            onScroll={isOnboarding ? sticky.onScroll : undefined}
            scrollEventThrottle={32}
          >
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
                trialDays={null /* триал объяснён таймлайном ниже — без дубля */}
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
                label={ctaLabelFor(lang as Lang, p.trialDays, isLifetimeSel)}
                subLine={ctaSubLineFor(lang as Lang, { price, period, hasTrial: !!p.trialDays, isLifetime: isLifetimeSel })}
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
              tagTexts={personalTag ? [LP(personalTag.ru, personalTag.uk, personalTag.es, personalTag)] : []}
              profile={profile}
              mirror={mirror}
            />

            {/* Полный таймлайн триала «сегодня→напомним→списание» теперь и на «Компакт»:
                показывается только при реальной бесплатной intro-фазе из стора. */}
            {p.trialDays && (
              <PaywallTrialTimeline
                lang={lang as Lang}
                chrome={chrome}
                days={p.trialDays}
                priceLabel={price || '…'}
                periodLabel={period}
              />
            )}

            <View style={S.benefits}>
              {benefits.map((b, i) => (
                <View key={i} style={S.benefitRow}>
                  <Ionicons name="checkmark-circle" size={17} color={chrome.textMuted} />
                  <Text style={[S.benefitText, { color: chrome.textMuted }]}>
                    {LP(b.ru, b.uk, b.es, getContextBenefitPlanned(ctx, i))}
                  </Text>
                </View>
              ))}
            </View>

            <PaywallTestimonials items={testimonials} lang={lang as Lang} chrome={chrome} />

            <View style={S.spacer} />

            <PaywallLegalDisclosure
              lang={lang as Lang}
              chrome={chrome}
              priceLabel={price}
              periodLabel={period}
              hasTrial={!!p.trialDays}
              trialDays={p.trialDays}
              isLifetime={isLifetimeSel}
            />
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
  wrap: { flex: 1, paddingHorizontal: 22, paddingBottom: 12 },
  scroll: { flexGrow: 1, paddingBottom: 6 },
  scrollOnboardingStickyPad: { paddingBottom: 96 },
  title: {
    fontSize: 31, fontWeight: '900', letterSpacing: 0,
    lineHeight: 36, textAlign: 'center', marginTop: 15,
  },
  ctaWrap: { marginTop: 17 },
  benefits: { gap: 10, marginTop: 16 },
  benefitRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  benefitText: { flex: 1, fontSize: 14, lineHeight: 19.5 },
  spacer: { flex: 1, minHeight: 10 },
});
