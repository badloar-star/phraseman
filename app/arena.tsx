import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useLang } from '../components/LangContext';
import { V2Card, V2Cta } from '../components/tournament/tournament_v2_ui';
import { useTournamentPalette } from '../components/tournament/tournament_theme';
import { ArenaScreen } from '../components/arena/ArenaScreen';
import { ArenaHubChrome } from '../components/arena/ArenaHubChrome';
import { ArenaDailyGoals } from '../components/arena/ArenaDailyGoals';
import { ArenaHubLive } from '../components/arena/ArenaHubLive';
import { arenaHubActionBlock, arenaHubModel, type ArenaHubBlockReason } from '../modules/arena/hub_view';
import {
  createArenaHubHydrationController,
  runArenaHubSpin,
} from '../modules/arena/hub_hydration';
import {
  ArenaFeatureRow,
  ArenaProgress,
  ArenaStateCard,
  ArenaStateNotice,
  ArenaWalletButton,
} from '../components/arena/ArenaExpansionUI';
import { arenaText } from '../modules/arena/copy';
import { useArenaFontScale } from '../hooks/use_arena_font_scale';
import { arenaExpansionText } from '../modules/arena/expansion_copy';
import { arenaExpansionHome, arenaFetchMatchHistory, arenaFlushOutbox, arenaOutboxBlockedByUpdate, arenaV2FriendsBoard, arenaV2Home, arenaV2SpinClaim, createArenaRequestId, type ArenaFriendsBoardRow } from './arena_client';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  arenaLoadHomeWarm,
  arenaPeekHomeWarm,
  arenaRememberHomeWarm,
  arenaWarmDayKey,
} from '../modules/arena/home_cache';
import type { ArenaKeyValueStore } from '../modules/arena/match_store';
import { useRuntimeActive } from '../hooks/use_runtime_active';
import { arenaFeatureOpenEvent } from '../modules/arena/telemetry';
import { trackArenaTelemetry } from './arena_telemetry';
import { useFeatureIntro } from '../hooks/use_feature_intro';
import FeatureIntroModal from '../components/FeatureIntroModal';
import { featureIntroById } from './feature_intro_registry';
import { ArenaConnectionNotice } from '../components/arena/ArenaConnectionNotice';

const warmStore = AsyncStorage as unknown as ArenaKeyValueStore;

export default function ArenaHubScreen() {
  const router = useRouter();
  const { lang } = useLang();
  const P = useTournamentPalette();
  // Высота строки числом не растёт вместе с системным шрифтом — при
  // крупном кегле строки наезжали друг на друга. См. use_arena_font_scale.
  const fontScale = useArenaFontScale();
  const todayTitleLine = { lineHeight: 28 * fontScale };
  const todayBodyLine = { lineHeight: 20 * fontScale };
  const active = useRuntimeActive();
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
  const spinRequestIdRef = useRef(createArenaRequestId('spin'));
  const [spinBusy, setSpinBusy] = useState(false);
  const [history, setHistory] = useState<readonly unknown[]>([]);
  const [friends, setFriends] = useState<readonly ArenaFriendsBoardRow[]>([]);

  const home = hydration.home.value;
  const expansion = hydration.expansion.value;
  const baseFailure = hydration.failure.home;
  const expansionFailure = hydration.failure.expansion;

  const load = useCallback(() => {
    const generation = hydrationController.refresh();
    if (generation === null) return;
    // Оба — разовые чтения при открытии. Прошедшие матчи не меняются, список
    // друзей меняется днями: держать на них подписку значит платить за
    // уведомления, которых не будет.
    void arenaFetchMatchHistory(10).then((rows) => {
      if (hydrationController.current(generation)) setHistory(rows);
    }).catch(() => { if (hydrationController.current(generation)) setHistory([]); });
    void arenaV2FriendsBoard().then((board) => {
      if (hydrationController.current(generation)) setFriends(board.rows);
    }).catch(() => {});
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
  useEffect(() => { trackArenaTelemetry(arenaFeatureOpenEvent('hub', 'direct')); }, []);

  /**
   * Обучающая модалка «Что такое Арена» — первый вход на экран (владелец,
   * 2026-08-16: «люди не находят фичи»). Показывается один раз на аккаунт
   * (AsyncStorage-флаг per generation, см. app/feature_intro_registry.ts),
   * через 600мс после фокуса — не мешает первому кадру осесть.
   */
  const arenaIntro = useFeatureIntro('arena_first_visit');
  const arenaIntroDef = featureIntroById('arena_first_visit');

  /**
   * Досылка застрявших отчётов. Хаб — то место, куда игрок приходит сам, и
   * отдельного расписания для этого нет намеренно: фоновый опрос стоил бы
   * денег за базу каждый день у каждого игрока.
   */
  const [reportBlocked, setReportBlocked] = useState(false);
  useEffect(() => {
    if (!active) return;
    let alive = true;
    void arenaFlushOutbox()
      .catch(() => 0)
      .then(() => arenaOutboxBlockedByUpdate())
      .then((blocked) => { if (alive) setReportBlocked(blocked); })
      .catch(() => {});
    return () => { alive = false; };
  }, [active]);

  const activeQueue = home?.activeQueue?.status === 'waiting' ? home.activeQueue : null;
  const activeRun = expansion?.activeRun;
  const offline = baseFailure?.kind === 'offline' || expansionFailure?.kind === 'offline';
  const serverFailure = baseFailure?.kind === 'server';
  const expansionServerFailure = expansionFailure?.kind === 'server';
  const today = expansion?.today;
  const blockHint = (reason: ArenaHubBlockReason) => {
    if (reason === 'offline') return arenaText(lang, 'hubOfflineHint');
    if (reason === 'server') return arenaText(lang, 'arenaNotDeployedHint');
    if (reason === 'maintenance') return arenaText(lang, 'maintenanceHint');
    if (reason === 'report_blocked') return arenaText(lang, 'reportBlockedHint');
    if (reason === 'mode_disabled' || reason === 'busy') return arenaText(lang, 'modeOff');
    return arenaText(lang, 'valueUnknown');
  };
  const baseBlock = arenaHubActionBlock({ known: home !== null, offline, server: serverFailure, maintenance: home?.availability.enabled === false, reportBlocked });
  const quickBlock = arenaHubActionBlock({ known: home !== null, offline, server: serverFailure, maintenance: home?.availability.enabled === false, reportBlocked, modeEnabled: home?.availability.quickEnabled });
  const todayBlock = arenaHubActionBlock({ known: expansion !== null && today !== undefined, offline, server: expansionServerFailure || serverFailure, maintenance: home?.availability.enabled === false, reportBlocked, modeEnabled: expansion?.availability.today && today?.state !== 'unavailable' });
  const walletBlock = arenaHubActionBlock({ known: expansion !== null, offline, server: expansionServerFailure || serverFailure, maintenance: home?.availability.enabled === false, reportBlocked, modeEnabled: expansion?.availability.store });
  const spinBlock = arenaHubActionBlock({ known: home !== null, offline, server: serverFailure, maintenance: home?.availability.enabled === false, reportBlocked, modeEnabled: home?.availability.spinEnabled, busy: spinBusy });
  const baseEnabled = baseBlock === 'ok';
  const quickDisabledHint = quickBlock === 'ok' ? undefined : blockHint(quickBlock);
  const todayDisabledHint = todayBlock === 'ok' ? undefined : blockHint(todayBlock);
  const walletDisabledHint = walletBlock === 'ok' ? undefined : blockHint(walletBlock);
  const todayAction = today?.state === 'in_progress' ? arenaExpansionText(lang, 'todayContinue') : arenaExpansionText(lang, 'todayStart');

  /**
   * Живая часть главного экрана.
   *
   * Всё, кроме таблицы друзей и истории, приходит из ответа, который экран и
   * так запрашивает. История читается разово из расписок, друзья — одним
   * пакетным вызовом: оба обращения делаются при открытии, а не по кругу.
   */
  const hub = useMemo(() => arenaHubModel({
    rating: home?.profile.rating,
    dailyDayKey: home?.profile.dailyDayKey,
    todayKey: home?.profile.todayKey ?? '',
    dailyMatches: home?.profile.dailyMatches,
    dailyFirstAnswers: home?.profile.dailyFirstAnswers,
    dailyWins: home?.profile.dailyWins,
    historyRaw: history,
    friendsRaw: friends,
  }), [home, history, friends]);

  const todayContent = (
    <>
      <ArenaHubLive model={hub} />
      <ArenaDailyGoals model={hub.goals} />
      {activeRun ? (
        <ArenaFeatureRow
          accent
          icon="flash"
          title={activeRun.runKind === 'ghost' ? arenaExpansionText(lang, 'ghost') : arenaExpansionText(lang, 'todayContinue')}
          body={activeRun.runKind === 'ghost' ? arenaExpansionText(lang, 'recordingBadge') : arenaExpansionText(lang, 'todayBody')}
          disabled={baseBlock !== 'ok'}
          disabledHint={baseBlock === 'ok' ? undefined : blockHint(baseBlock)}
          onPress={() => router.push({ pathname: '/arena_today', params: { runId: activeRun.runId, runKind: activeRun.runKind } } as never)}
        />
      ) : home?.activeMatch?.matchId ? (
        <ArenaFeatureRow
          accent
          icon="flash"
          title={arenaExpansionText(lang, 'activeMatch')}
          body={arenaText(lang, 'subtitle')}
          disabled={baseBlock !== 'ok'}
          disabledHint={baseBlock === 'ok' ? undefined : blockHint(baseBlock)}
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
      {/* зачем заголовок убран (владелец, 2026-08-16): экран и так открыт по
          кнопке «Играть» в таббаре — подпись над первым же пунктом повторяла
          название, под которым сюда пришли. */}
      <ArenaFeatureRow accent icon="play" title={arenaText(lang, 'quick')} body={arenaText(lang, 'quickHint')} disabledHint={quickDisabledHint} disabled={quickBlock !== 'ok'} onPress={() => router.push({ pathname: '/arena_matchmaking', params: { mode: 'quick', requestId: createArenaRequestId('queue') } } as never)} />
      {(home?.profile.spinsAvailable ?? 0) > 0 ? <ArenaFeatureRow icon="sparkles" title={arenaText(lang, 'spinNow')} body={`${home?.profile.spinsAvailable ?? 0}`} disabledHint={spinBlock === 'ok' ? undefined : blockHint(spinBlock)} disabled={spinBlock !== 'ok'} onPress={() => runArenaHubSpin({ controller: hydrationController, claim: () => arenaV2SpinClaim(spinRequestIdRef.current), onBusy: setSpinBusy, onAccepted: () => { spinRequestIdRef.current = createArenaRequestId('spin'); load(); } })} /> : null}
    </>
  );

  return (
    <ArenaHubChrome
      availability={home?.availability}
      activeMatchId={home?.activeMatch?.matchId ?? null}
      activeQueue={home?.activeQueue}
      matchBlocked={!baseEnabled}
      matchBlockedHint={baseEnabled ? undefined : blockHint(baseBlock)}
    >
    <ArenaScreen
      title={arenaText(lang, 'title')}
      subtitle={home
        ? home.profile.rankName ?? `${arenaText(lang, 'ranks')} ${(home.profile.rank ?? 0) + 1}`
        : '—'}
      onBack={() => router.replace('/(tabs)/home' as never)}
      headerRight={<ArenaWalletButton label={arenaExpansionText(lang, 'wallet')} balance={expansion ? expansion.wallet.walletStars : null} disabledHint={walletDisabledHint} disabled={walletBlock !== 'ok'} onPress={() => router.push('/arena_star_wallet' as never)} />}
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
    </ArenaHubChrome>
  );
}

const styles = StyleSheet.create({
  todayCard: { gap: 16 },
  todayHead: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  todayCopy: { flex: 1 },
  todayTitle: { fontSize: 22, fontWeight: '900' },
  todayBody: { marginTop: 3, fontSize: 14, fontWeight: '600' },
  todayNumber: { width: 52, height: 52, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  todayNumberText: { fontSize: 22, fontWeight: '900' },
  complete: { minHeight: 44, textAlign: 'center', textAlignVertical: 'center', fontSize: 17, fontWeight: '900' },
});
