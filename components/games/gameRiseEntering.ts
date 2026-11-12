/**
 * Подъём при появлении (`.rise` макета: 520 мс cubic-bezier(.2,1,.3,1), из прозрачности 0 и сдвига вниз на 18)
 * как анимация входа Reanimated — она стартует на UI-потоке в момент появления элемента.
 *
 * зачем (обход экранов 12.11, «Неправильные глаголы»): GameRise запускает подъём из эффекта, а эффект на смене
 * раунда приходил через 346 мс (журнал [QUIZ-ROUND] на эмуляторе), на нагруженном телефоне — до 1,4 с: всё это время
 * новые плашки стояли невидимыми, и экран был пустым. Анимация входа от занятости JS не зависит.
 */
import { Easing, withDelay, withTiming, type EntryAnimationsValues, type LayoutAnimation } from 'react-native-reanimated';

import { GAME_EASE, GAME_MOTION } from '../../constants/gameMotion';

const RISE_EASE = Easing.bezier(GAME_EASE.out[0], GAME_EASE.out[1], GAME_EASE.out[2], GAME_EASE.out[3]);

/** Анимация входа для `entering={gameRiseEntering(delayMs)}`; при «уменьшить движение» передавать undefined. */
export function gameRiseEntering(delayMs = 0): (values: EntryAnimationsValues) => LayoutAnimation {
  return () => {
    'worklet';
    const timing = { duration: GAME_MOTION.riseMs, easing: RISE_EASE };
    return {
      initialValues: { opacity: 0, transform: [{ translateY: GAME_MOTION.riseShift }] },
      animations: {
        opacity: withDelay(delayMs, withTiming(1, timing)),
        transform: [{ translateY: withDelay(delayMs, withTiming(0, timing)) }],
      },
    };
  };
}
