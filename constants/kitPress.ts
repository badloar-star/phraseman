import { Easing } from 'react-native';
import { KIT_MOTION } from './motionHybrid';

/**
 * Единый эталон нажатия кита 2.0 для общих Pressable-обёрток (TapScale, PressableScale, PressableHybrid).
 * Источник — docs/design/v2-app/kit.css:64–65 и kit.js:
 *   `.t`      — transform 240ms cubic-bezier(.3,1.4,.5,1), opacity 160ms (отпускание);
 *   `.t.down` — scale(.97), opacity .86, длительность 90ms (вдавливание).
 * зачем (владелец 04.10 «каждая анимация в точности как на макетах», координатор 10.10): раньше три обёртки
 * жили на трёх разных пружинах/кривых/масштабах (0.88 / 0.94–0.988 / PRESS.scale) — теперь числа в одном месте,
 * а компоненты только подставляют их в Animated.timing (хаптик по-прежнему идёт ПОСЛЕ старта кадра).
 */
const KIT_PRESS_BEZIER = Easing.bezier(KIT_MOTION.pressEase[0], KIT_MOTION.pressEase[1], KIT_MOTION.pressEase[2], KIT_MOTION.pressEase[3]);

/** Вдавливание: transform 90ms той же кривой `.t` (kit.css меняет только длительность). */
export const KIT_PRESS_DOWN = { duration: KIT_MOTION.pressDownMs, easing: KIT_PRESS_BEZIER } as const;

/** Отпускание: transform 240ms cubic-bezier(.3,1.4,.5,1) — с лёгким перелётом, как на макете. */
export const KIT_PRESS_UP = { duration: KIT_MOTION.pressMs, easing: KIT_PRESS_BEZIER } as const;

/** Прозрачность при вдавливании: .86 за 90ms (длительность `.t.down`), CSS-кривая по умолчанию `ease`. */
export const KIT_PRESS_OPACITY_DOWN = { toValue: KIT_MOTION.pressOpacity, duration: KIT_MOTION.pressDownMs, easing: Easing.ease } as const;

/** Прозрачность при отпускании: 160ms (`transition: … opacity 160ms`), кривая `ease`. */
export const KIT_PRESS_OPACITY_UP = { toValue: 1, duration: 160, easing: Easing.ease } as const;

/** Масштаб вдавливания по умолчанию для всех ролей (в ките он один — `.t.down`). */
export const KIT_PRESS_SCALE = KIT_MOTION.pressScale;
