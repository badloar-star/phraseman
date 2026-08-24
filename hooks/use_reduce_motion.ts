import { useEffect, useState } from "react";
import { AccessibilityInfo } from "react-native";

/**
 * Возвращает true, когда в системе включён режим «Уменьшение движения», и
 * null, пока начальное системное значение ещё не прочитано.
 * (iOS: Настройки → Универсальный доступ → Движение; Android: удаление анимаций).
 * Компоненты с бесконечными/укачивающими анимациями обязаны гейтить их этим
 * флагом: при reduce-motion крутиться нельзя — статичный кадр вместо цикла.
 *
 * Читает начальное значение и подписывается на live-изменение, чтобы
 * пользователь не перезаходил в экран после смены системной настройки.
 * Потребитель, для которого первый кадр критичен, трактует null консервативно
 * как запрет движения. Совместимый useReduceMotion ниже сохраняет прежний
 * boolean-контракт и возвращает false на время чтения/при ошибке API.
 */
export function useReduceMotionPreference(): boolean | null {
  const [reduceMotion, setReduceMotion] = useState<boolean | null>(null);

  useEffect(() => {
    let cancelled = false;

    AccessibilityInfo.isReduceMotionEnabled()
      .then((enabled) => {
        if (!cancelled) setReduceMotion(Boolean(enabled));
      })
      .catch(() => {});

    const sub = AccessibilityInfo.addEventListener(
      "reduceMotionChanged",
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

export function useReduceMotion(): boolean {
  return useReduceMotionPreference() ?? false;
}
