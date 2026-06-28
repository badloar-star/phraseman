import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import TapScale from '../TapScale';
import { hapticSuccess, hapticError } from '../../hooks/use-haptics';
import { introText } from './theoryI18n';
import type { Lang } from '../../constants/i18n';
import type { IntroSpotInteraction } from '../../app/lesson_data_types';

/**
 * «Найди промах» — Spot-the-Slip. Тапни лишнее/неверное слово в чипах.
 * Превращает пассивный показ wrong/correct в активный noticing.
 * Включать со 2-го захода в тему (первый проход — спокойное чтение).
 */
interface Props {
  data: IntroSpotInteraction;
  lang: Lang;
  theme: { textPrimary: string; textMuted: string; correct: string; wrong: string };
  onSolved?: () => void;
}

export default function SpotTheSlip({ data, lang, theme, onSolved }: Props) {
  const [solved, setSolved] = useState(false);
  const [wrongTap, setWrongTap] = useState<number | null>(null);

  const tap = useCallback(
    (idx: number) => {
      if (solved) return;
      if (idx === data.answerIndex) {
        setSolved(true);
        hapticSuccess();
        onSolved?.();
      } else {
        setWrongTap(idx);
        hapticError();
        setTimeout(() => setWrongTap((w) => (w === idx ? null : w)), 600);
      }
    },
    [solved, data.answerIndex, onSolved],
  );

  return (
    <View style={[styles.wrap, { borderColor: `${theme.wrong}33` }]}>
      <Text style={[styles.hint, { color: theme.textMuted }]}>{introText(data.hint, lang)}</Text>

      <View style={styles.row}>
        {data.chips.map((chip, i) => {
          const gone = solved && i === data.answerIndex;
          const isWrongTap = wrongTap === i;
          return (
            <TapScale
              key={`${chip}-${i}`}
              onPress={() => tap(i)}
              withHaptic={false}
              accessibilityRole="button"
              accessibilityLabel={chip}
              style={[
                styles.chip,
                {
                  backgroundColor: gone
                    ? `${theme.wrong}1A`
                    : isWrongTap
                      ? `${theme.wrong}1A`
                      : 'rgba(255,255,255,0.06)',
                },
              ]}
            >
              <Text
                style={[
                  styles.chipText,
                  {
                    color: gone ? theme.wrong : theme.textPrimary,
                    textDecorationLine: gone ? 'line-through' : 'none',
                  },
                ]}
              >
                {chip}
              </Text>
            </TapScale>
          );
        })}
      </View>

      {solved && (
        <View style={[styles.fb, { backgroundColor: `${theme.correct}22` }]}>
          <Text style={[styles.fbText, { color: theme.correct }]}>{introText(data.fix, lang)}</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { padding: 14, borderRadius: 14, borderWidth: 1, marginTop: 10 },
  hint: { fontSize: 12.5, marginBottom: 10, textAlign: 'center' },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, justifyContent: 'center' },
  chip: { paddingHorizontal: 13, paddingVertical: 10, borderRadius: 9, minHeight: 44, justifyContent: 'center' },
  chipText: { fontSize: 16, fontWeight: '600' },
  fb: { marginTop: 10, padding: 10, borderRadius: 10 },
  fbText: { fontSize: 13, lineHeight: 19, fontWeight: '500' },
});
