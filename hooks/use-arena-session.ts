import { useState, useEffect, useRef, useCallback } from 'react';
import firestore from '@react-native-firebase/firestore';
import { ArenaSession, ArenaQuestion, SessionPlayer } from '../app/types/arena';
import {
  subscribeSession,
  subscribeSessionPlayers,
  submitAnswer,
  touchSessionPlayerPresence,
  setSessionLobbyChoice,
} from '../app/services/arena_db';

export type GamePhase =
  | 'loading'
  | 'acceptance'
  | 'premeet'
  | 'aborted'
  | 'countdown'
  | 'question'
  | 'reveal'
  | 'finished';

interface UseArenaSessionResult {
  phase: GamePhase;
  countdown: number;
  questionTimeLeft: number;
  questionStartedAt: number | null;
  questionTimeoutMs: number;
  currentQuestion: ArenaQuestion | null;
  currentQuestionIndex: number;
  totalQuestions: number;
  players: SessionPlayer[];
  myAnswer: string | null;
  myScore: number;
  hasAnswered: boolean;
  opponentForfeited: boolean;
  submitMyAnswer: (answer: string) => Promise<void>;
  submitLobbyChoice: (choice: 'accept' | 'decline') => Promise<void>;
  acceptDeadlineAt: number | undefined;
  getReadyEndsAt: number | undefined;
  abortReason: ArenaSession['abortReason'];
  myLobbyChoice: SessionPlayer['lobbyChoice'];
}

const COUNTDOWN_SECONDS = 3;
/** После старта вопроса ждём столько, прежде чем считать соперника «не вышел на связь» (без сетевых get). Шире старого ~15 с, чтобы не форфитить на медленной сети. */
const OPPONENT_ABSENT_GRACE_MS = 35_000;

export function useArenaSession(
  sessionId: string,
  userId: string
): UseArenaSessionResult {
  const [session, setSession] = useState<ArenaSession | null>(null);
  const [players, setPlayers] = useState<SessionPlayer[]>([]);
  const [questions, setQuestions] = useState<Record<string, ArenaQuestion>>({});
  const [phase, setPhase] = useState<GamePhase>('loading');
  const [countdown, setCountdown] = useState(COUNTDOWN_SECONDS);
  const [questionTimeLeft, setQuestionTimeLeft] = useState(0);
  const [myAnswer, setMyAnswer] = useState<string | null>(null);
  const [hasAnswered, setHasAnswered] = useState(false);
  const [opponentForfeited, setOpponentForfeited] = useState(false);

  const me = players.find(p => p.playerId === userId);

  const questionTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const countdownTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const sessionRef = useRef<ArenaSession | null>(null);
  const playersRef = useRef<SessionPlayer[]>([]);
  const hasAnsweredRef = useRef(false);
  /** Щоб не викликати setState 10×/с — лише при зміні відображуваної секунди. */
  const lastShownSecRef = useRef<number | null>(null);
  const lastPresenceKeyRef = useRef<string>('');
  /** Після другого+ матчу без цього лишалась стара мапа питань при тому ж questions.length → «Q4 / таймер 0». */
  const questionsKeyRef = useRef<string>('');
  useEffect(() => {
    lastPresenceKeyRef.current = '';
  }, [sessionId]);
  useEffect(() => { sessionRef.current = session; }, [session]);
  useEffect(() => { playersRef.current = players; }, [players]);
  useEffect(() => { hasAnsweredRef.current = hasAnswered; }, [hasAnswered]);

  const clearQuestionTimer = () => {
    if (questionTimerRef.current) {
      clearInterval(questionTimerRef.current);
      questionTimerRef.current = null;
    }
  };

  // Новий матч / новий sessionId — скидаємо все локальне, щоб не змішувати стани сесій.
  useEffect(() => {
    if (!sessionId) return;
    clearQuestionTimer();
    if (countdownTimerRef.current) {
      clearInterval(countdownTimerRef.current);
      countdownTimerRef.current = null;
    }
    questionsKeyRef.current = '';
    setSession(null);
    setPlayers([]);
    setQuestions({});
    setPhase('loading');
    setMyAnswer(null);
    setHasAnswered(false);
    hasAnsweredRef.current = false;
    setOpponentForfeited(false);
    lastShownSecRef.current = null;
  }, [sessionId]);

  // ── Загружаем вопросы (перезагруз при кожній новій парі sessionId + список id) ─
  const qIdsKey = session?.questions?.length ? `${sessionId}:${session.questions.join(',')}` : '';
  useEffect(() => {
    if (!qIdsKey) return;
    if (questionsKeyRef.current === qIdsKey) return;
    questionsKeyRef.current = qIdsKey;

    const colon = qIdsKey.indexOf(':');
    const ids = colon >= 0 ? qIdsKey.slice(colon + 1).split(',').filter(Boolean) : [];
    if (ids.length === 0) return;

    let cancelled = false;
    const loadQuestions = async () => {
      const db = firestore();
      const docs = await Promise.all(
        ids.map(id => db.collection('arena_questions').doc(id).get())
      );
      if (cancelled) return;
      const map: Record<string, ArenaQuestion> = {};
      docs.forEach(d => {
        if (!d.exists) return;
        const q = d.data() as ArenaQuestion;
        const shuffled = [...q.options].sort(() => Math.random() - 0.5) as [string, string, string, string];
        map[d.id] = { ...q, options: shuffled };
      });
      setQuestions(map);
    };

    void loadQuestions();
    return () => { cancelled = true; };
  }, [qIdsKey]);

  // ── Подписка на сессию ─────────────────────────────────────────────────────
  useEffect(() => {
    if (!sessionId) return;
    return subscribeSession(sessionId, setSession);
  }, [sessionId]);

  // ── Разовый «пульс» на каждый вопрос (вместо heartbeat каждые 5 с) ─────────
  useEffect(() => {
    if (!sessionId || !userId || !session || session.state !== 'question') return;
    const startedAt = session.questionStartedAt;
    if (startedAt == null) return;
    const key = `${session.currentQuestionIndex}:${startedAt}`;
    if (lastPresenceKeyRef.current === key) return;
    lastPresenceKeyRef.current = key;
    touchSessionPlayerPresence(sessionId, userId).catch(() => {});
  }, [sessionId, userId, session?.state, session?.currentQuestionIndex, session?.questionStartedAt]);

  // ── Соперник не «отметился» в этом раунде: только локальный таймер, 0 reads ─
  useEffect(() => {
    if (!session || session.state === 'finished') return;
    if (session.state !== 'question') return;

    let id: ReturnType<typeof setInterval>;
    const tick = () => {
      const s = sessionRef.current;
      const pl = playersRef.current;
      if (!s || s.state !== 'question') return;
      const qStart = s.questionStartedAt;
      if (qStart == null) return;
      if (Date.now() - qStart < OPPONENT_ABSENT_GRACE_MS) return;

      const opponent = pl.find(p => p.playerId !== userId);
      if (!opponent) return;
      const ls = (opponent as SessionPlayer & { lastSeen?: number }).lastSeen;
      if (typeof ls !== 'number') return;
      if (ls >= qStart) return;

      clearInterval(id);
      setOpponentForfeited(true);
      setPhase('finished');
    };

    id = setInterval(tick, 4000);
    return () => clearInterval(id);
  }, [session?.state, session?.currentQuestionIndex, session?.questionStartedAt, userId]);

  // ── Слушаем игроков ────────────────────────────────────────────────────────
  useEffect(() => {
    if (!sessionId) return;
    return subscribeSessionPlayers(sessionId, setPlayers);
  }, [sessionId]);

  // ── Реагируем на смену состояния сессии ────────────────────────────────────
  useEffect(() => {
    if (!session) return;

    if (session.state === 'aborted') {
      setPhase('aborted');
      return;
    }

    if (session.forfeitedBy && session.forfeitedBy !== userId) {
      setOpponentForfeited(true);
      setPhase('finished');
      return;
    }

    if (session.state === 'acceptance') {
      setPhase('acceptance');
      return;
    }

    if (session.state === 'get_ready') {
      setPhase('premeet');
      return;
    }

    if (session.state === 'countdown') {
      startCountdown(session);
    } else if (session.state === 'question') {
      startQuestion(session);
    } else if (session.state === 'reveal') {
      setPhase('reveal');
      clearQuestionTimer();
    } else if (session.state === 'finished') {
      if (session.forfeitedBy && session.forfeitedBy !== userId) setOpponentForfeited(true);
      setPhase('finished');
      clearQuestionTimer();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.state, session?.currentQuestionIndex, session?.forfeitedBy, userId]);

  // Тайм-аут приймання: авто «decline» (сервер дублює в cron)
  useEffect(() => {
    if (!userId) return;
    if (session?.state !== 'acceptance') return;
    if (me?.lobbyChoice === 'accept' || me?.lobbyChoice === 'decline') return;
    const deadline = session?.acceptDeadlineAt;
    if (typeof deadline !== 'number') return;
    const delay = Math.max(0, deadline - Date.now());
    const t = setTimeout(() => {
      setSessionLobbyChoice(sessionId, userId, 'decline').catch(() => {});
    }, delay + 80);
    return () => clearTimeout(t);
  }, [sessionId, userId, session?.state, session?.acceptDeadlineAt, me?.lobbyChoice]);

  function startCountdown(s: ArenaSession) {
    if (countdownTimerRef.current) {
      clearInterval(countdownTimerRef.current);
      countdownTimerRef.current = null;
    }
    setPhase('countdown');
    setCountdown(COUNTDOWN_SECONDS);

    let tick = COUNTDOWN_SECONDS;
    countdownTimerRef.current = setInterval(() => {
      tick -= 1;
      setCountdown(tick);
      if (tick <= 0) {
        clearInterval(countdownTimerRef.current!);
        countdownTimerRef.current = null;
      }
    }, 1000);
  }

  function startQuestion(s: ArenaSession) {
    setPhase('question');
    setMyAnswer(null);
    setHasAnswered(false);
    lastShownSecRef.current = null;

    const questionId = s.questions[s.currentQuestionIndex];
    const timeoutMs = s.questionTimeoutMs;
    const startedAt = s.questionStartedAt ?? Date.now();

    clearQuestionTimer();
    // 100ms — точна межа "час вийшов"; setQuestionTimeLeft лише ~1/s — менше re-render, без ривків смужки
    questionTimerRef.current = setInterval(() => {
      const left = Math.max(0, timeoutMs - (Date.now() - startedAt));
      if (left <= 0) {
        if (lastShownSecRef.current !== 0) {
          lastShownSecRef.current = 0;
          setQuestionTimeLeft(0);
        }
        clearQuestionTimer();
        handleNoAnswer(sessionId, userId, questionId);
        return;
      }
      const displaySec = Math.ceil(left / 1000) || 0;
      if (lastShownSecRef.current !== displaySec) {
        lastShownSecRef.current = displaySec;
        setQuestionTimeLeft(left);
      }
    }, 100);
  }

  const handleNoAnswer = (sid: string, uid: string, qid: string) => {
    if (hasAnsweredRef.current) return;
    hasAnsweredRef.current = true;
    setHasAnswered(true);
    submitAnswer(sid, uid, qid, null, sessionRef.current?.questionTimeoutMs ?? 0).catch(() => {});
  };

  const submitMyAnswer = useCallback(async (answer: string) => {
    if (hasAnswered || !session) return;

    const questionId = session.questions[session.currentQuestionIndex];
    const startedAt = session.questionStartedAt ?? Date.now();
    const timeMs = Date.now() - startedAt;
    setMyAnswer(answer);
    setHasAnswered(true);
    clearQuestionTimer();
    try {
      await submitAnswer(sessionId, userId, questionId, answer, timeMs);
    } catch (e) {
      // Rollback local lock so user can retry when network/rules fail.
      setMyAnswer(null);
      setHasAnswered(false);
      hasAnsweredRef.current = false;
      throw e;
    }
  }, [hasAnswered, session, sessionId, userId]);

  const submitLobbyChoice = useCallback(
    async (choice: 'accept' | 'decline') => {
      if (!sessionId || !userId) return;
      await setSessionLobbyChoice(sessionId, userId, choice);
    },
    [sessionId, userId],
  );

  // Очистка при unmount
  useEffect(() => {
    return () => {
      clearQuestionTimer();
      if (countdownTimerRef.current) clearInterval(countdownTimerRef.current);
    };
  }, []);

  const currentQuestion = session
    ? questions[session.questions[session.currentQuestionIndex]] ?? null
    : null;

  return {
    phase,
    countdown,
    questionTimeLeft,
    questionStartedAt: session?.questionStartedAt ?? null,
    questionTimeoutMs: session?.questionTimeoutMs ?? 40_000,
    currentQuestion,
    currentQuestionIndex: session?.currentQuestionIndex ?? 0,
    totalQuestions: session?.questions.length ?? 0,
    players,
    myAnswer,
    myScore: me?.score ?? 0,
    hasAnswered,
    opponentForfeited,
    submitMyAnswer,
    submitLobbyChoice,
    acceptDeadlineAt: session?.acceptDeadlineAt,
    getReadyEndsAt: session?.getReadyEndsAt,
    abortReason: session?.abortReason,
    myLobbyChoice: me?.lobbyChoice,
  };
}
