// use_tab_retap_scroll_top — экран вкладки подписывается на повторный тап по своей вкладке и прокручивается в начало.
// зачем (удобство №1, владелец 04.11): как в iOS — тап по открытой вкладке возвращает наверх. scrollTop вызывается без анимации при «Уменьшить движение».
import { useEffect, useRef } from 'react';
import { subscribeTabRetap } from '../app/tab_retap_bus';
import { useReduceMotion } from './use_reduce_motion';

export function useTabRetapScrollTop(tabIdx: number, scrollTop: (animated: boolean) => void): void {
  const reduceMotion = useReduceMotion();
  const scrollRef = useRef(scrollTop);
  scrollRef.current = scrollTop;
  const reduceRef = useRef(reduceMotion);
  reduceRef.current = reduceMotion;
  useEffect(() => subscribeTabRetap((idx) => {
    if (idx !== tabIdx) return;
    scrollRef.current(!reduceRef.current);
  }), [tabIdx]);
}
