import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter } from 'expo-router';
import { useLang } from '../LangContext';
import { V2Card, V2Cta } from '../ui/v2_ui';
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
  ArenaProgress,
  ArenaStateCard,
  ArenaStateNotice,
} from './ArenaExpansionUI';
import { arenaText } from '../../modules/arena/copy';
import { useArenaFontScale } from '../../hooks/use_arena_font_scale';
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
import { ArenaNextRankToast } from './ArenaNextRankToast';
import { arenaRankView } from '../../modules/arena/rank_engine';
import { useReduceMotion } from '../../hooks/use_reduce_motion';

const warmStore = AsyncStorage as unknown as ArenaKeyValueStore;
// зачем: тост «одна победа до ранга» (сцена H принятого макета) — максимум
// раз в день, ключ хранит день последнего показа.
const NEXT_RANK_TOAST_KEY = 'arena.nextRankToast.day.v1';
const TOAST_TIER_COPY = [
  'tierBronze', 'tierSilver', 'tierGold', 'tierPlatinum',
  'tierDiamond', 'tierMaster', 'tierGrandmaster', 'tierLegend',
] as const;
const TOAST_ROMAN: Record<1 | 2 | 3, string> = { 1: 'I', 2: 'II', 3: 'III' };

export function ArenaHubSurface({ ownerVisible = true }: Readonly<{ ownerVisible?: boolean }>) {
  const router = useRouter();
  const { lang } = useLang();
  const P = useTournamentPalette();
  const tabContentBottomPad = useTabContentBottomPad();
  // Высота строки числом не растёт вместе с системным шрифтом — при
  // крупном кегле строки наезжали друг на друга. См. use_arena_font_scale.
  const fontScale = useArenaFontScale();
  const todayTitleLine = { lineHeight: 28 * fontScale };
  const todayBodyLine = { lineHeight: 20 * fontScale };
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
    void arenaFlushOutbox()
      .catch(() => 0)
      .then(() => arenaOutboxBlockedByUpdate())
      .then((blocked) => { if (alive) setReportGuard(blocked ? 'blocked' : 'clear'); })
      .catch(() => { if (alive) setReportGuard('clear'); });
    return () => { alive = false; };
  }, [active]);

  const activeQueue = home?.activeQueue?.status === 'waiting' ? home.activeQueue : null;
  const activeRun = expansion?.activeRun;
  const offline = baseFailure?.kind === 'offline' || expansionFailure?.kind === 'offline';
  const serverFailure = baseFailure?.kind === 'server';
  const expansionServerFailure = expansionFailure?.kind === 'server';
  const reportChecking = reportGuard === 'checking';
  const reportBlocked = reportGuard === 'blocked';
  const today = expansion?.today;
  const blockHint = (reason: ArenaHubBlockReason) => {
    if (reason === 'offline') return arenaText(lang, 'hubOfflineHint');
    if (reason === 'server') return arenaText(lang, 'arenaNotDeployedHint');
    if (reason === 'maintenance') return arenaText(lang, 'maintenanceHint');
    if (reason === 'report_blocked') return arenaText(lang, 'reportBlockedHint');
    if (reason === 'mode_disabled') return arenaText(lang, 'modeOff');
    return arenaText(lang, 'valueUnknown');
  };
  const baseBlock = arenaHubActionBlock({ known: home !== null && !reportChecking, offline, server: serverFailure, maintenance: home?.availability.enabled === false, reportBlocked });
  const todayBlock = arenaHubActionBlock({ known: expansion !== null && today !== undefined && !reportChecking, offline, server: expansionServerFailure || serverFailure, maintenance: home?.availability.enabled === false, reportBlocked, modeEnabled: expansion?.availability.today && today?.state !== 'unavailable' });
  const activeMatchBlock = arenaHubActionBlock({ known: home !== null && !reportChecking, offline, server: serverFailure, reportBlocked });
  const activeRunBlock = arenaHubActionBlock({ known: expansion !== null && !reportChecking, offline, server: expansionServerFailure || serverFailure, maintenance: home?.availability.enabled === false, reportBlocked });
  const centralBlock = home?.activeMatch?.matchId ? activeMatchBlock : baseBlock;
  const centralEnabled = centralBlock === 'ok';
  const todayDisabledHint = todayBlock === 'ok' ? undefined : blockHint(todayBlock);
  const todayAction = today?.state === 'in_progress' ? arenaExpansionText(lang, 'todayContinue') : arenaExpansionText(lang, 'todayStart');

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
  const modeOptions: readonly ArenaModeOption[] = arenaModeChoices(home?.availability).map((choice) => {
    const enabled = choice.enabled && baseBlock === 'ok';
    return {
      key: choice.key,
      ...modeCopy[choice.key],
      body: enabled
        ? undefined
        : baseBlock !== 'ok'
          ? blockHint(baseBlock)
          : arenaText(lang, choice.reason === 'arena_off' ? 'modeArenaOff' : 'modeOff'),
      accent: choice.key === 'quick',
      disabled: !enabled,
    };
  });

  const onPlay = useCallback(() => {
    const action = arenaMatchButtonAction({
      enabled: home?.availability.enabled === true,
      activeMatchId: home?.activeMatch?.matchId,
      activeQueue: home?.activeQueue,
    });
    if (action.kind === 'resume_match') {
      router.push({ pathname: '/arena_match', params: { matchId: action.matchId } } as never);
      return;
    }
    if (action.kind === 'resume_queue') {
      router.push({ pathname: '/arena_matchmaking', params: {
        mode: action.mode,
        requestId: action.requestId,
        stableUid: action.stableUid,
      } } as never);
      return;
    }
    setModeSheetOpen(true);
  }, [home?.activeMatch?.matchId, home?.activeQueue, home?.availability.enabled, router]);

  const onSelectMode = useCallback((key: ArenaModeKey) => {
    if (baseBlock !== 'ok') return;
    const choice = arenaModeChoices(home?.availability).find((row) => row.key === key);
    if (!choice?.enabled) return;
    setModeSheetOpen(false);
    router.push((choice.params ? {
      pathname: choice.route,
      params: choice.route === '/arena_matchmaking'
        ? { ...choice.params, requestId: createArenaRequestId('queue') }
        : choice.params,
    } : choice.route) as never);
  }, [baseBlock, home?.availability, router]);

  const todayContent = (
    <>
      <ArenaHubSummary model={hub} />
      <PressableHybrid
        testID="arena-hub-play"
        variant="primary"
        accessibilityLabel={arenaText(lang, 'play')}
        accessibilityHint={centralEnabled ? undefined : blockHint(centralBlock)}
        onPress={onPlay}
        contentStyle={[styles.play, { backgroundColor: P.accent }]}
      >
        <Ionicons name="play" size={25} color={P.accentText} />
        <Text style={[styles.playText, { color: P.accentText }]}>{arenaText(lang, 'play')}</Text>
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
          onPress={() => router.push({ pathname: '/arena_match', params: { matchId: home.activeMatch?.matchId } } as never)}
        />
      ) : activeQueue ? (
        <ArenaFeatureRow
          accent
          icon="search"
          title={arenaExpansionText(lang, 'activeQueue')}
          body={activeQueue.mode === 'ranked' ? arenaText(lang, 'rankedHint') : arenaText(lang, 'quickHint')}
          disabled={baseBlock !== 'ok'}
          disabledHint={baseBlock === 'ok' ? undefined : blockHint(baseBlock)}
          onPress={() => router.push({ pathname: '/arena_matchmaking', params: { mode: activeQueue.mode, requestId: activeQueue.requestId, stableUid: activeQueue.stableUid } } as never)}
        />
      ) : null}
      {expansionServerFailure ? <ArenaStateNotice state="error" onRetry={load} /> : null}
      <V2Card style={styles.todayCard}>
          <View style={styles.todayHead}>
            <View style={styles.todayCopy}>
              <Text style={[styles.todayTitle, todayTitleLine, { color: P.text }]}>{arenaExpansionText(lang, 'todayTitle')}</Text>
              <Text style={[styles.todayBody, todayBodyLine, { color: P.muted }]}>{arenaExpansionText(lang, 'todayBody')}</Text>
            </View>
            <View style={[styles.todayNumber, { backgroundColor: P.elev2 }]}>
              <Text style={[styles.todayNumberText, { color: P.text }]}>10</Text>
            </View>
          </View>
          <ArenaProgress value={today?.completedTasks ?? null} max={10} label={arenaExpansionText(lang, 'todayTitle')} />
          {today?.state === 'complete' ? (
            <Text accessibilityLiveRegion="polite" style={[styles.complete, { color: P.accent }]}>{arenaExpansionText(lang, 'todayComplete')}</Text>
          ) : (
            <V2Cta accessibilityLabel={todayAction} accessibilityHint={todayDisabledHint} disabled={todayBlock !== 'ok'} onPress={() => router.push('/arena_today' as never)}>{todayAction}</V2Cta>
          )}
      </V2Card>
    </>
  );

  return (
    <>
    <ArenaScreen
      title={arenaText(lang, 'title')}
      showBack={false}
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
      spinsAvailable={home?.profile.spinsAvailable ?? 0}
      onClose={() => setOverflowOpen(false)}
    />
    {arenaIntroDef ? (
      <FeatureIntroModal
        visible={arenaIntro.visible}
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
  todayCard: { gap: 16 },
  todayHead: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  todayCopy: { flex: 1 },
  todayTitle: { fontSize: 22, fontWeight: '900' },
  todayBody: { marginTop: 3, fontSize: 14, fontWeight: '600' },
  todayNumber: { width: 52, height: 52, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  todayNumberText: { fontSize: 22, fontWeight: '900' },
  complete: { minHeight: 44, textAlign: 'center', textAlignVertical: 'center', fontSize: 17, fontWeight: '900' },
  play: { minHeight: 62, borderRadius: 22, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, paddingHorizontal: 22 },
  playText: { fontSize: 19, fontWeight: '900' },
  overflowHitbox: { width: 44, height: 44, alignSelf: 'auto' },
  overflow: { width: 44, height: 44, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
});
