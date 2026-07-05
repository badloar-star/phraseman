import { useEffect, useState } from 'react';
import { AccessibilityInfo } from 'react-native';

/**
 * Возвращает true, когда в системе включён режим «Уменьшение движения»
 * (iOS: Настройки → Универсальный доступ → Движение; Android: удаление анимаций).
 * Компоненты с бесконечными/укачивающими анимациями обязаны гейтить их этим
 * флагом: при reduce-motion крутиться нельзя — статичный кадр вместо цикла.
 *
 * Читает начальное значение и подписывается на live-изменение, чтобы
 * пользователь не перезаходил в экран после смены системной настройки.
 * Безопасен при отсутствии платформенного API (тесты) — тогда false.
 */
export function useReduceMotion(): boolean {
  const [reduceMotion, setReduceMotion] = useState(false);

  useEffect(() => {
    let cancelled = false;

    AccessibilityInfo.isReduceMotionEnabled()
      .then((enabled) => {
        if (!cancelled) setReduceMotion(Boolean(enabled));
      })
      .catch(() => {});

    const sub = AccessibilityInfo.addEventListener(
      'reduceMotionChanged',
      (enabled) => {
        if (!cancelled) setReduceMotion(Boolean(enabled));
      },
    );

    return () => {
      cancelled = true;
      sub.remove();
    };
  }, []);

  return reduceMotion;
}
