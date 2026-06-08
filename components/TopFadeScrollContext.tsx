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
  /**
   * Лёгкий JS-onScroll: пишет вертикальный офсет в scrollY маски через setValue.
   * Подходит и как сам onScroll (home), и как `listener` в Animated.event табов
   * с собственным scrollY (lessons/settings/friends) — не конфликтует с их драйвером.
   * Маска не ре-рендерится покадрово: scrollY слушается порогом, opacity — native-timing.
   */
  onScroll: (e: { nativeEvent: { contentOffset: { y: number } } }) => void;
}

const Ctx = createContext<TopFadeScrollCtx | null>(null);

export function TopFadeScrollProvider({ children }: { children: React.ReactNode }) {
  const scrollY = useRef(new Animated.Value(0)).current;
  const value = useMemo<TopFadeScrollCtx>(
    () => ({
      scrollY,
      onScroll: (e) => {
        const y = e?.nativeEvent?.contentOffset?.y;
        if (typeof y === 'number') scrollY.setValue(y);
      },
    }),
    [scrollY],
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

/** Возвращает общий scrollY-контекст маски, либо null вне провайдера. */
export function useTopFadeScroll(): TopFadeScrollCtx | null {
  return useContext(Ctx);
}
