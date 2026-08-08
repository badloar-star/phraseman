import React from 'react';
import { View } from 'react-native';
import Animated, { FadeInDown, useReducedMotion } from 'react-native-reanimated';

import type { LevelExamChoiceTask } from '../../app/level_exam_types';
import { useTheme } from '../ThemeContext';
import { V2Chip } from '../tournament/tournament_v2_ui';

type Props = {
  task: LevelExamChoiceTask;
  selectedOptionId: string | null;
  onSelect: (optionId: string) => void;
};

export default function ContextChoiceQuestion({ task, selectedOptionId, onSelect }: Props) {
  const { ds } = useTheme();
  const reduceMotion = useReducedMotion();
  return (
    <View accessibilityLabel={task.prompt} style={{ gap: ds.spacing.sm }}>
      {task.options.map((option, index) => {
        const selected = option.id === selectedOptionId;
        return (
          <Animated.View key={option.id} entering={reduceMotion ? undefined : FadeInDown.delay(index * 40).duration(260)}>
            <V2Chip
              block
              selected={selected}
              onPress={() => onSelect(option.id)}
              accessibilityLabel={`${index + 1}. ${option.text}`}
            >
              {option.text}
            </V2Chip>
          </Animated.View>
        );
      })}
    </View>
  );
}
