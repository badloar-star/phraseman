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
import { View, Text, TouchableOpacity, Animated, Easing, ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { LinearGradient } from '../components/SafeLinearGradient';
import { useLang } from '../components/LangContext';
import { triLang, type Lang } from '../constants/i18n';
import { MOTION_SPRING_LEGACY } from '../constants/motion';
import { normalizePremiumContext, getPaywallCopy, getHeroPlannedCopy, makeLP } from './paywall_copy';
import { usePaywallPurchase } from './paywall_purchase';
import { logPaywallFunnel } from './paywall_funnel';
import { trackEvent } from './analytics';
import { collectPaywallStats, pickPaywallTags, type PersonalizedTag } from './paywall_personalization';
import { readProgressMirror, isMirrorWorthShowing, type ProgressMirror } from './paywall_progress_mirror';
import { pickTestimonials, type Testimonial } from './paywall_testimonials';
import {
  usePaywallChrome, PaywallGlyphCapsule, PaywallSocialRow,
  PaywallStickyBar, useStickyCta,
} from '../components/paywall/paywallShared';
import PaywallPlanCards from '../components/paywall/PaywallPlanCards';
import PaywallCtaBlock from '../components/paywall/PaywallCtaBlock';
import { MirrorCard, CompareCard } from '../components/paywall/PaywallProofCards';
import PaywallTrialTimeline from '../components/paywall/PaywallTrialTimeline';
import PaywallPriceUrgency from '../components/paywall/PaywallPriceUrgency';
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
        if (!dead) setTags(pickPaywallTags(stats, 2));
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

  const price = p.selected === 'yearly' ? p.yearlyPrice : p.monthlyPrice;
  const period = periodLabelFor(lang as Lang, p.selected);
  const ctaLabel = ctaLabelFor(lang as Lang, p.trialDays);
  const subLine = ctaSubLineFor(lang as Lang, { price, period, hasTrial: !!p.trialDays });
  const stickyStrings = stickyStringsFor(lang as Lang, { trialDays: p.trialDays, price, period });

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
            <TouchableOpacity
              onPress={() => { hapticTap(); p.handleClose('close'); }}
              style={[S.closeBtn, { backgroundColor: chrome.cardBg, borderColor: chrome.cardBorder }]}
              hitSlop={{ top: 14, bottom: 14, left: 14, right: 14 }}
            >
              <Ionicons name="close" size={14} color={chrome.textMuted} />
            </TouchableOpacity>

            {p.trialDays && (
              <View style={[S.ribbon, { borderColor: chrome.tc.selectedCardBorder, backgroundColor: `${chrome.tc.heroAccent}14` }]}>
                <Text style={[S.ribbonTitle, { color: chrome.tc.heroAccent }]}>
                  {triLang(lang as Lang, {
                    ru: `${p.trialDays} дн. Premium бесплатно`,
                    uk: `${p.trialDays} дн. Premium безкоштовно`,
                    es: `${p.trialDays} días de Premium gratis`,
                  })}
                </Text>
                <Text style={[S.ribbonSub, { color: chrome.textMuted }]}>
                  {triLang(lang as Lang, {
                    ru: 'Без списания сейчас · Отмена в любой момент',
                    uk: 'Без списання зараз · Скасування будь-коли',
                    es: 'Sin cargo ahora · Cancela cuando quieras',
                  })}
                </Text>
              </View>
            )}

            <PaywallGlyphCapsule ctx={ctx} chrome={chrome} />
            <Text style={[S.title, { color: chrome.textPrimary }]} adjustsFontSizeToFit numberOfLines={2}>{title}</Text>
            <Text style={[S.subtitle, { color: chrome.textMuted }]}>{subtitle}</Text>

            <PaywallSocialRow lang={lang as Lang} chrome={chrome} />

            {tags.length > 0 && (
              <View style={S.tags}>
                {tags.map((tag) => (
                  <View key={tag.key} style={[S.tagRow, { backgroundColor: chrome.cardBg, borderColor: chrome.cardBorder }]}>
                    <Ionicons name="sparkles" size={14} color={chrome.tc.heroAccent} />
                    <Text style={[S.tagText, { color: chrome.textPrimary }]} numberOfLines={2}>
                      {LP(tag.ru, tag.uk, tag.es, tag)}
                    </Text>
                  </View>
                ))}
              </View>
            )}

            {mirror && <MirrorCard lang={lang as Lang} chrome={chrome} mirror={mirror} />}
            <CompareCard lang={lang as Lang} chrome={chrome} />

            {testimonials.length > 0 && (
              <View style={[S.testimonialCard, { backgroundColor: chrome.cardBg, borderColor: chrome.cardBorder }]}>
                <Text style={[S.testimonialTitle, { color: chrome.tc.heroAccent }]}>
                  {triLang(lang as Lang, { ru: 'ЧТО ГОВОРЯТ УЧЕНИКИ', uk: 'ЩО КАЖУТЬ УЧНІ', es: 'LO QUE DICEN LOS ALUMNOS' })}
                </Text>
                {testimonials.map((tm, i) => (
                  <View key={i} style={i > 0 ? { marginTop: 10 } : undefined}>
                    <Text style={[S.testimonialText, { color: chrome.textPrimary }]}>{tm.text}</Text>
                    <Text style={[S.testimonialAuthor, { color: chrome.textMuted }]}>— {tm.author}</Text>
                  </View>
                ))}
              </View>
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
              trialDays={null /* триал объяснён лентой выше — без дубля */}
              loading={p.loading}
              disabled={p.purchasing}
            />

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
  closeBtn: {
    alignSelf: 'flex-end', marginTop: 6, marginBottom: 6,
    width: 28, height: 28, borderRadius: 14, borderWidth: 1,
    alignItems: 'center', justifyContent: 'center',
  },
  ribbon: { borderRadius: 14, borderWidth: 1, paddingVertical: 11, paddingHorizontal: 12, alignItems: 'center', marginBottom: 14 },
  ribbonTitle: { fontSize: 13.5, fontWeight: '800' },
  ribbonSub: { fontSize: 10.5, marginTop: 3 },
  title: {
    fontSize: 27, fontWeight: '800', letterSpacing: -1.1,
    lineHeight: 32, textAlign: 'center', marginTop: 14,
  },
  subtitle: { fontSize: 13, lineHeight: 18.5, textAlign: 'center', marginTop: 8 },
  tags: { gap: 8, marginTop: 14 },
  tagRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    borderRadius: 13, borderWidth: 1, paddingVertical: 10, paddingHorizontal: 13,
  },
  tagText: { flex: 1, fontSize: 12.5, fontWeight: '600', lineHeight: 17 },
  testimonialCard: { borderRadius: 16, borderWidth: 1, paddingHorizontal: 15, paddingVertical: 13, marginTop: 12 },
  testimonialTitle: { fontSize: 10.5, fontWeight: '800', letterSpacing: 1.2, marginBottom: 9 },
  testimonialText: { fontSize: 12.5, lineHeight: 18, fontStyle: 'italic' },
  testimonialAuthor: { fontSize: 10.5, marginTop: 4 },
  ctaWrap: { marginTop: 16 },
});
