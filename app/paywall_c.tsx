// ════════════════════════════════════════════════════════════════════════════
// paywall_c.tsx — вариант C «Атриум» (рекомендация ресёрча; эксперимент paywall_ab).
//
// Гипотеза C (гибрид): первый экран самодостаточен БЕЗ скролла — контекст-герой,
// ЛИЧНАЯ строка, таймлайн триала (Blinkist: +23% стартов, −55% жалоб), планы,
// CTA с ценой. Ниже фолда — «галерея доказательств» для сомневающихся (зеркало
// прогресса, перцентиль, сравнение, FAQ, повторный CTA). Цена и кнопка никогда
// не покидают экран: sticky-бар появляется, как только CTA уходит из вьюпорта.
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
import { pickPercentileLine } from './paywall_percentile_line';
import { loadPercentileData } from './daily_analytics_sync';
import {
  usePaywallChrome, PaywallGlyphCapsule, PaywallSectionDivider,
  PaywallStickyBar, useStickyCta, PaywallPersonalTags, PaywallCloseButton,
} from '../components/paywall/paywallShared';
import PaywallPlanCards from '../components/paywall/PaywallPlanCards';
import PaywallCtaBlock from '../components/paywall/PaywallCtaBlock';
import PaywallTrialTimeline from '../components/paywall/PaywallTrialTimeline';
import PaywallPriceUrgency from '../components/paywall/PaywallPriceUrgency';
import { MirrorCard, PercentileCard, CompareCard, FaqCard } from '../components/paywall/PaywallProofCards';
import {
  ctaLabelFor, ctaSubLineFor, periodLabelFor, stickyStringsFor, doubtersDividerLabel,
} from '../components/paywall/paywallScreenCopy';
import { hapticTap } from '../hooks/use-haptics';

const VARIANT = 'C' as const;
/** Глубины скролла галереи — впервые узнаем, сколько юзеров читает доказательства. */
const SCROLL_DEPTH_MARKS = [25, 50, 75, 100] as const;

export default function PaywallC() {
  const params = useLocalSearchParams<{ context?: string; source?: string }>();
  const ctx = normalizePremiumContext(params.context);
  const source = (Array.isArray(params.source) ? params.source[0] : params.source) || 'direct';
  const { lang } = useLang();
  const LP = makeLP(lang as Lang);
  const chrome = usePaywallChrome();
  const insets = useSafeAreaInsets();
  const p = usePaywallPurchase({ variant: VARIANT, context: ctx, source, lang: lang as Lang });
  const sticky = useStickyCta();

  const [personalTag, setPersonalTag] = useState<PersonalizedTag | null>(null);
  const [mirror, setMirror] = useState<ProgressMirror | null>(null);
  const [percentileLine, setPercentileLine] = useState<string | null>(null);
  const scrollDepthSent = useRef(new Set<number>());

  useEffect(() => {
    void trackEvent('paywall_shown', { context: ctx, source, paywall: VARIANT });
    logPaywallFunnel('shown', { variant: VARIANT, context: ctx });
  }, [ctx, source]);

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
    })();
    return () => { dead = true; };
  }, []);

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

  const copy = getPaywallCopy(ctx);
  const planned = getHeroPlannedCopy(ctx, 0);
  const title = LP(copy.titleRu, copy.titleUk, copy.titleEs, planned.title);

  const isLifetimeSel = p.selected === 'lifetime';
  const price = isLifetimeSel ? p.lifetimePrice : p.selected === 'yearly' ? p.yearlyPrice : p.monthlyPrice;
  const period = periodLabelFor(lang as Lang, p.selected);
  const ctaLabel = ctaLabelFor(lang as Lang, p.trialDays, isLifetimeSel);
  const subLine = ctaSubLineFor(lang as Lang, { price, period, hasTrial: !!p.trialDays, isLifetime: isLifetimeSel });
  const stickyStrings = stickyStringsFor(lang as Lang, { trialDays: p.trialDays, price, period, isLifetime: isLifetimeSel });
  const priceLine = price ? `${price}${period}` : '';

  return (
    <LinearGradient colors={chrome.bgColors} start={{ x: 0.5, y: 0 }} end={{ x: 0.5, y: 1 }} style={S.root}>
      <SafeAreaView style={S.safe}>
        <Animated.View style={[S.wrap, { opacity, transform: [{ translateY: slideY }] }]} onLayout={sticky.onViewportLayout}>
          <ScrollView
            showsVerticalScrollIndicator={false}
            decelerationRate="normal"
            contentContainerStyle={S.scrollContent}
            onScroll={(e) => {
              sticky.onScroll(e);
              const { contentOffset, contentSize, layoutMeasurement } = e.nativeEvent;
              const span = Math.max(1, contentSize.height - layoutMeasurement.height);
              const depth = Math.min(100, Math.round((contentOffset.y / span) * 100));
              for (const mark of SCROLL_DEPTH_MARKS) {
                if (depth >= mark && !scrollDepthSent.current.has(mark)) {
                  scrollDepthSent.current.add(mark);
                  void trackEvent('paywall_scroll_depth', { context: ctx, paywall: VARIANT, depth: mark });
                }
              }
            }}
            scrollEventThrottle={32}
          >
            <PaywallCloseButton
              onPress={() => { hapticTap(); p.handleClose('close'); }}
              chrome={chrome}
            />

            <PaywallGlyphCapsule ctx={ctx} chrome={chrome} />
            <Text style={[S.title, { color: chrome.textPrimary }]} adjustsFontSizeToFit numberOfLines={2}>{title}</Text>

            <Text style={[S.personal, { color: chrome.textMuted }]} numberOfLines={2}>
              {LP(copy.subtitleRu, copy.subtitleUk, copy.subtitleEs, planned.subtitle)}
            </Text>

            {/* Личный тег — отдельным chip, не сливается с подзаголовком (P1-4). */}
            {personalTag && (
              <PaywallPersonalTags texts={[LP(personalTag.ru, personalTag.uk, personalTag.es, personalTag)]} chrome={chrome} />
            )}

            {p.trialDays && (
              <PaywallTrialTimeline
                lang={lang as Lang}
                chrome={chrome}
                days={p.trialDays}
                priceLabel={price || '…'}
                periodLabel={period}
              />
            )}

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
              trialDays={null /* триал уже объяснён таймлайном — без дубля */}
              loading={p.loading}
              disabled={p.purchasing}
              lifetimePrice={p.lifetimePrice}
              lifetimeAvailable={p.lifetimeAvailable}
            />

            <PaywallPriceUrgency
              lang={lang as Lang}
              chrome={chrome}
              urgency={p.urgency}
              currentPrice={price}
              futurePrice={p.futurePrice}
              period={period}
              compact
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

            {/* ── галерея доказательств: скроллить НЕ обязательно ── */}
            <PaywallSectionDivider label={doubtersDividerLabel(lang as Lang)} chrome={chrome} />
            {mirror && <MirrorCard lang={lang as Lang} chrome={chrome} mirror={mirror} />}
            {percentileLine && <PercentileCard lang={lang as Lang} chrome={chrome} line={percentileLine} />}
            <CompareCard lang={lang as Lang} chrome={chrome} />
            <FaqCard lang={lang as Lang} chrome={chrome} trialDays={p.trialDays} priceLine={priceLine} />

            <View style={S.repeatCta}>
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
                hideFooter
              />
            </View>
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
  personal: { fontSize: 13, lineHeight: 18.5, textAlign: 'center', marginTop: 8 },
  ctaWrap: { marginTop: 16 },
  repeatCta: { marginTop: 16 },
});
