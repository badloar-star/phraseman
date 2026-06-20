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
import { View, Text, Animated, Easing, ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { useLang } from '../components/LangContext';
import { type Lang } from '../constants/i18n';
import { MOTION_SPRING_LEGACY } from '../constants/motion';
import {
  normalizePremiumContext, getPaywallCopy, getHeroPlannedCopy,
  applyWinBackCopy, applyWinBackPlannedCopy,
  CONTEXT_BENEFITS, getContextBenefitPlanned, makeLP,
} from './paywall_copy';
import { getStatsCache } from './statsCache';
import { usePaywallPurchase } from './paywall_purchase';
import { logPaywallFunnel } from './paywall_funnel';
import { trackEvent } from './analytics';
import { collectPaywallStats, pickPaywallTags, trackPaywallTagsShown, type PersonalizedTag } from './paywall_personalization';
import { readProgressMirror, isMirrorWorthShowing, type ProgressMirror } from './paywall_progress_mirror';
import { pickTestimonials, type Testimonial } from './paywall_testimonials';
import {
  usePaywallChrome, PaywallGlyphCapsule, PaywallSocialRow, PaywallPersonalTags, PaywallCloseButton,
  PaywallPriceRetry, PaywallTestimonials, PaywallBackground, type PaywallBackgroundHandle,
  paywallScreenStackOptions,
} from '../components/paywall/paywallShared';
import PaywallPlanCards from '../components/paywall/PaywallPlanCards';
import PaywallCtaBlock from '../components/paywall/PaywallCtaBlock';
import PaywallPriceUrgency from '../components/paywall/PaywallPriceUrgency';
import PaywallTrialTimeline from '../components/paywall/PaywallTrialTimeline';
import PaywallLegalDisclosure from '../components/paywall/PaywallLegalDisclosure';
import { ctaLabelFor, ctaSubLineFor, periodLabelFor } from '../components/paywall/paywallScreenCopy';
import { hapticTap } from '../hooks/use-haptics';

const VARIANT = 'A' as const;

export default function PaywallA() {
  const params = useLocalSearchParams<{ context?: string; source?: string }>();
  const ctx = normalizePremiumContext(params.context);
  const source = (Array.isArray(params.source) ? params.source[0] : params.source) || 'direct';
  const isOnboarding = source === 'onboarding_plan';
  const { lang } = useLang();
  const LP = makeLP(lang as Lang);
  const chrome = usePaywallChrome();
  const insets = useSafeAreaInsets();
  const p = usePaywallPurchase({ variant: VARIANT, context: ctx, source, lang: lang as Lang });

  const [personalTag, setPersonalTag] = useState<PersonalizedTag | null>(null);
  const [mirror, setMirror] = useState<ProgressMirror | null>(null);
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
    // Анти-фейк гард: в прод уходят только verified-отзывы; нет verified — секции нет.
    try {
      const dayHash = Math.floor(Date.now() / 86_400_000);
      setTestimonials(pickTestimonials(lang as Lang, ctx, dayHash, 1, false));
    } catch { /* некритично */ }
    return () => { dead = true; };
  }, [source, ctx, lang]);

  // вход — как у v2: мягкое появление
  const opacity = useRef(new Animated.Value(0)).current;
  const slideY = useRef(new Animated.Value(20)).current;
  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, { toValue: 1, duration: 260, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
      Animated.spring(slideY, { toValue: 0, tension: MOTION_SPRING_LEGACY.panel.tension, friction: MOTION_SPRING_LEGACY.panel.friction, useNativeDriver: true }),
    ]).start();
  }, [opacity, slideY]);

  // Вернувшийся юзер (Premium стал фри/истёк) видит win-back заголовок «верни
  // доступ» вместо неактуального «получить впервые». См. applyWinBackCopy.
  const hadPremiumEver = getStatsCache().hadPremiumEver;
  const copy = applyWinBackCopy(getPaywallCopy(ctx), ctx, hadPremiumEver);
  const planned = applyWinBackPlannedCopy(getHeroPlannedCopy(ctx, 0), ctx, hadPremiumEver);
  const title = LP(copy.titleRu, copy.titleUk, copy.titleEs, planned.title);
  const subtitle = LP(copy.subtitleRu, copy.subtitleUk, copy.subtitleEs, planned.subtitle);
  const benefits = (CONTEXT_BENEFITS[ctx] ?? CONTEXT_BENEFITS.generic).slice(0, 4);

  const price = p.selected === 'lifetime' ? p.lifetimePrice : p.selected === 'yearly' ? p.yearlyPrice : p.monthlyPrice;
  const period = periodLabelFor(lang as Lang, p.selected);
  const isLifetimeSel = p.selected === 'lifetime';

  return (
    <PaywallBackground ref={bgRef} isOnboarding={isOnboarding} gradientColors={chrome.bgColors} style={S.root}>
      <Stack.Screen options={paywallScreenStackOptions(isOnboarding)} />
      <SafeAreaView style={S.safe}>
        <Animated.View style={[S.wrap, { opacity, transform: [{ translateY: slideY }] }]}>
          <PaywallCloseButton
            onPress={() => { hapticTap(); closeWithDim('close'); }}
            chrome={chrome}
            style={{ marginTop: Math.max(insets.top - 38, 6) }}
          />

          {/* На обычных телефонах помещается без скролла (flexGrow:1 + спейсер
              прижимает CTA вниз); на маленьких — мягко скроллится. */}
          <ScrollView
            showsVerticalScrollIndicator={false}
            decelerationRate="normal"
            contentContainerStyle={S.scroll}
          >
            <PaywallGlyphCapsule ctx={ctx} chrome={chrome} />

            <Text style={[S.title, { color: chrome.textPrimary }]} numberOfLines={2}>{title}</Text>
            <Text style={[S.subtitle, { color: chrome.textMuted }]}>{subtitle}</Text>

            {/* Личный «болевой» тег (1 шт.) — единый chip-вид (P1-4). */}
            {personalTag && (
              <PaywallPersonalTags texts={[LP(personalTag.ru, personalTag.uk, personalTag.es, personalTag)]} chrome={chrome} />
            )}

            <PaywallSocialRow lang={lang as Lang} chrome={chrome} />

            {/* «Уже твоё» — компактной строкой, без полной карточки (экономим высоту). */}
            {mirror && (
              <Text style={[S.mirrorLine, { color: chrome.textMuted }]} numberOfLines={1}>
                {LP('Уже твоё:', 'Вже твоє:', 'Ya es tuyo:', { 'pt-BR': 'Já é seu:', vi: 'Đã là của bạn:', id: 'Sudah jadi milikmu:', tr: 'Artık senin:', pl: 'Już twoje:' })}{' '}
                <Text style={{ color: chrome.tc.heroAccent, fontWeight: '800' }}>
                  {[
                    mirror.phrases > 0 ? `${mirror.phrases} ${LP('фраз', 'фраз', 'frases', { 'pt-BR': 'frases', vi: 'cụm', id: 'frasa', tr: 'ifade', pl: 'fraz' })}` : '',
                    mirror.streak > 0 ? `${mirror.streak} ${LP('дн. серия', 'дн. серія', 'días', { 'pt-BR': 'dias', vi: 'ngày', id: 'hari', tr: 'gün', pl: 'dni' })}` : '',
                  ].filter(Boolean).join(' · ')}
                </Text>
              </Text>
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
            />

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
        </Animated.View>
      </SafeAreaView>
    </PaywallBackground>
  );
}

const S = StyleSheet.create({
  root: { flex: 1 },
  safe: { flex: 1 },
  wrap: { flex: 1, paddingHorizontal: 20, paddingBottom: 12 },
  scroll: { flexGrow: 1, paddingBottom: 4 },
  title: {
    fontSize: 26, fontWeight: '800', letterSpacing: -1,
    lineHeight: 31, textAlign: 'center', marginTop: 14,
  },
  subtitle: { fontSize: 13, lineHeight: 18.5, textAlign: 'center', marginTop: 8 },
  mirrorLine: { fontSize: 11.5, textAlign: 'center', marginTop: 10 },
  benefits: { gap: 8, marginTop: 14 },
  benefitRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 9 },
  benefitText: { flex: 1, fontSize: 12.5, lineHeight: 17 },
  spacer: { flex: 1, minHeight: 8 },
});
