import React, { createContext, useContext, useEffect, useMemo } from 'react';
import { ActivityIndicator, BackHandler, Linking, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { Stack } from 'expo-router';
import { BlurView } from 'expo-blur';
import { LinearGradient } from '../SafeLinearGradient';
import ThemedConfirmModal from '../ThemedConfirmModal';
import { useStableSafeAreaInsets } from '../../app/stable_safe_area_metrics';
import type { usePaywallPurchase } from '../../app/paywall_purchase';
import type { PremiumContext } from '../../app/premium_context';
import type { ProgressMirror } from '../../app/paywall_progress_mirror';
import type { PaywallProfile } from '../../app/paywall_profile';
import type { Testimonial } from '../../app/paywall_testimonials';
import { triLang, type Lang } from '../../constants/i18n';
import {
  PaywallGlyphCapsule,
  PaywallSocialRow,
  PaywallTestimonials,
  type PaywallChrome,
} from './paywallShared';
import { PersonalizationProofCard } from './PaywallProofCards';
import PaywallPlanCards from './PaywallPlanCards';
import PaywallPlanTiles from './PaywallPlanTiles';
import PaywallTrialStages from './PaywallTrialStages';
import PaywallBenefitComparison from './PaywallBenefitComparison';
import { ctaLabelFor, ctaSubLineFor, periodLabelFor } from './paywallScreenCopy';
import PaywallLegalDisclosure from './PaywallLegalDisclosure';
import PaywallPromoBanner from './PaywallPromoBanner';
import { getLiquidPaywallCopy } from './PaywallLiquidGlassCopy';
import { useTheme } from '../ThemeContext';
import { liquidGlassTokens } from '../../constants/liquidGlassThemePalette';

type Purchase = ReturnType<typeof usePaywallPurchase>;
type Variant = 'A' | 'B' | 'C' | 'D' | 'E' | 'F' | 'G';
type ActiveVariant = 'A' | 'D';
// зачем: владелец 2026-09-29 — вне онбординга остаются РОВНО A «Классический» (планы вертикально)
// и D «Два тарифа» (планы горизонтально). Старые B/C/E/F/G (в т.ч. по deep-link /paywall_b..g)
// больше не рисуют свои композиции: сворачиваются в ближайшую активную раскладку.
// Онбординг-пейвол сюда не ходит (он живёт внутри CleanOnboarding).
const ACTIVE_LAYOUT: Readonly<Record<Variant, ActiveVariant>> = {
  A: 'A', B: 'A', C: 'D', D: 'D', E: 'A', F: 'A', G: 'D',
};
type Copy = ReturnType<typeof getLiquidPaywallCopy>;
type Props = {
  variant: Variant;
  lang: Lang;
  chrome: PaywallChrome;
  purchase: Purchase;
  screenOptions: ReturnType<typeof import('./paywallShared').usePaywallScreenStackOptions>;
  context?: PremiumContext;
  title?: string;
  /** Принимается для совместимости с A/D, но не рисуется: макет — только заголовок, минимум текста. */
  subtitle?: string;
  personalTagTexts?: string[];
  profile?: PaywallProfile | null;
  mirror?: ProgressMirror | null;
  testimonials?: Testimonial[];
};

type GlassTokens = ReturnType<typeof liquidGlassTokens>;
type LiquidStyles = ReturnType<typeof createStyles>;
type LiquidMaterial = Readonly<{ g: GlassTokens; S: LiquidStyles }>;

const LiquidMaterialContext = createContext<LiquidMaterial | null>(null);
const NON_SELLING_CONTEXTS = new Set<PremiumContext>(['theme', 'avatar_aura', 'weekly_review', 'dialog_analysis']);

function useLiquidMaterial(): LiquidMaterial {
  const material = useContext(LiquidMaterialContext);
  if (!material) throw new Error('Paywall Liquid Glass material is unavailable');
  return material;
}

function glassTint(color: string, alpha: string): string {
  return `${color.slice(0, 7)}${alpha}`;
}

function glassStyle(S: LiquidStyles, surface: 'card' | 'sheet' = 'card') {
  return [
    S.glassPanel,
    S.glassRim,
    Platform.OS === 'android' && S.androidFallback,
    surface === 'sheet' && S.glassSheet,
  ];
}

function GlassSheen() {
  const { g, S } = useLiquidMaterial();
  return <View pointerEvents="none" style={StyleSheet.absoluteFill}>
    {Platform.OS === 'ios' ? <BlurView intensity={22} tint="dark" style={StyleSheet.absoluteFill} /> : null}
    <LinearGradient colors={[glassTint(g.lightTint, '24'), glassTint(g.lightTint, '08'), 'transparent']}
      style={S.glassSheen} />
  </View>;
}

function ActiveOfferBody({ variant, purchase, lang, chrome, selectedPrice, period }: {
  variant: 'A' | 'D';
  purchase: Purchase;
  lang: Lang;
  chrome: PaywallChrome;
  selectedPrice: string;
  period: string;
}) {
  const { g } = useLiquidMaterial();
  return <>
    <PaywallBenefitComparison lang={lang} tokens={g} />
    {variant === 'A' && purchase.trialDays ? <PaywallTrialStages
      lang={lang}
      chrome={chrome}
      priceLabel={selectedPrice}
      periodLabel={period}
    /> : null}
  </>;
}

function ActivePlanDock({ variant, purchase, lang, chrome }: {
  variant: 'A' | 'D';
  purchase: Purchase;
  lang: Lang;
  chrome: PaywallChrome;
}) {
  const commonPlanProps = {
    lang,
    chrome,
    selected: purchase.selected,
    onSelect: purchase.selectPlan,
    yearlyPerMonth: purchase.yearlyPerMonth || purchase.yearlyPrice,
    yearlyFull: purchase.yearlyPrice,
    monthlyPrice: purchase.monthlyPerMonth || purchase.monthlyPrice,
    savingsPct: purchase.savingsPct,
    perDayLabel: purchase.perDayLabel,
    promo: purchase.selectedPromo,
    loading: purchase.loading,
    disabled: purchase.purchasing || purchase.restoring,
  };

  return variant === 'A' ? <PaywallPlanCards
    {...commonPlanProps}
    trialDays={null}
    lifetimePrice={null}
    compact
    lifetimeAvailable={false}
  /> : <PaywallPlanTiles
    {...commonPlanProps}
    lifetimePrice={null}
    compact
    lifetimeAvailable={false}
  />;
}

type VisibleState = 'ready' | 'loading' | 'error' | 'purchasing';

function StatusPanel({ state, copy }: { state: Exclude<VisibleState, 'ready'>; copy: Copy }) {
  const { g, S } = useLiquidMaterial();
  const title = state === 'loading' ? copy.loadingTitle : state === 'error' ? copy.errorTitle : copy.purchasingTitle;
  const detail = state === 'loading' ? copy.loadingSub : state === 'error' ? copy.errorSub : copy.purchasingSub;
  return <View accessibilityRole="text" style={[S.statusPanel, ...glassStyle(S)]}><GlassSheen />
    <View style={S.statusIcon}>{state === 'error'
      ? <Ionicons name="cloud-offline-outline" size={28} color={g.text} />
      : <ActivityIndicator size="large" color={g.text} />}</View>
    <Text style={S.statusTitle}>{title}</Text><Text style={S.statusDetail}>{detail}</Text>
  </View>;
}

export default function PaywallLiquidGlass({
  variant: requestedVariant,
  lang,
  chrome,
  purchase,
  screenOptions,
  context,
  title,
  personalTagTexts = [],
  profile = null,
  mirror = null,
  testimonials = [],
}: Props) {
  const variant = ACTIVE_LAYOUT[requestedVariant];
  const { liquidGlassThemeId } = useTheme();
  const g = useMemo(() => liquidGlassTokens(liquidGlassThemeId), [liquidGlassThemeId]);
  const S = useMemo(() => createStyles(g), [g]);
  const material = useMemo<LiquidMaterial>(() => ({ g, S }), [g, S]);
  const insets = useStableSafeAreaInsets();
  const copy = getLiquidPaywallCopy(lang);
  const selectedPrice = purchase.selectedPromo?.promoPriceString || (purchase.selected === 'yearly'
    ? purchase.yearlyPrice : purchase.selected === 'monthly' ? purchase.monthlyPrice : purchase.lifetimePrice);
  const period = periodLabelFor(lang, purchase.selected);
  const hasTrial = !!purchase.trialDays;
  const isLifetime = purchase.selected === 'lifetime';
  const useNeutralHero = !!context && NON_SELLING_CONTEXTS.has(context);
  const activeTitle = useNeutralHero ? triLang(lang, {
    ru: 'Больше возможностей с Plus', uk: 'Більше можливостей із Plus', en: 'More with Plus', es: 'Más posibilidades con Plus',
    'pt-BR': 'Mais possibilidades com o Plus', vi: 'Nhiều lựa chọn hơn với Plus', id: 'Lebih banyak dengan Plus',
    tr: 'Plus ile daha fazlası', pl: 'Więcej możliwości z Plus',
  }) : title || copy[`title${variant}` as keyof Copy];
  const checkoutInFlight = purchase.purchasing || purchase.restoring;
  useEffect(() => {
    if (!checkoutInFlight || Platform.OS !== 'android') return undefined;
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => true);
    return () => subscription.remove();
  }, [checkoutInFlight]);
  const checkoutScreenOptions = useMemo(() => checkoutInFlight
    ? { ...screenOptions, gestureEnabled: false }
    : screenOptions, [checkoutInFlight, screenOptions]);
  const state: VisibleState = purchase.purchasing ? 'purchasing'
    : purchase.offeringsFailed ? 'error'
      : purchase.loading ? 'loading' : 'ready';
  const primaryDisabled = state === 'loading' || state === 'purchasing' || purchase.restoring
    || (state === 'ready' && purchase.ctaDisabled);
  const legalChrome: PaywallChrome = {
    ...chrome,
    textPrimary: g.text,
    textMuted: g.secondary,
    tc: {
      ...chrome.tc,
      heroAccent: g.cta,
      savingsBadgeBg: g.cta,
      savingsBadgeText: g.ctaInk,
      urgencyCurrentPriceText: g.text,
      urgencyStrikethroughColor: g.secondary,
      urgencyLabelText: g.secondary,
    },
  };
  return <LiquidMaterialContext.Provider value={material}><View style={S.root}>
    <Stack.Screen options={checkoutScreenOptions} />
    <LinearGradient colors={[g.bgTop, g.bg, g.bgBottom]} style={StyleSheet.absoluteFill} />
    <ScrollView style={[S.scrollView, { marginTop: insets.top }]} contentContainerStyle={[S.scrollContent, { paddingTop: 8 }]} showsVerticalScrollIndicator={false}>
      <View style={S.header}>
        <Pressable accessibilityRole="button" accessibilityLabel={copy.close}
          accessibilityState={{ disabled: checkoutInFlight }}
          disabled={checkoutInFlight} onPress={() => purchase.handleClose('close')} style={S.close}>
          <Ionicons name="close" size={19} color={g.text} />
        </Pressable>
        <Text style={S.brand}>PHRASEMAN <Text style={S.brandPlus}>PLUS</Text></Text>
        <View style={S.badge}><Text style={S.badgeText}>2.0</Text></View>
      </View>
      <View style={S.activeHero}>
        {context ? <PaywallGlyphCapsule ctx={context} chrome={legalChrome} /> : null}
        <Text style={S.title}>{activeTitle}</Text>
      </View>
      {purchase.selectedPromo ? <PaywallPromoBanner lang={lang} chrome={legalChrome} promo={purchase.selectedPromo} glass={g} /> : null}
      {state === 'ready'
        ? <ActiveOfferBody variant={variant} purchase={purchase} lang={lang} chrome={legalChrome} selectedPrice={selectedPrice} period={period} />
        : <StatusPanel state={state} copy={copy} />}
      {state === 'ready' ? <>
        <PaywallSocialRow lang={lang} chrome={legalChrome} />
        <PersonalizationProofCard lang={lang} chrome={legalChrome} ctx={useNeutralHero ? undefined : context} tagTexts={personalTagTexts} profile={profile} mirror={mirror} />
        <PaywallTestimonials items={testimonials} lang={lang} chrome={legalChrome} />
      </> : null}
      <PaywallLegalDisclosure lang={lang} chrome={legalChrome} priceLabel={selectedPrice} periodLabel={period}
        hasTrial={hasTrial} trialDays={purchase.trialDays} isLifetime={isLifetime} />
      <View style={S.legalLinks}>
        <Pressable style={S.legalLinkButton} accessibilityRole="link" onPress={() => { void Linking.openURL('https://phraseman.app/terms').catch(() => {}); }}><Text style={S.legalLink}>{copy.termsLink}</Text></Pressable>
        <Text style={S.legalLink}>·</Text>
        <Pressable style={S.legalLinkButton} accessibilityRole="link" onPress={() => { void Linking.openURL('https://phraseman.app/privacy').catch(() => {}); }}><Text style={S.legalLink}>{copy.privacy}</Text></Pressable>
      </View>
    </ScrollView>
    <View style={[S.dock, ...glassStyle(S, 'sheet'), { paddingBottom: Math.max(insets.bottom, 12) + 12 }]}><GlassSheen />
      {state === 'ready' ? <View style={S.activePlanDock}>
        <ActivePlanDock variant={variant} purchase={purchase} lang={lang} chrome={legalChrome} />
      </View> : null}
      <Pressable accessibilityRole="button" accessibilityState={{ disabled: primaryDisabled, busy: purchase.purchasing }}
        disabled={primaryDisabled} onPress={() => { if (state === 'error') purchase.reloadOfferings(); else void purchase.handlePurchase(); }}
        style={[S.cta, primaryDisabled && S.ctaDisabled]}>
        {state === 'purchasing' ? <ActivityIndicator color={g.ctaInk} /> : <Text style={S.ctaText}>
          {state === 'error' ? copy.retryLoading : state === 'loading' ? copy.loadingTitle : ctaLabelFor(lang, purchase.trialDays, isLifetime, false)}
        </Text>}
      </Pressable>
      {state === 'ready' ? <Text style={S.dockDisclosure}>{ctaSubLineFor(lang, { price: selectedPrice, period, hasTrial, isLifetime })}</Text>
        : <Text style={S.dockDisclosure}>{state === 'purchasing' ? copy.purchasingSub : state === 'error' ? copy.errorSub : copy.loadingSub}</Text>}
      {variant === 'D' && state === 'ready' && hasTrial ? <Text style={S.trialTrust}>{triLang(lang, {
        ru: 'Если уведомления разрешены, напомним до списания.',
        uk: 'Якщо сповіщення дозволені, нагадаємо до списання.',
        en: 'If notifications are allowed, we will remind you before the charge.',
        es: 'Si permites las notificaciones, te avisaremos antes del cobro.',
        'pt-BR': 'Se as notificações estiverem permitidas, avisaremos antes da cobrança.',
        vi: 'Nếu thông báo được cho phép, chúng tôi sẽ nhắc trước khi tính phí.',
        id: 'Jika notifikasi diizinkan, kami akan mengingatkan sebelum penagihan.',
        tr: 'Bildirimlere izin verilirse ödeme öncesinde hatırlatırız.',
        pl: 'Jeśli powiadomienia są dozwolone, przypomnimy przed opłatą.',
      })}</Text> : null}
      <View style={S.dockLinks}>
        <Pressable style={S.dockLinkButton} accessibilityRole="button" accessibilityState={{ disabled: state === 'purchasing' || state === 'loading' || purchase.restoring, busy: purchase.restoring }}
          disabled={state === 'purchasing' || state === 'loading' || purchase.restoring} onPress={() => { void purchase.handleRestore(); }}>
          <Text style={S.dockLink}>{purchase.restoring ? copy.restoring : copy.restore}</Text>
        </Pressable>
        {state === 'ready' && !purchase.restoring ? <Pressable style={S.dockLinkButton} accessibilityRole="button" onPress={() => purchase.handleClose('continue_free')}>
          <Text style={S.dockLink}>{copy.free}</Text></Pressable> : null}
      </View>
    </View>
    <ThemedConfirmModal visible={!!purchase.exitOffer} title={purchase.exitOffer?.title ?? ''} message={purchase.exitOffer?.message ?? ''}
      confirmLabel={purchase.exitOffer?.confirmLabel ?? ''} cancelLabel={purchase.exitOffer?.cancelLabel ?? ''}
      onConfirm={() => purchase.exitOffer?.onConfirm()} onCancel={() => purchase.exitOffer?.onCancel()} testIDPrefix="paywall-exit-offer" />
  </View></LiquidMaterialContext.Provider>;
}

function createStyles(g: GlassTokens) {
  return StyleSheet.create({
    root: { flex: 1, backgroundColor: g.bg },
    glassPanel: { backgroundColor: g.card, overflow: 'hidden' },
    glassSheet: { backgroundColor: g.sheet },
    glassRim: { borderWidth: 1, borderColor: g.glassEdge, borderTopColor: glassTint(g.lightTint, '52') },
    glassSheen: { position: 'absolute', top: 0, left: 0, right: 0, height: 74 },
    androidFallback: { backgroundColor: g.card, borderColor: g.glassEdge },
    scrollView: { flex: 1, overflow: 'hidden' }, scrollContent: { paddingHorizontal: 20, paddingBottom: 24 },
    header: { minHeight: 47, flexDirection: 'row', alignItems: 'center', gap: 12 },
    close: { width: 44, height: 44, borderRadius: 22, borderWidth: 1, borderColor: g.line, backgroundColor: g.opaqueCard, alignItems: 'center', justifyContent: 'center' },
    brand: { flex: 1, textAlign: 'center', fontSize: 13, fontWeight: '800', letterSpacing: 2, color: g.text },
    brandPlus: { color: g.secondary },
    badge: { paddingVertical: 6, paddingHorizontal: 11, borderRadius: 99, borderWidth: 1, borderColor: g.line, backgroundColor: g.opaqueControl },
    badgeText: { color: g.secondary, fontSize: 11, fontWeight: '700', letterSpacing: 1 },
    activeHero: { alignItems: 'center', paddingTop: 8 },
    title: { marginTop: 9, color: g.text, fontSize: 34, lineHeight: 38, letterSpacing: -0.9, fontWeight: '800', textAlign: 'center' },
    statusPanel: { minHeight: 230, marginTop: 55, borderRadius: 22, padding: 24, alignItems: 'center', justifyContent: 'center' },
    statusIcon: { width: 78, height: 78, borderRadius: 27, backgroundColor: g.opaqueControl, alignItems: 'center', justifyContent: 'center' },
    statusTitle: { color: g.text, fontSize: 24, lineHeight: 29, fontWeight: '800', textAlign: 'center', marginTop: 18 },
    statusDetail: { color: g.secondary, fontSize: 14, lineHeight: 21, textAlign: 'center', marginTop: 9 },
    legalLinks: { marginTop: 15, flexDirection: 'row', gap: 7, justifyContent: 'center' },
    legalLinkButton: { minHeight: 44, justifyContent: 'center' },
    legalLink: { color: g.secondary, fontSize: 11, lineHeight: 16, textDecorationLine: 'underline' },
    dock: { paddingTop: 10, paddingHorizontal: 20, borderTopLeftRadius: 23, borderTopRightRadius: 23, borderWidth: 1, borderBottomWidth: 0, borderColor: g.line, backgroundColor: g.sheet },
    activePlanDock: { marginBottom: 12 },
    cta: { minHeight: 49, paddingVertical: 12, paddingHorizontal: 15, alignItems: 'center', justifyContent: 'center', borderRadius: 15, backgroundColor: g.cta },
    ctaDisabled: { opacity: 0.5 }, ctaText: { color: g.ctaInk, fontSize: 15, fontWeight: '800', textAlign: 'center' },
    dockDisclosure: { color: g.secondary, fontSize: 11, lineHeight: 15, textAlign: 'center', marginTop: 8 },
    trialTrust: { color: g.secondary, fontSize: 11, lineHeight: 15, textAlign: 'center', marginTop: 4 },
    dockLinks: { marginTop: 9, flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: 12 },
    dockLinkButton: { minHeight: 44, flexShrink: 1, justifyContent: 'center' },
    dockLink: { color: g.secondary, fontSize: 12, fontWeight: '600', textAlign: 'center', textDecorationLine: 'underline' },
  });
}
