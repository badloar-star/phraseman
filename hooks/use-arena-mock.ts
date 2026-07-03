import { useState, useEffect, useRef, useCallback } from 'react';
import { AppState } from 'react-native';
import {
  type ArenaSession,
  ArenaQuestion,
  SessionPlayer,
  SCORE_CONFIG,
  QUESTIONS_PER_MATCH,
} from '../app/types/arena';
import { pickRandomBotName, pickRandomBotNameEs } from '../app/constants/bot_names';
import { getBotProfile, sampleBotDelayMs, rollBotIsCorrect, BotProfile } from '../app/constants/bot_difficulty';
import { logEvent } from '../app/firebase';
import { useLang } from '../components/LangContext';
import { arenaScoreboardYou } from '../constants/arena_i18n';
import { CLOUD_SYNC_ENABLED, IS_EXPO_GO } from '../app/config';

export type MockGamePhase = 'loading' | 'countdown' | 'question' | 'reveal' | 'finished';

/** Не даём бот-матчу «висеть» на Firestore: после таймаута — встроенные вопросы. */
const MOCK_FETCH_TIMEOUT_MS = 10_000;

/** Кол-во встроенных в приложение аватаров (см. constants/avatars.ts AVATARS). */
const TOTAL_AVATARS = 51;

/** Возвращает случайный indices аватара в окне ±3 от уровня игрока, не ниже 1. */
function pickBotAvatarIndex(playerAvatarLevel: number): number {
  const center = Math.max(1, Math.min(TOTAL_AVATARS, Math.round(playerAvatarLevel)));
  const offset = Math.floor(Math.random() * 7) - 3; // [-3..+3]
  const idx = center + offset;
  return Math.max(1, Math.min(TOTAL_AVATARS, idx));
}

interface UseDuelMockResult {
  phase: MockGamePhase;
  countdown: number;
  questionTimeLeft: number;
  questionStartedAt: number | null;
  questionTimeoutMs: number;
  currentQuestion: ArenaQuestion | null;
  currentQuestionIndex: number;
  totalQuestions: number;
  players: SessionPlayer[];
  myAnswer: string | null;
  hasAnswered: boolean;
  myScore: number;
  opponentForfeited: boolean;
  submitAnswer: (answer: string, bonusTotal?: number) => void;
  submitMyAnswer: (answer: string) => Promise<void>;
  submitLobbyChoice: (choice: 'accept' | 'decline') => Promise<void>;
  acceptDeadlineAt: number | undefined;
  getReadyEndsAt: number | undefined;
  abortReason: ArenaSession['abortReason'];
  myLobbyChoice: 'accept' | 'decline' | undefined;
  sessionType: ArenaSession['type'] | undefined;
}

const QUESTION_TIME_MS = 40_000;
const QUESTION_UI_TICK_MS = 1000;
const REVEAL_TIME_MS = 1_500;
const COUNTDOWN_FROM = 3;

// В дев-сборке — 1 вопрос, чтобы быстро тестировать сохранение результатов.
// __DEV__ = true только в development builds (Expo dev-client / Metro), в production = false.
const MOCK_QUESTIONS_PER_MATCH: number = __DEV__ ? 1 : QUESTIONS_PER_MATCH;

const FALLBACK_MOCK_QUESTIONS: ArenaQuestion[] = [
  {
    id: 'mock_1',
    level: 'A1',
    type: 'choose',
    task: 'Complete the sentence',
    question: 'Please look ___ the picture on the wall.',
    options: ['in', 'to', 'on', 'at'],
    correct: 'at',
    rule: 'look at + object',
  },
  {
    id: 'mock_2',
    level: 'A1',
    type: 'choose',
    task: 'Choose the correct option',
    question: 'I get ___ at 7 AM every day.',
    options: ['up', 'off', 'in', 'down'],
    correct: 'up',
    rule: 'get up = вставать',
  },
];

function getDb(): any | null {
  if (IS_EXPO_GO || !CLOUD_SYNC_ENABLED) return null;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    return require('@react-native-firebase/firestore').default();
  } catch {
    return null;
  }
}

function shuffleArray<T>(arr: T[]): T[] {
  const result = [...arr];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

async function fetchMockQuestions(): Promise<ArenaQuestion[]> {
  const db = getDb();
  if (!db) return [];
  const pivot = Math.random();
  const col = db.collection('arena_questions');

  const [snapA, snapB] = await Promise.all([
    col.where('level', '==', 'A1').where('rand', '>=', pivot).orderBy('rand').limit(QUESTIONS_PER_MATCH * 4).get(),
    col.where('level', '==', 'A1').where('rand', '<', pivot).orderBy('rand').limit(QUESTIONS_PER_MATCH * 4).get(),
  ]);

  const all = [
    ...snapA.docs.map((d: any) => d.data() as ArenaQuestion),
    ...snapB.docs.map((d: any) => d.data() as ArenaQuestion),
  ];

  return shuffleArray(all).slice(0, MOCK_QUESTIONS_PER_MATCH);
}

const MAX_MOCK_TIEBREAK_EXTRA = 25;

async function fetchOneMoreMockQuestion(excludeIds: Set<string>): Promise<ArenaQuestion | null> {
  const db = getDb();
  if (!db) return null;
  const pivot = Math.random();
  const col = db.collection('arena_questions');
  const [snapA, snapB] = await Promise.all([
    col.where('level', '==', 'A1').where('rand', '>=', pivot).orderBy('rand').limit(80).get(),
    col.where('level', '==', 'A1').where('rand', '<', pivot).orderBy('rand').limit(80).get(),
  ]);
  const all = [
    ...snapA.docs.map((d: any) => ({ ...(d.data() as ArenaQuestion), id: (d.data() as ArenaQuestion).id ?? d.id })),
    ...snapB.docs.map((d: any) => ({ ...(d.data() as ArenaQuestion), id: (d.data() as ArenaQuestion).id ?? d.id })),
  ];
  for (const q of shuffleArray(all)) {
    const id = q.id ?? '';
    if (id && !excludeIds.has(id)) return q;
  }
  return null;
}

function withTimeout<T>(promise: Promise<T>, ms: number, onTimeout: () => T): Promise<T> {
  return new Promise((resolve) => {
    const t = setTimeout(() => resolve(onTimeout()), ms);
    promise
      .then((v) => {
        clearTimeout(t);
        resolve(v);
      })
      .catch(() => {
        clearTimeout(t);
        resolve(onTimeout());
      });
  });
}

export function useDuelMock(
  userId: string,
  playerRankIndex: number = 0,
  playerAvatarLevel: number = 1,
): UseDuelMockResult {
  const { lang, langHydrated } = useLang();
  const [questions, setQuestions] = useState<ArenaQuestion[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [phase, setPhase] = useState<MockGamePhase>('loading');
  const [countdown, setCountdown] = useState(COUNTDOWN_FROM);
  const [qIndex, setQIndex] = useState(0);
  const [questionTimeLeft, setTimeLeft] = useState(QUESTION_TIME_MS);
  const [questionStartedAt, setQuestionStartedAt] = useState<number | null>(null);
  const [myAnswer, setMyAnswer] = useState<string | null>(null);
  const [hasAnswered, setHasAnswered] = useState(false);
  const [scores, setScores] = useState<Record<string, number>>({ [userId]: 0, bot1: 0 });
  const [botAnswered, setBotAnswered] = useState(false);
  /** Сразу задаём ник — иначе при быстрой сдаче до гидрации языка в результаты уходило пустое имя. */
  const [mockBotDisplayName, setMockBotDisplayName] = useState(() =>
    (lang === 'es' ? pickRandomBotNameEs() : pickRandomBotName()));

  useEffect(() => {
    if (!langHydrated) return;
    setMockBotDisplayName(lang === 'es' ? pickRandomBotNameEs() : pickRandomBotName());
  }, [langHydrated, lang]);
  const botAvatarLevel = useRef(pickBotAvatarIndex(playerAvatarLevel)).current;
  const botProfile = useRef<BotProfile>(getBotProfile(playerRankIndex)).current;
  const matchStartedLogRef = useRef(false);
  const matchFinishedLogRef = useRef(false);

  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const questionTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const botTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hasAnsweredRef = useRef(false);
  const botAnsweredRef = useRef(false);
  const lastShownSecRef = useRef<number | null>(null);
  const qIndexRef = useRef(0);
  const questionsRef = useRef<ArenaQuestion[]>([]);
  const scoresRef = useRef(scores);
  const startedRef = useRef(false);
  const botCorrectStreakRef = useRef(0);
  const botFirstCorrectDoneRef = useRef(false);
  const questionStartedAtRef = useRef<number | null>(null);

  useEffect(() => { hasAnsweredRef.current = hasAnswered; }, [hasAnswered]);
  useEffect(() => { botAnsweredRef.current = botAnswered; }, [botAnswered]);
  useEffect(() => { qIndexRef.current = qIndex; }, [qIndex]);
  useEffect(() => { questionsRef.current = questions; }, [questions]);
  useEffect(() => { scoresRef.current = scores; }, [scores]);

  useEffect(() => {
    void (async () => {
      const qs = await withTimeout(
        fetchMockQuestions(),
        MOCK_FETCH_TIMEOUT_MS,
        () => [] as ArenaQuestion[],
      );
      setQuestions(qs.length > 0 ? qs : FALLBACK_MOCK_QUESTIONS);
      setLoaded(true);
    })();
  }, []);

  const clearAll = () => {
    timers.current.forEach(clearTimeout);
    timers.current = [];
    if (intervalRef.current) { clearInterval(intervalRef.current); intervalRef.current = null; }
    if (questionTimeoutRef.current) { clearTimeout(questionTimeoutRef.current); questionTimeoutRef.current = null; }
  };

  const clearBotTimer = () => {
    if (botTimerRef.current) { clearTimeout(botTimerRef.current); botTimerRef.current = null; }
  };

  const startQuestionTimer = useCallback(() => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    const start = Date.now();
    questionStartedAtRef.current = start;
    lastShownSecRef.current = null;
    setQuestionStartedAt(start);
    const updateVisibleTimeLeft = () => {
      const left = Math.max(0, QUESTION_TIME_MS - (Date.now() - start));
      if (left <= 0) {
        if (lastShownSecRef.current !== 0) {
          lastShownSecRef.current = 0;
          setTimeLeft(0);
        }
        return;
      }
      const displaySec = Math.ceil(left / 1000) || 0;
      if (lastShownSecRef.current !== displaySec) {
        lastShownSecRef.current = displaySec;
        setTimeLeft(left);
      }
    };
    const finishNoAnswer = () => {
      if (hasAnsweredRef.current) return;
      if (lastShownSecRef.current !== 0) {
        lastShownSecRef.current = 0;
        setTimeLeft(0);
      }
      hasAnsweredRef.current = true;
      setHasAnswered(true);
      setMyAnswer(null);
      clearAll();
      goToReveal(qIndexRef.current);
    };
    updateVisibleTimeLeft();
    intervalRef.current = setInterval(updateVisibleTimeLeft, QUESTION_UI_TICK_MS);
    questionTimeoutRef.current = setTimeout(finishNoAnswer, QUESTION_TIME_MS + 50);
  }, []);

  const scheduleBotAnswer = useCallback((idx: number, onBothAnswered: () => void) => {
    clearBotTimer();
    const q = questionsRef.current[idx];
    if (!q) return;
    const isCorrect = rollBotIsCorrect(botProfile);
    const delay = sampleBotDelayMs(botProfile);

    // Те же бонусы, что у игрока (см. app/arena_game.tsx и functions/src/arena_scoring.ts).
    // Без них бот всегда набирал «ровно 100 за правильный» — выглядело как баг.
    let points = 0;
    if (isCorrect) {
      botCorrectStreakRef.current += 1;
      const speedBonus = delay < SCORE_CONFIG.speedBonusThresholdMs
        ? Math.round(SCORE_CONFIG.speedBonusMax * (1 - delay / SCORE_CONFIG.speedBonusThresholdMs))
        : 0;
      const streakBonus = botCorrectStreakRef.current % SCORE_CONFIG.streakThreshold === 0
        ? SCORE_CONFIG.streakBonus : 0;
      const firstBonus = !botFirstCorrectDoneRef.current
        ? (botFirstCorrectDoneRef.current = true, SCORE_CONFIG.firstAnswerBonus) : 0;
      const outspeedBonus = delay < SCORE_CONFIG.outspeedThresholdMs
        ? SCORE_CONFIG.outspeedBonus : 0;
      points = SCORE_CONFIG.correctBase + speedBonus + streakBonus + firstBonus + outspeedBonus;
    } else {
      botCorrectStreakRef.current = 0;
    }

    botTimerRef.current = setTimeout(() => {
      setBotAnswered(true);
      botAnsweredRef.current = true;
      setScores(prev => ({ ...prev, bot1: prev.bot1 + points }));
      if (hasAnsweredRef.current) onBothAnswered();
    }, delay);
  }, [botProfile]);

  const goToReveal = useCallback((idx: number) => {
    clearAll();
    clearBotTimer();
    setBotAnswered(false);
    botAnsweredRef.current = false;
    questionStartedAtRef.current = null;
    setPhase('reveal');
    const id = setTimeout(() => {
      const next = idx + 1;
      const qs = questionsRef.current;
      if (next < qs.length) {
        setQIndex(next);
        setMyAnswer(null);
        hasAnsweredRef.current = false;
        setHasAnswered(false);
        setTimeLeft(QUESTION_TIME_MS);
        setPhase('question');
        startQuestionTimer();
        scheduleBotAnswer(next, () => goToReveal(next));
        return;
      }
      const my = scoresRef.current[userId] ?? 0;
      const bot = scoresRef.current.bot1 ?? 0;
      const canTiebreak =
        my === bot
        && qs.length >= MOCK_QUESTIONS_PER_MATCH
        && qs.length < MOCK_QUESTIONS_PER_MATCH + MAX_MOCK_TIEBREAK_EXTRA;
      if (!canTiebreak) {
        setPhase('finished');
        return;
      }
      void fetchOneMoreMockQuestion(new Set(qs.map((q) => q.id))).then((extra) => {
        if (!extra) {
          setPhase('finished');
          return;
        }
        const merged = [...questionsRef.current, extra];
        questionsRef.current = merged;
        setQuestions(merged);
        setQIndex(next);
        setMyAnswer(null);
        hasAnsweredRef.current = false;
        setHasAnswered(false);
        setTimeLeft(QUESTION_TIME_MS);
        setPhase('question');
        startQuestionTimer();
        scheduleBotAnswer(next, () => goToReveal(next));
      });
    }, REVEAL_TIME_MS);
    timers.current.push(id);
  }, [startQuestionTimer, scheduleBotAnswer]);

  useEffect(() => {
    const sub = AppState.addEventListener('change', (nextState) => {
      if (nextState !== 'active') return;
      if (phase !== 'question') return;
      const startedAt = questionStartedAtRef.current;
      if (startedAt == null) return;
      const left = Math.max(0, QUESTION_TIME_MS - (Date.now() - startedAt));
      const displaySec = Math.ceil(left / 1000) || 0;
      if (lastShownSecRef.current !== displaySec) {
        lastShownSecRef.current = displaySec;
        setTimeLeft(left);
      }
      if (left > 0 || hasAnsweredRef.current) return;
      hasAnsweredRef.current = true;
      setHasAnswered(true);
      setMyAnswer(null);
      clearAll();
      clearBotTimer();
      goToReveal(qIndexRef.current);
    });
    return () => sub.remove();
  }, [phase, goToReveal]);

  const startFirstQuestion = useCallback(() => {
    if (startedRef.current) return;
    startedRef.current = true;
    setPhase('question');
    setQIndex(0);
    setMyAnswer(null);
    hasAnsweredRef.current = false;
    setHasAnswered(false);
    setTimeLeft(QUESTION_TIME_MS);
    startQuestionTimer();
    scheduleBotAnswer(0, () => goToReveal(0));
  }, [startQuestionTimer, scheduleBotAnswer, goToReveal]);

  useEffect(() => {
    if (!loaded) return;
    setPhase('countdown');
    setCountdown(COUNTDOWN_FROM);
    if (!matchStartedLogRef.current) {
      matchStartedLogRef.current = true;
      logEvent('arena_match_bot_started', {
        player_rank_idx: playerRankIndex,
        bot_accuracy: Math.round(botProfile.accuracy * 100),
        bot_base_delay_ms: Math.round(botProfile.baseDelayMs),
      });
    }
    let tick = COUNTDOWN_FROM;
    const id = setInterval(() => {
      tick -= 1;
      setCountdown(tick);
      if (tick <= 0) {
        clearInterval(id);
        startFirstQuestion();
      }
    }, 1000);
    return () => { clearInterval(id); };
  }, [loaded, startFirstQuestion, botProfile, playerRankIndex]);

  useEffect(() => {
    if (phase !== 'finished' || matchFinishedLogRef.current) return;
    matchFinishedLogRef.current = true;
    const myScore = scores[userId] ?? 0;
    const botScore = scores.bot1 ?? 0;
    logEvent('arena_match_bot_finished', {
      player_rank_idx: playerRankIndex,
      bot_accuracy: Math.round(botProfile.accuracy * 100),
      won: myScore > botScore ? 1 : 0,
      is_draw: myScore === botScore ? 1 : 0,
      my_score: myScore,
      bot_score: botScore,
    });
  }, [phase, scores, userId, botProfile, playerRankIndex]);

  useEffect(() => {
    if (!loaded) return;
    if (phase !== 'countdown') return;
    if (countdown > 0) return;
    startFirstQuestion();
  }, [loaded, phase, countdown, startFirstQuestion]);

  const submitAnswer = useCallback((answer: string, bonusTotal = 0) => {
    if (hasAnsweredRef.current) return;
    hasAnsweredRef.current = true;

    const idx = qIndexRef.current;
    const q = questionsRef.current[idx];
    if (!q) return;

    const isCorrect = answer === q.correct;
    const points = isCorrect ? SCORE_CONFIG.correctBase + bonusTotal : 0;

    setMyAnswer(answer);
    setHasAnswered(true);
    setScores(prev => ({ ...prev, [userId]: (prev[userId] ?? 0) + points }));

    if (botAnsweredRef.current) goToReveal(idx);
  }, [userId, goToReveal]);

  useEffect(() => () => { clearAll(); clearBotTimer(); }, []);

  const currentQuestion = questions[qIndex] ?? null;

  const players: SessionPlayer[] = [
    { sessionId: 'mock', playerId: userId, score: scores[userId] ?? 0, answers: [], displayName: arenaScoreboardYou(lang) },
    { sessionId: 'mock', playerId: 'opponent1', score: scores.bot1 ?? 0, answers: [], displayName: mockBotDisplayName, avatarLevel: botAvatarLevel },
  ];

  const submitMyAnswer = async (answer: string) => { submitAnswer(answer); };

  return {
    phase, countdown, questionTimeLeft, questionStartedAt,
    questionTimeoutMs: QUESTION_TIME_MS,
    currentQuestion,
    currentQuestionIndex: qIndex,
    totalQuestions: questions.length,
    players, myAnswer, hasAnswered,
    myScore: scores[userId] ?? 0,
    opponentForfeited: false,
    submitAnswer,
    submitMyAnswer,
    submitLobbyChoice: async () => {},
    acceptDeadlineAt: undefined,
    getReadyEndsAt: undefined,
    abortReason: undefined,
    myLobbyChoice: undefined,
    sessionType: undefined,
  } satisfies UseDuelMockResult;
}
