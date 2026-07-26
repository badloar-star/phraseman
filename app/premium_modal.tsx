import React, { useEffect, useRef } from 'react';
import { InteractionManager, StyleSheet } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useLocalSearchParams, useRouter, useRootNavigationState } from 'expo-router';

import { LinearGradient } from '../components/SafeLinearGradient';
import {
  openPremiumPaywall,
  resolveCurrentPaywallRoute,
} from './paywall_navigation';
import PaywallA from './paywall_a';
import PaywallB from './paywall_b';
import PaywallC from './paywall_c';
import PaywallD from './paywall_d';
import PaywallE from './paywall_e';
import PaywallF from './paywall_f';
import PaywallG from './paywall_g';
import { getVerifiedPremiumAccessStatus, invalidatePremiumCache } from './premium_guard';
import {
  activatePendingPersonalPlanAfterPremium,
  PERSONAL_PLAN_ONBOARDING_NICKNAME_PENDING_KEY,
} from './personal_plan_activation';
import { readPersonalPlanState } from './personal_plan_state';
import { emitAppEvent } from './events';

type RouteParams = Record<string, string | string[]>;

// 700мс покрывали только локальный кэш: оплатившему юзеру на медленной сети
// (холодный старт после переустановки, RC отвечает секунды) показывался пейвол
// вместо thank-you. 2500мс — компромисс: хватает на один медленный RTT, а
// неплатящий видит пейвол лишь на пару секунд позже в худшем случае.
const ACCESS_CHECK_TIMEOUT_MS = 2500;

type ScheduledNavigation = {
  cancel: () => void;
};

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

function scheduleAfterRootNavigationReady(navigate: () => void): ScheduledNavigation {
  let cancelled = false;
  let timer: ReturnType<typeof setTimeout> | null = null;
  const task = InteractionManager.runAfterInteractions(() => {
    timer = setTimeout(() => {
      if (!cancelled) navigate();
    }, 0);
  });

  return {
    cancel: () => {
      cancelled = true;
      if (timer !== null) clearTimeout(timer);
      task.cancel?.();
    },
  };
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

  // Post-purchase auth prompt host is shown only when there is a real activated
  // or existing plan. Otherwise go home instead of creating a paywall/auth/plan
  // loop for a user without a plan.
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
  openPremiumPaywall(router, params, 'replace');
}

function renderPaywallRoute(route: ReturnType<typeof resolveCurrentPaywallRoute>) {
  if (route === '/paywall_a') return <PaywallA />;
  if (route === '/paywall_b') return <PaywallB />;
  if (route === '/paywall_d') return <PaywallD />;
  if (route === '/paywall_e') return <PaywallE />;
  if (route === '/paywall_f') return <PaywallF />;
  if (route === '/paywall_g') return <PaywallG />;
  return <PaywallC />;
}

export default function PremiumModalDispatcher() {
  const router = useRouter();
  const params = useLocalSearchParams<RouteParams>();
  const paywallRouteRef = useRef<ReturnType<typeof resolveCurrentPaywallRoute> | null>(null);

  // Готов ли корневой навигатор. При холодном старте прямо на /premium_modal (deep-link,
  // первый экран) Root Layout ещё НЕ смонтирован — навигация в этот момент бросает
  // «Attempted to navigate before mounting the Root Layout». Ждём, пока появится key.
  const rootNavState = useRootNavigationState();
  const rootNavReady = Boolean(rootNavState?.key);
  const dispatchedRef = useRef(false);

  // Replace на целевой пейвол — РОВНО ОДИН раз и только после монтирования рут-навигатора.
  // Вариант решается синхронно из кэша; A/B-конфиг обновляется в фоне.
  // Replace is scheduled after interactions; the root-state key can appear before
  // Expo Router accepts navigation on cold deep links.
  //
  // ВАЖНО (анти-мерцание пейвола, аудит P2/P3 #17): для контекста personal_plan НЕ делаем
  // replace на пейвол здесь. Если юзер УЖЕ премиум, мы бы показали пейвол, а затем эффект
  // ниже увёл бы на thank-you — видимый мигающий пейвол на платном пути. Поэтому для
  // personal_plan решение принимает ТОЛЬКО эффект-проверки доступа: премиум → thank-you/план,
  // не премиум → сам сделает replace на пейвол. Два replace больше не конфликтуют.
  const isPersonalPlanContext = firstParam(params.context) === 'personal_plan'
    && firstParam(params.manage) !== '1';
  const isManageContext = firstParam(params.manage) === '1';

  useEffect(() => {
    if (!rootNavReady || dispatchedRef.current) return;
    if (!isManageContext) return;
    dispatchedRef.current = true;
    const scheduled = scheduleAfterRootNavigationReady(() => {
      replaceToPaywall(params, router);
    });
    return () => scheduled.cancel();
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
      // Не премиум → НИЧЕГО не делаем: пейвол уже отрисован этим же компонентом
      // синхронно (см. renderPaywallRoute ниже). Раньше здесь был replace на
      // /paywall_*, но теперь он бы РАЗМОНТИРОВАЛ уже показанный пейвол и
      // смонтировал идентичный заново — видимый скачок + повторный прогон всех
      // эффектов пейвола (аналитика, collectPaywallStats, отзывы, перцентили).
      await maybeFinishAlreadyPremiumPersonalPlan(params, router);
      if (cancelled) return;
    };
    void run();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rootNavReady]);

  // зачем (жалоба владельца «пейвол открывается сначала пустой страницей»):
  // для personal_plan диспетчер раньше рисовал ГОЛЫЙ градиент, пока ждал
  // getVerifiedPremiumAccessStatus() — сетевой запрос в RevenueCat с таймаутом
  // ACCESS_CHECK_TIMEOUT_MS (2.5с). Всё это время юзер видел пустую тёмную
  // страницу, и только потом — пейвол. Теперь пейвол рендерится СРАЗУ, тем же
  // синхронным путём, что и обычный контекст: вариант резолвится из кэша в
  // памяти, без await.
  //
  // Ветка «уже премиум» не страдает: эффект выше делает router.replace на
  // thank-you/план на первом же тике после проверки доступа, и премиум-юзер
  // видит пейвол не дольше, чем раньше видел пустой градиент.
  //
  // Manage-режим (manage=1) оставляем на подложке: он ведёт не на пейвол, а на
  // /manage_subscription, и рисовать там пейвол было бы обманом кадра.
  if (!isManageContext) {
    if (paywallRouteRef.current === null) {
      paywallRouteRef.current = resolveCurrentPaywallRoute();
    }
    return renderPaywallRoute(paywallRouteRef.current);
  }

  return (
    <LinearGradient
      colors={['#111827', '#18233D', '#101827']}
      start={{ x: 0.5, y: 0 }}
      end={{ x: 0.5, y: 1 }}
      style={styles.root}
    />
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#111827',
  },
});
