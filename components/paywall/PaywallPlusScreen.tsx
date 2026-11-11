// ════════════════════════════════════════════════════════════════════════════
// PaywallPlusScreen.tsx — экран единственного пейвола Plus.
//
// Рендерится диспетчером /premium_modal после проверки доступа (entry). Покупка,
// восстановление, цены и пробный — общий хук usePaywallPurchase (логика покупки
// не менялась). Здесь: сборка блоков по макету paywall-v3, аналитика показа,
// защита жестов на время оплаты и экран «Напомнить о конце пробного?» после покупки.
// ════════════════════════════════════════════════════════════════════════════
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useOverlayActiveKey } from '../OverlayArbiter'; // зачем: [WINBACK-FREEZE] — кто держит слот окон, пока открыт пейвол
import { parseDevPaywallState } from '../../app/dev_paywall_state';
import { BackHandler, Linking, Platform, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { PaywallSwipeSheet } from './PaywallSwipeSheet';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';

import { useReferralRouletteEnabled } from '../../app/referral_roulette_flag';
import { PlusTabBenefits } from '../plus-tab/PlusTabBenefits';
import { plusTabItems, PLUS_TAB_HEADLINE } from '../plus-tab/plus_tab_items';
import { THEME_SLIDERS_V1_ENABLED } from '../../constants/theme_sliders_flag';
import V2Pressable from '../v2/V2Pressable';
import { useLang } from '../LangContext';
import { useTheme } from '../ThemeContext';
import { LinearGradient } from '../SafeLinearGradient';
import { triLang, type Lang } from '../../constants/i18n';
import { liquidGlassTokens } from '../../constants/liquidGlassThemePalette';
import { useStableSafeAreaInsets } from '../../app/stable_safe_area_metrics';
import { usePaywallPurchase, type PaywallPlan } from '../../app/paywall_purchase';
import { paywallEntryAnalyticsParams, SERVER_REFUSED_CONTEXT, type PaywallEntry } from '../../app/paywall_entry_contract';
import { parseResumeLessonId } from '../../app/paywall_lesson_continuation';
import { logPaywallFunnel } from '../../app/paywall_funnel';
import { trackEvent } from '../../app/analytics';
import { createPaywallAnalyticsImpression, paywallImpressionParams } from '../../app/paywall_analytics_impression';
import { animateNextLayoutTransition } from '../../app/smooth_layout';
import { DebugLogger } from '../../app/debug-logger';
import { useLoadGate } from '../../app/use_load_gate';
import { usePaywallScreenStackOptions } from './paywallShared';
import {
  PaywallPlusDock, PaywallPlusHeader, PaywallPlusHeading, PaywallPlusPlans, PaywallPlusPlansSkeleton, PaywallPlusPriceNote,
   PaywallPlusScroll, paywallPlusCtaCopy,
  type PaywallPlusState,
} from './PaywallPlus';
import PaywallTrialReminderPrompt from './PaywallTrialReminderPrompt';
import { COPY, paywallChoosePlan, pick } from './PaywallPlusCopy';
import { paywallContextHeadline, paywallEntryFactsFromParams } from '../../app/paywall_context_headline';
import { PaywallTierScope } from './paywall_tier_context';
import { PAYWALL_V3_CTA } from '../../app/paywall_language_add_copy';
import { applyTierName, SUBSCRIPTION_TIER_NAME } from '../../app/subscription_tier';
import { PAYWALL_V3_AUTO_RENEW, PAYWALL_V3_CTA_TRIAL } from '../../app/paywall_v3_rows';
import { onAppEvent } from '../../app/events';
import { getPaywallControlVisibility } from '../../app/paywall_control_visibility';
import { isPaywallMEnabled } from './m/paywall_m_flag';
import { paywallMHeadKindForContext } from './m/paywall_m_head';
import { usePaywallMPerson } from './m/use_paywall_m_person';
import { openPromoCodeFromPaywall } from '../../app/paywall_promo_navigation';
import { paywallCFactCaption } from './paywall_c_fact_caption';
import { PaywallDuoGlow, PaywallDuoHero, useDuoTierMix } from './duo/PaywallDuoHero';
import { PaywallDuoPlans } from './duo/PaywallDuoPlans';
import { PaywallDuoMore, PaywallDuoStickyBuy } from './duo/PaywallDuoMore';
import { PaywallDuoStoreOff } from './duo/PaywallDuoStoreOff';
import { PREMIUM_TELEGRAM_BOT_URL, storeOffRoute } from './duo/paywall_store_off_copy';

/** Метка единственного пейвола в аналитике и воронке. */
export const PAYWALL_PLUS_VARIANT = 'PLUS' as const;

type Params = { _dev_state?: string | string[]; _force_trial_ui?: string | string[]; _force_trial_days?: string | string[]; resume_kind?: string; resume_lesson_id?: string; lessons_done?: string; streak?: string };

function firstParam(raw: string | string[] | undefined): string | undefined {
  return Array.isArray(raw) ? raw[0] : raw;
}

export default function PaywallPlusScreen({ entry }: { readonly entry: PaywallEntry }) {
  const params = useLocalSearchParams<Params>();
  const router = useRouter();
  const { lang: rawLang } = useLang();
  const lang = rawLang as Lang;
  const { liquidGlassThemeId } = useTheme();
  // зачем: пейвол целиком на токенах АКТИВНОЙ темы — меняешь тему, меняется пейвол.
  // зачем (темы 2.0): без useMemo — токены зависят ещё от уровня цвета и оформления; поиск кэширован.
  const g = liquidGlassTokens(liquidGlassThemeId);
  const insets = useStableSafeAreaInsets();
  const { height: windowHeight } = useWindowDimensions();
  const [viewportHeight, setViewportHeight] = useState(0);
  const benefits = useMemo(() => plusTabItems(THEME_SLIDERS_V1_ENABLED), []);
  const ctx = entry.context;
  const source = entry.source;
  const rouletteEnabled = useReferralRouletteEnabled();
  const showInvite = rouletteEnabled && source === 'entitlement_expired' && (ctx === 'premium_expired' || ctx === 'vip_expired');
  // зачем (координатор 25.10, Ядро c161d894a): вход «Не видим твой Plus» — свой низ окна: «Восстановить покупки» первой, «Оформить Plus» второй
  const serverRefused = ctx === SERVER_REFUSED_CONTEXT;
  const [controlVisibility, setControlVisibility] = useState(getPaywallControlVisibility);
  // зачем (владелец «Да, так», координатор 25.10): пейвол «Вариант М» — за флагом «Пульта» paywall_m_enabled, по умолчанию выключен; вход «Не видим твой Plus» остаётся на своём доке
  const [mFlag, setMFlag] = useState(isPaywallMEnabled);
  const mPerson = usePaywallMPerson(mFlag);
  // зачем (макет М, окна по месту): факты места входа — из параметров маршрута.
  const lessonsDoneFact = firstParam(params.lessons_done);
  // зачем (5 · ВХОД faf515267, координатор 26.10): итог первого бесплатного разговора приходит параметрами входа dialog_limit — читаем их для панели «Разговор с ИИ», без сети
  const dialogMinutesParam = firstParam((params as Record<string, string | string[] | undefined>).firstDialogMinutes);
  const dialogTurnsParam = firstParam((params as Record<string, string | string[] | undefined>).firstDialogTurns);
  const dialogWasParam = firstParam((params as Record<string, string | string[] | undefined>).firstDialogWas);
  const dialogNowParam = firstParam((params as Record<string, string | string[] | undefined>).firstDialogNow);
  const mFacts = useMemo(() => {
    const num = (raw: string | undefined): number | null => { const n = Number(raw); return raw !== undefined && Number.isFinite(n) && n >= 0 ? n : null; };
    const done = num(lessonsDoneFact);
    const text = (raw: string | undefined): string | null => (typeof raw === 'string' && raw.trim() !== '' ? raw.trim() : null);
    const was = text(dialogWasParam);
    const now = text(dialogNowParam);
    return {
      lockedLesson: done === null ? null : done + 1,
      dialogMinutes: num(dialogMinutesParam), dialogPhrases: num(dialogTurnsParam),
      correctionWas: was && now ? was : null, correctionNow: was && now ? now : null,
    };
  }, [lessonsDoneFact, dialogMinutesParam, dialogTurnsParam, dialogWasParam, dialogNowParam]);
  // C остаётся единым визуальным экраном, а подтверждённые факты прежнего М не теряются:
  // при включённом флаге они становятся подписью первой плоской строки выгоды.
  // Общая строка прогресса М сюда не попадает: она не относится к flashcards/language_add/другим контекстам C.
  const mFactCaption = useMemo(
    () => paywallCFactCaption(mFlag, paywallMHeadKindForContext(ctx), lang, mPerson, mFacts),
    [ctx, lang, mFacts, mFlag, mPerson],
  );
  useEffect(() => {
    const subscription = onAppEvent('remote_config_changed', () => {
      setControlVisibility(getPaywallControlVisibility());
      setMFlag(isPaywallMEnabled());
    });
    return () => subscription.remove();
  }, []);
  const forceTrialUI = firstParam(params._force_trial_ui) === '1';
  // зачем (координатор 12.10): dev-превью триала с заданным N (`_force_trial_days=7`); мусор и значения вне 1…60 игнорируются. В стор-сборке не действует (хук требует DEV_IAP_BYPASS).
  const forceTrialDays = useMemo(() => {
    const n = Number(firstParam(params._force_trial_days));
    return Number.isInteger(n) && n >= 1 && n <= 60 ? n : null;
  }, [params._force_trial_days]);
  // зачем (координатор 12.10, R1 «нет пути»): dev-состояние окна (`_dev_state=loading|error_no_prices|…`), в стор-сборке всегда null
  const devPaywallStateParam = firstParam(params._dev_state);
  const devPaywallState = useMemo(() => parseDevPaywallState(devPaywallStateParam), [devPaywallStateParam]);
  const resumeLessonId = params.resume_kind === 'course_lesson' ? parseResumeLessonId(params.resume_lesson_id) : null;
  const [impression] = useState(() => createPaywallAnalyticsImpression(() => entry.impressionId));
  const entryAnalytics = useMemo(() => paywallEntryAnalyticsParams(entry), [entry]);
  const lessonsDoneParam = params.lessons_done;
  const streakParam = params.streak;
  const headline = useMemo(
    () => paywallContextHeadline(ctx, lang, paywallEntryFactsFromParams({ lessons_done: lessonsDoneParam, streak: streakParam })),
    [ctx, lang, lessonsDoneParam, streakParam],
  );
  const contextual = headline.copyContext !== 'generic' && !!headline.title;
  // зачем (макет paywall-context-redesign #c1): пилюля «что закончилось» рядом со значком входа. Поле `pill` в контракт вносит Ядро;
  // пока его нет — пилюли нет (ничего не выдумываем).
  useEffect(() => {
    DebugLogger.info('[PAYWALL-OPEN]', `шапка: ctx=${ctx} source=${source} текст=${headline.copyContext} контекстная=${contextual} выгода=${headline.firstBenefit ? 'есть' : 'нет'} lang=${lang}`);
  }, [contextual, ctx, headline.copyContext, headline.firstBenefit, lang, source]);

  const p = usePaywallPurchase({
    variant: PAYWALL_PLUS_VARIANT, context: ctx, source, lang, forceTrialUI, forceTrialDays, resumeLessonId, impression, devState: devPaywallState,
    // зачем (D158): Plus-окно — кнопка всегда активна, цены из кэша, потолок загрузки.
    resilientCheckout: true,
  });

  useEffect(() => {
    void trackEvent('paywall_shown', { context: ctx, source, paywall: PAYWALL_PLUS_VARIANT, ...entryAnalytics, ...paywallImpressionParams(impression) });
    logPaywallFunnel('shown', { variant: PAYWALL_PLUS_VARIANT, context: ctx });
  }, [ctx, entryAnalytics, impression, source]);

  // зачем (D158): есть цены (живые или из кэша) — рисуем их; иначе скелетон ТОЛЬКО пока идёт загрузка
  // (она ограничена потолком), а после потолка — спокойное «Сейчас недоступно». Вечного скелетона нет.
  // зачем (координатор 11.10): в dev без магазина (previewPrices) плитки рисуются с предпросмотром цен, как при готовых ценах; блок «Цены не загрузились»
  // — только когда предпросмотра нет. В релизной конфигурации previewPrices всегда false, остаётся честная ошибка.
  const hasPrices = !!(p.yearlyPrice || p.monthlyPrice) || p.previewPrices;
  const state: PaywallPlusState = hasPrices ? 'ready' : (!p.offeringsSettled || p.loading) ? 'loading' : 'error';
  // зачем (Сверка 11.10: «состояние мигает error → тихий повтор → loading → error, плитки пустые между ними»): после первого «Цены не загрузились»
  // на месте плиток остаётся это сообщение, пока не придут цены; тихий повтор показывается только вращением на кнопке «Ещё раз», а не сменой блока.
  const [sawPricesError, setSawPricesError] = useState(false);
  useEffect(() => {
    if (state === 'error') setSawPricesError(true);
    else if (state === 'ready') setSawPricesError(false);
  }, [state]);
  const plansShown: PaywallPlusState = state === 'loading' && sawPricesError ? 'error' : state;
  // Пробный — только из магазина: цены из кэша его не несут (yearlyTrialDays берётся из пакета).
  const pricesReady = state === 'ready' && !!p.yearlyPrice;
  // зачем (D158 / PM-214, 04.10): цены докачиваем фоном общим useLoadGate (паузы 1/3/8 с, повтор при
  // возврате в приложение) вместо своей копии «5×20 с». Кнопка покупки активна всегда — панель
  // «Сейчас недоступно» рисует state 'error' ниже, хук только повторяет запрос цен.
  const reloadOfferings = p.reloadOfferings;
  const retryPrices = useCallback(() => {
    DebugLogger.info('[PAYWALL-PLUS]', 'тихий повтор цен');
    reloadOfferings();
  }, [reloadOfferings]);
  // зачем (владелец 11.10: «цены видны всегда»): на плитках может стоять справочная или кэш-цена — окно «готово», но живые
  // цены магазина ещё не пришли. Фоновые повторы не прекращаются, пока цена не из магазина.
  const priceGateStatus: PaywallPlusState = state === 'ready' && (p.priceSource === 'reference' || p.priceSource === 'cache')
    ? (p.offeringsSettled && !p.loading ? 'error' : 'loading')
    : state;
  useLoadGate({ id: 'paywall-plus-prices', status: priceGateStatus, retry: retryPrices });
  // Пробный — ТОЛЬКО из магазина и только когда цены реально пришли.
  const yearlyTrialDays = pricesReady ? p.yearlyTrialDays : null;
  // зачем (владелец 18.10): у каждой плитки пробный из СВОЕГО пакета, независимо от выбранного тарифа.
  const monthlyTrialDays = pricesReady ? p.monthlyTrialDays : null;
  const showTimeline = !!yearlyTrialDays && p.selected === 'yearly';

  useEffect(() => {
    DebugLogger.info('[PAYWALL]', `окно Plus: состояние=${state} цены=${p.pricesFromCache ? 'кэш' : hasPrices ? 'магазин' : 'нет'} план=${p.selected} год=${p.yearlyPrice || '—'} месяц=${p.monthlyPrice || '—'} `
      + `пробныйГода=${yearlyTrialDays ?? 'нет'} источникПробного=${yearlyTrialDays ? p.yearlyTrialSource : 'нет'} лента=${showTimeline} подпись=${p.tapNotice ? 'попробуй-позже' : 'нет'} ctx=${ctx} source=${source} превью=${String(p.previewPrices)} причина=${p.storeUnavailableReason ?? '-'} источникЦены=${p.priceSource} dev=${String(__DEV__)}`);
  }, [ctx, hasPrices, p.previewPrices, p.priceSource, p.yearlyTrialSource, p.storeUnavailableReason, p.monthlyPrice, p.pricesFromCache, p.selected, p.tapNotice, p.yearlyPrice, showTimeline, source, state, yearlyTrialDays]);

  // Мгновенный выбор тарифа; лента пробного появляется/уходит плавно, без скачка.
  const { selected, selectPlan: selectPlanInHook } = p;
  const selectPlan = useCallback((plan: PaywallPlan) => {
    if (plan === selected) return;
    animateNextLayoutTransition();
    selectPlanInHook(plan);
  }, [selectPlanInHook, selected]);

  // зачем (D158, L1): закрытие и «назад» блокируем только когда оплата/восстановление реально идут;
  // пока на тапе грузятся offerings (оплата не начата), окно закрывается. Кнопка при этом занята (purchasing).
  const checkoutInFlight = p.payStarted || p.restoring;
  const ctaBusy = p.purchasing || p.restoring;
  // зачем (Макеты 13.10, paywalls-013): в журнале видно, что именно держит окно занятым — без этого «× активен при оплате» не отличить
  // от «флаг оплаты не пришёл».
  useEffect(() => {
    DebugLogger.info('[PAYWALL]', `окно Plus: оплата payStarted=${String(p.payStarted)} purchasing=${String(p.purchasing)} restoring=${String(p.restoring)} `
      + `закрытие заблокировано=${String(checkoutInFlight)} тарифы/кнопки заняты=${String(ctaBusy)}`);
  }, [checkoutInFlight, ctaBusy, p.payStarted, p.purchasing, p.restoring]);
  const prompt = p.trialReminderPrompt;
  const baseOptions = usePaywallScreenStackOptions(false);
  const screenOptions = useMemo(() => (checkoutInFlight || prompt
    ? { ...baseOptions, gestureEnabled: false }
    : baseOptions), [baseOptions, checkoutInFlight, prompt]);

  // зачем: аппаратный Back должен пройти через тот же замок и dismiss(1), что ✕ и свайп.
  // Иначе нативный pop обходит журнал закрытия и оставляет отдельную историю навигации несинхронной.
  const freezeOverlayKey = useOverlayActiveKey();
  useEffect(() => {
    console.log(`[WINBACK-FREEZE] t=${Date.now() % 100000} sheet mount context=${ctx} source=${source}`); // guard-ok: временная трассировка
    return () => {
      console.log(`[WINBACK-FREEZE] t=${Date.now() % 100000} sheet UNMOUNT context=${ctx}`); // guard-ok: временная трассировка
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- зачем: только момент монтирования/размонтирования
  }, []);
  useEffect(() => {
    console.log(`[WINBACK-FREEZE] t=${Date.now() % 100000} sheet arbiter active=${freezeOverlayKey ?? 'none'}`); // guard-ok: временная трассировка
  }, [freezeOverlayKey]);

  // Android «назад»: во время оплаты — игнор; на экране напоминания — как «Не сейчас».
  const { skipTrialReminder, handleClose } = p;
  useEffect(() => {
    if (Platform.OS !== 'android') return undefined;
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      console.log(`[WINBACK-FREEZE] t=${Date.now() % 100000} sheet android_back context=${ctx} checkout=${checkoutInFlight} prompt=${!!prompt}`); // guard-ok: одна строка на Back
      if (prompt) skipTrialReminder();
      else if (!checkoutInFlight) handleClose('close', 'back');
      return true;
    });
    return () => sub.remove();
  }, [checkoutInFlight, prompt, skipTrialReminder, handleClose, ctx]);

  // зачем: въезд листа из макета (pw-in) здесь НЕ повторяем — Performance Bible и
  // paywall_navigation_smooth_contract требуют готовый контент в первом кадре модала.

  // зачем (D158): подпись кнопки с ценой — только если цена ВЫБРАННОГО плана реально есть; иначе нейтральное «Оформить Plus».
  const labelReady = state === 'ready' && (p.selected === 'monthly' ? !!p.monthlyPrice : !!p.yearlyPrice);
  const yearlyPromo = pricesReady ? p.storePromo.yearly : null;
  const monthlyPromo = pricesReady ? p.storePromo.monthly : null;
  // зачем (макет: «Начать бесплатно» при пробном периоде, иначе «Подключить Plus»; решения владельца 05.11: цена — на плитках, пробный — показывать, если доступен): со скидкой стора кнопка остаётся с честным текстом цены
  const selectedTrial = p.selected === 'monthly' ? monthlyTrialDays : yearlyTrialDays;
  const selectedPromo = p.selected === 'monthly' ? monthlyPromo : yearlyPromo;
  // зачем (150, координатор 06.11): цена выбранного плана — строкой в нижней панели над кнопкой («Ultra · Год — €39,99 в год»), из того же источника, что плитки (промо → цена магазина → справочная «≈»)
  const planPriceShown = selectedPromo?.promoPriceString || (p.selected === 'monthly' ? p.monthlyPrice : p.yearlyPrice);
  const planLine = labelReady && planPriceShown
    ? `${p.selected === 'monthly' ? `${SUBSCRIPTION_TIER_NAME.plus} · ${pick(lang, COPY.month)}` : `${SUBSCRIPTION_TIER_NAME.ultra} · ${pick(lang, COPY.year)}`} — ${planPriceShown} ${pick(lang, p.selected === 'monthly' ? COPY.perMonth : COPY.perYear)}`
    : '';
  useEffect(() => {
    console.log('[PAYWALL-FIT]', JSON.stringify({ priceInDock: planLine || null, plan: p.selected, ready: labelReady })); // guard-ok: цена выбранного плана в нижней панели
  }, [planLine, p.selected, labelReady]);
  const cta = paywallPlusCtaCopy(lang, {
    selected: p.selected, yearlyPrice: p.yearlyPrice, monthlyPrice: p.monthlyPrice, yearlyTrialDays, monthlyTrialDays,
    yearlyPromo, monthlyPromo,
  });

  // зачем (координатор 14.10, 🔴 «закрыл предложение — всё зависло», Сверка WB-4): «ручка» шторки обещает свайп вниз — теперь
  // он закрывает тем же путём, что крестик. Во время оплаты и на экране напоминания свайп выключен.
  const swipeEnabled = !checkoutInFlight && !prompt;
  const onSwipeClose = (dy: number) => {
    console.log(`[WINBACK-FREEZE] t=${Date.now() % 100000} sheet swipe_close dy=${Math.round(dy)} context=${ctx}`); // guard-ok: закрытие свайпом
    p.handleClose('close', 'swipe');
  };

  const paywallTier = p.selected === 'yearly' ? 'ultra' : 'plus';
  // зачем (владелец 11.11, макет docs/work/mockups/paywall-sell-2026-11-11/variant-a.html «Два пути», 1 к 1): первый экран — знак уровня,
  // заголовок, подпись и две кнопки-тарифа, которые сами покупают. Окно «Не видим твой Plus» остаётся на прежней раскладке: там первой идёт «Восстановить покупки».
  const duo = !serverRefused;
  const tierMix = useDuoTierMix(paywallTier);
  const duoTitle = applyTierName(contextual ? headline.title : (triLang(lang, PLUS_TAB_HEADLINE) ?? PLUS_TAB_HEADLINE.ru), paywallTier);
  const duoSubtitle = headline.subtitle ? applyTierName(headline.subtitle, paywallTier) : '';
  const { handlePurchase, savingsPct } = p;
  // зачем (владелец 11.11, макет paywall-store-unavailable-2026-11-11): магазин на устройстве ответил «недоступен» — покупать здесь нечем.
  // Вместо кнопок-тарифов с примерной ценой показываем выход: Android — бот в Telegram, iPhone — поддержка; рядом «У меня есть код».
  const storeOff = duo && p.storeUnavailableReason === 'billing_unavailable';
  const storeOffWay = storeOffRoute(Platform.OS);
  useEffect(() => {
    if (!storeOff) return;
    DebugLogger.info('[PAYWALL-STOREOFF]', `показано: ctx=${ctx} source=${source} платформа=${Platform.OS} выход=${storeOffWay} код=${String(controlVisibility.promoVisible)} причина=${String(p.storeUnavailableReason)}`);
  }, [controlVisibility.promoVisible, ctx, p.storeUnavailableReason, source, storeOff, storeOffWay]);
  const openSupportFromStoreOff = useCallback((why: string) => {
    DebugLogger.info('[PAYWALL-STOREOFF]', `поддержка: открываем обращение (${why}) ctx=${ctx}`);
    // зачем («нет окна внутри окна», 26.10): обращение заменяет пейвол, а не открывается поверх него — как промокод и «Пригласить друга»
    router.replace('/support_report' as never);
  }, [ctx, router]);
  const onStoreOffPrimary = useCallback(() => {
    if (storeOffWay !== 'telegram') { openSupportFromStoreOff('button'); return; }
    DebugLogger.info('[PAYWALL-STOREOFF]', `telegram: открываем бота ctx=${ctx} source=${source}`);
    // зачем: если Telegram открыть нечем (нет приложения и браузера), человек не остаётся без выхода — ведём в поддержку
    Linking.openURL(PREMIUM_TELEGRAM_BOT_URL).catch((error: unknown) => {
      console.warn('[PAYWALL-STOREOFF] telegram: ссылка не открылась', error instanceof Error ? error.message : String(error)); // guard-ok: catch пишет причину
      openSupportFromStoreOff('telegram_failed');
    });
  }, [ctx, openSupportFromStoreOff, source, storeOffWay]);
  const onStoreOffCode = useCallback(() => {
    DebugLogger.info('[PAYWALL-STOREOFF]', `код: открываем ввод промокода ctx=${ctx} source=${source}`);
    openPromoCodeFromPaywall(router, { context: ctx, source });
  }, [ctx, router, source]);
  const buySelected = useCallback(() => { void handlePurchase(); }, [handlePurchase]);
  const dockLabel = p.previewPrices ? pick(lang, COPY.pricesPreview) : labelReady && selectedPromo ? cta.label : selectedTrial ? (PAYWALL_V3_CTA_TRIAL[lang] ?? PAYWALL_V3_CTA_TRIAL.en) : (PAYWALL_V3_CTA[lang] ?? PAYWALL_V3_CTA.en);
  // зачем (макет .dock): нижняя кнопка покупки появляется, когда тарифы первого экрана прокручены за верх окна; состояние меняется только на пересечении порога — без ре-рендера на каждый кадр прокрутки
  const [stickyOn, setStickyOn] = useState(false);
  const stickyAt = Math.max(240, (viewportHeight || windowHeight) * 0.8);
  const onScrollY = useCallback((y: number) => {
    const on = y > stickyAt;
    setStickyOn((was) => {
      if (was !== on) console.log(`[PAYWALL-DUO] нижняя кнопка ${on ? 'показана' : 'скрыта'}: y=${Math.round(y)} порог=${Math.round(stickyAt)}`); // guard-ok: одна строка на пересечение порога
      return on;
    });
  }, [stickyAt]);
  useEffect(() => {
    DebugLogger.info('[PAYWALL-DUO]', `первый экран: duo=${String(duo)} ctx=${ctx} уровень=${paywallTier} заголовок=«${duoTitle}» контекстный=${String(contextual)} выгодаГода=${savingsPct ?? 'нет'}`);
  }, [contextual, ctx, duo, duoTitle, savingsPct, paywallTier]);
  return (
    <PaywallTierScope tier={paywallTier}>
    <View style={S.root}>
      <Stack.Screen options={screenOptions} />
      {prompt ? (
        <View pointerEvents="none" style={[StyleSheet.absoluteFill, { backgroundColor: g.bg }]}>
          <LinearGradient pointerEvents="none" colors={[g.bgTop, g.bg, g.bgBottom]} style={StyleSheet.absoluteFill} />
        </View>
      ) : null}
      {prompt ? (
        <PaywallTrialReminderPrompt lang={lang} g={g} topInset={insets.top} bottomInset={insets.bottom}
          onAllow={p.allowTrialReminder} onSkip={p.skipTrialReminder} />
      ) : (
        <PaywallSwipeSheet testID="paywall-sheet" style={[S.screen, { backgroundColor: g.bg, paddingTop: insets.top }]}
          enabled={swipeEnabled} travel={windowHeight} onSwipeClose={onSwipeClose}
          header={<PaywallPlusHeader lang={lang} g={g} closeVisible={controlVisibility.closeVisible} closeDisabled={checkoutInFlight}
            onClose={() => p.handleClose('close', 'x')} />}
        >
          {duo ? <PaywallDuoGlow mix={tierMix} isLight={g.isLight} /> : null}
          <PaywallPlusScroll onViewportHeight={setViewportHeight} onScrollY={duo ? onScrollY : undefined}>
            <PaywallPlusDock hideCta={duo} lowerStyle={duo ? [S.duoMore, { backgroundColor: g.opaqueCard }] : undefined} planLine={planLine} serverRefused={serverRefused} onLater={() => p.handleClose('close', 'x')} lang={lang} g={g} state={state} label={p.previewPrices ? pick(lang, COPY.pricesPreview) : labelReady && selectedPromo ? cta.label : selectedTrial ? (PAYWALL_V3_CTA_TRIAL[lang] ?? PAYWALL_V3_CTA_TRIAL.en) : (PAYWALL_V3_CTA[lang] ?? PAYWALL_V3_CTA.en)} fine={selectedTrial || selectedPromo ? cta.fine : (PAYWALL_V3_AUTO_RENEW[lang] ?? PAYWALL_V3_AUTO_RENEW.en)}
              viewportHeight={viewportHeight || Math.max(0, windowHeight - insets.top - 44)}
              planSection={(
                <>
                  {duo ? (
                    <>
                      <View style={S.duoGrow} />
                      <PaywallDuoHero mix={tierMix} />
                      <Text accessibilityRole="header" testID={contextual ? 'paywall-context-title' : 'paywall-title'} style={[S.duoTitle, { color: g.text }]}>{duoTitle}</Text>
                      {duoSubtitle ? <Text testID="paywall-subtitle" style={[S.duoSub, { color: g.mutedText }]}>{duoSubtitle}</Text> : null}
                      <View style={S.duoGrow} />
                    </>
                  ) : <PaywallPlusHeading g={g} title={paywallChoosePlan(lang)} />}
                  {storeOff ? (
                    <PaywallDuoStoreOff lang={lang} g={g} tier={paywallTier} route={storeOffWay} codeVisible={controlVisibility.promoVisible}
                      busy={ctaBusy} onPrimary={onStoreOffPrimary} onCode={onStoreOffCode} />
                  ) : (
                  <>
                  {plansShown === 'loading' ? <PaywallPlusPlansSkeleton g={g} /> : null}
                  {plansShown === 'error' ? <PaywallPlusPriceNote lang={lang} g={g} reason={p.storeUnavailableReason} /> : null}
                  {plansShown === 'ready' && duo ? (
                    <PaywallDuoPlans lang={lang} g={g} selected={p.selected} onSelect={selectPlan} onBuy={buySelected} busy={ctaBusy}
                      yearlyPrice={p.yearlyPrice} monthlyPrice={p.monthlyPrice} yearlyTrialDays={yearlyTrialDays} monthlyTrialDays={monthlyTrialDays}
                      yearlyPromo={yearlyPromo} monthlyPromo={monthlyPromo} savingsPct={savingsPct} />
                  ) : null}
                  {plansShown === 'ready' && !duo ? (
                    <PaywallPlusPlans lang={lang} g={g} selected={p.selected} onSelect={selectPlan} disabled={ctaBusy}
                      yearlyPrice={p.yearlyPrice} yearlyPerMonth={p.yearlyPerMonth} monthlyPrice={p.monthlyPrice}
                      yearlyTrialDays={yearlyTrialDays} monthlyTrialDays={monthlyTrialDays}
                      yearlyPromo={yearlyPromo} monthlyPromo={monthlyPromo}
                      yearlyPriceSource={p.yearlyPriceSource} monthlyPriceSource={p.monthlyPriceSource} savingsPct={p.savingsPct} />
                  ) : null}
                  {/* зачем (владелец 11.10, Ядро a0a910e9d): справочная цена — честная тихая строка под плитками; причину «магазина нет» оставляем тихо же. */}
                  {plansShown === 'ready' && (p.pricesApproximate || p.storeUnavailableReason === 'billing_unavailable') ? (
                    <Text testID="paywall-price-note" style={[S.priceNote, { color: g.mutedText }]}>
                      {p.storeUnavailableReason === 'billing_unavailable' ? pick(lang, COPY.storeUnavailable) : pick(lang, COPY.priceWillConfirm)}
                    </Text>
                  ) : null}
                  </>
                  )}
                </>
              )}
              // зачем (окно «магазин недоступен»): строки про списание нет — покупки в окне нет
              hideFine={storeOff}
              notice={p.tapNotice} purchasing={p.purchasing} disabled={ctaBusy} bottomInset={insets.bottom}
              onPress={() => { void p.handlePurchase(); }}
              // зачем (R1_PAYWALL_UX, координатор 12.10): «Восстановить» не зависит от цен — раньше она молча не нажималась всё время загрузки цен (до потолка 12 с),
              // а вернувшийся покупатель как раз сюда и идёт. Блокируем на время платёжного пайплайна или восстановления.
              restoring={p.restoring} restoreVisible={controlVisibility.restoreVisible} restoreDisabled={ctaBusy}
              onRestore={() => { void p.handleRestore(); }}
              promoVisible={controlVisibility.promoVisible} promoDisabled={ctaBusy}
              onPromo={() => {
                if (ctaBusy) return;
                // зачем (26.10, «нет окна внутри окна»): промокод заменяет пейвол, а не открывается поверх него — см. openPromoCodeFromPaywall
                openPromoCodeFromPaywall(router, { context: ctx, source });
              }}>
              {contextual && !duo ? (
                <Text accessibilityRole="header" testID="paywall-context-title" style={[S.contextTitle, { color: g.text }]}>
                  {applyTierName(headline.title, paywallTier)}
                </Text>
              ) : null}
              {headline.pill ? <Text testID="paywall-pill" style={[S.contextNote, { color: g.accentTextSafe }]}>{headline.pill}</Text> : null}
              {contextual && !duo && headline.subtitle ? <Text testID="paywall-subtitle" style={[S.contextNote, { color: g.secondary }]}>{applyTierName(headline.subtitle, paywallTier)}</Text> : null}
              {mFactCaption ? <Text style={[S.contextNote, { color: g.secondary }]}>{mFactCaption}</Text> : null}
              {duo
                ? <PaywallDuoMore lang={lang} g={g} tier={paywallTier} items={benefits} trialDays={selectedTrial} chargePrice={planPriceShown || ''} />
                : <PlusTabBenefits lang={lang} g={g} items={benefits} />}
              {showInvite ? (
                <V2Pressable testID="entitlement-expired-invite" accessibilityRole="button" disabled={ctaBusy}
                  onPress={() => router.replace('/referrals')} style={S.invite}>
                  <Text style={[S.contextNote, { color: g.accentTextSafe }]}>{pick(lang, COPY.inviteFriend)}</Text>
                </V2Pressable>
              ) : null}
            </PaywallPlusDock>
          </PaywallPlusScroll>
          {duo && !storeOff ? (
            <PaywallDuoStickyBuy g={g} tier={paywallTier} visible={stickyOn} label={applyTierName(dockLabel, paywallTier)} note={planPriceShown ? `${planPriceShown} ${pick(lang, p.selected === 'monthly' ? COPY.perMonth : COPY.perYear)}` : ''}
              busy={p.purchasing} disabled={ctaBusy} bottomInset={insets.bottom} onPress={buySelected} />
          ) : null}
        </PaywallSwipeSheet>
      )}
    </View>
    </PaywallTierScope>
  );
}

const S = StyleSheet.create({
  invite: { minHeight: 48, alignSelf: 'center', justifyContent: 'center', paddingHorizontal: 12 },
  contextTitle: { marginTop: 16, fontSize: 21, lineHeight: 27, fontWeight: '800' },
  contextNote: { marginTop: 8, fontSize: 14, lineHeight: 20 },
  priceNote: { marginTop: 10, fontSize: 13, lineHeight: 18, textAlign: 'center' },
  // макет «Два пути»: заголовок 33 · 900 · −1, подпись 15/22 с отступом 10; распорки прижимают тарифы к низу первого экрана
  duoGrow: { flexGrow: 1, minHeight: 16 },
  duoTitle: { fontSize: 33, lineHeight: 37, fontWeight: '900', letterSpacing: -1 },
  duoSub: { marginTop: 10, marginBottom: 8, fontSize: 15, lineHeight: 22 },
  // макет .more: панель на всю ширину окна (поля прокрутки 24 сняты отрицательным отступом), скругление 28 сверху, поля 22, запас снизу под выезжающую кнопку
  duoMore: { marginHorizontal: -24, paddingHorizontal: 22, paddingTop: 8, paddingBottom: 96, borderTopLeftRadius: 28, borderTopRightRadius: 28 },
  root: { flex: 1 },
  screen: { flex: 1 },
});
