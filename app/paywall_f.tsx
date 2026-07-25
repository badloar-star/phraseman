import { useStableSafeAreaInsets } from './stable_safe_area_metrics';
// ════════════════════════════════════════════════════════════════════════════
// paywall_f.tsx — вариант F «Честный триал» (эксперимент paywall_ab).
//
// Гипотеза F: доверие через прозрачность — таймлайн триала («сегодня →
// напомним → списание») идёт ПЕРВЫМ содержательным блоком сразу под заголовком,
// до планов и цен. Пользователь сначала понимает, что платить сейчас не нужно,
// и только потом выбирает план. Если триала нет — героем становится
// персональное доказательство. Дальше: компактные карточки планов, CTA
// (внутри уже честная строка «Платить сейчас не нужно…»), соцстрока, legal.
// ════════════════════════════════════════════════════════════════════════════
import React, { useEffect, useRef, useState } from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, Stack } from 'expo-router';
import * as Crypto from 'expo-crypto';

import { useLang } from '../components/LangContext';
import { type Lang } from '../constants/i18n';
import {
  resolvePaywallContext, getPaywallCopy, getHeroPlannedCopy,
  applyWinBackCopy, applyWinBackPlannedCopy, makeLP,
} from './paywall_copy';
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
import {
  usePaywallChrome, PaywallGlyphCapsule, PaywallHeroExplain, PaywallSocialRow, PaywallCloseButton,
  PaywallPriceRetry, PaywallBackground, type PaywallBackgroundHandle,
  usePaywallScreenStackOptions, PaywallStickyBar, useStickyCta,
} from '../components/paywall/paywallShared';
import { PersonalizationProofCard } from '../components/paywall/PaywallProofCards';
import PaywallPlanCards from '../components/paywall/PaywallPlanCards';
import PaywallCtaBlock from '../components/paywall/PaywallCtaBlock';
import PaywallTrialTimeline from '../components/paywall/PaywallTrialTimeline';
import PaywallLegalDisclosure from '../components/paywall/PaywallLegalDisclosure';
import { PaywallEntrance } from '../components/paywall/PaywallMotion';
import { ctaLabelFor, ctaSubLineFor, periodLabelFor, stickyStringsFor } from '../components/paywall/paywallScreenCopy';
import { hapticTap } from '../hooks/use-haptics';

const VARIANT = 'F' as const;

export default function PaywallF() {
  const params = useLocalSearchParams<{ context?: string; source?: string; _force_trial_ui?: string; resume_kind?: string; resume_lesson_id?: string }>();
  const ctx = resolvePaywallContext(params.context, params.source);
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
  const [analyticsImpression] = useState(() => createPaywallAnalyticsImpression(Crypto.randomUUID));
  const p = usePaywallPurchase({ variant: VARIANT, context: ctx, source, lang: lang as Lang, forceTrialUI, resumeLessonId, impression: analyticsImpression });
  const sticky = useStickyCta();

  const [personalTag, setPersonalTag] = useState<PersonalizedTag | null>(null);
  const [mirror, setMirror] = useState<ProgressMirror | null>(null);
  const [profile, setProfile] = useState<PaywallProfile | null>(null);

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
    return () => { dead = true; };
  }, [source, ctx, lang]);

  // Вернувшийся юзер (Premium стал фри/истёк) видит win-back заголовок.
  const hadPremiumEver = getStatsCache().hadPremiumEver;
  const copy = applyWinBackCopy(getPaywallCopy(ctx), ctx, hadPremiumEver);
  const planned = applyWinBackPlannedCopy(getHeroPlannedCopy(ctx, 0), ctx, hadPremiumEver);
  const title = LP(copy.titleRu, copy.titleUk, copy.titleEs, planned.title);
  const subtitle = LP(copy.subtitleRu, copy.subtitleUk, copy.subtitleEs, planned.subtitle);

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

          <ScrollView
            showsVerticalScrollIndicator={false}
            decelerationRate="normal"
            contentContainerStyle={[S.scroll, isOnboarding && S.scrollOnboardingStickyPad]}
            onLayout={isOnboarding ? sticky.onViewportLayout : undefined}
            onScroll={isOnboarding ? sticky.onScroll : undefined}
            scrollEventThrottle={32}
          >
            <PaywallEntrance index={0}>
              <PaywallGlyphCapsule ctx={ctx} chrome={chrome} />
            </PaywallEntrance>

            <PaywallEntrance index={1}>
              <Text style={[S.title, { color: chrome.textPrimary }]} numberOfLines={3}>{title}</Text>
              <PaywallHeroExplain ctx={ctx} chrome={chrome} lang={lang as Lang} subtitle={subtitle} />
            </PaywallEntrance>

            {/* ГЕРОЙ ЭКРАНА — таймлайн триала ДО планов: сначала прозрачность,
                потом цены. Без триала героем становится личное доказательство. */}
            <PaywallEntrance index={2}>
              {p.trialDays ? (
                <View style={S.heroTimeline}>
                  <PaywallTrialTimeline
                    lang={lang as Lang}
                    chrome={chrome}
                    days={p.trialDays}
                    priceLabel={price || '…'}
                    periodLabel={period}
                  />
                </View>
              ) : (
                <PersonalizationProofCard
                  lang={lang as Lang}
                  chrome={chrome}
                  tagTexts={personalTag ? [LP(personalTag.ru, personalTag.uk, personalTag.es, personalTag)] : []}
                  profile={profile}
                  mirror={mirror}
                />
              )}
            </PaywallEntrance>

            <PaywallEntrance index={3}>
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
                  trialDays={null /* триал уже объяснён таймлайном-героем — без дубля */}
                  loading={p.loading}
                  disabled={p.purchasing}
                  lifetimePrice={p.lifetimePrice}
                  lifetimeAvailable={p.lifetimeAvailable}
                />
              )}
            </PaywallEntrance>

            <PaywallEntrance index={4} style={S.ctaWrap} onLayout={isOnboarding ? sticky.onCtaLayout : undefined}>
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
            </PaywallEntrance>

            <PaywallEntrance index={5}>
              <PaywallSocialRow lang={lang as Lang} chrome={chrome} />
            </PaywallEntrance>

            <View style={S.spacer} />

            <PaywallEntrance index={6}>
              <PaywallLegalDisclosure
                lang={lang as Lang}
                chrome={chrome}
                priceLabel={price}
                periodLabel={period}
                hasTrial={!!p.trialDays}
                trialDays={p.trialDays}
                isLifetime={isLifetimeSel}
              />
            </PaywallEntrance>
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
  // paddingTop 14: глиф-капсула — первый блок; её гало выступает на haloInset 6px
  // и idle-float поднимает ещё на 5px — без запаса сверху верх капсулы/свечения
  // обрезался о край ScrollView.
  scroll: { flexGrow: 1, paddingTop: 14, paddingBottom: 6 },
  scrollOnboardingStickyPad: { paddingBottom: 96 },
  title: {
    fontSize: 31, fontWeight: '900', letterSpacing: 0,
    lineHeight: 36, textAlign: 'center', marginTop: 15,
  },
  heroTimeline: { marginTop: 2 },
  ctaWrap: { marginTop: 17 },
  spacer: { flex: 1, minHeight: 10 },
});
