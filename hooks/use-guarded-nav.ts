import { useCallback, useRef } from 'react';
import { useRouter } from 'expo-router';

/**
 * Защита от двойного тапа по навигации.
 *
 * ПРОБЛЕМА: прямой `router.push(...)` в onPress не защищён от быстрого двойного
 * тапа — оба тапа попадают в стек, экран открывается дважды (в истории появляется
 * дубль, «назад» приходится жать два раза). На быстрых пальцах/лагающем кадре это
 * ощущается как «кнопка сработала не так».
 *
 * РЕШЕНИЕ: первый push проходит, повторные push В ТЕЧЕНИЕ окна (по умолчанию 600 мс)
 * молча игнорируются. Окно — на реальный дребезг пальца, не на осознанный повторный
 * переход позже. Гвард через ref (не state) — не вызывает ре-рендер и работает даже
 * если оба тапа пришли в один кадр.
 *
 * Возвращает push/replace с той же сигнатурой, что и у expo-router.
 */
const DEFAULT_GUARD_MS = 600;

type NavTarget = Parameters<ReturnType<typeof useRouter>['push']>[0];

export function useGuardedNav(guardMs: number = DEFAULT_GUARD_MS) {
  const router = useRouter();
  const lastNavAt = useRef<number>(Number.NEGATIVE_INFINITY);

  const canNavigate = useCallback((): boolean => {
    const now = Date.now();
    if (now - lastNavAt.current < guardMs) return false;
    lastNavAt.current = now;
    return true;
  }, [guardMs]);

  const push = useCallback(
    (target: NavTarget) => {
      if (!canNavigate()) return;
      router.push(target as any);
    },
    [router, canNavigate],
  );

  const replace = useCallback(
    (target: NavTarget) => {
      if (!canNavigate()) return;
      router.replace(target as any);
    },
    [router, canNavigate],
  );

  return { push, replace };
}
