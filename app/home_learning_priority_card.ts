/**
 * Приоритетная карточка Главной «Продолжить обучение».
 *
 * Решение владельца 2026-10-04 (D-запись в 03_DECISIONS): карточка ВСЕГДА показывает последний
 * открытый урок; ошибки на Главной — только строкой «Сегодня» (D144). Автозахват карточки ошибками
 * (10+) и переворот долгим нажатием «урок ↔ ошибки» из home.tsx удалены. Функция — контракт этого
 * решения: всегда «последний урок». Порог оставлен историческим маркером.
 */
export const HOME_MISTAKES_READY_THRESHOLD = 10;

export type HomeLearningPriority = 'last_lesson' | 'mistakes';

export function resolveHomeLearningPriority(readyCount: number): HomeLearningPriority {
  void readyCount;
  return 'last_lesson';
}

/* expo-router route shim: keeps this app utility from being treated as a route */
export default function __RouteShim() {
  return null;
}
