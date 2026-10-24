// ═══════════════════════════════════════════════════════════════════════════
// use_scene_status_bar.ts — светлые значки строки состояния, пока тёмная «Сцена» под часами.
//
// зачем (координатор 24.10, Р2 подтверждён Сверкой flags/r2_home_top.png): строка состояния задаётся темой (app/_layout: тёмные
// значки в светлом оформлении), а «Сцена» Главной, «Сегодня» и обложка Сезона тёмные — в светлых «Сумерках» часы и батарея почти не
// читались. Пока сцена у верха и экран виден — свой вход в стек строки состояния RN со светлыми значками; ушла (прокрутка, другая
// вкладка, экран поверх) — вход снят, тема возвращает свой бар. Переключение только на пересечении порога — без setState на кадр.
// ═══════════════════════════════════════════════════════════════════════════
import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { Animated, StatusBar, type NativeScrollEvent, type NativeSyntheticEvent } from 'react-native';
import { sceneStatusBarStyle } from '../components/v2/scene_status_bar_icons';

const LOG = '[SCENE-STATUSBAR]';

/** Прокрутка, после которой сцена уходит из-под часов (dp). */
export const SCENE_STATUS_BAR_SWITCH_Y = 60;

/** Стек строки состояния RN; тесты подменяют поля (в тестовой среде StatusBar может не быть). */
export const sceneStatusBarStack = {
  push: (barStyle: 'light-content' | 'dark-content'): unknown => (StatusBar && typeof StatusBar.pushStackEntry === 'function' ? StatusBar.pushStackEntry({ barStyle, animated: true }) : null),
  pop: (entry: unknown): void => { if (entry && StatusBar && typeof StatusBar.popStackEntry === 'function') StatusBar.popStackEntry(entry as never); },
};

/**
 * Значки строки состояния над сценой, пока on; снятие — возврат к бару темы.
 * зачем (координатор 24.10, замечание 4 · ТЕМЫ): стиль — по яркости верха сцены (sceneStatusBarStyle, порог как у круга «назад»);
 * верха нет (обложка Сезона — градиент главы) — светлые значки.
 */
export function useSceneStatusBar(tag: string, on: boolean, why: string, sceneTop: string | null = null): void {
  const barStyle = sceneTop ? sceneStatusBarStyle(sceneTop) : 'light-content';
  useEffect(() => {
    if (!on) return undefined;
    const entry = sceneStatusBarStack.push(barStyle);
    console.log(LOG, JSON.stringify({ tag, on: true, barStyle, sceneTop, why, applied: entry !== null })); // guard-ok: одна строка на вход (applied=false — нет StatusBar)
    return () => {
      sceneStatusBarStack.pop(entry);
      console.log(LOG, JSON.stringify({ tag, on: false, barStyle, why: 'released: screen_left_or_scrolled_or_condition_off' })); // guard-ok: одна строка на выход
    };
  }, [on, tag, barStyle]); // eslint-disable-line react-hooks/exhaustive-deps -- зачем: why и sceneTop только для журнала
}

/** «Сцена у верха» по Animated.Value прокрутки (значение маски верха вкладок: 0 у верха); слушатель только сравнивает с порогом. */
export function useAnimatedAtTop(scrollY: Animated.Value | null | undefined, threshold = 1): boolean {
  const [atTop, setAtTop] = useState(true);
  const ref = useRef(true);
  useEffect(() => {
    if (!scrollY) return undefined;
    const id = scrollY.addListener(({ value }) => {
      const next = value < threshold;
      if (next === ref.current) return;
      ref.current = next;
      setAtTop(next);
    });
    return () => scrollY.removeListener(id);
  }, [scrollY, threshold]);
  return atTop;
}

/** onScroll для ScrollView сцены: «у верха» меняется только на пересечении порога. */
export function useScrollAtTop(): readonly [boolean, (e: NativeSyntheticEvent<NativeScrollEvent>) => void] {
  const [atTop, setAtTop] = useState(true);
  const ref = useRef(true);
  const onScroll = useRef((e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const y = e?.nativeEvent?.contentOffset?.y ?? 0;
    const next = y < SCENE_STATUS_BAR_SWITCH_Y;
    if (next === ref.current) return;
    ref.current = next;
    setAtTop(next);
  }).current;
  return [atTop, onScroll] as const;
}

// ── Обложка Сезона: вкладку видит оболочка, прокрутку — сам Сезон. Маленький общий стор между ними. ──
type CoverTop = Readonly<{ mounted: boolean; atTop: boolean }>;
let cover: CoverTop = { mounted: false, atTop: true };
const listeners = new Set<() => void>();

export function reportSeasonCoverTop(next: CoverTop): void {
  if (next.mounted === cover.mounted && next.atTop === cover.atTop) return;
  cover = next;
  listeners.forEach((listener) => listener());
}

const subscribe = (listener: () => void) => { listeners.add(listener); return () => { listeners.delete(listener); }; };
const peek = () => cover;

export function useSeasonCoverTop(): CoverTop {
  return useSyncExternalStore(subscribe, peek, peek);
}
