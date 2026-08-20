import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { BackHandler, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useLang } from '../components/LangContext';
import { ArenaScreen } from '../components/arena/ArenaScreen';
import { ArenaSearchPulse } from '../components/arena/ArenaSearchPulse';
import { V2Card, V2Cta } from '../components/tournament/tournament_v2_ui';
import { useTournamentPalette } from '../components/tournament/tournament_theme';
import { arenaSearchingCountText, arenaText } from '../modules/arena/copy';
import { arenaEntryFailure, arenaEntryFailureCopy, arenaSearchFailureCopy, type ArenaEntryFailure } from '../modules/arena/duel_plan';
import { ArenaNoOpponentError } from '../modules/arena/entry_prefetch';
import { ARENA_QUICK_FALLBACK_MAX_MS, ARENA_RANKED_HEARTBEAT_MS, type ArenaQueueMode } from '../modules/arena/contract';
import { useRuntimeActive } from '../hooks/use_runtime_active';
import { useVisibleWallClock } from '../hooks/use_visible_wall_clock';
import { arenaRankedElapsedMs, arenaRankedWaitPresentation } from '../modules/arena/matchmaking_state';
import { useArenaSound } from '../hooks/use_arena_sound';
import {
  arenaV2FindMatch,
  arenaV2QueueCancel,
  arenaV2QuickBotFallback,
  createArenaRequestId,
  useArenaQueue,
} from './arena_client';
import { useArenaFontScale } from '../hooks/use_arena_font_scale';
import { arenaEntryPrefetchStart } from './arena_entry_prefetch';

const quickFallbackRequests = new Set<string>();

/**
 * React в dev/Strict Mode может смонтировать экран поиска дважды. Если
 * генерировать id внутри компонента, первый вызов успевает создать очередь с
 * одним id, а второй получает arena_queue_request_active уже с другим id.
 * Держим неявный id на уровне модуля до явного завершения очереди; переходы
 * из интерфейса всё равно передают свой id параметром.
 */
const implicitQueueRequestIds = new Map<ArenaQueueMode, string>();

function implicitQueueRequestId(mode: ArenaQueueMode): string {
  const current = implicitQueueRequestIds.get(mode);
  if (current) return current;
  const created = createArenaRequestId('queue');
  implicitQueueRequestIds.set(mode, created);
  return created;
}

function releaseImplicitQueueRequestId(mode: ArenaQueueMode, requestId: string): void {
  if (implicitQueueRequestIds.get(mode) === requestId) implicitQueueRequestIds.delete(mode);
}

export default function ArenaMatchmakingScreen() {
  const router = useRouter();
  const { lang } = useLang();
  const P = useTournamentPalette();
  // Высота строки числом не растёт вместе с системным шрифтом — при
  // крупном кегле строки наезжали друг на друга. См. use_arena_font_scale.
  const fontScale = useArenaFontScale();
  const hintLine = { lineHeight: 20 * fontScale };
  const failureHintLine = { lineHeight: 19 * fontScale };
  const params = useLocalSearchParams<{ mode?: string; requestId?: string; stableUid?: string }>();
  const mode: ArenaQueueMode = params.mode === 'ranked' ? 'ranked' : 'quick';
  const active = useRuntimeActive();
  const requestId = typeof params.requestId === 'string' && params.requestId
    ? params.requestId
    : implicitQueueRequestId(mode);
  const localStartedAtMsRef = useRef(Date.now());
  const now = useVisibleWallClock(active, 1_000);
  const [stableUid, setStableUid] = useState<string | null>(typeof params.stableUid === 'string' ? params.stableUid : null);
  const [matchId, setMatchId] = useState<string | null>(null);
  /**
   * Причина, по которой поиск сорвался, а НЕ текст ошибки. Раньше сюда клали
   * `String(reason)` и не показывали его вовсе: экран краснел одним словом
   * «Повторить» — глаголом вместо объяснения, и без кнопки, которой его можно
   * выполнить.
   */
  const [error, setError] = useState<ArenaEntryFailure | null>(null);
  /** Ручной повтор: меняет зависимость эффекта поиска и запускает его заново. */
  const [retryTick, setRetryTick] = useState(0);
  const [entryFailure, setEntryFailure] = useState<ArenaEntryFailure | null>(null);
  const [entryRetryTick, setEntryRetryTick] = useState(0);
  const [switchingMode, setSwitchingMode] = useState(false);
  const [rankedPresentationRestartedAtMs, setRankedPresentationRestartedAtMs] = useState<number | undefined>();
  /** Момент входа бота назначает сервер. Клиент только ждёт до него.
   *  Считаем от локального старта очереди, чтобы расхождение часов не сдвигало срок. */
  const [botDelayMs, setBotDelayMs] = useState<number | null>(null);
  /** Повтор запроса бота, если сервер сказал «ещё рано» (расхождение часов). */
  const [botRetryTick, setBotRetryTick] = useState(0);
  /** Продление 45-секундной серверной аренды для бота, назначенного позднее. */
  const [leaseRefreshTick, setLeaseRefreshTick] = useState(0);
  /** Осечки сети подряд. Ref, а не state: считать их — не повод перерисовывать. */
  const transientFailuresRef = useRef(0);
  /**
   * Сколько живых игроков ищет сейчас. Приходит попутно с ответом поиска —
   * отдельного запроса ради счётчика нет, иначе это был бы опрос по кругу.
   */
  const [searchingNow, setSearchingNow] = useState<number | null>(null);
  const queue = useArenaQueue(stableUid, active && !matchId);
  const playSound = useArenaSound();
  const title = useMemo(() => arenaText(lang, mode), [lang, mode]);
  const rankedElapsedMs = arenaRankedElapsedMs(
    now,
    localStartedAtMsRef.current,
    queue.value?.joinedAtMs,
    rankedPresentationRestartedAtMs,
  );
  const rankedPresentation = mode === 'ranked'
    ? arenaRankedWaitPresentation(rankedElapsedMs)
    : 'searching';

  useEffect(() => {
    // Экран поиска открылся.
    playSound('searchStart');
    localStartedAtMsRef.current = Date.now();
    setRankedPresentationRestartedAtMs(undefined);
    setSwitchingMode(false);
    setBotDelayMs(null);
    setBotRetryTick(0);
    setLeaseRefreshTick(0);
  }, [requestId]);

  // `null` принимается наравне с `undefined`: подписка на очередь отдаёт
  // именно null, пока билета ещё нет, и без этого проверка типов краснела.
  const adoptBotSchedule = useCallback((ticket?: { joinedAtMs?: number; botDueAtMs?: number } | null) => {
    const due = Number(ticket?.botDueAtMs);
    const joined = Number(ticket?.joinedAtMs);
    if (!Number.isFinite(due) || !Number.isFinite(joined)) return;
    setBotDelayMs(Math.max(0, Math.min(ARENA_QUICK_FALLBACK_MAX_MS, due - joined)));
  }, []);

  useEffect(() => {
    if (!active || matchId) return;
    let cancelled = false;
    const reconcile = () => arenaV2FindMatch(mode, requestId).then((result) => {
      if (cancelled) return;
      setStableUid(result.stableUid);
      if (typeof result.searchingNow === 'number') setSearchingNow(result.searchingNow);
      adoptBotSchedule(result.queue);
      if (result.matchId) {
        // Соперник найден — звук ровно один раз, до перехода на матч.
        playSound('opponentFound');
        setError(null);
        setMatchId(result.matchId);
      }
      // Успех — счётчик осечек обнуляется: связь снова есть.
      transientFailuresRef.current = 0;
    }).catch((reason) => {
      if (cancelled) return;
      const failure = arenaEntryFailure(reason);
      // зачем: раньше ЛЮБАЯ осечка мгновенно рисовала «Поиск соперника
      // прервался» — ровно то, что владелец увидел на экране при живом
      // сервере. Сеть на телефоне моргает постоянно, а сверка идёт раз в
      // 15 секунд, и одна неудачная попытка ничего не значит: место в
      // очереди живёт 45 секунд и переживает две пропущенные сверки.
      // Молчим до трёх подряд, дальше говорим честно.
      //
      // Отказы по существу (раздел выключен, нужна новая сборка, активный
      // матч) не «моргание сети» — их показываем сразу, повтор их не лечит.
      const transient = failure === 'offline' || failure === 'transient';
      if (!transient) { setError(failure); return; }
      transientFailuresRef.current += 1;
      if (transientFailuresRef.current >= 3) setError(failure);
    });
    void reconcile();
    /**
     * зачем: раньше сверка по расписанию была только в рейтинге, а быстрый матч
     * держался на одном клиентском таймере бота. Стоило свернуть приложение —
     * таймер замирал, и поиск умирал молча, хотя экран обещал «можно свернуть».
     * Теперь оба режима переспрашивают сервер: живой соперник, вставший в
     * очередь позже, подхватывается без перезахода, а в быстром та же сверка
     * добирает бота, если локальный таймер не сработал.
     *
     * Цена: один вызов раз в ARENA_RANKED_HEARTBEAT_MS и только на ВИДИМОМ
     * экране поиска (эффект завязан на active). Фонового опроса нет.
     */
    const heartbeat = setInterval(() => { void reconcile(); }, ARENA_RANKED_HEARTBEAT_MS);
    return () => {
      cancelled = true;
      clearInterval(heartbeat);
    };
  }, [active, adoptBotSchedule, leaseRefreshTick, matchId, mode, requestId, retryTick]);

  useEffect(() => {
    if (!active || matchId || mode !== 'quick' || botDelayMs === null) return undefined;
    // botDueAtMs может быть через 55 с, а lease очереди живёт 45 с. Один
    // FindMatch с тем же requestId перед концом аренды сохраняет joinedAtMs и
    // назначенный сервером botDueAtMs, только продлевая существующий билет.
    const refreshAtMs = localStartedAtMsRef.current + Math.min(botDelayMs, 40_000);
    const timer = setTimeout(() => setLeaseRefreshTick((tick) => tick + 1),
      Math.max(0, refreshAtMs - Date.now()));
    return () => clearTimeout(timer);
  }, [active, botDelayMs, matchId, mode]);

  useEffect(() => {
    // Firestore сначала может отдать локальный снимок ПРЕДЫДУЩЕЙ очереди.
    // Его таймер не принадлежит текущему поиску и не должен запускать бота.
    if (queue.value?.requestId === requestId) adoptBotSchedule(queue.value);
  }, [adoptBotSchedule, queue.value, requestId]);

  useEffect(() => {
    if (!active || matchId || mode !== 'quick' || botDelayMs === null) return undefined;
    if (quickFallbackRequests.has(requestId)) return undefined;
    let cancelled = false;
    const fireAtMs = localStartedAtMsRef.current + botDelayMs + botRetryTick * 2_000;
    const timer = setTimeout(() => {
      quickFallbackRequests.add(requestId);
      // зачем: пометка снималась только в catch. Если вызов зависал (сеть
      // моргнула при возврате из фона) и экран перемонтировался, проверка
      // выше блокировала повтор НАВСЕГДА — бот не приходил вовсе, а человек
      // смотрел на вечный поиск. Страховка снимает пометку, если ответа нет
      // дольше десяти секунд: повторный вызов сервер отобьёт как дубликат,
      // а вот молчание не лечится ничем.
      const unstick = setTimeout(() => quickFallbackRequests.delete(requestId), 10_000);
      void arenaV2QuickBotFallback(requestId).then((result) => {
        clearTimeout(unstick);
        if (!cancelled) setMatchId(result.matchId);
      }).catch((reason) => {
        // Сервер — единственный владелец момента входа бота. Если наши локальные
        // часы забежали вперёд, он отвечает arena_quick_bot_too_early: снимаем
        // блокировку и пробуем ещё раз чуть позже, а не бросаем поиск навсегда.
        clearTimeout(unstick);
        quickFallbackRequests.delete(requestId);
        if (cancelled) return;
        if (String(reason).includes('arena_quick_bot_too_early')) {
          setBotRetryTick((tick) => tick + 1);
          return;
        }
        setError(arenaEntryFailure(reason));
      });
    }, Math.max(0, fireAtMs - Date.now()));
    return () => { cancelled = true; clearTimeout(timer); };
  }, [active, botDelayMs, botRetryTick, leaseRefreshTick, matchId, mode, requestId, retryTick]);

  useEffect(() => {
    // Кэш Firestore может на один кадр вернуть matched-билет предыдущего
    // поиска. Переходить можно только по билету с НАШИМ requestId, иначе новый
    // поиск открывает старый уже завершённый матч и затем сам себя отменяет.
    const next = queue.value?.requestId === requestId && queue.value.status === 'matched'
      ? queue.value.matchId
      : null;
    if (next) setMatchId(next);
  }, [queue.value, requestId]);

  useEffect(() => {
    if (!matchId) return;
    quickFallbackRequests.delete(requestId);
    releaseImplicitQueueRequestId(mode, requestId);
    setEntryFailure(null);
    let alive = true;
    void arenaEntryPrefetchStart(matchId).then(() => {
      if (!alive) return;
      router.replace({ pathname: '/arena_match', params: { matchId, prepared: '1' } } as never);
    }).catch((reason) => {
      if (!alive) return;
      setEntryFailure(reason instanceof ArenaNoOpponentError ? 'no_opponent' : arenaEntryFailure(reason));
    });
    return () => { alive = false; };
  }, [entryRetryTick, matchId, mode, requestId, router]);

  useEffect(() => {
    if (!matchId) return undefined;
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => true);
    return () => subscription.remove();
  }, [matchId]);

  /**
   * Отмена поиска. Раньше здесь стоял `.finally(...)`: экран уходил домой
   * ДАЖЕ ЕСЛИ отмена не прошла. Игрок был уверен, что вышел из очереди, а
   * сервер продолжал его искать — и в рейтинге это кончалось матчем, который
   * начался без него, то есть поражением ни за что.
   */
  /** Сколько игрок уже ждёт: м:сс, моноширинно — цифры не должны прыгать. */
  const elapsedLabel = useMemo(() => {
    const seconds = Math.max(0, Math.floor((now - localStartedAtMsRef.current) / 1000));
    return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
  }, [now]);

  const [cancelFailed, setCancelFailed] = useState(false);
  const cancellingRef = useRef(false);
  /**
   * Отмена поиска. Уходим с экрана МГНОВЕННО, сеть догоняет фоном.
   *
   * зачем: router.replace стоял внутри .then() — экран висел до ответа
   * сервера, и ни «Назад», ни «Отмена» не срабатывали сразу. Владелец
   * (2026-08-16): «они должны прерывать процесс мгновенно».
   *
   * Почему это безопасно, хотя раньше ждали намеренно: снятие с очереди
   * идемпотентно и переживает уход с экрана. Прежний страх — «игрок думает,
   * что вышел, а сервер его ещё ищет, и в рейтинге это поражение ни за что» —
   * закрыт иначе: requestId освобождается сразу, повтор шлётся при отказе, а
   * если отменить так и не удалось, хаб Арены увидит активную очередь в
   * arenaV2Home и покажет её честно. Держать человека на экране ради этого —
   * плата не с той стороны.
   */
  const cancel = useCallback(() => {
    if (matchId || cancellingRef.current) return; // защита от двойного тапа и отмены назначенного матча
    cancellingRef.current = true;
    quickFallbackRequests.delete(requestId);
    setCancelFailed(false);
    releaseImplicitQueueRequestId(mode, requestId);
    router.replace('/arena' as never);
    // Сеть — вдогонку. Один повтор: сеть на телефоне моргает чаще, чем падает.
    void arenaV2QueueCancel(requestId).catch(() => {
      setTimeout(() => { void arenaV2QueueCancel(requestId).catch(() => {}); }, 1500);
    });
  }, [matchId, mode, requestId, router]);

  const switchToQuick = async () => {
    if (mode !== 'ranked' || switchingMode || matchId) return;
    setSwitchingMode(true);
    setError(null);
    try {
      await arenaV2QueueCancel(requestId);
      releaseImplicitQueueRequestId(mode, requestId);
      const nextRequestId = createArenaRequestId('queue');
      router.replace({ pathname: '/arena_matchmaking', params: { mode: 'quick', requestId: nextRequestId } } as never);
    } catch (reason) {
      setError(arenaEntryFailure(reason));
      setSwitchingMode(false);
    }
  };

  /**
   * Что показать, если поиск сорвался. Считается здесь, а не в разметке:
   * развилка в JSX не проверяется тестом, а именно в ней и жила ошибка —
   * четыре разные причины показывались одним словом «Повторить».
   */
  const searchFailure = !matchId && error ? arenaSearchFailureCopy(error) : null;
  const assignedFailure = entryFailure ? arenaEntryFailureCopy(entryFailure) : null;

  const continueRankedSearch = () => {
    setError(null);
    setRankedPresentationRestartedAtMs(now);
  };

  const recoverNoOpponent = () => {
    router.replace({
      pathname: '/arena_matchmaking',
      params: { mode: 'quick', requestId: createArenaRequestId('queue') },
    } as never);
  };

  return (
    <ArenaScreen title={title} subtitle={arenaText(lang, 'searching')} variant="lobby" scroll={false} onBack={cancel} backDisabled={Boolean(matchId)}>
      <View style={styles.center}>
        <V2Card style={styles.card}>
          {/* зачем: системный спиннер одинаков во всех приложениях мира и на
              длинном ожидании начинает раздражать — у вращения нет ни начала,
              ни конца. Волна по сетке живёт циклами, глаз отдыхает на паузе.
              Владелец выбрал этот вариант из пяти (2026-08-16). */}
          {rankedPresentation !== 'calm' ? <ArenaSearchPulse /> : null}
          <Text accessibilityLiveRegion="polite" style={[styles.searching, { color: P.text }]}>
            {rankedPresentation === 'calm' ? arenaText(lang, 'rankedEmpty') : arenaText(lang, 'searching')}
          </Text>
          {/* зачем: без счётчика ожидание безразмерно — непонятно, идёт ли
              поиск вообще. Владелец (2026-08-16): «поиск должен происходить с
              таймером, сколько человек времени уже ищет». Часы тикают только
              на видимом экране, поэтому фоновой работы это не добавляет. */}
          {rankedPresentation !== 'calm' ? (
            <Text style={[styles.elapsed, { color: P.text }]}>{elapsedLabel}</Text>
          ) : null}
          <Text style={[styles.hint, hintLine, { color: P.muted }]}>
            {mode === 'ranked' && searchingNow !== null
              ? arenaSearchingCountText(lang, searchingNow)
              : rankedPresentation === 'calm' ? arenaText(lang, 'rankedEmptyHint') : arenaText(lang, 'keepOpen')}
          </Text>
          {!matchId && mode === 'ranked' && rankedPresentation === 'quick_offer' ? (
            <View style={styles.offer}>
              <Text style={[styles.offerTitle, { color: P.text }]}>{arenaText(lang, 'rankedQuickOffer')}</Text>
              <V2Cta disabled={switchingMode} onPress={() => void switchToQuick()}>{arenaText(lang, 'switchToQuick')}</V2Cta>
            </View>
          ) : null}
          {!matchId && mode === 'ranked' && rankedPresentation === 'calm' ? (
            <View style={styles.offer}>
              <V2Cta disabled={switchingMode} onPress={continueRankedSearch}>{arenaText(lang, 'continueSearch')}</V2Cta>
              <V2Cta tone="ghost" disabled={switchingMode} onPress={() => void switchToQuick()}>{arenaText(lang, 'switchToQuick')}</V2Cta>
            </View>
          ) : null}
          {cancelFailed ? (
            <View style={styles.failure}>
              <Text accessibilityLiveRegion="polite" style={[styles.failureTitle, { color: P.text }]}>
                {arenaText(lang, 'cancelFailed')}
              </Text>
              <Text style={[styles.failureHint, failureHintLine, { color: P.muted }]}>{arenaText(lang, 'cancelFailedHint')}</Text>
            </View>
          ) : null}
          {searchFailure ? (
            <View style={styles.failure}>
              <Text accessibilityLiveRegion="polite" style={[styles.failureTitle, { color: P.text }]}>
                {arenaText(lang, searchFailure.title)}
              </Text>
              <Text style={[styles.failureHint, failureHintLine, { color: P.muted }]}>{arenaText(lang, searchFailure.hint)}</Text>
              {searchFailure.canRetry ? (
                <V2Cta onPress={() => { setError(null); setRetryTick((tick) => tick + 1); }}>
                  {arenaText(lang, 'retry')}
                </V2Cta>
              ) : null}
            </View>
          ) : null}
          {assignedFailure ? (
            <View style={styles.failure}>
              <Text accessibilityLiveRegion="polite" style={[styles.failureTitle, { color: P.text }]}>
                {arenaText(lang, assignedFailure.title)}
              </Text>
              <Text style={[styles.failureHint, failureHintLine, { color: P.muted }]}>{arenaText(lang, assignedFailure.hint)}</Text>
              {assignedFailure.canRetry ? (
                <V2Cta onPress={() => { setEntryFailure(null); setEntryRetryTick((tick) => tick + 1); }}>
                  {arenaText(lang, 'retry')}
                </V2Cta>
              ) : null}
              {entryFailure === 'no_opponent' ? (
                <V2Cta onPress={recoverNoOpponent}>{arenaText(lang, 'switchToQuick')}</V2Cta>
              ) : null}
              <V2Cta tone="ghost" onPress={() => router.replace('/arena' as never)}>{arenaText(lang, 'home')}</V2Cta>
            </View>
          ) : null}
        </V2Card>
      </View>
      <V2Cta tone="ghost" disabled={Boolean(matchId)} onPress={cancel}>{arenaText(lang, 'cancel')}</V2Cta>
    </ArenaScreen>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: 'center' },
  card: { minHeight: 230, justifyContent: 'center', alignItems: 'center', gap: 14 },
  searching: { fontSize: 22, fontWeight: '900', textAlign: 'center' },
  // Моноширинные цифры: без них ширина строки скачет на каждой секунде и
  // таймер дёргается — ровно та мелочь, из-за которой ожидание раздражает.
  elapsed: { fontSize: 30, fontWeight: '800', textAlign: 'center', fontVariant: ['tabular-nums'], letterSpacing: 0.5 },
  hint: { fontSize: 14, fontWeight: '600', textAlign: 'center' },
  error: { fontSize: 13, fontWeight: '700', textAlign: 'center' },
  failure: { gap: 6, alignSelf: 'stretch' },
  failureTitle: { fontSize: 17, fontWeight: '900', textAlign: 'center' },
  failureHint: { fontSize: 13, fontWeight: '600', textAlign: 'center' },
  offer: { width: '100%', gap: 10, marginTop: 4 },
  offerTitle: { fontSize: 16, fontWeight: '800', textAlign: 'center' },
});
