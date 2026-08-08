import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import type { LevelExamPhraseBuilderTask } from '../../app/level_exam_types';
import TapScale from '../TapScale';
import { useTheme } from '../ThemeContext';

type Props = {
  task: LevelExamPhraseBuilderTask;
  selectedTokenIds: readonly string[];
  onChange: (tokenIds: string[]) => void;
};

export default function PhraseBuilderQuestion({ task, selectedTokenIds, onChange }: Props) {
  const { theme: t, f, ds } = useTheme();
  const selected = selectedTokenIds.map((id) => task.tokens.find((token) => token.id === id)).filter(Boolean);
  const available = task.tokens.filter((token) => !selectedTokenIds.includes(token.id));
  return (
    <View accessibilityLabel={task.prompt} style={{ gap: ds.spacing.lg }}>
      <View style={[styles.answer, { backgroundColor: t.bgSurface, padding: ds.spacing.md, gap: ds.spacing.sm }]}> 
        {selected.length === 0 ? (
          <Text style={{ color: t.textMuted, fontSize: f.body, fontFamily: ds.fontFamily }}>…</Text>
        ) : selected.map((token, index) => token ? (
          <TapScale
            key={token.id}
            onPress={() => onChange(selectedTokenIds.filter((_id, selectedIndex) => selectedIndex !== index))}
            accessibilityLabel={`${token.text}, remove`}
            style={[styles.token, { backgroundColor: t.accentBg, paddingHorizontal: ds.spacing.md }]}
          >
            <Text style={{ color: t.accent, fontSize: f.body, fontFamily: ds.fontFamily, fontWeight: '800' }}>{token.text}</Text>
            <Ionicons name="close" size={15} color={t.accent} />
          </TapScale>
        ) : null)}
      </View>
      <View style={[styles.bank, { gap: ds.spacing.sm }]}> 
        {available.map((token) => (
          <TapScale
            key={token.id}
            onPress={() => onChange([...selectedTokenIds, token.id])}
            accessibilityLabel={`${token.text}, add`}
            style={[styles.token, { backgroundColor: t.bgSurface2, paddingHorizontal: ds.spacing.md }]}
          >
            <Text style={{ color: t.textPrimary, fontSize: f.body, fontFamily: ds.fontFamily, fontWeight: '700' }}>{token.text}</Text>
          </TapScale>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  answer: { minHeight: 84, borderRadius: 18, flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center' },
  bank: { flexDirection: 'row', flexWrap: 'wrap' },
  token: { minHeight: 44, borderRadius: 15, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4 },
});
