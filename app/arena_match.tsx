import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { BackHandler, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Animated, { FadeIn, FadeInDown, SlideInRight, ZoomIn } from 'react-native-reanimated';

import { arenaTaskRenderable } from '../modules/arena/task_adapter';
import { arenaLoadMatch } from '../modules/arena/match_store';
import type { ArenaLocalMatchState, ArenaMatchReport } from '../modules/arena/match_machine';
import type { ArenaOutboxOwnerScope } from '../modules/arena/result_outbox';
import {
  arenaDeliverFinishedMatch,
  type ArenaFinishDeliveryResult,
} from '../modules/arena/finish_delivery';
import { arenaRememberScopedReview } from '../modules/arena/review_retry';
import type { ArenaKeyValueStore } from '../modules/arena/match_store';
import { useLang } from '../components/LangContext';
import { useTheme } from '../components/ThemeContext';
import HybridAlertShell from '../components/modal_fx/HybridAlertShell';
import DuoPressable from '../components/DuoPressable';
import { ArenaScreen } from '../components/arena/ArenaScreen';
import { ArenaPlayers } from '../components/arena/ArenaPlayers';
import { ArenaQuestion } from '../components/arena/ArenaQuestion';
import { ArenaTimerRing } from '../components/arena/ArenaTimerRing';
import { ArenaComboMeter } from '../components/arena/ArenaComboMeter';
import { ArenaStarFlight } from '../components/arena/ArenaStarFlight';
import { ArenaVersusIntro } from '../components/arena/ArenaVersusIntro';
import { ArenaFinalScoreCount } from '../components/arena/ArenaFinalScoreCount';
import { V2Cta, V2Segments } from '../components/ui/v2_ui';
import EnergyCostBadge from '../components/EnergyCostBadge';
import { useTournamentPalette, v2motion } from '../components/ui/v2_theme';
import { arenaAwardReasonText, arenaText } from '../modules/arena/copy';
import type { ArenaMatch, ArenaMatchReward, ArenaPlayer } from '../modules/arena/contract';
import {
  arenaEntryFailure,
  arenaEntryFailureCopy,
  type ArenaEntryFailure,
  arenaPlanTaskToPublic,
  type ArenaMatchPlanWire,
} from '../modules/arena/duel_plan';
import { arenaAwardLines, arenaMatchHud } from '../modules/arena/match_view';
import { arenaQuestionLayout } from '../modules/arena/question_layout';
import { useArenaLocalMatch } from '../hooks/use_arena_local_match';
import { useArenaTerminalResultSync } from '../hooks/use_arena_terminal_result_sync';
import {
  arenaClosedTicks,
  arenaLivePublishPlan,
  arenaMergeOpponentTicks,
  arenaParseLiveSeat,
} from '../modules/arena/live_channel';
import { arenaMonotonicNowMs } from '../modules/arena/monotonic';
import { useArenaFontScale } from '../hooks/use_arena_font_scale';
import { useRuntimeActive } from '../hooks/use_runtime_active';
import { arenaCosmeticDefinition } from '../modules/arena/arena_cosmetics';
import { useReduceMotion } from '../hooks/use_reduce_motion';
import { useArenaSound } from '../hooks/use_arena_sound';
import {
  arenaExpansionHome,
  arenaMatchReportToWire,
  arenaRetryQueuedFinish,
  arenaV2Forfeit,
  arenaV2MatchFinishDispatch,
  arenaV2SyncMatchDispatch,
  arenaPublishLiveTicks,
  createArenaRequestId,
  useArenaMatch,
  useArenaOpponentLive,
  type ArenaMatchFinishResponse,
  type ArenaQueuedFinishRetryResult,
} from './arena_client';
import {
  captureAccountGeneration,
  isCurrentAccountGeneration,
  subscribeAccountGeneration,
  withAccountTransitionLock,
  type AccountGenerationToken,
} from './account_generation';
import { grantLocalArenaRankedWinSpin } from './local_level_spins';
import { arenaScheduleMatchSettleProbe } from './arena_settle_probe';
import { arenaEntryPrefetchClaim, arenaEntryPrefetchStart } from './arena_entry_prefetch';
import { ArenaNoOpponentError } from '../modules/arena/entry_prefetch';
import {
  arenaRememberResultHandoff,
  arenaResultHandoffReady,
} from '../modules/arena/result_handoff';
import { arenaResultPreview } from '../modules/arena/result_preview';
import { arenaFinishRetryDelay } from '../modules/arena/finish_retry';
import { ARENA_FINAL_SCORE_COUNT_MS } from '../modules/arena/final_score_count';

/**
 * Matchmaking заранее запечатывает входной план. Экран синхронно забирает
 * готовый результат, поэтому VS начинается с реальными игроками и полным
 * отсчётом; прямой вход использует тот же идемпотентный координатор.
 */
/**
 * Экран матча Арены.
 *
 * Сеть здесь трогается ТРИ раза за весь матч: план при входе, отчёт в конце и
 * — только если соперник не сдался к сроку — один запрос на закрытие. Между
 * ними нет ни одного обращения: вердикт считается на устройстве отпечатками и
 * показывается в том же кадре, в котором игрок нажал. Владелец потребовал
 * этого прямо: «чтобы не было вообще задержек, даже 1 секунда недопустима».
 *
 * Строки «Сервер проверяет ответ…» здесь больше нет и быть не может.
 */
type ArenaMatchRouteParams = { matchId?: string; prepared?: string };
type ArenaCoherentResult = Readonly<{
  settled?: boolean;
  match?: ArenaMatch;
  viewerSeat?: 'a' | 'b';
  viewerReward?: ArenaMatchReward;
}>;

export default function ArenaMatchScreen() {
  const params = useLocalSearchParams<ArenaMatchRouteParams>();
  const matchId = typeof params.matchId === 'string' ? params.matchId : null;
  const [accountGeneration, setAccountGeneration] = useState(captureAccountGeneration);

  useEffect(() => {
    const subscription = subscribeAccountGeneration(setAccountGeneration);
    setAccountGeneration(captureAccountGeneration());
    return () => subscription.remove();
  }, []);

  const accountGenerationKey = [
    accountGeneration.phase,
    accountGeneration.generation,
    accountGeneration.stableId ?? '',
    matchId ?? '',
  ].join(':');
  return (
    <ArenaMatchGenerationScreen
      key={accountGenerationKey}
      accountGeneration={accountGeneration}
      matchId={matchId}
      params={params}
    />
  );
}

function ArenaMatchGenerationScreen({
  accountGeneration,
  matchId,
  params,
}: Readonly<{
  accountGeneration: AccountGenerationToken;
  matchId: string | null;
  params: ArenaMatchRouteParams;
}>) {
  const router = useRouter();
  const { lang } = useLang();
  const P = useTournamentPalette();
  const { theme: t, f } = useTheme();
  // зачем: три голых Alert.alert (выход из матча, ошибка сохранения отчёта,
  // отчёт отклонён) заменены на один стилизованный HybridAlertShell —
  // владелец запретил системные алерты в Арене. Логика кнопок 1:1.
  const [matchAlert, setMatchAlert] = useState<
    | { kind: 'leave' }
    | { kind: 'storageFailed' }
    | { kind: 'rejected' }
    | null
  >(null);
  // Высота строки числом не растёт вместе с системным шрифтом: при крупном
  // кегле объяснения наезжали строка на строку. См. use_arena_font_scale.
  const fontScale = useArenaFontScale();
  const titleLine = { lineHeight: 26 * fontScale };
  const hintLine = { lineHeight: 20 * fontScale };
  const [preparedEntry] = useState(() => params.prepared === '1' && matchId
    ? arenaEntryPrefetchClaim(matchId)
    : null);
  const preparedRoute = params.prepared === '1' && Boolean(preparedEntry);
  const active = useRuntimeActive();
  const reduceMotion = useReduceMotion();
  const playSound = useArenaSound();
  const mountedRef = useRef(true);
  useEffect(() => () => { mountedRef.current = false; }, []);
  /**
   * Доставка отчёта переживает уход с экрана.
   *
   * зачем (2026-08-23): с ранним переходом на результат (D-74) экран матча
   * размонтируется РАНЬШЕ, чем отчёт доедет до диска. Если сторожить доставку
   * по `mountedRef`, первая же проверка `isAlive()` провалится, отчёт не ляжет
   * даже в очередь — и игрок не получит ни звёзд, ни рейтинга за сыгранный
   * матч, причём безвозвратно: `arenaFlushOutbox` чинит только то, что в
   * очередь ПОПАЛО.
   *
   * Флаг не гаснет никогда: единственная причина бросить доставку — чужой
   * аккаунт, а это отдельно и строго сторожит `isScopeCurrent`.
   */
  const deliveryAliveRef = useRef(true);
  const planAccountRef = useRef<AccountGenerationToken | null>(
    accountGeneration.phase === 'active' && accountGeneration.stableId
      ? accountGeneration
      : null,
  );
  const planScope = useMemo<ArenaOutboxOwnerScope | null>(
    () => accountGeneration.phase === 'active' && accountGeneration.stableId
      ? {
        stableUid: accountGeneration.stableId,
        accountGeneration: accountGeneration.generation,
      }
      : null,
    [accountGeneration],
  );

  const [plan, setPlan] = useState<ArenaMatchPlanWire | null>(() => preparedEntry?.plan ?? null);
  const [planError, setPlanError] = useState(false);
  /** Тик ожидания готовности аккаунта: без него загрузка плана не повторялась. */
  const [planAccountTick, setPlanAccountTick] = useState(0);
  const [restored, setRestored] = useState<ArenaLocalMatchState | null>(null);
  const [restoreChecked, setRestoreChecked] = useState(preparedRoute);
  /**
   * Почему не вошли. Владелец (D-72): рейтинг без сети начать нельзя, и игрок
   * должен видеть ПРИЧИНУ, а не общее «повторить»: «нет сети» и «матч уже
   * кончился» лечатся по-разному.
   */
  const [entryFailure, setEntryFailure] = useState<ArenaEntryFailure | null>(null);
  const [introDone, setIntroDone] = useState(false);
  const finishIntro = useCallback(() => setIntroDone(true), []);
  const [sent, setSent] = useState(false);
  const [finishQueued, setFinishQueued] = useState(false);
  /**
   * Косметика входа — платная. При переписывании экрана она чуть не пропала:
   * раньше она красила карточку принятия дуэли, а карточки больше нет — дуэль
   * принимается сама. Теперь она красит заставку «ты против соперника», то есть
   * ровно тот момент входа, за который её и покупали.
   */
  const [entryCosmetic, setEntryCosmetic] = useState<string | undefined>();
  const entryTreatment = arenaCosmeticDefinition(entryCosmetic)?.treatment;

  useEffect(() => {
    if (!active) return;
    void arenaExpansionHome()
      .then((home) => setEntryCosmetic(home.wallet.equippedBySlot.entry))
      .catch(() => {});
  }, [active]);

  /* ---- прямой вход: забрать тот же подготовленный план ---- */
  useEffect(() => {
    if (!active || !matchId || plan || planError || !restoreChecked || restored) return;
    let alive = true;
    const entryAccount = planAccountRef.current;
    /**
     * зачем (владелец 2026-08-29, «открываю матч — пустой экран»): аккаунт на
     * холодном старте поднимается позже, чем монтируется экран, и эффект молча
     * выходил НАВСЕГДА — повторить его было нечем (в зависимостях нет ничего,
     * что менялось бы от готовности аккаунта). План не грузился, planError не
     * ставился, рендер оставался на защитной ветке. Пробуем ещё раз, пока
     * аккаунт не активируется.
     */
    if (!entryAccount || !isCurrentAccountGeneration(entryAccount, entryAccount.stableId)) {
      const retry = setTimeout(() => { if (alive) setPlanAccountTick((tick) => tick + 1); }, 500);
      return () => { alive = false; clearTimeout(retry); };
    }
    void arenaEntryPrefetchStart(matchId)
      .then((prepared) => {
        if (alive && isCurrentAccountGeneration(entryAccount, entryAccount.stableId)) {
          setPlan(prepared.plan);
        }
      })
      .catch((reason) => {
        if (!alive || !isCurrentAccountGeneration(entryAccount, entryAccount.stableId)) return;
        setEntryFailure(reason instanceof ArenaNoOpponentError
          ? 'no_opponent'
          : arenaEntryFailure(reason));
        setPlanError(true);
      });
    return () => { alive = false; };
  }, [active, matchId, plan, planAccountTick, planError, planScope, restoreChecked, restored]);

  /* ---- живой прогресс соперника ---- */
  const live = useArenaOpponentLive(matchId, plan?.opponent.seat ?? null, active && Boolean(plan));
  const terminalLive = useArenaMatch(matchId, active && sent);
  const liveSeat = useMemo(
    () => (plan ? arenaParseLiveSeat(live.value, plan.tasks.length) : null),
    [live.value, plan],
  );
  /**
   * Два источника, один код. У бота ходы приезжают вместе с планом, у живого
   * соперника — из канала, и нигде не спрашивается, кто перед нами: такая
   * развилка сразу утекла бы в поведение экрана.
   */
  const opponentTicks = useMemo(
    () => (plan ? arenaMergeOpponentTicks(plan.opponentTicks, liveSeat?.ticks ?? []) : []),
    [plan, liveSeat],
  );

  /**
   * Снимок матча с диска.
   *
   * Он писался на каждой границе задания — и НИКТО его не читал. То есть цена
   * записи платилась, а обещанное свойство «матч переживает перезапуск» не
   * работало: приложение убили посреди матча — и он начинался заново, с
   * первого задания и с обнулённым временем.
   *
   * Восстанавливаем только снимок ЭТОГО матча и только пока он не доигран —
   * это проверяет сам модуль хранения.
   */
  useEffect(() => {
    if (preparedRoute) {
      setRestoreChecked(true);
      return;
    }
    if (!matchId) { setRestoreChecked(true); return; }
    const restoreAccount = planAccountRef.current;
    if (!planScope || !restoreAccount
      || !isCurrentAccountGeneration(restoreAccount, planScope.stableUid)) return;
    let alive = true;
    void arenaLoadMatch(
      AsyncStorage as unknown as ArenaKeyValueStore,
      planScope,
      Date.now(),
      matchId,
    )
      .then((stored) => {
        if (alive && stored && isCurrentAccountGeneration(restoreAccount, planScope.stableUid)) {
          setPlan(stored.plan);
          setRestored(stored.state);
        }
      })
      .catch(() => {})
      .finally(() => {
        if (alive && isCurrentAccountGeneration(restoreAccount, planScope.stableUid)) {
          setRestoreChecked(true);
        }
      });
    return () => { alive = false; };
  }, [matchId, planScope, preparedRoute]);

  /**
   * План подставляется в машину только когда проверка снимка закончилась:
   * иначе матч успел бы начаться с нуля и затереть восстановленное состояние.
   */
  const match = useArenaLocalMatch({
    plan: restoreChecked && planAccountRef.current && planScope
      && isCurrentAccountGeneration(planAccountRef.current, planScope.stableUid)
      ? plan : null,
    ownerScope: planScope,
    restored,
    opponentTicks,
  });

  const [finalScoreReady, setFinalScoreReady] = useState(false);
  const finalScoreReadyRef = useRef(false);
  const pendingCoherentResultRef = useRef<ArenaCoherentResult | null>(null);
  useEffect(() => {
    if (match?.state.phase !== 'finished') {
      finalScoreReadyRef.current = false;
      setFinalScoreReady(false);
      return undefined;
    }
    if (finalScoreReadyRef.current) return undefined;

    if (reduceMotion) {
      finalScoreReadyRef.current = true;
      setFinalScoreReady(true);
      return undefined;
    }

    const timer = setTimeout(() => {
      finalScoreReadyRef.current = true;
      setFinalScoreReady(true);
    }, ARENA_FINAL_SCORE_COUNT_MS);
    return () => clearTimeout(timer);
  }, [match?.state.phase, reduceMotion]);

  /* ---- публикация своего хода: одна запись на задание, не больше ---- */
  const publishedRef = useRef<number[]>([]);
  const finishPublishedRef = useRef(false);
  useEffect(() => {
    if (!matchId || !plan || !match) return;
    const decision = arenaLivePublishPlan({
      publishedTaskIndexes: publishedRef.current,
      closedTicks: arenaClosedTicks(match.state),
      finished: match.state.phase === 'finished',
      finishPublished: finishPublishedRef.current,
    });
    // null означает «писать нечего». Это и есть предохранитель против роста
    // счёта за базу: экран дёргает этот эффект на каждое изменение состояния,
    // а запись случается только на границе задания.
    if (!decision) return;
    decision.ticks.forEach((tick) => publishedRef.current.push(tick.taskIndex));
    if (decision.finished) finishPublishedRef.current = true;
    void arenaPublishLiveTicks({
      matchId,
      seat: plan.viewerSeat,
      ticks: arenaClosedTicks(match.state),
      finished: decision.finished,
    });
  }, [matchId, plan, match]);

  const resultOpenedRef = useRef(false);
  const openCoherentResult = useCallback((response: ArenaCoherentResult) => {
    const resultAccount = planAccountRef.current;
    if (!matchId || !plan || !planScope || !resultAccount) return false;
    // Живость экрана здесь НЕ проверяется намеренно: с ранним переходом (D-74)
    // экран матча к этому моменту уже размонтирован в норме, а спин и снимок
    // с наградами обязаны лечь всё равно. Чужой аккаунт по-прежнему отсекается.
    if (!isCurrentAccountGeneration(resultAccount, planScope.stableUid)) return false;
    if (!arenaResultHandoffReady(response, plan.mode)) return false;

    const ownerKey = `${resultAccount.phase}:${resultAccount.generation}:${planScope.stableUid}`;
    // зачем (2026-08-23): спин за ranked-победу выдаём ЗДЕСЬ, до перехода на
    // экран результата. Сервер больше не хранит кредит Арены (его разыгрывает
    // общий подарочный спин), поэтому если ждать монтирования экрана, награда
    // терялась бы у игрока, который закрыл приложение сразу после матча.
    // Функция идемпотентна по matchId, так что дубль с экрана результата
    // второй спин не создаст.
    if (response.viewerReward?.spinAwarded && response.viewerReward.spinReceiptId) {
      void grantLocalArenaRankedWinSpin(response.viewerReward.spinReceiptId, resultAccount);
    }
    arenaRememberResultHandoff({
      ownerKey,
      matchId,
      match: response.match,
      viewerSeat: response.viewerSeat,
      ...(response.viewerReward ? { viewerReward: response.viewerReward } : {}),
    });
    // Локальный счёт уже известен и должен успеть проявиться до перехода.
    // Авторитетный снимок и награда при этом сохранены выше без задержки.
    if (!finalScoreReadyRef.current) {
      pendingCoherentResultRef.current = response;
      return true;
    }
    pendingCoherentResultRef.current = null;
    // зачем (2026-08-23): экран результата мог открыться РАНЬШЕ этого ответа —
    // по локальному итогу, чтобы игрок не ждал сеть. Тогда переходить некуда,
    // но снимок с наградами всё равно обязан лечь: экран его подхватит и
    // заменит предпросмотр авторитетными числами. Раньше ранний выход стоял
    // до записи снимка, и поздняя награда просто терялась бы.
    if (resultOpenedRef.current) return true;
    // Переходить можно только с живого экрана матча. Мёртвый экран без
    // открытого результата означает, что игрок ушёл сам (сдался, вышел на
    // главную) — выдёргивать его на экран итога из другого места приложения
    // нельзя. Снимок и награды выше уже записаны, они не потеряются.
    if (!mountedRef.current) return true;
    resultOpenedRef.current = true;
    router.replace({
      pathname: '/arena_results',
      params: {
        matchId,
        mode: plan.mode,
        viewerSeat: response.viewerSeat,
        ownerGeneration: String(resultAccount.generation),
      },
    } as never);
    return true;
  }, [matchId, plan, planScope, router]);

  /**
   * Открывает результат по ЛОКАЛЬНОМУ итогу, не дожидаясь сервера.
   *
   * Владелец (2026-08-23): «после последнего вопроса очень долго загружается
   * экран завершения — сделай его прогретым ещё во время последнего ответа».
   * Матч считается на устройстве, поэтому свой счёт известен сразу; сервер
   * нужен только для наград и ранга, и они догоняют следом.
   */
  const openPreviewResult = useCallback(() => {
    const resultAccount = planAccountRef.current;
    if (!matchId || !plan || !planScope || !resultAccount || resultOpenedRef.current) return;
    if (!finalScoreReadyRef.current) return;
    if (!mountedRef.current || !isCurrentAccountGeneration(resultAccount, planScope.stableUid)) return;
    // Быстрый матч намеренно исключён: его кульминация — сцена начисления XP
    // (`ResultsSequence`), и она рисуется только по ответу сервера. Открыть
    // сначала черновой кадр, а потом подменить его целой сценой — заметный
    // скачок, который хуже короткого ожидания.
    if (plan.mode === 'quick') return;
    // Сдача из предпросмотра исключена в самом модуле (`arenaResultPreview`).
    const preview = match ? arenaResultPreview(plan, match.state) : null;
    if (!preview) return;

    const ownerKey = `${resultAccount.phase}:${resultAccount.generation}:${planScope.stableUid}`;
    arenaRememberResultHandoff({ ownerKey, matchId, viewerSeat: plan.viewerSeat, preview });
    resultOpenedRef.current = true;
    router.replace({
      pathname: '/arena_results',
      params: {
        matchId,
        mode: plan.mode,
        viewerSeat: plan.viewerSeat,
        ownerGeneration: String(resultAccount.generation),
      },
    } as never);
  }, [match, matchId, plan, planScope, router]);

  useEffect(() => {
    if (!finalScoreReady) return;
    const pending = pendingCoherentResultRef.current;
    if (pending) openCoherentResult(pending);
  }, [finalScoreReady, openCoherentResult]);

  const handleFinishDelivery = useCallback((delivery:
    | ArenaFinishDeliveryResult<ArenaMatchFinishResponse>
    | ArenaQueuedFinishRetryResult
  ) => {
    if (delivery.status === 'stale') return;
    const finishAccount = planAccountRef.current;
    if (!matchId || !planScope || !finishAccount
      || !isCurrentAccountGeneration(finishAccount, planScope.stableUid)) return;

    // зачем (2026-08-23): экран матча мог уже размонтироваться — с ранним
    // переходом на результат (D-74) это норма, а не ошибка. Показывать что-то
    // на мёртвом экране нельзя (React ругается и это бессмысленно), но НАГРАДЫ
    // и снимок для результата обязаны доехать. Поэтому здесь расходятся два
    // рода действий: setState — только на живом экране, побочные эффекты —
    // всегда.
    const screenAlive = mountedRef.current;

    if (delivery.status === 'queued' || delivery.status === 'kept') {
      if (screenAlive) setFinishQueued(true);
      return;
    }
    if (screenAlive) setFinishQueued(false);
    if (delivery.status === 'storage_failed') {
      if (screenAlive) setMatchAlert({ kind: 'storageFailed' });
      return;
    }
    if (delivery.status === 'sent') {
      const response = delivery.response;
      if (Array.isArray(response.viewerReview)) {
        arenaRememberScopedReview({
          scope: planScope,
          matchId,
          rows: response.viewerReview,
          wallNowMs: Date.now(),
          store: AsyncStorage as unknown as ArenaKeyValueStore,
        });
      }
      if (!response.settled && typeof response.settleProbeAtMs === 'number') {
        arenaScheduleMatchSettleProbe({
          matchId,
          dueAtMs: response.settleProbeAtMs,
          account: finishAccount,
        });
      }
      openCoherentResult(response);
      return;
    }
    if (delivery.status === 'rejected' || delivery.status === 'dropped') {
      if (screenAlive) setMatchAlert({ kind: 'rejected' });
    }
  }, [matchId, openCoherentResult, planScope]);

  /* ---- отчёт: тоже один запрос ---- */
  useEffect(() => {
    if (!matchId || !plan || !match?.report || sent) return;
    // Сохраняем суженное значение до async-границы: объект `match` живёт в
    // React-состоянии и TypeScript справедливо не переносит его narrowing
    // внутрь отложенной функции.
    const report = match.report;
    const finishAccount = planAccountRef.current;
    const finishScope = planScope;
    if (!finishAccount || !finishScope) return;
    setSent(true);
    void (async () => {
      const delivery = await arenaDeliverFinishedMatch({
        store: AsyncStorage as unknown as ArenaKeyValueStore,
        scope: finishScope,
        report: report as ArenaMatchReport,
        rulesVersion: plan.rulesVersion,
        wallNowMs: Date.now(),
        isAlive: () => deliveryAliveRef.current,
        isScopeCurrent: (scope) => isCurrentAccountGeneration(finishAccount, scope.stableUid),
        withTransitionLock: (work) => withAccountTransitionLock(async () => work()),
        reserveDispatch: () => arenaV2MatchFinishDispatch({
          matchId,
          report: arenaMatchReportToWire(report, plan.rulesVersion),
        }, finishAccount),
      });
      handleFinishDelivery(delivery);
    })();
  }, [handleFinishDelivery, matchId, match?.report, plan, planScope, sent]);

  /**
   * Переход на результат СРАЗУ после последнего задания, не дожидаясь сети.
   *
   * Стоит отдельным эффектом от отправки отчёта намеренно: отправка живёт
   * внутри async-цепочки и может задержаться на диске, а кадр обязан смениться
   * в тот же момент, когда матч закрылся. Награды догоняют и заменяют
   * предпросмотр, когда ответ сервера приедет (`openCoherentResult`).
   */
  useEffect(() => {
    if (match?.state.phase !== 'finished' || !finalScoreReady) return;
    openPreviewResult();
  }, [finalScoreReady, match?.state.phase, openPreviewResult]);

  useEffect(() => {
    if (!active || !finishQueued || !matchId) return undefined;
    let alive = true;
    let timer: ReturnType<typeof setTimeout> | null = null;
    let attempt = 0;
    const schedule = () => {
      const delayMs = arenaFinishRetryDelay(attempt);
      attempt += 1;
      if (delayMs === null) return;
      timer = setTimeout(() => {
        void (async () => {
          const retryAccount = planAccountRef.current;
          if (!retryAccount) return;
          const retry = await arenaRetryQueuedFinish(matchId, retryAccount)
            .catch((): ArenaQueuedFinishRetryResult => ({ status: 'kept' }));
          if (!alive) return;
          handleFinishDelivery(retry);
          if (retry.status === 'kept') schedule();
        })();
      }, delayMs);
    };
    schedule();
    return () => {
      alive = false;
      if (timer) clearTimeout(timer);
    };
  }, [active, finishQueued, handleFinishDelivery, matchId]);

  useArenaTerminalResultSync({
    active: active && sent && Boolean(planScope),
    matchId,
    accountKey: planScope
      ? `${planScope.accountGeneration}:${planScope.stableUid}`
      : '',
    terminalSyncVersion: terminalLive.value?.terminal && !resultOpenedRef.current
      ? terminalLive.value.version
      : null,
    request: async (matchId, version) => {
      const resultAccount = planAccountRef.current;
      if (!planScope || !resultAccount
        || !isCurrentAccountGeneration(resultAccount, planScope.stableUid)) {
        throw new Error('arena_account_scope_stale');
      }
      const dispatch = await arenaV2SyncMatchDispatch(matchId, version, resultAccount);
      if (!dispatch) throw new Error('arena_account_scope_stale');
      return dispatch.networkPromise;
    },
    onRequested: () => {},
    onResolved: (response) => {
      openCoherentResult({
        ...response,
        settled: response.state === 'settled' || response.state === 'aborted',
      });
    },
  });

  /* ---- выход ---- */
  const forfeitNow = useCallback(() => {
    match?.abandon();
    if (matchId) void arenaV2Forfeit(matchId).catch(() => {});
    router.replace('/arena' as never);
  }, [match, matchId, router]);

  const confirmForfeit = useCallback(() => {
    setMatchAlert({ kind: 'leave' });
  }, []);

  useEffect(() => {
    if (!active) return undefined;
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      confirmForfeit();
      return true;
    });
    return () => subscription.remove();
  }, [active, confirmForfeit]);

  /* ---- звуки, привязанные к смене состояния ---- */
  const lastTaskRef = useRef(-1);
  const lastComboRef = useRef(0);
  const rivalToldRef = useRef(-1);
  useEffect(() => {
    if (!match) return;
    const state = match.state;
    // Новое задание приехало.
    if (state.taskIndex !== lastTaskRef.current && state.phase === 'reading') {
      lastTaskRef.current = state.taskIndex;
      playSound('taskIn');
    }
    // Серия: рост и обрыв звучат по-разному, потому что значат разное.
    if (state.comboRun > lastComboRef.current) {
      playSound(lastComboRef.current === 0 ? 'comboStart' : 'comboUp');
    } else if (state.comboRun === 0 && lastComboRef.current >= 2) {
      playSound('comboBreak');
    }
    lastComboRef.current = state.comboRun;
  }, [match, playSound]);

  const hud = useMemo(
    () => (plan && match ? arenaMatchHud(plan, match.state, match.phase, arenaMonotonicNowMs()) : null),
    [plan, match],
  );

  useEffect(() => {
    // Звук следует за ВИДИМЫМ ответом соперника, а не за заранее известным
    // сценарием бота. Поэтому бот иногда отвечает уже после игрока — и это
    // слышно в тот же момент, когда загорается отметка у аватара.
    if (!match || hud?.opponent.kind !== 'answered') return;
    if (rivalToldRef.current === match.state.taskIndex) return;
    rivalToldRef.current = match.state.taskIndex;
    playSound('opponentAnswered');
  }, [hud?.opponent.kind, match, playSound]);

  const onFinalScoreBeat = useCallback(() => {
    playSound('starLand');
  }, [playSound]);

  const finishedTask = match?.state.phase === 'finished' && plan
    ? plan.tasks[Math.min(match.state.taskIndex, plan.tasks.length - 1)] ?? null
    : null;
  const visibleTask = hud?.task ?? finishedTask;
  const ownScore = hud?.matchStars ?? 0;
  const rivalScore = hud?.opponentMatchStars ?? null;
  const immersive = match?.state.phase !== 'finished' && visibleTask?.mode
    ? arenaQuestionLayout(visibleTask.mode).immersive
    : false;
  const playerIdentities: readonly ArenaPlayer[] = useMemo(() => {
    if (!plan) return [];
    const you: ArenaPlayer = {
      uid: plan.viewerSeat, name: arenaText(lang, 'you'), rank: 0, rating: 0, score: 0, correct: 0,
    };
    const rival: ArenaPlayer = {
      uid: plan.opponent.seat,
      name: plan.opponent.name || arenaText(lang, 'opponent'),
      ...(plan.opponent.avatar ? { avatar: plan.opponent.avatar } : {}),
      ...(plan.opponent.aura ? { aura: plan.opponent.aura } : {}),
      rank: plan.opponent.rank,
      rating: 0,
      score: 0,
      correct: 0,
    };
    return plan.viewerSeat === 'a' ? [you, rival] : [rival, you];
  }, [lang, plan]);
  const players = useMemo(() => {
    if (!plan) return [];
    const you = playerIdentities.find((player) => player.uid === plan.viewerSeat);
    const rival = playerIdentities.find((player) => player.uid === plan.opponent.seat);
    if (!you || !rival) return [];
    const scoredYou = { ...you, score: ownScore };
    const scoredRival = { ...rival, score: rivalScore };
    return plan.viewerSeat === 'a' ? [scoredYou, scoredRival] : [scoredRival, scoredYou];
  }, [ownScore, plan, playerIdentities, rivalScore]);
  // зачем (2026-08-23): факт хода соперника сообщался только звуком, а он у
  // большинства выключен — против бота экран выглядел безжизненным («в арене
  // мы не ждём бота когда он ответит?»). Сигнал уже считался в HUD
  // (`hud.opponent`), но экран его не читал. Метка держится, пока открыто то
  // же задание, и снимается сама со сменой задания.
  // Только 'answered': про ТЕКУЩЕЕ задание от соперника пришёл ход. Ветку
  // 'finished' сюда нельзя — она возвращается и когда просто закончился матч,
  // причём даже если соперник не сыграл ни одного задания (отвалился по
  // связи). Отметка «ответил» обязана означать ровно то, что написано.
  const rivalAnsweredUid = plan && hud?.opponent.kind === 'answered'
    ? plan.opponent.seat
    : null;
  const introYou = playerIdentities.find((player) => player.uid === plan?.viewerSeat);
  const introOpponent = playerIdentities.find((player) => player.uid === plan?.opponent.seat);

  /**
   * Просрочка и звёзды звучат по ЗАКРЫТОМУ заданию, а не по фазе: фаза может
   * перерисоваться дважды, а закрытый исход появляется ровно один раз.
   */
  const lastOutcomeRef = useRef(0);
  useEffect(() => {
    if (!match) return;
    const outcomes = match.state.outcomes;
    if (outcomes.length <= lastOutcomeRef.current) return;
    lastOutcomeRef.current = outcomes.length;
    const last = outcomes[outcomes.length - 1];
    if (last.status === 'timeout') playSound('timeout');
    if (last.mode === 'speed_match' && last.resolvedPairs >= 4) playSound('pairClear');
    const award = match.state.awards[match.state.awards.length - 1];
    if (award && award.stars > 0) {
      playSound('starFly');
      // Первым ответил — третья звезда, ради которой в Арене и торопятся.
      if (award.firstBonus > 0) playSound('answerFirst');
    }
  }, [match, playSound]);

  /**
   * Можно ли вообще нарисовать текущее задание. Считается ДО отрисовки: разбор
   * задания бросает исключение, и внутри отрисовки оно уносит весь матч.
   */
  const taskRenderable = useMemo(
    () => (visibleTask ? arenaTaskRenderable(arenaPlanTaskToPublic(visibleTask)) : true),
    [visibleTask],
  );

  // Сломанное задание закрывается как пропущенное — ровно один раз на задание.
  const brokenReportedRef = useRef<number | null>(null);
  useEffect(() => {
    const taskIndex = hud?.task?.taskIndex;
    if (!match || taskRenderable || typeof taskIndex !== 'number') return;
    if (brokenReportedRef.current === taskIndex) return;
    brokenReportedRef.current = taskIndex;
    match.reportBroken(taskIndex);
  }, [match, hud?.task?.taskIndex, taskRenderable]);

  /**
   * зачем (владелец 2026-08-29, «ответ тупит, кнопка не применяется сразу»):
   * вердикт считался локально и возвращался тем же кадром, но экран его
   * ВЫБРАСЫВАЛ — слышен был только звук. Игрок жал вариант и до конца показа
   * результата (ARENA_LOCAL_REVEAL_MS, 1.2 с) не видел ни-че-го, отчего нажатие
   * читалось как незасчитанное. Механизм подсветки в ArenaQuestion уже был
   * готов (проп `verdict`), ему просто нечего было передать.
   *
   * Держим вердикт по ИНДЕКСУ задания, а не булевым флагом: иначе подсветка
   * предыдущего ответа успевала мигнуть на следующем задании до того, как
   * сбрасывающий эффект отработает.
   */
  const [answerVerdict, setAnswerVerdict] = useState<{ taskIndex: number; correct: boolean } | null>(null);
  const onSubmit = useCallback((answer: unknown) => {
    const taskIndex = match?.state.taskIndex;
    const correct = match?.answer(answer);
    // Звук берётся из ВЕРДИКТА, который уже посчитан локально: сети между
    // нажатием и звуком нет вовсе, поэтому он попадает в тот же кадр.
    playSound(correct ? 'answerCorrect' : 'answerWrong');
    // Тем же кадром красим выбранный вариант — оптимистично и без сети:
    // вердикт авторитетный, локальный, сервер его потом лишь подтверждает.
    if (typeof taskIndex === 'number') setAnswerVerdict({ taskIndex, correct: correct === true });
  }, [match, playSound]);

  // Задание сменилось — подсветка снимается: чужой вердикт на новом вопросе
  // хуже, чем его отсутствие.
  const visibleTaskIndex = hud?.task?.taskIndex;
  useEffect(() => {
    if (answerVerdict && answerVerdict.taskIndex !== visibleTaskIndex) setAnswerVerdict(null);
  }, [answerVerdict, visibleTaskIndex]);

  const onSpeedAttempt = useCallback((pairIndex: number, selectedIndex: number) => {
    const correct = match?.tapPair(pairIndex, selectedIndex) ?? false;
    playSound(correct ? 'pairMatch' : 'pairMiss');
    return Promise.resolve(correct);
  }, [match, playSound]);

  // зачем: один шелл на все три сценария (выход/ошибка сохранения/отказ) —
  // BackHandler может дёрнуть confirmForfeit на любом из трёх ранних return,
  // поэтому шелл рендерится в каждом из них через этот общий узел.
  const matchAlertNode = (
    <HybridAlertShell
      visible={matchAlert !== null}
      onRequestClose={() => setMatchAlert(null)}
      testID="arena-match-alert"
      shadowColor={matchAlert?.kind === 'leave' ? t.wrong : t.accent}
    >
      {matchAlert?.kind === 'leave' ? (
        <View style={[styles.alertBody, { backgroundColor: t.bgCard }]}>
          <Text accessibilityRole="header" style={[styles.alertTitle, { color: t.textPrimary, fontSize: f.h2 }]}>
            {arenaText(lang, 'leaveTitle')}
          </Text>
          <Text style={[styles.alertText, { color: t.textSecond, fontSize: f.body }]}>
            {arenaText(lang, 'leaveBody')}
          </Text>
          <DuoPressable
            testID="arena-match-leave-confirm"
            onPress={() => { setMatchAlert(null); forfeitNow(); }}
            edgeColor={t.wrong}
            style={[styles.alertPrimary, { backgroundColor: t.wrong }]}
          >
            <Text style={[styles.alertButtonText, { color: '#FFFFFF' }]}>{arenaText(lang, 'leaveConfirm')}</Text>
          </DuoPressable>
          <DuoPressable
            testID="arena-match-leave-stay"
            onPress={() => setMatchAlert(null)}
            edgeColor={t.bgSurface2}
            style={[styles.alertSecondary, { backgroundColor: t.bgSurface2 }]}
          >
            <Text style={[styles.alertButtonText, { color: t.textPrimary }]}>{arenaText(lang, 'stay')}</Text>
          </DuoPressable>
        </View>
      ) : matchAlert?.kind === 'storageFailed' ? (
        <View style={[styles.alertBody, { backgroundColor: t.bgCard }]}>
          <Text accessibilityRole="header" style={[styles.alertTitle, { color: t.textPrimary, fontSize: f.h2 }]}>
            {arenaText(lang, 'reportStorageFailed')}
          </Text>
          <Text style={[styles.alertText, { color: t.textSecond, fontSize: f.body }]}>
            {arenaText(lang, 'reportStorageFailedHint')}
          </Text>
          <DuoPressable
            testID="arena-match-storage-retry"
            onPress={() => { setMatchAlert(null); setSent(false); }}
            edgeColor={t.accent}
            style={[styles.alertPrimary, { backgroundColor: t.accent }]}
          >
            <Text style={[styles.alertButtonText, { color: t.correctText }]}>{arenaText(lang, 'retry')}</Text>
          </DuoPressable>
          <DuoPressable
            testID="arena-match-storage-home"
            onPress={() => { setMatchAlert(null); router.replace('/arena' as never); }}
            edgeColor={t.bgSurface2}
            style={[styles.alertSecondary, { backgroundColor: t.bgSurface2 }]}
          >
            <Text style={[styles.alertButtonText, { color: t.textPrimary }]}>{arenaText(lang, 'home')}</Text>
          </DuoPressable>
        </View>
      ) : matchAlert?.kind === 'rejected' ? (
        <View style={[styles.alertBody, { backgroundColor: t.bgCard }]}>
          <Text accessibilityRole="header" style={[styles.alertTitle, { color: t.textPrimary, fontSize: f.h2 }]}>
            {arenaText(lang, 'reportRejected')}
          </Text>
          <Text style={[styles.alertText, { color: t.textSecond, fontSize: f.body }]}>
            {arenaText(lang, 'reportRejectedHint')}
          </Text>
          <DuoPressable
            testID="arena-match-rejected-home"
            onPress={() => { setMatchAlert(null); router.replace('/arena' as never); }}
            edgeColor={t.accent}
            style={[styles.alertPrimary, { backgroundColor: t.accent }]}
          >
            <Text style={[styles.alertButtonText, { color: t.correctText }]}>{arenaText(lang, 'home')}</Text>
          </DuoPressable>
        </View>
      ) : null}
    </HybridAlertShell>
  );

  if (planError) {
    /**
     * Причин не начаться четыре, и они требуют разных слов и разных кнопок.
     * Раньше три из них сводились к одному слову «Повторить» — глаголу вместо
     * объяснения, да ещё и без кнопки повтора: игрок читал приказ, который
     * нечем выполнить.
     */
    const failure = arenaEntryFailureCopy(entryFailure);
    return (
      <ArenaScreen title={arenaText(lang, 'title')} variant="play" scroll={false}>
        <View style={styles.center}>
          <Text accessibilityLiveRegion="polite" style={[styles.failureTitle, titleLine, { color: P.text }]}>
            {arenaText(lang, failure.title)}
          </Text>
          <Text style={[styles.failureHint, hintLine, { color: P.muted }]}>{arenaText(lang, failure.hint)}</Text>
          {failure.canRetry ? (
            <V2Cta onPress={() => { setEntryFailure(null); setPlanError(false); }}>
              {arenaText(lang, 'retry')}
            </V2Cta>
          ) : null}
          {/* зачем: соперник не принял вызов — человек всё ещё хочет играть,
              а единственной кнопкой была «На главную». Его выкидывало из
              Арены за чужой отказ (владелец, 2026-08-16: «появился экран
              соперник не принял вызов»). Возвращаем в поиск одним нажатием,
              новым requestId — старый билет уже закрыт сервером. */}
          {entryFailure === 'no_opponent' ? (
            <View style={{ position: 'relative' }}>
              <V2Cta onPress={() => router.replace({
                pathname: '/arena_matchmaking',
                params: { mode: 'quick', requestId: createArenaRequestId('queue') },
              } as never)}>
                {arenaText(lang, 'quick')}
              </V2Cta>
              <EnergyCostBadge testID="arena-match-retry-energy-cost" />
            </View>
          ) : null}
          <V2Cta tone="ghost" onPress={() => router.replace('/arena' as never)}>{arenaText(lang, 'home')}</V2Cta>
        </View>
      </ArenaScreen>
    );
  }

  const introReady = Boolean(plan && match && hud && match.phase.kind !== 'countdown');
  // VS starts only after the sealed plan and both real identities are ready.
  // A restored match continues from its persisted phase instead of replaying
  // a full intro over an already-running local timer.
  const shouldShowIntro = !introDone && !restored && Boolean(
    plan && match && hud && match.phase.kind === 'countdown'
      && introYou && introOpponent,
  );

  if (shouldShowIntro && introYou && introOpponent) {
    return (
      <ArenaScreen title={arenaText(lang, 'title')} variant="play" scroll={false}>
        <Animated.View
          style={styles.intro}
          entering={reduceMotion ? FadeIn.duration(120)
            : entryTreatment === 'entry_trail' ? SlideInRight.duration(260)
            : entryTreatment === 'entry_burst' ? ZoomIn.duration(240)
            : entryTreatment === 'entry_crown' ? FadeInDown.duration(300)
            : FadeIn.duration(160)}
        >
          <ArenaVersusIntro
            you={introYou}
            opponent={introOpponent}
            goLabel={arenaText(lang, 'title')}
            ready={introReady}
            onDone={finishIntro}
          />
        </Animated.View>
      </ArenaScreen>
    );
  }

  if (!plan || !match || !hud) {
    /**
     * Защитная ветка пока прямой вход ждёт план.
     *
     * зачем (владелец 2026-08-29, «открываю „вернуться в матч“ — пустой экран,
     * и назад тоже пустой»): ветка рисовала голый <View> без слов и без единой
     * кнопки. Это тупик: если план не придёт (профилю сервер оставил
     * activeMatchId от матча, который так и не начался, или подготовка молча
     * вышла до готовности аккаунта), человек упирался в пустоту, из которой
     * некуда деться. Пустой экран без выхода — всегда поломка, поэтому здесь
     * теперь есть и объяснение ожидания, и дорога назад в Арену.
     */
    return (
      <ArenaScreen title={arenaText(lang, 'title')} variant="play" scroll={false}>
        <View style={styles.center}>
          <Text accessibilityLiveRegion="polite" style={[styles.failureHint, hintLine, { color: P.muted }]}>
            {arenaText(lang, 'preparing')}
          </Text>
          <V2Cta tone="ghost" onPress={() => router.replace('/arena' as never)}>
            {arenaText(lang, 'home')}
          </V2Cta>
        </View>
      </ArenaScreen>
    );
  }

  /**
   * Живой канал соперника молчит из-за СВЯЗИ, а не потому, что соперник ничего
   * не делает. Без этой оговорки игрок читает пустое место как «соперник
   * пассивен», спокойно доигрывает — и получает в конце неожиданное поражение.
   *
   * Показывается только пока от соперника не пришло НИ ОДНОГО хода: как только
   * ход появился (из канала или из плана), канал очевидно работает.
   */
  const rivalUnseen = Boolean(live.error)
    && Object.keys(match.state.opponentByTask).length === 0;
  return (
    <ArenaScreen
      title={arenaText(lang, 'title')}
      subtitle={`${hud.taskOrdinal} / ${hud.taskCount}`}
      variant="play"
      scroll={false}
      onBack={confirmForfeit}
    >
      <ArenaPlayers compact={immersive} players={players} active={active} animateScore answeredUid={rivalAnsweredUid} answeredLabel={arenaText(lang, 'rivalMovedA11y')} />
      <V2Segments
        total={hud.taskCount}
        done={match.state.phase === 'finished' ? hud.taskCount : Math.max(0, hud.taskOrdinal - 1)}
        style={styles.matchProgress}
      />

      {match.state.phase === 'finished' ? (
        <ArenaFinalScoreCount
          score={match.state.matchStars}
          reduceMotion={reduceMotion}
          onBeat={onFinalScoreBeat}
        />
      ) : visibleTask ? (
        <Animated.View
          key={visibleTask.taskId}
          entering={immersive ? undefined : reduceMotion ? FadeIn.duration(120) : SlideInRight.duration(v2motion.taskSwapMs)}
          style={styles.question}
        >
          <View style={styles.hudRow}>
            {hud.timer ? (
                  <ArenaTimerRing
                    durationMs={hud.timer.durationMs}
                    elapsedMs={hud.timer.elapsedMs}
                    size={immersive ? 62 : 84}
                    stroke={immersive ? 6 : 7}
                    paused={!active}
                  />
                ) : <View style={[styles.timerHole, immersive ? styles.timerHoleCompact : null]} />}
            <View style={styles.hudSide}>
              <ArenaComboMeter streak={hud.combo.streak} bonusLabel={`+1★`} size="compact" />
              {rivalUnseen ? (
                // eslint-disable-next-line text-integrity/no-unsafe-text-truncation -- authored connectivity hint is capped at two lines so the live question remains visible
                <Text
                  numberOfLines={2}
                  style={[styles.rival, { color: P.muted }]}
                  accessibilityLiveRegion="polite"
                >
                  {arenaText(lang, 'rivalUnseen')}
                </Text>
              ) : null}
            </View>
          </View>

          {/*
            Испорченное задание раньше роняло ВЕСЬ экран: разбор задания бросает
            исключение, а зовут его во время отрисовки. Машина матча умеет
            закрывать такое задание как сломанное и играть дальше — просто
            никто ей об этом не сообщал.
          */}
          {/*
            Матч восстановлен после холодного старта: задание, открытое в тот
            момент, закрылось просрочкой. Раньше игрок просто видел потерянное
            задание и не понимал, за что.
          */}
          {match.state.clockSuspect ? (
            <View style={styles.clockNote}>
              <Text accessibilityLiveRegion="polite" style={[styles.failureHint, hintLine, { color: P.muted }]}>
                {arenaText(lang, 'clockJumped')}
              </Text>
              <Text style={[styles.failureHint, hintLine, { color: P.muted }]}>{arenaText(lang, 'clockJumpedHint')}</Text>
            </View>
          ) : null}

          {taskRenderable ? (
            <ArenaQuestion
              task={arenaPlanTaskToPublic(visibleTask)}
              locked={!hud.interactive}
              verdict={answerVerdict && answerVerdict.taskIndex === hud.task?.taskIndex
                ? (answerVerdict.correct ? 'correct' : 'wrong') : null}
              submitLabel={arenaText(lang, 'submit')}
              onSubmit={onSubmit}
              onSpeedAttempt={onSpeedAttempt}
            />
          ) : (
            <View style={styles.center}>
              <Text accessibilityLiveRegion="polite" style={[styles.failureTitle, titleLine, { color: P.text }]}>
                {arenaText(lang, 'taskBroken')}
              </Text>
              <Text style={[styles.failureHint, hintLine, { color: P.muted }]}>{arenaText(lang, 'taskBrokenHint')}</Text>
            </View>
          )}

          {/* Разбор награды: почему звёзд именно столько, а не больше. */}
          {hud.award ? (
            <Animated.View entering={FadeInDown.duration(180)} style={styles.awardBox}>
              <Text style={[styles.awardHead, { color: hud.award.stars > 0 ? P.accent : P.danger }]}>
                {hud.award.stars > 0
                  ? `+${hud.award.stars}★`
                  // зачем (2026-08-23): ноль звёзд бывает по трём причинам, и
                  // раньше все три подписывались «Не совсем» — обвинением в
                  // ошибке даже там, где игрок просто не успел. Причину знает
                  // сам расчёт награды (`headline`), она уже считалась, но её
                  // никто не читал.
                  : arenaText(lang, hud.award.headline.key === 'starTimeout' ? 'timeUp'
                    : hud.award.headline.key === 'starBroken' ? 'taskSkipped'
                    : 'wrong')}
              </Text>
              {arenaAwardLines(hud.award).map((line, index) => (
                <Text
                  key={`${line.reason}-${index}`}
                  style={[styles.awardLine, { color: line.state === 'earned' ? P.text : P.muted }]}
                >
                  {line.state === 'earned' ? `+${line.stars}★` : `—`} · {arenaAwardReasonText(lang, line.reason)}
                </Text>
              ))}
            </Animated.View>
          ) : null}

          {hud.starsToFly > 0 ? <ArenaStarFlight amount={hud.starsToFly} /> : null}
        </Animated.View>
      ) : null}
    </ArenaScreen>
  );
}

const styles = StyleSheet.create({
  matchProgress: { height: 10, flexGrow: 0, flexShrink: 0 },
  center: { flex: 1, justifyContent: 'center', gap: 12 },
  // Высота строк задаётся на месте: она умножается на системный масштаб.
  failureTitle: { fontSize: 20, fontWeight: '900', textAlign: 'center' },
  failureHint: { fontSize: 14, fontWeight: '600', textAlign: 'center' },
  clockNote: { gap: 2, paddingHorizontal: 8 },
  intro: { flex: 1 },
  question: { flex: 1, justifyContent: 'center', gap: 10 },
  hudRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  hudSide: { flex: 1, alignItems: 'flex-end', gap: 6 },
  timerHole: { width: 84, height: 84 },
  timerHoleCompact: { width: 62, height: 62 },
  rival: { fontSize: 13, fontWeight: '800' },
  awardBox: { gap: 2, alignItems: 'center' },
  awardHead: { fontSize: 20, fontWeight: '900' },
  awardLine: { fontSize: 12, fontWeight: '700' },
  // зачем 2026-08-23: шесть стилей алерта матча использовались в JSX, но в
  // таблице отсутствовали — styles.alertBody и соседи резолвились в undefined,
  // и все три окна (выход, ошибка отправки, отклонённый отчёт) рисовались без
  // фона, отступов и формы кнопок. Восстановлены по родному образцу
  // arena_invite.tsx, чтобы окна Арены выглядели одинаково. Скругление, тень и
  // ширину карточки даёт сам HybridAlertShell — здесь только внутренняя вёрстка.
  alertBody: { padding: 24 },
  alertTitle: { fontWeight: '700', textAlign: 'center' },
  alertText: { marginTop: 14, marginBottom: 22, textAlign: 'center' },
  alertPrimary: { minHeight: 52, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  alertSecondary: { minHeight: 52, marginTop: 10, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  alertButtonText: { fontSize: 16, fontWeight: '700' },
});
