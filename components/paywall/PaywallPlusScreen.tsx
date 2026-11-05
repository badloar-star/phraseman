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
import { BackHandler, Platform, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { PaywallSwipeSheet } from './PaywallSwipeSheet';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';

import { useLang } from '../LangContext';
import { useTheme } from '../ThemeContext';
import { LinearGradient } from '../SafeLinearGradient';
import type { Lang } from '../../constants/i18n';
import { liquidGlassTokens } from '../../constants/liquidGlassThemePalette';
import { useStableSafeAreaInsets } from '../../app/stable_safe_area_metrics';
import { usePaywallPurchase, type PaywallPlan } from '../../app/paywall_purchase';
import { paywallEntryAnalyticsParams, SERVER_REFUSED_CONTEXT, type PaywallEntry } from '../../app/paywall_entry_contract';
import { PaywallPlusDockSwitch } from './PaywallServerRefusedDock';
import { parseResumeLessonId } from '../../app/paywall_lesson_continuation';
import { logPaywallFunnel } from '../../app/paywall_funnel';
import { trackEvent } from '../../app/analytics';
import { createPaywallAnalyticsImpression, paywallImpressionParams } from '../../app/paywall_analytics_impression';
import { animateNextLayoutTransition } from '../../app/smooth_layout';
import { DebugLogger } from '../../app/debug-logger';
import { useLoadGate } from '../../app/use_load_gate';
import { PaywallScrim, usePaywallScreenStackOptions } from './paywallShared';
import {
  PaywallPlusDetails, PaywallPlusHeader, PaywallPlusPlans, PaywallPlusPlansSkeleton, PaywallPlusPriceNote,
   PaywallPlusScroll, paywallPlusCtaCopy,
  type PaywallPlusState,
} from './PaywallPlus';
import PaywallTrialReminderPrompt from './PaywallTrialReminderPrompt';
import { COPY, pick } from './PaywallPlusCopy';
import { paywallContextHeadline, paywallEntryFactsFromParams } from '../../app/paywall_context_headline';
import { PaywallTierScope } from './paywall_tier_context';
import { PAYWALL_V3_CTA } from '../../app/paywall_language_add_copy';
import { PAYWALL_V3_AUTO_RENEW, PAYWALL_V3_CTA_TRIAL, paywallV3Rows } from '../../app/paywall_v3_rows';
import { paywallV3Body } from '../../app/paywall_language_add_copy';
import { onAppEvent } from '../../app/events';
import { getPaywallControlVisibility } from '../../app/paywall_control_visibility';
import { isPaywallMEnabled } from './m/paywall_m_flag';
import { paywallMHeadKindForContext } from './m/paywall_m_head';
import { usePaywallMPerson } from './m/use_paywall_m_person';
import { openPromoCodeFromPaywall } from '../../app/paywall_promo_navigation';
import { paywallCFactCaption } from './paywall_c_fact_caption';

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
  const ctx = entry.context;
  const source = entry.source;
  // зачем (координатор 25.10, Ядро c161d894a): вход «Не видим твой Plus» — свой низ окна: «Восстановить покупки» первой, «Оформить Plus» второй
  const serverRefused = ctx === SERVER_REFUSED_CONTEXT;
  const [controlVisibility, setControlVisibility] = useState(getPaywallControlVisibility);
  // зачем (владелец «Да, так», координатор 25.10): пейвол «Вариант М» — за флагом «Пульта» paywall_m_enabled, по умолчанию выключен; вход «Не видим твой Plus» остаётся на своём доке
  const [mFlag, setMFlag] = useState(isPaywallMEnabled);
  const mPerson = usePaywallMPerson(mFlag);
  // зачем (макет М, окна по месту): факты места входа — из параметров маршрута (урок и число фраз Мастерской от кнопки урока; закрытый урок замка — lessons_done + 1)
  const wsLessonParam = firstParam((params as Record<string, string | string[] | undefined>).workshop_lesson);
  const wsPhrasesParam = firstParam((params as Record<string, string | string[] | undefined>).workshop_phrases);
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
      lockedLesson: num(wsLessonParam) ?? (done === null ? null : done + 1), workshopPhrases: num(wsPhrasesParam),
      dialogMinutes: num(dialogMinutesParam), dialogPhrases: num(dialogTurnsParam),
      correctionWas: was && now ? was : null, correctionNow: was && now ? now : null,
    };
  }, [lessonsDoneFact, wsLessonParam, wsPhrasesParam, dialogMinutesParam, dialogTurnsParam, dialogWasParam, dialogNowParam]);
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
  // зачем (владелец 11.10: «все пейволы должны быть контекстными всегда»): тексты окна — по месту входа. Тексты берутся
  // из уже написанных paywall_copy.ts (контракт app/paywall_context_headline.ts); вход без своего текста (generic) —
  // прежняя шапка пробного периода.
  // зачем (утверждённые тексты 11.10): пилюля «Урок 4 закрыт» / «Серия 12 дней» берёт числа из параметров входа.
  const lessonsDoneParam = params.lessons_done;
  const streakParam = params.streak;
  const headline = useMemo(
    () => paywallContextHeadline(ctx, lang, paywallEntryFactsFromParams({ lessons_done: lessonsDoneParam, streak: streakParam })),
    [ctx, lang, lessonsDoneParam, streakParam],
  );
  const contextual = headline.copyContext !== 'generic' && !!headline.title;
  // зачем (макет «Все окна Plus», вариант 3; слово владельца 05.11: «макеты пейволов одобряю! внести 1 в 1»): у КАЖДОГО окна свой заголовок и подзаголовок (у общего входа — «Всё приложение целиком»),
  // три пункта (первый по месту, «Курс дальше», «Больше практики») и абзац про бесплатные уроки 1–3; первая строка больше не повторяет подзаголовок (🔴 №44 Макетов).
  const v3Rows = useMemo(() => paywallV3Rows(ctx, lang, headline.firstBenefit), [ctx, lang, headline.firstBenefit]);
  const v3Paragraph = useMemo(() => paywallV3Body(lang).paragraph, [lang]);
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
  const cta = paywallPlusCtaCopy(lang, {
    selected: p.selected, yearlyPrice: p.yearlyPrice, monthlyPrice: p.monthlyPrice, yearlyTrialDays, monthlyTrialDays,
    yearlyPromo, monthlyPromo,
    yearlyApprox: p.yearlyPriceSource === 'reference', monthlyApprox: p.monthlyPriceSource === 'reference',
  });

  // зачем (координатор 14.10, 🔴 «закрыл предложение — всё зависло», Сверка WB-4): «ручка» шторки обещает свайп вниз — теперь
  // он закрывает тем же путём, что крестик. Во время оплаты и на экране напоминания свайп выключен.
  const swipeEnabled = !checkoutInFlight && !prompt;
  const onSwipeClose = (dy: number) => {
    console.log(`[WINBACK-FREEZE] t=${Date.now() % 100000} sheet swipe_close dy=${Math.round(dy)} context=${ctx}`); // guard-ok: закрытие свайпом
    p.handleClose('close', 'swipe');
  };

  const closeWindow = () => {
    console.log(`[WINBACK-FREEZE] t=${Date.now() % 100000} sheet scrim_tap checkout=${checkoutInFlight}`); // guard-ok: временная трассировка
    if (checkoutInFlight) {
      console.log('[PAYWALL-CLOSE] scrim ignored reason=checkout_in_flight'); // guard-ok: ранний выход пишет причину
      return;
    }
    p.handleClose('close', 'scrim');
  };

  // зачем (владелец 06.11, Plus/Ultra): Год = Ultra, Месяц = Plus — заголовок, кнопка и тексты «с Plus» следуют выбранной плитке.
  const paywallTier = p.selected === 'yearly' ? 'ultra' : 'plus';
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
        <>
          {/* зачем (решение владельца 11.10, вариант 1 «Шторка»): окно выезжает поверх того экрана, где человек был, — за ним затемнённый
              прежний экран, тап по затемнению закрывает (кроме времени оплаты). */}
          <PaywallScrim onPress={closeWindow} />
          <PaywallSwipeSheet testID="paywall-sheet" style={[S.sheet, { backgroundColor: g.bg, maxHeight: windowHeight - insets.top - 8 }]}
            enabled={swipeEnabled} travel={windowHeight} onSwipeClose={onSwipeClose}
            header={<PaywallPlusHeader lang={lang} g={g} trialDays={yearlyTrialDays} closeVisible={controlVisibility.closeVisible} closeDisabled={checkoutInFlight}
              onClose={() => { console.log(`[WINBACK-FREEZE] t=${Date.now() % 100000} sheet close_button`); p.handleClose('close', 'x'); }}
              contextTitle={headline.title || undefined}
              contextSubtitle={headline.title ? headline.subtitle : undefined}
              contextPill={headline.pill || undefined} />}
          >
            <PaywallPlusScroll>
              {/* зачем: выгода этого входа стоит над тарифами (`.ben.glass` макета). */}
              <PaywallPlusDetails lang={lang} g={g}
                leadBenefit={contextual && headline.firstBenefit ? headline.firstBenefit : undefined}
                // зачем (Сверка 05.11, premium_expired: первая выгода наезжала на подзаголовок, overflow 55): когда шапка уже показывает подзаголовок (есть заголовок входа), подпись первой выгоды его не повторяет
                leadCaption={contextual && !headline.title ? headline.subtitle : undefined}
                factCaption={mFactCaption}
                items={v3Rows} paragraph={v3Paragraph} />
              {/* зачем (paywall-gaps-states «Лента пробного периода»): порядок образца — выгода, лента, тарифы */}
              {/* C keeps trial truth compact: each plan shows its own trial; CTA fine shows charge/renewal. */}
              {/* зачем (D158): скелетон — только пока идёт загрузка (потолок 12 с); после потолка — спокойное
                  «Сейчас недоступно» на месте цен. Кнопка покупки активна в обоих случаях, повтор — тихо в фоне. */}
              {plansShown === 'loading' ? <PaywallPlusPlansSkeleton g={g} /> : null}
              {plansShown === 'error' ? <PaywallPlusPriceNote lang={lang} g={g} reason={p.storeUnavailableReason} /> : null}
              {plansShown === 'ready' ? (
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
            </PaywallPlusScroll>
            <PaywallPlusDockSwitch serverRefused={serverRefused} onLater={() => p.handleClose('close', 'x')} lang={lang} g={g} state={state} label={p.previewPrices ? pick(lang, COPY.pricesPreview) : labelReady && selectedPromo ? cta.label : selectedTrial ? (PAYWALL_V3_CTA_TRIAL[lang] ?? PAYWALL_V3_CTA_TRIAL.en) : (PAYWALL_V3_CTA[lang] ?? PAYWALL_V3_CTA.en)} fine={selectedTrial || selectedPromo ? cta.fine : (PAYWALL_V3_AUTO_RENEW[lang] ?? PAYWALL_V3_AUTO_RENEW.en)}
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
              }} />
          </PaywallSwipeSheet>
        </>
      )}
    </View>
    </PaywallTierScope>
  );
}

const S = StyleSheet.create({
  priceNote: { marginTop: 10, fontSize: 13, lineHeight: 18, textAlign: 'center' },
  // зачем: корень прозрачный — окно лежит поверх прежнего экрана (transparentModal), снизу шторка со скруглёнными верхними углами.
  root: { flex: 1, justifyContent: 'flex-end' },
  sheet: { borderTopLeftRadius: 30, borderTopRightRadius: 30, overflow: 'hidden' },
});
