// ═══════════════════════════════════════════════════════════════════════════
// hub_header_collapse.tsx — шапка хаба «Диалоги» схлопывается, пока открыта категория (dialogs-003, образец dialogs.html №4).
//
// зачем (координатор 13.10, решение «делаем как в образце»): когда категория раскрыта, подзаголовок «Практикуй язык…» и плашка «Свободный разговор PLUS»
// уходят — остаются «Диалоги» и пилюли. Закрыли категорию — вернулись. Состояние «схлопнуто» живёт здесь, а не в каталоге: подзаголовок и плашка читают его
// через контекст, а каталог (список миров) о нём не знает и НЕ перерисовывается — он только сообщает «открыта/закрыта» через стабильный контекст действий.
//
// Анимация — та же нативная layout-анимация проекта (`animateNextLayoutTransition`, 220 мс), что и раскрытие самой категории, в ОДНОМ коммите с ним: лента
// сдвигается единым движением, подзаголовок и плашка гаснут (delete → opacity). Вторая анимация (Reanimated height) в том же коммите дралась бы с LayoutAnimation.
//
// Без прыжка прокрутки: схлопываем только пока шапка ещё в поле зрения (scrollY ≤ HUB_COLLAPSE_MAX_SCROLL). Если человек уже прокрутил ниже шапки, она и так не видна —
// схлопывание сдвинуло бы открытую категорию на высоту шапки, поэтому в этом случае шапка остаётся как была (категория стоит на месте).
// Reduce Motion — то же состояние без анимации. Вне хаба (вкладка «Уроки → Диалоги») провайдера нет: обёртки ничего не делают.
// ═══════════════════════════════════════════════════════════════════════════
import React, { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react';

import { DebugLogger } from '../../app/debug-logger';
import { animateNextLayoutTransition } from '../../app/smooth_layout';
import { useReduceMotion } from '../../hooks/use_reduce_motion';

const LOG = '[HUB-COLLAPSE]';
/** Высота шапки с подзаголовком и плашкой — до этой прокрутки она ещё видна (подзаголовок ≈ 26 + плашка ≈ 72 + зазоры). Больше — шапку не трогаем. */
export const HUB_COLLAPSE_MAX_SCROLL = 120;
export const HUB_COLLAPSE_MS = 220;

export type HubCollapseDecision = Readonly<{
  /** Какое состояние «схлопнуто» поставить. */
  collapsed: boolean;
  /** Анимировать ли смену (нет — Reduce Motion). */
  animate: boolean;
  /** Почему именно так — в журнал. */
  reason: 'expanded_header_visible' | 'expanded_header_out_of_view' | 'closed' | 'unchanged';
}>;

/** Чистое решение: что делать с шапкой, когда категорию открыли/закрыли. Отдельно от React — проверяется юнит-тестом. */
export function decideHubCollapse(input: Readonly<{ categoryOpen: boolean; scrollY: number; reduceMotion: boolean; current: boolean }>): HubCollapseDecision {
  const animate = !input.reduceMotion;
  if (!input.categoryOpen) {
    return { collapsed: false, animate, reason: input.current ? 'closed' : 'unchanged' };
  }
  if (input.scrollY > HUB_COLLAPSE_MAX_SCROLL) {
    // Шапка вне экрана: оставляем как есть (если уже схлопнута — не раскрываем, чтобы не сдвигать ленту).
    return { collapsed: input.current, animate: false, reason: 'expanded_header_out_of_view' };
  }
  return { collapsed: true, animate, reason: input.current ? 'unchanged' : 'expanded_header_visible' };
}

type Actions = Readonly<{
  /** Категория открыта (true) или все закрыты (false). Стабильная ссылка — каталог от неё не перерисовывается. */
  setCategoryOpen: (open: boolean) => void;
  /** Текущая прокрутка ленты хаба; пишет хост прокрутки. */
  scrollYRef: React.MutableRefObject<number>;
}>;

const StateContext = createContext<boolean>(false);
const ActionsContext = createContext<Actions | null>(null);

export function HubHeaderCollapseProvider({ children }: Readonly<{ children: React.ReactNode }>) {
  const [collapsed, setCollapsed] = useState(false);
  const collapsedRef = useRef(false);
  const scrollYRef = useRef(0);
  const reduceMotion = useReduceMotion();
  const reduceRef = useRef(reduceMotion);
  reduceRef.current = reduceMotion;

  const setCategoryOpen = useCallback((open: boolean) => {
    const decision = decideHubCollapse({ categoryOpen: open, scrollY: scrollYRef.current, reduceMotion: reduceRef.current, current: collapsedRef.current });
    DebugLogger.info(LOG, `категория ${open ? 'открыта' : 'закрыта'} scrollY=${Math.round(scrollYRef.current)} reduceMotion=${String(reduceRef.current)} было=${String(collapsedRef.current)} → collapsed=${String(decision.collapsed)} animate=${String(decision.animate)} (${decision.reason})`);
    if (decision.collapsed === collapsedRef.current) return;
    if (decision.animate) animateNextLayoutTransition(HUB_COLLAPSE_MS);
    collapsedRef.current = decision.collapsed;
    setCollapsed(decision.collapsed);
  }, []);

  const actions = useMemo<Actions>(() => ({ setCategoryOpen, scrollYRef }), [setCategoryOpen]);
  return (
    <ActionsContext.Provider value={actions}>
      <StateContext.Provider value={collapsed}>{children}</StateContext.Provider>
    </ActionsContext.Provider>
  );
}

/** Схлопнута ли шапка. Вне хаба всегда false. Перерисовывает только того, кто читает. */
export function useHubHeaderCollapsed(): boolean {
  return useContext(StateContext);
}

/** Стабильные действия для каталога и хоста прокрутки; null вне хаба. */
export function useHubHeaderCollapseActions(): Actions | null {
  return useContext(ActionsContext);
}

/** Прячет детей, пока шапка схлопнута (плашка «Свободный разговор PLUS»). Каталог, который её содержит, при смене не перерисовывается. */
export function HubHeaderCollapsible({ children }: Readonly<{ children: React.ReactNode }>) {
  const collapsed = useHubHeaderCollapsed();
  return collapsed ? null : <>{children}</>;
}
