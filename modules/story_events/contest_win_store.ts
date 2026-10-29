// ═══════════════════════════════════════════════════════════════════════════
// contest_win_store.ts — мост «проекция доступа → история победителю в кольце»: строка contestLastWin от PremiumContext и отметка на телефоне.
//
// зачем (Ядро и координатор 29.10): PremiumContext уже слушает users/{uid}/access_projection/current; из обработчика снапшота он одной строкой
// передаёт сюда поле contestLastWin — без нового state в контексте и без перерисовок потребителей Plus. Отметка «впервые показана / просмотрена»
// лежит в AsyncStorage `story_contest_win_v1:<stableId>` (только последняя победа) — ни одного чтения или записи Firestore.
// Лог: [STORY-CONTEST] — что пришло из проекции, загрузка и запись отметки, сбои (ни одного немого catch).
// ═══════════════════════════════════════════════════════════════════════════
import AsyncStorage from '@react-native-async-storage/async-storage';
import { captureAccountGeneration, subscribeAccountGeneration } from '../../app/account_generation';
import { DebugLogger } from '../../app/debug-logger';
import { contestWinEventId, parseContestWinLocal, serializeContestWinLocal, type ContestWinLocal } from './contest_win_story';

const LOG = '[STORY-CONTEST]';
const KEY_PREFIX = 'story_contest_win_v1';

export type ContestWinSnapshot = Readonly<{
  /** Аккаунт телефона сейчас. */
  owner: string | null;
  /** Чей снапшот проекции прислал PremiumContext. */
  sourceUid: string | null;
  raw: string | null;
  /** Отметка владельца (null — истории ещё не было). */
  local: ContestWinLocal | null;
  localLoaded: boolean;
}>;

const EMPTY_SNAPSHOT: ContestWinSnapshot = Object.freeze({ owner: null, sourceUid: null, raw: null, local: null, localLoaded: false });

let sourceUid: string | null = null;
let raw: string | null = null;
/** Отметки по аккаунтам: значение null — записи нет; ключа нет — ещё не загружена. */
const locals = new Map<string, ContestWinLocal | null>();
const loads = new Map<string, Promise<void>>();
const listeners = new Set<() => void>();
let snapshot: ContestWinSnapshot = EMPTY_SNAPSHOT;
let generationSubscribed = false;

const keyOf = (owner: string): string => `${KEY_PREFIX}:${owner}`;
const short = (id: string | null): string => (id ? `${id.slice(0, 6)}…` : '—');
const reasonOf = (error: unknown): string => (error instanceof Error ? `${error.name}: ${error.message}` : String(error));

function currentOwner(): string | null {
  const token = captureAccountGeneration();
  return token.phase === 'active' && token.stableId ? token.stableId : null;
}

function recompute(why: string): void {
  const owner = currentOwner();
  const localLoaded = owner !== null && locals.has(owner);
  const local = owner !== null ? locals.get(owner) ?? null : null;
  // зачем: те же данные — тот же снимок, без лишней перерисовки Главной
  if (owner === snapshot.owner && sourceUid === snapshot.sourceUid && raw === snapshot.raw && local === snapshot.local && localLoaded === snapshot.localLoaded) return;
  snapshot = Object.freeze({ owner, sourceUid, raw, local, localLoaded });
  const mark = localLoaded ? (local ? `${local.monthId} seen=${String(local.seen)}` : 'нет') : 'не загружена';
  DebugLogger.info(LOG, `снимок: ${why} · аккаунт ${short(owner)} · проекция ${short(sourceUid)} · поле ${raw ? `${raw.length} зн.` : 'нет'} · отметка ${mark}`);
  for (const listener of listeners) {
    try {
      listener();
    } catch (error) {
      // зачем: один упавший подписчик не должен оставить других без снимка (и не уйти необработанным из загрузки с диска)
      DebugLogger.warn(LOG, `подписчик упал на «${why}»: ${reasonOf(error)}`);
    }
  }
}

function ensureLoaded(owner: string): void {
  if (locals.has(owner) || loads.has(owner)) return;
  const startedAt = Date.now();
  const load = AsyncStorage.getItem(keyOf(owner)).then((stored) => {
    const parsed = parseContestWinLocal(stored);
    if (stored && !parsed) DebugLogger.warn(LOG, `отметка на телефоне битая — считаем, что история ещё не показана (${stored.slice(0, 80)})`);
    if (!locals.has(owner)) locals.set(owner, parsed);
    DebugLogger.info(LOG, `отметка загружена: ${parsed ? `${parsed.monthId} first=${parsed.firstShownAtMs} seen=${String(parsed.seen)}` : 'нет'} · ${Date.now() - startedAt} мс`);
  }).catch((error: unknown) => {
    // зачем: хранилище не ответило — считаем «ещё не показана»: история появится, а не потеряется молча
    DebugLogger.warn(LOG, `отметка не прочиталась (${reasonOf(error)}) — считаем, что история ещё не показана`);
    if (!locals.has(owner)) locals.set(owner, null);
  }).finally(() => {
    loads.delete(owner);
    recompute('local_loaded');
  });
  loads.set(owner, load); // guard-ok: Map в памяти — загрузка в полёте, не запись данных
}

function ensureGenerationSubscription(): void {
  if (generationSubscribed) return;
  generationSubscribed = true;
  // зачем: сменился аккаунт — отметку берём нового владельца, строку проекции сверяем с ним (contestWinDecision → other_account)
  subscribeAccountGeneration(() => {
    const owner = currentOwner();
    if (owner && raw && sourceUid === owner) ensureLoaded(owner);
    recompute('account_generation');
  });
}

/**
 * Вызывается из обработчика снапшота access_projection/current (PremiumContext). Никогда не бросает: сбой здесь не должен задеть Plus.
 * Та же строка того же аккаунта — без уведомлений (ни одной лишней перерисовки).
 */
export function publishContestLastWin(stableUid: string, value: unknown): void {
  try {
    const nextRaw = typeof value === 'string' && value.length > 0 ? value : null;
    const nextUid = stableUid || null;
    if (nextUid === sourceUid && nextRaw === raw) return;
    if (value !== undefined && value !== null && typeof value !== 'string') DebugLogger.warn(LOG, `проекция: поле contestLastWin не строка (${typeof value}) — считаем, что его нет`);
    DebugLogger.info(LOG, `проекция: аккаунт ${short(nextUid)} · поле ${nextRaw ? `есть, ${nextRaw.length} зн.` : 'нет'}`);
    sourceUid = nextUid;
    raw = nextRaw;
    ensureGenerationSubscription();
    // зачем: отметку с диска читаем, только если победа есть — у большинства людей поля нет, и чтения диска нет тоже
    if (nextRaw && nextUid && nextUid === currentOwner()) ensureLoaded(nextUid);
    recompute('projection');
  } catch (error) {
    console.warn(`${LOG} передача из проекции не удалась: ${reasonOf(error)}`); // guard-ok: сбой моста не должен задеть Plus — только сигнал
  }
}

export function subscribeContestWin(listener: () => void): () => void {
  ensureGenerationSubscription();
  listeners.add(listener); // guard-ok: Set подписчиков в памяти, не запись данных
  return () => { listeners.delete(listener); };
}

export function peekContestWin(): ContestWinSnapshot {
  return snapshot;
}

async function persist(owner: string, local: ContestWinLocal, what: string): Promise<void> {
  try {
    await AsyncStorage.setItem(keyOf(owner), serializeContestWinLocal(local));
    DebugLogger.info(LOG, `отметка записана: ${what} · ${local.monthId}`);
  } catch (error) {
    // зачем: в памяти отметка верная (кольцо уже отразило факт); на диск не легла — после перезапуска история может появиться снова
    DebugLogger.warn(LOG, `отметка не записалась (${what}, ${local.monthId}): ${reasonOf(error)}`);
  }
}

/** Первый показ на телефоне: отметка в памяти сразу (кольцо не мигает), на диск — фоном. Отсюда идут 7 дней показа. */
export function recordContestWinFirstShow(owner: string, monthId: string, atMs: number): void {
  const prev = locals.get(owner);
  if (prev && prev.monthId === monthId) return;
  const next: ContestWinLocal = Object.freeze({ monthId, firstShownAtMs: atMs, seen: false });
  locals.set(owner, next);
  recompute('first_show');
  void persist(owner, next, 'first_show');
}

/** Просмотр: кольцо гаснет сразу (память), запись — фоном. Чужой id или нет отметки — пропуск с причиной. */
export function markContestWinSeen(id: string): boolean {
  const owner = currentOwner();
  const local = owner ? locals.get(owner) ?? null : null;
  if (!owner || !local || contestWinEventId(local.monthId) !== id) {
    DebugLogger.warn(LOG, `просмотр ${id}: отметка ${local ? local.monthId : 'нет'}, аккаунт ${short(owner)} — пропуск`);
    return false;
  }
  if (local.seen) return true;
  const next: ContestWinLocal = Object.freeze({ ...local, seen: true });
  locals.set(owner, next);
  recompute('seen');
  void persist(owner, next, 'seen');
  return true;
}

export function __resetContestWinForTests(): void {
  sourceUid = null;
  raw = null;
  locals.clear();
  loads.clear();
  listeners.clear();
  snapshot = EMPTY_SNAPSHOT;
  generationSubscribed = false;
}
