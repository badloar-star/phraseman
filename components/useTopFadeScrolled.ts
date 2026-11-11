import { useEffect, useRef } from 'react';
import { Animated, Platform } from 'react-native';

import { useTopFadeScroll } from './TopFadeScrollContext';

/** Как у верхней маски вкладок (TopFadeMask): порог и длительности одни на всё приложение. */
const SHOW_THRESHOLD = 6;
const SHOW_MS = 180;
const HIDE_MS = 260;

type Options = Readonly<{
  /** Значение в покое (раздел у верха); после начала прокрутки — противоположное. */
  rest: 0 | 1;
  /**
   * зачем: слой внутри маски MaskedView на Android перерисовывает битмап маски целиком на каждый кадр анимации —
   * там значение меняется одним шагом (одна перерисовка), на iOS — плавно.
   */
  stepOnAndroid?: boolean;
}>;

/**
 * Прозрачность слоя, который включается, когда активный раздел вкладки прокручен (общий признак TopFadeScroll).
 * зачем (владелец 11.11: «надо чтобы везде был край размыт и нигде жёсткий»): мягкий верхний край должен появляться только при
 * прокрутке — в покое экран прежний. Слушается только смена порога (0 ↔ 7), анимация — нативным драйвером: React при прокрутке
 * ничего не перерисовывает. Вне оболочки вкладок (нет провайдера) значение остаётся «в покое».
 */
export function useTopFadeScrolled({ rest, stepOnAndroid = false }: Options): Animated.Value {
  const topFade = useTopFadeScroll();
  const initiallyScrolled = topFade?.isMaskShown() ?? false;
  const scrolledRef = useRef(initiallyScrolled);
  const value = useRef(new Animated.Value(initiallyScrolled ? 1 - rest : rest)).current;
  const scrollY = topFade?.scrollY;

  useEffect(() => {
    if (!scrollY) return undefined;
    const step = stepOnAndroid && Platform.OS === 'android';
    const id = scrollY.addListener(({ value: y }) => {
      const scrolled = y > SHOW_THRESHOLD;
      if (scrolled === scrolledRef.current) return;
      scrolledRef.current = scrolled;
      const toValue = scrolled ? 1 - rest : rest;
      if (step) {
        value.setValue(toValue);
        return;
      }
      Animated.timing(value, { toValue, duration: scrolled ? SHOW_MS : HIDE_MS, useNativeDriver: true }).start();
    });
    return () => scrollY.removeListener(id);
  }, [scrollY, rest, stepOnAndroid, value]);

  return value;
}
