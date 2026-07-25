import { useStableSafeAreaInsets } from './stable_safe_area_metrics';
// ════════════════════════════════════════════════════════════════════════════
// paywall_e.tsx — вариант E «Один план» (эксперимент paywall_ab).
//
// Гипотеза E: ноль выбора на первом экране — одна доминирующая оффер-карточка
// (Год: крупная списываемая сумма, фрейминг цены за месяц/день, бейдж −N%),
// таймлайн триала и CTA. Выбор НЕ убран (store compliance): под CTA текстовая
// ссылка «Другие варианты» раскрывает компактный селектор Месяца (и Phraseman
// Pro, если lifetime доступен) — выбор меняет p.selectPlan. Дефолт — годовой.
// ════════════════════════════════════════════════════════════════════════════
import React, { useEffect, useRef, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, Stack } from 'expo-router';
import * as Crypto from 'expo-crypto';
import Ionicons from '@expo/vector-icons/Ionicons';

import { useLang } from '../components/LangContext';
import { triLang, type Lang } from '../constants/i18n';
import {
  resolvePaywallContext, getPaywallCopy, getHeroPlannedCopy,
  applyWinBackCopy, applyWinBackPlannedCopy, makeLP,
} from './paywall_copy';
import { getStatsCache } from './statsCache';
import { usePaywallPurchase, type PaywallPlan } from './paywall_purchase';
import { parseResumeLessonId } from './paywall_lesson_continuation';
import { logPaywallFunnel } from './paywall_funnel';
import { trackEvent } from './analytics';
import { trackPaywallExperimentExposure } from './analytics_experiments';
import { createPaywallAnalyticsImpression, paywallImpressionParams } from './paywall_analytics_impression';
import { pickTestimonials, type Testimonial } from './paywall_testimonials';
import { isPaywallReviewsEnabled } from './remote_flags';
import {
  usePaywallChrome, PaywallGlyphCapsule, PaywallSocialRow, PaywallCloseButton,
  PaywallPriceRetry, PaywallTestimonials, PaywallBackground, type PaywallBackgroundHandle,
  usePaywallScreenStackOptions, PaywallStickyBar, useStickyCta,
} from '../components/paywall/paywallShared';
import PaywallCtaBlock from '../components/paywall/PaywallCtaBlock';
import PaywallTrialTimeline from '../components/paywall/PaywallTrialTimeline';
import PaywallLegalDisclosure from '../components/paywall/PaywallLegalDisclosure';
import { PaywallEntrance, PaywallBadgePop } from '../components/paywall/PaywallMotion';
import { ctaLabelFor, ctaSubLineFor, periodLabelFor, stickyStringsFor } from '../components/paywall/paywallScreenCopy';
import { hapticTap } from '../hooks/use-haptics';

const VARIANT = 'E' as const;

export default function PaywallE() {
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

  const [testimonials, setTestimonials] = useState<Testimonial[]>([]);
  const [showAltPlans, setShowAltPlans] = useState(false);

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
    // Анти-фейк гард: в прод уходят только verified-отзывы; нет verified — секции нет.
    // Плюс живой рубильник из «Пульта»: выкл → отзывы просто пропадают (пустой массив).
    try {
      const dayHash = Math.floor(Date.now() / 86_400_000);
      setTestimonials(isPaywallReviewsEnabled() ? pickTestimonials(lang as Lang, ctx, dayHash, 3, false) : []);
    } catch { /* некритично */ }
  }, [source, ctx, lang]);

  // Вернувшийся юзер (Premium стал фри/истёк) видит win-back заголовок.
  const hadPremiumEver = getStatsCache().hadPremiumEver;
  const copy = applyWinBackCopy(getPaywallCopy(ctx), ctx, hadPremiumEver);
  const planned = applyWinBackPlannedCopy(getHeroPlannedCopy(ctx, 0), ctx, hadPremiumEver);
  const title = LP(copy.titleRu, copy.titleUk, copy.titleEs, planned.title);

  const price = p.selected === 'lifetime' ? p.lifetimePrice : p.selected === 'yearly' ? p.yearlyPrice : p.monthlyPrice;
  const period = periodLabelFor(lang as Lang, p.selected);
  const isLifetimeSel = p.selected === 'lifetime';
  const stickyCopy = stickyStringsFor(lang as Lang, { trialDays: p.trialDays, price, period, isLifetime: isLifetimeSel });

  const { tc } = chrome;
  const perMonthLabel = triLang(lang as Lang, {
    ru: '/ мес', uk: '/ міс', es: '/ mes', 'pt-BR': '/ mês',
    vi: '/ tháng', id: '/ bln', tr: '/ ay', pl: '/ mies.',
  });
  const yearSubParts: string[] = [];
  if (p.yearlyPerMonth || p.yearlyPrice) yearSubParts.push(`${p.yearlyPerMonth || p.yearlyPrice} ${perMonthLabel}`);
  if (p.perDayLabel) {
    yearSubParts.push(triLang(lang as Lang, {
      ru: `${p.perDayLabel} в день`, uk: `${p.perDayLabel} на день`, es: `${p.perDayLabel} al día`,
      'pt-BR': `${p.perDayLabel} por dia`, vi: `${p.perDayLabel} mỗi ngày`, id: `${p.perDayLabel} per hari`,
      tr: `Günde ${p.perDayLabel}`, pl: `${p.perDayLabel} dziennie`,
    }));
  }

  const altPlans: { plan: PaywallPlan; name: string; priceLabel: string }[] = [
    {
      plan: 'monthly',
      name: triLang(lang as Lang, {
        ru: 'Месяц', uk: 'Місяць', es: 'Mes', 'pt-BR': 'Mês',
        vi: 'Tháng', id: 'Bulan', tr: 'Ay', pl: 'Miesiąc',
      }),
      priceLabel: `${p.monthlyPerMonth || p.monthlyPrice} ${perMonthLabel}`,
    },
  ];
  if (p.lifetimeAvailable) {
    altPlans.push({
      plan: 'lifetime',
      name: 'Phraseman Pro',
      priceLabel: `${p.lifetimePrice || ''} · ${triLang(lang as Lang, {
        ru: 'разовая покупка', uk: 'разова покупка', es: 'compra única', 'pt-BR': 'compra única',
        vi: 'mua một lần', id: 'pembelian sekali', tr: 'tek seferlik satın alma', pl: 'zakup jednorazowy',
      })}`,
    });
  }

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
              <Text style={[S.title, { color: chrome.textPrimary }]} numberOfLines={2}>{title}</Text>
            </PaywallEntrance>

            <PaywallEntrance index={2}>
              {p.offeringsFailed ? (
                <PaywallPriceRetry lang={lang as Lang} chrome={chrome} onRetry={p.reloadOfferings} />
              ) : (
                /* Единственная доминирующая оффер-карточка: годовой план, крупно —
                   списываемая сумма за год (billed amount, Apple 3.1.2(c)). */
                <View style={[S.offerCard, {
                  borderColor: tc.selectedCardBorder,
                  backgroundColor: chrome.cardBgStrong,
                  shadowColor: tc.selectedCardShadow,
                }]}
                >
                  {p.savingsPct !== null && p.savingsPct > 0 && (
                    <PaywallBadgePop pulse style={[S.saveBadge, { backgroundColor: tc.savingsBadgeBg }]}>
                      <Text style={[S.saveBadgeText, { color: tc.savingsBadgeText }]}>{`−${p.savingsPct}%`}</Text>
                    </PaywallBadgePop>
                  )}
                <View style={S.offerHeader}>
                  <Ionicons name="checkmark-circle" size={22} color={tc.heroAccent} />
                  <Text style={[S.offerName, { color: chrome.textPrimary }]}>
                    {triLang(lang as Lang, {
                      ru: 'Год Premium', uk: 'Рік Premium', es: 'Año Premium', 'pt-BR': 'Ano Premium',
                      vi: 'Năm Premium', id: 'Tahun Premium', tr: 'Yıl Premium', pl: 'Rok Premium',
                    })}
                  </Text>
                </View>
                <Text
                  style={[S.offerPrice, { color: tc.urgencyCurrentPriceText }]}
                  numberOfLines={1}
                  adjustsFontSizeToFit
                  minimumFontScale={0.82}
                >
                  {p.yearlyPrice || (p.loading ? '…' : '—')}
                </Text>
                {yearSubParts.length > 0 && (
                  <Text style={[S.offerSub, { color: chrome.textMuted }]}>{yearSubParts.join(' · ')}</Text>
                )}
              </View>
              )}
            </PaywallEntrance>

            {p.trialDays && (
              <PaywallEntrance index={3}>
                <PaywallTrialTimeline
                  lang={lang as Lang}
                  chrome={chrome}
                  days={p.trialDays}
                  priceLabel={price || '…'}
                  periodLabel={period}
                />
              </PaywallEntrance>
            )}

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

            {/* Store compliance: выбор плана доступен, просто не на первом плане. */}
            <PaywallEntrance index={5}>
              <TouchableOpacity
                accessibilityRole="button"
                accessibilityState={{ expanded: showAltPlans }}
                onPress={() => { hapticTap(); setShowAltPlans((v) => !v); }}
                style={S.altToggle}
                hitSlop={8}
              >
                <Text style={[S.altToggleText, { color: chrome.textMuted }]}>
                  {triLang(lang as Lang, {
                    ru: 'Другие варианты', uk: 'Інші варіанти', es: 'Otras opciones', 'pt-BR': 'Outras opções',
                    vi: 'Lựa chọn khác', id: 'Pilihan lain', tr: 'Diğer seçenekler', pl: 'Inne opcje',
                  })}
                </Text>
                <Ionicons name={showAltPlans ? 'chevron-up' : 'chevron-down'} size={16} color={chrome.textMuted} />
              </TouchableOpacity>
            </PaywallEntrance>
            {showAltPlans && (
              <PaywallEntrance index={0} style={S.altList}>
                {altPlans.map((alt) => {
                  const sel = p.selected === alt.plan;
                  return (
                    <TouchableOpacity
                      key={alt.plan}
                      accessibilityRole="radio"
                      accessibilityLabel={`${alt.name} ${alt.priceLabel}`.trim()}
                      accessibilityState={{ selected: sel, disabled: p.purchasing }}
                      disabled={p.purchasing}
                      onPress={() => p.selectPlan(alt.plan)}
                      style={[S.altRow, {
                        borderColor: sel ? tc.selectedCardBorder : chrome.cardBorder,
                        backgroundColor: sel ? chrome.cardBgStrong : chrome.cardBg,
                      }]}
                    >
                      <Ionicons
                        name={sel ? 'checkmark-circle' : 'ellipse-outline'}
                        size={18}
                        color={sel ? tc.heroAccent : chrome.uncheckedBorder}
                      />
                      <Text style={[S.altName, { color: sel ? chrome.textPrimary : chrome.textMuted }]}>{alt.name}</Text>
                      <Text style={[S.altPrice, { color: chrome.textMuted }]} numberOfLines={1}>{alt.priceLabel}</Text>
                    </TouchableOpacity>
                  );
                })}
              </PaywallEntrance>
            )}

            <PaywallEntrance index={6}>
              <PaywallSocialRow lang={lang as Lang} chrome={chrome} />
            </PaywallEntrance>

            <PaywallEntrance index={7}>
              <PaywallTestimonials items={testimonials} lang={lang as Lang} chrome={chrome} />
            </PaywallEntrance>

            <View style={S.spacer} />

            <PaywallEntrance index={8}>
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
  scroll: { flexGrow: 1, paddingBottom: 6 },
  scrollOnboardingStickyPad: { paddingBottom: 96 },
  title: {
    fontSize: 31, fontWeight: '900', letterSpacing: 0,
    lineHeight: 36, textAlign: 'center', marginTop: 15,
  },
  offerCard: {
    marginTop: 18,
    borderRadius: 20,
    borderWidth: 2,
    paddingHorizontal: 20,
    paddingVertical: 18,
    alignItems: 'center',
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 5,
  },
  saveBadge: {
    position: 'absolute', top: -11, alignSelf: 'center',
    paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10,
  },
  saveBadgeText: { fontSize: 12, fontWeight: '900', letterSpacing: 0 },
  offerHeader: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  offerName: { fontSize: 16.5, fontWeight: '800', letterSpacing: 0 },
  offerPrice: {
    marginTop: 10, fontSize: 34, fontWeight: '900', letterSpacing: 0,
    fontVariant: ['tabular-nums'], textAlign: 'center',
  },
  offerSub: { marginTop: 7, fontSize: 13, lineHeight: 18, textAlign: 'center' },
  ctaWrap: { marginTop: 17 },
  altToggle: {
    marginTop: 12, alignSelf: 'center',
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingVertical: 6, paddingHorizontal: 10,
  },
  altToggleText: { fontSize: 13.5, fontWeight: '700' },
  altList: { gap: 8, marginTop: 6 },
  altRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    borderRadius: 12, borderWidth: 1,
    paddingHorizontal: 14, paddingVertical: 10,
  },
  altName: { flex: 1, fontSize: 14, fontWeight: '700' },
  altPrice: { fontSize: 13, fontWeight: '600', fontVariant: ['tabular-nums'] },
  spacer: { flex: 1, minHeight: 10 },
});
