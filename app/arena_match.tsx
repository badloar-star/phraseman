import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Alert, BackHandler, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useLang } from '../components/LangContext';
import { ArenaScreen } from '../components/arena/ArenaScreen';
import { ArenaPlayers } from '../components/arena/ArenaPlayers';
import { ArenaQuestion } from '../components/arena/ArenaQuestion';
import { V2Card, V2Cta, V2Segments } from '../components/tournament/tournament_v2_ui';
import { useTournamentPalette, v2motion } from '../components/tournament/tournament_theme';
import { arenaText } from '../modules/arena/copy';
import { ARENA_QUESTION_COUNT, type ArenaPlayer } from '../modules/arena/contract';
import { arenaClockPhase } from '../modules/arena/schedule';
import { getOrCreateArenaSubmissionId, pruneArenaSubmissionIds } from '../modules/arena/idempotency';
import { useRuntimeActive } from '../hooks/use_runtime_active';
import { useVisibleWallClock } from '../hooks/use_visible_wall_clock';
import { useReduceMotion } from '../hooks/use_reduce_motion';
import Animated, { FadeIn, FadeInDown, SlideInRight, ZoomIn } from 'react-native-reanimated';
import { arenaCosmeticDefinition } from '../modules/arena/arena_cosmetics';
import {
  arenaV2Forfeit,
  arenaExpansionHome,
  arenaV2MatchAccept,
  arenaV2MatchDecline,
  arenaV2SubmitAnswer,
  arenaV2SubmitSpeedAttempt,
  arenaV2SyncMatch,
  createArenaRequestId,
  peekArenaViewerSeat,
  rememberArenaViewerSeat,
  useArenaMatch,
} from './arena_client';

export default function ArenaMatchScreen() {
  const router = useRouter();
  const { lang } = useLang();
  const P = useTournamentPalette();
  const params = useLocalSearchParams<{ matchId?: string; viewerSeat?: string }>();
  const matchId = typeof params.matchId === 'string' ? params.matchId : null;
  const active = useRuntimeActive();
  const reduceMotion = useReduceMotion();
  const live = useArenaMatch(matchId, active);
  const now = useVisibleWallClock(active, 1_000);
  const routeSeat = params.viewerSeat === 'a' || params.viewerSeat === 'b' ? params.viewerSeat : null;
  const [viewerSeat, setViewerSeat] = useState<'a' | 'b' | null>(() => routeSeat ?? peekArenaViewerSeat(matchId));
  const [submitting, setSubmitting] = useState(false);
  const [verdict, setVerdict] = useState<'correct' | 'wrong' | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [entryCosmetic, setEntryCosmetic] = useState<string | undefined>();
  const entryTreatment = arenaCosmeticDefinition(entryCosmetic)?.treatment;
  const ids = useRef(new Map<string, string>());
  const matchVersionRef = useRef<number | undefined>(undefined);
  const deadlineSyncAttemptsRef = useRef(new Set<string>());
  const match = live.value;
  const phase = useMemo(() => match ? arenaClockPhase(match, now) : { kind: 'waiting' as const }, [match, now]);

  const forfeitNow = useCallback(() => {
    if (!matchId) return;
    void arenaV2Forfeit(matchId).finally(() => router.replace('/arena' as never));
  }, [matchId, router]);

  const confirmForfeit = useCallback(() => {
    Alert.alert(arenaText(lang, 'leaveTitle'), arenaText(lang, 'leaveBody'), [
      { text: arenaText(lang, 'stay'), style: 'cancel' },
      { text: arenaText(lang, 'leaveConfirm'), style: 'destructive', onPress: forfeitNow },
    ]);
  }, [forfeitNow, lang]);

  useEffect(() => {
    if (!active || match?.terminal) return undefined;
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      confirmForfeit();
      return true;
    });
    return () => subscription.remove();
  }, [active, confirmForfeit, match?.terminal]);

  useEffect(() => { matchVersionRef.current = match?.version; }, [match?.version]);
  useEffect(() => { if (active) void arenaExpansionHome().then((home) => setEntryCosmetic(home.wallet.equippedBySlot.entry)).catch(() => {}); }, [active]);

  useEffect(() => {
    if (!active) {
      deadlineSyncAttemptsRef.current.clear();
      return;
    }
    if (matchId) void arenaV2SyncMatch(matchId, matchVersionRef.current)
      .then((response) => { if (response.viewerSeat) { rememberArenaViewerSeat(matchId, response.viewerSeat); setViewerSeat(response.viewerSeat); } })
      .catch(() => {});
  }, [active, matchId]);

  useEffect(() => {
    if (!active || !matchId || !match || match.terminal || now < match.stateDeadlineAtMs) return;
    const key = `${matchId}:${match.version}`;
    if (deadlineSyncAttemptsRef.current.has(key)) return;
    deadlineSyncAttemptsRef.current.add(key);
    void arenaV2SyncMatch(matchId, match.version).catch(() => setError('sync_failed'));
  }, [active, match, matchId, now]);

  useEffect(() => {
    if (!match) return;
    pruneArenaSubmissionIds(ids.current, match.matchId, match.currentTaskIndex);
    setVerdict(null);
    setSubmitting(false);
    if (match.terminal || match.state === 'settled' || match.state === 'aborted') {
      router.replace({ pathname: '/arena_results', params: { matchId: match.matchId } } as never);
    }
  }, [match?.currentTaskIndex, match?.matchId, match?.state, match?.terminal, router]);

  const players: readonly ArenaPlayer[] = useMemo(() => {
    if (!match) return [];
    return match.players.map((player) => ({
      ...player,
      name: player.uid === viewerSeat ? arenaText(lang, 'you') : player.isBot ? arenaText(lang, 'bot') : player.name,
    }));
  }, [lang, match, viewerSeat]);

  const submit = (answer: unknown) => {
    if (!matchId || !match || submitting || match.state !== 'task_active') return;
    setSubmitting(true);
    setError(null);
    const submissionId = getOrCreateArenaSubmissionId(ids.current, matchId, match.currentTaskIndex, 'answer', () => createArenaRequestId('answer'));
    void arenaV2SubmitAnswer({ matchId, taskIndex: match.currentTaskIndex, submissionId, answer })
      .then((response) => { if (response.viewerSeat) setViewerSeat(response.viewerSeat); setVerdict(response.correct ? 'correct' : 'wrong'); })
      .catch((reason) => { setError(String(reason)); setSubmitting(false); });
  };

  const speedAttempt = (pairIndex: number, selectedIndex: number) => {
    if (!matchId || !match || submitting || match.state !== 'task_active') return Promise.resolve(false);
    const attempt = `${pairIndex}:${selectedIndex}`;
    const submissionId = getOrCreateArenaSubmissionId(ids.current, matchId, match.currentTaskIndex, attempt, () => createArenaRequestId('pair'));
    setSubmitting(true);
    return arenaV2SubmitSpeedAttempt({ matchId, taskIndex: match.currentTaskIndex, submissionId, pairIndex, selectedIndex })
      .then((response) => {
        if (response.viewerSeat) setViewerSeat(response.viewerSeat);
        setVerdict(response.correct ? 'correct' : 'wrong');
        setSubmitting(false);
        return response.correct;
      })
      .catch((reason) => {
        setError(String(reason));
        setSubmitting(false);
        return false;
      });
  };

  if (!match) {
    return <ArenaScreen title={arenaText(lang, 'title')} variant="play" scroll={false}><View style={styles.center}><Text style={{ color: P.text }}>{live.error ? arenaText(lang, 'retry') : arenaText(lang, 'loading')}</Text></View></ArenaScreen>;
  }

  const seconds = Math.max(0, Math.ceil(('remainingMs' in phase ? phase.remainingMs : 0) / 1_000));
  return (
    <ArenaScreen title={arenaText(lang, 'title')} subtitle={`${match.currentTaskIndex + 1} / ${ARENA_QUESTION_COUNT}`} variant="play" scroll={false} onBack={confirmForfeit}>
      <ArenaPlayers players={players} active={active} botLabel={arenaText(lang, 'bot')} />
      <V2Segments total={ARENA_QUESTION_COUNT} done={Math.max(0, match.currentTaskIndex)} />
      {match.state === 'accepting' ? (
        <Animated.View entering={reduceMotion ? FadeIn.duration(120) : entryTreatment === 'entry_trail' ? SlideInRight.duration(260) : entryTreatment === 'entry_burst' ? ZoomIn.duration(240) : entryTreatment === 'entry_crown' ? FadeInDown.duration(300) : FadeInDown.duration(240)} style={styles.center}>
          <V2Card style={styles.acceptCard}>
            <Text style={[styles.big, { color: P.text }]}>{arenaText(lang, 'opponent')}</Text>
            <Text style={[styles.hint, { color: P.muted }]}>{arenaText(lang, 'waiting')}</Text>
            <V2Cta onPress={() => void arenaV2MatchAccept(match.matchId).then((response) => { if (response.viewerSeat) setViewerSeat(response.viewerSeat); }).catch((reason) => setError(String(reason)))}>{arenaText(lang, 'accept')}</V2Cta>
            <V2Cta tone="ghost" onPress={() => void arenaV2MatchDecline(match.matchId).finally(() => router.replace('/arena' as never))}>{arenaText(lang, 'decline')}</V2Cta>
          </V2Card>
        </Animated.View>
      ) : phase.kind === 'countdown' ? (
        <View style={styles.center}><Text accessibilityLiveRegion="polite" style={[styles.countdown, { color: P.text }]}>{seconds || 1}</Text></View>
      ) : match.currentPublicTask && (phase.kind === 'question' || phase.kind === 'reveal') ? (
        <Animated.View key={match.currentPublicTask.taskId} entering={reduceMotion ? FadeIn.duration(120) : SlideInRight.duration(v2motion.taskSwapMs)} style={styles.question}>
          <View style={styles.timerRow}><Text style={[styles.timer, { color: seconds <= 3 ? P.danger : P.text }]}>{seconds}</Text></View>
          <ArenaQuestion
            task={match.currentPublicTask}
            locked={submitting || phase.kind !== 'question' || Boolean(viewerSeat && match.submittedBy.includes(viewerSeat))}
            verdict={verdict}
            submitLabel={arenaText(lang, 'submit')}
            onSubmit={submit}
            onSpeedAttempt={speedAttempt}
          />
          {submitting && !verdict ? <Text accessibilityLiveRegion="polite" style={[styles.server, { color: P.muted }]}>{arenaText(lang, 'serverCheck')}</Text> : null}
          {verdict ? <Text accessibilityLiveRegion="polite" style={[styles.verdict, { color: verdict === 'correct' ? P.accent : P.danger }]}>{arenaText(lang, verdict === 'correct' ? 'correct' : 'wrong')}</Text> : null}
          {error ? <Text style={[styles.server, { color: P.danger }]}>{arenaText(lang, 'retry')}</Text> : null}
        </Animated.View>
      ) : <View style={styles.center}><Text style={[styles.hint, { color: P.muted }]}>{arenaText(lang, 'waiting')}</Text></View>}
    </ArenaScreen>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: 'center' },
  question: { flex: 1, justifyContent: 'center', gap: 8 },
  acceptCard: { gap: 14 },
  big: { fontSize: 24, fontWeight: '900', textAlign: 'center' },
  hint: { fontSize: 15, lineHeight: 21, fontWeight: '600', textAlign: 'center' },
  countdown: { fontSize: 90, fontWeight: '900', textAlign: 'center', fontVariant: ['tabular-nums'] },
  timerRow: { alignItems: 'center' },
  timer: { fontSize: 22, fontWeight: '900', fontVariant: ['tabular-nums'] },
  server: { fontSize: 13, fontWeight: '700', textAlign: 'center' },
  verdict: { fontSize: 18, fontWeight: '900', textAlign: 'center' },
});
