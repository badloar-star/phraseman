import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { FlatList, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { useLang } from '../components/LangContext';
import { ArenaQuestion } from '../components/arena/ArenaQuestion';
import { ArenaScreen } from '../components/arena/ArenaScreen';
import { ArenaDisclosureBadge, ArenaProgress, ArenaStateCard } from '../components/arena/ArenaExpansionUI';
import { V2Card, V2Cta } from '../components/tournament/tournament_v2_ui';
import { useTournamentPalette } from '../components/tournament/tournament_theme';
import { useRuntimeActive } from '../hooks/use_runtime_active';
import { arenaText } from '../modules/arena/copy';
import { arenaExpansionText } from '../modules/arena/expansion_copy';
import type { ArenaMatchLabPlan } from '../modules/arena/expansion_contract';
import { arenaModeCopyKey, evaluateArenaLabRecovery, evaluateArenaLabSpeedAttempt, visibleArenaRecoveryItems } from '../modules/arena/expansion_model';
import { isArenaTaskMode } from '../modules/arena/contract';
import { arenaFeatureOpenEvent } from '../modules/arena/telemetry';
import { arenaExpansionHome, arenaMatchLabGet } from './arena_client';
import { trackArenaTelemetry } from './arena_telemetry';

export default function ArenaMatchLabScreen() {
  const { lang } = useLang();
  const P = useTournamentPalette();
  const active = useRuntimeActive();
  const params = useLocalSearchParams<{ sourceRunId?: string; matchId?: string; mode?: string }>();
  const [state, setState] = useState<'loading' | 'ready' | 'empty' | 'unavailable' | 'error'>('loading');
  const [plan, setPlan] = useState<ArenaMatchLabPlan | null>(null);
  const [recoveryIndex, setRecoveryIndex] = useState(0);
  const [recoveryVerdict, setRecoveryVerdict] = useState<'correct' | 'wrong' | null>(null);
  const [matchedPairs, setMatchedPairs] = useState<readonly number[]>([]);
  const mode = isArenaTaskMode(params.mode) ? params.mode : undefined;
  useEffect(() => { trackArenaTelemetry(arenaFeatureOpenEvent('lab', params.matchId || params.sourceRunId ? 'result' : 'direct')); }, [params.matchId, params.sourceRunId]);

  const load = useCallback(() => {
    setState('loading');
    void Promise.all([
      arenaExpansionHome(),
      arenaMatchLabGet({ sourceRunId: params.sourceRunId, matchId: params.matchId, mode }),
    ]).then(([home, response]) => {
      if (!home.availability.lab) { setState('unavailable'); return; }
      setPlan(response.plan);
      setState(response.plan.review || response.plan.modes.some((item) => item.available) ? 'ready' : 'empty');
    }).catch(() => setState('error'));
  }, [mode, params.matchId, params.sourceRunId]);
  useEffect(() => { if (active) load(); }, [active, load]);

  const questions = plan?.review?.questions ?? [];
  const recovery = useMemo(() => visibleArenaRecoveryItems(plan?.review?.recoveryTasks ?? []), [plan?.review?.recoveryTasks]);
  const recoveryItem = recovery[recoveryIndex];
  const turningPointKey = plan?.review?.turningPoint?.code === 'slow_correct' ? 'turnSlowCorrect'
    : plan?.review?.turningPoint?.code === 'fast_wrong' ? 'turnFastWrong'
      : plan?.review?.turningPoint?.code === 'missed_streak' ? 'turnMissedStreak' : 'turnComeback';

  if (state !== 'ready' || !plan) return (
    <ArenaScreen title={arenaExpansionText(lang, 'lab')} scroll={false}>
      <View style={styles.center}><ArenaStateCard state={state} title={arenaExpansionText(lang, state === 'error' ? 'unavailable' : state)} actionLabel={state === 'error' ? arenaExpansionText(lang, 'retry') : undefined} onAction={state === 'error' ? load : undefined} /></View>
    </ArenaScreen>
  );

  return (
    <ArenaScreen title={arenaExpansionText(lang, 'lab')} subtitle={arenaExpansionText(lang, 'labBody')} scroll={false}>
      <FlatList
        data={questions}
        keyExtractor={(item) => `${item.taskIndex}`}
        contentContainerStyle={styles.list}
        ListHeaderComponent={(
          <View style={styles.block}>
            <ArenaDisclosureBadge text={arenaExpansionText(lang, 'noEconomy')} />
            {plan.review?.turningPoint ? <V2Card style={styles.card}><Text style={[styles.eyebrow, { color: P.gold }]}>{arenaExpansionText(lang, 'turningPoint')} · {plan.review.turningPoint.taskIndex + 1}</Text><Text style={[styles.title, { color: P.text }]}>{arenaExpansionText(lang, turningPointKey)}</Text></V2Card> : null}
            <Text style={[styles.heading, { color: P.text }]}>{arenaExpansionText(lang, 'review')}</Text>
          </View>
        )}
        renderItem={({ item }) => (
          <V2Card style={styles.reviewRow}>
            <View style={styles.row}><Text style={[styles.title, { color: P.text }]}>{item.taskIndex + 1}. {arenaExpansionText(lang, arenaModeCopyKey(item.mode))}</Text><Text style={[styles.verdict, { color: item.verdict === 'correct' ? P.accent : item.verdict === 'incorrect' ? P.danger : P.muted }]}>{arenaText(lang, item.verdict === 'correct' ? 'correct' : item.verdict === 'incorrect' ? 'wrong' : 'waiting')}</Text></View>
            {item.elapsedMs !== undefined ? <Text style={[styles.meta, { color: P.muted }]}>{(item.elapsedMs / 1_000).toFixed(1)} s</Text> : null}
            {item.explanation ? <Text style={[styles.body, { color: P.muted }]}>{item.explanation}</Text> : null}
          </V2Card>
        )}
        ListEmptyComponent={<ArenaStateCard state="empty" title={arenaExpansionText(lang, 'empty')} />}
        ListFooterComponent={recoveryItem ? (
          <View style={styles.block}>
            <Text style={[styles.heading, { color: P.text }]}>{arenaExpansionText(lang, 'recovery')}</Text>
            <ArenaProgress value={recoveryIndex} max={recovery.length} label={arenaExpansionText(lang, 'recovery')} />
            <ArenaQuestion
              key={recoveryItem.publicTask.taskId}
              task={recoveryItem.publicTask}
              locked={recoveryVerdict !== null}
              verdict={recoveryVerdict}
              submitLabel={arenaText(lang, 'submit')}
              onSubmit={(answer) => setRecoveryVerdict(evaluateArenaLabRecovery(recoveryItem.correctAnswer, answer) ? 'correct' : 'wrong')}
              onSpeedAttempt={(pairIndex, selectedIndex) => {
                const correct = evaluateArenaLabSpeedAttempt(recoveryItem.correctAnswer, pairIndex, selectedIndex);
                if (correct) {
                  const next = matchedPairs.includes(pairIndex) ? matchedPairs : [...matchedPairs, pairIndex];
                  setMatchedPairs(next);
                }
                return Promise.resolve(correct);
              }}
              onMatchingComplete={() => setRecoveryVerdict('correct')}
            />
            {recoveryVerdict ? <V2Cta onPress={() => { setRecoveryVerdict(null); setMatchedPairs([]); setRecoveryIndex((old) => Math.min(recovery.length, old + 1)); }}>{arenaExpansionText(lang, 'continueAction')}</V2Cta> : null}
          </View>
        ) : recovery.length ? <ArenaStateCard state="ready" title={arenaExpansionText(lang, 'todayComplete')} /> : null}
      />
    </ArenaScreen>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: 'center' },
  list: { gap: 10, paddingBottom: 24 },
  block: { gap: 12 },
  card: { gap: 6 },
  reviewRow: { gap: 5 },
  row: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  eyebrow: { fontSize: 12, fontWeight: '900', textTransform: 'uppercase' },
  heading: { fontSize: 20, lineHeight: 26, fontWeight: '900', marginTop: 4 },
  title: { flex: 1, fontSize: 16, lineHeight: 22, fontWeight: '900' },
  verdict: { fontSize: 12, fontWeight: '900' },
  meta: { fontSize: 12, fontWeight: '800', fontVariant: ['tabular-nums'] },
  body: { fontSize: 14, lineHeight: 20, fontWeight: '600' },
});
