import { useCallback, useRef } from 'react';
import { Animated, Platform } from 'react-native';
import { runOnJS, useSharedValue } from 'react-native-reanimated';

/** Как у верхней маски вкладок (TopFadeMask / useTopFadeScrolled): порог и длительности одни на всё приложение. */
const SHOW_THRESHOLD = 6;
const SHOW_MS = 180;
const HIDE_MS = 260;

export type SoftTopEdge = Readonly<{
  /** Прозрачность накладки маски: 1 — в покое (верх виден целиком), 0 — экран прокручен (верх растворяется). */
  cover: Animated.Value;
  /** Worklet: текущее смещение прокрутки. Отдаётся в useBouncy({ onScrollWorklet }) или зовётся из своего обработчика. */
  onScrollWorklet: (y: number) => void;
}>;

/**
 * Признак «экран прокручен» для ОТДЕЛЬНОГО экрана (не вкладки) — включает мягкий верхний край ScrollTopEdgeFade.
 *
 * зачем (владелец 11.11: «во всех экранах… всё что под сейф зону уходит так же должно с размытым фейд краем быть»): у вкладок
 * признак общий (TopFadeScrollContext), у отдельного экрана оболочки вкладок нет — он считает свой. Смещение приходит на
 * UI-потоке; JS зовётся один раз на пересечение порога, прозрачность идёт нативным драйвером — React при прокрутке не
 * перерисовывается. На Android значение меняется одним шагом: слой внутри MaskedView перерисовывает маску целиком на кадр.
 */
export function useSoftTopEdge(passThrough?: (y: number) => void): SoftTopEdge {
  const cover = useRef(new Animated.Value(1)).current;
  const shown = useSharedValue(false);

  const setScrolled = useCallback(
    (scrolled: boolean) => {
      const toValue = scrolled ? 0 : 1;
      if (Platform.OS === 'android') {
        cover.setValue(toValue);
        return;
      }
      Animated.timing(cover, { toValue, duration: scrolled ? SHOW_MS : HIDE_MS, useNativeDriver: true }).start();
    },
    [cover],
  );

  const onScrollWorklet = useCallback(
    (y: number) => {
      'worklet';
      const scrolled = y > SHOW_THRESHOLD;
      if (scrolled !== shown.value) {
        shown.value = scrolled;
        runOnJS(setScrolled)(scrolled);
      }
      if (passThrough) passThrough(y);
    },
    [passThrough, setScrolled, shown],
  );

  return { cover, onScrollWorklet };
}
