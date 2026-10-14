import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInDown, useReducedMotion } from 'react-native-reanimated';

import type { LevelExamPhraseBuilderTask } from '../../app/level_exam_types';
import { useTheme } from '../ThemeContext';
import { liquidGlassTokens } from '../../constants/liquidGlassThemePalette';
import { plateBoxShadow } from '../v2/ShadowSurface';

type Props = {
  task: LevelExamPhraseBuilderTask;
  selectedTokenIds: readonly string[];
  onChange: (tokenIds: string[]) => void;
};

export default function PhraseBuilderQuestion({ task, selectedTokenIds, onChange }: Props) {
  const { ds, liquidGlassThemeId } = useTheme();
  const glass = liquidGlassTokens(liquidGlassThemeId);
  const reduceMotion = useReducedMotion();
  const selected = selectedTokenIds.map((id) => task.tokens.find((token) => token.id === id)).filter(Boolean);
  return (
    <View accessibilityLabel={task.prompt} style={{ gap: ds.spacing.lg }}>
      <View style={[styles.answer, { backgroundColor: glass.opaqueCard, padding: ds.spacing.md, gap: ds.spacing.sm }]}>
        {selected.map((token, index) => token ? (
          <Animated.View key={token.id} entering={reduceMotion ? undefined : FadeInDown.duration(140)}>
            <Pressable
              accessibilityRole="button"
              onPress={() => onChange(selectedTokenIds.filter((_id, selectedIndex) => selectedIndex !== index))}
              accessibilityLabel={`${token.text}, remove`}
              style={({ pressed }) => [styles.tile, { backgroundColor: glass.buttonFill, opacity: pressed ? 0.8 : 1 }]}
            >
              <Text style={[styles.tileText, { color: glass.text }]}>{token.text}</Text>
            </Pressable>
          </Animated.View>
        ) : null)}
      </View>
      <View style={[styles.bank, { gap: ds.spacing.sm }]}>
        {task.tokens.map((token, index) => selectedTokenIds.includes(token.id) ? (
          <View key={token.id} accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={[styles.tile, styles.tileUsed, { backgroundColor: glass.opaqueControl }]}>
            <Text style={[styles.tileText, { color: glass.mutedText }]}>{token.text}</Text>
          </View>
        ) : (
          <Animated.View key={token.id} entering={reduceMotion ? undefined : FadeInDown.delay(index * 30).duration(180)}>
            <Pressable
              accessibilityRole="button"
              onPress={() => onChange([...selectedTokenIds, token.id])}
              accessibilityLabel={`${token.text}, add`}
              style={({ pressed }) => [styles.tile, { backgroundColor: glass.plateFillFrom, boxShadow: plateBoxShadow(glass), opacity: pressed ? 0.8 : 1 }]}
            >
              <Text style={[styles.tileText, { color: glass.text }]}>{token.text}</Text>
            </Pressable>
          </Animated.View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  answer: { minHeight: 84, borderRadius: 16, flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center' },
  tile: { minHeight: 44, borderRadius: 14, paddingHorizontal: 16, justifyContent: 'center' },
  tileUsed: { opacity: 0.4 },
  tileText: { fontSize: 16, lineHeight: 21, fontWeight: '700' },
  bank: { flexDirection: 'row', flexWrap: 'wrap' },
});
