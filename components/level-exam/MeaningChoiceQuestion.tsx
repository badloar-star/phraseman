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

export default function MeaningChoiceQuestion({ task, selectedOptionId, onSelect }: Props) {
  const { theme: t, f, ds } = useTheme();
  return (
    <View accessibilityLabel={task.prompt} style={[styles.grid, { gap: ds.spacing.sm }]}> 
      {task.options.map((option) => {
        const selected = option.id === selectedOptionId;
        return (
          <TapScale
            key={option.id}
            onPress={() => onSelect(option.id)}
            accessibilityRole="radio"
            accessibilityLabel={option.text}
            accessibilityState={{ selected }}
            style={[styles.tile, { backgroundColor: selected ? t.accentBg : t.bgSurface2, padding: ds.spacing.md }]}
          >
            <Text style={{ color: selected ? t.accent : t.textPrimary, fontSize: f.body, fontFamily: ds.fontFamily, fontWeight: selected ? '800' : '600', textAlign: 'center' }}>
              {option.text}
            </Text>
          </TapScale>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  tile: { minHeight: 82, minWidth: 130, flex: 1, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
});
