import type { TheoryContent } from './lesson_help_theory_ui';

/**
 * Единственная точка доступа рантайма к контенту теории уроков (THEORY).
 *
 * PERF (D4): литерал THEORY — ~19 тыс. строк JSX-контента (аномалия №1 проекта).
 * Раньше он жил прямо в экране app/lesson_help.tsx и парсился при КАЖДОМ импорте
 * экрана, даже если пользователь только пролистывает список уроков. Теперь литерал
 * вынесен в отдельный тяжёлый модуль app/lesson_help_theory_data.tsx, который
 * подтягивается синхронным ленивым require() лишь при первом реальном обращении и
 * кэшируется в модульном кеше ниже. Inline-require Metro делает это стандартным
 * поддерживаемым приёмом — вызывающий код синхронный и не меняется.
 *
 * СЕЙМ ДЛЯ СЕРВЕРНОЙ ДОСТАВКИ: как quiz_thematic_registry.ts,
 * этот модуль — единое место, откуда экран берёт контент теории. Сегодня
 * getTheoryContent() делает локальный require(); когда контент теории переедет на
 * сервер (французский уже удалённый, английский — в планах), именно здесь появится
 * загрузка с сервера с дисковым кешем. Экран продолжит звать getTheoryContent()
 * без изменений.
 */

/** Модульный кеш: весь объект THEORY, заполняется при первом обращении. */
let THEORY_CACHE: Record<number, TheoryContent> | null = null;

/** Синхронная, ленивая, кешируемая загрузка всего литерала THEORY. */
function loadTheory(): Record<number, TheoryContent> {
  if (THEORY_CACHE) return THEORY_CACHE;
  // eslint-disable-next-line @typescript-eslint/no-require-imports -- intentional: ленивый require держит ~19k-строчный THEORY вне памяти, пока экран теории реально не открыт (PERF D4)
  const mod = require('./lesson_help_theory_data') as { THEORY: Record<number, TheoryContent> };
  THEORY_CACHE = mod.THEORY;
  return THEORY_CACHE;
}

/** Контент теории для конкретного урока (или undefined, если урока нет в THEORY). */
export function getTheoryContent(lessonId: number): TheoryContent | undefined {
  return loadTheory()[lessonId];
}
