import React from 'react';
import { View } from 'react-native';
import Animated, { FadeInDown, useReducedMotion } from 'react-native-reanimated';

import type { LevelExamChoiceTask } from '../../app/level_exam_types';
import { useTheme } from '../ThemeContext';
import { liquidGlassTokens } from '../../constants/liquidGlassThemePalette';
import { ExamOption } from './ExamGlassParts';

type Props = {
  task: LevelExamChoiceTask;
  selectedOptionId: string | null;
  onSelect: (optionId: string) => void;
};

export default function ContextChoiceQuestion({ task, selectedOptionId, onSelect }: Props) {
  const { theme: t, ds, liquidGlassThemeId } = useTheme();
  const glass = liquidGlassTokens(liquidGlassThemeId);
  const reduceMotion = useReducedMotion();
  return (
    <View accessibilityLabel={task.prompt} style={{ gap: ds.spacing.sm }}>
      {task.options.map((option, index) => {
        const selected = option.id === selectedOptionId;
        return (
          <Animated.View key={option.id} entering={reduceMotion ? undefined : FadeInDown.delay(index * 40).duration(260)}>
            <ExamOption
              glass={glass}
              label={option.text}
              state={selected ? 'pressed' : 'idle'}
              okColor={t.correct}
              okBg={t.correctBg}
              noColor={t.wrong}
              noBg={t.wrongBg}
              onPress={() => onSelect(option.id)}
              accessibilityLabel={`${index + 1}. ${option.text}`}
            />
          </Animated.View>
        );
      })}
    </View>
  );
}
