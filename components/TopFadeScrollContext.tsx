import React, { createContext, useContext, useMemo, useRef } from 'react';
import { Animated } from 'react-native';

/**
 * Общий scrollY для верхней затемняющей маски на уровне таб-оболочки.
 *
 * Маска (TopFadeMask) живёт в (tabs)/_layout — над всеми табами, чтобы доставать
 * до самого статус-бара. Но привязка к скроллу нужна на каждом табе отдельно.
 * Этот контекст даёт один Animated.Value, в который активный таб пишет свой
 * вертикальный офсет через onScroll, а маска интерполирует из него opacity.
 *
 * Табы, которые уже имеют собственный scrollY (Animated.event), могут вместо
 * этого зеркалить его в общий через listener — но проще подключить onScroll отсюда.
 */
interface TopFadeScrollCtx {
  scrollY: Animated.Value;
  /** Покадровый офсет активного таба для таббара (см. reportTabBarOffset). */
  tabBarScrollY: Animated.Value;
  /**
   * Лёгкий JS-onScroll: пишет вертикальный офсет в scrollY маски через setValue.
   * Подходит и как сам onScroll (home), и как `listener` в Animated.event табов
   * с собственным scrollY (lessons/settings/friends) — не конфликтует с их драйвером.
   * Маска не ре-рендерится покадрово: scrollY слушается порогом, opacity — native-timing.
   */
  onScroll: (e: { nativeEvent: { contentOffset: { y: number } } }) => void;
  /**
   * Как onScroll, но кормит ТОЛЬКО верхнюю маску, не таббар: на табе с этим
   * транспортом капсула не схлопывается от скролла. Машина состояний таббара
   * в (tabs)/_layout при этом одна на всех — исключение живёт в самом табе.
   * зачем: владелец убрал сворачивание таббара на «Турнирах» (2026-08-02),
   * остальные разделы сворачиваются как раньше.
   */
  onScrollMaskOnly: (e: { nativeEvent: { contentOffset: { y: number } } }) => void;
  reportTabBarOffset: (y: number) => void;
  setTabBarManualLift: (manual: boolean) => void;
  isTabBarManualLift: () => boolean;
}

const Ctx = createContext<TopFadeScrollCtx | null>(null);

export function TopFadeScrollProvider({ children }: { children: React.ReactNode }) {
  const scrollY = useRef(new Animated.Value(0)).current;
  const tabBarScrollY = useRef(new Animated.Value(0)).current;
  const tabBarManualLiftRef = useRef(false);
  const value = useMemo<TopFadeScrollCtx>(
    () => ({
      scrollY,
      onScroll: (e) => {
        const y = e?.nativeEvent?.contentOffset?.y;
        if (typeof y === 'number') {
          scrollY.setValue(y);
          tabBarScrollY.setValue(y);
        }
      },
      onScrollMaskOnly: (e) => {
        const y = e?.nativeEvent?.contentOffset?.y;
        if (typeof y === 'number') scrollY.setValue(y);
      },
      reportTabBarOffset: (y) => {
        if (typeof y === 'number') tabBarScrollY.setValue(y);
      },
      setTabBarManualLift: (manual) => {
        tabBarManualLiftRef.current = manual;
      },
      isTabBarManualLift: () => tabBarManualLiftRef.current,
      tabBarScrollY,
    }),
    [scrollY, tabBarScrollY],
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

/** Возвращает общий scrollY-контекст маски, либо null вне провайдера. */
export function useTopFadeScroll(): TopFadeScrollCtx | null {
  return useContext(Ctx);
}
