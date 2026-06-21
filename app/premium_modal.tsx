import React, { useEffect, useRef } from 'react';
import { StyleSheet, View } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useLocalSearchParams, useRouter, useRootNavigationState } from 'expo-router';

import {
  refreshPaywallAbConfigInBackground,
  resolvePaywallAbVariantSync,
  type PaywallAbVariant,
} from './paywall_variant';
import { safeRouterBack } from './navigation_back';
import { getVerifiedPremiumAccessStatus, invalidatePremiumCache } from './premium_guard';
import {
  activatePendingPersonalPlanAfterPremium,
  PERSONAL_PLAN_ONBOARDING_NICKNAME_PENDING_KEY,
} from './personal_plan_activation';
import { readPersonalPlanState } from './personal_plan_state';
import { emitAppEvent } from './events';

type RouteParams = Record<string, string | string[]>;

const PAYWALL_ROUTES: Record<PaywallAbVariant, '/paywall_a' | '/paywall_b' | '/paywall_c'> = {
  A: '/paywall_a',
  B: '/paywall_b',
  C: '/paywall_c',
};

const ACCESS_CHECK_TIMEOUT_MS = 700;

function firstParam(raw: string | string[] | undefined): string {
  return Array.isArray(raw) ? (raw[0] ?? '') : (raw ?? '');
}

function withFallback<T>(promise: Promise<T>, fallback: T, ms: number): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<T>(resolve => {
    timer = setTimeout(() => resolve(fallback), ms);
  });
  return Promise.race([promise, timeout]).finally(() => {
    if (timer !== undefined) clearTimeout(timer);
  });
}

async function finishPersonalPlanActivation(router: ReturnType<typeof useRouter>): Promise<void> {
  // Захватываем результат: null = активировать было нечего (нет отложенного плана).
  const activated = await activatePendingPersonalPlanAfterPremium();
  invalidatePremiumCache();
  emitAppEvent('premium_activated');

  const pendingNickname = await AsyncStorage
    .getItem(PERSONAL_PLAN_ONBOARDING_NICKNAME_PENDING_KEY)
    .catch(() => null);
  if (pendingNickname === '1') {
    await AsyncStorage.multiSet([
      ['onboarding_step', 'name'],
      [PERSONAL_PLAN_ONBOARDING_NICKNAME_PENDING_KEY, '1'],
    ]).catch(() => {});
    await AsyncStorage.removeItem('onboarding_done').catch(() => {});
    emitAppEvent('personal_plan_onboarding_nickname_ready');
    router.replace('/(tabs)/home' as any);
    return;
  }

  // Экран «План включён» — только когда реально есть что показывать (план активирован
  // сейчас ИЛИ уже сохранён ранее). Иначе уводим на главную, а не в post-purchase
  // thank-you с обещанием «Premium активен, план сохранён» — это и замыкало петлю
  // paywall→thank-you→plan→paywall для пользователя без плана.
  if (!activated) {
    const existing = await readPersonalPlanState().catch(() => null);
    if (!existing) {
      router.replace('/(tabs)/home' as any);
      return;
    }
  }

  router.replace('/personal_plan_thank_you' as any);
}

async function maybeFinishAlreadyPremiumPersonalPlan(
  params: RouteParams,
  router: ReturnType<typeof useRouter>,
): Promise<boolean> {
  if (firstParam(params.context) !== 'personal_plan') return false;
  // Сбрасываем 5-мин модульный кэш доступа ДО проверки: иначе диспетчер мог прочитать
  // устаревший true (напр. intro/loyalty уже истёк, а кэш ещё «да») и увести на
  // thank-you, пока экран плана по свежему расчёту видит «нет доступа» → петля.
  invalidatePremiumCache();
  const hasAccess = await withFallback(
    getVerifiedPremiumAccessStatus().catch(() => false),
    false,
    ACCESS_CHECK_TIMEOUT_MS,
  );
  if (!hasAccess) return false;
  await finishPersonalPlanActivation(router);
  return true;
}

/** Replace на целевой пейвол (или manage_subscription). Выносим из эффекта, чтобы вызвать
 *  как из effect #1 (обычный путь), так и из effect #2 (когда personal_plan-юзер НЕ премиум). */
function replaceToPaywall(params: RouteParams, router: ReturnType<typeof useRouter>): void {
  if (firstParam(params.manage) === '1') {
    router.replace('/manage_subscription' as any);
    return;
  }
  refreshPaywallAbConfigInBackground();
  const { variant } = resolvePaywallAbVariantSync();
  router.replace({
    pathname: PAYWALL_ROUTES[variant],
    params: { ...params },
  } as any);
}

export default function PremiumModalDispatcher() {
  const router = useRouter();
  const params = useLocalSearchParams<RouteParams>();

  // Готов ли корневой навигатор. При холодном старте прямо на /premium_modal (deep-link,
  // первый экран) Root Layout ещё НЕ смонтирован — навигация в этот момент бросает
  // «Attempted to navigate before mounting the Root Layout». Ждём, пока появится key.
  const rootNavState = useRootNavigationState();
  const rootNavReady = Boolean(rootNavState?.key);
  const dispatchedRef = useRef(false);

  // Replace на целевой пейвол — РОВНО ОДИН раз и только после монтирования рут-навигатора.
  // Вариант решается синхронно из кэша; A/B-конфиг обновляется в фоне. Подложка прозрачная,
  // поэтому лишний кадр до replace не виден.
  //
  // ВАЖНО (анти-мерцание пейвола, аудит P2/P3 #17): для контекста personal_plan НЕ делаем
  // replace на пейвол здесь. Если юзер УЖЕ премиум, мы бы показали пейвол, а затем эффект
  // ниже увёл бы на thank-you — видимый мигающий пейвол на платном пути. Поэтому для
  // personal_plan решение принимает ТОЛЬКО эффект-проверки доступа: премиум → thank-you/план,
  // не премиум → сам сделает replace на пейвол. Два replace больше не конфликтуют.
  const isPersonalPlanContext = firstParam(params.context) === 'personal_plan'
    && firstParam(params.manage) !== '1';

  useEffect(() => {
    if (!rootNavReady || dispatchedRef.current) return;
    if (isPersonalPlanContext) return; // решает эффект проверки доступа ниже
    dispatchedRef.current = true;
    replaceToPaywall(params, router);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rootNavReady]);

  useEffect(() => {
    if (!rootNavReady) return;
    let cancelled = false;
    const run = async () => {
      if (firstParam(params.manage) === '1') return;
      if (!isPersonalPlanContext) return;
      if (dispatchedRef.current) return;
      dispatchedRef.current = true;
      // Уже премиум → доводим активацию плана и уходим (thank-you/план/home — внутри).
      // Не премиум → показываем пейвол ИЗ ЭТОГО ЖЕ эффекта, без предварительного мелькания.
      const finished = await maybeFinishAlreadyPremiumPersonalPlan(params, router);
      if (cancelled || finished) return;
      replaceToPaywall(params, router);
    };
    void run();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rootNavReady]);

  // Прозрачная подложка на один кадр до replace — без тёмного экрана и спиннера.
  return <View style={styles.root} />;
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: 'transparent',
  },
});
