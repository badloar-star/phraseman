import { FadeIn, ReduceMotion } from 'react-native-reanimated';

// зачем (координатор Q39): раскрытие ролика ~180 мс, только opacity в UI-потоке;
// при системном «уменьшить движение» — без анимации.
export const VIDEO_PLAYER_REVEAL = FadeIn.duration(180).reduceMotion(ReduceMotion.System);
