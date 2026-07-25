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

    // Импорт внутри эффекта: модуль Firestore не попадает в стартовый бандл
    // экрана, если пользователь до турниров не дошёл (холодный старт).
    void (async () => {
      try {
        const { getFirestore, doc, onSnapshot } = await import('firebase/firestore');
        if (cancelled) return;

        const reference = doc(getFirestore(), 'tournamentRooms', roomId);
        unsubscribeRef.current = onSnapshot(
          reference,
          (snapshot) => {
            if (cancelled) return;
            if (!snapshot.exists()) {
              setRoom(null);
              setStatus('error');
              return;
            }
            setRoom(snapshot.data() as Room);
            setStatus('ready');
          },
          () => {
            if (cancelled) return;
            // Различаем «нет сети» и «нет доступа» по факту наличия данных:
            // если что-то уже пришло, значит доступ есть и это обрыв связи.
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

async function callFunction<T>(name: string, payload: Record<string, unknown> = {}): Promise<T> {
  const { getFunctions, httpsCallable } = await import('firebase/functions');
  const call = httpsCallable(getFunctions(undefined, 'us-central1'), name);
  const result = await call(payload);
  return result.data as T;
}

/** Вход в турнир: списывает билет и сажает игрока в комнату. */
export function joinTournament(slotId: string) {
  return callFunction<{ ok: boolean; roomId: string }>('tournamentJoin', { slotId });
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

/**
 * Расписание слотов. Кэшируется на 6 часов: оно меняется раз в недели, и
 * дёргать сервер на каждом открытии экрана — пустая трата чтений.
 */
export async function loadSchedule(force = false): Promise<unknown> {
  const now = Date.now();
  if (!force && scheduleCache && now - scheduleCache.at < SCHEDULE_TTL_MS) {
    return scheduleCache.value;
  }
  const { getFirestore, doc, getDoc } = await import('firebase/firestore');
  const snapshot = await getDoc(doc(getFirestore(), 'tournamentSchedule', 'config'));
  const value = snapshot.exists() ? snapshot.data() : null;
  scheduleCache = { at: now, value };
  return value;
}

/** Сброс кэша — после правки расписания в админке. */
export function invalidateScheduleCache(): void {
  scheduleCache = null;
}
