import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useLang } from '../components/LangContext';
import { V2Card, V2Cta } from '../components/tournament/tournament_v2_ui';
import { useTournamentPalette } from '../components/tournament/tournament_theme';
import { ArenaScreen } from '../components/arena/ArenaScreen';
import { ArenaHubChrome } from '../components/arena/ArenaHubChrome';
import { ArenaDailyGoals } from '../components/arena/ArenaDailyGoals';
import { ArenaHubLive } from '../components/arena/ArenaHubLive';
import { arenaHubModel } from '../modules/arena/hub_view';
import {
  ArenaFeatureRow,
  ArenaProgress,
  ArenaSectionTabs,
  ArenaSectionTitle,
  ArenaStateCard,
  ArenaStateNotice,
  ArenaWalletButton,
} from '../components/arena/ArenaExpansionUI';
import { arenaText } from '../modules/arena/copy';
import { useArenaFontScale } from '../hooks/use_arena_font_scale';
import { arenaExpansionText } from '../modules/arena/expansion_copy';
import { coerceArenaHubSection, type ArenaExpansionHome } from '../modules/arena/expansion_contract';
import { arenaExpansionHome, arenaFetchMatchHistory, arenaFlushOutbox, arenaOutboxBlockedByUpdate, arenaV2FriendsBoard, arenaV2Home, arenaV2SpinClaim, createArenaRequestId, type ArenaFriendsBoardRow, type ArenaHomeResponse } from './arena_client';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  arenaLoadHomeWarm,
  arenaPeekHomeWarm,
  arenaRememberHomeWarm,
} from '../modules/arena/home_cache';
import type { ArenaKeyValueStore } from '../modules/arena/match_store';
import { useRuntimeActive } from '../hooks/use_runtime_active';
import { arenaFeatureOpenEvent } from '../modules/arena/telemetry';
import { trackArenaTelemetry } from './arena_telemetry';

const warmStore = AsyncStorage as unknown as ArenaKeyValueStore;

/**
 * Код отказа вызова Арены в пригодном для показа виде.
 *
 * зачем: сервер называет причину словами (`arena_disabled`,
 * `arena_client_update_required`, `account_delete_pending`,
 * `arena_config_incompatible:...`), но экран показывал одну и ту же карточку
 * на любой отказ, а сама ошибка нигде не сохранялась. Диагностика сводилась к
 * гаданию. Достаём код и показываем его человеку — короткой строкой, не
 * стеной текста.
 */
function arenaErrorCode(e: unknown): string {
  const raw = e as { code?: unknown; message?: unknown } | null | undefined;
  const message = typeof raw?.message === 'string' ? raw.message : '';
  const code = typeof raw?.code === 'string' ? raw.code : '';
  // Firebase кладёт полезное в message, а в code — транспортный уровень
  // ('functions/failed-precondition'), который ни о чём не говорит.
  const useful = message || code;
  return useful ? useful.slice(0, 80) : 'unknown';
}

export default function ArenaHubScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ section?: string }>();
  const { lang } = useLang();
  const P = useTournamentPalette();
  // Высота строки числом не растёт вместе с системным шрифтом — при
  // крупном кегле строки наезжали друг на друга. См. use_arena_font_scale.
  const fontScale = useArenaFontScale();
  const todayTitleLine = { lineHeight: 28 * fontScale };
  const todayBodyLine = { lineHeight: 20 * fontScale };
  const active = useRuntimeActive();
  const section = coerceArenaHubSection(params.section);
  /**
   * Первый кадр рисуется ПРОШЛЫМ снимком, а не пустотой (владелец: «видимой
   * загрузки не должно быть нигде»). Снимок читается из памяти синхронно,
   * поэтому экран открывается уже с данными, а свежие приезжают молча.
   */
  const warm = useMemo(() => arenaPeekHomeWarm(Date.now()), []);
  const [home, setHome] = useState<ArenaHomeResponse | null>(
    (warm?.home ?? null) as ArenaHomeResponse | null,
  );
  const [expansion, setExpansion] = useState<ArenaExpansionHome | null>(
    (warm?.expansion ?? null) as ArenaExpansionHome | null,
  );
  const [baseError, setBaseError] = useState(false);
  const [baseErrorCode, setBaseErrorCode] = useState<string | null>(null);
  const [expansionError, setExpansionError] = useState(false);
  const spinRequestIdRef = useRef(createArenaRequestId('spin'));
  const [spinBusy, setSpinBusy] = useState(false);
  const [history, setHistory] = useState<readonly unknown[]>([]);
  const [friends, setFriends] = useState<readonly ArenaFriendsBoardRow[]>([]);

  const load = useCallback(() => {
    setBaseError(false);
    setBaseErrorCode(null);
    setExpansionError(false);
    void arenaV2Home().then((response) => {
      setHome(response);
      arenaRememberHomeWarm({ home: response, wallNowMs: Date.now(), store: warmStore });
    }).catch((e: unknown) => {
      // зачем: отказ проглатывался молча — экран рисовал «Арена не включена
      // на сервере» на ЛЮБУЮ ошибку, и настоящую причину нельзя было узнать
      // ни с телефона, ни из логов. 2026-08-16 на поиск ушёл целый день, а
      // причиной оказался гейт версии, потом помеченный на удаление аккаунт.
      // Код ошибки нужен и в консоли Metro, и на самом экране.
      const code = arenaErrorCode(e);
      setBaseErrorCode(code);
      setBaseError(true);
      if (__DEV__) console.warn('[arena] arenaV2Home failed:', code, e);
    });
    void arenaExpansionHome().then((response) => {
      setExpansion(response);
      arenaRememberHomeWarm({ expansion: response, wallNowMs: Date.now(), store: warmStore });
    }).catch((e: unknown) => {
      setExpansionError(true);
      if (__DEV__) console.warn('[arena] arenaExpansionHome failed:', arenaErrorCode(e), e);
    });
    // Оба — разовые чтения при открытии. Прошедшие матчи не меняются, список
    // друзей меняется днями: держать на них подписку значит платить за
    // уведомления, которых не будет.
    void arenaFetchMatchHistory(10).then(setHistory).catch(() => setHistory([]));
    void arenaV2FriendsBoard().then((board) => setFriends(board.rows)).catch(() => {});
  }, []);

  useEffect(() => { if (active) load(); }, [active, load]);

  /**
   * Снимок с диска — на случай, когда приложение только что запустили и память
   * пуста. Он приходит асинхронно, но всё равно раньше сети, и ставится только
   * если своё уже не пришло: свежее важнее вчерашнего.
   */
  useEffect(() => {
    if (home && expansion) return;
    let alive = true;
    void arenaLoadHomeWarm(warmStore, Date.now()).then((stored) => {
      if (!alive || !stored) return;
      setHome((current) => current ?? (stored.home as ArenaHomeResponse | null));
      setExpansion((current) => current ?? (stored.expansion as ArenaExpansionHome | null));
    }).catch(() => {});
    return () => { alive = false; };
    // Только на открытии экрана: дальше данные приходят по сети.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(() => { trackArenaTelemetry(arenaFeatureOpenEvent('hub', 'direct')); }, []);

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

  const labels = useMemo(() => ({
    today: arenaExpansionText(lang, 'today'),
    play: arenaExpansionText(lang, 'play'),
    growth: arenaExpansionText(lang, 'growth'),
    together: arenaExpansionText(lang, 'together'),
  }), [lang]);

  const activeQueue = home?.activeQueue?.status === 'waiting' ? home.activeQueue : null;
  const activeRun = expansion?.activeRun;
  const baseEnabled = home?.availability.enabled === true && !baseError;
  const today = expansion?.today;
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
      {home ? <ArenaHubLive model={hub} /> : null}
      {home ? <ArenaDailyGoals model={hub.goals} /> : null}
      {activeRun ? (
        <ArenaFeatureRow
          accent
          icon="flash"
          title={activeRun.runKind === 'ghost' ? arenaExpansionText(lang, 'ghost') : arenaExpansionText(lang, 'todayContinue')}
          body={activeRun.runKind === 'ghost' ? arenaExpansionText(lang, 'recordingBadge') : arenaExpansionText(lang, 'todayBody')}
          onPress={() => router.push({ pathname: '/arena_today', params: { runId: activeRun.runId, runKind: activeRun.runKind } } as never)}
        />
      ) : home?.activeMatch?.matchId ? (
        <ArenaFeatureRow
          accent
          icon="flash"
          title={arenaExpansionText(lang, 'activeMatch')}
          body={arenaText(lang, 'subtitle')}
          onPress={() => router.push({ pathname: '/arena_match', params: { matchId: home.activeMatch?.matchId } } as never)}
        />
      ) : activeQueue ? (
        <ArenaFeatureRow
          accent
          icon="search"
          title={arenaExpansionText(lang, 'activeQueue')}
          body={activeQueue.mode === 'ranked' ? arenaText(lang, 'rankedHint') : arenaText(lang, 'quickHint')}
          onPress={() => router.push({ pathname: '/arena_matchmaking', params: { mode: activeQueue.mode, requestId: activeQueue.requestId, stableUid: activeQueue.stableUid } } as never)}
        />
      ) : null}
      {/* Слово «Загрузка» здесь больше не показывается: первый кадр рисуется
          прошлым снимком, а если снимка нет — просто ничего, а не надпись,
          которую владелец видеть запретил. */}
      {expansionError ? <ArenaStateNotice state="error" onRetry={load} /> : null}
      {today ? (
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
          <ArenaProgress value={today.completedTasks} max={10} label={arenaExpansionText(lang, 'todayTitle')} />
          {today.state === 'complete' ? (
            <Text accessibilityLiveRegion="polite" style={[styles.complete, { color: P.accent }]}>{arenaExpansionText(lang, 'todayComplete')}</Text>
          ) : (
            <V2Cta disabled={!baseEnabled || !expansion.availability.today || today.state === 'unavailable'} onPress={() => router.push('/arena_today' as never)}>{todayAction}</V2Cta>
          )}
        </V2Card>
      ) : null}
      <ArenaSectionTitle>{arenaExpansionText(lang, 'play')}</ArenaSectionTitle>
      <ArenaFeatureRow accent icon="play" title={arenaText(lang, 'quick')} body={arenaText(lang, 'quickHint')} disabled={!baseEnabled || !home?.availability.quickEnabled} onPress={() => router.push({ pathname: '/arena_matchmaking', params: { mode: 'quick', requestId: createArenaRequestId('queue') } } as never)} />
      {(home?.profile.spinsAvailable ?? 0) > 0 ? <ArenaFeatureRow icon="sparkles" title={arenaText(lang, 'spinNow')} body={`${home?.profile.spinsAvailable ?? 0}`} disabled={!baseEnabled || !home?.availability.spinEnabled || spinBusy} onPress={() => { setSpinBusy(true); void arenaV2SpinClaim(spinRequestIdRef.current).then(() => { spinRequestIdRef.current = createArenaRequestId('spin'); load(); }).finally(() => setSpinBusy(false)); }} /> : null}
    </>
  );

  const playContent = (
    <>
      <ArenaSectionTitle>{arenaExpansionText(lang, 'playTitle')}</ArenaSectionTitle>
      <ArenaFeatureRow accent icon="flash" title={arenaText(lang, 'quick')} body={arenaText(lang, 'quickHint')} disabled={!baseEnabled || !home?.availability.quickEnabled} onPress={() => router.push({ pathname: '/arena_matchmaking', params: { mode: 'quick', requestId: createArenaRequestId('queue') } } as never)} />
      <ArenaFeatureRow icon="trophy" title={arenaText(lang, 'ranked')} body={arenaText(lang, 'rankedHint')} disabled={!baseEnabled || !home?.availability.rankedEnabled} onPress={() => router.push({ pathname: '/arena_matchmaking', params: { mode: 'ranked', requestId: createArenaRequestId('queue') } } as never)} />
      <ArenaFeatureRow icon="people" title={arenaText(lang, 'friend')} body={arenaText(lang, 'friendHint')} disabled={!baseEnabled || !home?.availability.friendEnabled} onPress={() => router.push('/arena_friend_duel' as never)} />
      <ArenaFeatureRow icon="flask" title={arenaExpansionText(lang, 'lab')} body={arenaExpansionText(lang, 'labBody')} disabled={!baseEnabled || !expansion?.availability.lab} onPress={() => router.push('/arena_match_lab' as never)} />
      <ArenaFeatureRow icon="recording" title={arenaExpansionText(lang, 'ghost')} body={arenaExpansionText(lang, 'ghostDisclosure')} disabled={!baseEnabled || !expansion?.availability.ghost} badge={arenaExpansionText(lang, 'recordingBadge')} onPress={() => router.push('/arena_ghost_duel' as never)} />
    </>
  );

  const growthContent = (
    <>
      <ArenaFeatureRow accent icon="map" title={arenaExpansionText(lang, 'mastery')} body={expansion?.mastery.length ? `${expansion.mastery.length} / 5` : arenaExpansionText(lang, 'masteryLow')} disabled={!baseEnabled || !expansion?.availability.mastery} onPress={() => router.push('/arena_mastery_map' as never)} />
      <ArenaFeatureRow icon="podium" title={arenaText(lang, 'ranks')} body={home?.profile.rankName ?? `${arenaText(lang, 'ranks')} ${(home?.profile.rank ?? 0) + 1}`} disabled={!baseEnabled} onPress={() => router.push('/arena_ranks' as never)} />
      <ArenaFeatureRow icon="star" title={arenaText(lang, 'season')} body={`${home?.season.stars ?? 0}`} disabled={!baseEnabled} onPress={() => router.push('/arena_season_pass' as never)} />
    </>
  );

  const togetherContent = (
    <>
      <ArenaFeatureRow accent icon="ribbon" title={arenaExpansionText(lang, 'rivalry')} body={arenaExpansionText(lang, 'rivalryBody')} disabled={!baseEnabled || !expansion?.availability.rival} badge={expansion?.rivalries.length ? `${expansion.rivalries.length}` : undefined} onPress={() => router.push('/arena_rivalries' as never)} />
      <ArenaFeatureRow icon="people-circle" title={arenaExpansionText(lang, 'partner')} body={arenaExpansionText(lang, 'partnerBody')} disabled={!baseEnabled || !expansion?.availability.partner} onPress={() => router.push('/arena_partner' as never)} />
      <ArenaFeatureRow icon="person-add" title={arenaText(lang, 'friend')} body={arenaText(lang, 'friendHint')} disabled={!baseEnabled || !home?.availability.friendEnabled} onPress={() => router.push('/arena_friend_duel' as never)} />
    </>
  );

  return (
    <ArenaHubChrome
      availability={home?.availability}
      activeMatchId={home?.activeMatch?.matchId ?? null}
      activeQueue={home?.activeQueue}
    >
    <ArenaScreen
      title={arenaText(lang, 'title')}
      subtitle={home?.profile.rankName ?? `${arenaText(lang, 'ranks')} ${(home?.profile.rank ?? 0) + 1}`}
      onBack={() => router.replace('/(tabs)/home' as never)}
      headerRight={<ArenaWalletButton label={arenaExpansionText(lang, 'wallet')} balance={expansion ? expansion.wallet.walletStars : null} disabled={!baseEnabled || !expansion?.availability.store} onPress={() => router.push('/arena_star_wallet' as never)} />}
    >
      <ArenaSectionTabs selected={section} labels={labels} onSelect={(next) => router.setParams({ section: next })} />
      {/*
        Пока Арена не включена на сервере, все кнопки погашены — и без
        объяснения это выглядит как поломка приложения. Владелец увидел ровно
        это: «играть кнопки недоступны». Отказ вызова тут означает не «плохая
        сеть», а «серверная часть ещё не развёрнута».
      */}
      {baseError ? (
        <ArenaStateCard
          state="unavailable"
          title={arenaText(lang, 'arenaNotDeployed')}
          // зачем: раньше здесь всегда стояло «дело за серверной частью» —
          // единственная догадка, выданная за факт. Она увела диагностику
          // на целый день, пока сервер был полностью исправен. Показываем
          // то, что сервер действительно ответил.
          body={baseErrorCode
            ? `${arenaText(lang, 'arenaNotDeployedHint')}\n\n${baseErrorCode}`
            : arenaText(lang, 'arenaNotDeployedHint')}
        />
      ) : null}
      {/* Отчёт, застрявший из-за старой сборки, повторами не спасти: игроку
          надо сказать, что от него требуется, иначе награда не придёт никогда,
          а он даже не узнает почему. */}
      {reportBlocked ? <ArenaStateCard state="unavailable" title={arenaText(lang, 'reportBlocked')} body={arenaText(lang, 'reportBlockedHint')} /> : null}
      {home && !home.availability.enabled ? <ArenaStateCard state="unavailable" title={arenaText(lang, 'maintenance')} body={arenaText(lang, 'maintenanceHint')} /> : null}
      {section === 'today' ? todayContent : section === 'play' ? playContent : section === 'growth' ? growthContent : togetherContent}
    </ArenaScreen>
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
