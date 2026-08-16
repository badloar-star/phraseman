// ─── Витрина движения: типы реестра ─────────────────────────────────────────
// зачем: владелец потребовал раздел в DEV Hub со ВСЕМИ поверхностями
// (модалки, тосты, экраны, иконки) по подразделам, где каждый пункт
// запускает РЕАЛЬНЫЙ экран/компонент, а не бутафорию.
import type React from 'react';

export type ShowcaseRenderProps = Readonly<{
  visible: boolean;
  onClose: () => void;
}>;

export type ShowcaseItem = Readonly<{
  id: string;
  title: string;
  /** Короткая строка состояния: «гибрид готов» / «текущий вид» / причина note. */
  detail?: string;
  kind: 'route' | 'event' | 'render' | 'note';
  /** kind=route: путь реального экрана (router.push). */
  route?: string;
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
