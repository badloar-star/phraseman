import React, { useCallback, useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import Animated, { FadeIn, SlideInRight } from 'react-native-reanimated';
import { useLang } from '../components/LangContext';
import { ArenaQuestion } from '../components/arena/ArenaQuestion';
import { ArenaScreen } from '../components/arena/ArenaScreen';
import { ArenaDisclosureBadge, ArenaProgress, ArenaStateCard, ArenaStateNotice } from '../components/arena/ArenaExpansionUI';
import { V2Card, V2Cta, V2Segments } from '../components/ui/v2_ui';
import { useTournamentPalette, v2motion } from '../components/ui/v2_theme';
import { useReduceMotion } from '../hooks/use_reduce_motion';
import { useRuntimeActive } from '../hooks/use_runtime_active';
import { useVisibleWallClock } from '../hooks/use_visible_wall_clock';
import { arenaText } from '../modules/arena/copy';
import { arenaExpansionText } from '../modules/arena/expansion_copy';
import type { ArenaMatch, ArenaMatchReward } from '../modules/arena/contract';
import { getOrCreateArenaSubmissionId, pruneArenaSubmissionIds } from '../modules/arena/idempotency';
import { arenaActionEvent, arenaFeatureOpenEvent, arenaRunCompleteEvent } from '../modules/arena/telemetry';
import { trackArenaTelemetry } from './arena_telemetry';
import {
  arenaExpansionHome,
  arenaTodayStart,
  arenaTodaySubmitAnswer,
  arenaTodaySubmitSpeedAttempt,
  arenaTodaySync,
  createArenaRequestId,
} from './arena_client';
import { useArenaFontScale } from '../hooks/use_arena_font_scale';
import { useEnergy } from '../components/EnergyContext';
import NoEnergyModal from '../components/NoEnergyModal';
import EnergyCostBadge from '../components/EnergyCostBadge';

export default function ArenaTodayScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ runId?: string; runKind?: string }>();
  const { lang } = useLang();
  const P = useTournamentPalette();
  // Высота строки числом не растёт вместе с системным шрифтом — при
  // крупном кегле строки наезжали друг на друга. См. use_arena_font_scale.
  const bodyLine = { lineHeight: 21 * useArenaFontScale() };
  const active = useRuntimeActive();
  const now = useVisibleWallClock(active, 1_000);
  const reduceMotion = useReduceMotion();
  const ghostRun = params.runKind === 'ghost' && typeof params.runId === 'string';
  const screenTitle = arenaExpansionText(lang, ghostRun ? 'ghost' : 'todayTitle');
  const [status, setStatus] = useState<'loading' | 'ready' | 'unavailable' | 'expired' | 'complete' | 'error'>('loading');
  const [match, setMatch] = useState<ArenaMatch | null>(null);
  const [hardExpiresAtMs, setHardExpiresAtMs] = useState<number | null>(null);
  const [reward, setReward] = useState<ArenaMatchReward | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [verdict, setVerdict] = useState<'correct' | 'wrong' | null>(null);
  // Старт «Задания дня» = 1 ⚡ (владелец 2026-08-23: единая экономика — платим
  // за ПОПЫТКУ, ошибки внутри задания энергию больше не трогают).
  const { confirmSpendOne: confirmArenaTodayEnergy, refundOne: refundArenaTodayEnergy } = useEnergy();
  const [noEnergyOpen, setNoEnergyOpen] = useState(false);
  const ids = useRef(new Map<string, string>());
  const deadlineSyncs = useRef(new Set<string>());
  const startRequestId = useRef<string | null>(null);
  const hardExpirySync = useRef<string | null>(null);
  const openedAt = useRef(Date.now());
  const completionTracked = useRef(false);

  const applyMutation = useCallback((response: Awaited<ReturnType<typeof arenaTodaySync>>) => {
    setMatch(response.match);
    if (response.hardExpiresAtMs !== undefined) setHardExpiresAtMs(response.hardExpiresAtMs);
    if (response.viewerReward) setReward(response.viewerReward);
    if ((response.state === 'aborted' || response.match.state === 'aborted') && !(ghostRun && response.viewerReward)) setStatus('expired');
    else if (response.match.terminal || response.state === 'settled') setStatus('complete');
  }, [ghostRun]);

  const load = useCallback(() => {
    setStatus('loading');
    if (ghostRun && params.runId) {
      void arenaTodaySync(params.runId).then((response) => { applyMutation(response); if (!response.match.terminal) setStatus('ready'); }).catch(() => setStatus('error'));
      return;
    }
    void arenaExpansionHome().then(async (home) => {
      if (!home.availability.today || home.today.state === 'unavailable') { setStatus('unavailable'); return; }
      if (home.today.state === 'expired') { setStatus('expired'); return; }
      if (home.today.state === 'complete') { setStatus('complete'); setReward(home.today.starsEarned === undefined ? null : { starsEarned: home.today.starsEarned }); return; }
      if (home.today.sessionId) {
        const response = await arenaTodaySync(home.today.sessionId);
        applyMutation(response);
        if (!response.match.terminal) setStatus('ready');
        return;
      }
      setStatus('ready');
    }).catch(() => setStatus('error'));
  }, [applyMutation, ghostRun, params.runId]);

  useEffect(() => { if (active) load(); }, [active, load]);
  useEffect(() => { trackArenaTelemetry(arenaFeatureOpenEvent(ghostRun ? 'ghost' : 'today', ghostRun ? 'resume' : 'direct')); }, [ghostRun]);
  const completionCorrect = match?.players[0]?.correct ?? 0;
  const currentMatchId = match?.matchId ?? null;
  const currentTaskIndex = match?.currentTaskIndex ?? null;
  useEffect(() => {
    if ((status !== 'complete' && status !== 'expired') || completionTracked.current) return;
    completionTracked.current = true;
    trackArenaTelemetry(arenaRunCompleteEvent(ghostRun ? 'ghost' : 'today', ghostRun ? 'recording' : 'mixed', status === 'expired' ? 'expired' : 'complete', completionCorrect, Date.now() - openedAt.current));
  }, [completionCorrect, ghostRun, status]);
  useEffect(() => {
    if (currentMatchId === null || currentTaskIndex === null) return;
    pruneArenaSubmissionIds(ids.current, currentMatchId, currentTaskIndex);
    setSubmitting(false);
    setVerdict(null);
  }, [currentMatchId, currentTaskIndex]);
  useEffect(() => {
    if (!active || !match || match.terminal || now < match.stateDeadlineAtMs) return;
    const key = `${match.matchId}:${match.version}`;
    if (deadlineSyncs.current.has(key)) return;
    deadlineSyncs.current.add(key);
    void arenaTodaySync(match.matchId, match.version).then(applyMutation).catch(() => { deadlineSyncs.current.delete(key); setStatus('error'); });
  }, [active, applyMutation, match, now]);
  useEffect(() => {
    if (!active || !match || !hardExpiresAtMs || now < hardExpiresAtMs || status === 'complete') return;
    const key = `${match.matchId}:${match.version}:hard`;
    if (hardExpirySync.current === key) return;
    hardExpirySync.current = key;
    void arenaTodaySync(match.matchId, match.version).then(applyMutation)
      .catch(() => { hardExpirySync.current = null; setStatus('error'); });
  }, [active, applyMutation, hardExpiresAtMs, match, now, status]);

  // зачем: до 2026-08-24 второй тап отбивала модалка подтверждения траты
  // (пока окно висело, повторный запрос возвращался отказом). Окно убрано по
  // требованию владельца, и защита обязана жить здесь. setSubmitting не годится:
  // это состояние React, оно не видно второму тапу в том же кадре и вдобавок
  // ставится только ПОСЛЕ await. Латч — синхронный ref, снимается на каждой
  // ветке выхода, иначе кнопка залипнет навсегда.
  const startChargeInFlightRef = useRef(false);

  const start = async () => {
    if (submitting || startChargeInFlightRef.current) return;
    startChargeInFlightRef.current = true;
    try {
      const energyResult = await confirmArenaTodayEnergy();
      if (energyResult === 'cancelled') return;
      if (energyResult === 'insufficient') { setNoEnergyOpen(true); return; }
      beginArenaTodayMatch(energyResult === 'spent');
    } finally {
      startChargeInFlightRef.current = false;
    }
  };

  const beginArenaTodayMatch = (energyCharged: boolean) => {
    setSubmitting(true);
    trackArenaTelemetry(arenaActionEvent('today', 'start', 'mixed'));
    const requestId = startRequestId.current ?? createArenaRequestId('today');
    startRequestId.current = requestId;
    void arenaTodayStart(requestId).then((response) => {
      startRequestId.current = null;
      setMatch(response.match);
      setHardExpiresAtMs(response.hardExpiresAtMs);
      setStatus(response.match.terminal ? 'complete' : 'ready');
    }).catch(() => {
      // зачем: задание не стартовало (нет сети / отказ сервера) — входа не
      // случилось, плата возвращается.
      if (energyCharged) void refundArenaTodayEnergy();
      setStatus('error');
    }).finally(() => setSubmitting(false));
  };
  const submit = (answer: unknown) => {
    if (!match || submitting || match.state !== 'task_active') return;
    setSubmitting(true);
    const submissionId = getOrCreateArenaSubmissionId(ids.current, match.matchId, match.currentTaskIndex, 'answer', () => createArenaRequestId('today_answer'));
    void arenaTodaySubmitAnswer({ matchId: match.matchId, taskIndex: match.currentTaskIndex, submissionId, answer })
      .then((response) => { setVerdict(response.correct ? 'correct' : 'wrong'); applyMutation(response); })
      .catch(() => setSubmitting(false));
  };
  const speedAttempt = (pairIndex: number, selectedIndex: number) => {
    if (!match || submitting || match.state !== 'task_active') return Promise.resolve(false);
    setSubmitting(true);
    const submissionId = getOrCreateArenaSubmissionId(ids.current, match.matchId, match.currentTaskIndex, `${pairIndex}:${selectedIndex}`, () => createArenaRequestId('today_pair'));
    return arenaTodaySubmitSpeedAttempt({ matchId: match.matchId, taskIndex: match.currentTaskIndex, submissionId, pairIndex, selectedIndex })
      .then((response) => { setVerdict(response.correct ? 'correct' : 'wrong'); applyMutation(response); setSubmitting(false); return Boolean(response.correct); })
      .catch(() => { setSubmitting(false); return false; });
  };

  // Загрузка не показывается: пустой экран доли секунды честнее слова,
  // которое игрок и так видит по отсутствию содержимого.
  if (status === 'loading') return <ArenaScreen title={screenTitle}>{ghostRun ? <ArenaDisclosureBadge text={arenaExpansionText(lang, 'ghostDisclosure')} /> : null}</ArenaScreen>;
  if (status === 'unavailable' || status === 'expired' || status === 'error') {
    /**
     * Три разные причины — три разных объяснения, и все они выбираются одной
     * общей развилкой. Раньше все три показывали «Сейчас недоступно», и
     * неудачная загрузка выглядела как выключенный раздел: игрок уходил там,
     * где достаточно было повторить.
     */
    return (
      <ArenaScreen title={screenTitle}>
        {ghostRun ? <ArenaDisclosureBadge text={arenaExpansionText(lang, 'ghostDisclosure')} /> : null}
        <ArenaStateNotice
          state={status}
          ghost={ghostRun}
          onRetry={load}
          onBack={() => router.replace('/arena' as never)}
        />
      </ArenaScreen>
    );
  }

  if (status === 'complete') return (
    <ArenaScreen title={screenTitle}>
      {ghostRun ? <><ArenaDisclosureBadge text={arenaExpansionText(lang, 'ghostDisclosure')} /><ArenaDisclosureBadge text={arenaExpansionText(lang, 'noEconomy')} /></> : null}
      <ArenaStateCard state="ready" title={ghostRun ? arenaText(lang, reward?.outcome === 'win' ? 'victory' : reward?.outcome === 'loss' ? 'defeat' : 'draw') : arenaExpansionText(lang, 'todayComplete')} body={ghostRun ? arenaExpansionText(lang, 'score').replace('{you}', String(reward?.guestScore ?? 0)).replace('{them}', String(reward?.hostScore ?? 0)) : arenaExpansionText(lang, 'starsEarned').replace('{amount}', String(reward?.starsEarned ?? 0))} actionLabel={arenaExpansionText(lang, 'continueAction')} onAction={() => router.replace('/arena' as never)} />
      {/* зачем убраны обе кнопки (владелец, 2026-08-16): «Записать дуэль»
          вела на /arena_ghost_duel, «Разбор» — на /arena_match_lab. Оба
          экрана удалены вместе с остальным расширением. Точка входа
          params.runKind === 'ghost' ниже по файлу больше не достижима
          (источник самих призрачных дуэлей удалён), поэтому ghostRun == false
          всегда — ветка оставлена мёртвой, а не вычищена построчно, чтобы не
          трогать соседний рабочий поток обычных заданий без сборки под рукой. */}
    </ArenaScreen>
  );
  if (!match) return (
    <ArenaScreen title={screenTitle} subtitle={arenaExpansionText(lang, 'todayBody')}>
      <V2Card style={styles.startCard}><ArenaProgress value={0} max={10} label={arenaExpansionText(lang, 'todayTitle')} /><Text style={[styles.body, bodyLine, { color: P.muted }]}>{arenaExpansionText(lang, 'todayBody')}</Text>
        <View style={styles.ctaWrap}>
          <V2Cta disabled={submitting} onPress={start}>{arenaExpansionText(lang, 'todayStart')}</V2Cta>
          {/* Цена входа видна до нажатия (владелец 2026-08-23). */}
          <EnergyCostBadge testID="arena-today-energy-cost" />
        </View>
      </V2Card>
      <NoEnergyModal visible={noEnergyOpen} onClose={() => setNoEnergyOpen(false)} />
    </ArenaScreen>
  );

  const seconds = Math.max(0, Math.ceil((match.stateDeadlineAtMs - now) / 1_000));
  return (
    <ArenaScreen title={screenTitle} subtitle={`${match.currentTaskIndex + 1} / 10`} variant="play" scroll={false}>
      {ghostRun ? <ArenaDisclosureBadge text={arenaExpansionText(lang, 'recordingBadge')} /> : null}
      <V2Segments total={10} done={Math.max(0, match.currentTaskIndex)} />
      {match.currentPublicTask ? (
        <Animated.View key={match.currentPublicTask.taskId} entering={reduceMotion ? FadeIn.duration(120) : SlideInRight.duration(v2motion.taskSwapMs)} style={styles.question}>
          <Text accessibilityLiveRegion="polite" style={[styles.timer, { color: seconds <= 3 ? P.danger : P.text }]}>{seconds}</Text>
          <ArenaQuestion task={match.currentPublicTask} locked={submitting || match.state !== 'task_active'} verdict={verdict} submitLabel={arenaText(lang, 'submit')} onSubmit={submit} onSpeedAttempt={speedAttempt} />
          {submitting && !verdict ? <Text style={[styles.server, { color: P.muted }]}>{arenaText(lang, 'serverCheck')}</Text> : null}
        </Animated.View>
      ) : <View style={styles.center} />}
    </ArenaScreen>
  );
}

const styles = StyleSheet.create({
  startCard: { gap: 16 },
  // Обёртка — якорь для углового бейджа «−1 ⚡».
  ctaWrap: { position: 'relative' },
  body: { fontSize: 15, fontWeight: '700', textAlign: 'center' },
  question: { flex: 1, justifyContent: 'center', gap: 8 },
  center: { flex: 1, justifyContent: 'center' },
  timer: { fontSize: 22, fontWeight: '900', textAlign: 'center', fontVariant: ['tabular-nums'] },
  server: { fontSize: 13, fontWeight: '700', textAlign: 'center' },
});
