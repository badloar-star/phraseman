// Governance-ID: TG-BF6A8ECE6C57

import React, { useCallback, useEffect, useMemo } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { usePaywallPurchase, type PaywallPlan } from '../../app/paywall_purchase';
import { DebugLogger } from '../../app/debug-logger';
import { animateNextLayoutTransition } from '../../app/smooth_layout';
import { useLoadGate } from '../../app/use_load_gate';
import { useTabContentBottomPad } from '../../hooks/use-tab-content-bottom-pad';
import { triLang, type Lang } from '../../constants/i18n';
import { liquidGlassTokens } from '../../constants/liquidGlassThemePalette';
import { THEME_SLIDERS_V1_ENABLED } from '../../constants/theme_sliders_flag';
import { useLang } from '../LangContext';
import { useTheme } from '../ThemeContext';
import V2Pressable from '../v2/V2Pressable';
import { PaywallPlusPlansSkeleton, PaywallPlusPriceNote } from '../paywall/PaywallPlus';
import { PlusTabBenefits } from './PlusTabBenefits';
import { PlusTabLegalRow } from './PlusTabLegalRow';
import { plusTabRenewsLine } from './plus_tab_disclosure';
import { PaywallTierScope } from '../paywall/paywall_tier_context';
import { DUO_TIER_COLORS, DUO_TIER_INK, PaywallDuoGlow, PaywallDuoHero, useDuoTierMix } from '../paywall/duo/PaywallDuoHero';
import { PaywallDuoPlans, Sheen } from '../paywall/duo/PaywallDuoPlans';
import { LinearGradient } from '../SafeLinearGradient';
import type { SubscriptionTier } from '../../app/subscription_tier';
import {
  PLUS_TAB_HEADLINE,
  plusTabItems,
  type PlusTabCopy,
} from './plus_tab_items';

const LOG = '[PLUS-TAB]';
const word = (lang: Lang, copy: PlusTabCopy): string => triLang(lang, copy) ?? copy.ru;

export default function PlusTabScreen() {
  const { lang: rawLang } = useLang();
  const lang = rawLang as Lang;
  const { liquidGlassThemeId } = useTheme();
  const g = liquidGlassTokens(liquidGlassThemeId);
  const bottomPad = useTabContentBottomPad();
  // зачем: пункт «Цвет приложения» — только при включённом флаге theme_sliders (пока ползунков нет — пункта нет)
  const items = useMemo(() => plusTabItems(THEME_SLIDERS_V1_ENABLED), []);

  // зачем: покупка, цены и пробный — тем же хуком, что окна оплаты (в HEAD события показа пишет само окно, у хука параметра trackShown нет —
  // вкладка не окно, «shown» не пишет; блокер типов 06.11: прежняя версия передавала trackShown из незакоммиченной воронки).
  const p = usePaywallPurchase({
    variant: 'PLUS', context: 'generic', source: 'direct', lang, resilientCheckout: true,
  });
  const hasPrices = !!(p.yearlyPrice || p.monthlyPrice) || p.previewPrices;
  const state = hasPrices ? 'ready' : (!p.offeringsSettled || p.loading) ? 'loading' : 'error';
  const pricesReady = state === 'ready' && !!p.yearlyPrice;
  const yearlyTrialDays = pricesReady ? p.yearlyTrialDays : null;
  const monthlyTrialDays = pricesReady ? p.monthlyTrialDays : null;

  // зачем: цены докачиваются тихо тем же общим шлюзом, что в окне оплаты (паузы 1/3/8 с); кнопка покупки жива и без цен
  const reloadOfferings = p.reloadOfferings;
  const retryPrices = useCallback(() => {
    DebugLogger.info(LOG, 'тихий повтор цен');
    reloadOfferings();
  }, [reloadOfferings]);
  const priceGateStatus = state === 'ready' && (p.priceSource === 'reference' || p.priceSource === 'cache')
    ? (p.offeringsSettled && !p.loading ? 'error' : 'loading')
    : state;
  useLoadGate({ id: 'plus-tab-prices', status: priceGateStatus, retry: retryPrices });

  useEffect(() => {
    DebugLogger.info(LOG, `экран: состояние=${state} план=${p.selected} год=${p.yearlyPrice || '—'} месяц=${p.monthlyPrice || '—'} пробныйГода=${yearlyTrialDays ?? 'нет'} пробныйМесяца=${monthlyTrialDays ?? 'нет'} источникЦены=${p.priceSource} пунктов=${items.length} ползунки=${THEME_SLIDERS_V1_ENABLED}`);
  }, [items.length, monthlyTrialDays, p.monthlyPrice, p.priceSource, p.selected, p.yearlyPrice, state, yearlyTrialDays]);

  const { selected, selectPlan: selectPlanInHook, handlePurchase } = p;
  const selectPlan = useCallback((plan: PaywallPlan) => {
    if (plan === selected) return;
    animateNextLayoutTransition();
    selectPlanInHook(plan);
  }, [selectPlanInHook, selected]);

  const ctaBusy = p.purchasing || p.restoring;
  const ultra = p.selected === 'yearly';
  const ctaShown = ultra ? ULTRA_CTA_FALLBACK[lang] ?? ULTRA_CTA_FALLBACK.en : PLUS_CTA_FALLBACK[lang] ?? PLUS_CTA_FALLBACK.en;
  // зачем (владелец 11.11, макет plus-screens-duo-2026-11-11, «в точности как на макете»): вкладка в стиле пейвола «Два пути» —
  // знак и свечение уровня, две кнопки-тарифа, кнопка покупки градиентом уровня. Цвета уровней — из макета, темой не красятся.
  const tier: SubscriptionTier = ultra ? 'ultra' : 'plus';
  const tierMix = useDuoTierMix(tier);
  const tierColors = DUO_TIER_COLORS[tier];
  const ctaInk = DUO_TIER_INK[tier];
  const { width: windowWidth } = useWindowDimensions();
  const buySelected = useCallback(() => {
    DebugLogger.info(LOG, `тап покупки по выбранному тарифу: план=${selected} состояние=${state}`);
    void handlePurchase();
  }, [handlePurchase, selected, state]);

  return (
    <PaywallTierScope tier={tier}>
      <ScrollView decelerationRate="fast"
        testID="plus-tab-scroll"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={S.content}
      >
        <View style={S.top}>
        <PaywallDuoGlow mix={tierMix} isLight={g.isLight} height={420} />
        <View style={S.mark}><PaywallDuoHero mix={tierMix} /></View>
        <Text accessibilityRole="header" testID="plus-tab-title" style={[S.h2, { color: g.text }]}>{word(lang, PLUS_TAB_HEADLINE)}</Text>
        <View style={S.plans}>
          {state === 'loading' ? <PaywallPlusPlansSkeleton g={g} /> : null}
          {state === 'error' ? <PaywallPlusPriceNote lang={lang} g={g} reason={p.storeUnavailableReason} /> : null}
          {state === 'ready' ? (
            // зачем: как в пейволе — нажатие на невыбранный тариф перекрашивает экран, на выбранный — открывает оплату (paywall_duo_tap)
            <PaywallDuoPlans lang={lang} g={g} selected={p.selected} onSelect={selectPlan} onBuy={buySelected} busy={ctaBusy}
              yearlyPrice={p.yearlyPrice} monthlyPrice={p.monthlyPrice} yearlyTrialDays={yearlyTrialDays} monthlyTrialDays={monthlyTrialDays}
              yearlyPromo={pricesReady ? p.storePromo.yearly : null} monthlyPromo={pricesReady ? p.storePromo.monthly : null} savingsPct={p.savingsPct} />
          ) : null}
        </View>

        {/* зачем (D158, как в окне оплаты): кнопка покупки жива и без цен — тап сам загрузит offerings и купит.
            Подпись кнопки и строка под ней — ВСЕГДА по утверждённому макету plus_tab_approved_2026-11-05 (D из MOCKUP_VERDICTS_LV2, 05.11): «Оформить Ultra на год» / «Оформить Plus на месяц»
            и «Цена и пробный период — из магазина. Отмена в любой момент.»; цена видна на плитках планов (из магазина), в кнопку она больше не вшивается. */}
        <V2Pressable
          testID="plus-tab-cta"
          accessibilityLabel={ctaShown}
          accessibilityState={{ disabled: ctaBusy, busy: p.purchasing }}
          disabled={ctaBusy}
          onPress={() => { DebugLogger.info(LOG, `тап покупки: план=${p.selected} состояние=${state}`); void p.handlePurchase(); }}
          withHaptic={false}
          scaleTo={0.97}
          style={[S.cta, { backgroundColor: tierColors[1], shadowColor: tierColors[1] }]}
        >
          <LinearGradient pointerEvents="none" colors={[...tierColors]} locations={[0, 0.48, 1]} start={{ x: 0, y: 0.2 }} end={{ x: 1, y: 0.8 }} style={StyleSheet.absoluteFill} />
          {p.purchasing ? null : <Sheen width={windowWidth} />}
          {p.purchasing
            ? <ActivityIndicator color={ctaInk} />
            : <Text style={[S.ctaText, { color: ctaInk }]}>{ctaShown}</Text>}
        </V2Pressable>
        <Text style={[S.fine, { color: g.mutedText }]}>{p.tapNotice ? TRY_LATER[lang] ?? TRY_LATER.en : (STORE_NOTE[lang] ?? STORE_NOTE.en)}</Text>
        {/* зачем (владелец ~19:40 05.11, вариант Б; Apple 3.1.2 / Google Play): подпись макета выше НЕ меняется; под ней — автопродление выбранного плана и ряд «Условия · Конфиденциальность · Восстановить» */}
        <Text testID="plus-tab-renews" style={[S.fineRenews, { color: g.mutedText }]}>{plusTabRenewsLine(lang, p.selected)}</Text>
        </View>

        {/* зачем (макет .more): подробности — на отдельной подложке со скруглённым верхом; она доходит до низа экрана под панель вкладок */}
        <View style={[S.more, { backgroundColor: g.opaqueCard, paddingBottom: bottomPad }]}>
          <PlusTabBenefits lang={lang} g={g} items={items} layout="table" tier={tier} />

          <PlusTabLegalRow lang={lang} color={g.mutedText} restoring={p.restoring} disabled={ctaBusy} onRestore={() => { void p.handleRestore(); }} />
        </View>
      </ScrollView>
    </PaywallTierScope>
  );
}

// зачем: подпись кнопки до прихода цен — нейтральная; цена и пробный появляются из магазина, как только пришли
const PLUS_CTA_FALLBACK: Readonly<Record<string, string>> = {
  ru: 'Оформить Plus на месяц', uk: 'Оформити Plus на місяць', en: 'Get Plus for a month', es: 'Obtener Plus por un mes', 'pt-BR': 'Assinar o Plus por um mês',
  vi: 'Đăng ký Plus theo tháng', id: 'Berlangganan Plus sebulan', tr: 'Plus’ı bir aylığına al', pl: 'Wykup Plus na miesiąc',
};
const ULTRA_CTA_FALLBACK: Readonly<Record<string, string>> = {
  ru: 'Оформить Ultra на год', uk: 'Оформити Ultra на рік', en: 'Get Ultra for a year', es: 'Obtener Ultra por un año', 'pt-BR': 'Assinar o Ultra por um ano',
  vi: 'Đăng ký Ultra theo năm', id: 'Berlangganan Ultra setahun', tr: 'Ultra’yı bir yıllığına al', pl: 'Wykup Ultra na rok',
};
const STORE_NOTE: Readonly<Record<string, string>> = {
  ru: 'Цена и пробный период — из магазина. Отмена в любой момент.', uk: 'Ціна й пробний період — з магазину. Скасування будь-коли.',
  en: 'Price and trial come from the store. Cancel any time.', es: 'El precio y la prueba vienen de la tienda. Cancela cuando quieras.',
  'pt-BR': 'Preço e período de teste vêm da loja. Cancele quando quiser.', vi: 'Giá và thời gian dùng thử lấy từ cửa hàng. Hủy bất cứ lúc nào.',
  id: 'Harga dan masa percobaan dari toko. Batalkan kapan saja.', tr: 'Fiyat ve deneme süresi mağazadan gelir. İstediğin zaman iptal et.',
  pl: 'Cena i okres próbny pochodzą ze sklepu. Anuluj w dowolnym momencie.',
};
const TRY_LATER: Readonly<Record<string, string>> = {
  ru: 'Попробуй ещё раз через минуту.', uk: 'Спробуй ще раз за хвилину.', en: 'Try again in a minute.', es: 'Inténtalo de nuevo en un minuto.',
  'pt-BR': 'Tente de novo em um minuto.', vi: 'Hãy thử lại sau một phút.', id: 'Coba lagi dalam semenit.', tr: 'Bir dakika sonra tekrar dene.', pl: 'Spróbuj ponownie za minutę.',
};

const S = StyleSheet.create({
  // зачем: размеры — из макета plus-screens-duo-2026-11-11 (.tabtop, .hl, .buys, .cta, .fine, .more)
  content: { flexGrow: 1 },
  top: { paddingHorizontal: 22, paddingTop: 20, paddingBottom: 22 },
  // знак несёт свой нижний отступ 26 (пейвол); в макете вкладки — 22
  mark: { marginBottom: -4 },
  h2: { fontSize: 33, lineHeight: 37, fontWeight: '900', letterSpacing: -1 },
  plans: { marginTop: 24 },
  cta: { overflow: 'hidden', marginTop: 12, borderRadius: 18, paddingVertical: 15, alignItems: 'center', justifyContent: 'center', minHeight: 56, shadowOpacity: 0.65, shadowRadius: 17, shadowOffset: { width: 0, height: 14 }, elevation: 8 },
  ctaText: { fontSize: 16, lineHeight: 20, fontWeight: '700' },
  fine: { fontSize: 13, lineHeight: 18, textAlign: 'center', marginTop: 10 },
  fineRenews: { fontSize: 13, lineHeight: 18, textAlign: 'center', marginTop: 2 },
  more: { flexGrow: 1, paddingHorizontal: 22, paddingTop: 6, borderTopLeftRadius: 28, borderTopRightRadius: 28 },
});
