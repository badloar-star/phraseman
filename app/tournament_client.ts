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
  kind: 'choice' | 'translate' | 'timeattack' | 'voice';
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
  | 'scheduled' | 'lobby' | 'round' | 'table' | 'final'
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

// ── Callable-обёртки ────────────────────────────────────────────────────────

const FUNCTIONS_REGION = 'us-central1';

async function callFunction<T>(name: string, payload: Record<string, unknown> = {}): Promise<T> {
  const { getApp } = await import('@react-native-firebase/app');
  const { getFunctions, httpsCallable } = await import('@react-native-firebase/functions');
  const call = httpsCallable(getFunctions(getApp(), FUNCTIONS_REGION), name);
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

/** Вход в турнир: списывает билет и сажает игрока в комнату. */
export function joinTournament(roomId: string) {
  return callFunction<{ ok: boolean; roomId: string }>('tournamentJoin', { roomId });
}

/**
 * Дев-турнир (только владелец, admin claim): сервер мгновенно создаёт комнату
 * с ботами и возвращает roomId — вход доступен сразу, без ожидания слота.
 */
export function devStartTournament() {
  return callFunction<{ ok: boolean; roomId: string; startsAt: number }>(
    'adminDevStartTournament',
    {},
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
  lastWeek: { weekId: string; paidOut: boolean; myPlace: number; myGems: number };
};

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
    weeklyBankCache = { at: now, value: result ?? null };
    return weeklyBankCache.value;
  } catch {
    // Банк — украшение экрана, его недоступность не должна ломать турниры.
    weeklyBankCache = { at: now, value: null };
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
