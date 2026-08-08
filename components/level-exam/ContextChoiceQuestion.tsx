import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import type { LevelExamChoiceTask } from '../../app/level_exam_types';
import TapScale from '../TapScale';
import { useTheme } from '../ThemeContext';

type Props = {
  task: LevelExamChoiceTask;
  selectedOptionId: string | null;
  onSelect: (optionId: string) => void;
};

export default function ContextChoiceQuestion({ task, selectedOptionId, onSelect }: Props) {
  const { theme: t, f, ds } = useTheme();
  return (
    <View accessibilityLabel={task.prompt} style={{ gap: ds.spacing.sm }}>
      {task.options.map((option, index) => {
        const selected = option.id === selectedOptionId;
        return (
          <TapScale
            key={option.id}
            onPress={() => onSelect(option.id)}
            accessibilityRole="radio"
            accessibilityLabel={`${index + 1}. ${option.text}`}
            accessibilityState={{ selected }}
            style={[styles.option, { backgroundColor: selected ? t.accentBg : t.bgSurface2, padding: ds.spacing.md }]}
          >
            <Text style={{ color: selected ? t.accent : t.textPrimary, fontSize: f.bodyLg, fontFamily: ds.fontFamily, fontWeight: selected ? '800' : '600' }}>
              {option.text}
            </Text>
          </TapScale>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({ option: { minHeight: 54, borderRadius: 16, justifyContent: 'center' } });
