import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';
import type { ArenaSession, SessionPlayer } from '../app/types/arena';
import { SCORE_CONFIG } from '../app/types/arena';
import { getArenaLiveRoom, type ArenaLiveRoom } from '../app/services/arena_rooms_live';
import { arenaScoreboardYou } from '../constants/arena_i18n';
import { useLang } from '../components/LangContext';

export type RoomRunPhase = 'loading' | 'countdown' | 'question' | 'reveal' | 'finished' | 'aborted';

const QUESTION_TIME_MS = 40_000;
const QUESTION_UI_TICK_MS = 1000;
const REVEAL_TIME_MS = 900;
const COUNTDOWN_FROM = 3;

function scoreAnswer(isCorrect: boolean, elapsed: number, correctStreak: number, firstCorrectDone: boolean, bonusTotal = 0): number {
  if (!isCorrect) return 0;
  if (bonusTotal > 0) return SCORE_CONFIG.correctBase + bonusTotal;
  const speedBonus = elapsed < SCORE_CONFIG.speedBonusThresholdMs
    ? Math.round(SCORE_CONFIG.speedBonusMax * (1 - elapsed / SCORE_CONFIG.speedBonusThresholdMs))
    : 0;
  const streakBonus = correctStreak > 0 && correctStreak % SCORE_CONFIG.streakThreshold === 0
    ? SCORE_CONFIG.streakBonus
    : 0;
  const firstBonus = firstCorrectDone ? 0 : SCORE_CONFIG.firstAnswerBonus;
  const outspeedBonus = elapsed < SCORE_CONFIG.outspeedThresholdMs ? SCORE_CONFIG.outspeedBonus : 0;
  return SCORE_CONFIG.correctBase + speedBonus + streakBonus + firstBonus + outspeedBonus;
}

export function useArenaRoomRun(roomCode: string, userId: string) {
  const { lang } = useLang();
  const [room, setRoom] = useState<ArenaLiveRoom | null>(null);
  const [phase, setPhase] = useState<RoomRunPhase>('loading');
  const [countdown, setCountdown] = useState(COUNTDOWN_FROM);
  const [qIndex, setQIndex] = useState(0);
  const [questionTimeLeft, setTimeLeft] = useState(QUESTION_TIME_MS);
  const [questionStartedAt, setQuestionStartedAt] = useState<number | null>(null);
  const [myAnswer, setMyAnswer] = useState<string | null>(null);
  const [hasAnswered, setHasAnswered] = useState(false);
  const [score, setScore] = useState(0);

  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const questionTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hasAnsweredRef = useRef(false);
  const qIndexRef = useRef(0);
  const roomRef = useRef<ArenaLiveRoom | null>(null);
  const scoreRef = useRef(0);
  const startedRef = useRef(false);
  const correctStreakRef = useRef(0);
  const firstCorrectDoneRef = useRef(false);
  const lastShownSecRef = useRef<number | null>(null);
  const startQuestionRef = useRef<(idx: number) => void>(() => {});
  const questionStartedAtRef = useRef<number | null>(null);

  useEffect(() => { hasAnsweredRef.current = hasAnswered; }, [hasAnswered]);
  useEffect(() => { qIndexRef.current = qIndex; }, [qIndex]);
  useEffect(() => { roomRef.current = room; }, [room]);
  useEffect(() => { scoreRef.current = score; }, [score]);

  const clearAll = () => {
    timers.current.forEach(clearTimeout);
    timers.current = [];
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    if (questionTimeoutRef.current) {
      clearTimeout(questionTimeoutRef.current);
      questionTimeoutRef.current = null;
    }
  };

  useEffect(() => {
    clearAll();
    startedRef.current = false;
    correctStreakRef.current = 0;
    firstCorrectDoneRef.current = false;
    setRoom(null);
    setPhase('loading');
    setCountdown(COUNTDOWN_FROM);
    setQIndex(0);
    setMyAnswer(null);
    setHasAnswered(false);
    hasAnsweredRef.current = false;
    setScore(0);

    let cancelled = false;
    void (async () => {
      const loaded = await getArenaLiveRoom(roomCode).catch(() => null);
      if (cancelled) return;
      if (!loaded || loaded.questionSnapshots.length === 0) {
        setPhase('aborted');
        return;
      }
      setRoom(loaded);
      setPhase('countdown');
    })();

    return () => {
      cancelled = true;
      clearAll();
    };
  }, [roomCode, userId]);

  const goToReveal = useCallback((idx: number) => {
    clearAll();
    questionStartedAtRef.current = null;
    setPhase('reveal');
    const id = setTimeout(() => {
      const r = roomRef.current;
      const next = idx + 1;
      if (r && next < r.questionSnapshots.length) {
        startQuestionRef.current(next);
        return;
      }
      setPhase('finished');
    }, REVEAL_TIME_MS);
    timers.current.push(id);
  }, []);

  const startQuestionTimer = useCallback((idx: number) => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    const start = Date.now();
    questionStartedAtRef.current = start;
    lastShownSecRef.current = null;
    setQuestionStartedAt(start);
    const updateVisibleTimeLeft = () => {
      const left = Math.max(0, QUESTION_TIME_MS - (Date.now() - start));
      if (left > 0) {
        const displaySec = Math.ceil(left / 1000) || 0;
        if (lastShownSecRef.current !== displaySec) {
          lastShownSecRef.current = displaySec;
          setTimeLeft(left);
        }
        return;
      }
      if (lastShownSecRef.current !== 0) {
        lastShownSecRef.current = 0;
        setTimeLeft(0);
      }
    };
    const finishNoAnswer = () => {
      if (hasAnsweredRef.current) return;
      if (lastShownSecRef.current !== 0) {
        lastShownSecRef.current = 0;
        setTimeLeft(0);
      }
      clearAll();
      hasAnsweredRef.current = true;
      setHasAnswered(true);
      setMyAnswer(null);
      goToReveal(qIndexRef.current);
    };
    updateVisibleTimeLeft();
    intervalRef.current = setInterval(updateVisibleTimeLeft, QUESTION_UI_TICK_MS);
    questionTimeoutRef.current = setTimeout(finishNoAnswer, QUESTION_TIME_MS + 50);
  }, [goToReveal]);

  useEffect(() => {
    const sub = AppState.addEventListener('change', (nextState) => {
      if (nextState !== 'active') return;
      if (phase !== 'question') return;
      const startedAt = questionStartedAtRef.current;
      if (startedAt == null) return;
      const left = Math.max(0, QUESTION_TIME_MS - (Date.now() - startedAt));
      setTimeLeft(left);
      if (left > 0 || hasAnsweredRef.current) return;
      hasAnsweredRef.current = true;
      setHasAnswered(true);
      setMyAnswer(null);
      clearAll();
      goToReveal(qIndexRef.current);
    });
    return () => sub.remove();
  }, [phase, goToReveal]);

  const startQuestion = useCallback((idx: number) => {
    setQIndex(idx);
    setMyAnswer(null);
    hasAnsweredRef.current = false;
    setHasAnswered(false);
    setTimeLeft(QUESTION_TIME_MS);
    setPhase('question');
    startQuestionTimer(idx);
  }, [startQuestionTimer]);

  useEffect(() => {
    startQuestionRef.current = startQuestion;
  }, [startQuestion]);

  useEffect(() => {
    if (phase !== 'countdown' || !room || startedRef.current) return;
    let tick = COUNTDOWN_FROM;
    const id = setInterval(() => {
      tick -= 1;
      setCountdown(tick);
      if (tick <= 0) {
        clearInterval(id);
        startedRef.current = true;
        startQuestion(0);
      }
    }, 1000);
    return () => clearInterval(id);
  }, [phase, room, startQuestion]);

  const submitAnswer = useCallback((answer: string, bonusTotal = 0) => {
    if (hasAnsweredRef.current) return;
    const r = roomRef.current;
    const idx = qIndexRef.current;
    const q = r?.questionSnapshots[idx];
    if (!q) return;
    hasAnsweredRef.current = true;
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    const elapsed = questionStartedAt != null ? Date.now() - questionStartedAt : QUESTION_TIME_MS;
    const isCorrect = answer === q.correct;
    if (isCorrect) correctStreakRef.current += 1;
    else correctStreakRef.current = 0;
    const points = scoreAnswer(isCorrect, elapsed, correctStreakRef.current, firstCorrectDoneRef.current, bonusTotal);
    if (isCorrect && !firstCorrectDoneRef.current) firstCorrectDoneRef.current = true;
    setMyAnswer(answer);
    setHasAnswered(true);
    setScore((prev) => prev + points);
    goToReveal(idx);
  }, [goToReveal, questionStartedAt]);

  const questions = room?.questionSnapshots ?? [];
  const players: SessionPlayer[] = [{
    sessionId: `room_${roomCode}`,
    playerId: userId,
    score,
    answers: [],
    displayName: arenaScoreboardYou(lang),
  }];

  return {
    phase,
    countdown,
    questionTimeLeft,
    questionStartedAt,
    questionTimeoutMs: QUESTION_TIME_MS,
    currentQuestion: questions[qIndex] ?? null,
    currentQuestionIndex: qIndex,
    totalQuestions: questions.length,
    players,
    myAnswer,
    hasAnswered,
    myScore: score,
    opponentForfeited: false,
    submitAnswer,
    submitMyAnswer: async (answer: string) => submitAnswer(answer),
    submitLobbyChoice: async () => {},
    acceptDeadlineAt: undefined,
    getReadyEndsAt: undefined,
    abortReason: undefined as ArenaSession['abortReason'],
    myLobbyChoice: undefined,
    sessionType: 'private' as ArenaSession['type'],
    room,
  };
}
