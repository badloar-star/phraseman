// tab_retap_bus — «повторный тап по уже открытой вкладке нижней панели» (удобство №1, владелец 04.11).
// зачем: раньше обработчик выходил молча (idx === active), и тап по текущей вкладке ничего не давал. Теперь панель сообщает шине,
// а экран вкладки сам решает, что сделать (прокрутить в начало). Чистый модуль без React и Firebase; слушатели живут, пока экран смонтирован.
type Listener = (tabIdx: number) => void;

const listeners = new Set<Listener>();

/** Подписка на повторный тап; возвращает отписку. */
export function subscribeTabRetap(listener: Listener): () => void {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
}

/** Сообщает всем слушателям, что вкладка tabIdx уже была открыта и по ней тапнули снова. Возвращает число услышавших (для журнала). */
export function emitTabRetap(tabIdx: number): number {
  let heard = 0;
  for (const listener of Array.from(listeners)) {
    try {
      listener(tabIdx);
      heard += 1;
    } catch (error) {
      console.warn('[TAB-RETAP] слушатель упал', tabIdx, error instanceof Error ? error.message : String(error));
    }
  }
  return heard;
}
