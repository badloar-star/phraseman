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
   * Покадровый офсет для таббара.
   *
   * зачем: маске хватает порога (она гоняет JS только при пересечении 6px), но
   * таббар в Bevel-режиме ведёт прогресс схлопывания ЗА ПАЛЬЦЕМ — ему нужен каждый
   * кадр, включая ОТРИЦАТЕЛЬНЫЕ значения bounce на экранах без скролла. Отдельный
   * канал, чтобы не снимать дросселирование с маски и не платить её ценой.
   *
   * Табы, которые дросселируют onScroll ради маски, обязаны звать это на каждом кадре.
   */
  reportTabBarOffset: (y: number) => void;
}

const Ctx = createContext<TopFadeScrollCtx | null>(null);

export function TopFadeScrollProvider({ children }: { children: React.ReactNode }) {
  const scrollY = useRef(new Animated.Value(0)).current;
  const tabBarScrollY = useRef(new Animated.Value(0)).current;
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
      reportTabBarOffset: (y) => {
        if (typeof y === 'number') tabBarScrollY.setValue(y);
      },
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
