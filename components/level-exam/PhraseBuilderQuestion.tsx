import React from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { FadeInDown, useReducedMotion } from 'react-native-reanimated';

import type { LevelExamPhraseBuilderTask } from '../../app/level_exam_types';
import { useTheme } from '../ThemeContext';
import { V2Chip, V2ChipGhost } from '../tournament/tournament_v2_ui';

type Props = {
  task: LevelExamPhraseBuilderTask;
  selectedTokenIds: readonly string[];
  onChange: (tokenIds: string[]) => void;
};

export default function PhraseBuilderQuestion({ task, selectedTokenIds, onChange }: Props) {
  const { theme: t, ds } = useTheme();
  const reduceMotion = useReducedMotion();
  const selected = selectedTokenIds.map((id) => task.tokens.find((token) => token.id === id)).filter(Boolean);
  return (
    <View accessibilityLabel={task.prompt} style={{ gap: ds.spacing.lg }}>
      <View style={[styles.answer, { backgroundColor: t.bgSurface, padding: ds.spacing.md, gap: ds.spacing.sm }]}> 
        {selected.map((token, index) => token ? (
          <Animated.View key={token.id} entering={reduceMotion ? undefined : FadeInDown.duration(140)}>
            <V2Chip
              selected
              onPress={() => onChange(selectedTokenIds.filter((_id, selectedIndex) => selectedIndex !== index))}
              accessibilityLabel={`${token.text}, remove`}
            >
              {token.text}
            </V2Chip>
          </Animated.View>
        ) : null)}
      </View>
      <View style={[styles.bank, { gap: ds.spacing.sm }]}> 
        {task.tokens.map((token, index) => selectedTokenIds.includes(token.id) ? (
          <V2ChipGhost key={token.id} label={token.text} />
        ) : (
          <Animated.View key={token.id} entering={reduceMotion ? undefined : FadeInDown.delay(index * 30).duration(180)}>
            <V2Chip
              onPress={() => onChange([...selectedTokenIds, token.id])}
              accessibilityLabel={`${token.text}, add`}
            >
              {token.text}
            </V2Chip>
          </Animated.View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  answer: { minHeight: 84, borderRadius: 18, flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center' },
  bank: { flexDirection: 'row', flexWrap: 'wrap' },
});
