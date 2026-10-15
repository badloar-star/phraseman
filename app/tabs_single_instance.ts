/*
 * [TABS-SINGLE] Сторож «в корневом стеке ровно один экземпляр вкладок».
 *
 * зачем (координатор 15.10, диагноз r7k/r7m): `router.replace('/(tabs)/…')` с экрана поверх вкладок кладёт в корневой стек НОВЫЙ
 * маршрут `(tabs)`, старый остаётся под ним и догоняет каждую смену маршрута — 0,3–0,7 с JS на тап впустую + память; «назад» с
 * Главной уводил в старую копию. singular/getId expo-router 6 на REPLACE не действует, свой роутер Stack не принимает — поэтому
 * сторож: после окончания перехода снимает всё НИЖЕ последнего `(tabs)`. Верхние маршруты (тот же key/params/state) не трогаются —
 * видимый экран не мигает и не перемонтируется; снимаются только нижние, без анимации.
 *
 * Условия координатора: только при ≥2 `(tabs)`; после окончания перехода (InteractionManager); повтор — no-op с логом;
 * аварийный выключатель Remote Config `tabs_single_guard` (по умолчанию ВКЛ, выключен только явным false в кэше).
 * Логи [TABS-SINGLE] на ранних выходах — навсегда; params маршрутов в лог не идут, только имена.
 */
import { useEffect } from 'react';
import { InteractionManager } from 'react-native';
import { CommonActions } from '@react-navigation/native';
import { readRemoteConfigCacheRaw } from './remote_config_client';

export const TABS_ROUTE_NAME = '(tabs)';
export const TABS_SINGLE_GUARD_FLAG = 'tabs_single_guard';
/**
 * Снимать ли лишние копии. false — режим «только журнал»: `[TABS-SINGLE] observe` пишет, с какого экрана появилась вторая копия,
 * ничего не меняя (координатор 15.10: сперва факты по всем путям, снятие — отдельным коммитом после проверки 9 путей).
 */
export const TABS_SINGLE_RESET_ENABLED = false;
const MODULE_LOADED_AT_MS = Date.now();

type NavRoute = Readonly<{ key: string; name: string; params?: unknown; state?: NavState }>;
type NavState = Readonly<{ key?: string; type?: string; index?: number; routes: ReadonlyArray<NavRoute> }>;

export type TabsDedupePlan = Readonly<{
  /** Ключ стека, где нашлись дубли (reset адресуется ему). */
  targetKey: string;
  /** Маршруты от последнего `(tabs)` и выше — как были (key/params/state). */
  routes: ReadonlyArray<NavRoute>;
  index: number;
  tabsCount: number;
  /** Имена снимаемых маршрутов (для лога). */
  removed: ReadonlyArray<string>;
}>;

export type TabsDedupeSkip = Readonly<{ skip: 'no_state' | 'focus_below_last_tabs' | 'no_stack_key' }>;

/** План снятия дублей: первый стек (обход в глубину), где `(tabs)` встречается ≥2 раз. null — дублей нет. */
export function planTabsDedupe(state: NavState | null | undefined): TabsDedupePlan | TabsDedupeSkip | null {
  if (!state || !Array.isArray(state.routes)) return { skip: 'no_state' };
  const tabsAt: number[] = [];
  state.routes.forEach((route, i) => { if (route.name === TABS_ROUTE_NAME) tabsAt.push(i); });
  if (tabsAt.length >= 2) {
    const last = tabsAt[tabsAt.length - 1];
    const focused = typeof state.index === 'number' ? state.index : state.routes.length - 1;
    // Фокус ниже последнего (tabs) — нештатное состояние стека: не трогаем, чтобы не снять то, что человек видит.
    if (focused < last) return { skip: 'focus_below_last_tabs' };
    if (!state.key) return { skip: 'no_stack_key' };
    return Object.freeze({
      targetKey: state.key,
      routes: state.routes.slice(last),
      index: focused - last,
      tabsCount: tabsAt.length,
      removed: state.routes.slice(0, last).map((r) => r.name),
    });
  }
  for (const route of state.routes) {
    if (!route.state) continue;
    const nested = planTabsDedupe(route.state);
    if (nested && !('skip' in nested && nested.skip === 'no_state')) return nested;
  }
  return null;
}

/** Первый стек (обход в глубину), где есть маршрут (tabs). */
function findTabsStack(state: NavState | null | undefined): NavState | null {
  if (!state || !Array.isArray(state.routes)) return null;
  if (state.routes.some((r) => r.name === TABS_ROUTE_NAME)) return state;
  for (const route of state.routes) {
    const nested = findTabsStack(route.state);
    if (nested) return nested;
  }
  return null;
}

type ContainerRef = Readonly<{
  addListener?: (event: 'state', cb: () => void) => (() => void) | undefined;
  getRootState?: () => NavState | undefined;
  dispatch?: (action: unknown) => void;
}>;

export type TabsSingleGuardDeps = Readonly<{
  runAfterInteractions?: (cb: () => void) => void;
  readFlagRaw?: () => Promise<string | null>;
  log?: (line: string) => void;
  /** Подмена режима для тестов; по умолчанию TABS_SINGLE_RESET_ENABLED. */
  resetEnabled?: boolean;
}>;

/** Выключатель: включён, пока в кэше Remote Config нет явного false. */
export function tabsSingleGuardEnabled(raw: string | null): boolean {
  if (!raw) return true;
  try {
    const bools = (JSON.parse(raw) as { bools?: Record<string, unknown> }).bools;
    return bools?.[TABS_SINGLE_GUARD_FLAG] !== false;
  } catch (error) {
    console.warn('[TABS-SINGLE] флаг: кэш RC не прочитан — сторож включён', error instanceof Error ? error.message : String(error)); // guard-ok: причина выбора по умолчанию
    return true;
  }
}

/** Подписка на состояние корневого контейнера. Вызывать один раз в корневой разметке. */
export function startTabsSingleInstanceGuard(ref: ContainerRef | null | undefined, deps: TabsSingleGuardDeps = {}): () => void {
  const log = deps.log ?? ((line: string) => console.log(line));
  const runAfter = deps.runAfterInteractions ?? ((cb: () => void) => { InteractionManager.runAfterInteractions(cb); });
  if (!ref || typeof ref.addListener !== 'function' || typeof ref.getRootState !== 'function' || typeof ref.dispatch !== 'function') {
    log('[TABS-SINGLE] off reason=no_container_ref');
    return () => undefined;
  }
  let enabled = true;
  const resetEnabled = deps.resetEnabled ?? TABS_SINGLE_RESET_ENABLED;
  let lastTabsCount = 0;
  let prevTopName: string | null = null;
  const tabsKeysSeen = new Set<string>();
  let stopped = false;
  let scheduled = false;
  void (deps.readFlagRaw ?? readRemoteConfigCacheRaw)()
    .then((raw) => {
      enabled = tabsSingleGuardEnabled(raw);
      log(`[TABS-SINGLE] flag ${TABS_SINGLE_GUARD_FLAG}=${enabled ? 'on' : 'off'} source=${raw ? 'rc_cache' : 'default'}`);
    })
    .catch((error: unknown) => {
      log(`[TABS-SINGLE] flag read failed — сторож включён: ${error instanceof Error ? error.message : String(error)}`);
    });

  /**
   * Наблюдение (координатор 15.10): строка только при смене числа (tabs). Источник — экран, бывший сверху на прошлом событии:
   * replace снимает его и кладёт новую копию, поэтому в текущем состоянии его уже нет. instSeen — сколько разных ключей (tabs)
   * видели за жизнь процесса. Обход O(маршрутов), состояние целиком не сериализуется.
   */
  const observe = (state: NavState | undefined, source: string): void => {
    const stack = findTabsStack(state);
    if (!stack) return;
    let count = 0;
    for (const route of stack.routes) {
      if (route.name !== TABS_ROUTE_NAME) continue;
      count += 1;
      tabsKeysSeen.add(route.key);
    }
    const focused = typeof stack.index === 'number' ? stack.index : stack.routes.length - 1;
    const top = stack.routes[focused]?.name ?? '?';
    if (count !== lastTabsCount) {
      if (count >= 2) {
        const first = stack.routes.findIndex((r) => r.name === TABS_ROUTE_NAME);
        const lastAt = stack.routes.map((r) => r.name).lastIndexOf(TABS_ROUTE_NAME);
        const between = stack.routes.slice(first + 1, lastAt).map((r) => r.name);
        log(`[TABS-SINGLE] observe tabs=${count} source=${prevTopName ?? '?'} between=[${between.join(',')}] top=${top} instSeen=${tabsKeysSeen.size} sinceStartMs=${Date.now() - MODULE_LOADED_AT_MS} event=${source}`);
      } else if (lastTabsCount >= 2) {
        log(`[TABS-SINGLE] observe resolved tabs=${count} top=${top} instSeen=${tabsKeysSeen.size} sinceStartMs=${Date.now() - MODULE_LOADED_AT_MS} event=${source}`);
      }
      lastTabsCount = count;
    }
    prevTopName = top;
  };

  const check = (source: string): void => {
    if (stopped) return;
    const rootState = ref.getRootState?.();
    observe(rootState, source);
    if (!resetEnabled) return; // режим «только журнал»: ничего не меняем
    const plan = planTabsDedupe(rootState);
    if (!plan) return; // обычное состояние: один (tabs) — тишина, это каждый переход
    if ('skip' in plan) {
      if (plan.skip !== 'no_state') log(`[TABS-SINGLE] skip reason=${plan.skip} source=${source}`);
      return;
    }
    if (!enabled) {
      log(`[TABS-SINGLE] skip reason=flag_off tabs=${plan.tabsCount} source=${source}`);
      return;
    }
    if (scheduled) {
      log(`[TABS-SINGLE] skip reason=already_scheduled tabs=${plan.tabsCount} source=${source}`);
      return;
    }
    scheduled = true;
    const foundAt = Date.now();
    log(`[TABS-SINGLE] found tabs=${plan.tabsCount} remove=[${plan.removed.join(',')}] keep=[${plan.routes.map((r) => r.name).join(',')}] source=${source} — жду конца перехода`);
    runAfter(() => {
      scheduled = false;
      if (stopped) { log('[TABS-SINGLE] skip reason=stopped_before_reset'); return; }
      // Перепроверяем по живому состоянию: за время перехода стек мог измениться.
      const live = planTabsDedupe(ref.getRootState?.());
      if (!live) { log('[TABS-SINGLE] skip reason=resolved_before_reset'); return; }
      if ('skip' in live) { log(`[TABS-SINGLE] skip reason=${live.skip} (после перехода)`); return; }
      try {
        ref.dispatch?.({ ...CommonActions.reset({ index: live.index, routes: live.routes as never }), target: live.targetKey });
      } catch (error) {
        log(`[TABS-SINGLE] reset failed: ${error instanceof Error ? error.message : String(error)}`);
        return;
      }
      const after = planTabsDedupe(ref.getRootState?.());
      log(`[TABS-SINGLE] reset done removed=[${live.removed.join(',')}] waitedMs=${Date.now() - foundAt} after=${after && !('skip' in after) ? `still_${after.tabsCount}` : 'single'}`);
    });
  };

  const unsubscribe = ref.addListener('state', () => check('state'));
  check('start');
  return () => {
    stopped = true;
    unsubscribe?.();
  };
}

/** Хук для корневой разметки: подписка на всё время жизни приложения. */
export function useTabsSingleInstanceGuard(ref: unknown): void {
  useEffect(() => startTabsSingleInstanceGuard(ref as ContainerRef), [ref]);
}

/* expo-router route shim: служебный модуль в app/ не должен считаться экраном */
export default function __TabsSingleInstanceRouteShim() { return null; }
