// ════════════════════════════════════════════════════════════════════════════
// premium_modal_v2.tsx — высококонверсионный пейвол (дизайн v2)
//
// Применённые техники (источники: RevenueCat, Adapty, Superwall, Helium):
//  T-07  Identity framing — заголовок обращается к личности, не к продукту
//  T-04  Social proof FIRST — звёзды/счётчик ДО ценников (+17% ARPU)
//  T-21  Annual default — год выбран сразу (2x LTV)
//  T-01  Price anchoring — месячная цена рядом для контраста
//  T-35  Savings badge «−62%» — визуальный якорь экономии
//  T-13  Visual plan emphasis — годовой план визуально доминирует
//  T-27  Benefit copy — фичи переписаны как результаты для пользователя
//  T-33  CTA text — «Начать бесплатно» вместо «Получить доступ»
//  T-19  Risk reversal — «Отмена в любой момент» под CTA
//  T-29  Personalization — теги из onboarding данных
//  T-03  Urgency — таймер НА карточке плана, не выше ценности
//
// Порядок элементов (validated layout order):
//   Headline → Social proof → Urgency → Plans → Benefits → CTA → Microcopy
//
// БЕЗОПАСНОСТЬ: удвоенная цена — только display, НИКОГДА в Purchases API
// ЦЕНЫ: только storePriceTrim() / RevenueCat, никогда хардкод
// ════════════════════════════════════════════════════════════════════════════
import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, ScrollView,
  Animated, Easing, StyleSheet, ActivityIndicator,
  Alert, Linking, InteractionManager,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from '../components/SafeLinearGradient';
import Purchases, { type PurchasesPackage } from 'react-native-purchases';
import { useTheme } from '../components/ThemeContext';
import { useLang } from '../components/LangContext';
import { initRevenueCat, resolvePremiumPackages, syncRevenueCatIdentity } from './revenuecat_init';
import {
  inferPremiumPlanFromProductId,
  persistStorePremiumLocally,
  revenueCatPremiumMetadata,
} from './premium_revenuecat_state';
import { collectPaywallStats, pickPaywallTags, type PersonalizedTag } from './paywall_personalization';
import { getPaywallThemeConfig } from '../components/paywallThemeConfig';
import {
  activateUrgencyIfNeeded,
  getUrgencyState,
  getDoubledPrice,
  type UrgencyState,
} from './paywall_urgency';
import { hapticTap } from '../hooks/use-haptics';
import { MOTION_SPRING_LEGACY } from '../constants/motion';
import { safeRouterBack } from './navigation_back';
import { DEV_IAP_BYPASS } from './config';
import { trackEvent } from './analytics';
import { useLocalSearchParams } from 'expo-router';
import { emitAppEvent } from './events';
import { BG_GRADIENTS as SCREEN_BG_GRADIENTS } from '../constants/screenBackground';
import { getTrialInfo, trialDaysOrDefault } from './paywall_trial_info';

// ── helpers ──────────────────────────────────────────────────────────────────
type Plan = 'monthly' | 'yearly';
type PremiumPackages = { monthly?: PurchasesPackage; yearly?: PurchasesPackage };

function storePriceTrim(raw: string | undefined | null): string {
  if (!raw) return '';
  return raw.replace(/\s*\/\s*(mo|month|мес|месяц)\b.*/i, '').trim();
}

function storePricePerMonthTrim(pkg: PurchasesPackage | undefined): string {
  const raw = (pkg?.product as { pricePerMonthString?: string | null } | undefined)?.pricePerMonthString;
  return storePriceTrim(raw);
}

// ── фоновые градиенты — глубина и атмосфера для каждой темы ──────────────────
function screenBgTuple(themeMode: string): [string, string, string] {
  const stops = SCREEN_BG_GRADIENTS[themeMode as keyof typeof SCREEN_BG_GRADIENTS] ?? SCREEN_BG_GRADIENTS.dark;
  return [stops[0], stops[1] ?? stops[0], stops[2] ?? stops[1] ?? stops[0]];
}

// ── звёзды ───────────────────────────────────────────────────────────────────
const FIVE_STARS = ['★', '★', '★', '★', '★'] as const;

// ── бенефиты — написаны как результаты для пользователя (T-27) ───────────────
const BENEFITS = [
  // Библия: «учить»→«заниматься», «урок»→«сессия», «ошибка»→без self-blame.
  { emoji: '⚡', text: 'Занимайся сколько хочешь — без дневных лимитов энергии' },
  { emoji: '📚', text: 'Все курсы и сессии открыты прямо сейчас' },
  { emoji: '🎯', text: 'Видишь точно, что подтянуть — и как исправить' },
  { emoji: '✈️', text: 'Занимайся в самолёте и метро — без интернета' },
] as const;

export default function PremiumModalV2() {
  const router = useRouter();
  const params = useLocalSearchParams<{ context?: string; source?: string }>();
  const ctx = (Array.isArray(params.context) ? params.context[0] : params.context) || 'generic';
  const source = (Array.isArray(params.source) ? params.source[0] : params.source) || 'direct';
  const { theme: t, themeMode } = useTheme();
  useLang(); // context subscription — locale switching triggers re-render

  // Воронка: раньше v2-пейвол (его видят ~50% юзеров по A/B) не слал НИ ОДНОГО
  // события — половина покупок была невидима. Теперь трекаем как и v1.
  useEffect(() => {
    void trackEvent('paywall_shown', { context: ctx, source, paywall: 'v2' });
  }, [ctx, source]);
  const insets = useSafeAreaInsets();
  const tc = getPaywallThemeConfig(themeMode);
  const bgColors = screenBgTuple(themeMode);
  const isLight = false;

  // ── state ────────────────────────────────────────────────────────────────
  const [selected, setSelected] = useState<Plan>('yearly');
  const [packages, setPackages] = useState<PremiumPackages>({});
  const [loading, setLoading] = useState(false);
  const [purchasing, setPurchasing] = useState(false);
  const [restoring, setRestoring] = useState(false);
  const [tags, setTags] = useState<PersonalizedTag[]>([]);
  const [urgency, setUrgency] = useState<UrgencyState>({
    isActive: false, remainingMs: 0, remainingFormatted: '00:00:00',
  });
  const [timerDisplay, setTimerDisplay] = useState('00:00:00');

  // ── entrance animation ───────────────────────────────────────────────────
  const opacity = useRef(new Animated.Value(0)).current;
  const slideY  = useRef(new Animated.Value(20)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, { toValue: 1, duration: 260, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
      Animated.spring(slideY, { toValue: 0, tension: MOTION_SPRING_LEGACY.panel.tension, friction: MOTION_SPRING_LEGACY.panel.friction, useNativeDriver: true }),
    ]).start();
  }, []);

  // ── loaders ──────────────────────────────────────────────────────────────
  const loadPackages = useCallback(async () => {
    if (DEV_IAP_BYPASS) return;
    setLoading(true);
    try {
      await initRevenueCat();
      const o = await Purchases.getOfferings();
      setPackages(resolvePremiumPackages(o.current?.availablePackages ?? []));
    } catch { /* retry on purchase tap */ } finally {
      setLoading(false);
    }
  }, []);

  const loadPersonalization = useCallback(async () => {
    try {
      const stats = await collectPaywallStats();
      setTags(pickPaywallTags(stats, 2));
    } catch { /* non-critical */ }
  }, []);

  const initUrgency = useCallback(async () => {
    try {
      await activateUrgencyIfNeeded();
      const s = await getUrgencyState();
      setUrgency(s);
      setTimerDisplay(s.remainingFormatted);
    } catch { /* non-critical */ }
  }, []);

  useEffect(() => {
    const task = InteractionManager.runAfterInteractions(() => {
      void loadPackages();
      void loadPersonalization();
      void initUrgency();
    });
    return () => task.cancel();
  }, [loadPackages, loadPersonalization, initUrgency]);

  // ── live timer ────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!urgency.isActive) return;
    let dead = false;
    const iv = setInterval(async () => {
      const s = await getUrgencyState();
      if (dead) return;
      setUrgency(s);
      setTimerDisplay(s.remainingFormatted);
      if (!s.isActive) clearInterval(iv);
    }, 1000);
    return () => { dead = true; clearInterval(iv); };
  }, [urgency.isActive]);

  // ── prices ───────────────────────────────────────────────────────────────
  const yearlyPrice    = storePriceTrim(packages.yearly?.product?.priceString);
  const monthlyPrice   = storePriceTrim(packages.monthly?.product?.priceString);
  const yearlyPerMonth  = storePricePerMonthTrim(packages.yearly);
  const monthlyPerMonth = storePricePerMonthTrim(packages.monthly);

  // display only — НИКОГДА не идёт в Purchases.purchasePackage
  const yearlyDoubled  = urgency.isActive && yearlyPrice  ? getDoubledPrice(yearlyPrice)  : null;
  const monthlyDoubled = urgency.isActive && monthlyPrice ? getDoubledPrice(monthlyPrice) : null;

  // реальный процент скидки из цен магазина (T-35)
  const savingsPct: number | null = (() => {
    const yRaw = (packages.yearly?.product as { pricePerMonth?: number } | undefined)?.pricePerMonth;
    const mRaw = (packages.monthly?.product as { pricePerMonth?: number } | undefined)?.pricePerMonth;
    if (!yRaw || !mRaw || mRaw <= 0) return null;
    return Math.round((1 - yRaw / mRaw) * 100);
  })();

  const selectedPkg  = selected === 'yearly' ? packages.yearly : packages.monthly;
  const ctaDisabled  = purchasing || loading || restoring || (!DEV_IAP_BYPASS && !selectedPkg);

  // CTA текст — честный: "бесплатно" только если есть trial
  // introPrice = iOS, introductoryPrice = Android
  const hasTrial = !!((selectedPkg?.product as { introPrice?: unknown } | undefined)?.introPrice
    ?? (selectedPkg?.product as { introductoryPrice?: unknown } | undefined)?.introductoryPrice);
  // Библия: «подписка» запрещена → «Открыть полный доступ» (глагол + ценность).
  const ctaLabel = hasTrial ? 'Начать бесплатно' : 'Открыть полный доступ';

  // ── Apple 3.2.1(vii): обязательное текстовое раскрытие условий автопродления ──
  // Под CTA должно быть видно: длина триала, цена ПОСЛЕ него, период списания.
  // Цена и дни берутся из стора (никогда не хардкод).
  const ctaPriceString = storePriceTrim(selectedPkg?.product?.priceString);
  const ctaPeriodWord  = selected === 'yearly' ? 'год' : 'мес';
  const ctaTrialDays   = trialDaysOrDefault(getTrialInfo(selectedPkg));
  const ctaDisclosure: string | null = !ctaPriceString
    ? null
    : hasTrial
      ? `Бесплатно ${ctaTrialDays} ${ctaTrialDays === 1 ? 'день' : ctaTrialDays < 5 ? 'дня' : 'дней'}, затем ${ctaPriceString}/${ctaPeriodWord}. Автопродление — отмени в любой момент до конца пробного периода.`
      : `${ctaPriceString}/${ctaPeriodWord}, автопродление. Отмена в любой момент.`;

  // ── purchase ─────────────────────────────────────────────────────────────
  const handlePurchase = useCallback(async () => {
    hapticTap();
    void trackEvent('paywall_cta_click', { context: ctx, source, plan: selected, paywall: 'v2' });
    if (DEV_IAP_BYPASS) { safeRouterBack(router); return; }
    const pkg = selected === 'yearly' ? packages.yearly : packages.monthly;
    if (!pkg || purchasing) return;
    setPurchasing(true);
    void trackEvent('purchase_started', { context: ctx, source, plan: selected, product_id: pkg.product.identifier, paywall: 'v2' });
    try {
      await initRevenueCat();
      if (!(await syncRevenueCatIdentity())) {
        Alert.alert('Ошибка подключения', 'Не удалось связаться с магазином. Попробуй позже.');
        void trackEvent('purchase_failed', { context: ctx, plan: selected, paywall: 'v2', error: 'identity_sync' });
        return;
      }
      const { customerInfo } = await Purchases.purchasePackage(pkg); // передаём RAW пакет — цена магазина без изменений
      const metadata = revenueCatPremiumMetadata(customerInfo, pkg.product.identifier);
      const confirmedPlan = inferPremiumPlanFromProductId(metadata.productId, selected);
      await persistStorePremiumLocally(confirmedPlan, metadata);
      emitAppEvent('premium_activated');
      void trackEvent('purchase_completed', { context: ctx, source, plan: selected, product_id: pkg.product.identifier, with_trial: hasTrial, paywall: 'v2' });
      if (hasTrial) void trackEvent('trial_started', { context: ctx, plan: selected, product_id: pkg.product.identifier, paywall: 'v2' });
      safeRouterBack(router);
    } catch (err: unknown) {
      if ((err as { userCancelled?: boolean })?.userCancelled) {
        void trackEvent('purchase_cancelled', { context: ctx, plan: selected, paywall: 'v2' });
      } else {
        void trackEvent('purchase_failed', { context: ctx, plan: selected, paywall: 'v2', error: String((err as { message?: string })?.message ?? '').slice(0, 100) });
        Alert.alert('Не удалось оформить', 'Попробуй ещё раз или восстанови покупки.');
      }
    } finally {
      setPurchasing(false);
    }
  }, [selected, packages, purchasing, router, ctx, source, hasTrial]);

  const handleRestore = useCallback(async () => {
    hapticTap();
    if (DEV_IAP_BYPASS) return;
    setRestoring(true);
    try {
      await initRevenueCat();
      if (!(await syncRevenueCatIdentity())) {
        Alert.alert('Ошибка подключения', 'Не удалось связаться с магазином. Попробуй позже.');
        return;
      }
      const info = await Purchases.restorePurchases();
      const activeSubscriptions = info.activeSubscriptions ?? [];
      if (Object.keys(info.entitlements.active).length > 0 || activeSubscriptions.length > 0) {
        const metadata = revenueCatPremiumMetadata(info);
        const plan = inferPremiumPlanFromProductId(
          metadata.productId,
          activeSubscriptions.some(s => /year|annual|12.?month/i.test(s)) ? 'yearly' : 'monthly',
        );
        await persistStorePremiumLocally(plan, metadata);
        emitAppEvent('premium_activated');
        void trackEvent('subscription_restored', { context: ctx, paywall: 'v2' });
        safeRouterBack(router);
      } else {
        Alert.alert('Покупки не найдены', 'Активных подписок не обнаружено.');
      }
    } catch {
      Alert.alert('Ошибка', 'Не удалось восстановить покупки. Попробуй позже.');
    } finally {
      setRestoring(false);
    }
  }, [router, ctx]);

  // ── цвета адаптивные к теме ───────────────────────────────────────────────
  const textPrimary = isLight ? '#0c0c18' : '#FFFFFF';
  const textMuted   = isLight ? 'rgba(12,12,24,0.5)'   : 'rgba(255,255,255,0.5)';
  const divider     = isLight ? 'rgba(0,0,0,0.06)'     : 'rgba(255,255,255,0.06)';
  const cardBg      = isLight ? 'rgba(0,0,0,0.035)'    : 'rgba(255,255,255,0.035)';
  const cardBorder  = isLight ? 'rgba(0,0,0,0.08)'     : 'rgba(255,255,255,0.08)';
  const uncheckedBorder = isLight ? 'rgba(0,0,0,0.18)' : 'rgba(255,255,255,0.22)';

  return (
    <LinearGradient colors={bgColors} start={{ x: 0.5, y: 0 }} end={{ x: 0.5, y: 1 }} style={S.root}>
      <SafeAreaView style={S.safe}>
        <Animated.View style={[S.wrap, { opacity, transform: [{ translateY: slideY }] }]}>
          {/* Закрытие снаружи скролла — всегда видно */}
          <TouchableOpacity
            onPress={() => { hapticTap(); void trackEvent('paywall_close', { context: ctx, source, paywall: 'v2' }); safeRouterBack(router); }}
            style={[S.closeBtn, { marginTop: Math.max(insets.top, 10), backgroundColor: cardBg, borderColor: cardBorder }]}
            hitSlop={{ top: 14, bottom: 14, left: 14, right: 14 }}
          >
            <Ionicons name="close" size={14} color={textMuted} />
          </TouchableOpacity>

          <ScrollView
            showsVerticalScrollIndicator={false}
            bounces={false}
            contentContainerStyle={S.scrollContent}
            decelerationRate="normal"
          >

          {/* ── HEADLINE — identity framing (T-07, T-31) ──────────────── */}
          <Text style={[S.headline, { color: textPrimary }]}>
            {'Заговори.\nНе останавливайся.'}
          </Text>

          {/* ── Персонализация — теги из onboarding (T-29) ────────────── */}
          {tags.length > 0 && (
            <View style={S.tagsRow}>
              {tags.map(tag => (
                <View key={tag.key} style={[S.tag, { backgroundColor: `${tc.heroAccent}16`, borderColor: `${tc.heroAccent}28` }]}>
                  <Text style={[S.tagText, { color: tc.heroAccent }]}>{tag.emoji} {tag.ru}</Text>
                </View>
              ))}
            </View>
          )}

          {/* ── SOCIAL PROOF — первый после headline (T-04, T-41) ─────── */}
          <View style={[S.socialCard, { backgroundColor: cardBg, borderColor: cardBorder }]}>
            <View style={S.socialTop}>
              <View style={S.starsRow}>
                {FIVE_STARS.map((s, i) => (
                  <Text key={i} style={[S.star, { color: tc.socialProofStarColor }]}>{s}</Text>
                ))}
                <Text style={[S.ratingNum, { color: textPrimary }]}>4.9</Text>
              </View>
              <Text style={[S.usersCount, { color: tc.socialProofText }]}>47 000+ учеников</Text>
            </View>
            <Text style={[S.testimonial, { color: tc.socialProofText }]}>
              {'"За месяц поняла первый сериал без субтитров — это реально работает"'}
            </Text>
          </View>

          {/* ── URGENCY — после ценности, НЕ до (T-03) ───────────────── */}
          {urgency.isActive && (
            <View style={[S.urgencyStrip, { backgroundColor: `${tc.urgencyBg}`, borderColor: `${tc.urgencyTimerText}28` }]}>
              <Text style={[S.urgencyLabel, { color: tc.urgencyLabelText }]}>⏰ Персональная цена — истекает через</Text>
              <Text style={[S.urgencyTimer, { color: tc.urgencyTimerText }]}>{timerDisplay}</Text>
            </View>
          )}
          {!urgency.isActive && urgency.remainingMs > 0 && (
            <View style={[S.urgencyStrip, { backgroundColor: `${tc.urgencyBg}`, borderColor: `${tc.urgencyTimerText}18` }]}>
              <Text style={[S.urgencyExpired, { color: textMuted }]}>
                {'🔒 Зафиксировали за вами старую цену — ещё '}
                <Text style={{ color: textPrimary, fontWeight: '700' }}>2 недели.</Text>
              </Text>
            </View>
          )}

          {/* ── ПЛАНЫ — annual доминирует (T-21, T-13, T-01, T-35) ──── */}
          <View style={S.plans}>

            {/* Год — основной, pre-selected, визуально выделен */}
            <TouchableOpacity
              activeOpacity={0.72}
              onPress={() => { hapticTap(); setSelected('yearly'); void trackEvent('paywall_plan_select', { context: ctx, plan: 'yearly', paywall: 'v2' }); }}
              style={[
                S.planCard,
                {
                  borderColor: selected === 'yearly' ? tc.selectedCardBorder : cardBorder,
                  backgroundColor: selected === 'yearly' ? tc.selectedCardBg : cardBg,
                  shadowColor: selected === 'yearly' ? tc.selectedCardShadow : 'transparent',
                },
              ]}
            >
              {/* Бейдж "Лучший выбор" */}
              <View style={[S.popularBadge, { backgroundColor: tc.popularBadgeBg }]}>
                <Text style={[S.popularBadgeText, { color: tc.popularBadgeText }]}>ХИТ</Text>
              </View>

              <View style={S.planCardInner}>
                <View style={[S.checkbox, {
                  borderColor: selected === 'yearly' ? tc.selectedCardBorder : uncheckedBorder,
                  backgroundColor: selected === 'yearly' ? tc.heroAccent : 'transparent',
                }]}>
                  {selected === 'yearly' && <Ionicons name="checkmark" size={11} color={isLight ? '#fff' : '#050505'} />}
                </View>

                <View style={S.planBody}>
                  <Text style={[S.planName, { color: textPrimary }]}>Год</Text>
                  <View style={S.priceRow}>
                    {yearlyDoubled && (
                      <Text style={[S.strikePrice, { color: tc.urgencyStrikethroughColor }]}>{yearlyDoubled}</Text>
                    )}
                    <Text style={[S.planMainPrice, { color: selected === 'yearly' ? tc.urgencyCurrentPriceText : textMuted }]}>
                      {yearlyPerMonth || yearlyPrice || (loading ? '...' : '—')}
                    </Text>
                    <Text style={[S.planPricePer, { color: textMuted }]}> / мес</Text>
                  </View>
                  {yearlyPrice ? (
                    <Text style={[S.planSub, { color: textMuted }]}>{yearlyPrice} в год</Text>
                  ) : null}
                </View>

                {/* Savings badge — реальный % из цен магазина (T-35) */}
                {savingsPct !== null && savingsPct > 0 && (
                  <View style={[S.savingsBadge, { backgroundColor: tc.savingsBadgeBg }]}>
                    <Text style={[S.savingsBadgeText, { color: tc.savingsBadgeText }]}>{`−${savingsPct}%`}</Text>
                  </View>
                )}
              </View>
            </TouchableOpacity>

            {/* Месяц — anchor plan (T-01) */}
            <TouchableOpacity
              activeOpacity={0.72}
              onPress={() => { hapticTap(); setSelected('monthly'); void trackEvent('paywall_plan_select', { context: ctx, plan: 'monthly', paywall: 'v2' }); }}
              style={[
                S.planCard,
                {
                  borderColor: selected === 'monthly' ? tc.selectedCardBorder : cardBorder,
                  backgroundColor: selected === 'monthly' ? tc.selectedCardBg : cardBg,
                  shadowColor: selected === 'monthly' ? tc.selectedCardShadow : 'transparent',
                },
              ]}
            >
              <View style={S.planCardInner}>
                <View style={[S.checkbox, {
                  borderColor: selected === 'monthly' ? tc.selectedCardBorder : uncheckedBorder,
                  backgroundColor: selected === 'monthly' ? tc.heroAccent : 'transparent',
                }]}>
                  {selected === 'monthly' && <Ionicons name="checkmark" size={11} color={isLight ? '#fff' : '#050505'} />}
                </View>

                <View style={S.planBody}>
                  <Text style={[S.planName, { color: textMuted }]}>Месяц</Text>
                  <View style={S.priceRow}>
                    {monthlyDoubled && (
                      <Text style={[S.strikePrice, { color: tc.urgencyStrikethroughColor }]}>{monthlyDoubled}</Text>
                    )}
                    <Text style={[S.planMainPrice, { color: selected === 'monthly' ? tc.urgencyCurrentPriceText : textMuted }]}>
                      {monthlyPerMonth || monthlyPrice || (loading ? '...' : '—')}
                    </Text>
                    <Text style={[S.planPricePer, { color: textMuted }]}> / мес</Text>
                  </View>
                </View>
              </View>
            </TouchableOpacity>
          </View>

          {/* ── БЕНЕФИТЫ — результаты, не фичи (T-27, T-38) ─────────── */}
          <View style={S.benefits}>
            {BENEFITS.map((b, i) => (
              <View key={i} style={S.benefitRow}>
                <View style={[S.benefitIcon, { backgroundColor: `${tc.heroAccent}16` }]}>
                  <Text style={S.benefitEmoji}>{b.emoji}</Text>
                </View>
                <Text style={[S.benefitText, { color: textMuted }]}>{b.text}</Text>
              </View>
            ))}
          </View>

          <View style={S.spacer} />

          {/* ── CTA — action language (T-33, T-12, T-28) ─────────────── */}
          <TouchableOpacity
            activeOpacity={0.84}
            onPress={handlePurchase}
            disabled={ctaDisabled}
            style={[
              S.cta,
              {
                backgroundColor: tc.ctaBg,
                shadowColor: tc.ctaShadow,
                opacity: ctaDisabled && !purchasing ? 0.5 : 1,
              },
            ]}
          >
            {purchasing
              ? <ActivityIndicator color={tc.ctaText} />
              : <Text style={[S.ctaText, { color: tc.ctaText }]}>{ctaLabel}</Text>
            }
          </TouchableOpacity>

          {/* ── Disclosure — Apple 3.2.1(vii): цена/период/триал текстом ── */}
          {ctaDisclosure
            ? <Text style={[S.cancelNote, { color: textMuted }]}>{ctaDisclosure}</Text>
            : <Text style={[S.cancelNote, { color: textMuted }]}>Отмена в любой момент · Без вопросов</Text>}

          {/* ── Footer (T-48, T-34 Apple requirement) ────────────────── */}
          <View style={S.footer}>
            <TouchableOpacity onPress={() => Linking.openURL('https://phraseman.app/terms').catch(() => {})}>
              <Text style={[S.footerLink, { color: textMuted }]}>Условия</Text>
            </TouchableOpacity>
            <Text style={[S.footerDot, { color: textMuted }]}>·</Text>
            <TouchableOpacity onPress={() => Linking.openURL('https://phraseman.app/privacy').catch(() => {})}>
              <Text style={[S.footerLink, { color: textMuted }]}>Конфиденциальность</Text>
            </TouchableOpacity>
            <Text style={[S.footerDot, { color: textMuted }]}>·</Text>
            <TouchableOpacity onPress={handleRestore} disabled={restoring}>
              {restoring
                ? <ActivityIndicator size="small" color={textMuted} style={{ width: 62 }} />
                : <Text style={[S.footerLink, { color: textMuted }]}>Восстановить</Text>
              }
            </TouchableOpacity>
          </View>

          </ScrollView>
        </Animated.View>
      </SafeAreaView>
    </LinearGradient>
  );
}

const S = StyleSheet.create({
  root: { flex: 1 },
  safe: { flex: 1 },
  wrap: { flex: 1 },
  scrollContent: { paddingHorizontal: 20, paddingBottom: 12, flexGrow: 1 },

  // close — themed через inline style
  closeBtn: {
    alignSelf: 'flex-end', marginBottom: 10, marginRight: 20,
    width: 26, height: 26, borderRadius: 13, borderWidth: 1,
    alignItems: 'center', justifyContent: 'center',
  },

  // headline — identity framing, outcome
  headline: {
    fontSize: 28, fontWeight: '800', letterSpacing: -0.8,
    lineHeight: 34, textAlign: 'center', marginBottom: 12,
  },

  // personalized tags
  tagsRow: { flexDirection: 'row', gap: 6, justifyContent: 'center', marginBottom: 12, flexWrap: 'wrap' },
  tag: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20, borderWidth: 1 },
  tagText: { fontSize: 11, fontWeight: '500' },

  // social proof card — BEFORE pricing
  socialCard: {
    borderRadius: 12, borderWidth: 1,
    padding: 12, marginBottom: 10, gap: 5,
  },
  socialTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  starsRow: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  star: { fontSize: 13 },
  ratingNum: { fontSize: 13, fontWeight: '700', marginLeft: 5 },
  usersCount: { fontSize: 12 },
  testimonial: { fontSize: 12, lineHeight: 17, fontStyle: 'italic' },

  // urgency strip — after social proof
  urgencyStrip: {
    borderRadius: 10, borderWidth: 1,
    paddingHorizontal: 12, paddingVertical: 8, marginBottom: 10,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10,
  },
  urgencyLabel: { fontSize: 11, fontWeight: '500', flex: 1 },
  urgencyTimer: { fontSize: 17, fontWeight: '800', letterSpacing: 1.5, fontVariant: ['tabular-nums'] },
  urgencyExpired: { fontSize: 12, lineHeight: 17, flex: 1 },

  // plans — separate cards, annual dominates
  plans: { gap: 8, marginBottom: 14 },
  planCard: {
    borderRadius: 12, borderWidth: 1.5,
    paddingHorizontal: 14, paddingVertical: 13,
    shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.3, shadowRadius: 8,
    elevation: 4,
  },
  popularBadge: {
    alignSelf: 'flex-start', paddingHorizontal: 9, paddingVertical: 3,
    borderRadius: 20, marginBottom: 8,
  },
  popularBadgeText: { fontSize: 10, fontWeight: '800', letterSpacing: 0.4 },
  planCardInner: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  checkbox: {
    width: 20, height: 20, borderRadius: 4, borderWidth: 2,
    alignItems: 'center', justifyContent: 'center',
  },
  planBody: { flex: 1 },
  planName: { fontSize: 14, fontWeight: '600', marginBottom: 2 },
  priceRow: { flexDirection: 'row', alignItems: 'baseline', gap: 4 },
  strikePrice: { fontSize: 11, textDecorationLine: 'line-through' },
  planMainPrice: { fontSize: 17, fontWeight: '700' },
  planPricePer: { fontSize: 12 },
  planSub: { fontSize: 11, marginTop: 2 },
  savingsBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  savingsBadgeText: { fontSize: 11, fontWeight: '800' },

  // benefits — outcomes, not features
  benefits: { gap: 8, marginBottom: 10 },
  benefitRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  benefitIcon: { width: 28, height: 28, borderRadius: 7, alignItems: 'center', justifyContent: 'center' },
  benefitEmoji: { fontSize: 14 },
  benefitText: { fontSize: 13, lineHeight: 18, flex: 1 },

  spacer: { flex: 1, minHeight: 10 },

  // CTA — full width, brand color, action language
  cta: {
    borderRadius: 50, paddingVertical: 16,
    alignItems: 'center', marginBottom: 8,
    shadowOffset: { width: 0, height: 5 }, shadowOpacity: 0.4, shadowRadius: 14,
    elevation: 8,
  },
  ctaText: { fontSize: 17, fontWeight: '700', letterSpacing: -0.2 },

  // microcopy — risk reversal
  cancelNote: { textAlign: 'center', fontSize: 11, lineHeight: 16, marginBottom: 12, paddingHorizontal: 8 },

  // footer
  footer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  footerLink: { fontSize: 11, opacity: 0.55 },
  footerDot: { fontSize: 11, opacity: 0.25 },
});
