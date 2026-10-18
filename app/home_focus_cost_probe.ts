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

import { DIAG_ENABLED } from './dev_diag_gate';
import { renderWindowEpoch } from './render_cause_probe';
import { noteBackStep } from './back_tap_probe';

export const HOME_FOCUS_COST_THRESHOLD_MS = 30;
export const HOME_CHILD_COST_THRESHOLD_MS = 8;
const ENABLED = DIAG_ENABLED;

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

export type PropChange = Readonly<{ name: string; from: string; to: string }>;

/** Короткое описание значения пропса для журнала: функция/элемент/массив/объект — без содержимого, примитивы — значением (строки ≤ 24 знаков). */
export function briefPropValue(value: unknown): string {
  if (value === null) return 'null';
  if (value === undefined) return 'undefined';
  if (typeof value === 'function') return 'fn';
  if (typeof value === 'string') return JSON.stringify(value.length > 24 ? `${value.slice(0, 24)}…` : value);
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  if (Array.isArray(value)) return `arr[${value.length}]`;
  if (typeof value === 'object') {
    const element = value as { $$typeof?: unknown; type?: unknown; props?: unknown };
    if (element.$$typeof !== undefined) {
      const type = element.type as { displayName?: string; name?: string } | string | undefined;
      const name = typeof type === 'string' ? type : type?.displayName ?? type?.name ?? '?';
      return `el<${name}>`;
    }
    return `obj{${Object.keys(value as object).slice(0, 4).join(',')}}`;
  }
  return typeof value;
}

/** Какие пропсы изменились по ссылке между двумя рендерами родителя (не больше 6; значения — briefPropValue). Первый рендер — пусто. */
export function diffProps(prev: Readonly<Record<string, unknown>> | null, next: Readonly<Record<string, unknown>>): readonly PropChange[] {
  if (!prev) return [];
  const out: PropChange[] = [];
  const names = new Set([...Object.keys(prev), ...Object.keys(next)]);
  names.forEach((name) => {
    if (out.length >= 6) return;
    if (!Object.is(prev[name], next[name])) out.push({ name, from: briefPropValue(prev[name]), to: briefPropValue(next[name]) });
  });
  return out;
}

/** Изменения пропсов, пришедшие с ПОСЛЕДНИМ рендером обёртки; снимаются при печати. Пусто при тяжёлом рендере = обновление пришло изнутри ребёнка (состояние, контекст, хранилище), а не от пропсов. */
const pendingChanges = new Map<string, readonly PropChange[]>();

function logChildCost(id: string, phase: string, actualDuration: number, baseDuration: number): void {
  const changed = pendingChanges.get(id) ?? [];
  pendingChanges.delete(id);
  if (actualDuration < HOME_CHILD_COST_THRESHOLD_MS) return;
  console.log('[HOME-CHILD-COST]', JSON.stringify({ id, phase, window: renderWindowEpoch(), actualMs: Math.round(actualDuration * 10) / 10, baseMs: Math.round(baseDuration * 10) / 10, propsChanged: changed })); // guard-ok: строка только на тяжёлый рендер ребёнка (≥ 8 мс), dev
}

/** Оборачивает компонент в Profiler (dev). В релизе возвращает его же — ни лишнего узла, ни лишнего рендера. Вызывать на уровне модуля, чтобы тип компонента был стабилен. */
export function withHomeChildCost<P extends object>(id: string, Component: ComponentType<P>): ComponentType<P> {
  if (!ENABLED) return Component;
  const Wrapped = (props: P) => {
    const previous = useRef<Readonly<Record<string, unknown>> | null>(null);
    const current = props as unknown as Readonly<Record<string, unknown>>;
    const changed = diffProps(previous.current, current);
    previous.current = current;
    if (changed.length > 0) pendingChanges.set(id, changed);
    return React.createElement(
      Profiler,
      { id, onRender: (_id: string, phase: string, actual: number, base: number) => logChildCost(id, phase, actual, base) },
      React.createElement(Component as ComponentType<Record<string, unknown>>, props as Record<string, unknown>),
    );
  };
  Wrapped.displayName = `HomeChildCost(${id})`;
  return Wrapped;
}
