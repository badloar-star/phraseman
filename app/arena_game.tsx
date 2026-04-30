import React, { useEffect, useRef, useState, useMemo } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, Animated, Pressable, ActivityIndicator,
} from 'react-native';
import Reanimated, {
  cancelAnimation,
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../components/ThemeContext';
import { useLang } from '../components/LangContext';
import ScreenGradient from '../components/ScreenGradient';
import { useArenaSession } from '../hooks/use-arena-session';
import { useDuelMock } from '../hooks/use-arena-mock';
import { useArenaRank } from '../hooks/use-arena-rank';
import { getLevelFromXP } from '../constants/theme';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SCORE_CONFIG, QUESTIONS_PER_MATCH } from './types/arena';
import { hapticMediumImpact, hapticSuccess, hapticTap } from '../hooks/use-haptics';
import { IS_EXPO_GO } from './config';
import { emitAppEvent } from './events';
import { logEvent } from './firebase';
import { recordMistakeFromArena } from './active_recall';
import {
  arenaBilingualFirst,
  arenaGameStr,
  arenaSecondsSuffix,
  arenaScoreboardYou,
  arenaXpFirst,
  arenaXpOutspeed,
  arenaXpSpeed,
  arenaXpStreak,
  arenaToasts,
} from '../constants/arena_i18n';

export default function DuelGameScreen() {
  const { sessionId, userId: paramUserId, fromLobby } = useLocalSearchParams<{
    sessionId: string; userId: string; fromLobby?: string;
  }>();
  const fromLobbyFlow = fromLobby === '1';
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { theme: t, f } = useTheme();
  const { lang } = useLang();

  const userId = paramUserId ?? '';

  const [acceptTimeTick, setAcceptTimeTick] = useState(0);
  const premeetScale = useSharedValue(1);
  const premeetTextStyle = useAnimatedStyle(() => ({
    transform: [{ scale: premeetScale.value }],
  }));

  const useMock = IS_EXPO_GO || sessionId?.startsWith('bot_');

  // Для бота: сложность и аватар выбираются из ранга/уровня игрока. Загружаем
  // из тех же источников, что и остальной UI арены (arena_profiles + totalXP).
  const myRank = useArenaRank();
  const [playerLevel, setPlayerLevel] = useState<number>(1);
  useEffect(() => {
    if (!useMock) return;
    let cancelled = false;
    (async () => {
      const raw = await AsyncStorage.getItem('user_total_xp').catch(() => null);
      const xp = raw ? Number(raw) || 0 : 0;
      if (!cancelled) setPlayerLevel(getLevelFromXP(xp));
    })();
    return () => { cancelled = true; };
  }, [useMock]);

  const realSession = useArenaSession(useMock ? '' : sessionId, useMock ? '' : userId);
  const mockSession = useDuelMock(userId, myRank.rankIndex, playerLevel);

  const session = useMock ? mockSession : realSession;
  const {
    phase, countdown, questionTimeLeft, currentQuestion,
    currentQuestionIndex, totalQuestions,
    players, hasAnswered,
    myAnswer, opponentForfeited,
    submitLobbyChoice, acceptDeadlineAt, myLobbyChoice, abortReason,
  } = session;

  const acceptSecLeft = useMemo(() => {
    if (typeof acceptDeadlineAt !== 'number' || phase !== 'acceptance') return null;
    return Math.max(0, Math.ceil((acceptDeadlineAt - Date.now()) / 1000));
  // eslint-disable-next-line react-hooks/exhaustive-deps -- acceptTimeTick: тик таймера
  }, [acceptDeadlineAt, phase, acceptTimeTick]);

  useEffect(() => {
    if (phase !== 'acceptance') return;
    const id = setInterval(() => setAcceptTimeTick((n) => n + 1), 500);
    return () => clearInterval(id);
  }, [phase]);

  useEffect(() => {
    if (phase !== 'premeet') {
      cancelAnimation(premeetScale);
      premeetScale.value = 1;
      return;
    }
    premeetScale.value = withRepeat(
      withSequence(
        withTiming(1.08, { duration: 700, easing: Easing.inOut(Easing.ease) }),
        withTiming(1, { duration: 700, easing: Easing.inOut(Easing.ease) }),
      ),
      -1,
      false
    );
    return () => {
      cancelAnimation(premeetScale);
    };
  }, [phase, premeetScale]);

  useEffect(() => {
    if (phase !== 'aborted') return;
    const r = abortReason;
    const isDecline = r === 'decline';
    emitAppEvent('action_toast', {
      type: 'info',
      ...(isDecline ? arenaToasts.matchAbortedDecline : arenaToasts.matchAbortedTimeout),
    });
    const t = setTimeout(() => {
      router.replace({ pathname: '/(tabs)/arena' as any });
    }, 450);
    return () => clearTimeout(t);
  }, [phase, router, abortReason]);


  /** Доля оставшегося времени 1→0; Reanimated + linear на UI-потоке — без рывков от лишних перезапусков. */
  const barProgress = useSharedValue(1);
  const qStartedForAnimRef = useRef<number | null>(null);
  /** Если старт вопроса пришёл с сервера после первого кадра (был null) — один раз подхватываем время. */
  const needsServerTimeResyncRef = useRef<string | null>(null);
  const timerBarStyle = useAnimatedStyle(() => ({
    width: `${barProgress.value * 100}%`,
  }));
  const [showExitConfirm, setShowExitConfirm] = useState(false);
  const prevPhase = useRef(phase);
  const revealStartedAtRef = useRef<number | null>(null);

  // XP попап после ответа
  const [xpPopup, setXpPopup] = useState<{
    base: number; speed: number; streak: number; first: number; outspeed: number; elapsedSec: number;
  } | null>(null);
  const xpPopupY = useRef(new Animated.Value(0)).current;
  const xpPopupOpacity = useRef(new Animated.Value(0)).current;

  // Трекинг бонусов внутри матча
  const correctStreakRef = useRef(0);
  const firstCorrectDone = useRef(false);
  const myCorrectRef = useRef(0);
  const myTotalRef = useRef(0);
  const myBonusBreakdown = useRef({ speed: 0, streak: 0, first: 0, outspeed: 0 });
  const reviewDataRef = useRef<{ question: string; options: string[]; correct: string; myAnswer: string | null; rule: string }[]>([]);

  const qid = currentQuestion?.id;
  const qTimeout = session.questionTimeoutMs;
  qStartedForAnimRef.current = session.questionStartedAt ?? null;

  /**
   * Запускаем полоску только на смене вопроса (index + id), а не на каждом флапе questionStartedAt
   * из Firestore — иначе stopAnimation+setValue дают видимые «прыжки».
   */
  useEffect(() => {
    if (phase !== 'question' || !qid) return;
    const key = `${currentQuestionIndex}-${qid}`;
    const timeoutMs = qTimeout;
    const started = qStartedForAnimRef.current;
    let durationMs = timeoutMs;
    if (started != null) {
      needsServerTimeResyncRef.current = null;
      const elapsed = Date.now() - started;
      durationMs = Math.max(200, timeoutMs - elapsed);
    } else {
      needsServerTimeResyncRef.current = key;
    }
    const startFraction = Math.min(1, Math.max(0, durationMs / timeoutMs));
    cancelAnimation(barProgress);
    barProgress.value = startFraction;
    barProgress.value = withTiming(0, {
      duration: durationMs,
      easing: Easing.linear,
    });
    return () => {
      cancelAnimation(barProgress);
    };
  }, [phase, currentQuestionIndex, qid, qTimeout, barProgress]);

  /** Один resync, когда сначала questionStartedAt был null, затем пришёл с сервера (тот же вопрос). */
  useEffect(() => {
    if (phase !== 'question' || !qid) return;
    const key = `${currentQuestionIndex}-${qid}`;
    if (needsServerTimeResyncRef.current !== key) return;
    const st = session.questionStartedAt;
    if (st == null) return;
    needsServerTimeResyncRef.current = null;
    const timeoutMs = qTimeout;
    const elapsed = Date.now() - st;
    const durationMs = Math.max(200, timeoutMs - elapsed);
    const startFraction = Math.min(1, Math.max(0, durationMs / timeoutMs));
    cancelAnimation(barProgress);
    barProgress.value = startFraction;
    barProgress.value = withTiming(0, {
      duration: durationMs,
      easing: Easing.linear,
    });
  }, [session.questionStartedAt, phase, currentQuestionIndex, qid, qTimeout, barProgress]);

  useEffect(() => {
    if (phase === 'finished') {
      const params: Record<string, string> = {
        sessionId, userId,
        opponentForfeited: opponentForfeited ? '1' : '0',
      };
      // For bot/mock sessions pass scores directly — no Firestore docs exist
      if (useMock) {
        const me = players.find(p => p.playerId === userId);
        const opp = players.find(p => p.playerId !== userId);
        params.mockMyScore   = String(me?.score  ?? 0);
        params.mockOppScore  = String(opp?.score ?? 0);
        params.mockOppName   = opp?.displayName ?? 'Opponent';
        params.mockMyCorrect = String(myCorrectRef.current);
        params.mockMyTotal   = String(myTotalRef.current);
        params.mockBonusSpeed   = String(myBonusBreakdown.current.speed);
        params.mockBonusStreak  = String(myBonusBreakdown.current.streak);
        params.mockBonusFirst   = String(myBonusBreakdown.current.first);
        params.mockBonusOutspeed = String(myBonusBreakdown.current.outspeed);
        params.mockReviewData = JSON.stringify(reviewDataRef.current);
      }
      router.replace({ pathname: '/arena_results', params });
    }
  }, [opponentForfeited, phase, players, router, sessionId, useMock, userId]);

  useEffect(() => {
    // Measure reveal -> next question latency for real matches
    if (phase === 'reveal') {
      revealStartedAtRef.current = Date.now();
    } else if (phase === 'question' && prevPhase.current === 'reveal' && revealStartedAtRef.current) {
      const transitionMs = Date.now() - revealStartedAtRef.current;
      logEvent('arena_reveal_to_next_ms', {
        ms: transitionMs,
        q_idx: currentQuestionIndex + 1,
      });
      revealStartedAtRef.current = null;
    }
  }, [phase, currentQuestionIndex]);

  const handleAnswer = async (option: string) => {
    if (hasAnswered || !currentQuestion) return;
    await hapticMediumImpact();
    const isCorrect = option === currentQuestion.correct;
    const to = session.questionTimeoutMs ?? 40_000;
    const st = session.questionStartedAt;
    const elapsed = st != null
      ? Math.min(to, Math.max(0, Date.now() - st))
      : Math.max(0, to - questionTimeLeft);

    myTotalRef.current += 1;
    if (isCorrect) {
      correctStreakRef.current += 1;
      myCorrectRef.current += 1;
    } else {
      correctStreakRef.current = 0;
      void recordMistakeFromArena(currentQuestion);
    }

    const speedBonus = isCorrect && elapsed < SCORE_CONFIG.speedBonusThresholdMs
      ? Math.round(SCORE_CONFIG.speedBonusMax * (1 - elapsed / SCORE_CONFIG.speedBonusThresholdMs))
      : 0;
    // Бонусы streak/first/outspeed одинаково применяются и к мок-сессии, и к реальной —
    // серверная функция (functions/src/arena_scoring.ts) считает их аналогично, так что UI совпадает.
    const streakBonus = isCorrect && correctStreakRef.current > 0 && correctStreakRef.current % SCORE_CONFIG.streakThreshold === 0
      ? SCORE_CONFIG.streakBonus : 0;
    const firstBonus = isCorrect && !firstCorrectDone.current
      ? (firstCorrectDone.current = true, SCORE_CONFIG.firstAnswerBonus) : 0;
    const outspeedBonus = isCorrect && elapsed < SCORE_CONFIG.outspeedThresholdMs
      ? SCORE_CONFIG.outspeedBonus : 0;

    myBonusBreakdown.current = {
      speed: myBonusBreakdown.current.speed + speedBonus,
      streak: myBonusBreakdown.current.streak + streakBonus,
      first: myBonusBreakdown.current.first + firstBonus,
      outspeed: myBonusBreakdown.current.outspeed + outspeedBonus,
    };

    reviewDataRef.current.push({
      question: currentQuestion.question,
      options: currentQuestion.options,
      correct: currentQuestion.correct,
      myAnswer: option,
      rule: currentQuestion.rule ?? '',
    });

    if (isCorrect) {
      xpPopupY.setValue(0);
      xpPopupOpacity.setValue(1);
      setXpPopup({ base: SCORE_CONFIG.correctBase, speed: speedBonus, streak: streakBonus, first: firstBonus, outspeed: outspeedBonus, elapsedSec: Math.round(elapsed / 100) / 10 });
      Animated.parallel([
        Animated.timing(xpPopupY, { toValue: -80, duration: 1100, useNativeDriver: true }),
        Animated.sequence([
          Animated.delay(600),
          Animated.timing(xpPopupOpacity, { toValue: 0, duration: 500, useNativeDriver: true }),
        ]),
      ]).start(() => setXpPopup(null));
    }
    logEvent('arena_answer_submitted', {
      is_correct: isCorrect ? 1 : 0,
      elapsed_ms: elapsed,
      q_idx: currentQuestionIndex + 1,
      is_mock: useMock ? 1 : 0,
    });
    const bonusTotal = speedBonus + streakBonus + firstBonus + outspeedBonus;
    if (useMock) {
      (session as typeof mockSession).submitAnswer(option, bonusTotal);
    } else {
      try {
        await (session as typeof realSession).submitMyAnswer(option);
      } catch {
        emitAppEvent('action_toast', { type: 'error', ...arenaToasts.answerNotSent });
      }
    }
  };

  const confirmForfeit = async () => {
    // For real P2P sessions write forfeit to Firestore so opponent gets notified
    if (!useMock && sessionId) {
      try {
        const firestoreModule = await import('@react-native-firebase/firestore');
        const db = firestoreModule.default();
        await db.collection('arena_sessions').doc(sessionId).update({
          state: 'finished',
          forfeitedBy: userId,
        });
      } catch {
        emitAppEvent('action_toast', { type: 'error', ...arenaToasts.matchFinishFail });
      }
    }
    router.replace({
      pathname: '/arena_results',
      params: { sessionId, userId, forfeited: '1' },
    });
  };

  useEffect(() => {
    if (prevPhase.current !== 'question' && phase === 'question') {
      logEvent('arena_question_shown', {
        q_idx: currentQuestionIndex + 1,
        total_q: totalQuestions || 0,
        is_mock: useMock ? 1 : 0,
      });
    }
    prevPhase.current = phase;
  }, [currentQuestionIndex, phase, totalQuestions, useMock]);

  if (phase === 'loading') {
    return (
      <ScreenGradient>
        <View style={styles.centered}>
          <Text style={[styles.countdownHint, { color: t.textMuted, fontSize: f.body }]}>
            {arenaGameStr(lang, 'loadingQuestions')}
          </Text>
        </View>
      </ScreenGradient>
    );
  }

  if (phase === 'aborted') {
    return (
      <ScreenGradient>
        <View style={styles.centered}>
          <Text style={[styles.countdownHint, { color: t.textMuted, fontSize: f.body }]}>
            {arenaGameStr(lang, 'abortedUi')}
          </Text>
        </View>
      </ScreenGradient>
    );
  }

  if (phase === 'acceptance' && !useMock) {
    const lobbyDone = myLobbyChoice === 'accept' || myLobbyChoice === 'decline';

    if (fromLobbyFlow && myLobbyChoice === 'accept') {
      return (
        <ScreenGradient>
          <SafeAreaView style={{ flex: 1 }} edges={['top', 'bottom']}>
            <View style={styles.arenaAcceptRoot}>
              <Text style={[{ color: t.textSecond, fontSize: f.h2, fontWeight: '800', textAlign: 'center' }]}>
                {arenaGameStr(lang, 'waitOpponent')}
              </Text>
              {acceptSecLeft != null && (
                <View style={styles.deadlinePill}>
                  <Text style={{ color: t.textMuted, fontSize: f.caption }}>
                    {arenaGameStr(lang, 'timeLeft')}
                    <Text style={{ color: t.accent, fontWeight: '900' }}> {acceptSecLeft} </Text>
                    {arenaSecondsSuffix(lang)}
                  </Text>
                </View>
              )}
            </View>
          </SafeAreaView>
        </ScreenGradient>
      );
    }

    if (fromLobbyFlow && !lobbyDone) {
      return (
        <ScreenGradient>
          <SafeAreaView style={{ flex: 1 }} edges={['top', 'bottom']}>
            <View style={styles.arenaAcceptRoot}>
              <ActivityIndicator size="large" color={t.accent} />
              <Text style={[{ color: t.textMuted, fontSize: f.body, marginTop: 16, textAlign: 'center' }]}>
                {arenaGameStr(lang, 'connecting')}
              </Text>
            </View>
          </SafeAreaView>
        </ScreenGradient>
      );
    }

    if (!fromLobbyFlow && !lobbyDone) {
      return (
        <ScreenGradient>
          <SafeAreaView style={{ flex: 1 }} edges={['top', 'bottom']}>
            <View style={styles.arenaAcceptRoot}>
              <Text style={[{ color: t.accent, fontWeight: '900', fontSize: 16, letterSpacing: 1.2, marginBottom: 8 }]}>
                {arenaGameStr(lang, 'gameFound')}
              </Text>
              <View style={styles.acceptBtnRow}>
                <TouchableOpacity
                  activeOpacity={0.9}
                  onPress={async () => {
                    hapticTap();
                    try { await submitLobbyChoice('decline'); } catch { /* */ }
                  }}
                  style={[styles.chipDecline, { borderColor: t.border }]}
                >
                  <Text style={{ color: t.textSecond, fontWeight: '800', fontSize: f.sub }}>
                    {arenaGameStr(lang, 'decline')}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  activeOpacity={0.9}
                  onPress={async () => {
                    hapticSuccess();
                    try {
                      await submitLobbyChoice('accept');
                    } catch {
                      emitAppEvent('action_toast', {
                        type: 'error',
                        ...arenaToasts.lobbyChoiceSendFail,
                      });
                    }
                  }}
                  style={[styles.chipAccept, { backgroundColor: t.accent }]}
                >
                  <Ionicons name="checkmark-circle" size={22} color="#fff" />
                  <Text style={{ color: '#fff', fontWeight: '900', fontSize: f.body }}>
                    {arenaGameStr(lang, 'accept')}
                  </Text>
                </TouchableOpacity>
              </View>
              {acceptSecLeft != null && (
                <View style={styles.deadlinePill}>
                  <Text style={{ color: t.textMuted, fontSize: f.caption }}>
                    {arenaGameStr(lang, 'timeLeft')}
                    <Text style={{ color: t.accent, fontWeight: '900' }}> {acceptSecLeft}</Text>
                    {arenaSecondsSuffix(lang)}
                  </Text>
                </View>
              )}
            </View>
          </SafeAreaView>
        </ScreenGradient>
      );
    }

    if (fromLobbyFlow) {
      return (
        <ScreenGradient>
          <SafeAreaView style={{ flex: 1 }} edges={['top', 'bottom']}>
            <View style={styles.arenaAcceptRoot}>
              <ActivityIndicator size="large" color={t.accent} />
            </View>
          </SafeAreaView>
        </ScreenGradient>
      );
    }
    return null;
  }

  if (phase === 'premeet' && !useMock) {
    return (
      <ScreenGradient>
        <View style={styles.premeetFull}>
          <Reanimated.View style={premeetTextStyle}>
            <Text
              style={[
                styles.premeetH1,
                { color: t.textPrimary, fontSize: 44, fontWeight: '900', letterSpacing: 2, textAlign: 'center' },
              ]}
            >
              {arenaGameStr(lang, 'premeet')}
            </Text>
          </Reanimated.View>
        </View>
      </ScreenGradient>
    );
  }

  if (phase === 'countdown') {
    return (
      <ScreenGradient>
        <View style={styles.countdownStage}>
          <Text style={[styles.getReady, { color: t.textMuted, fontSize: f.sub }]}>
            {arenaGameStr(lang, 'letsGo')}
          </Text>
          <Text style={[styles.countdownNum, { color: t.accent, textShadowColor: 'rgba(0,0,0,0.35)' }]}>
            {countdown}
          </Text>
        </View>
      </ScreenGradient>
    );
  }

  if (!currentQuestion) return null;

  const timeLeftSec = Math.ceil(questionTimeLeft / 1000);
  const timerIsRed = timeLeftSec <= 3;
  const timerColor = timerIsRed ? t.wrong : t.correct;

  return (
    <ScreenGradient>
      <View style={{ flex: 1 }}>
      <SafeAreaView style={{ flex: 1 }} edges={['top', 'bottom']}>
      {/* Таймер-полоска */}
      <View style={[styles.timerTrack, { backgroundColor: t.bgSurface2 }]}>
        <Reanimated.View
          style={[
            styles.timerFill,
            { backgroundColor: timerColor },
            timerBarStyle,
          ]}
        />
      </View>

      {/* Табло игроков */}
      <View style={[styles.scoreboard, { backgroundColor: t.bgCard, borderBottomColor: t.border }]}>
        <TouchableOpacity onPress={() => setShowExitConfirm(true)} style={styles.exitBtn}>
          <Ionicons name="close" size={22} color={t.textMuted} />
        </TouchableOpacity>
        {players.slice(0, 2).map((p, idx) => {
          const isMe = p.playerId === userId;
          return (
            <View key={p.playerId} style={[styles.playerChip, isMe && { borderBottomWidth: 2, borderBottomColor: t.accent }]}>
              <Text style={[styles.playerLabel, { color: isMe ? t.accent : t.textMuted, fontSize: f.caption }]} numberOfLines={1}>
                {p.displayName ?? (isMe ? arenaScoreboardYou(lang) : `P${idx + 1}`)}
              </Text>
              <Text style={[styles.playerScore, { color: t.textPrimary, fontSize: f.body }]}>
                {p.score}
              </Text>
            </View>
          );
        })}
      </View>

      {/* Вопрос */}
      <View style={styles.questionWrap}>
        <View style={styles.questionMeta}>
          <Text style={{ color: t.textMuted, fontSize: f.caption, fontWeight: '600' }}>
            {currentQuestionIndex + 1}/{totalQuestions || QUESTIONS_PER_MATCH}
          </Text>
          <Text style={[styles.timerNum, { color: timerColor, fontSize: f.h2 }]}>
            {timeLeftSec}
            {arenaSecondsSuffix(lang)}
          </Text>
        </View>
        {currentQuestion.task ? (
          <Text style={[styles.taskText, { color: t.textMuted, fontSize: f.caption }]}>
            {arenaBilingualFirst(currentQuestion.task, lang)}
          </Text>
        ) : null}
        <Text style={[styles.questionText, { color: t.textPrimary, fontSize: f.h2 }]}>
          {arenaBilingualFirst(currentQuestion.question, lang)}
        </Text>
      </View>

      {/* Варианты */}
      <View style={styles.options}>
        {currentQuestion.options.map((option, i) => {
          const isSelected = myAnswer === option;
          const isCorrect = phase === 'reveal' && option === currentQuestion.correct;
          const isWrong = phase === 'reveal' && isSelected && !isCorrect;

          const bg = isCorrect ? t.correctBg : isWrong ? t.wrongBg : t.bgCard;
          const border = isCorrect ? t.correct : isWrong ? t.wrong : isSelected ? t.accent : t.border;

          return (
            <TouchableOpacity
              key={i}
              onPress={() => handleAnswer(option)}
              disabled={hasAnswered}
              activeOpacity={0.8}
              style={[styles.optionBtn, { backgroundColor: bg, borderColor: border }]}
            >
              <View style={[styles.optionLetter, { backgroundColor: t.bgSurface2 }]}>
                <Text style={[{ color: t.textMuted, fontSize: f.caption, fontWeight: '700' }]}>
                  {['A', 'B', 'C', 'D'][i]}
                </Text>
              </View>
              <Text style={[styles.optionText, { color: t.textPrimary, fontSize: f.body }]} numberOfLines={2}>
                {arenaBilingualFirst(option, lang)}
              </Text>
              {isCorrect && <Text style={{ color: t.correct, fontSize: 20 }}>✓</Text>}
              {isWrong && <Text style={{ color: t.wrong, fontSize: 20 }}>✗</Text>}
            </TouchableOpacity>
          );
        })}
      </View>

      {/* XP попап после ответа */}
      {xpPopup && (
        <Animated.View style={[styles.xpPopup, { bottom: Math.max(160, insets.bottom + 140), transform: [{ translateY: xpPopupY }], opacity: xpPopupOpacity }]}>
          <Text style={[styles.xpPopupBase, { color: t.correct }]}>
            +{xpPopup.base}  {arenaGameStr(lang, 'xpCorrect')}
          </Text>
          {xpPopup.speed > 0 && (
            <Text style={[styles.xpPopupBonus, { color: t.gold }]}>
              ⚡ +{xpPopup.speed}  {arenaXpSpeed(lang, xpPopup.elapsedSec)}
            </Text>
          )}
          {xpPopup.first > 0 && (
            <Text style={[styles.xpPopupBonus, { color: '#A78BFA' }]}>
              🎯 +{xpPopup.first}  {arenaXpFirst(lang)}
            </Text>
          )}
          {xpPopup.streak > 0 && (
            <Text style={[styles.xpPopupBonus, { color: '#F97316' }]}>
              🔥 +{xpPopup.streak}  {arenaXpStreak(lang)}
            </Text>
          )}
          {xpPopup.outspeed > 0 && (
            <Text style={[styles.xpPopupBonus, { color: '#38BDF8' }]}>
              💥 +{xpPopup.outspeed}  {arenaXpOutspeed(lang)}
            </Text>
          )}
        </Animated.View>
      )}


      </SafeAreaView>
      </View>
      {/* Внутриигровой диалог подтверждения выхода */}
      {showExitConfirm && (
        <Pressable style={styles.overlay} onPress={() => setShowExitConfirm(false)}>
          <Pressable style={[styles.confirmCard, { backgroundColor: t.bgCard, borderColor: t.border }]}>
            <Text style={[styles.confirmTitle, { color: t.textPrimary, fontSize: f.h2 }]}>
              {arenaGameStr(lang, 'forfeitTitle')}
            </Text>
            <Text style={[styles.confirmSub, { color: t.textMuted, fontSize: f.body }]}>
              {arenaGameStr(lang, 'forfeitSub')}
            </Text>
            <TouchableOpacity
              onPress={confirmForfeit}
              style={[styles.confirmBtn, { backgroundColor: t.wrong }]}
              activeOpacity={0.8}
            >
              <Text style={[styles.confirmBtnText, { color: '#fff', fontSize: f.body }]}>
                {arenaGameStr(lang, 'forfeitConfirm')}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => setShowExitConfirm(false)}
              style={[styles.confirmBtn, { backgroundColor: t.bgSurface2 }]}
              activeOpacity={0.8}
            >
              <Text style={[styles.confirmBtnText, { color: t.textPrimary, fontSize: f.body }]}>
                {arenaGameStr(lang, 'forfeitContinue')}
              </Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      )}
    </ScreenGradient>
  );
}

const styles = StyleSheet.create({
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 16 },
  countdownStage: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingBottom: 40 },
  getReady: { fontWeight: '700', letterSpacing: 1 },
  arenaAcceptRoot: {
    flex: 1,
    paddingHorizontal: 20,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  lobbyRoot: { flex: 1, paddingHorizontal: 20, paddingTop: 8, alignItems: 'center', justifyContent: 'center' },
  lobbyGlowWrap: { position: 'absolute', top: '12%', left: 0, right: 0, height: 220, alignItems: 'center' },
  lobbyGlow: { width: 360, height: 220, borderRadius: 120, opacity: 0.9 },
  lobbyKicker: { textTransform: 'uppercase', letterSpacing: 3, marginBottom: 8, fontWeight: '700' },
  lobbyTitle: { fontWeight: '800', textAlign: 'center', marginBottom: 20 },
  lobbySub: { textAlign: 'center', marginBottom: 22, lineHeight: 22, paddingHorizontal: 8 },
  oppCard: {
    width: '100%',
    maxWidth: 380,
    borderRadius: 20,
    borderWidth: 1,
    paddingVertical: 22,
    paddingHorizontal: 20,
    alignItems: 'center',
    marginBottom: 20,
  },
  acceptBtnRow: { flexDirection: 'row', gap: 12, width: '100%', maxWidth: 400, marginTop: 4 },
  chipDecline: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 16,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chipAccept: {
    flex: 1.4,
    paddingVertical: 16,
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  waitOpp: { textAlign: 'center', marginTop: 8 },
  deadlinePill: { marginTop: 28, paddingHorizontal: 16, paddingVertical: 8, borderRadius: 999 },
  premeetFull: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 20 },
  premeetH1: { textShadowOffset: { width: 0, height: 2 }, textShadowRadius: 12 },
  countdownHint: { fontWeight: '500' },
  countdownNum: { fontSize: 120, fontWeight: '900', lineHeight: 128, textShadowOffset: { width: 0, height: 4 }, textShadowRadius: 8 },

  timerTrack: { height: 5, width: '100%' },
  timerFill: { height: 5 },

  scoreboard: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: 10, paddingHorizontal: 4,
    borderBottomWidth: 1,
  },
  exitBtn: { padding: 8, marginRight: 2 },
  playerChip: { flex: 1, alignItems: 'center', gap: 2, paddingHorizontal: 4, paddingBottom: 4 },
  playerLabel: { fontWeight: '600' },
  playerScore: { fontWeight: '800' },

  questionWrap: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 8, gap: 10 },
  questionMeta: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
  },
  timerNum: { fontWeight: '800' },
  taskText: { fontWeight: '400', lineHeight: 18 },
  questionText: { fontWeight: '700', lineHeight: 30 },

  options: { paddingHorizontal: 16, gap: 9 },
  optionBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    borderRadius: 16, borderWidth: 1.5,
    paddingVertical: 14, paddingHorizontal: 14, minHeight: 54,
  },
  optionLetter: {
    width: 28, height: 28, borderRadius: 8,
    alignItems: 'center', justifyContent: 'center',
  },
  optionText: { flex: 1, fontWeight: '600', lineHeight: 20 },

  ruleBox: {
    marginHorizontal: 16, marginTop: 10,
    borderRadius: 14, borderWidth: 1, padding: 12,
  },
  ruleText: { lineHeight: 18 },

  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  confirmCard: {
    width: '100%',
    borderRadius: 24,
    borderWidth: 1,
    padding: 24,
    gap: 12,
    alignItems: 'center',
  },
  confirmTitle: { fontWeight: '800', textAlign: 'center' },
  confirmSub: { textAlign: 'center', lineHeight: 20 },
  confirmBtn: {
    width: '100%', borderRadius: 14,
    paddingVertical: 14, alignItems: 'center',
  },
  confirmBtnText: { fontWeight: '700' },

  xpPopup: {
    position: 'absolute', alignSelf: 'center', bottom: 160,
    alignItems: 'center', gap: 2, zIndex: 99,
  },
  xpPopupBase: { fontSize: 28, fontWeight: '900' },
  xpPopupSpeed: { fontSize: 16, fontWeight: '700' },
  xpPopupBonus: { fontSize: 14, fontWeight: '700' },
});
