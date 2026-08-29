import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { BackHandler, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useLang } from '../components/LangContext';
import { ArenaScreen } from '../components/arena/ArenaScreen';
import { ArenaSearchPulse } from '../components/arena/ArenaSearchPulse';
import { V2Card, V2Cta } from '../components/ui/v2_ui';
import { useTournamentPalette } from '../components/ui/v2_theme';
import { arenaText } from '../modules/arena/copy';
import { arenaEntryFailure } from '../modules/arena/duel_plan';
import { ARENA_QUICK_BOT_ANSWER_GRACE_MS, ARENA_QUICK_FALLBACK_MAX_MS, ARENA_QUICK_SEARCH_GIVE_UP_MS, ARENA_RANKED_HEARTBEAT_MS, type ArenaQueueMode } from '../modules/arena/contract';
import { useRuntimeActive } from '../hooks/use_runtime_active';
import { useVisibleWallClock } from '../hooks/use_visible_wall_clock';
import { arenaReplacementBotDelayMs } from '../modules/arena/matchmaking_state';
import { useArenaSound } from '../hooks/use_arena_sound';
import {
  arenaV2FindMatch,
  arenaV2QueueCancel,
  arenaV2QuickBotFallback,
  arenaV2ReleaseStaleMatch,
  createArenaRequestId,
  useArenaQueue,
} from './arena_client';
import { arenaEntryPrefetchStart } from './arena_entry_prefetch';
import { DebugLogger } from './debug-logger';
import { useEnergy, useEnergySessionIntent } from '../components/EnergyContext';
import NoEnergyModal from '../components/NoEnergyModal';

const quickFallbackRequests = new Set<string>();

/**
 * Ожидание готовности энергии на входе в поиск (владелец 2026-08-28).
 *
 * На холодном старте профиль восстанавливается дольше, чем открывается экран,
 * и списание отвечает `'cancelled'` не потому, что энергии нет, а потому что
 * она ещё не поднялась. Пятнадцать секунд с шагом в секунду перекрывают
 * обычное восстановление; дальше экран просто ждёт человека, а не выбрасывает.
 */
const ENERGY_READY_RETRY_MS = 1_000;
const ENERGY_READY_RETRIES = 15;

/**
 * Ноль секундомера до старта поиска. Формат и ширина совпадают с рабочим
 * `elapsedLabel` (tabular-nums + одинаковое число знаков), поэтому переход
 * «оплата прошла → поиск пошёл» не двигает геометрию карточки ни на пиксель.
 */
const ZERO_ELAPSED_LABEL = '0:00';

/**
 * Сколько раз пробуем снять замок незакрытого матча, прежде чем честно
 * закончить поиск (владелец 2026-08-29, лог 11:11-11:12: бесконечный цикл
 * «отбой → снятие → NOT FOUND» держал пульс минутами, а очередь так и не
 * создавалась).
 */
const LOCK_RELEASE_MAX_ATTEMPTS = 2;

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
  const params = useLocalSearchParams<{ mode?: string; requestId?: string; stableUid?: string; resumeQueue?: string }>();
  const mode: ArenaQueueMode = params.mode === 'ranked' ? 'ranked' : 'quick';
  const resumesPaidQueue = params.resumeQueue === '1';
  const active = useRuntimeActive();
  const now = useVisibleWallClock(active, 1_000);
  const explicitRequestId = typeof params.requestId === 'string' && params.requestId
    ? params.requestId
    : null;
  const requestIdKey = explicitRequestId ? `explicit:${explicitRequestId}` : `implicit:${mode}`;
  const requestIdRef = useRef<{ key: string; value: string } | null>(null);
  if (requestIdRef.current?.key !== requestIdKey) {
    requestIdRef.current = {
      key: requestIdKey,
      value: explicitRequestId ?? implicitQueueRequestId(mode),
    };
  }
  const requestId = requestIdRef.current.value;
  const arenaMatchEnergyIntent = useEnergySessionIntent('arena_matchmaking', mode, requestId);
  const queueAttemptStartedAtMsRef = useRef(Date.now());
  /**
   * Номер попытки поиска. Читается страховкой «соперник не нашёлся»: после
   * возобновления поиска (сорванное назначение) отсчёт 20 секунд обязан
   * начаться заново, а requestIdKey при этом не меняется.
   */
  const [requestRevision, setRequestRevision] = useState(0);
  const [stableUid, setStableUid] = useState<string | null>(typeof params.stableUid === 'string' ? params.stableUid : null);
  const [matchId, setMatchId] = useState<string | null>(null);
  const [entryRetryTick, setEntryRetryTick] = useState(0);
  /** Момент входа бота назначает сервер. Клиент только ждёт до него.
   *  Считаем от локального старта очереди, чтобы расхождение часов не сдвигало срок. */
  const [botDelayMs, setBotDelayMs] = useState<number | null>(null);
  /**
   * Локальный момент, когда сервер ПОДТВЕРДИЛ постановку в очередь.
   *
   * зачем (владелец 2026-08-29, «идёт поиск, а через 30-40 секунд обрывает и
   * возвращает назад»): сроки клиента и сервера считались от РАЗНЫХ нулей.
   * Клиент отсчитывал и окно бота, и сдачу поиска от момента оплаты энергии,
   * а сервер — от собственного joinedAtMs, то есть от создания билета кругом
   * сети позже. На холодном старте и моргнувшей сети разрыв доходил до
   * секунд: сервер ещё отбивал бота как `arena_quick_bot_too_early`, а клиент
   * уже сдавал поиск и уходил на хаб. Теперь обе даты растут от одного нуля —
   * подтверждения очереди; до подтверждения ждём, а не сдаёмся.
   *
   * ПОЧЕМУ ref, А НЕ useState (владелец 2026-08-29, «поиск зависает на 3
   * секунды и дальше не идёт»): первая же сверка отвечает через 1-3 секунды.
   * Состояние в зависимостях эффекта бота заставляло эффект пересоздаться, и
   * его cleanup УБИВАЛ уже запущенный таймер бота — новых триггеров не было,
   * поиск замирал навсегда. Момент подтверждения обязан жить вне графа
   * зависимостей: его читают при постановке таймеров, но менять их он не смеет.
   * Отдельный тик ниже будит ТОЛЬКО сдачу поиска, ничего больше не трогая.
   */
  const queueConfirmedAtMsRef = useRef<number | null>(null);
  /** Подлинный серверный срок бота (без клиентского потолка) — сдача его ждёт. */
  const serverBotDueDelayMsRef = useRef<number | null>(null);
  /** Запрос бота прямо сейчас в полёте: рубить поиск под ним нельзя. */
  const botRequestInFlightRef = useRef(false);
  /** Одноразовый тик: сообщает эффекту сдачи, что ноль отсчёта наконец известен. */
  const [queueConfirmedTick, setQueueConfirmedTick] = useState(0);
  /** Ближайший момент автоматического повтора запроса бота. */
  const [botRetryAtMs, setBotRetryAtMs] = useState<number | null>(null);
  /** После сорванного назначения следующий бот не приходит раньше ~минуты. */
  const [replacementBotNotBeforeAtMs, setReplacementBotNotBeforeAtMs] = useState<number | null>(null);
  /** Продление 45-секундной серверной аренды для бота, назначенного позднее. */
  const [leaseRefreshTick, setLeaseRefreshTick] = useState(0);
  // Старт поиска матча = 1 ⚡ (владелец 2026-08-23: единая экономика — платим за
  // ПОПЫТКУ). Гейт стоит ДО подписки на очередь (energyGate ниже), чтобы при
  // отказе человек вообще не попадал в очередь матчмейкинга на сервере.
  const {
    confirmSpendOne: confirmArenaMatchEnergy,
    refundOne: refundArenaMatchEnergy,
    acknowledgeSessionStart,
  } = useEnergy();
  const [energyGate, setEnergyGate] = useState<'checking' | 'ok' | 'denied'>('checking');
  /**
   * Замок незакрытого матча уже снят — можно повторять поиск.
   *
   * зачем (владелец 2026-08-29): показывать человеку «прошлый матч ещё не
   * доигран» — неправильно. Матч, который НЕ СОСТОЯЛСЯ, обязан закрываться
   * сам и сразу, а не превращаться в заглушку поперёк Арены. Клиент просит
   * сервер снять замок и молча продолжает искать.
   */
  const [lockReleaseTick, setLockReleaseTick] = useState(0);
  /** Замок снимаем один раз за попытку: без этого повтор уходил бы в петлю. */
  const lockReleaseRequestedRef = useRef(false);
  /** Сколько раз снятие замка провалилось: предел спасает от вечного поиска. */
  const lockReleaseAttemptsRef = useRef(0);
  /**
   * Ссылка на выход из поиска: сам обработчик объявлен ниже (ему нужны кэшбэк
   * энергии и роутер), а нужен он выше — в сверке очереди. Ref разрывает этот
   * порядок, не создавая цикла зависимостей между эффектами.
   */
  const leaveSearchRef = useRef<((reason: string) => void) | null>(null);
  /** Плата за вход в очередь состоялась — при отмене поиска её возвращаем. */
  const energyChargedRef = useRef(false);
  /** Выход из поиска уже начат: защита от двойного тапа и двойного возврата. */
  const cancellingRef = useRef(false);
  const queue = useArenaQueue(stableUid, active && !matchId && energyGate === 'ok');
  const playSound = useArenaSound();

  useEffect(() => {
    if (resumesPaidQueue) { setEnergyGate('ok'); return; }
    let cancelled = false;
    let retryTimer: ReturnType<typeof setTimeout> | null = null;
    /**
     * зачем (владелец 2026-08-28, «Арена сразу закрывается, а энергия ЕСТЬ»):
     * `'cancelled'` от списания НЕ означает отказ пользователя и НЕ означает
     * нехватку энергии. Он приходит и тогда, когда энергия ещё не поднялась —
     * загрузка молча выходит, пока поколение аккаунта не стало `active`
     * (`account_generation.ts:133`), а на холодном старте это норма: профиль
     * восстанавливается дольше, чем открывается экран.
     *
     * Раньше экран на этот вердикт немедленно делал `router.replace('/arena')`
     * — человека выбрасывало из поиска, хотя энергия у него была. Теперь ждём
     * и повторяем: экран остаётся на месте, показывает обычный пульс поиска,
     * а списание догоняет, как только аккаунт активируется. Выброс убран
     * совсем — «не смогли списать» больше не равно «уходим с экрана».
     */
    const attempt = (attemptsLeft: number) => {
      void confirmArenaMatchEnergy(arenaMatchEnergyIntent).then((result) => {
        if (cancelled) return;
        if (result === 'cancelled') {
          // Даже исчерпав попытки, НЕ выбрасываем с экрана: человек сам решит
          // уйти кнопкой «Отмена». Молчаливый выброс выглядел как поломка.
          if (attemptsLeft <= 0) return;
          retryTimer = setTimeout(() => attempt(attemptsLeft - 1), ENERGY_READY_RETRY_MS);
          return;
        }
        // Помним факт оплаты: отмена поиска обязана вернуть единицу (см. cancel).
        if (result === 'spent') energyChargedRef.current = true;
        setEnergyGate(result === 'insufficient' ? 'denied' : 'ok');
      }).catch(() => {
        if (cancelled || attemptsLeft <= 0) return;
        retryTimer = setTimeout(() => attempt(attemptsLeft - 1), ENERGY_READY_RETRY_MS);
      });
    };
    attempt(ENERGY_READY_RETRIES);
    return () => {
      cancelled = true;
      if (retryTimer) clearTimeout(retryTimer);
    };
    // Ровно один расход на requestIdKey (смена requestId = новая попытка поиска).
  }, [arenaMatchEnergyIntent, confirmArenaMatchEnergy, requestIdKey, resumesPaidQueue]);

  useEffect(() => {
    if (energyGate !== 'ok') return;
    // Экран поиска открылся.
    playSound('searchStart');
    queueAttemptStartedAtMsRef.current = Date.now();
    queueConfirmedAtMsRef.current = null;
    lockReleaseRequestedRef.current = false;
    serverBotDueDelayMsRef.current = null;
    botRequestInFlightRef.current = false;
    setBotDelayMs(null);
    setBotRetryAtMs(null);
    setReplacementBotNotBeforeAtMs(null);
    setLeaseRefreshTick(0);
  }, [playSound, requestIdKey, energyGate]);

  // `null` принимается наравне с `undefined`: подписка на очередь отдаёт
  // именно null, пока билета ещё нет, и без этого проверка типов краснела.
  const adoptBotSchedule = useCallback((ticket?: { joinedAtMs?: number; botDueAtMs?: number } | null) => {
    const due = Number(ticket?.botDueAtMs);
    const joined = Number(ticket?.joinedAtMs);
    if (!Number.isFinite(due) || !Number.isFinite(joined)) return;
    /**
     * зачем (владелец 2026-08-29, лог 10:54): сервер назначил бота на 24.9 с,
     * а клиент режет ожидание своим потолком в 20 с и просит бота раньше
     * срока — сервер отбивает `arena_quick_bot_too_early`, повтор приходит на
     * 26-й секунде и совпадает со сдачей поиска. Потолок оставляем (он спасает
     * от старых билетов с 45-секундным сроком), но ПОДЛИННЫЙ серверный срок
     * запоминаем отдельно: сдача обязана его дождаться, иначе мы бросаем
     * поиск ровно в тот момент, когда соперник уже назначен.
     */
    serverBotDueDelayMsRef.current = Math.max(0, due - joined);
    setBotDelayMs(Math.max(0, Math.min(ARENA_QUICK_FALLBACK_MAX_MS, due - joined)));
  }, []);

  useEffect(() => {
    if (!active || matchId) return;
    let cancelled = false;
    const reconcile = () => arenaV2FindMatch(mode, requestId).then((result) => {
      if (cancelled) return;
      if (energyChargedRef.current) void acknowledgeSessionStart(arenaMatchEnergyIntent.operationId);
      setStableUid(result.stableUid);
      // Сервер ответил — билет в очереди существует. С этого мгновения растут
      // и окно бота, и предел ожидания (см. queueConfirmedAtMsRef).
      if (queueConfirmedAtMsRef.current === null) {
        queueConfirmedAtMsRef.current = Date.now();
        DebugLogger.info('arena_matchmaking', `queue confirmed mode=${mode} after=${
          Date.now() - queueAttemptStartedAtMsRef.current}ms botDue=${
          Number(result.queue?.botDueAtMs) - Number(result.queue?.joinedAtMs)}ms`);
        // Будим ТОЛЬКО эффект сдачи поиска. Таймер бота при этом не трогаем:
        // именно его пересоздание и убивало поиск на третьей секунде.
        setQueueConfirmedTick((tick) => tick + 1);
      }
      adoptBotSchedule(result.queue);
      if (result.matchId) {
        // Соперник найден — звук ровно один раз, до перехода на матч.
        playSound('opponentFound');
        setMatchId(result.matchId);
      }
    }).catch((reason) => {
      // Никакой отдельной ошибки на поверхности: heartbeat продолжает ту же
      // серверную очередь с тем же идемпотентным requestId. Но в лог пишем —
      // молчащая сверка была невидима и её приходилось угадывать.
      DebugLogger.warn('arena_matchmaking', `findMatch failed mode=${mode}: ${String(reason)}`);
      /**
       * Единственный отказ, который сам не рассосётся: очередь не будет создана
       * НИКОГДА, пока за профилем числится незакрытый матч.
       *
       * зачем (владелец 2026-08-29): человеку тут показывать нечего — он не
       * бросал матч, тот просто не состоялся. Молча просим сервер снять замок
       * и продолжаем искать; заглушка «прошлый матч ещё не доигран» убрана.
       */
      if (!cancelled && String(reason).includes('arena_active_match_exists')
        && !lockReleaseRequestedRef.current) {
        lockReleaseRequestedRef.current = true;
        DebugLogger.warn('arena_matchmaking', 'active match lock detected — releasing');
        void arenaV2ReleaseStaleMatch().then((released) => {
          DebugLogger.info('arena_matchmaking',
            `stale match released=${released.released} matchId=${released.matchId ?? 'none'}`);
          if (cancelled) return;
          if (released.released) {
            lockReleaseAttemptsRef.current = 0;
            setLockReleaseTick((tick) => tick + 1);
            return;
          }
          /**
           * Сервер отказался снимать замок — значит матч ЖИВОЙ и человеку надо
           * в него вернуться, а не искать новый. Поиск здесь бесполезен.
           */
          DebugLogger.warn('arena_matchmaking', 'lock held by a live match — leaving search');
          leaveSearchRef.current?.('active_match_live');
        }).catch((error) => {
          /**
           * зачем (владелец 2026-08-29, «поиск идёт уже больше минуты»): в логе
           * 11:11-11:12 клиент КАЖДЫЕ 15 секунд получал `NOT FOUND` (функция
           * тогда не была задеплоена), снимал замок попытки и пробовал снова —
           * бесконечно. Поиск при этом не шёл вовсе: очередь не создавалась.
           * Даём ровно две попытки, дальше честно заканчиваем поиск и
           * возвращаем энергию, вместо вечного пульса на экране.
           */
          lockReleaseAttemptsRef.current += 1;
          DebugLogger.warn('arena_matchmaking',
            `stale match release failed (attempt ${lockReleaseAttemptsRef.current}): ${String(error)}`);
          if (cancelled) return;
          if (lockReleaseAttemptsRef.current >= LOCK_RELEASE_MAX_ATTEMPTS) {
            leaveSearchRef.current?.('active_match_lock_stuck');
            return;
          }
          lockReleaseRequestedRef.current = false;
        });
      }
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
  }, [acknowledgeSessionStart, active, adoptBotSchedule, arenaMatchEnergyIntent, leaseRefreshTick,
    lockReleaseTick, matchId, mode, playSound, requestId]);

  useEffect(() => {
    if (!active || matchId || mode !== 'quick' || botDelayMs === null) return undefined;
    // botDueAtMs может быть через 55 с, а lease очереди живёт 45 с. Один
    // FindMatch с тем же requestId перед концом аренды сохраняет joinedAtMs и
    // назначенный сервером botDueAtMs, только продлевая существующий билет.
    const refreshAtMs = (queueConfirmedAtMsRef.current ?? queueAttemptStartedAtMsRef.current)
      + Math.min(botDelayMs, 40_000);
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
    // botDelayMs — это (botDueAtMs - joinedAtMs) СЕРВЕРА, поэтому и отсчитывать
    // его надо от подтверждения очереди, а не от оплаты энергии: иначе клиент
    // просил бота раньше срока и получал arena_quick_bot_too_early.
    /**
     * зачем (лог 10:54:13 → `arena_quick_bot_too_early`): клиент урезал срок
     * своим 20-секундным потолком и стучался к серверу раньше назначенного им
     * момента. Отказ стоил повтора и увёл ответ за черту сдачи. Просим бота не
     * раньше ПОДЛИННОГО серверного срока; потолок остаётся страховкой от
     * старых билетов (там он меньше серверного и ничего не ломает).
     */
    const dueDelayMs = Math.max(botDelayMs, serverBotDueDelayMsRef.current ?? 0);
    const fireAtMs = Math.max(
      (queueConfirmedAtMsRef.current ?? queueAttemptStartedAtMsRef.current) + dueDelayMs,
      botRetryAtMs ?? 0,
      replacementBotNotBeforeAtMs ?? 0,
    );
    const timer = setTimeout(() => {
      quickFallbackRequests.add(requestId);
      // зачем: пометка снималась только в catch. Если вызов зависал (сеть
      // моргнула при возврате из фона) и экран перемонтировался, проверка
      // выше блокировала повтор НАВСЕГДА — бот не приходил вовсе, а человек
      // смотрел на вечный поиск. Страховка снимает пометку, если ответа нет:
      // повторный вызов сервер отобьёт как дубликат, а вот молчание не
      // лечится ничем. Владелец 2026-08-27: окно было 10 с + 2 с на повтор —
      // одна молчащая попытка съедала больше половины обещанных 20 секунд.
      const unstick = setTimeout(() => {
        botRequestInFlightRef.current = false;
        quickFallbackRequests.delete(requestId);
        if (!cancelled) setBotRetryAtMs(Date.now() + 1_000);
      }, 4_000);
      botRequestInFlightRef.current = true;
      DebugLogger.info('arena_matchmaking', `bot fallback requested after=${
        Date.now() - (queueConfirmedAtMsRef.current ?? queueAttemptStartedAtMsRef.current)}ms`);
      void arenaV2QuickBotFallback(requestId).then((result) => {
        clearTimeout(unstick);
        botRequestInFlightRef.current = false;
        DebugLogger.info('arena_matchmaking', `bot fallback matched match=${result.matchId}`);
        if (!cancelled) setMatchId(result.matchId);
      }).catch((reason) => {
        botRequestInFlightRef.current = false;
        DebugLogger.warn('arena_matchmaking', `bot fallback rejected: ${String(reason)}`);
        // Сервер — единственный владелец момента входа бота. Если наши локальные
        // часы забежали вперёд, он отвечает arena_quick_bot_too_early: снимаем
        // блокировку и пробуем ещё раз чуть позже, а не бросаем поиск навсегда.
        clearTimeout(unstick);
        quickFallbackRequests.delete(requestId);
        if (cancelled) return;
        // зачем: пауза 5 с на отказ выбрасывала поиск далеко за 20 секунд.
        // Отказы здесь почти всегда временные (часы забежали, сеть моргнула),
        // и повтор стоит один вызов — держим его коротким.
        setBotRetryAtMs(Date.now()
          + (String(reason).includes('arena_quick_bot_too_early') ? 1_500 : 2_000));
      });
    }, Math.max(0, fireAtMs - Date.now()));
    return () => { cancelled = true; clearTimeout(timer); };
  }, [active, botDelayMs, botRetryAtMs, leaseRefreshTick, matchId, mode,
    replacementBotNotBeforeAtMs, requestId]);

  useEffect(() => {
    // Кэш Firestore может на один кадр вернуть matched-билет предыдущего
    // поиска. Переходить можно только по билету с НАШИМ requestId, иначе новый
    // поиск открывает старый уже завершённый матч и затем сам себя отменяет.
    const next = queue.value?.requestId === requestId && queue.value.status === 'matched'
      ? queue.value.matchId
      : null;
    if (next) setMatchId(next);
  }, [queue.value, requestId]);

  const resumeSearchAfterAssignedMatch = useCallback(() => {
    quickFallbackRequests.delete(requestId);
    // зачем: без сброса замок отмены остался бы взведённым, и ни кнопка
    // «Отмена», ни страховка возврата больше не сработали бы за эту сессию.
    cancellingRef.current = false;
    const restartedAtMs = Date.now();
    requestIdRef.current = { key: requestIdKey, value: createArenaRequestId('queue') };
    queueAttemptStartedAtMsRef.current = restartedAtMs;
    queueConfirmedAtMsRef.current = null;
    lockReleaseRequestedRef.current = false;
    serverBotDueDelayMsRef.current = null;
    botRequestInFlightRef.current = false;
    setBotDelayMs(null);
    setBotRetryAtMs(null);
    setReplacementBotNotBeforeAtMs(mode === 'quick'
      ? restartedAtMs + arenaReplacementBotDelayMs(Math.random())
      : null);
    setMatchId(null);
    setRequestRevision((revision) => revision + 1);
  }, [mode, requestId, requestIdKey]);

  useEffect(() => {
    if (!active || !matchId) return;
    quickFallbackRequests.delete(requestId);
    releaseImplicitQueueRequestId(mode, requestId);
    let alive = true;
    let retryTimer: ReturnType<typeof setTimeout> | null = null;
    void arenaEntryPrefetchStart(matchId).then(() => {
      if (!alive) return;
      router.replace({ pathname: '/arena_match', params: { matchId, prepared: '1' } } as never);
    }).catch((reason) => {
      if (!alive) return;
      const failure = arenaEntryFailure(reason);
      if (failure === 'offline' || failure === 'transient' || failure === 'gated') {
        retryTimer = setTimeout(() => setEntryRetryTick((tick) => tick + 1),
          failure === 'gated' ? 15_000 : 2_000);
        return;
      }
      resumeSearchAfterAssignedMatch();
    });
    return () => {
      alive = false;
      if (retryTimer) clearTimeout(retryTimer);
    };
  }, [active, entryRetryTick, matchId, mode, requestId, resumeSearchAfterAssignedMatch, router]);

  useEffect(() => {
    if (!active || !matchId) return undefined;
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => true);
    return () => subscription.remove();
  }, [active, matchId]);

  /**
   * Выход из поиска без матча — общий путь для кнопки «Отмена» и для исхода
   * «соперник не нашёлся». Уходим с экрана МГНОВЕННО, сеть догоняет фоном.
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
  /**
   * Возврат платы за так и не начавшийся поиск.
   *
   * зачем: точек, где поиск заканчивается без матча, стало две — уход с экрана
   * и блокировка незакрытым матчем. Возврат обязан быть один и тот же, и
   * ровно один раз (замок energyChargedRef), иначе энергия либо сгорает, либо
   * задваивается.
   */
  const refundUnstartedSearch = useCallback((reason: string) => {
    if (!energyChargedRef.current) return;
    energyChargedRef.current = false;
    void refundArenaMatchEnergy(arenaMatchEnergyIntent.operationId, reason).catch((error) => {
      DebugLogger.warn('arena_matchmaking', `refund failed reason=${reason}: ${String(error)}`);
    });
  }, [arenaMatchEnergyIntent, refundArenaMatchEnergy]);

  const leaveSearchWithRefund = useCallback((reason: string) => {
    if (matchId || cancellingRef.current) return; // защита от двойного тапа и отмены назначенного матча
    cancellingRef.current = true;
    quickFallbackRequests.delete(requestId);
    releaseImplicitQueueRequestId(mode, requestId);
    // зачем: человек ушёл из очереди, не сыграв — матча не было, значит и
    // платы быть не должно. Без возврата отмена поиска стоила 1 ⚡ впустую
    // (аудит 2026-08-23: единственная из четырёх точек Арены без возврата).
    // Владелец 2026-08-27 распространил это правило на ЛЮБОЙ исход без матча:
    // и на кнопку «Отмена», и на случай «соперник так и не нашёлся».
    refundUnstartedSearch(reason);
    router.replace('/arena' as never);
    /**
     * зачем (владелец 2026-08-29, «матчи должны закрываться сразу же после
     * того как матч не случился»): матч мог быть уже НАЗНАЧЕН на сервере, а до
     * клиента не дойти — ровно так и появился висящий матч, из-за которого
     * Арена перестала открываться. Уходя без игры, просим сервер закрыть его
     * немедленно; живую игру этот вызов не трогает, решает сервер.
     */
    void arenaV2ReleaseStaleMatch().then((released) => {
      if (released.released) {
        DebugLogger.info('arena_matchmaking',
          `closed never-started match=${released.matchId ?? 'none'} reason=${reason}`);
      }
    }).catch((error) => {
      DebugLogger.warn('arena_matchmaking', `release on leave failed: ${String(error)}`);
    });
    // Сеть — вдогонку. Один повтор: сеть на телефоне моргает чаще, чем падает.
    void arenaV2QueueCancel(requestId).catch(() => {
      setTimeout(() => { void arenaV2QueueCancel(requestId).catch(() => {}); }, 1500);
    });
  }, [matchId, mode, refundUnstartedSearch, requestId, router]);

  leaveSearchRef.current = leaveSearchWithRefund;

  const cancel = useCallback(() => {
    leaveSearchWithRefund('cancelled_before_entry');
  }, [leaveSearchWithRefund]);

  /**
   * Страховка исхода «соперник не нашёлся».
   *
   * зачем (владелец 2026-08-27): поиск был устроен как бесконечный, и когда
   * назначение бота срывалось, человек смотрел на пульс минутами («по-моему
   * поиск сломан») — при этом 1 ⚡ уже была списана. Обещание теперь жёсткое:
   * соперник приходит в первые 20 секунд, а если не пришёл даже с запасом на
   * сеть — поиск честно заканчивается и энергия возвращается, а не сгорает.
   *
   * Запас поверх обещанных 20 с оставлен на один короткий повтор запроса
   * бота; таймер живёт только на видимом экране (active), фонового счёта нет.
   */
  useEffect(() => {
    if (!active || matchId || energyGate !== 'ok' || mode !== 'quick') return undefined;
    /**
     * зачем (владелец 2026-08-29): пока сервер не подтвердил очередь, обещание
     * «соперник за 20 секунд» ещё не начало действовать — отсчитывать сдачу
     * не от чего. Раньше он шёл от оплаты энергии, и медленный круг сети
     * съедал окно бота: поиск обрывался сам, не дождавшись назначенного
     * сервером момента. Ждём подтверждения; человек всё это время видит
     * обычный пульс и в любой момент волен уйти кнопкой «Отмена».
     */
    if (queueConfirmedAtMsRef.current === null) return undefined;
    /**
     * зачем (владелец 2026-08-29, лог 10:54:26 «бот найден и в ту же секунду
     * сдача»): срок сдачи обязан быть ПОЗЖЕ серверного срока бота, а не рядом
     * с ним. Сервер назначил бота на 24.9 с, ответ пришёл на 26-й секунде —
     * ровно в момент сдачи, и человека выбросило на хаб с уже созданным
     * матчем. Считаем от подлинного серверного срока плюс запас на один
     * повтор; клиентский потолок остаётся страховкой для старых билетов.
     */
    const serverDue = serverBotDueDelayMsRef.current;
    const giveUpDelayMs = Math.max(
      ARENA_QUICK_SEARCH_GIVE_UP_MS,
      (serverDue ?? 0) + ARENA_QUICK_BOT_ANSWER_GRACE_MS,
    );
    const giveUpAtMs = queueConfirmedAtMsRef.current + giveUpDelayMs;
    const armAt = (whenMs: number) => setTimeout(() => {
      /**
       * Ответ бота уже в пути — рубить поиск под ним нельзя: именно так матч
       * создавался на сервере, а человек уходил на хаб. Ждём ответа и решаем
       * после него.
       */
      if (botRequestInFlightRef.current) {
        DebugLogger.warn('arena_matchmaking',
          'give up postponed: bot request in flight');
        timerRef.current = armAt(1_500);
        return;
      }
      DebugLogger.warn('arena_matchmaking', `give up: no opponent in ${
        giveUpDelayMs}ms since queue confirmed (serverBotDue=${serverDue ?? 'unknown'})`);
      leaveSearchWithRefund('opponent_not_found');
    }, Math.max(0, whenMs));
    const timerRef: { current: ReturnType<typeof setTimeout> } = {
      current: armAt(giveUpAtMs - Date.now()),
    };
    return () => clearTimeout(timerRef.current);
  }, [active, energyGate, leaveSearchWithRefund, matchId, mode, queueConfirmedTick,
    requestIdKey, requestRevision]);

  const searching = energyGate === 'ok';
  const elapsedLabel = useMemo(() => {
    // зачем: до оплаты поиск ещё не начался, поэтому секундомер честно стоит на
    // нуле, а не показывает время, набежавшее с монтирования экрана. Формат тот
    // же, ширина та же (tabular-nums) — переход «оплата прошла» не двигает вёрстку.
    if (!searching) return ZERO_ELAPSED_LABEL;
    const seconds = Math.max(0, Math.floor((now - queueAttemptStartedAtMsRef.current) / 1_000));
    return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
  }, [now, searching]);

  if (energyGate === 'denied') {
    return (
      <ArenaScreen title={arenaText(lang, 'searching')} variant="lobby" scroll={false} onBack={cancel}>
        <NoEnergyModal
          visible
          onClose={() => { releaseImplicitQueueRequestId(mode, requestId); router.replace('/arena' as never); }}
        />
      </ArenaScreen>
    );
  }

  /**
   * зачем: пока шло списание 1 ⚡ за вход, экран отдавал пустой <View /> —
   * ни пульса, ни таймера, ни работающего «назад». Списание умеет ретраиться
   * без верхней границы (commitSessionEnergy), поэтому моргнувшая сеть
   * превращала это в «анимация пропала и перестало искать»: подписка на
   * очередь тоже ждёт energyGate === 'ok'. Владелец 2026-08-27.
   *
   * Поверхность теперь ОДНА на оба состояния: та же карточка, тот же пульс,
   * тот же таймер. Меняется только то, что во время оплаты секундомер ещё не
   * идёт (он честно на нуле — поиск не начался), а выход доступен всегда.
   * Прежний страх «пульс мигнёт на кадр при нехватке энергии» снят иначе:
   * ветка 'denied' возвращается ВЫШЕ и рисует свой экран, сюда не доходя.
   */
  return (
    <ArenaScreen title={arenaText(lang, 'searching')} variant="lobby" scroll={false} onBack={cancel} backDisabled={Boolean(matchId)}>
      <View style={styles.center}>
        <V2Card style={styles.card}>
          {/* зачем: системный спиннер одинаков во всех приложениях мира и на
              длинном ожидании начинает раздражать — у вращения нет ни начала,
              ни конца. Волна по сетке живёт циклами, глаз отдыхает на паузе.
              Владелец выбрал этот вариант из пяти (2026-08-16). */}
          <ArenaSearchPulse />
          <Text
            testID="arena-search-elapsed"
            style={[styles.elapsed, { color: P.text }]}
          >
            {elapsedLabel}</Text>
        </V2Card>
      </View>
      <V2Cta tone="ghost" disabled={Boolean(matchId)} onPress={cancel}>{arenaText(lang, 'cancel')}</V2Cta>
    </ArenaScreen>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: 'center' },
  card: { minHeight: 230, justifyContent: 'center', alignItems: 'center', gap: 14 },
  elapsed: {
    fontSize: 30,
    fontWeight: '800',
    textAlign: 'center',
    fontVariant: ['tabular-nums'],
    letterSpacing: 0.5,
  },
});
