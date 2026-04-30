import React from 'react';
import { Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { useAccordionChevronStyle, type AccordionChevronMode } from '../hooks/useAccordionFaqStyle';

type Props = {
  isOpen: boolean;
  size?: number;
  /** Цвет в закрытом состоянии */
  color: string;
  /** Цвет при открытии; если нет — тот же, что `color` */
  openColor?: string;
  chevronMode?: AccordionChevronMode;
};

/**
 * Декларативный шеврон-аккордеон (Ionicons `chevron-down`), с теми же motion-таймингами, что и FAQ.
 */
export default function AccordionChevronIonicons({
  isOpen,
  size = 20,
  color,
  openColor,
  chevronMode = 'down',
}: Props) {
  const { rotate, chevronOpacity, chevronScale } = useAccordionChevronStyle(isOpen, chevronMode);
  const iconColor = isOpen && openColor != null ? openColor : color;

  return (
    <Animated.View style={{ opacity: chevronOpacity, transform: [{ rotate }, { scale: chevronScale }] }}>
      <Ionicons name="chevron-down" size={size} color={iconColor} />
    </Animated.View>
  );
}
