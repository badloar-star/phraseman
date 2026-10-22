// ═══════════════════════════════════════════════════════════════════════════
// use_spire_scene_scroll.ts — прокрутка Пика для верхней маски и цвета шапки «Сообщества», пока на Пике «Сцена».
//
// зачем (Пик v2, шаг 3b-3; координатор 22.10: «гаси цвет шапки «Сообщества» при прокрутке Пика так же, как у Главной, тем же механизмом»):
// Главная пишет свой сдвиг в общий признак прокрутки (TopFadeScroll), по нему появляется маска верха и гаснет полоса под часами. Пик
// пишет туда же — только для маски (onScrollMaskOnly): нижнее меню на Пике от прокрутки не сворачивается, как и раньше. Общий признак
// помнит последний раздел («Друзья» прокручены вниз), поэтому Пик при появлении сообщает своё место заново. Без «Сцены» (флаг выключен)
// Пик ничего не сообщает — прежнее поведение. Сеть и хранилище не трогаются.
// ═══════════════════════════════════════════════════════════════════════════
import { useCallback, useEffect, useMemo, useRef } from 'react';
import type { NativeScrollEvent, NativeSyntheticEvent } from 'react-native';

import { useTopFadeScroll } from '../../TopFadeScrollContext';

const LOG = '[SPIRE-SCENE]';

export type SpireSceneScrollProps = Readonly<{
  onScroll?: (e: NativeSyntheticEvent<NativeScrollEvent>) => void;
  scrollEventThrottle?: number;
}>;

const NONE: SpireSceneScrollProps = Object.freeze({});

/** Свойства прокрутки для ScrollView Пика; {} — «Сцены» нет, Пик ведёт себя как раньше. */
export function useSpireSceneScroll(enabled: boolean, active: boolean): SpireSceneScrollProps {
  const topFade = useTopFadeScroll();
  const lastYRef = useRef(0);
  const onScroll = useCallback((e: NativeSyntheticEvent<NativeScrollEvent>) => {
    lastYRef.current = e.nativeEvent.contentOffset.y;
    topFade?.onScrollMaskOnly(e);
  }, [topFade]);
  useEffect(() => {
    if (!enabled || !active) return;
    if (!topFade) {
      console.log(LOG, 'scroll: нет TopFadeScroll — маска и шапка не знают прокрутку Пика'); // guard-ok: ранний выход называет причину
      return;
    }
    topFade.onScrollMaskOnly({ nativeEvent: { contentOffset: { y: lastYRef.current } } });
    console.log(LOG, 'scroll: report on show', JSON.stringify({ y: Math.round(lastYRef.current) })); // guard-ok: одна строка на появление Пика
  }, [enabled, active, topFade]);
  return useMemo(() => (enabled ? Object.freeze({ onScroll, scrollEventThrottle: 16 }) : NONE), [enabled, onScroll]);
}
