import React, { memo, useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated';

/**
 * Результат проверки главы — «что я умею», а не оценка.
 *
 * зачем (спека SB-14 + макет 26, утверждён владельцем 22.08): чекпоинт не имеет
 * права показывать красное «провалено» и снимать заработанное. Он перечисляет
 * умения: что закрепилось, что стоит повторить. Слабое место — не приговор, а
 * приглашение вернуться.
 *
 * Строки въезжают каскадом по 130мс. Анимации конечные, reduce motion отдаёт
 * готовый кадр сразу.
 */

const ROW_MS = 260;
const STEP_MS = 130;
const EASE = Easing.bezier(0.38, 0.7, 0.125, 1);

export interface LearningV2CheckpointSkillRow {
  readonly id: string;
  readonly label: string;
  /** confirmed — закрепилось; review — стоит повторить. Провала нет by design. */
  readonly state: 'confirmed' | 'review';
}

interface RowProps {
  row: LearningV2CheckpointSkillRow;
  index: number;
  surfaceColor: string;
  textColor: string;
  confirmedColor: string;
  reviewColor: string;
  reduceMotion: boolean;
}

const SkillRow = memo(function SkillRow({
  row,
  index,
  surfaceColor,
  textColor,
  confirmedColor,
  reviewColor,
  reduceMotion,
}: RowProps) {
  const progress = useSharedValue(reduceMotion ? 1 : 0);

  useEffect(() => {
    if (reduceMotion) return;
    progress.value = withDelay(
      index * STEP_MS,
      withTiming(1, { duration: ROW_MS, easing: EASE }),
    );
  }, [index, progress, reduceMotion]);

  const style = useAnimatedStyle(() => ({
    opacity: progress.value,
    transform: [{ translateY: (1 - progress.value) * 8 }],
  }));

  const confirmed = row.state === 'confirmed';

  return (
    <Animated.View style={[styles.row, { backgroundColor: surfaceColor }, style]}>
      <Ionicons
        name={confirmed ? 'checkmark-circle' : 'refresh-circle'}
        size={20}
        color={confirmed ? confirmedColor : reviewColor}
      />
      <Text style={[styles.rowText, { color: textColor }]}>{row.label}</Text>
    </Animated.View>
  );
});

interface Props {
  rows: readonly LearningV2CheckpointSkillRow[];
  surfaceColor: string;
  textColor: string;
  confirmedColor: string;
  reviewColor: string;
  reduceMotion: boolean;
}

export const LearningV2CheckpointOutcome = memo(
  function LearningV2CheckpointOutcome({
    rows,
    surfaceColor,
    textColor,
    confirmedColor,
    reviewColor,
    reduceMotion,
  }: Props) {
    return (
      <View style={styles.root} accessibilityLiveRegion="polite">
        {rows.map((row, index) => (
          <SkillRow
            key={row.id}
            row={row}
            index={index}
            surfaceColor={surfaceColor}
            textColor={textColor}
            confirmedColor={confirmedColor}
            reviewColor={reviewColor}
            reduceMotion={reduceMotion}
          />
        ))}
      </View>
    );
  },
);

const styles = StyleSheet.create({
  root: { width: '100%', maxWidth: 340, gap: 9 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderRadius: 12,
    paddingHorizontal: 13,
    paddingVertical: 11,
  },
  rowText: { flex: 1, fontSize: 14.5, fontWeight: '700' },
});

export default LearningV2CheckpointOutcome;
