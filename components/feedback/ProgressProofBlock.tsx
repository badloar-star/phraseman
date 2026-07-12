import React, { memo } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import type { ProgressCompletionModel } from '../../app/completion/progress_completion_model';
import { useTheme } from '../ThemeContext';

type Props = {
  model: ProgressCompletionModel;
  testID?: string;
};

function ProgressProofBlock({ model, testID }: Props) {
  const { theme: t, f } = useTheme();
  return (
    <View testID={testID} style={styles.root} accessibilityRole="summary">
      <Text style={[styles.fact, { color: t.textPrimary, fontSize: f.h1 }]}>{model.fact}</Text>
      <Text style={[styles.accumulated, { color: t.textSecond, fontSize: f.body }]}>{model.accumulated}</Text>
      <Text style={[styles.next, { color: t.textMuted, fontSize: f.sub }]}>{model.nextStep}</Text>
    </View>
  );
}

export default memo(ProgressProofBlock);

const styles = StyleSheet.create({
  root: { alignItems: 'center', gap: 6 },
  fact: { fontWeight: '900', textAlign: 'center' },
  accumulated: { fontWeight: '800', textAlign: 'center' },
  next: { fontWeight: '600', textAlign: 'center', lineHeight: 21 },
});
