import { useCallback, useRef } from 'react';
import type { LayoutChangeEvent, ScrollView } from 'react-native';

// зачем (6 · СВЕРКА §44 через координатора: «в выборе тем выбранная тема не видна без прокрутки — при открытии „Ирис“ за краем экрана»): список открывается уже
// прокрученным к выбранной теме, один раз, без анимации и без setState (ни одной лишней перерисовки). Верх прокрутки начинается под полосой кнопки «назад»
// (ScreenBackZone стоит вне прокрутки), поэтому смещение считается только внутри прокрутки.

/** Запас под выбранной строкой, когда она и так видна: прокрутка не нужна. */
const VISIBLE_BOTTOM_GAP = 16;

export type SelectedRowScrollInput = Readonly<{
  /** Верх карточки списка внутри содержимого прокрутки и её высота. */
  cardY: number;
  cardHeight: number;
  /** Число строк карточки и индекс выбранной (строки одной высоты — высота делится поровну). */
  rowCount: number;
  rowIndex: number;
  /** Высота видимой области прокрутки и всего содержимого. */
  viewportHeight: number;
  contentHeight: number;
}>;

/** Куда прокрутить, чтобы выбранная строка встала по центру видимой области; 0, если она и так видна. Чистая функция — проверяется тестом. */
export function selectedRowScrollY(input: SelectedRowScrollInput): number {
  const { cardY, cardHeight, rowCount, rowIndex, viewportHeight, contentHeight } = input;
  if (rowCount <= 0 || rowIndex < 0 || rowIndex >= rowCount || viewportHeight <= 0) return 0;
  const rowHeight = cardHeight / rowCount;
  const rowTop = cardY + rowHeight * rowIndex;
  if (rowTop + rowHeight <= viewportHeight - VISIBLE_BOTTOM_GAP) return 0;
  const centered = rowTop - (viewportHeight - rowHeight) / 2;
  const maxY = Math.max(0, contentHeight - viewportHeight);
  return Math.min(Math.max(0, Math.round(centered)), maxY);
}

type Card = 'main' | 'gradient';

/**
 * Одноразовая прокрутка к выбранной теме. Карточка с выбранной строкой отдаёт `onCardLayout(card)`, прокрутка — `onScrollLayout`/`onContentSizeChange`;
 * когда известны все четыре размера — один `scrollTo` без анимации. Лог [THEMES-SCROLL] показывает значения, решившие смещение.
 */
export function useScrollToSelectedTheme(selected: Readonly<{ card: Card; rowCount: number; rowIndex: number }> | null) {
  const scrollRef = useRef<ScrollView>(null);
  const done = useRef(false);
  const metrics = useRef<{ cardY: number; cardHeight: number; viewportHeight: number; contentHeight: number }>({ cardY: -1, cardHeight: -1, viewportHeight: -1, contentHeight: -1 });
  const selectedRef = useRef(selected);
  selectedRef.current = selected;

  const tryScroll = useCallback(() => {
    const sel = selectedRef.current;
    const m = metrics.current;
    if (done.current) return;
    if (!sel) { done.current = true; console.log('[THEMES-SCROLL] выбранной темы нет в списках — прокрутка не нужна'); return; } // guard-ok: ранний выход
    if (m.cardY < 0 || m.cardHeight < 0 || m.viewportHeight < 0 || m.contentHeight < 0) return; // ждём остальные размеры
    done.current = true;
    const y = selectedRowScrollY({ ...m, rowCount: sel.rowCount, rowIndex: sel.rowIndex });
    console.log(`[THEMES-SCROLL] ${JSON.stringify({ card: sel.card, rowIndex: sel.rowIndex, rowCount: sel.rowCount, ...m, y })}`); // guard-ok: значения, решившие смещение
    if (y > 0) scrollRef.current?.scrollTo({ y, animated: false });
  }, []);

  const onCardLayout = useCallback((card: Card) => (e: LayoutChangeEvent) => {
    if (selectedRef.current?.card !== card) return;
    metrics.current.cardY = e.nativeEvent.layout.y;
    metrics.current.cardHeight = e.nativeEvent.layout.height;
    tryScroll();
  }, [tryScroll]);
  const onScrollLayout = useCallback((e: LayoutChangeEvent) => {
    metrics.current.viewportHeight = e.nativeEvent.layout.height;
    tryScroll();
  }, [tryScroll]);
  const onContentSizeChange = useCallback((_w: number, h: number) => {
    metrics.current.contentHeight = h;
    tryScroll();
  }, [tryScroll]);

  return { scrollRef, onCardLayout, onScrollLayout, onContentSizeChange };
}
