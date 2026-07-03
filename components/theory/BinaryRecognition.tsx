import React, { useState, useCallback, useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import TapScale from '../TapScale';
import { hapticSuccess, hapticError } from '../../hooks/use-haptics';
import { introText } from './theoryI18n';
import type { Lang } from '../../constants/i18n';
import type { IntroBinaryInteraction } from '../../app/lesson_data_types';
import type { TheoryDrillProgressState } from '../../app/theory_progress';

/**
 * «Финал-чек» — Binary Recognition. Выбор из двух фраз.
 * Лёгкий финал темы, реюзает готовые wrong+correct пары. Без таймера.
 * Не на каждом экране — макс 1 на 3-4 экрана теории.
 */
interface Props {
  data: IntroBinaryInteraction;
  lang: Lang;
  theme: { textPrimary: string; textMuted: string; correct: string; wrong: string };
  onSolved?: () => void;
  initialProgress?: TheoryDrillProgressState;
  onProgressChange?: (state: TheoryDrillProgressState) => void;
}

function readAnswered(progress: TheoryDrillProgressState | undefined): 'A' | 'B' | null {
  return progress?.answered === 'A' || progress?.answered === 'B' ? progress.answered : null;
}

export default function BinaryRecognition({ data, lang, theme, onSolved, initialProgress, onProgressChange }: Props) {
  const [answered, setAnswered] = useState<'A' | 'B' | null>(() => readAnswered(initialProgress));
  const correctKey = data.correct;

  useEffect(() => {
    setAnswered(readAnswered(initialProgress));
  }, [initialProgress]);

  const choose = useCallback(
    (key: 'A' | 'B') => {
      if (answered) return;
      setAnswered(key);
      onProgressChange?.({
        type: 'binary',
        status: key === correctKey ? 'solved' : 'answered',
        answered: key,
      });
      if (key === correctKey) {
        hapticSuccess();
        onSolved?.();
      } else {
        hapticError();
      }
    },
    [answered, correctKey, onProgressChange, onSolved],
  );

  const renderBtn = (key: 'A' | 'B', label: string) => {
    let bg = 'rgba(255,255,255,0.06)';
    let color = theme.textPrimary;
    let strike = false;
    if (answered) {
      if (key === correctKey) {
        bg = theme.correct;
        color = '#0F1115';
      } else if (key === answered) {
        bg = 'rgba(255,255,255,0.04)';
        color = theme.textMuted;
        strike = true;
      } else {
        color = theme.textMuted;
      }
    }
    return (
      <TapScale
        key={key}
        onPress={() => choose(key)}
        withHaptic={false}
        accessibilityRole="button"
        accessibilityLabel={label}
        style={[styles.btn, { backgroundColor: bg }]}
      >
        <Text style={[styles.btnText, { color, textDecorationLine: strike ? 'line-through' : 'none' }]}>
          {label}
        </Text>
      </TapScale>
    );
  };

  return (
    <View style={[styles.wrap, { borderColor: 'rgba(255,255,255,0.10)' }]}>
      <Text style={[styles.q, { color: theme.textMuted }]}>{introText(data.question, lang)}</Text>
      {renderBtn('A', data.optionA)}
      {renderBtn('B', data.optionB)}
      {answered && (
        <View
          style={[
            styles.fb,
            { backgroundColor: answered === correctKey ? `${theme.correct}22` : `${theme.wrong}1A` },
          ]}
        >
          <Text style={[styles.fbText, { color: answered === correctKey ? theme.correct : theme.wrong }]}>
            {introText(data.explain, lang)}
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { padding: 14, borderRadius: 14, borderWidth: 1, marginTop: 10 },
  q: { fontSize: 13.5, textAlign: 'center', marginBottom: 12 },
  btn: { paddingVertical: 14, borderRadius: 11, alignItems: 'center', marginBottom: 8, minHeight: 52, justifyContent: 'center' },
  btnText: { fontSize: 15, fontWeight: '600' },
  fb: { marginTop: 4, padding: 10, borderRadius: 10 },
  fbText: { fontSize: 13, lineHeight: 19, fontWeight: '500' },
});
