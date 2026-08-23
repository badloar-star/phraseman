import React, { memo, useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, {
  Easing,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

/**
 * Финальная сцена сессии: звёзды зажигаются по одной.
 *
 * зачем (аудит анимаций 22.08): боевой плеер завершал сессию МОЛЧА — сразу
 * возврат на карту, без единого кадра празднования. Сцена со звёздами
 * существовала только в недостижимом легаси-экране. Каталог активностей 04
 * требует: звёзды по одной 160-180мс, вся сцена не дольше 700мс.
 *
 * Бюджет: 3 звезды x 170мс + подпись = 620мс < 700мс. Анимации конечные
 * (никакого withRepeat), поэтому реестр вечных циклов не затрагивается.
 * reduce motion показывает финальный кадр сразу и сразу отдаёт onDone.
 */

const STAR_MS = 170;
const STAR_STEP_MS = 150;
const CAPTION_MS = 160;
const EASE = Easing.bezier(0.38, 0.7, 0.125, 1);

interface StarProps {
  index: number;
  filled: boolean;
  color: string;
  mutedColor: string;
  reduceMotion: boolean;
}

const FinaleStar = memo(function FinaleStar({
  index,
  filled,
  color,
  mutedColor,
  reduceMotion,
}: StarProps) {
  const scale = useSharedValue(reduceMotion ? 1 : 0.4);
  const opacity = useSharedValue(reduceMotion ? 1 : 0);

  useEffect(() => {
    if (reduceMotion) return;
    const delay = index * STAR_STEP_MS;
    opacity.value = withDelay(delay, withTiming(1, { duration: STAR_MS, easing: EASE }));
    scale.value = withDelay(
      delay,
      withSequence(
        withTiming(1.18, { duration: STAR_MS * 0.6, easing: EASE }),
        withTiming(1, { duration: STAR_MS * 0.4, easing: EASE }),
      ),
    );
  }, [index, opacity, reduceMotion, scale]);

  const style = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ scale: scale.value }],
  }));

  return (
    <Animated.View style={style}>
      <Ionicons
        name={filled ? 'star' : 'star-outline'}
        size={44}
        color={filled ? color : mutedColor}
      />
    </Animated.View>
  );
});

interface Props {
  /** Заработанные звёзды 0-3. */
  stars: 0 | 1 | 2 | 3;
  caption: string;
  starColor: string;
  mutedColor: string;
  textColor: string;
  reduceMotion: boolean;
  /** Вызывается после сцены — плеер уводит на карту. */
  onDone: () => void;
}

export const LearningV2SessionFinale = memo(function LearningV2SessionFinale({
  stars,
  caption,
  starColor,
  mutedColor,
  textColor,
  reduceMotion,
  onDone,
}: Props) {
  const captionOpacity = useSharedValue(reduceMotion ? 1 : 0);

  useEffect(() => {
    if (reduceMotion) {
      onDone();
      return;
    }
    const captionDelay = 3 * STAR_STEP_MS;
    captionOpacity.value = withDelay(
      captionDelay,
      withTiming(1, { duration: CAPTION_MS, easing: EASE }, (finished) => {
        if (finished) runOnJS(onDone)();
      }),
    );
  }, [captionOpacity, onDone, reduceMotion]);

  const captionStyle = useAnimatedStyle(() => ({ opacity: captionOpacity.value }));

  return (
    <View style={styles.root} accessibilityLiveRegion="polite">
      <View style={styles.stars}>
        {[0, 1, 2].map((slot) => (
          <FinaleStar
            key={slot}
            index={slot}
            filled={slot < stars}
            color={starColor}
            mutedColor={mutedColor}
            reduceMotion={reduceMotion}
          />
        ))}
      </View>
      <Animated.View style={captionStyle}>
        <Text style={[styles.caption, { color: textColor }]}>{caption}</Text>
      </Animated.View>
    </View>
  );
});

const styles = StyleSheet.create({
  root: { alignItems: 'center', justifyContent: 'center', gap: 18, paddingVertical: 28 },
  stars: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  caption: { fontSize: 17, fontWeight: '700', textAlign: 'center' },
});

export default LearningV2SessionFinale;
