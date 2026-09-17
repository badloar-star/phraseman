import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter } from 'expo-router';
import { useLang } from '../LangContext';
import { useTournamentPalette } from '../ui/v2_theme';
import { ArenaScreen } from './ArenaScreen';
import { ArenaDailyGoals } from './ArenaDailyGoals';
import { ArenaHubSummary } from './ArenaHubSummary';
import { ArenaModeSheet, type ArenaModeKey, type ArenaModeOption } from './ArenaModeSheet';
import { ArenaHubOverflowSheet } from './ArenaHubOverflowSheet';
import { arenaHubActionBlock, arenaHubModel, type ArenaHubBlockReason } from '../../modules/arena/hub_view';
import { createArenaHubHydrationController } from '../../modules/arena/hub_hydration';
import {
  ArenaFeatureRow,
  ArenaStateCard,
  ArenaStateNotice,
} from './ArenaExpansionUI';
import { arenaText, type ArenaCopyKey } from '../../modules/arena/copy';
import { arenaExpansionText } from '../../modules/arena/expansion_copy';
import { arenaExpansionHome, arenaFetchMatchHistory, arenaFlushOutbox, arenaOutboxBlockedByUpdate, arenaV2Home, createArenaRequestId } from '../../app/arena_client';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  arenaLoadHomeWarm,
  arenaPeekHomeWarm,
  arenaRememberHomeWarm,
  arenaWarmDayKey,
} from '../../modules/arena/home_cache';
import type { ArenaKeyValueStore } from '../../modules/arena/match_store';
import { useRuntimeActive } from '../../hooks/use_runtime_active';
import { arenaFeatureOpenEvent } from '../../modules/arena/telemetry';
import { trackArenaTelemetry } from '../../app/arena_telemetry';
import { useFeatureIntro } from '../../hooks/use_feature_intro';
import FeatureIntroModal from '../FeatureIntroModal';
import { featureIntroById } from '../../app/feature_intro_registry';
import { ArenaConnectionNotice } from './ArenaConnectionNotice';
import { arenaMatchButtonAction, arenaModeChoices } from '../../modules/arena/hub_nav';
import { useTabContentBottomPad } from '../../hooks/use-tab-content-bottom-pad';
import PressableHybrid from '../PressableHybrid';
import PlusBadge from '../PlusBadge';
import SpeakingQuotaDots, { speakingQuotaDotsModel } from '../SpeakingQuotaDots';
import { useRevenueDailyQuotaPreview } from '../../hooks/useRevenueDailyQuotaPreview';
import RuneBalanceChip from '../RuneBalanceChip';
import { ArenaNextRankToast } from './ArenaNextRankToast';
import { arenaRankView } from '../../modules/arena/rank_engine';
import { useReduceMotion } from '../../hooks/use_reduce_motion';
import { DebugLogger } from '../../app/debug-logger';

const warmStore = AsyncStorage as unknown as ArenaKeyValueStore;
// зачем: тост «одна победа до ранга» (сцена H принятого макета) — максимум
// раз в день, ключ хранит день последнего показа.
const NEXT_RANK_TOAST_KEY = 'arena.nextRankToast.day.v1';
const TOAST_TIER_COPY = [
  'tierBronze', 'tierSilver', 'tierGold', 'tierPlatinum',
  'tierDiamond', 'tierMaster', 'tierGrandmaster', 'tierLegend',
] as const;
const TOAST_ROMAN: Record<1 | 2 | 3, string> = { 1: 'I', 2: 'II', 3: 'III' };

export function arenaRankStarsRouteParam(value: unknown): string | undefined {
  if (typeof value !== 'number' || !Number.isFinite(value)) return undefined;
  return String(Math.max(0, Math.trunc(value)));
}

export function ArenaHubSurface({ ownerVisible = true }: Readonly<{ ownerVisible?: boolean }>) {
  const router = useRouter();
  const { lang } = useLang();
  const P = useTournamentPalette();
  const tabContentBottomPad = useTabContentBottomPad();
  const active = useRuntimeActive(ownerVisible);
  /**
   * Первый кадр рисуется ПРОШЛЫМ снимком, а не пустотой (владелец: «видимой
   * загрузки не должно быть нигде»). Снимок читается из памяти синхронно,
   * поэтому экран открывается уже с данными, а свежие приезжают молча.
   */
  const warm = useMemo(() => arenaPeekHomeWarm(Date.now()), []);
  const hydrationControllerRef = useRef<ReturnType<typeof createArenaHubHydrationController> | null>(null);
  if (hydrationControllerRef.current === null) {
    hydrationControllerRef.current = createArenaHubHydrationController({
      initialHome: warm?.home,
      initialExpansion: warm?.expansion,
      todayKey: arenaWarmDayKey(Date.now()),
      warmDayKey: warm?.savedDayKey,
      fetchHome: arenaV2Home,
      fetchExpansion: arenaExpansionHome,
      remember: (value) => arenaRememberHomeWarm({ ...value, wallNowMs: Date.now(), store: warmStore }),
      onSnapshot: (snapshot) => setHydration(snapshot),
    });
  }
  const hydrationController = hydrationControllerRef.current;
  const [hydration, setHydration] = useState(() => hydrationController.snapshot());
  const [history, setHistory] = useState<readonly unknown[]>([]);
  const [historyLoaded, setHistoryLoaded] = useState(false);
  const [modeSheetOpen, setModeSheetOpen] = useState(false);
  const [overflowOpen, setOverflowOpen] = useState(false);

  const home = hydration.home.value;
  const expansion = hydration.expansion.value;
  const baseFailure = hydration.failure.home;
  const expansionFailure = hydration.failure.expansion;

  const load = useCallback(() => {
    const generation = hydrationController.refresh();
    if (generation === null) return;
    // История читается один раз при открытии: она нужна для плотной статистики
    // и ссылки на последний разбор. Таблица друзей загружается только в «Топах».
    void arenaFetchMatchHistory(10).then((rows) => {
      if (hydrationController.current(generation)) {
        setHistory(rows);
        setHistoryLoaded(true);
      }
    }).catch(() => {
      // A retry failure must preserve the best history already on screen.
    });
  }, [hydrationController]);

  useEffect(() => () => { hydrationController.dispose(); }, [hydrationController]);

  useEffect(() => { if (active) load(); }, [active, load]);

  /**
   * Снимок с диска — на случай, когда приложение только что запустили и память
   * пуста. Он приходит асинхронно, но всё равно раньше сети, и ставится только
   * если своё уже не пришло: свежее важнее вчерашнего.
   */
  useEffect(() => {
    let alive = true;
    void arenaLoadHomeWarm(warmStore, Date.now()).then((stored) => {
      if (!alive || !stored) return;
      hydrationController.hydrate(stored);
    }).catch(() => {});
    return () => { alive = false; };
  }, [hydrationController]);
  const telemetrySentRef = useRef(false);
  useEffect(() => {
    if (!active || telemetrySentRef.current) return;
    telemetrySentRef.current = true;
    trackArenaTelemetry(arenaFeatureOpenEvent('hub', 'direct'));
  }, [active]);

  /**
   * Обучающая модалка «Что такое Арена» — первый вход на экран (владелец,
   * 2026-08-16: «люди не находят фичи»). Показывается один раз на аккаунт
   * (AsyncStorage-флаг per generation, см. app/feature_intro_registry.ts),
   * через 600мс после фокуса — не мешает первому кадру осесть.
   */
  const arenaIntro = useFeatureIntro('arena_first_visit', active);
  const arenaIntroDef = featureIntroById('arena_first_visit');

  /**
   * Досылка застрявших отчётов. Хаб — то место, куда игрок приходит сам, и
   * отдельного расписания для этого нет намеренно: фоновый опрос стоил бы
   * денег за базу каждый день у каждого игрока.
   */
  const [reportGuard, setReportGuard] = useState<'checking' | 'clear' | 'blocked'>('checking');
  useEffect(() => {
    if (!active) return;
    let alive = true;
    setReportGuard('checking');
    const checkReportGuard = async () => {
      try {
        const blocked = await arenaOutboxBlockedByUpdate();
        if (alive) setReportGuard(blocked ? 'blocked' : 'clear');
      } catch {
        if (alive) setReportGuard('clear');
      }
    };
    // Local eligibility must not wait for delivery of previous match reports.
    // Recheck after delivery in case the server flags an outdated client.
    void checkReportGuard().then(async () => {
      if (!alive) return;
      await arenaFlushOutbox().catch(() => 0);
      if (alive) await checkReportGuard();
    });
    return () => { alive = false; };
  }, [active]);

  const activeQueue = home?.activeQueue?.status === 'waiting' ? home.activeQueue : null;
  const activeRun = expansion?.activeRun;
  const offline = baseFailure?.kind === 'offline' || expansionFailure?.kind === 'offline';
  const serverFailure = baseFailure?.kind === 'server';
  const expansionServerFailure = expansionFailure?.kind === 'server';
  const reportChecking = reportGuard === 'checking';
  const reportBlocked = reportGuard === 'blocked';
  const blockHint = (reason: ArenaHubBlockReason) => {
    if (reason === 'offline') return arenaText(lang, 'hubOfflineHint');
    if (reason === 'server') return arenaText(lang, 'arenaNotDeployedHint');
    if (reason === 'maintenance') return arenaText(lang, 'maintenanceHint');
    if (reason === 'report_blocked') return arenaText(lang, 'reportBlockedHint');
    if (reason === 'mode_disabled') return arenaText(lang, 'modeOff');
    return arenaText(lang, 'valueUnknown');
  };
  const baseBlock = arenaHubActionBlock({ known: home !== null && !reportChecking, offline, server: serverFailure, maintenance: home?.availability.enabled === false, reportBlocked });
  const activeMatchBlock = arenaHubActionBlock({ known: home !== null && !reportChecking, offline, server: serverFailure, reportBlocked });
  const activeRunBlock = arenaHubActionBlock({ known: expansion !== null && !reportChecking, offline, server: expansionServerFailure || serverFailure, maintenance: home?.availability.enabled === false, reportBlocked });
  const centralBlock = home?.activeMatch?.matchId ? activeMatchBlock : baseBlock;
  const centralEnabled = centralBlock === 'ok';

  /**
   * Живая часть главного экрана.
   *
   * Ранг и дневные цели приходят из ответа, который экран и так запрашивает.
   * История читается разово из расписок для статистики и последнего разбора.
   */
  const reduceMotion = useReduceMotion();
  // Тост «одна победа до ранга»: при 2/3 звёзд, не чаще раза в день.
  const [nextRankToastVisible, setNextRankToastVisible] = useState(false);
  const nextRankToastCheckedRef = useRef(false);
  const hideNextRankToast = useCallback(() => setNextRankToastVisible(false), []);

  const hub = useMemo(() => arenaHubModel({
    rating: home?.profile.rating,
    dailyDayKey: home?.profile.dailyDayKey,
    todayKey: home?.profile.todayKey ?? '',
    dailyMatches: home?.profile.dailyMatches,
    dailyFirstAnswers: home?.profile.dailyFirstAnswers,
    dailyWins: home?.profile.dailyWins,
    wins: home?.profile.wins,
    losses: home?.profile.losses,
    historyKnown: historyLoaded,
    historyRaw: history,
  }), [history, historyLoaded, home]);

  useEffect(() => {
    if (!active || nextRankToastCheckedRef.current) return;
    const rank = hub.rank;
    if (!rank || rank.top || rank.winsToNextRank !== 1) return;
    nextRankToastCheckedRef.current = true;
    const day = arenaWarmDayKey(Date.now());
    void AsyncStorage.getItem(NEXT_RANK_TOAST_KEY).then((seenDay) => {
      if (seenDay === day) return;
      setNextRankToastVisible(true);
      void AsyncStorage.setItem(NEXT_RANK_TOAST_KEY, day).catch(() => {});
    }).catch(() => {});
  }, [active, hub.rank]);
  const nextRankToastLabel = useMemo(() => {
    const rating = Number(home?.profile.rating);
    if (!Number.isFinite(rating)) return '';
    const nextView = arenaRankView(Math.max(0, Math.trunc(rating)) + 1);
    return arenaText(lang, 'nextRankToast')
      .replace('{rank}', `${arenaText(lang, TOAST_TIER_COPY[nextView.tierIndex])} ${TOAST_ROMAN[nextView.division]}`);
  }, [home?.profile.rating, lang]);

  const modeCopy: Record<ArenaModeKey, { title: string; badge: string; icon: ArenaModeOption['icon'] }> = {
    quick: { title: arenaText(lang, 'quick'), badge: '8', icon: 'flash' },
    ranked: { title: arenaText(lang, 'ranked'), badge: '10', icon: 'trophy' },
    friend: { title: arenaText(lang, 'friend'), badge: '10', icon: 'people' },
  };
  /**
   * зачем (владелец 2026-09-17, жалоба Виталия «уровень от количества побед не
   * меняется»): у РАБОЧЕГО режима теперь тоже есть описание, и первое, что оно
   * говорит — двигает ли матч ранг. Раньше `body` заполнялся ТОЛЬКО у
   * заблокированного режима, поэтому готовые переводы `quickHint`/`rankedHint`
   * на 9 локалей лежали мёртвыми, а игрок выбирал режим вслепую.
   *
   * Акцент переехал с `quick` на `ranked`: подсвечивать как главный тот режим,
   * который на ранг не влияет, и было причиной вывода «это баг».
   */
  const modeHint: Record<ArenaModeKey, ArenaCopyKey> = {
    quick: 'quickHint',
    ranked: 'rankedHint',
    friend: 'friendHint',
  };
  const modeOptions: readonly ArenaModeOption[] = arenaModeChoices(home?.availability).map((choice) => {
    const enabled = choice.enabled && baseBlock === 'ok';
    return {
      key: choice.key,
      ...modeCopy[choice.key],
      body: enabled
        ? arenaText(lang, modeHint[choice.key])
        : baseBlock !== 'ok'
          ? blockHint(baseBlock)
          : arenaText(lang, choice.reason === 'arena_off' ? 'modeArenaOff' : 'modeOff'),
      accent: choice.key === 'ranked',
      disabled: !enabled,
    };
  });
  const rankedViewerStars = arenaRankStarsRouteParam(home?.profile.rating);

  /**
   * Дневная попытка матча (владелец 2026-09-14: «1 попытка в день» на быстрый и
   * рейтинговый вместе). Превью — read-only; списывает попытку экран поиска в
   * момент фактического входа в матч, он же её возвращает, если матча не было.
   *
   * Дуэль с другом сюда не входит намеренно: приглашения удерживают людей в
   * приложении, а не расходуют лимит.
   */
  const matchQuota = useRevenueDailyQuotaPreview('arena_match_starts');
  const matchQuotaDots = useMemo(() => speakingQuotaDotsModel(matchQuota), [matchQuota]);
  /**
   * Заблокировано ТОЛЬКО на достоверном «исчерпано». Статусы 'waiting',
   * 'unavailable' и 'stale_account' пускают: наказывать человека за то, что у
   * нас не прочиталась база, нельзя — тот же урок уже выучен на карточках
   * («кнопка нажимается, но ничего не происходит»).
   */
  const arenaAttemptSpent = matchQuota.status === 'exhausted';
  const playAccessibilityLabel = arenaAttemptSpent
    ? `${arenaText(lang, 'play')}. ${arenaText(lang, 'playAttemptSpent')}`
    : matchQuotaDots && matchQuotaDots.remaining > 0
      ? `${arenaText(lang, 'play')}. ${arenaText(lang, 'playAttemptLeft')}`
      : arenaText(lang, 'play');

  const onPlay = useCallback(() => {
    const action = arenaMatchButtonAction({
      enabled: home?.availability.enabled === true,
      activeMatchId: home?.activeMatch?.matchId,
      activeQueue: home?.activeQueue,
    });
    /**
     * зачем (владелец 2026-09-14): дневная попытка закрывает НОВЫЙ матч, но не
     * доигранный. Возврат к своему матчу или очереди — продолжение того, за что
     * уже заплачено; требовать за него вторую попытку значило бы отобрать её.
     * Поэтому гейт стоит ПОСЛЕ resume-веток, ровно перед выбором режима.
     */
    if (action.kind === 'resume_match') {
      router.push({
        pathname: '/arena_match',
        params: { matchId: action.matchId, ...(rankedViewerStars ? { viewerStars: rankedViewerStars } : {}) },
      } as never);
      return;
    }
    if (action.kind === 'resume_queue') {
      router.push({ pathname: '/arena_matchmaking', params: {
        mode: action.mode,
        requestId: action.requestId,
        stableUid: action.stableUid,
        resumeQueue: '1',
        ...(action.mode === 'ranked' && rankedViewerStars ? { viewerStars: rankedViewerStars } : {}),
      } } as never);
      return;
    }
    if (arenaAttemptSpent) {
      // Ранний выход обязан оставлять след (правило «сперва логи»): без него
      // «кнопка ведёт на пейвол» неотличимо от поломки гейта. DebugLogger, а не
      // console — этот путь нужен и в релизной сборке, на телефоне владельца.
      DebugLogger.info('arena_hub', `[ARENA-DAILY] tap:play → paywall status=${matchQuota.status} used=${matchQuota.used} limit=${String(matchQuota.limit)} bypass=${String(matchQuota.bypass)}`);
      router.push({ pathname: '/premium_modal', params: { context: 'arena_limit', source: 'arena_hub_play' } } as never);
      return;
    }
    setModeSheetOpen(true);
  }, [arenaAttemptSpent, home?.activeMatch?.matchId, home?.activeQueue, home?.availability.enabled,
    matchQuota.bypass, matchQuota.limit, matchQuota.status, matchQuota.used, rankedViewerStars, router]);

  const onSelectMode = useCallback((key: ArenaModeKey) => {
    if (baseBlock !== 'ok') return;
    const choice = arenaModeChoices(home?.availability).find((row) => row.key === key);
    if (!choice?.enabled) return;
    setModeSheetOpen(false);
    router.push((choice.params ? {
      pathname: choice.route,
      params: choice.route === '/arena_matchmaking'
        ? {
          ...choice.params,
          requestId: createArenaRequestId('queue'),
          ...(key === 'ranked' && rankedViewerStars ? { viewerStars: rankedViewerStars } : {}),
        }
        : choice.params,
    } : choice.route) as never);
  }, [baseBlock, home?.availability, rankedViewerStars, router]);

  const todayContent = (
    <>
      <ArenaHubSummary model={hub} active={active} reduceMotion={reduceMotion} />
      <PressableHybrid
        testID="arena-hub-play"
        variant="primary"
        accessibilityLabel={playAccessibilityLabel}
        accessibilityHint={centralEnabled ? undefined : blockHint(centralBlock)}
        onPress={onPlay}
        contentStyle={[styles.play, { backgroundColor: P.accent }]}
      >
        <Ionicons name="play" size={25} color={P.accentText} />
        <Text style={[styles.playText, { color: P.accentText }]}>{arenaText(lang, 'play')}</Text>
        {/*
          зачем: остаток дневной попытки тем же языком, что и в карточках — одна
          точка гаснет после входа в матч. Точка стоит В РЯД с подписью (в
          отличие от карточек, где их три): единственная точка занимает
          считанные пиксели и текст не толкает, а кнопка остаётся одной строкой.
          Исчерпано — вместо точки плашка Plus, тап ведёт на пейвол.
        */}
        {arenaAttemptSpent
          ? <PlusBadge themeMode="dark" size="sm" showIcon={false} />
          : (
            <SpeakingQuotaDots
              testID="arena-hub-play-dots"
              quota={matchQuota}
              size="md"
              spentColor={`${P.accentText}3D`}
              remainingColor={P.accentText}
            />
          )}
      </PressableHybrid>
      <ArenaDailyGoals model={hub.goals} />
      {activeRun ? (
        <ArenaFeatureRow
          accent
          icon="flash"
          title={activeRun.runKind === 'ghost' ? arenaExpansionText(lang, 'ghost') : arenaExpansionText(lang, 'todayContinue')}
          body={activeRun.runKind === 'ghost' ? arenaExpansionText(lang, 'recordingBadge') : arenaExpansionText(lang, 'todayBody')}
          disabled={activeRunBlock !== 'ok'}
          disabledHint={activeRunBlock === 'ok' ? undefined : blockHint(activeRunBlock)}
          onPress={() => router.push({ pathname: '/arena_today', params: { runId: activeRun.runId, runKind: activeRun.runKind } } as never)}
        />
      ) : home?.activeMatch?.matchId ? (
        <ArenaFeatureRow
          accent
          icon="flash"
          title={arenaExpansionText(lang, 'activeMatch')}
          body={arenaText(lang, 'subtitle')}
          disabled={activeMatchBlock !== 'ok'}
          disabledHint={activeMatchBlock === 'ok' ? undefined : blockHint(activeMatchBlock)}
          onPress={() => router.push({
            pathname: '/arena_match',
            params: { matchId: home.activeMatch?.matchId, ...(rankedViewerStars ? { viewerStars: rankedViewerStars } : {}) },
          } as never)}
        />
      ) : activeQueue ? (
        <ArenaFeatureRow
          accent
          icon="search"
          title={arenaExpansionText(lang, 'activeQueue')}
          body={activeQueue.mode === 'ranked' ? arenaText(lang, 'rankedHint') : arenaText(lang, 'quickHint')}
          disabled={baseBlock !== 'ok'}
          disabledHint={baseBlock === 'ok' ? undefined : blockHint(baseBlock)}
          onPress={() => router.push({ pathname: '/arena_matchmaking', params: {
            mode: activeQueue.mode,
            requestId: activeQueue.requestId,
            stableUid: activeQueue.stableUid,
            resumeQueue: '1',
            ...(activeQueue.mode === 'ranked' && rankedViewerStars ? { viewerStars: rankedViewerStars } : {}),
          } } as never)}
        />
      ) : null}
      {expansionServerFailure ? <ArenaStateNotice state="error" onRetry={load} /> : null}
      {/* зачем 2026-08-23 (владелец: «убери с арены эту хуйню про 10 заданий»):
          карточка «Испытание дня» снята с хаба. Сам экран /arena_today и его
          маршрут живы — на них по-прежнему ведёт строка активного забега выше,
          поэтому незавершённое испытание не теряется. */}
    </>
  );

  return (
    <>
    <ArenaScreen
      title={arenaText(lang, 'title')}
      onBack={() => router.replace('/(tabs)/home' as never)}
      bottomContentInset={tabContentBottomPad}
      overlay={nextRankToastVisible ? (
        <ArenaNextRankToast
          label={nextRankToastLabel}
          visible={nextRankToastVisible}
          reduceMotion={reduceMotion}
          onDone={hideNextRankToast}
          bottomOffset={tabContentBottomPad}
        />
      ) : null}
      headerRight={(
        /* зачем: владелец 2026-08-24 — в Арене обязателен видимый общий счёт рун.
           Валюта, ради которой играют матчи, раньше показывалась только в шапке
           Главной: игрок не видел баланс там, где его зарабатывает. Тап ведёт
           в раздел «Руны». */
        <View style={styles.headerRight}>
          {/* size=22, а не 26: на 320pt заголовок «Đấu trường» (вьетнамский) плюс
              пятизначный баланс не помещались в строку и заголовок уезжал на
              вторую строку. Сжимать шрифт нельзя (запрет владельца) — лечим
              вёрсткой, отдавая заголовку место. */}
          <RuneBalanceChip testID="arena-hub-runes" color={P.gold} size={22} active={active} />
          <PressableHybrid
            testID="arena-hub-overflow"
            variant="icon"
            accessibilityLabel={arenaText(lang, 'arenaMenu')}
            hitSlop={8}
            onPress={() => setOverflowOpen(true)}
            style={styles.overflowHitbox}
            contentStyle={[styles.overflow, { backgroundColor: P.elev }]}
          >
            <Ionicons name="ellipsis-horizontal" size={24} color={P.text} />
          </PressableHybrid>
        </View>
      )}
    >
      {offline ? <ArenaConnectionNotice onRetry={load} /> : null}
      {serverFailure ? (
        <ArenaStateCard
          state="unavailable"
          title={arenaText(lang, 'arenaNotDeployed')}
          // зачем: раньше здесь всегда стояло «дело за серверной частью» —
          // единственная догадка, выданная за факт. Она увела диагностику
          // на целый день, пока сервер был полностью исправен. Показываем
          // то, что сервер действительно ответил.
          body={`${arenaText(lang, 'arenaNotDeployedHint')}\n\n${baseFailure?.code ?? ''}`.trim()}
        />
      ) : null}
      {/* Отчёт, застрявший из-за старой сборки, повторами не спасти: игроку
          надо сказать, что от него требуется, иначе награда не придёт никогда,
          а он даже не узнает почему. */}
      {reportBlocked ? <ArenaStateCard state="unavailable" title={arenaText(lang, 'reportBlocked')} body={arenaText(lang, 'reportBlockedHint')} /> : null}
      {home && !home.availability.enabled ? <ArenaStateCard state="unavailable" title={arenaText(lang, 'maintenance')} body={arenaText(lang, 'maintenanceHint')} /> : null}
      {todayContent}
    </ArenaScreen>
    <ArenaModeSheet
      visible={modeSheetOpen}
      title={arenaText(lang, 'play')}
      options={modeOptions}
      onSelect={onSelectMode}
      onClose={() => setModeSheetOpen(false)}
    />
    <ArenaHubOverflowSheet
      visible={overflowOpen}
      latestMatchId={hub.lastMatch?.matchId ?? null}
      onClose={() => setOverflowOpen(false)}
    />
    {arenaIntroDef ? (
      <FeatureIntroModal
        visible={arenaIntro.visible}
        family={arenaIntroDef.family}
        art={arenaIntroDef.art}
        icon={arenaIntroDef.icon}
        title={arenaIntroDef.title(lang)}
        body={arenaIntroDef.body(lang)}
        ctaLabel={arenaIntroDef.ctaLabel(lang)}
        laterLabel={arenaText(lang, 'later')}
        onDone={() => arenaIntro.dismiss(true)}
        onLater={() => arenaIntro.dismiss(false)}
        testIdPrefix="arena-intro"
      />
    ) : null}
    </>
  );
}

export default ArenaHubSurface;

const styles = StyleSheet.create({
  play: { minHeight: 62, borderRadius: 22, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, paddingHorizontal: 22 },
  playText: { fontSize: 19, fontWeight: '900' },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 8, flexShrink: 0 },
  overflowHitbox: { width: 44, height: 44, alignSelf: 'auto' },
  overflow: { width: 44, height: 44, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
});
