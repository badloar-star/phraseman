import React, { useEffect, useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { V2Card, V2Chip, V2Cta, type ChipVerdict } from '../tournament/tournament_v2_ui';
import { useTournamentPalette } from '../tournament/tournament_theme';
import { adaptArenaTask, encodeArenaSelection } from '../../modules/arena/task_adapter';
import type { ArenaPublicTask } from '../../modules/arena/contract';

type Props = Readonly<{
  task: ArenaPublicTask;
  locked: boolean;
  verdict?: 'correct' | 'wrong' | null;
  submitLabel: string;
  onSubmit: (answer: unknown) => void;
  onSpeedAttempt: (pairIndex: number, selectedIndex: number) => Promise<boolean>;
  onMatchingComplete?: () => void;
}>;

export function ArenaQuestion({ task, locked, verdict, submitLabel, onSubmit, onSpeedAttempt, onMatchingComplete }: Props) {
  const P = useTournamentPalette();
  const view = useMemo(() => adaptArenaTask(task), [task]);
  const [choice, setChoice] = useState<number | null>(null);
  const [tokens, setTokens] = useState<number[]>([]);
  const [left, setLeft] = useState<number | null>(null);
  const [matchedLeft, setMatchedLeft] = useState<Set<number>>(() => new Set());
  const [matchedRight, setMatchedRight] = useState<Set<number>>(() => new Set());

  useEffect(() => {
    setChoice(null);
    setTokens([]);
    setLeft(null);
    setMatchedLeft(new Set());
    setMatchedRight(new Set());
  }, [task.taskId]);

  if (view.type === 'matching') {
    return (
      <V2Card style={styles.card}>
        <Text style={[styles.prompt, { color: P.text }]}>{view.prompt}</Text>
        <View style={styles.matchGrid}>
          <View style={styles.column}>
            {view.left.map((item, index) => (
              <V2Chip key={`${item}-${index}`} selected={left === index} disabled={locked || matchedLeft.has(index)} onPress={() => setLeft(index)}>
                {matchedLeft.has(index) ? <View style={styles.matched}><Ionicons name="checkmark-circle" size={18} color={P.accent} /><Text style={{ color: P.text }}>{item}</Text></View> : item}
              </V2Chip>
            ))}
          </View>
          <View style={styles.column}>
            {view.right.map((item, index) => (
              <V2Chip
                key={`${item}-${index}`}
                disabled={locked || left === null || matchedRight.has(index)}
                onPress={() => {
                  if (left === null) return;
                  const pairIndex = left;
                  setLeft(null);
                  void onSpeedAttempt(pairIndex, index).then((correct) => {
                    if (!correct) return;
                    setMatchedLeft((old) => {
                      const next = new Set(old).add(pairIndex);
                      if (next.size === view.left.length) onMatchingComplete?.();
                      return next;
                    });
                    setMatchedRight((old) => new Set(old).add(index));
                  });
                }}
              >{matchedRight.has(index) ? <View style={styles.matched}><Ionicons name="checkmark-circle" size={18} color={P.accent} /><Text style={{ color: P.text }}>{item}</Text></View> : item}</V2Chip>
            ))}
          </View>
        </View>
      </V2Card>
    );
  }

  const selected = view.type === 'choices' ? choice !== null : tokens.length > 0;
  return (
    <V2Card style={styles.card}>
      <Text style={[styles.prompt, { color: P.text }]}>{view.prompt}</Text>
      {view.type === 'choices' ? (
        <View style={styles.options}>
          {view.options.map((option, index) => {
            const chipVerdict: ChipVerdict = choice !== index || !verdict ? 'idle' : verdict === 'correct' ? 'ok' : 'bad';
            return (
              <V2Chip
                key={`${option}-${index}`}
                block
                selected={choice === index}
                verdict={chipVerdict}
                disabled={locked}
                accessibilityLabel={option}
                onPress={() => setChoice(index)}
              >{option}</V2Chip>
            );
          })}
        </View>
      ) : (
        <>
          <View style={[styles.answerTray, { backgroundColor: P.elev }]}>
            {tokens.map((index) => <V2Chip key={`${index}-${tokens.indexOf(index)}`} onPress={() => !locked && setTokens((old) => old.filter((_, i) => i !== old.indexOf(index)))}>{view.tokens[index]}</V2Chip>)}
          </View>
          <View style={styles.tokenCloud}>
            {view.tokens.map((token, index) => (
              <V2Chip key={`${token}-${index}`} disabled={locked || tokens.includes(index)} onPress={() => setTokens((old) => [...old, index])}>{token}</V2Chip>
            ))}
          </View>
        </>
      )}
      <V2Cta
        disabled={!selected || locked}
        onPress={() => onSubmit(encodeArenaSelection(view, view.type === 'choices' ? choice : tokens))}
      >{submitLabel}</V2Cta>
    </V2Card>
  );
}

const styles = StyleSheet.create({
  card: { gap: 16 },
  prompt: { fontSize: 22, lineHeight: 29, fontWeight: '900', textAlign: 'center' },
  options: { gap: 10 },
  answerTray: { minHeight: 68, borderRadius: 18, flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 7, padding: 10 },
  tokenCloud: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, justifyContent: 'center' },
  matchGrid: { flexDirection: 'row', gap: 10 },
  column: { flex: 1, gap: 8 },
  matched: { flexDirection: 'row', alignItems: 'center', gap: 5 },
});
