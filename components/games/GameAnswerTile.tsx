/**
 * Плитка ответа в играх — движение перенесено из макета в точности
 * (docs/design/v2-app/elevate-mechanics.css, `.at`, `.rise`, `shake`; kit.css, `.t`). Числа — в constants/gameMotion.ts.
 *
 *  • появление: подъём 520 мс cubic-bezier(.2,1,.3,1) из opacity 0 и сдвига 18, лесенкой по 70 мс;
 *  • нажатие: вдавливание 90 мс до .97 / .86, отпускание 240 мс «пружиной»;
 *  • исход: заливка и цвет текста 260 мс; при промахе дрожь 380 мс; посторонние плитки гаснут до .34 за 300 мс.
 */
import React, { memo, useEffect, useRef } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Reanimated, {
  Easing, cancelAnimation, interpolateColor, useAnimatedStyle, useSharedValue, withDelay, withSequence, withTiming,
} from 'react-native-reanimated';

import { GAME_EASE, GAME_MOTION } from '../../constants/gameMotion';
import { hapticTap } from '../../hooks/use-haptics';
import { useReduceMotion } from '../../hooks/use_reduce_motion';
import { nestedBoxShadow, useShadowGlass } from '../v2/ShadowSurface';
import { useV2Palette } from '../v2/useV2Palette';

export type GameAnswerState = 'idle' | 'correct' | 'wrong' | 'off' | 'hidden';

type Props = Readonly<{
  label: string;
  /** Место в списке — задаёт задержку подъёма. */
  index: number;
  state: GameAnswerState;
  disabled?: boolean;
  /** false — плитка стоит на месте сразу, без подъёма (кнопки реплик в «Собери диалог»). */
  rise?: boolean;
  /** Плитка пониже и текст помельче — как у кнопок реплик в макете (54 / 16). */
  compact?: boolean;
  /** Меняется при каждом промахе — дрожь запускается заново, даже если плитка ещё красная. */
  pulse?: number;
  onPress: () => void;
  testID?: string;
}>;

const bezier = (c: readonly number[]) => Easing.bezier(c[0], c[1], c[2], c[3]);

function GameAnswerTile({ label, index, state, disabled = false, rise: riseIn = true, compact = false, pulse = 0, onPress, testID }: Props) {
  const p = useV2Palette();
  const g = useShadowGlass();
  const reduceMotion = useReduceMotion();
  const rise = useSharedValue(reduceMotion || !riseIn ? 1 : 0);
  const press = useSharedValue(0);
  const pressFade = useSharedValue(0);
  const shake = useSharedValue(0);
  const outcome = useSharedValue(0);
  const dim = useSharedValue(1);

  useEffect(() => {
    if (reduceMotion || !riseIn) {
      rise.value = 1;
      return undefined;
    }
    rise.value = withDelay(index * GAME_MOTION.answerStaggerMs, withTiming(1, { duration: GAME_MOTION.riseMs, easing: bezier(GAME_EASE.out) }));
    return () => cancelAnimation(rise);
  }, [index, reduceMotion, rise, riseIn]);

  useEffect(() => {
    const resolved = state === 'correct' || state === 'wrong';
    outcome.value = withTiming(resolved ? 1 : 0, { duration: reduceMotion ? 0 : GAME_MOTION.tileColorMs, easing: bezier(GAME_EASE.ease) });
    // «убрана» — `.at.hid` в макете: плитка гаснет до нуля тем же переходом прозрачности 300 мс и место за собой держит
    dim.value = withTiming(state === 'hidden' ? 0 : state === 'off' ? GAME_MOTION.tileOffOpacity : 1, { duration: reduceMotion ? 0 : GAME_MOTION.tileFadeMs, easing: bezier(GAME_EASE.ease) });
    if (state === 'wrong' && !reduceMotion) {
      // дрожь по опорным точкам `@keyframes shake`: каждая доля времени — свой отрезок
      let previous = 0;
      shake.value = withSequence(...GAME_MOTION.shakeStops.map((stop) => {
        const duration = (stop.at - previous) * GAME_MOTION.shakeMs;
        previous = stop.at;
        return withTiming(stop.x, { duration, easing: bezier(GAME_EASE.ease) });
      }));
    }
    return () => {
      cancelAnimation(shake);
    };
  }, [dim, outcome, pulse, reduceMotion, shake, state]);

  // зачем: тон исхода запоминается — когда промах снимается (плитка снова обычная), заливка гаснет своим же красным,
  // а не перекрашивается на лету в зелёный
  const lastTint = useRef(p.correct);
  if (state === 'wrong') lastTint.current = p.wrong;
  else if (state === 'correct') lastTint.current = p.correct;
  const tint = lastTint.current;

  const wrapStyle = useAnimatedStyle(() => ({
    opacity: rise.value * dim.value * (1 - (1 - GAME_MOTION.pressOpacity) * pressFade.value),
    transform: [
      { translateY: (1 - rise.value) * GAME_MOTION.riseShift },
      { translateX: shake.value },
      { scale: 1 - (1 - GAME_MOTION.pressScale) * press.value },
    ],
  }));
  const tintStyle = useAnimatedStyle(() => ({ opacity: outcome.value * GAME_MOTION.tileTintOpacity }));
  const textStyle = useAnimatedStyle(() => ({ color: interpolateColor(outcome.value, [0, 1], [p.text, tint]) }));

  return (
    <Reanimated.View style={wrapStyle}>
      <Pressable
        testID={testID}
        accessibilityRole="button"
        accessibilityLabel={label}
        accessibilityState={{ disabled, selected: state === 'correct' || state === 'wrong' }}
        disabled={disabled}
        onPressIn={() => {
          void hapticTap();
          press.value = withTiming(1, { duration: GAME_MOTION.pressDownMs });
          pressFade.value = withTiming(1, { duration: GAME_MOTION.pressDownMs });
        }}
        onPressOut={() => {
          press.value = withTiming(0, { duration: GAME_MOTION.pressUpMs, easing: bezier(GAME_EASE.spring) });
          pressFade.value = withTiming(0, { duration: GAME_MOTION.pressOpacityMs });
        }}
        onPress={onPress}
        style={[s.tile, compact && s.tileCompact, { backgroundColor: g.plateFillFrom, boxShadow: nestedBoxShadow(g) }]}
      >
        <View pointerEvents="none" style={s.tintClip}>
          <Reanimated.View style={[StyleSheet.absoluteFill, { backgroundColor: tint }, tintStyle]} />
        </View>
        <Reanimated.Text style={[s.text, compact && s.textCompact, textStyle]}>{label}</Reanimated.Text>
      </Pressable>
    </Reanimated.View>
  );
}

const s = StyleSheet.create({
  tile: { minHeight: 60, paddingVertical: 12, paddingHorizontal: 20, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  tileCompact: { minHeight: 54 },
  textCompact: { fontSize: 16 },
  tintClip: { ...StyleSheet.absoluteFillObject, borderRadius: 18, overflow: 'hidden' },
  text: { textAlign: 'center', fontSize: 17, lineHeight: 22, fontWeight: '600' },
});

export default memo(GameAnswerTile);
