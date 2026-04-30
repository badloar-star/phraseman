import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Image, View, Text, TouchableOpacity, StyleSheet, Animated, ScrollView, Modal, Pressable } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTheme } from '../components/ThemeContext';
import { useLang } from '../components/LangContext';
import ScreenGradient from '../components/ScreenGradient';
import XpGainBadge from '../components/XpGainBadge';
import { subscribeSessionPlayers, subscribeSession, createRematchOffer, setRematchStatus } from './services/arena_db';
import { ArenaSession, RematchOffer, REMATCH_TTL_MS, SessionPlayer } from './types/arena';
import { updateMultipleTaskProgress } from './daily_tasks';
import { getAvatarImageByIndex } from '../constants/avatars';
import { getLevelFromXP } from '../constants/theme';
import { onArenaWin, addShards, loadShardsFromCloud } from './shards_system';
import { canShowReview, markReviewPrompted, markReviewRated, requestNativeReview, getReviewVariant, ReviewVariant } from './review_utils';
import { logEvent } from './firebase';
import firestore from '@react-native-firebase/firestore';
import { emitAppEvent } from './events';
import { oskolokImageForPackShards } from './oskolok';
import { getRankImage } from '../hooks/use-arena-rank';
import { triLang, type Lang } from '../constants/i18n';
import { arenaBilingualFirst } from '../constants/arena_i18n';

const LEVELS = ['I', 'II', 'III'];
const TIERS = ['bronze', 'silver', 'gold', 'platinum', 'diamond', 'master', 'grandmaster', 'legend'];

// ── Одна звезда (слот) ─────────────────────────────────────────────────────────
function StarSlot({ filled, animateIn, animateOut, delay, accentColor }: {
  filled: boolean;
  animateIn: boolean;
  animateOut: boolean;
  delay: number;
  accentColor: string;
}) {
  const scale = useRef(new Animated.Value(filled && !animateIn ? 1 : 0)).current;
  const opacity = useRef(new Animated.Value(filled && !animateIn ? 1 : 0.25)).current;

  useEffect(() => {
    if (animateIn) {
      Animated.sequence([
        Animated.delay(400 + delay),
        Animated.parallel([
          Animated.spring(scale, { toValue: 1.4, useNativeDriver: true, friction: 3, tension: 80 }),
          Animated.timing(opacity, { toValue: 1, duration: 400, useNativeDriver: true }),
        ]),
        Animated.delay(100),
        Animated.spring(scale, { toValue: 1, useNativeDriver: true, friction: 6, tension: 60 }),
      ]).start();
    } else if (animateOut) {
      Animated.sequence([
        Animated.delay(400 + delay),
        Animated.parallel([
          Animated.spring(scale, { toValue: 1.2, useNativeDriver: true, friction: 3, tension: 80 }),
          Animated.timing(opacity, { toValue: 0.25, duration: 400, useNativeDriver: true }),
        ]),
        Animated.delay(100),
        Animated.spring(scale, { toValue: 1, useNativeDriver: true, friction: 6, tension: 60 }),
      ]).start();
    }
  }, [animateIn, animateOut, delay, opacity, scale]);

  return (
    <Animated.Text style={{
      fontSize: 32,
      transform: [{ scale }],
      opacity,
      color: filled ? accentColor : '#555',
    }}>
      ★
    </Animated.Text>
  );
}

// ── Блок из 3 звёздочек ────────────────────────────────────────────────────────
function StarDisplay({ oldStars, newStars, accentColor, ready, rankChanged = false }: {
  oldStars: number;
  newStars: number;
  accentColor: string;
  ready: boolean;
  rankChanged?: boolean;
}) {
  // On rank-up the star counter resets by design, but it should not look like "loss".
  const gained = newStars > oldStars;
  const lost = newStars < oldStars && !rankChanged;
  const changedIdx = gained ? oldStars : (lost ? oldStars - 1 : -1);

  return (
    <View style={{ flexDirection: 'row', gap: 10, alignItems: 'center', marginTop: 4 }}>
      {[0, 1, 2].map(i => {
        const isFilled = ready ? (gained ? i < newStars : i < newStars) : i < oldStars;
        const animIn = ready && gained && i === changedIdx;
        const animOut = ready && lost && i === changedIdx;
        return (
          <StarSlot
            key={i}
            filled={isFilled}
            animateIn={animIn}
            animateOut={animOut}
            delay={0}
            accentColor={accentColor}
          />
        );
      })}
    </View>
  );
}


// ── Главный экран ──────────────────────────────────────────────────────────────
export default function DuelResultsScreen() {
  const {
    sessionId, userId, forfeited, opponentForfeited,
    mockMyScore, mockOppScore, mockOppName,
    mockMyCorrect, mockMyTotal,
    mockBonusSpeed, mockBonusStreak, mockBonusFirst, mockBonusOutspeed,
    mockReviewData,
  } = useLocalSearchParams<{
    sessionId: string; userId: string;
    forfeited?: string; opponentForfeited?: string;
    mockMyScore?: string; mockOppScore?: string; mockOppName?: string;
    mockMyCorrect?: string; mockMyTotal?: string;
    mockBonusSpeed?: string; mockBonusStreak?: string;
    mockBonusFirst?: string; mockBonusOutspeed?: string;
    mockReviewData?: string;
  }>();
  const isMockSession = sessionId?.startsWith('bot_');
  const isForfeited = forfeited === '1';
  const isOpponentForfeited = opponentForfeited === '1';
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { theme: t, f } = useTheme();
  const { lang } = useLang();

  const [players, setPlayers] = React.useState<SessionPlayer[]>([]);
  const [resultSaved, setResultSaved] = useState(false);
  const [starInfo, setStarInfo] = useState<{
    oldStars: number; newStars: number;
    oldTier: string; oldLevel: string;
    newTier: string; newLevel: string;
    rankChanged?: boolean;
  } | null>(null);
  const [starsReady, setStarsReady] = useState(false);
  const [rankCinematic, setRankCinematic] = useState<{
    promoted: boolean;
    oldTier: string;
    oldLevel: string;
    newTier: string;
    newLevel: string;
  } | null>(null);
  const [shardsEarned, setShardsEarned] = useState(0);
  const [showReview, setShowReview] = useState(false);
  const [showRatingModal, setShowRatingModal] = useState(false);
  const [ratingVariant, setRatingVariant] = useState<ReviewVariant | null>(null);
  const [xpGainedServer, setXpGainedServer] = useState<number | null>(null);
  const [isDrawServer, setIsDrawServer] = useState<boolean>(false);
  const [resultCardW, setResultCardW] = useState(0);
  const [resultCardH, setResultCardH] = useState(0);
  const [xpRewardTarget, setXpRewardTarget] = useState<{ x: number; y: number } | null>(null);
  const [shardRewardTarget, setShardRewardTarget] = useState<{ x: number; y: number } | null>(null);
  const [showXpReward, setShowXpReward] = useState(false);
  const [showShardReward, setShowShardReward] = useState(false);
  const [flyKind, setFlyKind] = useState<'xp' | 'shard' | null>(null);
  const [session, setSession] = useState<ArenaSession | null>(null);
  const [rematchSecsLeft, setRematchSecsLeft] = useState<number | null>(null);
  const rematchTimeoutToastRef = useRef(false);
  const rematchDeclineToastRef = useRef(false);
  const rematchNavigateRef = useRef(false);
  const rewardsHandledRef = useRef(false);
  const taskProgressHandledRef = useRef(false);
  const serverResultAppliedRef = useRef(false);
  const mockArenaRewardsRef = useRef(false);
  const DRAW_XP = 30;

  const applyTaskProgressOnce = useCallback((won: boolean) => {
    if (taskProgressHandledRef.current) return;
    taskProgressHandledRef.current = true;
    const updates: { type: import('./daily_tasks').TaskType; increment?: number }[] = [{ type: 'arena_play', increment: 1 }];
    if (won) updates.push({ type: 'arena_win', increment: 1 });
    updateMultipleTaskProgress(updates).catch(() => {});
  }, []);

  type ReviewItem = { question: string; options: string[]; correct: string; myAnswer: string | null; rule: string };
  const reviewItems: ReviewItem[] = (() => {
    try { return mockReviewData ? JSON.parse(mockReviewData) : []; } catch {
      emitAppEvent('action_toast', {
        type: 'error',
        messageRu: 'Не удалось загрузить разбор вопросов.',
        messageUk: 'Не вдалося завантажити розбір питань.',
        messageEs: 'No se ha podido cargar la revisión de las preguntas.',
      });
      return [];
    }
  })();

  const scaleAnim = useRef(new Animated.Value(0.7)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;
  const flyX = useRef(new Animated.Value(0)).current;
  const flyY = useRef(new Animated.Value(0)).current;
  const flyScale = useRef(new Animated.Value(0.2)).current;
  const flyOpacity = useRef(new Animated.Value(0)).current;
  const rewardsAnimPlayedRef = useRef(false);
  /** Осколки начисляются async (onArenaWin); без этого XP-анимация «занимает» слот и шард не показывают. */
  const shardFlyStartedRef = useRef(false);
  const rankShieldScale = useRef(new Animated.Value(0.2)).current;
  const rankShieldY = useRef(new Animated.Value(0)).current;
  const rankShieldX = useRef(new Animated.Value(0)).current;
  const rankShieldOpacity = useRef(new Animated.Value(0)).current;
  const rankImpact = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (isMockSession) {
      setPlayers([
        { sessionId, playerId: userId, score: Number(mockMyScore ?? 0), answers: [], displayName: triLang(lang, { uk: 'Ти', ru: 'Ты', es: 'Tú' }) },
        { sessionId, playerId: 'bot1', score: Number(mockOppScore ?? 0), answers: [], displayName: mockOppName ?? 'Opponent' },
      ]);
      return;
    }
    const unsub = subscribeSessionPlayers(sessionId, setPlayers);
    return unsub;
  }, [isMockSession, mockMyScore, mockOppName, mockOppScore, sessionId, userId, lang]);

  // Подписка на саму сессию — нужна для rematchOffer
  useEffect(() => {
    if (isMockSession || !sessionId) return;
    const unsub = subscribeSession(sessionId, setSession);
    return unsub;
  }, [isMockSession, sessionId]);

  // ── Rematch: реакция на изменения rematchOffer ─────────────────────────────
  const rematchOffer: RematchOffer | undefined = session?.rematchOffer;
  const isRematchInitiator = !!rematchOffer && rematchOffer.byUid === userId;
  const isRematchTarget = !!rematchOffer && rematchOffer.byUid !== userId;
  const rematchPending = rematchOffer?.status === 'pending' && (rematchOffer.ttlAt ?? 0) > Date.now();

  // Локальный отсчёт секунд для pending offer
  useEffect(() => {
    if (!rematchPending) {
      setRematchSecsLeft(null);
      return;
    }
    const tick = () => {
      const left = Math.max(0, Math.ceil(((rematchOffer?.ttlAt ?? 0) - Date.now()) / 1000));
      setRematchSecsLeft(left);
    };
    tick();
    const id = setInterval(tick, 500);
    return () => clearInterval(id);
  }, [rematchPending, rematchOffer?.ttlAt]);

  // Локальный таймаут — инициатор отмечает offer expired
  useEffect(() => {
    if (!rematchPending || !isRematchInitiator) return;
    const ttlAt = rematchOffer?.ttlAt ?? 0;
    const wait = Math.max(0, ttlAt - Date.now());
    const t = setTimeout(() => {
      setRematchStatus(sessionId, 'expired').catch(() => {});
      if (!rematchTimeoutToastRef.current) {
        rematchTimeoutToastRef.current = true;
        emitAppEvent('action_toast', {
          type: 'info',
          messageRu: 'Соперник не ответил на реванш',
          messageUk: 'Суперник не відповів на реванш',
          messageEs: 'El rival no respondió a la revancha a tiempo.',
        });
      }
    }, wait + 100);
    return () => clearTimeout(t);
  }, [rematchPending, isRematchInitiator, rematchOffer?.ttlAt, sessionId]);

  // Тост на отказ соперника
  useEffect(() => {
    if (rematchOffer?.status === 'declined' && isRematchInitiator && !rematchDeclineToastRef.current) {
      rematchDeclineToastRef.current = true;
      emitAppEvent('action_toast', {
        type: 'info',
        messageRu: 'Соперник отказался от реванша',
        messageUk: 'Суперник відмовився від реваншу',
        messageEs: 'El rival rechazó la revancha.',
      });
    }
  }, [rematchOffer?.status, isRematchInitiator]);

  // Создан newSessionId — оба клиента переходят в новый матч
  useEffect(() => {
    if (!rematchOffer?.newSessionId) return;
    if (rematchNavigateRef.current) return;
    rematchNavigateRef.current = true;
    router.replace({
      pathname: '/arena_game' as any,
      params: { sessionId: rematchOffer.newSessionId, userId, fromLobby: '0' },
    });
  }, [rematchOffer?.newSessionId, router, userId]);

  const handleRematchOffer = useCallback(async () => {
    if (isMockSession || !sessionId || !userId) return;
    rematchTimeoutToastRef.current = false;
    rematchDeclineToastRef.current = false;
    const myName = players.find((p) => p.playerId === userId)?.displayName ?? triLang(lang, { ru: 'Игрок', uk: 'Гравець', es: 'Jugador' });
    try {
      const ok = await createRematchOffer(sessionId, userId, myName);
      if (!ok) {
        emitAppEvent('action_toast', {
          type: 'info',
          messageRu: 'Уже отправлено — ждём ответ',
          messageUk: 'Вже надіслано — чекаємо відповіді',
          messageEs: 'Revancha ya enviada. Esperando respuesta.',
        });
      } else {
        logEvent('arena_rematch_offer_sent', {});
      }
    } catch {
      emitAppEvent('action_toast', {
        type: 'error',
        messageRu: 'Не удалось отправить реванш',
        messageUk: 'Не вдалося надіслати реванш',
        messageEs: 'No se ha podido enviar la revancha.',
      });
    }
  }, [isMockSession, players, sessionId, userId, lang]);

  const handleRematchAccept = useCallback(async () => {
    if (isMockSession || !sessionId) return;
    try {
      await setRematchStatus(sessionId, 'accepted');
      logEvent('arena_rematch_accepted', {});
    } catch {
      emitAppEvent('action_toast', {
        type: 'error',
        messageRu: 'Не удалось принять реванш',
        messageUk: 'Не вдалося прийняти реванш',
        messageEs: 'No se ha podido aceptar la solicitud de revancha.',
      });
    }
  }, [isMockSession, sessionId]);

  const handleRematchDecline = useCallback(async () => {
    if (isMockSession || !sessionId) return;
    try {
      await setRematchStatus(sessionId, 'declined');
      logEvent('arena_rematch_declined', {});
    } catch {
      // ignore
    }
  }, [isMockSession, sessionId]);

  // При выходе «В Арену» — отменяем мой pending, чтобы не оставлять висеть
  const cancelMyPendingIfAny = useCallback(async () => {
    if (rematchPending && isRematchInitiator) {
      try { await setRematchStatus(sessionId, 'cancelled'); } catch { /* ignore */ }
    }
  }, [rematchPending, isRematchInitiator, sessionId]);

  useEffect(() => {
    if (players.length > 0) {
      Animated.parallel([
        Animated.spring(scaleAnim, { toValue: 1, useNativeDriver: true, tension: 60 }),
        Animated.timing(opacityAnim, { toValue: 1, duration: 400, useNativeDriver: true }),
      ]).start();
    }
  }, [opacityAnim, players.length, scaleAnim]);

  useEffect(() => {
    if (isMockSession || !sessionId || !userId) return;
    const resultRef = firestore().collection('arena_session_results').doc(`${sessionId}_${userId}`);
    return resultRef.onSnapshot(async (snap) => {
      try {
        if (!snap?.exists) return;
        if (serverResultAppliedRef.current) return;
        serverResultAppliedRef.current = true;
        const data = snap.data() as {
          won?: boolean;
          isDraw?: boolean;
          xpGained?: number;
          oldStars?: number;
          newStars?: number;
          oldTier?: string;
          oldLevel?: string;
          newTier?: string;
          newLevel?: string;
          rankChanged?: boolean;
          promoted?: boolean;
          rankUpStreakShardAwarded?: boolean;
        };
        setXpGainedServer(data.xpGained ?? 0);
        setIsDrawServer(!!data.isDraw);
        setStarInfo({
          oldStars: data.oldStars ?? 0,
          newStars: data.newStars ?? 0,
          oldTier: data.oldTier ?? 'bronze',
          oldLevel: data.oldLevel ?? 'I',
          newTier: data.newTier ?? 'bronze',
          newLevel: data.newLevel ?? 'I',
          rankChanged: !!data.rankChanged,
        });
        setTimeout(() => {
          setStarsReady(true);
          if (data.rankChanged) {
            setTimeout(() => setRankCinematic({
              promoted: !!data.promoted,
              oldTier: data.oldTier ?? 'bronze',
              oldLevel: data.oldLevel ?? 'I',
              newTier: data.newTier ?? 'bronze',
              newLevel: data.newLevel ?? 'I',
            }), 700);
          }
        }, 900);

        if (!rewardsHandledRef.current && data.won && !data.isDraw) {
          rewardsHandledRef.current = true;
          const { shards, milestoneBonus } = await onArenaWin();
          let total = shards + milestoneBonus;
          // Победа в арене всегда должна давать минимум +1 осколок.
          total = Math.max(1, total);
          let rankBonus = 0;
          if (data.rankUpStreakShardAwarded) {
            rankBonus = await addShards('arena_rank_up_streak', { suppressEarnEvent: true });
            total += rankBonus;
          }
          if (total > 0) {
            setShardsEarned(total);
          }

          const eligible = await canShowReview();
          if (eligible) {
            const variant = await getReviewVariant('arena_win', lang);
            setRatingVariant(variant);
            setTimeout(() => setShowRatingModal(true), 2000);
          }
        }

        applyTaskProgressOnce(!!data.won);

        setResultSaved(true);
        logEvent('arena_result_loaded_from_server', { won: data.won ? 1 : 0 });

        // Дуэль из приглашения: сервер начисляет/возвращает ставку осколков — подтягиваем баланс в UI.
        if (sessionId.startsWith('invite_')) {
          loadShardsFromCloud().catch(() => {});
        }
      } catch {
        emitAppEvent('action_toast', {
          type: 'error',
          messageRu: 'Не удалось загрузить результат матча.',
          messageUk: 'Не вдалося завантажити результат матчу.',
          messageEs: 'No se ha podido cargar el resultado del duelo.',
        });
      }
    });
  }, [applyTaskProgressOnce, isMockSession, sessionId, userId, lang]);

  const saveMatchResult = useCallback(async (uid: string, won: boolean, isLast: boolean, total: number, isDraw: boolean = false) => {
    if (!isMockSession) return;
    const xpDelta = isDraw ? DRAW_XP : (won ? 50 : 15);
    const myScore = players.find(p => p.playerId === uid)?.score ?? 0;
    const oppPlayer = players.find(p => p.playerId !== uid);
    const oppScore = oppPlayer?.score ?? 0;
    const oppName = oppPlayer?.displayName ?? 'Bot';

    // Транзакция в arena_profiles: повторяет логику серверного gameLoop (см.
    // functions/src/index.ts — звёзды/level/tier/winStreak/stats/xp). Бот-матчи
    // считаются в рейтинг (см. CLAUDE.md → раздел про арену), но НЕ создают
    // arena_sessions: матч-история живёт только в подколлекции профиля.
    let oldStars = 0, newStars = 0;
    let oldTier = 'bronze', newTier = 'bronze';
    let oldLevel = 'I', newLevel = 'I';
    let rankChanged = false;
    let promoted = false;
    try {
      await firestore().runTransaction(async (tx) => {
        const profileRef = firestore().collection('arena_profiles').doc(uid);
        const profileSnap = await tx.get(profileRef);
        const data = profileSnap.exists
          ? (profileSnap.data() as {
              rank?: { stars?: number; tier?: string; level?: string };
              xp?: number;
              stats?: {
                matchesPlayed?: number; matchesWon?: number; totalScore?: number;
                winStreak?: number; bestWinStreak?: number;
              };
            })
          : {};
        oldStars = data.rank?.stars ?? 0;
        oldTier = data.rank?.tier ?? 'bronze';
        oldLevel = data.rank?.level ?? 'I';
        const curStreak = data.stats?.winStreak ?? 0;
        const bestStreak = data.stats?.bestWinStreak ?? 0;

        newStars = isDraw ? oldStars : oldStars + (won ? 1 : isLast ? -1 : 0);
        newTier = oldTier;
        newLevel = oldLevel;

        if (newStars >= 3) {
          newStars = 0;
          const li = LEVELS.indexOf(oldLevel);
          if (li < LEVELS.length - 1 && li >= 0) {
            newLevel = LEVELS[li + 1];
          } else {
            newLevel = LEVELS[0];
            const ti = TIERS.indexOf(oldTier);
            if (ti < TIERS.length - 1 && ti >= 0) newTier = TIERS[ti + 1];
          }
        } else if (newStars < 0) {
          newStars = 2;
          const li = LEVELS.indexOf(oldLevel);
          if (li > 0) {
            newLevel = LEVELS[li - 1];
          } else {
            const ti = TIERS.indexOf(oldTier);
            if (ti > 0) {
              newTier = TIERS[ti - 1];
              newLevel = LEVELS[LEVELS.length - 1];
            } else {
              newStars = 0;
            }
          }
        }

        rankChanged = newTier !== oldTier || newLevel !== oldLevel;
        promoted = rankChanged && (
          TIERS.indexOf(newTier) > TIERS.indexOf(oldTier)
          || (newTier === oldTier && LEVELS.indexOf(newLevel) > LEVELS.indexOf(oldLevel))
        );
        const newStreak = won ? curStreak + 1 : isDraw ? curStreak : 0;

        const profileUpdate = {
          'rank.tier': newTier,
          'rank.level': newLevel,
          'rank.stars': newStars,
          xp: (data.xp ?? 0) + xpDelta,
          'stats.matchesPlayed': (data.stats?.matchesPlayed ?? 0) + 1,
          'stats.matchesWon': (data.stats?.matchesWon ?? 0) + (won ? 1 : 0),
          'stats.totalScore': (data.stats?.totalScore ?? 0) + myScore,
          'stats.winStreak': newStreak,
          'stats.bestWinStreak': Math.max(bestStreak, newStreak),
          updatedAt: Date.now(),
        };
        if (profileSnap.exists) tx.update(profileRef, profileUpdate);
        else tx.set(profileRef, profileUpdate, { merge: true });

        const historyRef = profileRef.collection('match_history').doc(sessionId);
        tx.set(historyRef, {
          createdAt: Date.now(),
          sessionId,
          won,
          isDraw,
          myScore,
          oppScore,
          oppName,
          oppIsBot: true,
          xpGained: xpDelta,
          starsChange: newStars - oldStars,
          rankBefore: { tier: oldTier, level: oldLevel, stars: oldStars },
          rankAfter: { tier: newTier, level: newLevel, stars: newStars },
        }, { merge: true });
      });
    } catch {
      // Сеть/permissions — продолжаем UI с локальной анимацией, но звёзды не сохранятся.
      // Это лучше чем падение экрана; следующий матч повторит попытку записи в профиль.
      emitAppEvent('action_toast', {
        type: 'info',
        messageRu: 'Не удалось синхронизировать рейтинг с облаком — попробуй позже.',
        messageUk: 'Не вдалося синхронізувати рейтинг із хмарою — спробуй пізніше.',
        messageEs: 'No se ha podido sincronizar tu clasificación con la nube. Inténtalo más tarde.',
      });
    }

    setXpGainedServer(xpDelta);
    setIsDrawServer(isDraw);
    setStarInfo({
      oldStars,
      newStars,
      oldTier,
      oldLevel,
      newTier,
      newLevel,
      rankChanged,
    });
    setTimeout(() => {
      setStarsReady(true);
      if (rankChanged) {
        setTimeout(() => setRankCinematic({
          promoted,
          oldTier,
          oldLevel,
          newTier,
          newLevel,
        }), 700);
      }
    }, 400);
    logEvent('arena_match_bot_result', {
      won: won ? 1 : 0,
      rank_changed: rankChanged ? 1 : 0,
      is_draw: isDraw ? 1 : 0,
      stars_change: newStars - oldStars,
      xp_gained: xpDelta,
    });
  }, [isMockSession, players, sessionId]);

  useEffect(() => {
    if (!isForfeited || resultSaved || !userId || !isMockSession) return;
    saveMatchResult(userId, false, true, 2);
    applyTaskProgressOnce(false);
    setResultSaved(true);
  }, [applyTaskProgressOnce, isForfeited, isMockSession, resultSaved, saveMatchResult, userId]);

  useEffect(() => {
    if (isForfeited || players.length === 0 || resultSaved || !userId || !isMockSession) return;
    const sorted = [...players].sort((a, b) => b.score - a.score);
    const topScore = sorted[0]?.score ?? 0;
    const lastScore = sorted[sorted.length - 1]?.score ?? 0;
    const tiedAtTop = sorted.filter(p => (p.score ?? 0) === topScore).length;
    const isDrawAtTop = !isOpponentForfeited && players.length > 1 && tiedAtTop > 1;
    const me = players.find(p => p.playerId === userId);
    const myScore = me?.score ?? 0;
    const isDraw = isDrawAtTop && myScore === topScore;
    const isWin = !isDraw && (isOpponentForfeited || myScore === topScore);
    const isLast = !isDraw && !isOpponentForfeited && myScore === lastScore && myScore !== topScore;
    saveMatchResult(userId, isWin, isLast, players.length, isDraw);
    applyTaskProgressOnce(isWin);
    setResultSaved(true);
  }, [applyTaskProgressOnce, isForfeited, isMockSession, isOpponentForfeited, players, resultSaved, saveMatchResult, userId]);

  const sorted = [...players].sort((a, b) => b.score - a.score);
  const me = players.find(p => p.playerId === userId);
  const myRank = isForfeited ? 99 : sorted.findIndex(p => p.playerId === userId) + 1;
  /** Сдача соперника может прийти во 2-м snapshot сессии — не опираться только на params с arena_game. */
  const opponentSurrendered =
    isOpponentForfeited
    || (!!session?.forfeitedBy && session.forfeitedBy !== userId && !isForfeited);
  // Ничья = на топе ≥2 игроков с тем же счётом, и я среди них.
  const topScoreLocal = sorted[0]?.score ?? 0;
  const tiedAtTopLocal = sorted.filter(p => (p.score ?? 0) === topScoreLocal).length;
  const localDraw = !isForfeited && !opponentSurrendered && players.length > 1
    && tiedAtTopLocal > 1 && (me?.score ?? 0) === topScoreLocal;
  const isDrawRaw = isDrawServer || localDraw;
  const isDraw = !opponentSurrendered && !isForfeited && isDrawRaw;
  const isWinner = !isForfeited && !isDraw && (opponentSurrendered || myRank === 1);

  const xpGained = isMockSession
    ? (isForfeited ? 0 : (isDraw ? DRAW_XP : (isWinner ? 50 : 15)))
    : (xpGainedServer ?? 0);

  // При ничьей звёзды не меняются — анимация не нужна.
  const showStars = !isDraw && starInfo !== null && (starInfo.newStars !== starInfo.oldStars || starsReady);
  // Если проигрыш и 0 звёзд было — нет анимации; ничья — тоже без анимации.
  const noStarAnim = isDraw || (starInfo && !isWinner && starInfo.oldStars === 0);

  const headlineResult = isForfeited
    ? triLang(lang, { ru: 'Сдался', uk: 'Здався', es: 'Me rendí' })
    : isDraw
      ? triLang(lang, { ru: 'Ничья!', uk: 'Нічия!', es: '¡Empate!' })
      : opponentSurrendered || isWinner
        ? triLang(lang, { ru: 'Победа!', uk: 'Перемога!', es: '¡Victoria!' })
        : myRank === sorted.length && sorted.length > 0
          ? triLang(lang, { ru: 'В следующий раз!', uk: 'Наступного разу!', es: '¡Otra vez será!' })
          : triLang(lang, {
              ru: `${myRank}-е место`,
              uk: `${myRank}-е місце`,
              es: `${myRank}º puesto`,
            });

  useEffect(() => {
    if (!isMockSession || !resultSaved) return;
    if (isForfeited) return;
    if (!isWinner) return;
    if (mockArenaRewardsRef.current) return;
    mockArenaRewardsRef.current = true;
    (async () => {
      const { shards, milestoneBonus } = await onArenaWin();
      const total = Math.max(1, shards + milestoneBonus);
      if (total > 0) {
        setShardsEarned(total);
      }
    })().catch(() => {});
  }, [isMockSession, resultSaved, isForfeited, isWinner, lang]);

  useEffect(() => {
    rewardsAnimPlayedRef.current = false;
    shardFlyStartedRef.current = false;
    setShowXpReward(false);
    setShowShardReward(false);
    setFlyKind(null);
  }, [sessionId, isWinner]);

  useEffect(() => {
    if (!rankCinematic || !resultCardW || !resultCardH) return;
    rankShieldScale.setValue(rankCinematic.promoted ? 0.18 : 0.24);
    rankShieldOpacity.setValue(0);
    rankShieldY.setValue(-resultCardH * 0.18);
    rankShieldX.setValue(0);
    rankImpact.setValue(1);
    const finalX = resultCardW * 0.29;
    const finalY = -resultCardH * 0.22;
    Animated.sequence([
      Animated.parallel([
        Animated.timing(rankShieldOpacity, { toValue: 1, duration: 180, useNativeDriver: true }),
        Animated.spring(rankShieldScale, {
          toValue: rankCinematic.promoted ? 1.18 : 1.08,
          friction: rankCinematic.promoted ? 5 : 7,
          tension: rankCinematic.promoted ? 120 : 90,
          useNativeDriver: true,
        }),
      ]),
      Animated.parallel([
        Animated.timing(rankShieldX, { toValue: finalX, duration: rankCinematic.promoted ? 520 : 620, useNativeDriver: true }),
        Animated.timing(rankShieldY, { toValue: finalY, duration: rankCinematic.promoted ? 520 : 620, useNativeDriver: true }),
        Animated.timing(rankShieldScale, { toValue: 0.46, duration: rankCinematic.promoted ? 520 : 620, useNativeDriver: true }),
      ]),
      Animated.sequence([
        Animated.timing(rankImpact, { toValue: 1.08, duration: 110, useNativeDriver: true }),
        Animated.timing(rankImpact, { toValue: 1, duration: 180, useNativeDriver: true }),
      ]),
    ]).start(() => {
      setTimeout(() => setRankCinematic(null), 600);
    });
  }, [rankCinematic, rankImpact, rankShieldOpacity, rankShieldScale, rankShieldX, rankShieldY, resultCardH, resultCardW]);

  useEffect(() => {
    if (!isWinner) return;
    if (!resultCardW || !resultCardH || !xpRewardTarget) return;
    if (shardsEarned > 0 && !shardRewardTarget) return;

    const tokenHalf = 38;
    const startX = resultCardW / 2 - tokenHalf;
    const startY = resultCardH * 0.38 - tokenHalf;

    const runFly = (kind: 'xp' | 'shard', target: { x: number; y: number }, done: () => void) => {
      flyX.setValue(startX);
      flyY.setValue(startY);
      flyScale.setValue(0.2);
      flyOpacity.setValue(0);
      setFlyKind(kind);
      Animated.sequence([
        Animated.parallel([
          Animated.timing(flyOpacity, { toValue: 1, duration: 220, useNativeDriver: true }),
          Animated.spring(flyScale, { toValue: 1.12, tension: 120, friction: 7, useNativeDriver: true }),
        ]),
        Animated.spring(flyScale, { toValue: 1, tension: 110, friction: 8, useNativeDriver: true }),
        Animated.delay(120),
        Animated.parallel([
          Animated.timing(flyX, { toValue: target.x - tokenHalf, duration: 520, useNativeDriver: true }),
          Animated.timing(flyY, { toValue: target.y - tokenHalf, duration: 520, useNativeDriver: true }),
          Animated.timing(flyScale, { toValue: 0.34, duration: 520, useNativeDriver: true }),
          Animated.timing(flyOpacity, { toValue: 0.1, duration: 520, useNativeDriver: true }),
        ]),
      ]).start(done);
    };

    // Осколки приходят после onArenaWin(); XP уже отыграл — дорисовываем только полёт осколка.
    if (
      rewardsAnimPlayedRef.current
      && shardsEarned > 0
      && shardRewardTarget
      && showXpReward
      && !showShardReward
      && !shardFlyStartedRef.current
    ) {
      shardFlyStartedRef.current = true;
      runFly('shard', shardRewardTarget, () => {
        setShowShardReward(true);
        setFlyKind(null);
      });
      return;
    }

    if (rewardsAnimPlayedRef.current) return;

    rewardsAnimPlayedRef.current = true;
    runFly('xp', xpRewardTarget, () => {
      setShowXpReward(true);
      if (shardsEarned > 0 && shardRewardTarget && !shardFlyStartedRef.current) {
        shardFlyStartedRef.current = true;
        runFly('shard', shardRewardTarget, () => {
          setShowShardReward(true);
          setFlyKind(null);
        });
        return;
      }
      setFlyKind(null);
    });
  }, [
    flyOpacity, flyScale, flyX, flyY, isWinner, resultCardH, resultCardW,
    shardRewardTarget, shardsEarned, showShardReward, showXpReward, xpRewardTarget,
  ]);

  /** Если полёт осколка сорвался — не оставляем награду с opacity 0 при ненулевом shardsEarned. */
  useEffect(() => {
    if (!isWinner || shardsEarned <= 0 || showShardReward) return;
    const id = setTimeout(() => setShowShardReward(true), 2800);
    return () => clearTimeout(id);
  }, [isWinner, shardsEarned, showShardReward]);

  useEffect(() => {
    // Real matches should use server-computed result, but this keeps UX resilient
    // when arena_session_results arrives late or cannot be read.
    if (isMockSession) return;
    if (serverResultAppliedRef.current) return;
    if (players.length === 0) return;
    if (starInfo !== null) return;
    if (isForfeited) return;

    const fallbackTimer = setTimeout(() => {
      if (serverResultAppliedRef.current || starInfo !== null) return;

      const fallbackXp = isDraw ? DRAW_XP : (isWinner ? 50 : 15);
      setXpGainedServer(fallbackXp);
      setIsDrawServer(isDraw);
      applyTaskProgressOnce(isWinner);
      setResultSaved(true);

      if (!isDraw) {
        const fallbackOldStars = 0;
        const fallbackNewStars = isWinner ? 1 : 0;
        setStarInfo({
          oldStars: fallbackOldStars,
          newStars: fallbackNewStars,
          oldTier: 'bronze',
          oldLevel: 'I',
          newTier: 'bronze',
          newLevel: 'I',
          rankChanged: false,
        });
        setTimeout(() => setStarsReady(true), 250);
      }

      if (isWinner && !rewardsHandledRef.current) {
        rewardsHandledRef.current = true;
        (async () => {
          const { shards, milestoneBonus } = await onArenaWin();
          const total = Math.max(1, shards + milestoneBonus);
          if (total > 0) {
            setShardsEarned(total);
          }
        })().catch(() => {});
      }

      logEvent('arena_result_fallback_applied', {
        won: isWinner ? 1 : 0,
        is_draw: isDraw ? 1 : 0,
      });
    }, 2200);

    return () => clearTimeout(fallbackTimer);
  }, [applyTaskProgressOnce, isDraw, isForfeited, isMockSession, isWinner, lang, players.length, starInfo]);

  return (
    <ScreenGradient>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <Animated.View style={{ transform: [{ scale: scaleAnim }], opacity: opacityAnim }}>
          <LinearGradient
            colors={isWinner ? [t.correctBg, t.bgCard] : [t.bgSurface, t.bgCard]}
            style={[styles.resultCard, { borderColor: isWinner ? t.correct : isDraw ? t.gold : t.border }]}
            start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
            onLayout={(e) => {
              setResultCardW(e.nativeEvent.layout.width);
              setResultCardH(e.nativeEvent.layout.height);
            }}
          >
            <Text style={styles.resultEmoji}>
              {isForfeited ? '🏳️' : isDraw ? '🤝' : opponentSurrendered ? '🏆' : isWinner ? '🏆' : myRank === 2 ? '🥈' : '💪'}
            </Text>
            <Text style={[styles.resultTitle, { color: t.textPrimary, fontSize: f.h1 }]}>
              {headlineResult}
            </Text>
            {opponentSurrendered && (
              <Text style={[{ color: t.textMuted, fontSize: f.body, fontWeight: '500', marginTop: -2 }]}>
                {triLang(lang, {
                  ru: '🏳️ Оппонент сдался',
                  uk: '🏳️ Опонент здався',
                  es: '🏳️ El rival se rindió',
                })}
              </Text>
            )}
            <Text style={[styles.myScore, { color: t.accent, fontSize: 44 }]}>
              {me?.score ?? 0}
            </Text>
            <Text style={[styles.myScoreLabel, { color: t.textMuted, fontSize: f.caption }]}>
              {triLang(lang, { ru: 'очков', uk: 'очок', es: 'puntos' })}
            </Text>

            <View style={[styles.rewards, { borderTopColor: t.border }]}>
              <View
                style={[styles.rewardItem, { opacity: showXpReward ? 1 : 0 }]}
                onLayout={(e) => {
                  const { x, y, width, height } = e.nativeEvent.layout;
                  setXpRewardTarget({
                    x: x + width / 2,
                    y: y + height / 2,
                  });
                }}
              >
                <Text style={{ fontSize: 20 }}>⚡</Text>
                <XpGainBadge amount={xpGained} visible={true} style={{ color: t.gold, fontSize: f.body, fontWeight: '700' }} />
              </View>
              {shardsEarned > 0 && (
                <View
                  style={[styles.rewardItem, { opacity: showShardReward ? 1 : 0 }]}
                  onLayout={(e) => {
                    const { x, y, width, height } = e.nativeEvent.layout;
                    setShardRewardTarget({
                      x: x + width / 2,
                      y: y + height / 2,
                    });
                  }}
                >
                  <Image source={oskolokImageForPackShards(shardsEarned)} style={{ width: 22, height: 22 }} resizeMode="contain" />
                  <Text style={[{ color: '#A78BFA', fontSize: f.body, fontWeight: '700' }]}>
                    +{shardsEarned}{' '}
                    {lang === 'es'
                      ? (shardsEarned === 1 ? 'fragmento' : 'fragmentos')
                      : lang === 'uk'
                        ? (shardsEarned === 1 ? 'осколок' : shardsEarned < 5 ? 'осколки' : 'осколків')
                        : (shardsEarned === 1 ? 'осколок' : shardsEarned < 5 ? 'осколка' : 'осколков')}
                  </Text>
                </View>
              )}

              {/* Звёзды */}
              {!noStarAnim && showStars && (
                <StarDisplay
                  oldStars={starInfo!.oldStars}
                  newStars={starInfo!.newStars}
                  accentColor={t.gold}
                  ready={starsReady}
                  rankChanged={starInfo!.rankChanged}
                />
              )}
              {!noStarAnim && !showStars && !isForfeited && (
                // Заглушка пока грузится (3 пустых слота)
                <View style={{ flexDirection: 'row', gap: 10 }}>
                  {[0, 1, 2].map(i => (
                    <Text key={i} style={{ fontSize: 32, color: '#555', opacity: 0.4 }}>★</Text>
                  ))}
                </View>
              )}
            </View>

            {flyKind && (
              <Animated.View
                pointerEvents="none"
                style={[
                  styles.shardFlyOverlay,
                  {
                    opacity: flyOpacity,
                    transform: [
                      { translateX: flyX },
                      { translateY: flyY },
                      { scale: flyScale },
                    ],
                  },
                ]}
              >
                {flyKind === 'xp' ? (
                  <View style={styles.flyXpChip}>
                    <Text style={{ fontSize: 30 }}>⚡</Text>
                    <Text style={styles.flyXpText}>+{xpGained} XP</Text>
                  </View>
                ) : (
                  <Image source={oskolokImageForPackShards(shardsEarned)} style={{ width: 76, height: 76 }} resizeMode="contain" />
                )}
              </Animated.View>
            )}

            {!!starInfo && (
              <Animated.View style={[styles.rankDock, { transform: [{ scale: rankImpact }] }]}>
                <Image
                  source={getRankImage((starInfo.newTier as any), starInfo.newLevel)}
                  style={styles.rankDockImage}
                  resizeMode="contain"
                />
              </Animated.View>
            )}

            {!!rankCinematic && (
              <Animated.View
                pointerEvents="none"
                style={[
                  styles.rankCinematicShield,
                  {
                    opacity: rankShieldOpacity,
                    transform: [
                      { translateX: rankShieldX },
                      { translateY: rankShieldY },
                      { scale: rankShieldScale },
                    ],
                  },
                ]}
              >
                <Image
                  source={getRankImage((rankCinematic.newTier as any), rankCinematic.newLevel)}
                  style={styles.rankCinematicImage}
                  resizeMode="contain"
                />
              </Animated.View>
            )}
          </LinearGradient>
        </Animated.View>

        <View style={[styles.leaderboard, { backgroundColor: t.bgCard, borderColor: t.border }]}>
          <Text style={[styles.leaderboardTitle, { color: t.textMuted, fontSize: f.caption }]}>
            {triLang(lang, { ru: 'Результаты матча', uk: 'Результати матчу', es: 'Resultados del duelo' })}
          </Text>
          {sorted.map((p, idx) => {
            const isMe = p.playerId === userId;
            const medal = idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : `${idx + 1}.`;
            return (
              <View
                key={p.playerId}
                style={[
                  styles.leaderboardRow,
                  { borderTopColor: t.border },
                  isMe && { backgroundColor: t.accentBg },
                ]}
              >
                <Text style={styles.medal}>{medal}</Text>
                {(() => {
                  const lvl = p.avatarLevel ?? (isMe ? getLevelFromXP(p.score) : 1);
                  const img = getAvatarImageByIndex(lvl);
                  return img
                    ? <Image source={img} style={{ width: 28, height: 28 }} resizeMode="contain" />
                    : <Text style={{ fontSize: 20 }}>👤</Text>;
                })()}
                <Text style={[styles.playerName, {
                  color: isMe ? t.accent : t.textPrimary,
                  fontSize: f.body, flex: 1,
                }]} numberOfLines={1}>
                  {p.displayName ?? (isMe ? triLang(lang, { ru: 'Я', uk: 'Я', es: 'Yo' }) : triLang(lang, { ru: `Игрок ${idx + 1}`, uk: `Гравець ${idx + 1}`, es: `Jugador ${idx + 1}` }))}
                </Text>
                <Text style={[styles.playerFinalScore, { color: t.textPrimary, fontSize: f.body }]}>
                  {p.score}
                </Text>
                {(() => {
                  const correct = isMe && isMockSession
                    ? Number(mockMyCorrect ?? 0)
                    : p.answers.filter((a: { isCorrect: boolean }) => a.isCorrect).length;
                  const total = isMe && isMockSession
                    ? Number(mockMyTotal ?? 0)
                    : p.answers.length;
                  if (total === 0) return null;
                  return (
                    <Text style={[{ color: t.textMuted, fontSize: f.caption }]}>
                      {correct}/{total} ✓
                    </Text>
                  );
                })()}
              </View>
            );
          })}
        </View>

        {/* Разбивка очков — работает и для мока (через query-параметры),
            и для реального матча (агрегируем из me.answers[].bonus, который пишет сервер) */}
        {(() => {
          const myCorrect = isMockSession
            ? Number(mockMyCorrect ?? 0)
            : (me?.answers ?? []).filter((a) => a.isCorrect).length;
          const myTotal = isMockSession
            ? Number(mockMyTotal ?? 0)
            : (me?.answers ?? []).length;
          if (myTotal <= 0) return null;
          let bSpeed = 0, bStreak = 0, bFirst = 0, bOutspeed = 0;
          if (isMockSession) {
            bSpeed = Number(mockBonusSpeed ?? 0);
            bStreak = Number(mockBonusStreak ?? 0);
            bFirst = Number(mockBonusFirst ?? 0);
            bOutspeed = Number(mockBonusOutspeed ?? 0);
          } else {
            for (const a of me?.answers ?? []) {
              const b = a.bonus;
              if (!b) continue;
              bSpeed += b.speed ?? 0;
              bStreak += b.streak ?? 0;
              bFirst += b.first ?? 0;
              bOutspeed += b.outspeed ?? 0;
            }
          }
          return (
            <View style={[styles.leaderboard, { backgroundColor: t.bgCard, borderColor: t.border }]}>
              <Text style={[styles.leaderboardTitle, { color: t.textMuted, fontSize: f.caption }]}>
                {triLang(lang, { ru: 'Твои очки', uk: 'Твої очки', es: 'Tus puntos' })}
              </Text>
              <View style={styles.breakdown}>
                <View style={styles.breakdownRow}>
                  <Text style={[{ color: t.textMuted, fontSize: f.caption }]}>
                    {triLang(lang, { ru: '✓ Правильных ответов', uk: '✓ Правильних відповідей', es: '✓ Respuestas correctas' })}
                  </Text>
                  <Text style={[{ color: t.correct, fontSize: f.caption, fontWeight: '700' }]}>+{myCorrect * 100}</Text>
                </View>
                {bSpeed > 0 && (
                  <View style={styles.breakdownRow}>
                    <Text style={[{ color: t.textMuted, fontSize: f.caption }]}>
                      {triLang(lang, {
                        ru: '⚡ Бонус за скорость',
                        uk: '⚡ Бонус за швидкість',
                        es: '⚡ Bonificación por velocidad',
                      })}
                    </Text>
                    <Text style={[{ color: t.gold, fontSize: f.caption, fontWeight: '700' }]}>+{bSpeed}</Text>
                  </View>
                )}
                {bFirst > 0 && (
                  <View style={styles.breakdownRow}>
                    <Text style={[{ color: t.textMuted, fontSize: f.caption }]}>
                      {triLang(lang, {
                        ru: '🎯 Первый правильный',
                        uk: '🎯 Перша правильна',
                        es: '🎯 Primer acierto',
                      })}
                    </Text>
                    <Text style={[{ color: '#A78BFA', fontSize: f.caption, fontWeight: '700' }]}>+{bFirst}</Text>
                  </View>
                )}
                {bStreak > 0 && (
                  <View style={styles.breakdownRow}>
                    <Text style={[{ color: t.textMuted, fontSize: f.caption }]}>
                      {triLang(lang, {
                        ru: '🔥 Серия подряд',
                        uk: '🔥 Серія поспіль',
                        es: '🔥 Racha de aciertos',
                      })}
                    </Text>
                    <Text style={[{ color: '#F97316', fontSize: f.caption, fontWeight: '700' }]}>+{bStreak}</Text>
                  </View>
                )}
                {bOutspeed > 0 && (
                  <View style={styles.breakdownRow}>
                    <Text style={[{ color: t.textMuted, fontSize: f.caption }]}>
                      {triLang(lang, {
                        ru: '💥 Быстрый ответ (≤10с)',
                        uk: '💥 Швидка відповідь (≤10 с)',
                        es: '💥 Respuesta muy rápida (≤10 s)',
                      })}
                    </Text>
                    <Text style={[{ color: '#38BDF8', fontSize: f.caption, fontWeight: '700' }]}>+{bOutspeed}</Text>
                  </View>
                )}
                <View style={[styles.breakdownRow, { borderTopWidth: 1, borderTopColor: t.border, marginTop: 4, paddingTop: 8 }]}>
                  <Text style={[{ color: t.textPrimary, fontSize: f.body, fontWeight: '700' }]}>
                    {triLang(lang, { ru: 'Итого', uk: 'Разом', es: 'Total' })}
                  </Text>
                  <Text style={[{ color: t.accent, fontSize: f.body, fontWeight: '900' }]}>{me?.score ?? 0}</Text>
                </View>
              </View>
            </View>
          );
        })()}

        <View style={styles.actions}>
          {/* Реванш — приоритет UI: входящий offer → баннер с принять/отказаться;
              исходящий pending → плашка ожидания; иначе — кнопка «Реванш». */}
          {!isMockSession && !isForfeited && !opponentSurrendered && rematchPending && isRematchTarget && (
            <View style={[styles.rematchBanner, { backgroundColor: t.bgCard, borderColor: t.gold }]}>
              <Text style={[{ color: t.textPrimary, fontSize: f.body, fontWeight: '700', marginBottom: 8 }]}>
                🥊 {rematchOffer?.byName ?? triLang(lang, { ru: 'Соперник', uk: 'Суперник', es: 'Rival' })}{' '}
                {triLang(lang, {
                  ru: 'хочет реванш',
                  uk: 'хоче реванш',
                  es: 'pide revancha',
                })}
              </Text>
              {rematchSecsLeft != null && (
                <Text style={[{ color: t.textMuted, fontSize: f.caption, marginBottom: 10 }]}>
                  {triLang(lang, {
                    ru: `Осталось ${rematchSecsLeft}с`,
                    uk: `Залишилось ${rematchSecsLeft} с`,
                    es:
                      rematchSecsLeft === 1
                        ? `Te queda ${rematchSecsLeft} s`
                        : `Te quedan ${rematchSecsLeft} s`,
                  })}
                </Text>
              )}
              <View style={{ flexDirection: 'row', gap: 8 }}>
                <TouchableOpacity onPress={handleRematchAccept} activeOpacity={0.85} style={{ flex: 1 }}>
                  <LinearGradient
                    colors={[t.correct, t.correct + 'BB']}
                    style={styles.rematchBtn}
                    start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                  >
                    <Text style={[styles.rematchText, { color: t.correctText, fontSize: f.body }]}>
                      {triLang(lang, { uk: '⚔️ Прийняти', ru: '⚔️ Принять', es: '⚔️ Aceptar' })}
                    </Text>
                  </LinearGradient>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.homeBtn, { flex: 1, borderColor: t.border, height: 60 }]}
                  onPress={handleRematchDecline}
                  activeOpacity={0.8}
                >
                  <Text style={[{ color: t.textMuted, fontSize: f.body, fontWeight: '600' }]}>
                    {triLang(lang, { ru: 'Отказаться', uk: 'Відмовитися', es: 'Rechazar' })}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {!isMockSession && !isForfeited && !opponentSurrendered && rematchPending && isRematchInitiator && (
            <View style={[styles.rematchBtn, { backgroundColor: t.bgSurface, borderWidth: 1, borderColor: t.border }]}>
              <Ionicons name="time-outline" size={20} color={t.textMuted} />
              <Text style={[styles.rematchText, { color: t.textMuted, fontSize: f.h2 }]}>
                {triLang(lang, {
                  ru: 'Ожидание соперника…',
                  uk: 'Очікування суперника…',
                  es: 'Esperando al rival…',
                })}
                {rematchSecsLeft != null ? ` ${rematchSecsLeft}${triLang(lang, { ru: 'с', uk: ' с', es: ' s' })}` : ''}
              </Text>
            </View>
          )}

          {!rematchPending && (
            isMockSession ? (
              <TouchableOpacity onPress={() => router.replace({ pathname: '/(tabs)/arena' as any, params: { autoSearch: '1' } })} activeOpacity={0.85}>
                <LinearGradient
                  colors={[t.accent, t.accent + 'BB']}
                  style={styles.rematchBtn}
                  start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                >
                  <Ionicons name="flash" size={20} color={t.correctText} />
                  <Text style={[styles.rematchText, { color: t.correctText, fontSize: f.h2 }]}>
                    {triLang(lang, { uk: 'Ще раз!', ru: 'Ещё раз!', es: '¡Otra vez!' })}
                  </Text>
                </LinearGradient>
              </TouchableOpacity>
            ) : !isForfeited && !opponentSurrendered ? (
              <TouchableOpacity onPress={handleRematchOffer} activeOpacity={0.85}>
                <LinearGradient
                  colors={[t.accent, t.accent + 'BB']}
                  style={styles.rematchBtn}
                  start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                >
                  <Ionicons name="flash" size={20} color={t.correctText} />
                  <Text style={[styles.rematchText, { color: t.correctText, fontSize: f.h2 }]}>
                    {triLang(lang, { ru: '🥊 Реванш', uk: '🥊 Реванш', es: '🥊 Revancha' })}
                  </Text>
                </LinearGradient>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity onPress={() => router.replace({ pathname: '/(tabs)/arena' as any, params: { autoSearch: '1' } })} activeOpacity={0.85}>
                <LinearGradient
                  colors={[t.accent, t.accent + 'BB']}
                  style={styles.rematchBtn}
                  start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                >
                  <Ionicons name="flash" size={20} color={t.correctText} />
                  <Text style={[styles.rematchText, { color: t.correctText, fontSize: f.h2 }]}>
                    {triLang(lang, { ru: 'Ещё раз!', uk: 'Ще раз!', es: '¡Otra vez!' })}
                  </Text>
                </LinearGradient>
              </TouchableOpacity>
            )
          )}

          <TouchableOpacity
            style={[styles.homeBtn, { borderColor: t.border }]}
            onPress={async () => { await cancelMyPendingIfAny(); router.replace('/(tabs)/arena' as any); }}
            activeOpacity={0.8}
          >
            <Text style={[{ color: t.textMuted, fontSize: f.body, fontWeight: '600' }]}>
              {triLang(lang, { ru: 'В Арену', uk: 'На Арену', es: 'Ir a la Arena' })}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.homeBtn, { borderColor: t.border, marginTop: 4 }]}
            onPress={async () => { await cancelMyPendingIfAny(); router.replace('/(tabs)/home' as any); }}
            activeOpacity={0.8}
          >
            <Text style={[{ color: t.textMuted, fontSize: f.body, fontWeight: '600' }]}>
              {triLang(lang, {
                ru: '🏠 На главную',
                uk: '🏠 На головну',
                es: '🏠 Volver al inicio',
              })}
            </Text>
          </TouchableOpacity>

          {reviewItems.length > 0 && (
            <TouchableOpacity
              style={[styles.homeBtn, { borderColor: t.border, marginTop: 4 }]}
              onPress={() => setShowReview(true)}
              activeOpacity={0.8}
            >
              <Text style={[{ color: t.textMuted, fontSize: f.body, fontWeight: '600' }]}>
                {triLang(lang, {
                  ru: '📖 Разбор вопросов',
                  uk: '📖 Розбір питань',
                  es: '📖 Repaso de preguntas',
                })}
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </ScrollView>

      {/* Модалка разбора вопросов */}
      <Modal
        visible={showReview}
        animationType="slide"
        onRequestClose={() => setShowReview(false)}
        statusBarTranslucent
        transparent
      >
        <ScreenGradient forceFullBleed style={{ flex: 1 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingTop: insets.top + 12, paddingBottom: 12, gap: 12 }}>
            <TouchableOpacity onPress={() => setShowReview(false)}>
              <Ionicons name="close" size={24} color={t.textPrimary} />
            </TouchableOpacity>
            <Text style={{ color: t.textPrimary, fontSize: f.h2, fontWeight: '700' }}>
              {triLang(lang, {
                uk: 'Розбір питань',
                ru: 'Разбор вопросов',
                es: 'Repaso de preguntas',
              })}
            </Text>
          </View>
          <ScrollView contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: 40 + insets.bottom }} showsVerticalScrollIndicator={false}>
            {reviewItems.map((item, idx) => {
              const isRight = item.myAnswer === item.correct;
              return (
                <View key={idx} style={[styles.reviewCard, { backgroundColor: t.bgCard, borderColor: isRight ? t.correct : t.wrong }]}>
                  <Text style={{ color: t.textPrimary, fontSize: f.body, fontWeight: '700', marginBottom: 8 }}>
                    {idx + 1}. {item.question}
                  </Text>
                  {item.options.map((opt, oi) => {
                    const isCorrectOpt = opt === item.correct;
                    const isMyWrong = opt === item.myAnswer && !isCorrectOpt;
                    return (
                      <View key={oi} style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                        <Text style={{ fontSize: 14, color: isCorrectOpt ? t.correct : isMyWrong ? t.wrong : t.textMuted }}>
                          {isCorrectOpt ? '✓' : isMyWrong ? '✗' : '·'}
                        </Text>
                        <Text style={{ color: isCorrectOpt ? t.correct : isMyWrong ? t.wrong : t.textMuted, fontSize: f.caption, flex: 1 }}>
                          {arenaBilingualFirst(opt, lang)}
                        </Text>
                      </View>
                    );
                  })}
                  {item.rule ? (
                    <Text style={{ color: t.textMuted, fontSize: f.caption, marginTop: 8, fontStyle: 'italic' }}>
                      {arenaBilingualFirst(item.rule, lang)}
                    </Text>
                  ) : null}
                </View>
              );
            })}
          </ScrollView>
        </ScreenGradient>
      </Modal>

      {showRatingModal && ratingVariant && (
        <ArenaRatingModal
          variant={ratingVariant}
          t={t}
          f={f}
          lang={lang}
          onClose={() => setShowRatingModal(false)}
        />
      )}
    </ScreenGradient>
  );
}

function ArenaRatingModal({ variant, t, f, lang, onClose }: {
  variant: ReviewVariant; t: any; f: any; lang: Lang; onClose: () => void;
}) {
  const [step, setStep] = useState<'ask' | 'thanks'>('ask');
  const fadeAnim   = useRef(new Animated.Value(0)).current;
  const sheetY     = useRef(new Animated.Value(60)).current;
  const emojiScale = useRef(new Animated.Value(0)).current;
  const emojiTilt  = useRef(new Animated.Value(0)).current;
  const haloPulse  = useRef(new Animated.Value(0)).current;
  const { bottom } = useSafeAreaInsets();

  useEffect(() => {
    // Сохраняем все запущенные анимации, чтобы гарантированно остановить
    // в cleanup — иначе на Fabric получаем NativeAnimatedNodesManager.disconnect
    // когда модалка закрывается до завершения каскада.
    const running: Animated.CompositeAnimation[] = [];

    const intro = Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 220, useNativeDriver: true }),
      Animated.spring(sheetY, { toValue: 0, friction: 9, tension: 80, useNativeDriver: true }),
      Animated.sequence([
        Animated.delay(140),
        Animated.spring(emojiScale, { toValue: 1, friction: 4, tension: 130, useNativeDriver: true }),
      ]),
      Animated.sequence([
        Animated.delay(220),
        Animated.timing(emojiTilt, { toValue: 1, duration: 80, useNativeDriver: true }),
        Animated.timing(emojiTilt, { toValue: -1, duration: 80, useNativeDriver: true }),
        Animated.timing(emojiTilt, { toValue: 0.5, duration: 80, useNativeDriver: true }),
        Animated.timing(emojiTilt, { toValue: 0, duration: 80, useNativeDriver: true }),
      ]),
    ]);
    intro.start();
    running.push(intro);

    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(haloPulse, { toValue: 1, duration: 1100, useNativeDriver: true }),
        Animated.timing(haloPulse, { toValue: 0, duration: 1100, useNativeDriver: true }),
      ]),
    );
    pulse.start();
    running.push(pulse);

    return () => { running.forEach(a => a.stop()); };
  }, [fadeAnim, sheetY, emojiScale, emojiTilt, haloPulse]);

  const handleYes = async () => {
    try {
      await markReviewRated();
      setStep('thanks');
      await requestNativeReview();
      setTimeout(onClose, 1500);
    } catch {
      onClose();
      emitAppEvent('action_toast', {
        type: 'error',
        messageRu: 'Не удалось открыть окно оценки.',
        messageUk: 'Не вдалося відкрити вікно оцінки.',
        messageEs: 'No se ha podido abrir la valoración.',
      });
    }
  };

  const handleNo = async () => {
    try {
      await markReviewPrompted();
    } finally {
      onClose();
    }
  };

  return (
    <Modal transparent animationType="none" visible statusBarTranslucent onRequestClose={handleNo}>
      <Animated.View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'flex-end', opacity: fadeAnim }}>
        {/* Цветной верхний радиальный отблеск над затемнением */}
        <View pointerEvents="none" style={StyleSheet.absoluteFill}>
          <LinearGradient
            colors={[t.gold + '22', 'transparent']}
            start={{ x: 0.5, y: 0 }} end={{ x: 0.5, y: 0.55 }}
            style={StyleSheet.absoluteFill}
          />
        </View>

        <Pressable style={{ flex: 1 }} onPress={handleNo} />
        <Animated.View
          style={{
            backgroundColor: t.bgCard,
            borderTopLeftRadius: 26, borderTopRightRadius: 26,
            padding: 28, paddingBottom: Math.max(40, bottom + 20),
            borderTopWidth: 0.5, borderColor: t.border,
            alignItems: 'center',
            transform: [{ translateY: sheetY }],
            overflow: 'hidden',
          }}
        >
          {/* Внутренний золотой градиент сверху */}
          <LinearGradient
            colors={[t.gold + '24', 'transparent']}
            start={{ x: 0.5, y: 0 }} end={{ x: 0.5, y: 1 }}
            style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 200 }}
            pointerEvents="none"
          />

          {step === 'ask' ? (
            <>
              {/* Иконка с halo и tilt */}
              <View style={{
                width: 96, height: 96,
                alignItems: 'center', justifyContent: 'center',
                marginBottom: 8,
              }}>
                <Animated.View
                  pointerEvents="none"
                  style={{
                    position: 'absolute',
                    width: 96, height: 96, borderRadius: 48,
                    backgroundColor: t.gold,
                    opacity: haloPulse.interpolate({ inputRange: [0, 1], outputRange: [0.16, 0.36] }),
                    transform: [{ scale: haloPulse.interpolate({ inputRange: [0, 1], outputRange: [0.85, 1.15] }) }],
                  }}
                />
                <Animated.Text style={{
                  fontSize: 48,
                  textShadowColor: t.gold + '99',
                  textShadowRadius: 14,
                  transform: [
                    { scale: emojiScale },
                    { rotate: emojiTilt.interpolate({ inputRange: [-1, 1], outputRange: ['-12deg', '12deg'] }) },
                  ],
                }}>
                  {variant.emoji}
                </Animated.Text>
              </View>

              <Text style={{ color: t.textPrimary, fontSize: f.h2, fontWeight: '800', textAlign: 'center', marginBottom: 8 }}>
                {variant.title}
              </Text>
              <Text style={{ color: t.textMuted, fontSize: f.body, textAlign: 'center', marginBottom: 28, lineHeight: f.body * 1.5 }}>
                {variant.subtitle}
              </Text>
              <View style={{ flexDirection: 'row', gap: 12, width: '100%' }}>
                <TouchableOpacity
                  style={{ flex: 1, backgroundColor: t.bgSurface, borderRadius: 14, padding: 16, alignItems: 'center', borderWidth: 0.5, borderColor: t.border }}
                  onPress={handleNo}
                  activeOpacity={0.85}
                >
                  <Text style={{ color: t.textSecond, fontSize: f.body, fontWeight: '600' }}>{variant.btnNo}</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={{ flex: 1, borderRadius: 14, overflow: 'hidden' }}
                  onPress={handleYes}
                  activeOpacity={0.88}
                >
                  <LinearGradient
                    colors={[t.correct, t.correct + 'BB']}
                    start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                    style={{ padding: 16, alignItems: 'center' }}
                  >
                    <Text style={{ color: t.correctText, fontSize: f.body, fontWeight: '800' }}>{variant.btnYes} ⭐</Text>
                  </LinearGradient>
                </TouchableOpacity>
              </View>
            </>
          ) : (
            <>
              <View style={{
                width: 96, height: 96,
                alignItems: 'center', justifyContent: 'center',
                marginBottom: 4,
              }}>
                <Animated.View
                  pointerEvents="none"
                  style={{
                    position: 'absolute',
                    width: 96, height: 96, borderRadius: 48,
                    backgroundColor: t.correct,
                    opacity: haloPulse.interpolate({ inputRange: [0, 1], outputRange: [0.16, 0.36] }),
                    transform: [{ scale: haloPulse.interpolate({ inputRange: [0, 1], outputRange: [0.9, 1.18] }) }],
                  }}
                />
                <Text style={{
                  fontSize: 52,
                  textShadowColor: t.correct + '99',
                  textShadowRadius: 14,
                }}>
                  🙏
                </Text>
              </View>
              <Text style={{ color: t.textPrimary, fontSize: f.h2, fontWeight: '800', textAlign: 'center' }}>
                {triLang(lang, {
                  ru: 'Спасибо!',
                  uk: 'Дякуємо!',
                  es: '¡Gracias!',
                })}
              </Text>
              <Text style={{ color: t.textMuted, fontSize: f.body, textAlign: 'center', marginTop: 8 }}>
                {triLang(lang, {
                  ru: 'Это значит для нас очень много.',
                  uk: 'Це для нас дуже багато значить.',
                  es: 'Para nosotros significa muchísimo.',
                })}
              </Text>
            </>
          )}
        </Animated.View>
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  scroll: { padding: 20, gap: 16, paddingTop: 60, paddingBottom: 40 },

  resultCard: {
    borderRadius: 24, borderWidth: 1.5,
    padding: 28, alignItems: 'center', gap: 4,
    overflow: 'hidden',
  },
  shardFlyOverlay: {
    position: 'absolute',
    left: 0,
    top: 0,
    width: 76,
    height: 76,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 5,
  },
  flyXpChip: {
    minWidth: 140,
    height: 76,
    paddingHorizontal: 14,
    borderRadius: 18,
    backgroundColor: 'rgba(22,22,22,0.94)',
    borderWidth: 1,
    borderColor: 'rgba(255,214,102,0.45)',
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  flyXpText: {
    color: '#FFD666',
    fontSize: 24,
    fontWeight: '900',
  },
  resultEmoji: { fontSize: 56, marginBottom: 4 },
  resultTitle: { fontWeight: '800' },
  myScore: { fontWeight: '900', lineHeight: 52 },
  myScoreLabel: { marginTop: -4 },
  rewards: {
    flexDirection: 'row', gap: 24, marginTop: 16,
    paddingTop: 16, borderTopWidth: 1, width: '100%',
    justifyContent: 'center', alignItems: 'center',
  },
  rewardItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  rankDock: {
    position: 'absolute',
    right: 14,
    top: 12,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(14,14,14,0.35)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  rankDockImage: {
    width: 46,
    height: 46,
  },
  rankCinematicShield: {
    position: 'absolute',
    left: 0,
    top: 0,
    width: 180,
    height: 180,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 7,
  },
  rankCinematicImage: {
    width: 180,
    height: 180,
  },

  leaderboard: { borderRadius: 20, borderWidth: 1, overflow: 'hidden' },
  leaderboardTitle: {
    paddingHorizontal: 16, paddingVertical: 10, fontWeight: '600', textTransform: 'uppercase',
  },
  leaderboardRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingHorizontal: 16, paddingVertical: 12, borderTopWidth: 1,
  },
  breakdown: { paddingHorizontal: 16, paddingBottom: 12, gap: 6 },
  breakdownRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  reviewCard: { borderRadius: 16, borderWidth: 1.5, padding: 14 },
  medal: { fontSize: 18, width: 28, textAlign: 'center' },
  playerName: { fontWeight: '600' },
  playerFinalScore: { fontWeight: '800' },

  actions: { gap: 10 },
  rematchBtn: {
    borderRadius: 18, height: 60,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
  },
  rematchText: { fontWeight: '800' },
  rematchBanner: {
    borderRadius: 18,
    borderWidth: 1.5,
    padding: 14,
    marginBottom: 6,
  },
  homeBtn: {
    borderRadius: 18, height: 52, borderWidth: 1,
    alignItems: 'center', justifyContent: 'center',
  },
});
