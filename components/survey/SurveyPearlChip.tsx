import { Image } from 'expo-image';
import React, { forwardRef, useEffect, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Reanimated, {
  cancelAnimation,
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

import { oskolokImageForPackShards } from '../../app/oskolok';
import { SHARD_REWARDS } from '../../app/shards_system';
import { useReduceMotion } from '../../hooks/use_reduce_motion';
import { useTheme } from '../ThemeContext';
import { FlowText } from '../text-integrity/FlowText';

/**
 * Чип баланса жемчуга в шапке шторки опроса (макет A «Прилив», владелец 2026-09-13).
 *
 * зачем: связь «ответ → мой счёт» должна быть видна буквально: жемчужина
 * прилетает сюда, чип подпрыгивает, число докручивается. Внешне повторяет чип
 * баланса Главной, чтобы ученик узнал «свой» счётчик.
 *
 * Докрутка числа: старая цифра уезжает вверх и гаснет (130 мс), новая приходит
 * снизу (220 мс, ease-out). Только transform/opacity — всё на UI-потоке.
 */
export interface SurveyPearlChipProps {
  value: number;
  accessibilityLabel: string;
  testID: string;
}

const ROLL_OUT_MS = 130;
const ROLL_IN_MS = 220;
const ROLL_SHIFT_PX = 12;
const BUMP_UP_MS = 140;
const BUMP_DOWN_MS = 220;
const BUMP_SCALE = 1.12;

const SurveyPearlChip = forwardRef<View, SurveyPearlChipProps>(function SurveyPearlChip(
  { value, accessibilityLabel, testID },
  ref,
) {
  const { theme: t, f, themeMode } = useTheme();
  const reduceMotion = useReduceMotion();
  const [shown, setShown] = useState(value);
  const prevValueRef = useRef(value);
  const swapTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const chipScale = useSharedValue(1);
  const numberY = useSharedValue(0);
  const numberOpacity = useSharedValue(1);

  useEffect(() => {
    if (prevValueRef.current === value) return;
    const grew = value > prevValueRef.current;
    prevValueRef.current = value;
    if (swapTimerRef.current) {
      clearTimeout(swapTimerRef.current);
      swapTimerRef.current = null;
    }
    if (reduceMotion) {
      setShown(value);
      return;
    }
    // При росте цифра уходит вверх (как в макете), при откате — вниз.
    const direction = grew ? -1 : 1;
    numberY.value = withTiming(direction * ROLL_SHIFT_PX, { duration: ROLL_OUT_MS, easing: Easing.in(Easing.quad) });
    numberOpacity.value = withTiming(0, { duration: ROLL_OUT_MS });
    swapTimerRef.current = setTimeout(() => {
      swapTimerRef.current = null;
      setShown(value);
      numberY.value = -direction * ROLL_SHIFT_PX;
      numberY.value = withTiming(0, { duration: ROLL_IN_MS, easing: Easing.out(Easing.cubic) });
      numberOpacity.value = withTiming(1, { duration: ROLL_IN_MS });
    }, ROLL_OUT_MS);
    if (grew) {
      chipScale.value = withSequence(
        withTiming(BUMP_SCALE, { duration: BUMP_UP_MS, easing: Easing.out(Easing.cubic) }),
        withTiming(1, { duration: BUMP_DOWN_MS, easing: Easing.out(Easing.cubic) }),
      );
    }
  }, [chipScale, numberOpacity, numberY, reduceMotion, value]);

  useEffect(() => () => {
    if (swapTimerRef.current) clearTimeout(swapTimerRef.current);
    cancelAnimation(chipScale);
    cancelAnimation(numberY);
    cancelAnimation(numberOpacity);
  }, [chipScale, numberOpacity, numberY]);

  const chipStyle = useAnimatedStyle(() => ({ transform: [{ scale: chipScale.value }] }));
  const numberStyle = useAnimatedStyle(() => ({
    opacity: numberOpacity.value,
    transform: [{ translateY: numberY.value }],
  }));

  return (
    <Reanimated.View
      ref={ref}
      testID={testID}
      accessible
      accessibilityLabel={accessibilityLabel}
      style={[styles.chip, { backgroundColor: t.accentBg }, chipStyle]}
    >
      <Image
        testID={`${testID}-art`}
        source={oskolokImageForPackShards(SHARD_REWARDS.survey_completed, themeMode)}
        style={styles.art}
        contentFit="contain"
        accessible={false}
        importantForAccessibility="no"
      />
      <View style={styles.numberClip}>
        <Reanimated.View style={numberStyle}>
          <FlowText
            testID={`${testID}-value`}
            provenance="authored"
            style={[styles.number, { color: t.textPrimary, fontSize: f.body }]}
          >
            {String(shown)}
          </FlowText>
        </Reanimated.View>
      </View>
    </Reanimated.View>
  );
});

export default SurveyPearlChip;

const styles = StyleSheet.create({
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    height: 36,
    paddingLeft: 8,
    paddingRight: 12,
    borderRadius: 18,
  },
  art: { width: 22, height: 22 },
  numberClip: { height: 22, overflow: 'hidden', justifyContent: 'center' },
  number: { fontWeight: '800', lineHeight: 22, fontVariant: ['tabular-nums'] },
});
