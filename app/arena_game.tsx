import { useStableSafeAreaInsets } from './stable_safe_area_metrics';
import React, { useEffect, useRef, useState, useMemo, useCallback } from 'react';
import {
  AppState, View, Text, TouchableOpacity, StyleSheet, Animated, Pressable, useWindowDimensions,
  InteractionManager, BackHandler, Platform,
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
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useTheme } from '../components/ThemeContext';
import { useLang } from '../components/LangContext';
import ReportErrorButton from '../components/ReportErrorButton';
import TapScale from '../components/TapScale';
import ScreenGradient from '../components/ScreenGradient';
import BounceView from '../components/BounceView';
import ArenaMatchBackdrop from '../components/ArenaMatchBackdrop';
import AvatarView from '../components/AvatarView';
import ArenaDuelEmojiReact from '../components/ArenaDuelEmojiReact';
import { ArenaDuelFlyingEmojiOverlay, type ArenaDuelFlyEmoji } from '../components/ArenaDuelFlyingEmoji';
import { useArenaSession } from '../hooks/use-arena-session';
import { useDuelMock } from '../hooks/use-arena-mock';
import { useArenaRoomRun } from '../hooks/use-arena-room-run';
import { useArenaRank } from '../hooks/use-arena-rank';
import { getLevelFromXP } from '../constants/theme';
import { monoIcon, MONO_ICON } from '../constants/monoIcon';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SCORE_CONFIG, QUESTIONS_PER_MATCH, type SessionPlayer } from './types/arena';
import { hapticError, hapticMediumImpact, hapticSuccess, hapticTap } from '../hooks/use-haptics';
import { normalizeSafeAreaBottomInset } from '../hooks/use-screen';
import { useRuntimeActive } from '../hooks/use_runtime_active';
import { useCorrectSound } from '../hooks/use-correct-sound';
import DuoPressable from '../components/DuoPressable';
import { IS_EXPO_GO } from './config';
import { actionToastTri, emitAppEvent } from './events';
import { logArenaDirectGateBlocked, logEvent } from './firebase';
import { consumeArenaGameEntry } from './arena_access_gate';
import { markNextNavigationAsReplace } from './navigation_back';
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
  arenaOpponentReactToast,
} from '../constants/arena_i18n';
import { isArenaDuelReactionEmoji, randomArenaDuelReactionEmoji } from '../constants/arena_duel_reaction_emojis';
import { sendArenaDuelReact } from './services/arena_db';
import ArenaFinalScoreOverlay from '../components/ArenaFinalScoreOverlay';
import {
  hasOpponentAnswered,
  isLastQuestionDrama,
  resolveMatchOutcome,
} from './arena_match_drama';
import { pickRandomBotNameForLang } from './constants/bot_names';
import { triLang, type Lang } from '../constants/i18n';
import { ensureArenaAuthUid } from './user_id_policy';

function mockOpponentDisplayName(opp: SessionPlayer | undefined, lang: Lang): string {
  const dn = opp?.displayName?.trim();
  if (dn) return dn;
  return pickRandomBotNameForLang(lang);
}

/** Сколько держим финальный экран матча (счёт X:Y) перед переходом в результаты. */
const FINAL_OVERLAY_MS = 1200;

export default function DuelGameScreen() {
  const arenaGameRuntimeActive = useRuntimeActive();
  // H9: sessionId/userId были объявлены как `string`, но Expo Router отдаёт `undefined`
  // на deep link без params → скрытые TypeError при .startsWith/.slice ниже. Делаем optional.
  const { sessionId, userId: paramUserId, fromLobby, ghostChallengeId: routeGhostChallengeId, hillMode, roomCode } = useLocalSearchParams<{
    sessionId?: string; userId?: string; fromLobby?: string; ghostChallengeId?: string; hillMode?: string; roomCode?: string;
  }>();
  const fromLobbyFlow = fromLobby === '1';
  const router = useRouter();
  const { playCorrect } = useCorrectSound();
  const insets = useStableSafeAreaInsets();
  const bottomInset = normalizeSafeAreaBottomInset(insets.bottom);
  const { width: winW, height: winH } = useWindowDimensions();
  const { theme: t, f, themeMode } = useTheme();
  const { lang } = useLang();

  const [resolvedUserId, setResolvedUserId] = useState(paramUserId ?? '');
  const [entryAllowed, setEntryAllowed] = useState(false);

  const [acceptTimeTick, setAcceptTimeTick] = useState(0);
  const premeetScale = useSharedValue(1);
  const premeetTextStyle = useAnimatedStyle(() => ({
    transform: [{ scale: premeetScale.value }],
  }));

  const legacyGhostLink = !!routeGhostChallengeId || (typeof sessionId === 'string' && sessionId.startsWith('ghost_'));
  const useHill = hillMode === '1' || (typeof sessionId === 'string' && sessionId.startsWith('bot_hill_'));
  const cleanRoomCode = String(roomCode || (typeof sessionId === 'string' && sessionId.startsWith('room_') ? sessionId.slice('room_'.length) : '')).trim().toUpperCase();
  const useRoom = !!cleanRoomCode;
  const useBotMock = !legacyGhostLink && !useRoom && (IS_EXPO_GO || sessionId?.startsWith('bot_'));
  const useMock = useBotMock || useRoom;
  useEffect(() => {
    let cancelled = false;
    const task = InteractionManager.runAfterInteractions(() => {
      void (async () => {
      if (legacyGhostLink) {
        emitAppEvent('action_toast', actionToastTri('info', {
          ru: 'Этот режим больше недоступен.',
          uk: 'Цей режим більше недоступний.',
          es: 'Este modo ya no está disponible.',
          'pt-BR': 'Este modo não está mais disponível.',
          vi: 'Chế độ này không còn khả dụng.',
          id: 'Mode ini tidak lagi tersedia.',
          tr: 'Bu mod artık kullanılamıyor.',
          pl: 'Ten tryb nie jest już dostępny.',
        }));
        router.replace('/(tabs)/arena' as any);
        return;
      }
      const allowed = await consumeArenaGameEntry(String(sessionId || ''));
      if (cancelled) return;
      if (!allowed) {
        logArenaDirectGateBlocked(String(sessionId || ''));
        emitAppEvent('action_toast', actionToastTri('info', {
          ru: 'Открой матч через Арену.',
          uk: 'Відкрий матч через Арену.',
          es: 'Abre la partida desde Arena.',
          'pt-BR': 'Abra a partida pela Arena.',
          vi: 'Hãy mở trận đấu từ Đấu trường.',
          id: 'Buka pertandingan melalui Arena.',
          tr: 'Maçı Arena üzerinden aç.',
          pl: 'Otwórz mecz przez Arenę.',
        }));
        router.replace('/(tabs)/arena' as any);
        return;
      }
      setEntryAllowed(true);
      })();
    });
    return () => { cancelled = true; task.cancel(); };
  }, [legacyGhostLink, router, sessionId]);

  useEffect(() => {
    if (paramUserId) {
      setResolvedUserId(paramUserId);
      return;
    }
    if (!useRoom) return;
    let cancelled = false;
    void ensureArenaAuthUid().then((uid) => {
      if (!cancelled && uid) setResolvedUserId(uid);
    });
    return () => { cancelled = true; };
  }, [paramUserId, useRoom]);
  const userId = resolvedUserId;

  // Для бота: сложность и аватар выбираются из ранга/уровня игрока. Загружаем
  // из тех же источников, что и остальной UI арены (arena_profiles + totalXP).
  const myRank = useArenaRank();
  const [playerLevel, setPlayerLevel] = useState<number>(1);
  useEffect(() => {
    if (!useBotMock) return;
    let cancelled = false;
    (async () => {
      const raw = await AsyncStorage.getItem('user_total_xp').catch(() => null);
      const xp = raw ? Number(raw) || 0 : 0;
      if (!cancelled) setPlayerLevel(getLevelFromXP(xp));
    })();
    return () => { cancelled = true; };
  }, [useBotMock]);

  const realSession = useArenaSession(useMock ? '' : (sessionId ?? ''), useMock ? '' : (userId ?? ''));
  const mockSession = useDuelMock(userId, myRank.rankIndex, playerLevel);
  const roomSession = useArenaRoomRun(cleanRoomCode, userId);

  const session = useRoom ? roomSession : useBotMock ? mockSession : realSession;
  const {
    phase, countdown, questionTimeLeft, currentQuestion,
    currentQuestionIndex, totalQuestions,
    players, hasAnswered,
    myAnswer, opponentForfeited,
    submitLobbyChoice, acceptDeadlineAt, myLobbyChoice, abortReason,
    sessionType,
  } = session;
  const isDirectDuel = !useRoom && (sessionType === 'private' || sessionType === 'rematch');

  const phaseRef = useRef(phase);
  phaseRef.current = phase;

  const acceptSecLeft = useMemo(() => {
    if (typeof acceptDeadlineAt !== 'number' || phase !== 'acceptance') return null;
    return Math.max(0, Math.ceil((acceptDeadlineAt - Date.now()) / 1000));
  // eslint-disable-next-line react-hooks/exhaustive-deps -- acceptTimeTick: тик таймера
  }, [acceptDeadlineAt, phase, acceptTimeTick]);

  useEffect(() => {
    if (phase !== 'acceptance') return;
    const id = setInterval(() => setAcceptTimeTick((n) => n + 1), 1000);
    const sub = AppState.addEventListener('change', (nextState) => {
      if (nextState !== 'active') clearInterval(id);
    });
    return () => {
      clearInterval(id);
      sub.remove();
    };
  }, [phase]);

  // Android: системный «Назад» посреди живого матча = тот же диалог сдачи,
  // что и экранная кнопка выхода. Раньше back мгновенно уходил с экрана без
  // записи forfeit — соперник зависал в матче, ставка не разрешалась.
  useEffect(() => {
    if (Platform.OS !== 'android') return;
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      const p = phaseRef.current;
      const liveMatch = p === 'question' || p === 'reveal' || p === 'countdown';
      if (!liveMatch) return false; // лобби/финиш/абор — обычное поведение back
      // Открыт диалог — back закрывает его (продолжить матч), иначе открывает.
      setShowExitConfirm((visible) => !visible);
      return true;
    });
    return () => sub.remove();
  }, []);

  useEffect(() => {
    if (!arenaGameRuntimeActive || phase !== 'premeet') {
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
  }, [arenaGameRuntimeActive, phase, premeetScale]);

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
  const prevQuestionIndexRef = useRef(currentQuestionIndex);
  // Индекс вопроса, на который реально дали ответ (для отличия таймаута от нормального перехода)
  const answeredQuestionIndexRef = useRef<number>(-1);
  const correctStreakRef = useRef(0);
  const firstCorrectDone = useRef(false);
  const myCorrectRef = useRef(0);
  const myTotalRef = useRef(0);
  const myBonusBreakdown = useRef({ speed: 0, streak: 0, first: 0, outspeed: 0 });
  const reviewDataRef = useRef<{
    question: string;
    options: string[];
    correct: string;
    myAnswer: string | null;
    rule: string;
    questionId: string;
    level: string;
    type?: string;
    timeMs?: number;
    points?: number;
  }[]>([]);

  const [mockReactByPlayer, setMockReactByPlayer] = useState<Record<string, { at: number; emoji: string }>>({});
  const mockBotReactTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  /** Раз за мок-матч: с 5% шансом бот сам отправит эмодзи (таймер без cleanup при смене фазы). */
  const mockBotSpontaneousTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mockSpontaneousRollDoneRef = useRef(false);
  /** Сколько раз игрок отправил реакцию в мок-матче (для ступенчатой вероятности ответа бота). */
  const mockUserEmojiSendCountRef = useRef(0);
  const lastOppReactAtRef = useRef<number>(-1);
  const [flyEmojis, setFlyEmojis] = useState<ArenaDuelFlyEmoji[]>([]);
  const pushFlyEmoji = useCallback((emoji: string, from: 'self' | 'opponent') => {
    const key = `fly_${Date.now()}_${from}_${emoji}`;
    setFlyEmojis((xs) => [...xs, { key, emoji, from }]);
  }, []);
  const removeFlyEmoji = useCallback((key: string) => {
    setFlyEmojis((xs) => xs.filter((x) => x.key !== key));
  }, []);

  const effectivePlayers = useMemo(() => {
    if (!useMock) return players;
    return players.map((p) => {
      const m = mockReactByPlayer[p.playerId];
      if (!m) return p;
      return { ...p, arenaReactEmoji: m.emoji, arenaReactAt: m.at };
    });
  }, [players, useMock, mockReactByPlayer]);

  // ─── ДРАМА МАТЧА ───────────────────────────────────────────────────────────
  const meScore = useMemo(
    () => effectivePlayers.find((p) => p.playerId === userId)?.score ?? 0,
    [effectivePlayers, userId],
  );
  const oppPlayer = useMemo(
    () => effectivePlayers.find((p) => p.playerId !== userId) ?? null,
    [effectivePlayers, userId],
  );
  const oppScore = oppPlayer?.score ?? 0;

  /** Соперник сдал ответ на текущий вопрос → подсветка в табло. */
  const opponentAnswered = hasOpponentAnswered(oppPlayer, currentQuestionIndex);
  /** Решающий последний вопрос при близком счёте. */
  const lastQuestionDrama =
    phase === 'question' &&
    isLastQuestionDrama({
      currentQuestionIndex,
      totalQuestions: totalQuestions || QUESTIONS_PER_MATCH,
      myScore: meScore,
      opponentScore: oppScore,
      closeThreshold: SCORE_CONFIG.correctBase,
    });

  /** Пульс счёта при его изменении (золото для меня, красный для соперника). */
  const myScorePulse = useSharedValue(1);
  const oppScorePulse = useSharedValue(1);
  const prevMyScoreRef = useRef(meScore);
  const prevOppScoreRef = useRef(oppScore);
  useEffect(() => {
    if (meScore > prevMyScoreRef.current) {
      myScorePulse.value = withSequence(
        withTiming(1.28, { duration: 160, easing: Easing.out(Easing.quad) }),
        withTiming(1, { duration: 220, easing: Easing.inOut(Easing.ease) }),
      );
    }
    prevMyScoreRef.current = meScore;
  }, [meScore, myScorePulse]);
  useEffect(() => {
    if (oppScore > prevOppScoreRef.current) {
      oppScorePulse.value = withSequence(
        withTiming(1.28, { duration: 160, easing: Easing.out(Easing.quad) }),
        withTiming(1, { duration: 220, easing: Easing.inOut(Easing.ease) }),
      );
    }
    prevOppScoreRef.current = oppScore;
  }, [oppScore, oppScorePulse]);
  const myScorePulseStyle = useAnimatedStyle(() => ({ transform: [{ scale: myScorePulse.value }] }));
  const oppScorePulseStyle = useAnimatedStyle(() => ({ transform: [{ scale: oppScorePulse.value }] }));

  /** Финальный экран матча перед переходом на результаты. */
  const [finalOverlay, setFinalOverlay] = useState<{ my: number; opp: number } | null>(null);
  /** Хаптик-пульс при наступлении решающего вопроса (один раз). */
  const dramaPulsedRef = useRef(false);
  useEffect(() => {
    if (lastQuestionDrama && !dramaPulsedRef.current) {
      dramaPulsedRef.current = true;
      void hapticMediumImpact();
    }
    if (!lastQuestionDrama) dramaPulsedRef.current = false;
  }, [lastQuestionDrama]);

  useEffect(() => {
    lastOppReactAtRef.current = -1;
    setFlyEmojis([]);
    mockUserEmojiSendCountRef.current = 0;
    setMockReactByPlayer({});
    if (mockBotReactTimerRef.current) {
      clearTimeout(mockBotReactTimerRef.current);
      mockBotReactTimerRef.current = null;
    }
    if (mockBotSpontaneousTimerRef.current) {
      clearTimeout(mockBotSpontaneousTimerRef.current);
      mockBotSpontaneousTimerRef.current = null;
    }
    mockSpontaneousRollDoneRef.current = false;
  }, [sessionId]);

  useEffect(() => {
    const opp = effectivePlayers.find((p) => p.playerId !== userId);
    if (!opp) return;
    const at = typeof opp.arenaReactAt === 'number' ? opp.arenaReactAt : null;
    const em = typeof opp.arenaReactEmoji === 'string' ? opp.arenaReactEmoji : '';
    if (at == null || at <= 0 || !em) return;
    if (at === lastOppReactAtRef.current) return;
    lastOppReactAtRef.current = at;
    pushFlyEmoji(em, 'opponent');
    const dn = opp.displayName?.replace(/\s+/g, ' ').trim();
    const nameForToast =
      dn ||
      (useMock ? mockOpponentDisplayName(opp, lang) : triLang(lang, {
        ru: 'Игрок',
        uk: 'Гравець',
        es: 'Jugador',
        'pt-BR': 'Jogador',
        vi: 'Người chơi',
        id: 'Pemain',
        tr: 'Oyuncu',
        pl: 'Gracz',
      }));
    emitAppEvent('action_toast', arenaOpponentReactToast(nameForToast, em));
  }, [effectivePlayers, userId, lang, useMock, pushFlyEmoji]);

  useEffect(() => () => {
    if (mockBotReactTimerRef.current) clearTimeout(mockBotReactTimerRef.current);
    if (mockBotSpontaneousTimerRef.current) clearTimeout(mockBotSpontaneousTimerRef.current);
  }, []);

  /** Мок: один бросок за матч — с 5% шансом бот через случайную задержку сам отправит эмодзи. */
  useEffect(() => {
    if (!useMock) return;
    if (mockSpontaneousRollDoneRef.current) return;
    if (phase !== 'question') return;
    mockSpontaneousRollDoneRef.current = true;
    if (Math.random() >= 0.05) return;
    const delayMs = 4000 + Math.random() * 26000;
    mockBotSpontaneousTimerRef.current = setTimeout(() => {
      mockBotSpontaneousTimerRef.current = null;
      const ph = phaseRef.current;
      if (ph !== 'question' && ph !== 'reveal') return;
      const botEmoji = randomArenaDuelReactionEmoji();
      setMockReactByPlayer((prev) => ({
        ...prev,
        opponent1: { at: Date.now(), emoji: botEmoji },
      }));
      logEvent('arena_duel_react_mock_spontaneous', { emoji: botEmoji });
    }, delayMs);
  }, [useMock, phase, sessionId]);

  const handleDuelReact = useCallback(
    async (emoji: string) => {
      if (useMock) {
        pushFlyEmoji(emoji, 'self');
        setMockReactByPlayer((prev) => ({ ...prev, [userId]: { at: Date.now(), emoji } }));
        logEvent('arena_duel_react_sent', { mock: 1, emoji });
        if (mockBotReactTimerRef.current) clearTimeout(mockBotReactTimerRef.current);
        mockUserEmojiSendCountRef.current += 1;
        const n = mockUserEmojiSendCountRef.current;
        const replyChance = n === 1 ? 0.8 : n === 2 ? 0.6 : n === 3 ? 0.4 : 0.2;
        mockBotReactTimerRef.current = setTimeout(() => {
          mockBotReactTimerRef.current = null;
          if (Math.random() >= replyChance) return;
          // «В попад»: чаще зеркалим твой эмодзи, иначе случайный из списка.
          const mirrorOk = isArenaDuelReactionEmoji(emoji) && Math.random() < 0.82;
          const botEmoji = mirrorOk ? emoji : randomArenaDuelReactionEmoji();
          setMockReactByPlayer((prev) => ({
            ...prev,
            opponent1: { at: Date.now(), emoji: botEmoji },
          }));
        }, 4000 + Math.random() * 11000);
        return;
      }
      if (!sessionId || !userId) return; // H9: defensive guard
      try {
        await sendArenaDuelReact(sessionId, userId, emoji);
        pushFlyEmoji(emoji, 'self');
        logEvent('arena_duel_react_sent', { mock: 0, emoji });
      } catch {
        emitAppEvent('action_toast', { type: 'error', ...arenaToasts.duelReactSendFail });
        throw new Error('arena duel react');
      }
    },
    [useMock, userId, sessionId, pushFlyEmoji],
  );

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
    const sub = AppState.addEventListener('change', (nextState) => {
      if (nextState !== 'active') return;
      if (phase !== 'question' || !qid) return;
      const timeoutMs = qTimeout;
      const started = qStartedForAnimRef.current;
      const durationMs = started != null
        ? Math.max(0, timeoutMs - (Date.now() - started))
        : Math.max(0, questionTimeLeft);
      const startFraction = timeoutMs > 0
        ? Math.min(1, Math.max(0, durationMs / timeoutMs))
        : 0;
      cancelAnimation(barProgress);
      barProgress.value = startFraction;
      if (durationMs <= 0) return;
      barProgress.value = withTiming(0, {
        duration: Math.max(200, durationMs),
        easing: Easing.linear,
      });
    });
    return () => sub.remove();
  }, [phase, qid, qTimeout, questionTimeLeft, barProgress]);

  // Дружеский матч (type=private): автоматически принять без экрана "ИГРА НАЙДЕНА"
  const autoAcceptedRef = useRef(false);
  useEffect(() => {
    if (useMock || sessionType !== 'private') return;
    if (phase !== 'acceptance') return;
    if (myLobbyChoice === 'accept' || myLobbyChoice === 'decline') return;
    if (autoAcceptedRef.current) return;
    autoAcceptedRef.current = true;
    void submitLobbyChoice('accept');
  }, [phase, sessionType, myLobbyChoice, submitLobbyChoice, useMock]);

  const finalNavTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (phase === 'finished') {
      // Финальный экран матча: показываем счёт ~1.2с, потом уходим в результаты.
      // Это даёт МОМЕНТ победы/поражения вместо мгновенного прыжка.
      const me = effectivePlayers.find((p) => p.playerId === userId);
      const opp = effectivePlayers.find((p) => p.playerId !== userId);
      const myFinal = me?.score ?? meScore;
      const oppFinal = opp?.score ?? oppScore;
      if (!finalOverlay && finalNavTimerRef.current == null) {
        setFinalOverlay({ my: myFinal, opp: oppFinal });
        const outcome = resolveMatchOutcome(myFinal, oppFinal);
        if (outcome === 'win') void hapticSuccess();
        else if (outcome === 'loss') void hapticMediumImpact();
      }
      const params: Record<string, string> = {
        sessionId: sessionId ?? '',
        userId: userId ?? '',
        opponentForfeited: opponentForfeited ? '1' : '0',
        rankedArena: fromLobbyFlow ? '1' : '0',
      };
      if (useHill) {
        params.hillMode = '1';
        params.rankedArena = '0';
      }
      if (useRoom) {
        params.roomCode = cleanRoomCode;
        params.rankedArena = '0';
      }
      // For bot/mock sessions pass scores directly — no Firestore docs exist
      if (useMock) {
        const me = players.find(p => p.playerId === userId);
        const opp = players.find(p => p.playerId !== userId);
        params.mockMyScore   = String(me?.score  ?? 0);
        params.mockOppScore  = String(opp?.score ?? 0);
        params.mockOppName   = mockOpponentDisplayName(opp, lang);
        params.mockMyCorrect = String(myCorrectRef.current);
        params.mockMyTotal   = String(myTotalRef.current);
        params.mockBonusSpeed   = String(myBonusBreakdown.current.speed);
        params.mockBonusStreak  = String(myBonusBreakdown.current.streak);
        params.mockBonusFirst   = String(myBonusBreakdown.current.first);
        params.mockBonusOutspeed = String(myBonusBreakdown.current.outspeed);
        params.mockReviewData = JSON.stringify(reviewDataRef.current);
      }
      // Уходим в результаты после финального экрана (один раз).
      if (finalNavTimerRef.current == null) {
        finalNavTimerRef.current = setTimeout(() => {
          // Игра завершена → свапаем экран игры на результаты. Без пометки replace
          // экран игры остаётся в честном стеке, и «назад» с результатов вернул бы
          // на уже завершённую игровую сессию → петля.
          markNextNavigationAsReplace();
          router.replace({ pathname: '/arena_results', params });
        }, FINAL_OVERLAY_MS);
      }
    }
    return () => {
      if (phase !== 'finished' && finalNavTimerRef.current != null) {
        clearTimeout(finalNavTimerRef.current);
        finalNavTimerRef.current = null;
      }
    };
  }, [cleanRoomCode, fromLobbyFlow, lang, opponentForfeited, phase, players, router, sessionId, useHill, useMock, useRoom, userId]);

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
    const isCorrect = option === currentQuestion.correct;
    // Ответ несёт результат: успех на верном, ошибка на неверном
    // (раньше был одинаковый medium-impact на любой ответ).
    if (isCorrect) void hapticSuccess(); else void hapticError();
    const to = session.questionTimeoutMs ?? 40_000;
    const st = session.questionStartedAt;
    const elapsed = st != null
      ? Math.min(to, Math.max(0, Date.now() - st))
      : Math.max(0, to - questionTimeLeft);

    myTotalRef.current += 1;
    answeredQuestionIndexRef.current = currentQuestionIndex;
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
      questionId: currentQuestion.id,
      level: currentQuestion.level,
      timeMs: elapsed,
      points: isCorrect ? SCORE_CONFIG.correctBase + speedBonus + streakBonus + firstBonus + outspeedBonus : 0,
      ...(currentQuestion.type ? { type: currentQuestion.type } : {}),
    });

    if (isCorrect) {
      playCorrect();
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
      (session as typeof mockSession | typeof roomSession).submitAnswer(option, bonusTotal);
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
    const params: Record<string, string> = {
      sessionId: sessionId ?? '',
      userId: userId ?? '',
      forfeited: '1',
      opponentForfeited: '0',
      rankedArena: fromLobbyFlow ? '1' : '0',
    };
    if (useHill) {
      params.hillMode = '1';
      params.rankedArena = '0';
    }
    if (useRoom) {
      params.roomCode = cleanRoomCode;
      params.rankedArena = '0';
    }
    if (useMock) {
      const me = players.find((p) => p.playerId === userId);
      const opp = players.find((p) => p.playerId !== userId);
      params.mockMyScore = String(me?.score ?? 0);
      params.mockOppScore = String(opp?.score ?? 0);
      params.mockOppName = mockOpponentDisplayName(opp, lang);
      params.mockMyCorrect = String(myCorrectRef.current);
      params.mockMyTotal = String(myTotalRef.current);
      params.mockBonusSpeed = String(myBonusBreakdown.current.speed);
      params.mockBonusStreak = String(myBonusBreakdown.current.streak);
      params.mockBonusFirst = String(myBonusBreakdown.current.first);
      params.mockBonusOutspeed = String(myBonusBreakdown.current.outspeed);
      params.mockReviewData = JSON.stringify(reviewDataRef.current);
    }
    // Сдача/форфейт → результаты «вместо» игры (свап, не push).
    markNextNavigationAsReplace();
    router.replace({ pathname: '/arena_results', params });
  };

  useEffect(() => {
    if (prevPhase.current !== 'question' && phase === 'question') {
      logEvent('arena_question_shown', {
        q_idx: currentQuestionIndex + 1,
        total_q: totalQuestions || 0,
        is_mock: useMock ? 1 : 0,
      });
    }
    // Если вопрос сменился, а на предыдущий вопрос ответа не было (таймаут) — сбрасываем streak.
    // Сравниваем именно индекс отвеченного вопроса, а не hasAnswered (тот успевает сброситься
    // в false к моменту смены индекса и при нормальном переходе обнулял бы серию ошибочно).
    if (
      currentQuestionIndex !== prevQuestionIndexRef.current &&
      answeredQuestionIndexRef.current !== prevQuestionIndexRef.current
    ) {
      correctStreakRef.current = 0;
    }
    prevQuestionIndexRef.current = currentQuestionIndex;
    prevPhase.current = phase;
  }, [currentQuestionIndex, phase, totalQuestions, useMock]);

  if (!entryAllowed || phase === 'loading') {
    return (
      <ScreenGradient>
        <ArenaMatchBackdrop variant="ready" />
        <View style={styles.centered}>
          <Text style={[styles.countdownHint, { color: t.textMuted, fontSize: f.body }]} />
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

  if (phase === 'acceptance' && !useMock && !isDirectDuel) {
    const lobbyDone = myLobbyChoice === 'accept' || myLobbyChoice === 'decline';

    if (fromLobbyFlow && myLobbyChoice === 'accept') {
      return (
        <ScreenGradient>
          <ArenaMatchBackdrop variant="ready" />
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
          <ArenaMatchBackdrop variant="ready" />
          <SafeAreaView style={{ flex: 1 }} edges={['top', 'bottom']}>
            <View style={styles.arenaAcceptRoot}>
              <Text style={[{ color: t.accent, fontWeight: '900', fontSize: 16, letterSpacing: 1.2, textAlign: 'center' }]}>
                {arenaGameStr(lang, 'gameFound')}
              </Text>
            </View>
          </SafeAreaView>
        </ScreenGradient>
      );
    }

    if (!fromLobbyFlow && !lobbyDone) {
      return (
        <ScreenGradient>
          <ArenaMatchBackdrop variant="ready" />
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
                <DuoPressable
                  withHaptic={false}
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
                  edgeColor={t.accent}
                  wrapStyle={{ flex: 1 }}
                  style={[styles.chipAccept, { backgroundColor: t.accent, flex: 0 }]}
                >
                  <Ionicons name="checkmark-circle" size={22} color={t.correctText} />
                  <Text style={{ color: t.correctText, fontWeight: '900', fontSize: f.body }}>
                    {arenaGameStr(lang, 'accept')}
                  </Text>
                </DuoPressable>
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
          <ArenaMatchBackdrop variant="ready" />
          <SafeAreaView style={{ flex: 1 }} edges={['top', 'bottom']}>
            <View style={styles.arenaAcceptRoot}>
              <Text style={[{ color: t.accent, fontWeight: '900', fontSize: 16, letterSpacing: 1.2, textAlign: 'center' }]}>
                {arenaGameStr(lang, 'gameFound')}
              </Text>
            </View>
          </SafeAreaView>
        </ScreenGradient>
      );
    }
    return null;
  }

  if (phase === 'premeet' && !useMock && !isDirectDuel) {
    return (
      <ScreenGradient>
        <ArenaMatchBackdrop variant="ready" />
        <View style={styles.premeetFull}>
          <Reanimated.View style={premeetTextStyle}>
            <Text
              style={[
                styles.premeetH1,
                { color: t.textPrimary, fontSize: Math.min(44, Math.max(30, winW / 9.2)), fontWeight: '900', textAlign: 'center' },
              ]}
              numberOfLines={1}
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
        <ArenaMatchBackdrop variant="ready" />
        <View style={styles.countdownStage}>
          <Text style={[styles.getReady, { color: t.textMuted, fontSize: f.sub }]}>
            {arenaGameStr(lang, 'letsGo')}
          </Text>
          <Text style={[styles.countdownNum, { color: t.accent, textShadowColor: 'rgba(0,0,0,0.35)' }]} numberOfLines={1}>
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
      <ArenaMatchBackdrop variant="match" />
      <View style={{ flex: 1 }}>
      <SafeAreaView style={{ flex: 1 }} edges={['top', 'bottom']}>
      <BounceView style={{ flex: 1 }}>
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
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <ReportErrorButton
            variant="icon-flag"
            screen="arena_game"
            dataId={`arena_live_${typeof sessionId === 'string' ? sessionId : 'session'}_q${currentQuestionIndex}`}
            dataText={arenaBilingualFirst(currentQuestion.question, lang)}
            accessibilityLabel={triLang(lang, {
              ru: 'Сообщить о проблеме в вопросе арены',
              uk: 'Повідомити про проблему в питанні арени',
              es: 'Informar de un problema en la pregunta',
              'pt-BR': 'Informar um problema na pergunta da Arena',
              vi: 'Báo lỗi trong câu hỏi Arena',
              id: 'Laporkan masalah pada pertanyaan Arena',
              tr: 'Arena sorusundaki bir sorunu bildir',
              pl: 'Zgłoś problem w pytaniu Areny',
            })}
          />
          <TapScale onPress={() => setShowExitConfirm(true)} style={styles.exitBtn}>
            <Ionicons name="close" size={22} color={t.textMuted} />
          </TapScale>
        </View>
        {effectivePlayers.slice(0, 2).map((p, idx) => {
          const isMe = p.playerId === userId;
          // Соперник уже сдал ответ на текущий вопрос → зелёная галочка-точка.
          const showAnswered = !isMe && phase === 'question' && opponentAnswered;
          return (
            <View key={p.playerId} style={[styles.playerChip, isMe && { borderBottomWidth: 2, borderBottomColor: t.accent }]}>
              <View style={styles.playerNameRow}>
                <AvatarView avatar={p.avatar ?? String(p.avatarLevel ?? 1)} size={22} auraId={p.aura} />
                <Text style={[styles.playerLabel, { color: isMe ? t.accent : t.textMuted, fontSize: f.caption }]} numberOfLines={1}>
                  {p.displayName ?? (isMe ? arenaScoreboardYou(lang) : triLang(lang, {
                    ru: `Игрок ${idx + 1}`,
                    uk: `Гравець ${idx + 1}`,
                    es: `Jugador ${idx + 1}`,
                    'pt-BR': `Jogador ${idx + 1}`,
                    vi: `Người chơi ${idx + 1}`,
                    id: `Pemain ${idx + 1}`,
                    tr: `Oyuncu ${idx + 1}`,
                    pl: `Gracz ${idx + 1}`,
                  }))}
                </Text>
                {showAnswered ? (
                  <View style={[styles.answeredDot, { backgroundColor: t.correct }]}>
                    <Ionicons name="checkmark" size={10} color={monoIcon(themeMode, '#06210F', MONO_ICON.onLight)} />
                  </View>
                ) : null}
              </View>
              <Reanimated.View style={isMe ? myScorePulseStyle : oppScorePulseStyle}>
                <Text style={[styles.playerScore, { color: t.textPrimary, fontSize: f.body }]}>
                  {p.score}
                </Text>
              </Reanimated.View>
            </View>
          );
        })}
      </View>

      {/* Решающий вопрос: баннер драмы */}
      {lastQuestionDrama ? (
        <View style={[styles.dramaBanner, { backgroundColor: t.wrongBg, borderColor: t.wrong }]}>
          <Ionicons name="flame" size={14} color={t.wrong} />
          <Text style={[styles.dramaBannerText, { color: t.wrong, fontSize: f.caption }]}>
            {triLang(lang, {
              ru: 'Решающий вопрос!',
              uk: 'Вирішальне питання!',
              es: '¡Pregunta decisiva!',
              'pt-BR': 'Pergunta decisiva!',
              vi: 'Câu hỏi quyết định!',
              id: 'Pertanyaan penentu!',
              tr: 'Belirleyici soru!',
              pl: 'Decydujące pytanie!',
            })}
          </Text>
        </View>
      ) : null}

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
              style={[styles.optionBtn, { backgroundColor: bg, borderColor: border }, hasAnswered && { opacity: 0.5 }]}
            >
              <View style={[styles.optionLetter, { backgroundColor: t.bgSurface2 }]}>
                <Text style={[{ color: t.textMuted, fontSize: f.caption, fontWeight: '700' }]}>
                  {['A', 'B', 'C', 'D'][i]}
                </Text>
              </View>
              <Text
                style={[styles.optionText, { color: t.textPrimary, fontSize: f.body, lineHeight: Math.round(f.body * 1.4) }]}
                // Длинный двуязычный вариант ПЕРЕНОСИТСЯ на несколько строк, а не
                // обрезается: игрок под таймером обязан видеть ответ целиком.
                // ВАЖНО: НЕ используем adjustsFontSizeToFit — на iOS в flex-строке
                // он на первом рендере меряет ширину как ~0 и ужимает КОРОТКИЕ
                // варианты («Заходи!») до нечитаемого огрызка, пока соседние
                // остаются нормальными (регрессия, класс бага флешкарт). Кнопка
                // растёт по высоте (minHeight + перенос), текст не мельчает.
              >
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
        <Animated.View style={[styles.xpPopup, { bottom: Math.max(160, bottomInset + 140), transform: [{ translateY: xpPopupY }], opacity: xpPopupOpacity }]}>
          <Text style={[styles.xpPopupBase, { color: t.correct }]}>
            +{xpPopup.base}  {arenaGameStr(lang, 'xpCorrect')}
          </Text>
          {xpPopup.speed > 0 && (
            <Text style={[styles.xpPopupBonus, { color: t.gold }]}>
              ⚡ +{xpPopup.speed}  {arenaXpSpeed(lang, xpPopup.elapsedSec)}
            </Text>
          )}
          {xpPopup.first > 0 && (
            <Text style={[styles.xpPopupBonus, { color: monoIcon(themeMode, '#A78BFA') }]}>
              🎯 +{xpPopup.first}  {arenaXpFirst(lang)}
            </Text>
          )}
          {xpPopup.streak > 0 && (
            <Text style={[styles.xpPopupBonus, { color: monoIcon(themeMode, '#F97316') }]}>
              🔥 +{xpPopup.streak}  {arenaXpStreak(lang)}
            </Text>
          )}
          {xpPopup.outspeed > 0 && (
            <Text style={[styles.xpPopupBonus, { color: monoIcon(themeMode, '#38BDF8') }]}>
              💥 +{xpPopup.outspeed}  {arenaXpOutspeed(lang)}
            </Text>
          )}
        </Animated.View>
      )}

      {(phase === 'question' || phase === 'reveal') && (
        <ArenaDuelEmojiReact
          sessionKey={sessionId ?? ''}
          pickerTitle={arenaGameStr(lang, 'duelReactPicker')}
          bottomOffset={12}
          theme={{
            accent: t.accent,
            bgCard: t.bgCard,
            bgSurface2: t.bgSurface2,
            border: t.border,
            textPrimary: t.textPrimary,
            textMuted: t.textMuted,
          }}
          disabled={false}
          onPick={handleDuelReact}
        />
      )}

      </BounceView>
      </SafeAreaView>
      {(phase === 'question' || phase === 'reveal') && flyEmojis.length > 0 ? (
        <ArenaDuelFlyingEmojiOverlay
          items={flyEmojis}
          layoutW={winW}
          layoutH={winH}
          onRemove={removeFlyEmoji}
        />
      ) : null}
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
            <TapScale
              onPress={confirmForfeit}
              style={[styles.confirmBtn, { backgroundColor: t.wrong }]}
            >
              <Text style={[styles.confirmBtnText, { color: '#fff', fontSize: f.body }]}>
                {arenaGameStr(lang, 'forfeitConfirm')}
              </Text>
            </TapScale>
            <TapScale
              onPress={() => setShowExitConfirm(false)}
              style={[styles.confirmBtn, { backgroundColor: t.bgSurface2 }]}
            >
              <Text style={[styles.confirmBtnText, { color: t.textPrimary, fontSize: f.body }]}>
                {arenaGameStr(lang, 'forfeitContinue')}
              </Text>
            </TapScale>
          </Pressable>
        </Pressable>
      )}
      {/* Финальный экран матча: счёт X:Y + исход, держится ~1.2с перед результатами. */}
      {finalOverlay ? (
        <ArenaFinalScoreOverlay
          visible
          outcome={resolveMatchOutcome(finalOverlay.my, finalOverlay.opp)}
          myScore={finalOverlay.my}
          opponentScore={finalOverlay.opp}
          lang={lang}
        />
      ) : null}
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
  lobbyGlow: { width: '100%', height: 220, borderRadius: 120, opacity: 0.9 },
  lobbyKicker: { textTransform: 'uppercase', letterSpacing: 3, marginBottom: 8, fontWeight: '700' },
  lobbyTitle: { fontWeight: '800', textAlign: 'center', marginBottom: 20 },
  lobbySub: { textAlign: 'center', marginBottom: 22, lineHeight: 22, paddingHorizontal: 8 },
  oppCard: {
    width: '100%',
    maxWidth: 380,
    borderRadius: 20,
    borderWidth: 0,
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
    borderWidth: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chipAccept: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  waitOpp: { textAlign: 'center', marginTop: 8 },
  deadlinePill: { marginTop: 28, paddingHorizontal: 16, paddingVertical: 8, borderRadius: 999 },
  premeetFull: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 28 },
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
  playerNameRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5, maxWidth: '100%' },
  playerLabel: { fontWeight: '600', flexShrink: 1, minWidth: 0 },
  playerScore: { fontWeight: '800' },
  answeredDot: {
    width: 16, height: 16, borderRadius: 8, alignItems: 'center', justifyContent: 'center', marginLeft: 2,
  },

  dramaBanner: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    alignSelf: 'center', paddingHorizontal: 12, paddingVertical: 5, borderRadius: 999,
    borderWidth: 0, marginTop: 10,
  },
  dramaBannerText: { fontWeight: '800', letterSpacing: 0.3 },

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
    borderRadius: 16, borderWidth: 0,
    paddingVertical: 14, paddingHorizontal: 14, minHeight: 54,
  },
  optionLetter: {
    width: 28, height: 28, borderRadius: 8,
    alignItems: 'center', justifyContent: 'center',
  },
  optionText: { flex: 1, fontWeight: '600' },

  ruleBox: {
    marginHorizontal: 16, marginTop: 10,
    borderRadius: 14, borderWidth: 0, padding: 12,
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
    borderWidth: 0,
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
