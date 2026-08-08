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

export default function MeaningChoiceQuestion({ task, selectedOptionId, onSelect }: Props) {
  const { ds } = useTheme();
  const reduceMotion = useReducedMotion();
  return (
    <View accessibilityLabel={task.prompt} style={[styles.grid, { gap: ds.spacing.sm }]}> 
      {task.options.map((option, index) => {
        const selected = option.id === selectedOptionId;
        return (
          <Animated.View key={option.id} entering={reduceMotion ? undefined : FadeInDown.delay(index * 40).duration(260)} style={{ flex: 1, minWidth: 130 }}>
            <V2Chip block selected={selected} onPress={() => onSelect(option.id)} accessibilityLabel={option.text}>
              {option.text}
            </V2Chip>
          </Animated.View>
        );
      })}
    </View>
  );
}

const styles = { grid: { flexDirection: 'row', flexWrap: 'wrap' } } as const;
