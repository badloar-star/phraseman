import React, { useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { FadeInDown, useReducedMotion } from 'react-native-reanimated';

import type { LevelExamSpeedMatchTask } from '../../app/level_exam_types';
import { useTheme } from '../ThemeContext';
import { V2Chip } from '../tournament/tournament_v2_ui';

type Props = {
  task: LevelExamSpeedMatchTask;
  matches: Readonly<Record<string, string>>;
  onChange: (matches: Record<string, string>) => void;
};

export default function SpeedMatchQuestion({ task, matches, onChange }: Props) {
  const { ds } = useTheme();
  const reduceMotion = useReducedMotion();
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
            <Animated.View key={pair.scoreUnitId} entering={reduceMotion ? undefined : FadeInDown.delay(sourcePairs.indexOf(pair) * 40).duration(260)}>
              <V2Chip selected={active || matched} onPress={() => setActiveSourceId(pair.scoreUnitId)} accessibilityLabel={pair.target}>
                {pair.target}
              </V2Chip>
            </Animated.View>
          );
        })}
      </View>
      <View style={[styles.column, { gap: ds.spacing.sm }]}> 
        {task.pairs.map((pair, index) => {
          const matched = matchedTargets.has(pair.scoreUnitId);
          return (
            <Animated.View key={pair.scoreUnitId} entering={reduceMotion ? undefined : FadeInDown.delay(index * 40).duration(260)}>
              <V2Chip selected={matched} onPress={() => chooseTarget(pair.scoreUnitId)} disabled={!activeSourceId} accessibilityLabel={pair.source}>
                {pair.source}
              </V2Chip>
            </Animated.View>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  board: { flexDirection: 'row', alignItems: 'stretch' },
  column: { flex: 1 },
});
