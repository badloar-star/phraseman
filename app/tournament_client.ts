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
  kind: 'choice' | 'translate' | 'timeattack' | 'voice' | 'listen' | 'dictate';
  isVoice: boolean;
  difficulty: number;
  payload: Record<string, unknown>;
};

export type RoomPlayer = {
  id: string;
  isBot?: boolean;
  name: string;
  avatar: string;
  color: string;
  score: number;
  streak: number;
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
 */
export function useTournamentRoom(roomId: string | null): RoomHook {
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
  }, [roomId, attempt]);

  // Отсчёт ведём от СЕРВЕРНОГО дедлайна: локальные часы могут врать, и тогда
  // игрок увидит «0» раньше или позже реального перехода раунда.
  const [secondsLeft, setSecondsLeft] = useState(0);
  useEffect(() => {
    const deadline = room?.stateDeadlineAtMs;
    if (!deadline) {
      setSecondsLeft(0);
      return;
    }
    const tick = () => setSecondsLeft(Math.max(0, Math.round((deadline - Date.now()) / 1000)));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [room?.stateDeadlineAtMs]);

  const retry = useCallback(() => setAttempt((value) => value + 1), []);

  return useMemo(() => ({ room, status, secondsLeft, retry }), [room, status, secondsLeft, retry]);
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
};

/**
 * зачем: владелец — «после турнира можно смотреть свои ответы, ошибки и
 * правильные варианты». Сервер отдаёт их только когда турнир окончен и
 * только свои: во время игры это была бы подсказка.
 */
export function loadRoundReview(roomId: string) {
  return callFunction<{ ok: boolean; items: ReviewItem[] }>('tournamentRoundReview', { roomId });
}

export function devStartTournament() {
  return callFunction<{ ok: boolean; roomId: string; startsAt: number }>(
    'adminDevStartTournament',
    {},
    'europe-west1',
  );
}

/** Отправка ответов батча. Сервер сам считает очки — клиенту нельзя доверять. */
export function submitAnswers(roomId: string, roundNo: number, answers: unknown[]) {
  return callFunction<{ ok: boolean }>('tournamentSubmitAnswers', { roomId, roundNo, answers });
}

/** Точный переход к следующему состоянию после показа таблицы. */
export function advanceRound(roomId: string) {
  return callFunction<{ ok: boolean }>('tournamentAdvanceRound', { roomId });
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
  /** Аватар из профиля игрока; сервер пишет только имя, поэтому опционален. */
  avatar?: string;
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
