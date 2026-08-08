import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import type { LevelExamSpotErrorTask } from '../../app/level_exam_types';
import TapScale from '../TapScale';
import { useTheme } from '../ThemeContext';

type Props = {
  task: LevelExamSpotErrorTask;
  selectedTokenId: string | null;
  onSelect: (tokenId: string) => void;
};

export default function SpotErrorQuestion({ task, selectedTokenId, onSelect }: Props) {
  const { theme: t, f, ds } = useTheme();
  return (
    <View accessibilityLabel={task.prompt} style={[styles.tokens, { gap: ds.spacing.sm }]}> 
      {task.tokens.map((token) => {
        const selected = token.id === selectedTokenId;
        return (
          <TapScale
            key={token.id}
            onPress={() => onSelect(token.id)}
            accessibilityLabel={token.text}
            accessibilityHint="Select as the word with an error"
            accessibilityState={{ selected }}
            style={[styles.token, { backgroundColor: selected ? t.wrongBg : t.bgSurface2, paddingHorizontal: ds.spacing.md }]}
          >
            <Text style={{ color: selected ? t.wrong : t.textPrimary, fontSize: f.bodyLg, fontFamily: ds.fontFamily, fontWeight: selected ? '900' : '700' }}>
              {token.text}
            </Text>
            {selected ? <Ionicons name="alert-circle" size={17} color={t.wrong} /> : null}
          </TapScale>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  tokens: { minHeight: 120, flexDirection: 'row', flexWrap: 'wrap', alignContent: 'center' },
  token: { minHeight: 48, borderRadius: 16, flexDirection: 'row', alignItems: 'center', gap: 5 },
});
