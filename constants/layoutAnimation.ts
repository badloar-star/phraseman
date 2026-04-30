import { LayoutAnimation, Platform, UIManager } from 'react-native';

import { MOTION_DURATION } from './motion';

let androidLayoutAnimEnabled = false;

/** Включает LayoutAnimation на Android (нужно один раз до первого configureNext). */
function ensureAndroidLayoutAnimation() {
  if (Platform.OS === 'android' && !androidLayoutAnimEnabled && UIManager.setLayoutAnimationEnabledExperimental) {
    UIManager.setLayoutAnimationEnabledExperimental(true);
    androidLayoutAnimEnabled = true;
  }
}

/**
 * Плавное появление/скрытие блоков при раскрытии аккордеона (FAQ, тестовые секции и т.д.).
 * Вызывать сразу перед setState, который меняет разметку.
 */
export function configureAccordionLayout() {
  ensureAndroidLayoutAnimation();
  const ms = MOTION_DURATION.slow;
  LayoutAnimation.configureNext({
    duration: ms,
    create: {
      type: LayoutAnimation.Types.easeInEaseOut,
      property: LayoutAnimation.Properties.opacity,
    },
    update: { type: LayoutAnimation.Types.easeInEaseOut },
    delete: {
      type: LayoutAnimation.Types.easeInEaseOut,
      property: LayoutAnimation.Properties.opacity,
    },
  });
}
