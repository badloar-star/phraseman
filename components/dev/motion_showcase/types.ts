// ─── Витрина движения: типы реестра ─────────────────────────────────────────
// зачем: владелец потребовал раздел в DEV Hub со ВСЕМИ поверхностями
// (модалки, тосты, экраны, иконки) по подразделам, где каждый пункт
// запускает РЕАЛЬНЫЙ экран/компонент, а не бутафорию.
import type React from 'react';

export type ShowcaseRenderProps = Readonly<{
  visible: boolean;
  onClose: () => void;
}>;

/**
 * Статус приёмки владельцем (2026-08-17).
 * зачем: владелец потребовал видеть глазами, что он уже одобрил, а что ещё
 * ждёт решения — иначе в списке из 47 гибридов невозможно понять, где смотреть.
 * 'accepted' — одобрено словом владельца; 'pending' — ждёт его вердикта.
 */
export type ShowcaseApproval = 'accepted' | 'pending';

export type ShowcaseItem = Readonly<{
  id: string;
  title: string;
  /** Короткая строка состояния: «гибрид готов» / «текущий вид» / причина note. */
  detail?: string;
  /** Приёмка владельцем. Не задано = 'pending' (ещё не смотрел). */
  approval?: ShowcaseApproval;
  kind: 'route' | 'event' | 'render' | 'note';
  /** kind=route: путь реального экрана (router.push). */
  route?: string;
  /**
   * kind=route: открыть экран в режиме «Проверка рун» — со СВЕЖИМ случайным
   * seed на каждый тап (владелец, 2026-08-27: «каждая кнопка вызывает
   * соответствующий экран с рандомными цифрами»). Экран настоящий; счётчики
   * стартуют со случайных чисел, диск и сеть не трогаются.
   */
  devRunesSeed?: boolean;
  /** kind=event: эмит реального события (тосты/баннеры показываются глобально). */
  fire?: () => void;
  /** kind=render: смонтировать РЕАЛЬНЫЙ компонент с демо-пропсами. */
  render?: (p: ShowcaseRenderProps) => React.ReactElement | null;
  /** kind=note: почему пока не запускается (нет безопасного превью и т.п.). */
  note?: string;
}>;

export type ShowcaseSection = Readonly<{
  id: string;
  order: number;
  title: string;
  items: readonly ShowcaseItem[];
}>;
