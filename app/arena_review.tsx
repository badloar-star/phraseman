import React, { useEffect, useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import Animated, { FadeIn, FadeInDown, FadeInRight } from 'react-native-reanimated';

import { useLang } from '../components/LangContext';
import { ArenaScreen } from '../components/arena/ArenaScreen';
import { V2Card, V2Cta } from '../components/tournament/tournament_v2_ui';
import { useTournamentPalette } from '../components/tournament/tournament_theme';
import { arenaText } from '../modules/arena/copy';
import {
  arenaReviewRows,
  arenaReviewSummary,
  type ArenaReviewRow,
} from '../modules/arena/review_view';
import { useRuntimeActive } from '../hooks/use_runtime_active';
import { useReduceMotion } from '../hooks/use_reduce_motion';
import { arenaLoadState } from '../modules/arena/load_state';
import { arenaFetchMatchReview } from './arena_client';

/**
 * Разбор матча.
 *
 * Владелец потребовал его обязательным. Экран результата говорит «победа» и
 * «столько-то звёзд», но не отвечает на то, ради чего игрок вообще пришёл
 * учиться: что спросили, что он ответил, что было верно и почему.
 *
 * Считает всё `modules/arena/review_view.ts` — экран только рисует.
 */
export default function ArenaReviewScreen() {
  const router = useRouter();
  const { lang } = useLang();
  const P = useTournamentPalette();
  const active = useRuntimeActive();
  const reduceMotion = useReduceMotion();
  const params = useLocalSearchParams<{ matchId?: string }>();
  const matchId = typeof params.matchId === 'string' ? params.matchId : '';
  const [raw, setRaw] = useState<readonly unknown[] | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!active || !matchId) return;
    void arenaFetchMatchReview(matchId)
      .then(setRaw)
      .catch(() => setFailed(true))
      .finally(() => setLoaded(true));
  }, [active, matchId]);

  const rows = useMemo(() => arenaReviewRows(raw ?? []), [raw]);
  const summary = useMemo(() => arenaReviewSummary(rows), [rows]);
  const state = arenaLoadState({ loaded, failed, count: rows.length });

  return (
    <ArenaScreen
      title={arenaText(lang, 'reviewTitle')}
      subtitle={rows.length ? `${summary.correct} / ${summary.total}` : undefined}
      variant="table"
      onBack={() => router.back()}
    >
      {state === 'failed' ? (
        <>
          <Text style={[styles.empty, { color: P.danger }]}>{arenaText(lang, 'loadFailed')}</Text>
          <Text style={[styles.emptyHint, { color: P.muted }]}>{arenaText(lang, 'loadFailedHint')}</Text>
        </>
      ) : state === 'loading' ? (
        <Text style={[styles.empty, { color: P.muted }]}>{arenaText(lang, 'loading')}</Text>
      ) : state === 'empty' ? (
        <Text style={[styles.empty, { color: P.muted }]}>{arenaText(lang, 'reviewEmpty')}</Text>
      ) : null}

      {rows.map((row, index) => (
        <ReviewCard key={row.taskId || row.taskIndex} row={row} index={index} reduceMotion={reduceMotion} />
      ))}

      {rows.length ? (
        <V2Cta tone="ghost" onPress={() => router.replace('/arena' as never)}>
          {arenaText(lang, 'home')}
        </V2Cta>
      ) : null}
    </ArenaScreen>
  );
}

function ReviewCard({ row, index, reduceMotion }: {
  row: ArenaReviewRow;
  index: number;
  reduceMotion: boolean;
}) {
  const { lang } = useLang();
  const P = useTournamentPalette();

  const tone = row.verdict === 'correct' ? P.accent
    : row.verdict === 'timeout' ? P.muted
    : row.verdict === 'partial' ? P.gold
    : P.danger;
  const icon = row.verdict === 'correct' ? 'checkmark-circle'
    : row.verdict === 'timeout' ? 'time'
    : row.verdict === 'partial' ? 'git-compare'
    : 'close-circle';

  return (
    <Animated.View
      entering={reduceMotion ? FadeIn.duration(120) : FadeInDown.delay(Math.min(index, 9) * 55).duration(280)}
    >
      <V2Card pad={14} style={styles.card}>
        <View style={styles.head}>
          <Ionicons name={icon} size={22} color={tone} />
          <Text style={[styles.prompt, { color: P.text }]}>{row.prompt}</Text>
          <Text style={[styles.index, { color: P.muted }]}>{row.taskIndex + 1}</Text>
        </View>

        {/* Что ответил игрок. Пусто — значит не ответил, и так и написано. */}
        <View style={styles.line}>
          <Text style={[styles.label, { color: P.muted }]}>{arenaText(lang, 'reviewYourAnswer')}</Text>
          <Text style={[styles.value, { color: row.verdict === 'correct' ? P.accent : P.text }]}>
            {row.givenText ?? arenaText(lang, row.verdict === 'timeout' ? 'reviewTimeout' : 'reviewNoAnswer')}
          </Text>
        </View>

        {/* Правильный ответ показывается только когда игрок его НЕ дал:
            повторять верный ответ рядом с верным — шум. */}
        {row.verdict !== 'correct' && row.correctText ? (
          <Animated.View
            entering={reduceMotion ? FadeIn.duration(120) : FadeInRight.delay(120).duration(240)}
            style={styles.line}
          >
            <Text style={[styles.label, { color: P.muted }]}>{arenaText(lang, 'reviewCorrect')}</Text>
            <Text style={[styles.value, { color: P.accent }]}>{row.correctText}</Text>
          </Animated.View>
        ) : null}

        {row.verdict === 'partial' ? (
          <Text style={[styles.note, { color: P.gold }]}>{arenaText(lang, 'reviewPartial')}</Text>
        ) : null}

        {/* Почему выбранный вариант неверен — только про него, не про все. */}
        {row.trapNote ? (
          <Text style={[styles.note, { color: P.danger }]}>{row.trapNote}</Text>
        ) : null}

        {row.ruleNote ? <Text style={[styles.note, { color: P.text }]}>{row.ruleNote}</Text> : null}
        {row.example ? <Text style={[styles.example, { color: P.muted }]}>{row.example}</Text> : null}
      </V2Card>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: { gap: 8 },
  head: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  prompt: { flex: 1, fontSize: 17, fontWeight: '900' },
  index: { fontSize: 13, fontWeight: '800', fontVariant: ['tabular-nums'] },
  line: { gap: 2 },
  label: { fontSize: 12, fontWeight: '700' },
  value: { fontSize: 15, fontWeight: '800' },
  note: { fontSize: 13, lineHeight: 19, fontWeight: '700' },
  example: { fontSize: 13, lineHeight: 19, fontWeight: '600', fontStyle: 'italic' },
  empty: { marginTop: 28, textAlign: 'center', fontSize: 15, fontWeight: '700' },
  emptyHint: { marginTop: 4, textAlign: 'center', fontSize: 13, fontWeight: '600' },
});
