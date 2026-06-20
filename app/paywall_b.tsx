// ════════════════════════════════════════════════════════════════════════════
// paywall_b.tsx — вариант B «Стори» (эксперимент paywall_ab).
//
// Гипотеза B: длинная страница убеждения (кейс OMENA: лендинг-пейвол удвоил
// старты триала) — лента триала, контекст-герой, личные теги, зеркало
// прогресса, сравнение, отзывы (ТОЛЬКО verified — пока их нет, секции нет),
// планы и CTA внизу. Обязательная страховка: sticky-CTA, цена и кнопка
// никогда не покидают экран.
// ════════════════════════════════════════════════════════════════════════════
import React, { useEffect, useRef, useState } from 'react';
import { View, Text, Animated, Easing, ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams } from 'expo-router';
import { LinearGradient } from '../components/SafeLinearGradient';
import { useLang } from '../components/LangContext';
import { type Lang } from '../constants/i18n';
import { MOTION_SPRING_LEGACY } from '../constants/motion';
import { normalizePremiumContext, getPaywallCopy, getHeroPlannedCopy, makeLP } from './paywall_copy';
import { usePaywallPurchase } from './paywall_purchase';
import { logPaywallFunnel } from './paywall_funnel';
import { trackEvent } from './analytics';
import { collectPaywallStats, pickPaywallTags, trackPaywallTagsShown, type PersonalizedTag } from './paywall_personalization';
import { readProgressMirror, isMirrorWorthShowing, type ProgressMirror } from './paywall_progress_mirror';
import { pickTestimonials, type Testimonial } from './paywall_testimonials';
import {
  usePaywallChrome, PaywallGlyphCapsule, PaywallSocialRow,
  PaywallStickyBar, useStickyCta, PaywallPersonalTags, PaywallCloseButton,
  PaywallPriceRetry, PaywallTestimonials, PaywallExitTrialModal,
} from '../components/paywall/paywallShared';
import PaywallPlanCards from '../components/paywall/PaywallPlanCards';
import PaywallCtaBlock from '../components/paywall/PaywallCtaBlock';
import { MirrorCard, CompareCard } from '../components/paywall/PaywallProofCards';
import PaywallTrialTimeline from '../components/paywall/PaywallTrialTimeline';
import PaywallPriceUrgency from '../components/paywall/PaywallPriceUrgency';
import PaywallLegalDisclosure from '../components/paywall/PaywallLegalDisclosure';
import { ctaLabelFor, ctaSubLineFor, periodLabelFor, stickyStringsFor } from '../components/paywall/paywallScreenCopy';
import { hapticTap } from '../hooks/use-haptics';

const VARIANT = 'B' as const;

export default function PaywallB() {
  const params = useLocalSearchParams<{ context?: string; source?: string }>();
  const ctx = normalizePremiumContext(params.context);
  const source = (Array.isArray(params.source) ? params.source[0] : params.source) || 'direct';
  const { lang } = useLang();
  const LP = makeLP(lang as Lang);
  const chrome = usePaywallChrome();
  const insets = useSafeAreaInsets();
  const p = usePaywallPurchase({ variant: VARIANT, context: ctx, source, lang: lang as Lang });
  const sticky = useStickyCta();

  const [tags, setTags] = useState<PersonalizedTag[]>([]);
  const [mirror, setMirror] = useState<ProgressMirror | null>(null);
  const [testimonials, setTestimonials] = useState<Testimonial[]>([]);

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
    })();
    // Анти-фейк гард: в прод уходят только verified-отзывы; нет verified — секции нет.
    try {
      const dayHash = Math.floor(Date.now() / 86_400_000);
      setTestimonials(pickTestimonials(lang as Lang, ctx, dayHash, 2, false));
    } catch { /* некритично */ }
    return () => { dead = true; };
  }, [ctx, lang]);

  const opacity = useRef(new Animated.Value(0)).current;
  const slideY = useRef(new Animated.Value(20)).current;
  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, { toValue: 1, duration: 260, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
      Animated.spring(slideY, { toValue: 0, tension: MOTION_SPRING_LEGACY.panel.tension, friction: MOTION_SPRING_LEGACY.panel.friction, useNativeDriver: true }),
    ]).start();
  }, [opacity, slideY]);

  const copy = getPaywallCopy(ctx);
  const planned = getHeroPlannedCopy(ctx, 0);
  const title = LP(copy.titleRu, copy.titleUk, copy.titleEs, planned.title);
  const subtitle = LP(copy.subtitleRu, copy.subtitleUk, copy.subtitleEs, planned.subtitle);

  const isLifetimeSel = p.selected === 'lifetime';
  const price = isLifetimeSel ? p.lifetimePrice : p.selected === 'yearly' ? p.yearlyPrice : p.monthlyPrice;
  const period = periodLabelFor(lang as Lang, p.selected);
  const ctaLabel = ctaLabelFor(lang as Lang, p.trialDays, isLifetimeSel);
  const subLine = ctaSubLineFor(lang as Lang, { price, period, hasTrial: !!p.trialDays, isLifetime: isLifetimeSel });
  const stickyStrings = stickyStringsFor(lang as Lang, { trialDays: p.trialDays, price, period, isLifetime: isLifetimeSel });

  return (
    <LinearGradient colors={chrome.bgColors} start={{ x: 0.5, y: 0 }} end={{ x: 0.5, y: 1 }} style={S.root}>
      <SafeAreaView style={S.safe}>
        <Animated.View style={[S.wrap, { opacity, transform: [{ translateY: slideY }] }]} onLayout={sticky.onViewportLayout}>
          <ScrollView
            showsVerticalScrollIndicator={false}
            decelerationRate="normal"
            contentContainerStyle={S.scrollContent}
            onScroll={sticky.onScroll}
            scrollEventThrottle={32}
          >
            <PaywallCloseButton
              onPress={() => { hapticTap(); p.handleClose('close'); }}
              chrome={chrome}
            />

            {/* Про триал говорит таймлайн ниже (честный «сегодня→напомним→списание»);
                верхний ribbon убран, чтобы не дублировать (P1-5). */}
            <PaywallGlyphCapsule ctx={ctx} chrome={chrome} />
            <Text style={[S.title, { color: chrome.textPrimary }]} adjustsFontSizeToFit numberOfLines={2}>{title}</Text>
            <Text style={[S.subtitle, { color: chrome.textMuted }]}>{subtitle}</Text>

            <PaywallSocialRow lang={lang as Lang} chrome={chrome} />

            {tags.length > 0 && (
              <PaywallPersonalTags texts={tags.map((tag) => LP(tag.ru, tag.uk, tag.es, tag))} chrome={chrome} />
            )}

            {mirror && <MirrorCard lang={lang as Lang} chrome={chrome} mirror={mirror} />}
            <CompareCard lang={lang as Lang} chrome={chrome} />

            <PaywallTestimonials items={testimonials} lang={lang as Lang} chrome={chrome} />

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
            />

            <View style={S.ctaWrap} onLayout={sticky.onCtaLayout}>
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
                onContinueFree={() => p.handleClose('continue_free')}
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
            <View style={{ height: Math.max(insets.bottom, 10) + 64 }} />
          </ScrollView>

          <PaywallStickyBar
            visible={sticky.visible && !p.purchasing}
            title={stickyStrings.title}
            sub={stickyStrings.sub}
            button={stickyStrings.button}
            onPress={() => { void p.handlePurchase(); }}
            chrome={chrome}
          />
        </Animated.View>
        <PaywallExitTrialModal
          visible={p.exitOfferVisible}
          lang={lang as Lang}
          chrome={chrome}
          trialDays={p.trialDays ?? 3}
          onAccept={p.acceptExitOffer}
          onDismiss={() => p.dismissExitOffer('close')}
        />
      </SafeAreaView>
    </LinearGradient>
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
