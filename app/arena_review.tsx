import React, { useEffect, useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import Animated, { FadeIn, FadeInDown, FadeInRight } from 'react-native-reanimated';

import { useLang } from '../components/LangContext';
import { ArenaScreen } from '../components/arena/ArenaScreen';
import { V2Card, V2Cta } from '../components/ui/v2_ui';
import { useTournamentPalette } from '../components/ui/v2_theme';
import { arenaText } from '../modules/arena/copy';
import ReportErrorButton from '../components/ReportErrorButton';
import { triLang } from '../constants/i18n';
import {
  arenaReviewRows,
  arenaReviewSummary,
  type ArenaReviewRow,
} from '../modules/arena/review_view';
import { useRuntimeActive } from '../hooks/use_runtime_active';
import { useReduceMotion } from '../hooks/use_reduce_motion';
import { arenaCachedLoadView, arenaLoadState } from '../modules/arena/load_state';
import { useArenaFontScale } from '../hooks/use_arena_font_scale';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  arenaAwaitScopedReview,
  arenaLoadScopedReview,
  arenaPeekScopedReview,
  arenaRememberScopedReview,
  type ArenaReviewAccountScope,
} from '../modules/arena/review_retry';
import type { ArenaKeyValueStore } from '../modules/arena/match_store';
import { arenaFetchMatchReview } from './arena_client';
import { safeRouterBack } from './navigation_back';
import { getStableId } from './stable_id';
import {
  captureAccountGeneration,
  isCurrentAccountGeneration,
  subscribeAccountGeneration,
} from './account_generation';

/**
 * Разбор матча.
 *
 * Владелец потребовал его обязательным. Экран результата говорит «победа» и
 * «столько-то звёзд», но не отвечает на то, ради чего игрок вообще пришёл
 * учиться: что спросили, что он ответил, что было верно и почему.
 *
 * Считает всё `modules/arena/review_view.ts` — экран только рисует.
 */
const warmStore = AsyncStorage as unknown as ArenaKeyValueStore;

export default function ArenaReviewScreen() {
  const router = useRouter();
  const { lang } = useLang();
  const P = useTournamentPalette();
  const active = useRuntimeActive();
  const reduceMotion = useReduceMotion();
  const params = useLocalSearchParams<{ matchId?: string }>();
  const matchId = typeof params.matchId === 'string' ? params.matchId : '';
  const [account, setAccount] = useState(() => captureAccountGeneration());
  const reviewScope = useMemo<ArenaReviewAccountScope | null>(() => (
    account.phase === 'active' && account.stableId
      ? { stableUid: account.stableId, accountGeneration: account.generation }
      : null
  ), [account.generation, account.phase, account.stableId]);
  const warmRows = useMemo(
    () => reviewScope ? arenaPeekScopedReview(reviewScope, matchId, Date.now()) : null,
    [matchId, reviewScope],
  );
  const [raw, setRaw] = useState<readonly unknown[] | null>(warmRows);
  const [loaded, setLoaded] = useState(warmRows !== null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const subscription = subscribeAccountGeneration(setAccount);
    return () => subscription.remove();
  }, []);

  useEffect(() => {
    if (account.phase !== 'uninitialized') return;
    void getStableId()
      .then(() => setAccount(captureAccountGeneration()))
      .catch(() => setLoaded(true));
  }, [account.phase]);

  // A new identity/generation or match must never inherit the previous
  // screen's rows, loaded bit, or failure bit while its own reads are pending.
  useEffect(() => {
    setRaw(warmRows);
    setLoaded(warmRows !== null);
    setFailed(false);
  }, [account.generation, matchId, reviewScope?.stableUid, warmRows]);

  useEffect(() => {
    if (!active || !matchId || !reviewScope) return;
    let alive = true;
    const requestAccount = account;
    const isCurrent = (scope: ArenaReviewAccountScope) => (
      isCurrentAccountGeneration(requestAccount, scope.stableUid)
    );
    void arenaAwaitScopedReview({
      scope: reviewScope,
      request: () => arenaFetchMatchReview(reviewScope, matchId),
      isCurrent,
      isAlive: () => alive,
      accept: (rows) => {
        setRaw(rows);
        setFailed(false);
        arenaRememberScopedReview({ scope: reviewScope, matchId, rows, wallNowMs: Date.now(), store: warmStore });
      },
    }).catch(() => {
      if (alive && isCurrent(reviewScope)) setFailed(true);
    }).finally(() => {
      if (alive && isCurrent(reviewScope)) setLoaded(true);
    });
    void arenaAwaitScopedReview({
      scope: reviewScope,
      request: () => arenaLoadScopedReview(warmStore, reviewScope, matchId, Date.now()),
      isCurrent,
      isAlive: () => alive,
      accept: (rows) => setRaw((current) => current ?? rows),
    }).catch(() => {});
    return () => { alive = false; };
  }, [account, active, matchId, reviewScope]);

  const rows = useMemo(() => arenaReviewRows(raw ?? []), [raw]);
  const summary = useMemo(() => arenaReviewSummary(rows), [rows]);
  const state = arenaLoadState({ loaded, failed, count: rows.length });
  // Разбор привязан к одному матчу и не меняется: снимок для него — не
  // «устаревшие данные», а ровно те же. Поэтому при неудачном обновлении
  // показывается разбор, а не ошибка поверх него.
  const view = arenaCachedLoadView({ state, cachedCount: rows.length, volatile: false });

  return (
    <ArenaScreen
      title={arenaText(lang, 'reviewTitle')}
      subtitle={rows.length ? `${summary.correct} / ${summary.total}` : undefined}
      variant="table"
      onBack={() => safeRouterBack(router, '/arena' as never)}
    >
      {view === 'error' ? (
        <>
          <Text style={[styles.empty, { color: P.danger }]}>{arenaText(lang, 'loadFailed')}</Text>
          <Text style={[styles.emptyHint, { color: P.muted }]}>{arenaText(lang, 'loadFailedHint')}</Text>
        </>
      ) : view === 'silent' ? (
        // Слово «Загрузка» владелец видеть запретил: либо снимок, либо ничего.
        <View />
      ) : view === 'empty' ? (
        <>
          <Text style={[styles.empty, { color: P.muted }]}>{arenaText(lang, 'reviewEmpty')}</Text>
          {/* Без этой строки пустой разбор читается как «ты ничего не отвечал»:
              на самом деле он пишется, когда матч закрыт. */}
          <Text style={[styles.emptyHint, { color: P.muted }]}>{arenaText(lang, 'reviewEmptyHint')}</Text>
        </>
      ) : null}

      {rows.map((row, index) => (
        <ReviewCard key={row.taskId || row.taskIndex} row={row} index={index} reduceMotion={reduceMotion} />
      ))}

      {/* Дорога назад есть всегда: пустой разбор без кнопки был тупиком с
          одной системной стрелкой. */}
      {rows.length || view === 'empty' || view === 'error' ? (
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
  // Высота строки числом не растёт вместе с системным шрифтом — при
  // крупном кегле строки наезжали друг на друга. См. use_arena_font_scale.
  const noteLine = { lineHeight: 19 * useArenaFontScale() };
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
          {/* зачем: разбор — единственное место, где задание боя видно
              спокойно, без таймера. Если задание оказалось неверным, именно
              здесь человек это понимает — и здесь же должен мочь сказать. */}
          <ReportErrorButton
            screen="arena_review"
            dataId={`arena_task_${row.taskId || row.taskIndex}`}
            dataText={row.prompt}
            variant="icon-flag"
            accessibilityLabel={triLang(lang, { ru: 'Сообщить об ошибке в задании', uk: 'Повідомити про помилку в завданні', es: 'Informar de un error en el ejercicio', 'pt-BR': 'Relatar erro no exercício', vi: 'Báo lỗi trong bài tập', id: 'Laporkan kesalahan pada latihan', tr: 'Alıştırmadaki hatayı bildir', pl: 'Zgłoś błąd w zadaniu' })}
            testID="arena-review-report"
          />
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
          <Text style={[styles.note, noteLine, { color: P.gold }]}>{arenaText(lang, 'reviewPartial')}</Text>
        ) : null}

        {/* Почему выбранный вариант неверен — только про него, не про все. */}
        {row.trapNote ? (
          <Text style={[styles.note, noteLine, { color: P.danger }]}>{row.trapNote}</Text>
        ) : null}

        {row.ruleNote ? <Text style={[styles.note, noteLine, { color: P.text }]}>{row.ruleNote}</Text> : null}
        {row.example ? <Text style={[styles.example, noteLine, { color: P.muted }]}>{row.example}</Text> : null}
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
  note: { fontSize: 13, fontWeight: '700' },
  example: { fontSize: 13, fontWeight: '600', fontStyle: 'italic' },
  empty: { marginTop: 28, textAlign: 'center', fontSize: 15, fontWeight: '700' },
  emptyHint: { marginTop: 4, textAlign: 'center', fontSize: 13, fontWeight: '600' },
});
