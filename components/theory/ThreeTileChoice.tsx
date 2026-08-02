import React, { useState, useCallback, useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import TapScale from '../TapScale';
import { hapticSuccess, hapticError } from '../../hooks/use-haptics';
import { introText } from './theoryI18n';
import type { Lang } from '../../constants/i18n';
import type { IntroChoiceInteraction } from '../../app/lesson_data_types';
import type { ThemeMode } from '../../constants/theme';
import { monoIcon, MONO_ICON } from '../../constants/monoIcon';
import type { TheoryDrillProgressState } from '../../app/theory_progress';

/**
 * «Выбери форму» — 3-Tile Choice. Один пропуск, 2-3 кнопки.
 * recognition < recall — самая щадящая нагрузка для 40+/50+.
 * Фидбэк мгновенный, без модалок. «почему?» раскрывается по запросу.
 */
interface Props {
  data: IntroChoiceInteraction;
  lang: Lang;
  accent: string;
  theme: {
    textPrimary: string; textMuted: string; correct: string; wrong: string;
    /** Тональный чип-фон и текст на заливке — считает родитель (drillTheme). */
    chipBg: string; onAccentText: string;
  };
  themeMode?: ThemeMode;
  onSolved?: () => void;
  initialProgress?: TheoryDrillProgressState;
  onProgressChange?: (state: TheoryDrillProgressState) => void;
}

export default function ThreeTileChoice({
  data,
  lang,
  accent,
  theme,
  themeMode,
  onSolved,
  initialProgress,
  onProgressChange,
}: Props) {
  // В теме business тёмный текст на ярких плашках обесцвечиваем (см. monoIcon).
  const onBrightText = (color: string): string =>
    themeMode ? monoIcon(themeMode, color, MONO_ICON.onLight) : color;
  const [picked, setPicked] = useState<string | null>(() =>
    typeof initialProgress?.picked === 'string'
      ? initialProgress.picked
      : initialProgress?.status === 'solved'
        ? data.answer
        : null,
  );
  const [showWhy, setShowWhy] = useState(() => initialProgress?.showWhy === true);
  const isCorrect = picked === data.answer;

  useEffect(() => {
    setPicked(
      typeof initialProgress?.picked === 'string'
        ? initialProgress.picked
        : initialProgress?.status === 'solved'
          ? data.answer
          : null,
    );
    setShowWhy(initialProgress?.showWhy === true);
  }, [initialProgress, data.answer]);

  const persist = useCallback(
    (next: Partial<TheoryDrillProgressState>) => {
      onProgressChange?.({
        type: 'choice',
        status: next.status ?? (picked === data.answer ? 'solved' : 'idle'),
        picked: next.picked !== undefined ? next.picked : picked,
        showWhy: next.showWhy !== undefined ? next.showWhy : showWhy,
      });
    },
    [data.answer, onProgressChange, picked, showWhy],
  );

  const pick = useCallback(
    (opt: string) => {
      if (isCorrect) return;
      if (opt === data.answer) {
        setPicked(opt);
        hapticSuccess();
        onProgressChange?.({ type: 'choice', status: 'solved', picked: opt, showWhy });
        onSolved?.();
      } else {
        setPicked(opt);
        hapticError();
        setTimeout(() => setPicked((p) => (p === opt ? null : p)), 900);
      }
    },
    [data.answer, isCorrect, onProgressChange, onSolved, showWhy],
  );

  const why = introText(data.why, lang);

  return (
    <View style={[styles.wrap, { borderColor: `${accent}33` }]}>
      <Text style={[styles.hint, { color: theme.textMuted }]}>Попробуй выбрать форму</Text>

      <Text style={[styles.q, { color: theme.textPrimary }]}>
        {data.before}
        <Text
          style={[
            styles.gap,
            isCorrect
              ? { color: onBrightText(theme.onAccentText), backgroundColor: theme.correct }
              : picked
                ? { color: theme.wrong, borderColor: theme.wrong, borderWidth: 1 }
                : { color: theme.textMuted, borderColor: accent, borderWidth: 0},
          ]}
        >
          {' '}{picked ?? '___'}{' '}
        </Text>
        {data.after}
      </Text>

      <View style={styles.tiles}>
        {data.options.map((opt) => {
          const thisOk = isCorrect && opt === data.answer;
          const thisErr = !isCorrect && picked === opt;
          return (
            <TapScale
              key={opt}
              onPress={() => pick(opt)}
              withHaptic={false}
              accessibilityRole="button"
              accessibilityLabel={opt}
              style={[
                styles.tile,
                {
                  backgroundColor: thisOk
                    ? theme.correct
                    : thisErr
                      ? `${theme.wrong}33`
                      : theme.chipBg,
                },
              ]}
            >
              <Text style={[styles.tileText, { color: thisOk ? onBrightText(theme.onAccentText) : theme.textPrimary }]}>
                {opt}
              </Text>
            </TapScale>
          );
        })}
      </View>

      {!!why && (
        <TapScale
          onPress={() => {
            setShowWhy(true);
            persist({ showWhy: true });
          }}
          accessibilityRole="button"
          style={styles.whyBtn}
        >
          <Text style={[styles.why, { color: theme.textMuted }]}>
            {showWhy ? why : 'почему?'}
          </Text>
        </TapScale>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { padding: 14, borderRadius: 14, borderWidth: 0, marginTop: 10 },
  hint: { fontSize: 11, letterSpacing: 0.5, textTransform: 'uppercase', fontWeight: '600', marginBottom: 10, textAlign: 'center' },
  q: { fontSize: 17, lineHeight: 28, textAlign: 'center', marginBottom: 12 },
  gap: { borderRadius: 8, overflow: 'hidden', fontWeight: '600' },
  tiles: { flexDirection: 'row', gap: 8 },
  tile: { flex: 1, paddingVertical: 14, borderRadius: 10, alignItems: 'center', minHeight: 52, justifyContent: 'center' },
  tileText: { fontSize: 16, fontWeight: '600' },
  whyBtn: { alignSelf: 'center', marginTop: 10, paddingVertical: 4, paddingHorizontal: 8 },
  why: { fontSize: 12, textAlign: 'center' },
});
