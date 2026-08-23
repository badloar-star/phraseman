import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useLang } from '../components/LangContext';
import { ArenaScreen, ArenaStat } from '../components/arena/ArenaScreen';
import { ArenaPlayers } from '../components/arena/ArenaPlayers';
import { ArenaRewards } from '../components/arena/ArenaRewards';
import { V2Card, V2Cta } from '../components/ui/v2_ui';
import { useTournamentPalette } from '../components/ui/v2_theme';
import { SpinRewardPlaque } from '../components/SpinRewardPlaque';
import { captureAccountGeneration } from './account_generation';
import { grantLocalArenaRankedWinSpin } from './local_level_spins';
import { arenaText } from '../modules/arena/copy';
import ArenaReportOpponentButton from '../components/ArenaReportOpponentButton';
import { useArenaFontScale } from '../hooks/use_arena_font_scale';
import { arenaExpansionText } from '../modules/arena/expansion_copy';
import type { ArenaMatchReward, ArenaPlayer } from '../modules/arena/contract';
import { useRuntimeActive } from '../hooks/use_runtime_active';
import { useReduceMotion } from '../hooks/use_reduce_motion';
import type { TournamentFxApi } from '../components/ui/V2Fx';
import { arenaExpansionHome, arenaFlushOutbox, arenaV2SyncMatchDispatch, createArenaRequestId, peekArenaViewerSeat, rememberArenaViewerSeat, useArenaMatch } from './arena_client';
import { arenaResultTheme } from '../modules/arena/arena_cosmetics';
import { arenaStoreItemTitle } from '../modules/arena/expansion_store_copy';
import type { ArenaExpansionHome } from '../modules/arena/expansion_contract';
import { useArenaSound } from '../hooks/use_arena_sound';
import { arenaResultAnnounce, arenaResultHasAnnounce } from '../modules/arena/result_view';
import { arenaRankView } from '../modules/arena/rank_engine';
import { ArenaResultStarBeat } from '../components/arena/ArenaResultStarBeat';
import { ImpactFlash, fireImpactFlash } from '../components/arena/ArenaImpactFx';
import { useSharedValue } from 'react-native-reanimated';
import { hapticSuccess } from '../hooks/use-haptics';
import { ArenaRankChangeHybrid } from '../components/arena/ArenaRankHybrid';
import { ResultsSequence } from '../components/feedback/ResultsSequence';
import { arenaQuickXpPresentation } from '../modules/arena/quick_result';
import {
  arenaQuickResultInitialState,
  arenaQuickResultReduce,
  arenaQuickResultTerminalSyncVersion,
} from '../modules/arena/quick_result_state';
import { arenaResultReplayMode, arenaResultSurfaceKind } from '../modules/arena/result_surface_state';
import { useArenaTerminalResultSync } from '../hooks/use_arena_terminal_result_sync';
import { subscribeAccountGeneration } from './account_generation';
import { arenaForgetResultHandoff, arenaPeekResultHandoff } from '../modules/arena/result_handoff';
import {
  arenaResultRouteOwnerMatches,
  createArenaResultOwnerGate,
} from '../modules/arena/listener_scope';

// зачем: константы модуля подняты выше компонента для читаемости (были в
// хвосте файла). Крэш ReferenceError на 'ROMAN_DIVISION' наблюдался в dev-
// сессии с активным Fast Refresh во время правки этого же файла — не в
// прод-сборке (там нет HMR, модуль вычисляется целиком до первого рендера,
// и «const после компонента» тут не является TDZ-уязвимостью). Другие файлы
// Арены с тем же порядком объявлений не трогать «профилактически».
const TIER_COPY = [
  'tierBronze', 'tierSilver', 'tierGold', 'tierPlatinum',
  'tierDiamond', 'tierMaster', 'tierGrandmaster', 'tierLegend',
] as const;
const ROMAN_DIVISION: Record<1 | 2 | 3, string> = { 1: 'I', 2: 'II', 3: 'III' };

/**
 * Счёт соперника до ответа сервера может быть неизвестен: `null` означает
 * именно «неизвестно», а не ноль. `ArenaPlayers` это уже умеет и рисует
 * прочерк; `ArenaStat` получает прочерк явной строкой на месте вызова.
 */
type ArenaDisplayedPlayer = Omit<ArenaPlayer, 'score'> & Readonly<{ score: number | null }>;

const styles = StyleSheet.create({
  announce: { gap: 4, alignItems: 'center' },
  announceHead: { fontSize: 20, fontWeight: '900', textAlign: 'center' },
  announceLine: { fontSize: 15, fontWeight: '800', fontVariant: ['tabular-nums'] },
  stats: { flexDirection: 'row', gap: 10 },
  resultSurface: { gap: 12 },
  cosmeticTitle: { textAlign: 'center', fontSize: 13, fontWeight: '900' },
  stamp: { textAlign: 'center', fontSize: 15, fontWeight: '900' },
  reactions: { minHeight: 44, gap: 8 },
  reactionHint: { fontSize: 12, fontWeight: '700', textAlign: 'center' },
  seriesCard: { gap: 6, alignItems: 'center' },
  seriesScore: { fontSize: 20, fontWeight: '900', fontVariant: ['tabular-nums'] },
  error: { textAlign: 'center', fontWeight: '700' },
  pending: { gap: 4, alignItems: 'center', paddingVertical: 8 },
  pendingTitle: { fontSize: 17, fontWeight: '900', textAlign: 'center' },
  pendingHint: { fontSize: 14, fontWeight: '600', textAlign: 'center' },
});

export default function ArenaResultsScreen() {
  const router = useRouter();
  const { lang } = useLang();
  const P = useTournamentPalette();
  // Высота строки числом не растёт вместе с системным шрифтом — при
  // крупном кегле строки наезжали друг на друга. См. use_arena_font_scale.
  const fontScale = useArenaFontScale();
  const reactionLine = { lineHeight: 17 * fontScale };
  const pendingLine = { lineHeight: 20 * fontScale };
  const window = useWindowDimensions();
  const params = useLocalSearchParams<{ matchId?: string; mode?: string; viewerSeat?: string; ownerGeneration?: string; reportRejected?: string; motionVariant?: string }>();
  const matchId = typeof params.matchId === 'string' ? params.matchId : null;
  const routeMode = params.mode === 'quick' || params.mode === 'ranked' ? params.mode : null;
  const reportRejected = params.reportRejected === '1';
  // зачем: гибрид «Штамп ранга»/«Тихая ступень» (ArenaRankHybrid) включается
  // через ?motionVariant=hybrid — по умолчанию classic, ничего не меняется
  // для боевых игроков, пока владелец не переключит default.
  const motionVariant = params.motionVariant === 'classic' ? 'classic' : 'hybrid';
  // зачем: гибрид-сцена «Штамп ранга»/«Тихая ступень» — модальная кульминация
  // (ArenaRankHybrid.onDone), а не постоянный блок как classic-текст: она
  // доигрывает один раз и уступает место обычной карточке объявления.
  const [rankSceneDismissed, setRankSceneDismissed] = useState(false);
  useEffect(() => { setRankSceneDismissed(false); }, [matchId]);
  const active = useRuntimeActive();
  const [resultAccount, setResultAccount] = useState(captureAccountGeneration);
  useEffect(() => {
    const subscription = subscribeAccountGeneration(setResultAccount);
    setResultAccount(captureAccountGeneration());
    return () => subscription.remove();
  }, []);
  const resultAccountKey = `${resultAccount.phase}:${resultAccount.generation}:${resultAccount.stableId ?? ''}`;
  const parsedOwnerGeneration = typeof params.ownerGeneration === 'string'
    ? Number(params.ownerGeneration)
    : Number.NaN;
  const routeOwnerGeneration = Number.isSafeInteger(parsedOwnerGeneration) && parsedOwnerGeneration >= 0
    ? parsedOwnerGeneration
    : null;
  const resultRouteOwnerCurrent = arenaResultRouteOwnerMatches(routeOwnerGeneration, resultAccount);
  const resultIdentityKey = resultRouteOwnerCurrent && resultAccount.stableId
    ? resultAccountKey
    : null;
  const resultOwnerGate = useRef(createArenaResultOwnerGate()).current;
  const resultOwnerCurrent = resultOwnerGate.claim(resultIdentityKey);
  const resultAccountActive = active && resultOwnerCurrent;
  useEffect(() => {
    if (resultAccount.phase === 'active' && !resultRouteOwnerCurrent) {
      router.replace('/arena' as never);
    }
  }, [resultAccount.phase, resultRouteOwnerCurrent, router]);
  const reduceMotion = useReduceMotion();
  const fxRef = useRef<TournamentFxApi>(null);
  const celebratedRef = useRef<string | null>(null);
  const live = useArenaMatch(matchId, resultAccountActive, resultAccountKey);
  const routeSeat = params.viewerSeat === 'a' || params.viewerSeat === 'b' ? params.viewerSeat : null;
  const initialHandoff = useMemo(
    () => resultOwnerCurrent && matchId ? arenaPeekResultHandoff(resultAccountKey, matchId) : null,
    [matchId, resultAccountKey, resultOwnerCurrent],
  );
  useEffect(() => {
    if (initialHandoff && matchId) arenaForgetResultHandoff(resultAccountKey, matchId);
  }, [initialHandoff, matchId, resultAccountKey]);
  /**
   * Локальный итог, с которым экран открылся до ответа сервера.
   *
   * Живёт в состоянии, а не в ref: он участвует в отрисовке и обязан пережить
   * перерисовки. Обнуляется вместе со сменой матча/аккаунта — ниже, в том же
   * эффекте, что сбрасывает остальной кадр.
   */
  const [preview, setPreview] = useState(() => initialHandoff?.preview ?? null);
  const [viewerSeat, setViewerSeat] = useState<'a' | 'b' | null>(
    () => resultOwnerCurrent
      ? routeSeat ?? initialHandoff?.viewerSeat ?? peekArenaViewerSeat(matchId)
      : null,
  );
  const [privateRewardState, setPrivateRewardState] = useState<Readonly<{
    matchId: string;
    reward: ArenaMatchReward;
  }> | null>(() => initialHandoff?.viewerReward
    ? { matchId: initialHandoff.matchId, reward: initialHandoff.viewerReward }
    : null);
  const [quickResultState, setQuickResultState] = useState(() => {
    const initial = arenaQuickResultInitialState(
      matchId,
      routeSeat ?? initialHandoff?.viewerSeat ?? null,
      routeMode === 'quick',
    );
    // зачем (2026-08-23): снимок теперь приходит и БЕЗ авторитетного матча —
    // сразу после последнего задания, чтобы экран не ждал сеть. Пока `match`
    // не приехал, синхронизировать нечем: `preview` рисует кадр отдельно, а
    // источником быстрого исхода остаётся только ответ сервера.
    return initialHandoff?.match && matchId
      ? arenaQuickResultReduce(initial, {
        type: 'sync',
        matchId,
        version: initialHandoff.match.version,
        state: initialHandoff.match.state,
        match: initialHandoff.match,
        viewerSeat: initialHandoff.viewerSeat,
        viewerReward: initialHandoff.viewerReward,
      })
      : initial;
  });
  const [quickResultAccountKey, setQuickResultAccountKey] = useState(resultAccountKey);
  useEffect(() => {
    setQuickResultAccountKey(resultAccountKey);
    if (!resultOwnerCurrent) {
      setViewerSeat(null);
      setPrivateRewardState(null);
      setQuickResultState(arenaQuickResultInitialState(matchId, null, routeMode === 'quick'));
      return;
    }
    setPreview(initialHandoff?.preview ?? null);
    setViewerSeat(routeSeat ?? initialHandoff?.viewerSeat ?? peekArenaViewerSeat(matchId));
    setPrivateRewardState(initialHandoff?.viewerReward
      ? { matchId: initialHandoff.matchId, reward: initialHandoff.viewerReward }
      : null);
    const initial = arenaQuickResultInitialState(
      matchId,
      routeSeat ?? initialHandoff?.viewerSeat ?? null,
      routeMode === 'quick',
    );
    setQuickResultState(initialHandoff?.match && matchId
      ? arenaQuickResultReduce(initial, {
        type: 'sync',
        matchId,
        version: initialHandoff.match.version,
        state: initialHandoff.match.state,
        match: initialHandoff.match,
        viewerSeat: initialHandoff.viewerSeat,
        viewerReward: initialHandoff.viewerReward,
      })
      : initial);
  }, [initialHandoff, matchId, resultAccountKey, resultOwnerCurrent, routeMode, routeSeat]);
  const [equipped, setEquipped] = useState<Readonly<Record<string, string>>>({});
  const [reactionChosen, setReactionChosen] = useState<string | null>(null);
  const [expansion, setExpansion] = useState<ArenaExpansionHome | null>(null);
  const requestResultSync = useCallback(async (matchId: string, version?: number) => {
    const dispatch = await arenaV2SyncMatchDispatch(matchId, version, resultAccount);
    if (!dispatch) throw new Error('arena_account_scope_stale');
    return dispatch.networkPromise;
  }, [resultAccount]);
  /**
   * Отчёт мог не уйти — например, матч доигран в метро. Сюда игрок приходит
   * сразу после матча, поэтому досылаем прямо здесь, а потом честно смотрим,
   * остался ли отчёт в очереди: без этой проверки экран сказал бы «матч
   * засчитан» про матч, о котором сервер ещё не знает.
   */
  useEffect(() => {
    if (!resultAccountActive) return;
    // Досылка остаётся фоновой: экран ожидания ей больше не принадлежит.
    // Цельный итог монтируется только из terminal sync / atomic handoff.
    void arenaFlushOutbox()
      .catch(() => {});
  }, [matchId, resultAccountActive]);

  useEffect(() => {
    if (!resultAccountActive || !matchId) return;
    let alive = true;
    void requestResultSync(matchId).then((response) => {
      if (!alive) return;
      if (response.viewerSeat) { rememberArenaViewerSeat(matchId, response.viewerSeat); setViewerSeat(response.viewerSeat); }
      if (response.viewerReward) setPrivateRewardState({ matchId, reward: response.viewerReward });
      setQuickResultState((previous) => arenaQuickResultReduce(previous, {
        type: 'sync',
        matchId,
        version: response.version,
        state: String(response.state ?? ''),
        match: response.match,
        viewerSeat: response.viewerSeat,
        viewerReward: response.viewerReward,
      }));
    }).catch(() => {});
    return () => { alive = false; };
  }, [matchId, requestResultSync, resultAccountActive, resultAccountKey]);
  useEffect(() => {
    if (!resultAccountActive) {
      setExpansion(null);
      setEquipped({});
      return;
    }
    void arenaExpansionHome()
      .then((home) => { setExpansion(home); setEquipped(home.wallet.equippedBySlot); })
      .catch(() => { setExpansion(null); });
  }, [resultAccountActive, resultAccountKey]);
  useEffect(() => {
    if (!matchId) return;
    setQuickResultState((previous) => arenaQuickResultReduce(previous, {
      type: 'live', matchId, match: live.value,
    }));
  }, [live.value, matchId]);
  const terminalSyncVersion = quickResultAccountKey === resultAccountKey
    ? arenaQuickResultTerminalSyncVersion(quickResultState)
    : null;
  useArenaTerminalResultSync({
    active: resultAccountActive,
    matchId,
    accountKey: resultAccountKey,
    terminalSyncVersion,
    request: requestResultSync,
    onRequested: (version) => {
      if (!matchId) return;
      setQuickResultState((previous) => arenaQuickResultReduce(previous, {
        type: 'terminal_sync_requested', matchId, version,
      }));
    },
    onResolved: (response) => {
      if (!matchId) return;
      if (response.viewerSeat) {
        rememberArenaViewerSeat(matchId, response.viewerSeat);
        setViewerSeat(response.viewerSeat);
      }
      if (response.viewerReward) setPrivateRewardState({ matchId, reward: response.viewerReward });
      setQuickResultState((previous) => arenaQuickResultReduce(previous, {
        type: 'sync',
        matchId,
        version: response.version,
        state: String(response.state ?? ''),
        match: response.match,
        viewerSeat: response.viewerSeat,
        viewerReward: response.viewerReward,
      }));
    },
  });
  const quickPresentation = quickResultAccountKey === resultAccountKey
    && quickResultState.matchId === matchId
    ? quickResultState.presentation
    : null;
  const quickKnown = quickResultAccountKey === resultAccountKey
    && quickResultState.matchId === matchId && quickResultState.quickKnown;
  const match = quickPresentation?.match ?? live.value;
  // зачем (2026-08-23): до ответа сервера `match` ещё нет, а нижние кнопки
  // зависят от режима. Без этого при раннем открытии (D-74) друг-матч сначала
  // показывал бы disabled «Сыграть снова», а потом подменял её другой кнопкой —
  // прыжок на глазах у игрока. Режим известен локально, из плана.
  const effectiveMode = match?.mode ?? preview?.mode ?? null;
  const replayMode = arenaResultReplayMode(routeMode, match)
    ?? (effectiveMode === 'quick' || effectiveMode === 'ranked' ? effectiveMode : null);
  const surfaceKind = arenaResultSurfaceKind({
    matchId,
    match,
    quickKnown,
    quickReady: Boolean(quickPresentation),
  });
  const effectiveViewerSeat = quickPresentation?.viewerSeat ?? viewerSeat;
  const privateReward = privateRewardState?.matchId === matchId ? privateRewardState.reward : undefined;
  const publicReward = effectiveViewerSeat ? match?.result?.rewards?.[effectiveViewerSeat] : undefined;
  const quickReward = quickPresentation?.reward;
  const reward = match?.mode === 'quick' ? quickReward : privateReward ?? publicReward;
  /**
   * зачем (владелец, 23.08): победа в рейтинге над реальным игроком выдаёт
   * спин из ОБЩЕГО каталога подарков — не отдельную награду Арены. Сервер
   * лишь подтверждает факт (`spinAwarded`) и присылает `spinReceiptId` =
   * matchId; локальная выдача идемпотентна по этому ключу, поэтому повторный
   * рендер экрана (догрузка косметики, возврат назад) не выдаст второй спин.
   */
  useEffect(() => {
    if (!reward || match?.mode === 'quick') return;
    if (!reward.spinAwarded || !reward.spinReceiptId) return;
    void grantLocalArenaRankedWinSpin(reward.spinReceiptId, captureAccountGeneration());
  }, [match?.mode, reward]);
  const quickXp = useMemo(() => arenaQuickXpPresentation(quickReward), [quickReward]);
  const quickXpRewards = useMemo(() => quickXp.modifiers.length ? ({
    multipliers: quickXp.modifiers.map((modifier) => ({
      label: arenaText(lang, modifier.kind === 'correct' ? 'xpCorrectBonus' : 'xpOutcomeBonus'),
      xpDelta: modifier.xpDelta,
    })),
  }) : undefined, [lang, quickXp.modifiers]);
  const players: readonly ArenaDisplayedPlayer[] = useMemo(() => {
    if (!match) {
      // зачем (2026-08-23): экран открывается СРАЗУ после последнего задания,
      // ещё до ответа сервера — иначе игрок несколько секунд смотрел на
      // погашенный вопрос. Пока авторитетного матча нет, строку игроков рисует
      // локальный предпросмотр: счёт свой известен точно, счёт соперника —
      // когда известен (у молчащего живого соперника остаётся прочерк).
      if (!preview) return [];
      const you: ArenaDisplayedPlayer = {
        uid: preview.viewerSeat, name: arenaText(lang, 'you'),
        rank: 0, rating: 0, score: preview.viewerStars, correct: 0,
      };
      const rival: ArenaDisplayedPlayer = {
        uid: preview.opponentSeat,
        name: preview.opponentName || arenaText(lang, 'opponent'),
        ...(preview.opponentAvatar ? { avatar: preview.opponentAvatar } : {}),
        ...(preview.opponentAura ? { aura: preview.opponentAura } : {}),
        rank: preview.opponentRank,
        rating: 0,
        score: preview.opponentStars,
        correct: 0,
      };
      return preview.viewerSeat === 'a' ? [you, rival] : [rival, you];
    }
    if (match.result?.players?.length) return match.result.players;
    return match.players.map((player) => ({
      ...player,
      name: player.uid === effectiveViewerSeat ? arenaText(lang, 'you') : player.name,
    }));
  }, [effectiveViewerSeat, lang, match, preview]);
  // Соперник = тот игрок, который не мы. Имя берём как показано на экране.
  const opponentForReport = useMemo(
    () => players.find((player) => player.uid !== effectiveViewerSeat) ?? null,
    [effectiveViewerSeat, players],
  );
  const winner = match?.result?.winnerUid;
  // Пока авторитетного матча нет, заголовок берётся из предпросмотра — и
  // ТОЛЬКО если исход посчитан однозначно. Иначе экран промолчал бы «Ничья»,
  // которую сервер потом опроверг бы: ложный итог хуже отсутствующего.
  const previewTitle = !match && preview?.outcome
    ? arenaText(lang, preview.outcome === 'win' ? 'victory'
      : preview.outcome === 'loss' ? 'defeat' : 'draw')
    : null;
  const title = previewTitle ?? (match?.state === 'aborted'
    ? arenaText(lang, 'cancelledMatch')
    : winner && effectiveViewerSeat
      ? (winner === effectiveViewerSeat ? arenaText(lang, 'victory') : arenaText(lang, 'defeat'))
      : arenaText(lang, 'draw'));
  /**
   * Исход звучит ОДИН раз, по появлению итога, а не по перерисовке экрана:
   * экран результата перерисовывается несколько раз, пока догружаются
   * косметика и награды, и без этой защёлки фанфара играла бы очередью.
   */
  const playSound = useArenaSound();
  /**
   * Что объявить сверх счёта. Раньше повышение тира и выданная косметика
   * только ЗВУЧАЛИ: игрок слышал фанфару и не видел ничего, то есть не узнавал
   * ни что случилось, ни что он получил.
   */
  const announce = useMemo(() => arenaResultAnnounce(reward), [reward]);
  // зачем: премиум-такт звезды (владелец 2026-08-23) — вспышка экрана, звук и
  // хаптика ровно в момент посадки победной звезды, а не при монтировании.
  const announceFlash = useSharedValue(0);
  const announceRankLabel = useMemo(() => {
    if (typeof reward?.ratingAfter !== 'number') return '';
    const view = arenaRankView(reward.ratingAfter);
    return `${arenaText(lang, TIER_COPY[view.tierIndex])} · ${ROMAN_DIVISION[view.division]}`;
  }, [lang, reward?.ratingAfter]);
  const onStarBeatImpact = useCallback(() => {
    playSound('starLand');
    void hapticSuccess();
    fireImpactFlash(announceFlash, 0.4);
  }, [announceFlash, playSound]);
  const outcomeToldRef = useRef(false);
  useEffect(() => {
    if (!match || outcomeToldRef.current) return;
    if (match.mode === 'quick') return;
    if (match.state === 'aborted') return;
    if (!winner && match.state !== 'settled') return;
    outcomeToldRef.current = true;
    playSound(!winner ? 'resultDraw' : winner === effectiveViewerSeat ? 'resultWin' : 'resultLoss');
    // Звёзды приземляются в кошелёк отдельным звуком: это другое событие, и
    // игрок должен услышать, что начисление действительно случилось.
    // зачем: в рейтинговом матче звук звезды играет такт ранга ровно в момент
    // посадки (onStarBeatImpact) — дубль при монтировании убран.
    if (Number(reward?.starsEarned ?? 0) > 0 && match.mode !== 'ranked') playSound('starLand');
    // Повышение и понижение ранга — самое громкое, что бывает после матча.
    const rankEvent = String((reward as { rankEvent?: unknown } | undefined)?.rankEvent ?? '');
    if (rankEvent === 'tier_up') playSound('rankUp');
    if (rankEvent === 'tier_down') playSound('rankDown');
    if (Array.isArray((reward as { tierRewards?: unknown[] } | undefined)?.tierRewards)) {
      playSound('rewardUnlock');
    }
  }, [effectiveViewerSeat, match, playSound, reward, winner]);

  const resultTheme = arenaResultTheme(equipped.result_theme);
  const titleCosmetic = arenaStoreItemTitle(lang, equipped.title);
  const victoryStamp = winner === effectiveViewerSeat ? arenaStoreItemTitle(lang, equipped.victory_stamp) : null;
  const reactionPack = arenaStoreItemTitle(lang, equipped.reaction_pack);
  const series = match?.seriesId
    ? expansion?.rivalries.find((item) => item.rivalryId === match.seriesId)
    : undefined;
  const seriesYou = series?.viewerWins ?? (effectiveViewerSeat === 'b'
    ? match?.result?.seriesSummary?.winsB
    : match?.result?.seriesSummary?.winsA) ?? 0;
  const seriesThem = series?.opponentWins ?? (effectiveViewerSeat === 'b'
    ? match?.result?.seriesSummary?.winsA
    : match?.result?.seriesSummary?.winsB) ?? 0;
  // зачем: предложение начать/принять соперничество вело на удалённый
  // /arena_rivalries (владелец, 2026-08-16). openRivalry/incomingRivalOffer
  // убраны вместе с кнопкой — счёт УЖЕ идущей серии (seriesYou/seriesThem
  // выше) остаётся честным отображением состояния матча, не приглашением.

  useEffect(() => {
    if (!active || reduceMotion || !match || winner !== effectiveViewerSeat || celebratedRef.current === match.matchId) return;
    if (match.mode === 'quick') return;
    celebratedRef.current = match.matchId;
    fxRef.current?.confetti({ x: window.width / 2, y: Math.min(260, window.height * 0.3) }, [P.accent, P.gold, P.text]);
  }, [active, effectiveViewerSeat, match, P.accent, P.gold, P.text, reduceMotion, winner, window.height, window.width]);

  const rankScene = motionVariant === 'hybrid' && !rankSceneDismissed && announce.rank.kind !== 'none' ? (
    <ArenaRankChangeHybrid
      transition={announce.rank}
      starsAwarded={announce.starsEarned}
      chestUnlocked={announce.unlockedItemIds.length > 0}
      onDone={() => setRankSceneDismissed(true)}
      // «Реванш» остаётся доступен внутри сцены понижения и атомарно закрывает её.
      onRevenge={() => {
        setRankSceneDismissed(true);
        router.replace({ pathname: '/arena_matchmaking', params: { mode: match?.mode === 'ranked' ? 'ranked' : 'quick', requestId: createArenaRequestId('queue') } } as never);
      }}
    />
  ) : null;

  if (!resultOwnerCurrent) return null;

  if ((surfaceKind === 'neutral_pending' || surfaceKind === 'quick_pending') && matchId && !preview) {
    // Этот route в нормальном ходе открывается только с атомарным handoff из
    // матча. Если старый deep link всё же пришёл раньше данных, не показываем
    // отдельный «ждём/отправляем» экран между игрой и исходом.
    //
    // зачем (2026-08-23): с локальным предпросмотром пустого кадра больше нет —
    // экран открывается сразу после последнего задания и рисует свой счёт, а
    // награды и ранг догоняют. Без предпросмотра (старый deep link) поведение
    // прежнее.
    return null;
  }

  if (surfaceKind === 'quick_ready' && matchId && quickPresentation && quickReward) {
    return (
      <ResultsSequence
        stars={0}
        showStars={false}
        showFinaleMark={false}
        xp={quickXp.baseXp}
        rewards={quickXpRewards}
        title={title}
        subtitle={arenaText(lang, 'result')}
        badge={players.length ? <ArenaPlayers players={players} active={active} animateScore /> : undefined}
        intensity={winner === effectiveViewerSeat ? 'major' : 'milestone'}
        onCtaPrimary={() => router.push({ pathname: '/arena_review', params: { matchId } } as never)}
        ctaPrimaryLabel={arenaText(lang, 'reviewTitle')}
        onCtaSecondary={() => router.replace({
          pathname: '/arena_matchmaking', params: { mode: 'quick', requestId: createArenaRequestId('queue') },
        } as never)}
        ctaSecondaryLabel={arenaText(lang, 'playAgain')}
        onCtaTertiary={() => router.replace('/arena' as never)}
        ctaTertiaryLabel={arenaText(lang, 'home')}
      />
    );
  }

  return (
    <ArenaScreen title={arenaText(lang, 'result')} subtitle={title} variant="results" fxRef={fxRef} onBack={() => router.replace('/arena' as never)} overlay={rankScene ?? <ImpactFlash opacity={announceFlash} />}>
      {players.length ? <ArenaPlayers players={players} active={active} animateScore /> : null}
      {titleCosmetic ? <Text style={[styles.cosmeticTitle, { color: P.gold }]}>{titleCosmetic}</Text> : null}
      <V2Card style={[styles.resultSurface, resultTheme ? { backgroundColor: resultTheme.backgroundColor, borderColor: resultTheme.borderColor, borderWidth: 1 } : null]}>
        {victoryStamp ? <Text style={[styles.stamp, { color: resultTheme?.foreground ?? P.text }]}>{victoryStamp}</Text> : null}
        <View style={styles.stats}>{players.map((player) => (
          // Прочерк, а не ноль: ноль здесь был бы утверждением «соперник не
          // набрал ничего», хотя счёт просто ещё не известен.
          <ArenaStat key={player.uid} label={player.name} value={player.score ?? '—'} />
        ))}</View>
        {effectiveMode !== 'quick' ? <ArenaRewards reward={reward} starsLabel={arenaText(lang, 'stars')} /> : null}
        {/* зачем: жалоба на игрока жила только в карточке профиля, а из Арены
            она не открывается — пожаловаться на оскорбительный ник было
            физически нечем. Ставим сюда, а не в бой: там таймер, и случайный
            тап стоил бы матча. Бота отсеивает сервер — клиент про бота не
            знает намеренно (он не раскрывается в интерфейсе). */}
        {matchId && effectiveViewerSeat && opponentForReport ? (
          <ArenaReportOpponentButton
            matchId={matchId}
            opponentSeat={opponentForReport.uid === 'a' ? 'a' : 'b'}
            opponentName={opponentForReport.name}
            lang={lang}
            tone={P.muted}
          />
        ) : null}
      </V2Card>
      {reactionPack ? <View style={styles.reactions}><Text style={[styles.reactionHint, reactionLine, { color: P.muted }]}>{arenaExpansionText(lang, 'localReaction')}</Text>{(equipped.reaction_pack === 'reactions_respect' ? ['reactionRespect', 'reactionWellPlayed'] as const : ['reactionComeback', 'reactionAgain'] as const).map((key) => <V2Cta key={key} tone="ghost" disabled={reactionChosen !== null} onPress={() => setReactionChosen(key)}>{arenaExpansionText(lang, reactionChosen === key ? 'ready' : key)}</V2Cta>)}</View> : null}
      {match?.mode !== 'quick' && reward?.spinAwarded && reward.spinReceiptId ? (
        <SpinRewardPlaque amount={1} receiptId={reward.spinReceiptId} visible onComplete={() => {}} staticPresentation />
      ) : null}
      {match?.mode === 'series' ? <V2Card style={styles.seriesCard}><Text style={[styles.reactionHint, reactionLine, { color: P.muted }]}>{arenaExpansionText(lang, 'rivalryBody')}</Text><Text style={[styles.seriesScore, { color: P.gold }]}>{arenaExpansionText(lang, 'score').replace('{you}', String(seriesYou)).replace('{them}', String(seriesThem))}</Text></V2Card> : null}
      {/* Ничья тоже получает карточку: «звёзды на месте» — ответ, не молчание. */}
      {(arenaResultHasAnnounce(announce) || reward?.outcome === 'draw')
        && !(motionVariant === 'hybrid' && !rankSceneDismissed && announce.rank.kind !== 'none') ? (
        <V2Card style={styles.announce}>
          {announce.rank.kind === 'tier_up' || announce.rank.kind === 'tier_down' ? (
            <Text style={[styles.announceHead, {
              color: announce.rank.kind === 'tier_up' ? P.accent : P.danger,
            }]}>
              {arenaText(lang, announce.rank.kind === 'tier_up' ? 'resultTierUp' : 'resultTierDown')}
              {' · '}
              {arenaText(lang, TIER_COPY[announce.rank.tierIndex])}
            </Text>
          ) : announce.rank.kind === 'rank_up' || announce.rank.kind === 'rank_down' ? (
            <Text style={[styles.announceHead, {
              color: announce.rank.kind === 'rank_up' ? P.accent : P.muted,
            }]}>
              {arenaText(lang, announce.rank.kind === 'rank_up' ? 'resultRankUp' : 'resultRankDown')}
            </Text>
          ) : null}

          {/* Звёздный такт — со знаком: потерю скрывать нельзя.
              зачем: владелец (2026-08-23), премиум-макет A/B/C: победная
              звезда прилетает и бьёт, потерянная «выдыхает», ничья дышит. */}
          {typeof reward?.ratingAfter === 'number' ? (
            <ArenaResultStarBeat
              ratingAfter={reward.ratingAfter}
              ratingDelta={announce.ratingDelta}
              rankLabel={announceRankLabel}
              isDraw={reward?.outcome === 'draw'}
              reduceMotion={reduceMotion}
              onImpact={onStarBeatImpact}
            />
          ) : null}

          {/* Косметика за тир. Владелец (D-63): награда — предмет, не звёзды. */}
          {announce.unlockedItemIds.length ? (
            <Text style={[styles.announceLine, { color: P.gold }]}>
              {arenaText(lang, 'resultUnlocked')}: {announce.unlockedItemIds.length}
            </Text>
          ) : null}
        </V2Card>
      ) : null}
      {/* Разбор — первой кнопкой и БЕЗ флага расширения: владелец потребовал
          его обязательным, а «Лаборатория» под флагом — это повторы заданий,
          а не разбор. */}
      {matchId ? (
        <V2Cta tone="ghost" onPress={() => router.push({ pathname: '/arena_review', params: { matchId } } as never)}>
          {arenaText(lang, 'reviewTitle')}
        </V2Cta>
      ) : null}
      {/* зачем: переход «продолжить серию» вёл на /arena_rivalries — экран
          расширения удалён вместе с предложением начать соперничество
          (владелец, 2026-08-16). match.mode === 'series' остаётся валидным
          состоянием УЖЕ идущего матча (счёт серии выше по-прежнему честный),
          но начать новую серию отсюда больше нельзя — только сыграть снова. */}
      {effectiveMode === 'friend' ? (
        <V2Cta onPress={() => router.replace('/arena_friend_duel' as never)}>
          {arenaText(lang, 'playAgain')}
        </V2Cta>
      ) : (
        <V2Cta
          disabled={!replayMode}
          onPress={() => {
            if (!replayMode) return;
            router.replace({
              pathname: '/arena_matchmaking',
              params: { mode: replayMode, requestId: createArenaRequestId('queue') },
            } as never);
          }}
        >
          {arenaText(lang, 'playAgain')}
        </V2Cta>
      )}
      <V2Cta tone="ghost" onPress={() => router.replace('/arena' as never)}>{arenaText(lang, 'home')}</V2Cta>
      {/*
        Сервер отказался засчитывать матч. Молчать здесь нельзя: без этой
        строки игрок получил бы ложный обычный итог. Это терминальный отказ,
        а не промежуточный экран ожидания.
      */}
      {reportRejected ? (
        <View style={styles.pending}>
          <Text accessibilityLiveRegion="polite" style={[styles.pendingTitle, { color: P.danger }]}>
            {arenaText(lang, 'reportRejected')}
          </Text>
          <Text style={[styles.pendingHint, pendingLine, { color: P.muted }]}>{arenaText(lang, 'reportRejectedHint')}</Text>
        </View>
      ) : null}
    </ArenaScreen>
  );
}
