import { Ionicons } from '@expo/vector-icons';
import React, { useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import type { LevelExamSpeedMatchTask } from '../../app/level_exam_types';
import TapScale from '../TapScale';
import { useTheme } from '../ThemeContext';

type Props = {
  task: LevelExamSpeedMatchTask;
  matches: Readonly<Record<string, string>>;
  onChange: (matches: Record<string, string>) => void;
};

export default function SpeedMatchQuestion({ task, matches, onChange }: Props) {
  const { theme: t, f, ds } = useTheme();
  const [activeSourceId, setActiveSourceId] = useState<string | null>(null);
  const matchedTargets = useMemo(() => new Set(Object.values(matches)), [matches]);
  const sourcePairs = useMemo(() => (
    task.pairs.length > 1 ? [...task.pairs.slice(1), task.pairs[0]] : [...task.pairs]
  ), [task.pairs]);
  const chooseTarget = (targetId: string) => {
    if (!activeSourceId) return;
    const next = { ...matches };
    for (const [sourceId, matchedTarget] of Object.entries(next)) {
      if (matchedTarget === targetId) delete next[sourceId];
    }
    next[activeSourceId] = targetId;
    onChange(next);
    setActiveSourceId(null);
  };

  return (
    <View accessibilityLabel="Speed match" style={[styles.board, { gap: ds.spacing.md }]}> 
      <View style={[styles.column, { gap: ds.spacing.sm }]}> 
        {sourcePairs.map((pair) => {
          const active = activeSourceId === pair.scoreUnitId;
          const matched = Boolean(matches[pair.scoreUnitId]);
          return (
            <TapScale
              key={pair.scoreUnitId}
              onPress={() => setActiveSourceId(pair.scoreUnitId)}
              accessibilityLabel={pair.source}
              accessibilityHint="Select the phrase to match"
              accessibilityState={{ selected: active }}
              style={[styles.card, { backgroundColor: active || matched ? t.accentBg : t.bgSurface2, padding: ds.spacing.sm }]}
            >
              <Text style={{ color: active || matched ? t.accent : t.textPrimary, fontSize: f.body, fontFamily: ds.fontFamily, fontWeight: '700', textAlign: 'center' }}>
                {pair.source}
              </Text>
            </TapScale>
          );
        })}
      </View>
      <Ionicons name="swap-horizontal" size={22} color={t.textMuted} />
      <View style={[styles.column, { gap: ds.spacing.sm }]}> 
        {task.pairs.map((pair) => {
          const matched = matchedTargets.has(pair.scoreUnitId);
          return (
            <TapScale
              key={pair.scoreUnitId}
              onPress={() => chooseTarget(pair.scoreUnitId)}
              disabled={!activeSourceId}
              accessibilityLabel={pair.target}
              accessibilityHint="Match with the selected phrase"
              accessibilityState={{ disabled: !activeSourceId, selected: matched }}
              style={[styles.card, { backgroundColor: matched ? t.accentBg : t.bgSurface2, padding: ds.spacing.sm }]}
            >
              <Text style={{ color: matched ? t.accent : t.textPrimary, fontSize: f.body, fontFamily: ds.fontFamily, fontWeight: '700', textAlign: 'center' }}>
                {pair.target}
              </Text>
            </TapScale>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  board: { flexDirection: 'row', alignItems: 'center' },
  column: { flex: 1 },
  card: { minHeight: 64, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
});
