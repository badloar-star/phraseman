// ═══════════════════════════════════════════════════════════════════════════
// tournament_client.ts — связь экранов турнира с сервером.
//
// зачем: экраны не должны знать про Firestore. Здесь один слушатель на ОДИН
// документ комнаты и тонкие обёртки над callable-функциями.
//
// ЭКОНОМИЯ FIRESTORE (правило владельца и §11 спеки): клиент слушает ровно
// один документ tournamentRooms/{roomId} — не коллекцию, не подколлекции.
// Расписание читается снимком раз в N часов и кэшируется, а не слушается:
// оно меняется раз в недели, держать на нём live-подписку — деньги на ветер.
// ═══════════════════════════════════════════════════════════════════════════

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

/** Публичное задание: ключи ответов сервер вырезает до отправки клиенту. */
export type PublicTask = {
  taskId: string;
  mode: string;
  // зачем 2026-07-27: аудио-режимы владельца. listen = услышал → выбрал,
  // dictate = диктант. Имена совпадают с серверным taskKind буква в букву.
  kind: 'choice' | 'translate' | 'timeattack' | 'voice' | 'listen' | 'dictate' | 'match';
  isVoice: boolean;
  difficulty: number;
  payload: Record<string, unknown>;
  /** Room-salted hashes enable immediate UI feedback without exposing answer keys. */
  answerFingerprints?: string[];
};

export type RoomPlayer = {
  id: string;
  isBot?: boolean;
  name: string;
  avatar: string;
  color: string;
  score: number;
  streak: number;
  /**
   * Когда игрок появляется в лобби (часы сервера).
   *
   * зачем 2026-07-27 (владелец: «не должно быть ощущения фальши»): боты
   * дописываются в комнату одной транзакцией, но каждый несёт своё время
   * входа. Лобби показывает игрока только когда это время наступило —
   * места занимаются постепенно, а не мгновенной стеной из 16 аватаров.
   * Поле есть и у живых, поэтому по нему нельзя отличить бота от человека.
   */
  joinAtMs?: number;
};

export type RoomRound = {
  roundNo: number;
  mode: string;
  tasks?: PublicTask[];
  results: Record<string, { roundScore: number; correct: number; total: number }>;
};

export type RoomState =
  // зачем 2026-07-27: сервер (TOURNAMENT_STATES) нумерует фазы — round1..round4
  // и table1..table3. Клиент сравнивал с 'round'/'table', совпадения не было
  // НИКОГДА: лобби не уводило в раунд, таймер честно доходил до 00:00 и всё
  // замирало. Имена обязаны совпадать с сервером буква в букву.
  | 'scheduled' | 'lobby'
  | 'round1' | 'table1' | 'round2' | 'table2' | 'round3' | 'table3' | 'round4'
  | 'final'
  | 'results' | 'rewards' | 'closed' | 'cancelled';

export type Room = {
  roomId: string;
  slotId: string;
  state: RoomState;
  startsAt: number;
  players: RoomPlayer[];
  rounds: RoomRound[];
  stateDeadlineAtMs?: number;
  cancelReason?: string;
  /**
   * Реальная экономика турнира — приходит с сервера при финализации.
   *
   * зачем 2026-07-27 (владелец: «сейчас там захардкоженные цифры, их надо
   * убрать»): экран результатов рисовал выдуманные «50/25/10 жемчужин», хотя
   * сервер платит долю фактического банка (при 16 игроках — 24/9/6).
   */
  /** Весь банк турнира: взносы всех участников. */
  potGems?: number;
  /** Сколько из банка ушло призёрам — цифра под подиумом. */
  prizePoolGems?: number;
  /** Фактические выплаты по местам: [1-е, 2-е, 3-е]. */
  prizeGems?: number[];
};

export type RoomStatus = 'idle' | 'loading' | 'ready' | 'offline' | 'error';

type RoomHook = {
  room: Room | null;
  status: RoomStatus;
  /** Секунд до конца текущего состояния — из серверного дедлайна, не локального. */
  secondsLeft: number;
  retry: () => void;
};

/** Кэш расписания: обновляем не чаще, чем раз в 6 часов. */
const SCHEDULE_TTL_MS = 6 * 60 * 60 * 1000;
let scheduleCache: { at: number; value: unknown } | null = null;

/**
 * Подписка на ОДИН документ комнаты.
 *
 * Сознательно не подписываемся, пока roomId не известен: пустая подписка —
 * это лишнее соединение и лишние чтения при каждом рендере экрана.
 *
 * зачем 2026-07-27 (владелец: «приложение греет телефон, всё подобное запрещено
 * строжайше»): комната переписывается сервером каждые 5–12 секунд, и КАЖДАЯ
 * запись будит JS-поток подписчика. Таб турниров премаунтится в фоне
 * (BACKGROUND_TAB_PREMOUNT_ORDER в app/(tabs)/_layout.tsx), поэтому подписка
 * открывалась у всех, кто просто запустил приложение и остался на главной.
 * react-freeze тут не помогает — он гасит рендеры, но не подписки.
 *
 * `active` — гвард видимости. По умолчанию true: push-экраны турнира (лобби,
 * раунд, таблица, результаты) лежат под корневым Stack с freezeOnBlur:true и
 * гейтятся навигацией, им гвард не нужен. Хаб-таб живёт внутри одного роутного
 * экрана со всеми табами, поэтому он ОБЯЗАН передать сюда свою настоящую
 * видимость (runtimeOwnerId === 'tournaments').
 *
 * Функционал не теряется: последняя пришедшая комната остаётся в state, экран
 * не мигает пустотой при возврате, а новая подписка поднимается мгновенно и
 * первым же снимком догоняет актуальное состояние.
 */
export function useTournamentRoom(roomId: string | null, active = true): RoomHook {
  const [room, setRoom] = useState<Room | null>(null);
  const [status, setStatus] = useState<RoomStatus>(roomId ? 'loading' : 'idle');
  const [attempt, setAttempt] = useState(0);
  const unsubscribeRef = useRef<null | (() => void)>(null);

  useEffect(() => {
    if (!roomId) {
      setStatus('idle');
      setRoom(null);
      return;
    }
    // Экран не виден — не держим сокет. Комнату в state НЕ чистим: при возврате
    // пользователь видит последние данные, а не скелетон (Performance Bible:
    // первый кадр = финальная геометрия).
    if (!active) return;

    let cancelled = false;
    setStatus('loading');

    // зачем: приложение использует @react-native-firebase (цепочечный API),
    // а не веб-SDK. Импорт внутри эффекта — модуль не попадает в стартовый
    // бандл, если пользователь до турниров не дошёл (холодный старт).
    void (async () => {
      try {
        const firestore = (await import('@react-native-firebase/firestore')).default;
        if (cancelled) return;

        unsubscribeRef.current = firestore()
          .collection('tournamentRooms')
          .doc(roomId)
          .onSnapshot(
            (snapshot: any) => {
              if (cancelled) return;
              if (!snapshot?.exists) {
                setRoom(null);
                setStatus('error');
                return;
              }
              setRoom(snapshot.data() as Room);
              setStatus('ready');
            },
            () => {
              if (cancelled) return;
              // Различаем «нет сети» и «нет доступа»: если данные уже
              // приходили, значит доступ есть и это обрыв связи.
              setStatus((previous) => (previous === 'ready' ? 'offline' : 'error'));
            },
          );
      } catch {
        if (!cancelled) setStatus('offline');
      }
    })();

    return () => {
      cancelled = true;
      unsubscribeRef.current?.();
      unsubscribeRef.current = null;
    };
  }, [roomId, attempt, active]);

  // Отсчёт ведём от СЕРВЕРНОГО дедлайна: локальные часы могут врать, и тогда
  // игрок увидит «0» раньше или позже реального перехода раунда.
  //
  // зачем гвард active: секундный тик на невидимом экране — это 60 пробуждений
  // JS-потока в минуту впустую. Считаем от дедлайна, а не накопительно, поэтому
  // после паузы первый же tick() выдаёт ПРАВИЛЬНОЕ число — счётчик не отстаёт.
  const [secondsLeft, setSecondsLeft] = useState(0);
  useEffect(() => {
    const deadline = room?.stateDeadlineAtMs;
    if (!deadline) {
      setSecondsLeft(0);
      return;
    }
    const tick = () => setSecondsLeft(Math.max(0, Math.round((deadline - Date.now()) / 1000)));
    tick();
    if (!active) return;
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [room?.stateDeadlineAtMs, active]);

  /**
   * Дедлайн истёк — просим сервер перевести комнату дальше.
   *
   * зачем 2026-07-27 (владелец: «раунды все перепрыгивают через друг друга»):
   * см. комментарий у advanceRound. Крон раз в минуту не успевает за фазами по
   * 5–12 секунд. Здесь — общий для всех экранов будильник, поэтому лобби,
   * раунд и таблица перестают залипать одинаково.
   *
   * Один вызов на фазу (ключ state+дедлайн) и случайная задержка до 400 мс:
   * иначе все 16 участников ударили бы в функцию в одну миллисекунду, а платим
   * мы за каждый вызов. Ошибку глотаем: waiting от сервера — норма (значит
   * чужие часы спешат), а крон всё равно подстрахует.
   */
  const nudgedRef = useRef<string | null>(null);
  useEffect(() => {
    const deadline = room?.stateDeadlineAtMs;
    const state = room?.state;
    if (!roomId || !deadline || !state) return;
    // FIREBASE-ЭКОНОМИЯ: невидимый экран не двигает турнир. Будильник нужен
    // ИГРОКАМ в комнате; зритель на другом табе платил бы за вызов функции,
    // ничего при этом не видя. Крон и активные участники подстрахуют.
    if (!active) return;
    if (!ADVANCEABLE_STATES.test(state)) return;
    if (secondsLeft > 0) return;

    const key = `${state}:${deadline}`;
    if (nudgedRef.current === key) return;
    nudgedRef.current = key;

    const id = setTimeout(() => {
      void advanceRound(roomId, state, deadline).catch(() => {});
    }, Math.floor(Math.random() * 400));
    return () => clearTimeout(id);
  }, [roomId, room?.state, room?.stateDeadlineAtMs, secondsLeft, active]);

  const retry = useCallback(() => setAttempt((value) => value + 1), []);

  return useMemo(() => ({ room, status, secondsLeft, retry }), [room, status, secondsLeft, retry]);
}

/** Состояния, которые сервер умеет двигать по дедлайну (см. tournamentAdvanceRound). */
const ADVANCEABLE_STATES = /^(round[1-4]|table[1-3]|final|results)$/;

// ── Реакции-эмодзи, которые видят все ───────────────────────────────────────

/** Прилетевшая реакция: кто отправил, что и когда. */
export type LiveReaction = {
  /** authUid отправителя — по нему отличаем свои реакции от чужих. */
  id: string;
  emoji: string;
  atMs: number;
  name: string;
};

/** Потолок подписки: в комнате 16 мест, больше документов быть не может. */
const TOURNAMENT_ROOM_SIZE_CAP = 16;

/** Реакция живёт на экране столько же, сколько летит вверх. */
export const REACTION_TTL_MS = 2600;
/** Кулдаун между своими реакциями: спам-защита и защита от лишних записей. */
export const REACTION_COOLDOWN_MS = 900;

/**
 * Общие реакции комнаты: отправка своей и поток чужих.
 *
 * зачем 2026-07-27 (владелец: «анимации эмодзи нет, как было задумано на
 * макетах — чтобы они отправлялись, улетали вверх и все их видели»): раньше
 * реакция была локальным setState, её не видел никто. Теперь это документ на
 * игрока в подколлекции комнаты.
 *
 * FIREBASE-ЭКОНОМИЯ: документ ОДИН на игрока и перезаписывается, а не пишется
 * новый на каждый тап — стоимость не растёт от частоты нажатий. Кулдаун
 * отсекает спам ещё до записи. Подписываемся только пока экран открыт, и
 * показываем лишь свежие реакции (старше TTL игнорируем): при входе в комнату
 * не сыплется история чужих тапов.
 */
export function useTournamentReactions(roomId: string | null) {
  const [incoming, setIncoming] = useState<LiveReaction[]>([]);
  const lastSentAtRef = useRef(0);
  const seenRef = useRef<Map<string, number>>(new Map());
  const mountedAtRef = useRef(Date.now());

  useEffect(() => {
    if (!roomId) return;
    let cancelled = false;
    let unsubscribe: null | (() => void) = null;
    mountedAtRef.current = Date.now();

    void (async () => {
      try {
        const firestore = (await import('@react-native-firebase/firestore')).default;
        if (cancelled) return;
        unsubscribe = firestore()
          .collection('tournamentRooms').doc(roomId).collection('reactions')
          // guard-ok: подколлекция ограничена размером комнаты (16 игроков =
          // максимум 16 документов, по одному на человека). limit всё равно
          // ставим явно — он защищает от разрастания, если состав вырастет.
          .limit(TOURNAMENT_ROOM_SIZE_CAP)
          .onSnapshot((snapshot: any) => {
            if (cancelled || !snapshot) return;
            const fresh: LiveReaction[] = [];
            const now = Date.now();
            snapshot.docChanges?.().forEach((change: any) => {
              if (change.type === 'removed') return;
              const data = change.doc.data() || {};
              const atMs = Number(data.atMs ?? 0);
              // Только свежие и только те, что мы ещё не показывали: иначе
              // при переподписке экран засыпало бы старыми реакциями.
              if (now - atMs > REACTION_TTL_MS) return;
              if (atMs < mountedAtRef.current) return;
              if (seenRef.current.get(change.doc.id) === atMs) return;
              seenRef.current.set(change.doc.id, atMs);
              fresh.push({
                id: String(change.doc.id),
                emoji: String(data.emoji ?? ''),
                atMs,
                name: String(data.name ?? ''),
              });
            });
            if (fresh.length > 0) setIncoming((prev) => [...prev, ...fresh].slice(-12));
          }, () => { /* нет доступа или сеть — реакции не критичны, молчим */ });
      } catch {
        // Модуль не загрузился — экран работает и без реакций.
      }
    })();

    return () => {
      cancelled = true;
      unsubscribe?.();
      seenRef.current.clear();
    };
  }, [roomId]);

  /** Реакция отыграна — убираем из очереди, чтобы список не рос. */
  const consume = useCallback((id: string, atMs: number) => {
    setIncoming((prev) => prev.filter((item) => !(item.id === id && item.atMs === atMs)));
  }, []);

  /**
   * Отправка своей реакции.
   * Optimistic: анимацию у себя экран рисует СРАЗУ по возврату true, не
   * дожидаясь записи. Ошибка записи не откатывает ничего — чужие просто не
   * увидят этот тап, а свой полёт уже честно показан.
   */
  const send = useCallback(async (emoji: string, name: string): Promise<boolean> => {
    if (!roomId) return false;
    const now = Date.now();
    if (now - lastSentAtRef.current < REACTION_COOLDOWN_MS) return false;
    lastSentAtRef.current = now;
    try {
      const [{ default: firestore }, { default: auth }] = await Promise.all([
        import('@react-native-firebase/firestore'),
        import('@react-native-firebase/auth'),
      ]);
      const uid = auth().currentUser?.uid;
      if (!uid) return true;
      await firestore()
        .collection('tournamentRooms').doc(roomId).collection('reactions').doc(uid)
        // guard-ok: документ реакции ПОЛНОСТЬЮ принадлежит одному игроку и
        // состоит ровно из трёх полей — новая реакция обязана заменить
        // предыдущую целиком. Терять нечего: ни баланса, ни прогресса здесь
        // нет, а merge оставил бы протухшие поля от прошлого тапа.
        // Гонки двух устройств тоже не страшны: побеждает последний тап, что
        // и есть желаемое поведение для реакции.
        .set({ emoji, atMs: now, name });
    } catch {
      // Молча: реакция — украшение, ронять из-за неё экран нельзя.
    }
    return true;
  }, [roomId]);

  return { incoming, send, consume };
}


/** Идёт раунд (любой из четырёх). Сервер: round1..round4. */
export function isRoundState(state?: string | null): boolean {
  return typeof state === 'string' && /^round[1-4]$/.test(state);
}

/** Показывается таблица между раундами. Сервер: table1..table3. */
export function isTableState(state?: string | null): boolean {
  return typeof state === 'string' && /^table[1-3]$/.test(state);
}

/** Номер раунда из состояния: round3 → 3. Вне раунда — 0. */
export function roundNoFromState(state?: string | null): number {
  const match = /^round([1-4])$/.exec(String(state ?? ''));
  return match ? Number(match[1]) : 0;
}

// ── Callable-обёртки ────────────────────────────────────────────────────────

const FUNCTIONS_REGION = 'us-central1';

async function callFunction<T>(
  name: string,
  payload: Record<string, unknown> = {},
  // зачем: дев-функция живёт в europe-west1 — квота CPU us-central1 исчерпана,
  // новые функции туда не деплоятся. Прод-callable остаются в us-central1.
  region: string = FUNCTIONS_REGION,
): Promise<T> {
  const { getApp } = await import('@react-native-firebase/app');
  const { getFunctions, httpsCallable } = await import('@react-native-firebase/functions');
  const call = httpsCallable(getFunctions(getApp(), region), name);
  const result = await call(payload);
  return result.data as T;
}

/**
 * Идентификатор комнаты собирается детерминированно из слота, таймзоны и даты
 * — той же формулой, что на сервере (tournament_core.tournamentRoomId).
 *
 * зачем: так клиент находит сегодняшнюю комнату БЕЗ запроса «а какая комната
 * сейчас?» — ноль лишних чтений на каждом открытии экрана. Формула обязана
 * совпадать с серверной, иначе игрок будет слушать несуществующий документ.
 */
export function tournamentRoomId(slotId: string, timezone: string, dateKey: string): string {
  return `${slotId}_${timezone.replace(/[^\w]/g, '_')}_${dateKey}`.slice(0, 140);
}

/** Дата YYYY-MM-DD в таймзоне слота — ключ сегодняшней комнаты. */
export function tournamentDateKey(timezone: string, at: Date = new Date()): string {
  try {
    // en-CA даёт формат YYYY-MM-DD без ручной сборки строки.
    return at.toLocaleDateString('en-CA', { timeZone: timezone });
  } catch {
    return at.toISOString().slice(0, 10);
  }
}

/**
 * Вход в турнир: списывает жемчужины и сажает игрока в комнату.
 *
 * зачем 2026-07-27: сервер может посадить игрока НЕ в ту комнату, id которой
 * прислал клиент — комната слота вмещает 16 человек, при заполнении вход
 * уходит в следующую комнату того же слота. Поэтому roomId из ответа — это
 * фактическая комната, и открывать надо именно её.
 */
export function joinTournament(roomId: string) {
  return callFunction<{ ok: boolean; roomId: string; entryGems?: number; gemsLeft?: number }>(
    'tournamentJoin',
    { roomId },
  );
}

/**
 * Дев-турнир (только владелец, admin claim): сервер мгновенно создаёт комнату
 * с ботами и возвращает roomId — вход доступен сразу, без ожидания слота.
 */
/** Разбор моих ответов после турнира: что выбрал, что было верно. */
export type ReviewItem = {
  roundNo: number;
  taskId: string;
  mode: string;
  correct: boolean;
  given: unknown;
  phrase: string;
  options: string[];
  correctIndex: number | null;
  correctTokens: string[];
  audioUri: string;
  explanation: { ruleNote: string; example: string } | null;
};

/**
 * зачем: владелец — «после турнира можно смотреть свои ответы, ошибки и
 * правильные варианты». Сервер отдаёт их только когда турнир окончен и
 * только свои: во время игры это была бы подсказка.
 */
export function loadRoundReview(roomId: string) {
  return callFunction<{ ok: boolean; items: ReviewItem[] }>('tournamentRoundReview', { roomId });
}

/**
 * Турнир по требованию: сервер мгновенно собирает ОБЫЧНУЮ комнату и сразу
 * сажает в неё игрока — вход доступен в любое время, без ожидания слота.
 *
 * зачем 2026-07-27 (владелец): «чтобы без расписания было доступно начать игру
 * в турнире в любое время» + «убери ограничение на количество игр в слот».
 * Дев-режим для этого не используется: у комнаты свой slotId с меткой времени,
 * поэтому лимит один-турнир-на-слот к ней просто не применяется.
 *
 * Жемчужины списывает эта же серверная транзакция — отдельный вызов входа не
 * нужен (иначе комната успевала стартовать, пока игрок читает подтверждение).
 */
export function startTournamentNow() {
  return callFunction<{
    ok: boolean;
    roomId: string;
    startsAt: number;
    entryGems?: number;
    gemsLeft?: number;
  }>('tournamentStartNow', {}, 'europe-west1');
}

/** Отправка ответов батча. Сервер сам считает очки — клиенту нельзя доверять. */
export function submitAnswers(roomId: string, roundNo: number, answers: unknown[]) {
  return callFunction<{ ok: boolean }>('tournamentSubmitAnswers', { roomId, roundNo, answers });
}

/**
 * Точный переход к следующему состоянию, когда серверный дедлайн истёк.
 *
 * зачем 2026-07-27 (владелец: «раунды все перепрыгивают через друг друга, а не
 * идут последовательно» + «Следующий раунд через 0»): фазы короткие (таблица
 * 12с, финал и результаты по 5с), а крон tournamentAdvanceRooms стоит на
 * '* * * * *' — раз в МИНУТУ. Комната висела на нуле до следующей минуты, после
 * чего крон догонял и проскакивал несколько фаз одним тиком. Чаще минуты крон
 * не бывает, поэтому фазу двигает клиент, а крон остаётся страховкой для
 * комнат, где живых игроков не осталось.
 *
 * Ускорить турнир этим нельзя: сервер сверяет expectedState и
 * expectedDeadlineAtMs со своими и на досрочный вызов отвечает waiting.
 */
export function advanceRound(roomId: string, expectedState: string, expectedDeadlineAtMs: number) {
  return callFunction<{ ok: boolean; state?: string; outcome?: string }>(
    'tournamentAdvanceRound',
    { roomId, expectedState, expectedDeadlineAtMs },
  );
}

/** Забрать награду. Идемпотентно: повторный вызов не выдаёт приз дважды. */
export function claimReward(roomId: string) {
  return callFunction<{ ok: boolean; gems?: number; tickets?: number }>(
    'tournamentClaimReward',
    { roomId },
  );
}

export type WeeklyBankInfo = {
  ok: boolean;
  weekId: string;
  bankGems: number;
  /** Доли призёров банка (60/25/15 по умолчанию) — приходят с сервера. */
  weeklyShares?: readonly [number, number, number];
  /** За сколько до старта открывается вход. Раньше было копией на клиенте. */
  lobbyOpenMs?: number;
  /**
   * Длина ОКНА входа (владелец: «полчаса, в которые можно зайти»).
   * Внутри окна комнаты набираются волнами — заполнилась одна, следующий
   * игрок попадает в следующую. Один игрок за окно играет один турнир.
   */
  entryWindowMs?: number;
  /** Часы сервера в момент ответа — база для честного отсчёта. */
  serverNowMs?: number;
  lastWeek: { weekId: string; paidOut: boolean; myPlace: number; myGems: number };
};

/**
 * Поправка часов устройства.
 *
 * зачем 2026-07-27 (владелец): всё время на экране считалось от Date.now().
 * У игрока со сбитыми часами (а на Android это не редкость) отсчёт до турнира
 * врал на те же минуты, и кнопка входа открывалась не тогда. Сервер присылает
 * своё время вместе с банком — держим разницу и считаем от неё.
 */
let serverClockSkewMs = 0;

/** «Сейчас» глазами сервера. Использовать вместо Date.now() для расписания. */
export function tournamentNow(): number {
  return Date.now() + serverClockSkewMs;
}

function rememberServerClock(serverNowMs?: number): void {
  if (!serverNowMs || !Number.isFinite(serverNowMs)) return;
  const skew = serverNowMs - Date.now();
  // Правим только заметный сдвиг: мелкая разница — это задержка сети, не сбой.
  serverClockSkewMs = Math.abs(skew) > 30_000 ? skew : 0;
}

/**
 * Банк недели + моя доля за прошлую неделю.
 *
 * зачем: банк на экране был захардкожен числом, а о выигрыше недельного банка
 * игрок не узнавал вовсе — начисление идёт кроном ночью. Кэш на 30 минут:
 * банк меняется по мере турниров, чаще дёргать сервер незачем.
 */
let weeklyBankCache: { at: number; value: WeeklyBankInfo | null } | null = null;
const WEEKLY_BANK_TTL_MS = 30 * 60 * 1000;

export async function loadWeeklyBankInfo(force = false): Promise<WeeklyBankInfo | null> {
  const now = Date.now();
  if (!force && weeklyBankCache && now - weeklyBankCache.at < WEEKLY_BANK_TTL_MS) {
    return weeklyBankCache.value;
  }
  try {
    const result = await callFunction<WeeklyBankInfo>('tournamentWeeklyBankInfo', {});
    // Тот же ответ несёт часы сервера — синхронизируем расписание бесплатно.
    rememberServerClock(result?.serverNowMs);
    weeklyBankCache = { at: now, value: result ?? null };
    return weeklyBankCache.value;
  } catch {
    // Банк — украшение экрана, его недоступность не должна ломать турниры.
    weeklyBankCache = { at: now, value: null };
    return null;
  }
}

// ── Недельный рейтинг сезона ────────────────────────────────────────────────

/**
 * ISO-неделя. Формула обязана совпадать с серверной `tournamentWeekId`
 * (functions/src/tournament_core.ts) и с `getWeekId` лиг — иначе клиент читал
 * бы документ несуществующей недели и таблица всегда была бы пустой.
 */
export function tournamentSeasonWeekId(at: number = Date.now()): string {
  const d = new Date(at);
  const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const day = date.getUTCDay() || 7;
  date.setUTCDate(date.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  const weekNum = Math.ceil((((date.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
  return `${date.getUTCFullYear()}-W${String(weekNum).padStart(2, '0')}`;
}

/**
 * Момент раздачи банка: ближайший понедельник 00:10 UTC — ровно расписание
 * крона `tournamentWeeklyBankCron` ('10 0 * * 1', timeZone UTC).
 *
 * зачем: таймер на экране сезона отсчитывал от выдуманной константы
 * (2ч 41м) и «сбрасывался» при каждом заходе. Считаем локально от той же
 * точки, что и сервер, — ноль чтений и цифра совпадает с реальностью.
 */
export function weeklyBankPayoutAtMs(at: number = Date.now()): number {
  const now = new Date(at);
  const next = new Date(Date.UTC(
    now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 0, 10, 0, 0,
  ));
  // getUTCDay(): 0=вс, 1=пн. Сдвигаем на ближайший будущий понедельник.
  const daysToMonday = (8 - (next.getUTCDay() || 7)) % 7;
  next.setUTCDate(next.getUTCDate() + daysToMonday);
  if (next.getTime() <= at) next.setUTCDate(next.getUTCDate() + 7);
  return next.getTime();
}

/** Строка недельного рейтинга. Боты сюда не попадают — сервер их отсекает. */
export type SeasonEntry = {
  uid: string;
  name: string;
  points: number;
  /** Аватар из профиля игрока; у старых записей может отсутствовать. */
  avatar?: string;
  // ── Поля для карточки игрока (пишутся при финализации турнира) ────────────
  // зачем: карточка открывается по тапу МГНОВЕННО из уже загруженной строки.
  // Дочитывать чужой профиль на каждый тап — лишние чтения на ровном месте.
  profileAvatar?: string;
  frame?: string;
  totalXp?: number;
  hotStreak?: number;
  tournamentsPlayed?: number;
  bestPlace?: number;
};

export type SeasonStandings = {
  weekId: string;
  /** Верх таблицы, отсортирован по очкам. */
  top: SeasonEntry[];
  /** Моя строка — даже если я ниже лимита. null, если я ещё не играл. */
  me: SeasonEntry | null;
  /** Моё место в НЕДЕЛЕ; 0 — если я вне прочитанного верха и не играл. */
  myPlace: number;
};

/**
 * Сколько строк тянем. Владелец выбрал топ-20 + закреплённая своя строка:
 * экран прокручивается недолго, а своя позиция видна всегда.
 */
const SEASON_TOP_LIMIT = 20;

/**
 * Кэш рейтинга: 15 минут. Один снимок кормит ТРИ места — хаб, шторку банка и
 * таблицу сезона, поэтому три экрана стоят одного чтения.
 *
 * зачем именно 15 минут: очки меняются только после сыгранного турнира
 * (~7 минут), чаще дёргать сервер незачем. Сразу после своего турнира кэш
 * сбрасывается явно — см. invalidateSeasonStandingsCache().
 */
let seasonCache: { at: number; weekId: string; value: SeasonStandings | null } | null = null;
const SEASON_TTL_MS = 15 * 60 * 1000;

/** Последний известный рейтинг — для синхронной гидрации первого кадра. */
export function peekSeasonStandings(): SeasonStandings | null {
  if (!seasonCache) return null;
  // Неделя сменилась — прошлый снимок больше не про эту таблицу.
  return seasonCache.weekId === tournamentSeasonWeekId() ? seasonCache.value : null;
}

/**
 * Сброс кэша — вызывается после сыгранного турнира, чтобы игрок увидел свои
 * новые очки сразу, а не через 15 минут.
 */
export function invalidateSeasonStandingsCache(): void {
  seasonCache = null;
}

/**
 * Недельный рейтинг: топ-N + моя строка.
 *
 * Стоимость: 1 запрос с orderBy+limit (до 20 документов) + 1 чтение своей
 * записи, и только если меня нет в прочитанном верху. Выкачивать коллекцию
 * недели целиком нельзя — она растёт с аудиторией.
 */
export async function loadSeasonStandings(force = false): Promise<SeasonStandings | null> {
  const now = Date.now();
  const weekId = tournamentSeasonWeekId(now);
  if (!force && seasonCache && seasonCache.weekId === weekId && now - seasonCache.at < SEASON_TTL_MS) {
    return seasonCache.value;
  }
  try {
    const { getApp } = await import('@react-native-firebase/app');
    const { getAuth } = await import('@react-native-firebase/auth');
    const firestore = (await import('@react-native-firebase/firestore')).default;
    const myUid = getAuth(getApp()).currentUser?.uid ?? '';
    const entries = firestore()
      .collection('tournamentSeasons').doc(weekId)
      .collection('entries');

    // guard-ok: orderBy + limit — читаем только верх таблицы, не всю неделю.
    const topSnap = await entries.orderBy('points', 'desc').limit(SEASON_TOP_LIMIT).get();
    const top: SeasonEntry[] = topSnap.docs.map((doc) => {
      const data = doc.data() ?? {};
      return {
        uid: doc.id,
        name: String(data.name ?? 'Игрок'),
        points: Math.max(0, Math.trunc(Number(data.points) || 0)),
        avatar: typeof data.avatar === 'string' ? data.avatar : undefined,
      };
    });

    const myIndex = myUid ? top.findIndex((entry) => entry.uid === myUid) : -1;
    let me: SeasonEntry | null = myIndex >= 0 ? top[myIndex] : null;
    let myPlace = myIndex >= 0 ? myIndex + 1 : 0;

    // Я ниже топ-20 — дочитываем ОДИН свой документ, а не всю таблицу.
    // Точное место при этом неизвестно (потребовало бы count-запроса по неделе),
    // поэтому строка показывается без номера — честнее, чем выдуманная цифра.
    if (!me && myUid) {
      const mySnap = await entries.doc(myUid).get();
      const data = mySnap.exists ? mySnap.data() ?? {} : null;
      if (data) {
        me = {
          uid: myUid,
          name: String(data.name ?? 'Вы'),
          points: Math.max(0, Math.trunc(Number(data.points) || 0)),
          avatar: typeof data.avatar === 'string' ? data.avatar : undefined,
        };
        myPlace = 0;
      }
    }

    const value: SeasonStandings = { weekId, top, me, myPlace };
    seasonCache = { at: now, weekId, value };
    return value;
  } catch {
    // Рейтинг недоступен — экран обязан остаться рабочим (правило владельца).
    seasonCache = { at: now, weekId, value: null };
    return null;
  }
}

/**
 * Расписание слотов. Кэшируется на 6 часов: оно меняется раз в недели, и
 * дёргать сервер на каждом открытии экрана — пустая трата чтений.
 */
export async function loadSchedule(force = false): Promise<unknown> {
  const now = Date.now();
  if (!force && scheduleCache && now - scheduleCache.at < SCHEDULE_TTL_MS) {
    return scheduleCache.value;
  }
  const firestore = (await import('@react-native-firebase/firestore')).default;
  const snapshot = await firestore().collection('tournamentSchedule').doc('config').get();
  const value = snapshot.exists ? snapshot.data() : null;
  scheduleCache = { at: now, value };
  return value;
}

/** Сброс кэша — после правки расписания в админке. */
export function invalidateScheduleCache(): void {
  scheduleCache = null;
}
