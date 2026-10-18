/**
 * [HOME-FOCUS-COST] / [HOME-CHILD-COST] — сколько JS-времени стоит рендер Главной и каждого её ребёнка.
 *
 * зачем (координатор 18.10, [BACK-BTN] «Сегодня»: тап → первый кадр 373–535 мс, дрейф JS 200–650 мс после возврата на Главную; правило «сперва логи»):
 * журнал Сверки (e2ae1be72) показал renderToEffects 76–142 мс при собственных эффектах 5–10 мс — держит JS рендер детей, а не эффекты корня. Теперь по детям.
 *
 * [HOME-FOCUS-COST]: порядок пассивных эффектов — дочерние раньше родителя, внутри компонента по объявлению. Поэтому
 *   renderToEffectsMs = начало рендера → первый эффект корня (рендер корня и детей + коммит + эффекты детей);
 *   ownEffectsMs      = первый → последний эффект корня (только собственные эффекты Главной).
 * [HOME-CHILD-COST]: React Profiler вокруг каждого крупного ребёнка (шапка, «Продолжить», плитки, видео, «Сегодня») — actualMs (сколько ушло на этот рендер) и baseMs
 *   (сколько стоил бы полный рендер без мемоизации). Строка, когда actualMs ≥ порога. Если actualMs мал, а baseMs велик — ребёнок уже мемоизирован удачно;
 *   если actualMs велик на каждом фокусе — кандидат на мемоизацию/упрощение.
 * Только dev и не стор-релиз; в релизе все функции пустые, а withHomeChildCost возвращает исходный компонент. Значения — числа и id блока, без данных пользователя.
 */
import React, { Profiler, useEffect, useRef, type ComponentType } from 'react';

import { IS_STORE_RELEASE } from './config';
import { renderWindowEpoch } from './render_cause_probe';
import { noteBackStep } from './back_tap_probe';

export const HOME_FOCUS_COST_THRESHOLD_MS = 30;
export const HOME_CHILD_COST_THRESHOLD_MS = 8;
const ENABLED = __DEV__ && !IS_STORE_RELEASE;

export type HomeFocusCostState = { renderStartedAt: number; firstEffectAt: number; renders: number };

/** Вызывать из корня экрана ДО остальных хуков с эффектами; возвращает общую ссылку для `useHomeFocusCostEnd`. */
export const useHomeFocusCostBegin: () => { current: HomeFocusCostState } = ENABLED
  ? () => {
      const state = useRef<HomeFocusCostState>({ renderStartedAt: 0, firstEffectAt: 0, renders: 0 });
      state.current.renderStartedAt = Date.now();
      state.current.renders += 1;
      noteBackStep('home_render', { n: state.current.renders }); // зачем ([BACK-BTN] 18.10): рендер Главной на линии возврата
      useEffect(() => { state.current.firstEffectAt = Date.now(); });
      return state;
    }
  : () => ({ current: { renderStartedAt: 0, firstEffectAt: 0, renders: 0 } });

/** Вызывать ПОСЛЕДНИМ из хуков с эффектами корня. */
export const useHomeFocusCostEnd: (state: { current: HomeFocusCostState }, tag: string) => void = ENABLED
  ? (state, tag) => {
      useEffect(() => {
        const s = state.current;
        const endAt = Date.now();
        noteBackStep('home_effects_done', { n: s.renders });
        const renderToEffectsMs = s.firstEffectAt - s.renderStartedAt;
        const ownEffectsMs = endAt - s.firstEffectAt;
        if (renderToEffectsMs < HOME_FOCUS_COST_THRESHOLD_MS && ownEffectsMs < HOME_FOCUS_COST_THRESHOLD_MS) return;
        console.log('[HOME-FOCUS-COST]', JSON.stringify({ tag, n: s.renders, window: renderWindowEpoch(), renderToEffectsMs, ownEffectsMs })); // guard-ok: строка только на тяжёлый рендер (≥ 30 мс), dev
      });
    }
  : () => undefined;

function logChildCost(id: string, phase: string, actualDuration: number, baseDuration: number): void {
  if (actualDuration < HOME_CHILD_COST_THRESHOLD_MS) return;
  console.log('[HOME-CHILD-COST]', JSON.stringify({ id, phase, window: renderWindowEpoch(), actualMs: Math.round(actualDuration * 10) / 10, baseMs: Math.round(baseDuration * 10) / 10 })); // guard-ok: строка только на тяжёлый рендер ребёнка (≥ 8 мс), dev
}

/** Оборачивает компонент в Profiler (dev). В релизе возвращает его же — ни лишнего узла, ни лишнего рендера. Вызывать на уровне модуля, чтобы тип компонента был стабилен. */
export function withHomeChildCost<P extends object>(id: string, Component: ComponentType<P>): ComponentType<P> {
  if (!ENABLED) return Component;
  const Wrapped = (props: P) => React.createElement(
    Profiler,
    { id, onRender: (_id: string, phase: string, actual: number, base: number) => logChildCost(id, phase, actual, base) },
    React.createElement(Component as ComponentType<Record<string, unknown>>, props as Record<string, unknown>),
  );
  Wrapped.displayName = `HomeChildCost(${id})`;
  return Wrapped;
}
