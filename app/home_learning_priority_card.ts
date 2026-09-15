/**
 * Приоритетная карточка на Главной: раньше при 10+ готовых ошибках место
 * «Продолжить урок» занимала плитка «Мои ошибки».
 *
 * зачем (владелец 2026-09-14): у раздела ошибок появился собственный вход -
 * пульсирующая кнопка напротив «Сегодня» (HomeMistakesPulseButton) со счётчиком.
 * Подмена урока плиткой больше не нужна: урок никогда не пропадает с Главной.
 * Функция оставлена как контракт (её читает home.tsx и тесты), но всегда
 * отвечает «последний урок». Порог сохранён как исторический маркер для DEV.
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
