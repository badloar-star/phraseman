import { useEffect, useRef } from 'react';
import { Animated, Easing } from 'react-native';

import { MOTION_DURATION } from '../constants/motion';

export type AccordionChevronMode = 'down' | 'right';

/** Только шеврон: поворот, opacity, scale. */
export function useAccordionChevronStyle(
  isOpen: boolean,
  chevronMode: AccordionChevronMode = 'down'
) {
  const chevronAnim = useRef(new Animated.Value(isOpen ? 1 : 0)).current;

  useEffect(() => {
    Animated.timing(chevronAnim, {
      toValue: isOpen ? 1 : 0,
      duration: MOTION_DURATION.slow,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [isOpen, chevronAnim]);

  const rotate = chevronAnim.interpolate({
    inputRange: [0, 1],
    outputRange: chevronMode === 'right' ? ['0deg', '90deg'] : ['0deg', '180deg'],
  });
  const chevronOpacity = chevronAnim.interpolate({ inputRange: [0, 1], outputRange: [0.7, 1] });
  const chevronScale = chevronAnim.interpolate({ inputRange: [0, 1], outputRange: [1, 1.06] });

  return { rotate, chevronOpacity, chevronScale };
}

/** Раскрытие текста ответа (если `enabled: false` — тайминги не крутятся). */
export function useAccordionAnswerReveal(isOpen: boolean, options?: { enabled?: boolean }) {
  const { enabled = true } = options ?? {};
  const answerAnim = useRef(new Animated.Value(isOpen && enabled ? 1 : 0)).current;

  useEffect(() => {
    if (!enabled) {
      answerAnim.setValue(0);
      return;
    }
    if (!isOpen) {
      answerAnim.setValue(0);
      return;
    }
    answerAnim.setValue(0);
    Animated.timing(answerAnim, {
      toValue: 1,
      duration: MOTION_DURATION.normal,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [isOpen, enabled, answerAnim]);

  const answerOpacity = answerAnim.interpolate({ inputRange: [0, 1], outputRange: [0, 1] });
  const answerTranslateY = answerAnim.interpolate({ inputRange: [0, 1], outputRange: [-4, 0] });

  return { answerOpacity, answerTranslateY };
}

/**
 * Шеврон + ответ. Для «только шеврон» наружу: `useAccordionChevronStyle` + `AccordionChevronIonicons`.
 */
export function useAccordionFaqStyle(
  isOpen: boolean,
  options?: { withAnswer?: boolean; chevronMode?: AccordionChevronMode }
) {
  const { withAnswer = true, chevronMode = 'down' } = options ?? {};
  const c = useAccordionChevronStyle(isOpen, chevronMode);
  const a = useAccordionAnswerReveal(isOpen, { enabled: withAnswer });
  return { ...c, ...a };
}
