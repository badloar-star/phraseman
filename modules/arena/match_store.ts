import type { ArenaLocalMatchState } from './match_machine';
import { ARENA_LOCAL_SCHEMA_VERSION } from './match_machine';
import { arenaParseMatchPlan, type ArenaMatchPlanWire } from './duel_plan';

/**
 * Сохранение идущего матча.
 *
 * Матч считается на устройстве, поэтому единственная копия его хода живёт в
 * памяти приложения. Убитое системой приложение, перезагрузка, разряженная
 * батарея — без сохранения игрок теряет и матч, и звёзды за него.
 *
 * Сохраняются ДВЕ вещи вместе: план и состояние. Порознь они бесполезны —
 * состояние без плана нечем отрисовать, план без состояния начнёт матч заново.
 * Поэтому запись всегда одним ключом: половинчатого восстановления не бывает.
 *
 * MMKV в проекте нет, запись асинхронная. Гарантии это не ослабляет: снимок
 * делается на каждой границе задания, а потеря самого последнего снимка
 * означает ровно то же, что холодный старт — незакрытое задание закроется
 * просрочкой.
 */

export const ARENA_MATCH_STORE_SCHEMA_VERSION = 'arena-match-store.v1' as const;
export const ARENA_MATCH_STORE_KEY = 'arena.match.v1.current';

/**
 * Дольше этого сохранённый матч не имеет смысла: серверный документ живёт
 * ограниченно, а отчёт по протухшему матчу всё равно будет отклонён.
 */
export const ARENA_MATCH_STORE_TTL_MS = 30 * 60 * 1_000;

export type ArenaStoredMatch = Readonly<{
  schemaVersion: typeof ARENA_MATCH_STORE_SCHEMA_VERSION;
  plan: ArenaMatchPlanWire;
  state: ArenaLocalMatchState;
  savedAtWallMs: number;
}>;

/** Минимум, который нужен от хранилища. Инъекция — ради тестов без нативного слоя. */
export type ArenaKeyValueStore = {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
  removeItem(key: string): Promise<void>;
};

/* ------------------------------ разбор ----------------------------------- */

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/**
 * Разбирает сохранённое. Любая неполнота — `null`: продолжить матч с
 * повреждённого снимка хуже, чем начать заново, потому что расхождение
 * вылезет в начислении, а не на экране.
 */
export function arenaDecodeStoredMatch(raw: string | null): ArenaStoredMatch | null {
  if (!raw) return null;
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    // Оборванная запись — обычное дело при убийстве приложения посреди записи.
    // Это не ошибка, о которой надо кричать: просто снимка нет.
    return null;
  }
  if (!isRecord(parsed)) return null;
  if (parsed.schemaVersion !== ARENA_MATCH_STORE_SCHEMA_VERSION) return null;

  const plan = arenaParseMatchPlan(parsed.plan);
  if (!plan) return null;

  const state = parsed.state;
  if (!isRecord(state)) return null;
  if (state.schemaVersion !== ARENA_LOCAL_SCHEMA_VERSION) return null;
  // Состояние и план обязаны быть об одном матче. Разошлись — значит запись
  // склеилась из двух разных, и доверять ей нельзя ни в какой части.
  if (state.matchId !== plan.matchId) return null;
  if (state.planHash !== plan.planHash) return null;
  if (state.seat !== plan.viewerSeat) return null;
  if (Math.trunc(Number(state.taskCount)) !== plan.tasks.length) return null;

  const savedAtWallMs = Number(parsed.savedAtWallMs);
  if (!Number.isFinite(savedAtWallMs) || savedAtWallMs <= 0) return null;

  return {
    schemaVersion: ARENA_MATCH_STORE_SCHEMA_VERSION,
    plan,
    state: state as unknown as ArenaLocalMatchState,
    savedAtWallMs: Math.trunc(savedAtWallMs),
  };
}

export function arenaEncodeStoredMatch(
  plan: ArenaMatchPlanWire,
  state: ArenaLocalMatchState,
  savedAtWallMs: number,
): string {
  const snapshot: ArenaStoredMatch = {
    schemaVersion: ARENA_MATCH_STORE_SCHEMA_VERSION,
    plan,
    state,
    savedAtWallMs: Math.trunc(savedAtWallMs),
  };
  return JSON.stringify(snapshot);
}

/**
 * Годен ли снимок к продолжению.
 *
 * Часы могли уйти назад (перевод времени, смена пояса), поэтому отрицательный
 * возраст считается нулевым: наказывать игрока за настройки телефона нельзя.
 */
export function arenaStoredMatchUsable(
  stored: ArenaStoredMatch | null,
  nowWallMs: number,
  expectedMatchId?: string,
): boolean {
  if (!stored) return false;
  if (expectedMatchId && stored.plan.matchId !== expectedMatchId) return false;
  const ageMs = Math.max(0, nowWallMs - stored.savedAtWallMs);
  return ageMs < ARENA_MATCH_STORE_TTL_MS;
}

/* ------------------------------ хранилище -------------------------------- */

/**
 * Пишет снимок. Ошибка записи ГЛОТАЕТСЯ намеренно: сорванное сохранение не
 * должно ронять идущий матч — это ровно та ситуация, ради которой сохранение
 * и делалось.
 */
export async function arenaSaveMatch(
  store: ArenaKeyValueStore,
  plan: ArenaMatchPlanWire,
  state: ArenaLocalMatchState,
  nowWallMs: number,
): Promise<boolean> {
  try {
    await store.setItem(ARENA_MATCH_STORE_KEY, arenaEncodeStoredMatch(plan, state, nowWallMs));
    return true;
  } catch {
    return false;
  }
}

export async function arenaLoadMatch(
  store: ArenaKeyValueStore,
  nowWallMs: number,
  expectedMatchId?: string,
): Promise<ArenaStoredMatch | null> {
  let raw: string | null = null;
  try {
    raw = await store.getItem(ARENA_MATCH_STORE_KEY);
  } catch {
    return null;
  }
  const stored = arenaDecodeStoredMatch(raw);
  return arenaStoredMatchUsable(stored, nowWallMs, expectedMatchId) ? stored : null;
}

export async function arenaClearMatch(store: ArenaKeyValueStore): Promise<void> {
  try {
    await store.removeItem(ARENA_MATCH_STORE_KEY);
  } catch {
    // Неудалённый снимок безвреден: он либо протухнет по сроку, либо будет
    // отброшен при разборе. Ронять на этом ход матча незачем.
  }
}
