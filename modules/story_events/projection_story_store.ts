// ═══════════════════════════════════════════════════════════════════════════
// projection_story_store.ts — общий мост «поле проекции доступа → история в кольце»: строка от PremiumContext и отметка на телефоне.
//
// зачем (Ядро и координатор 29.10): история победителю (contestLastWin) и история лесенки (referralLastReward) приходят одним путём — Ядро
// кладёт строку JSON в users/{uid}/access_projection/current, PremiumContext из уже существующего обработчика снапшота передаёт её сюда.
// Одна реализация — одни гарантии: не бросает в обработчик Plus; та же строка — без перерисовок; строку прежнего аккаунта не показываем;
// отметка «впервые показана / просмотрена» — в AsyncStorage `<keyPrefix>:<stableId>` (только последняя история); ни одного запроса Firestore.
// Логи — с префиксом конкретной истории ([STORY-CONTEST], [STORY-LADDER]): что пришло, загрузка и запись отметки, сбои (немых catch нет).
// ═══════════════════════════════════════════════════════════════════════════
import AsyncStorage from '@react-native-async-storage/async-storage';
import { captureAccountGeneration, subscribeAccountGeneration } from '../../app/account_generation';
import { DebugLogger } from '../../app/debug-logger';

/** Любая отметка истории: когда впервые показана и просмотрена ли. */
export type ProjectionStoryLocalBase = Readonly<{ firstShownAtMs: number; seen: boolean }>;

export type ProjectionStorySnapshot<L extends ProjectionStoryLocalBase> = Readonly<{
  /** Аккаунт телефона сейчас. */
  owner: string | null;
  /** Чей снапшот проекции прислал PremiumContext. */
  sourceUid: string | null;
  raw: string | null;
  /** Отметка владельца (null — истории ещё не было). */
  local: L | null;
  localLoaded: boolean;
}>;

export type ProjectionStoryConfig<L extends ProjectionStoryLocalBase> = Readonly<{
  log: string;
  /** Поле проекции — только для журнала. */
  field: string;
  keyPrefix: string;
  parseLocal: (stored: string | null) => L | null;
  serializeLocal: (local: L) => string;
  /** Ключ истории в отметке (месяц победы, номер друга…) — для журнала и сверки «та же история». */
  keyOfLocal: (local: L) => string;
  /** id события в кольце для этой отметки — по нему просмотр находит отметку. */
  eventIdOf: (local: L) => string;
}>;

export type ProjectionStoryStore<L extends ProjectionStoryLocalBase> = Readonly<{
  /** Из обработчика снапшота проекции. Никогда не бросает. */
  publish: (stableUid: string, value: unknown) => void;
  subscribe: (listener: () => void) => () => void;
  peek: () => ProjectionStorySnapshot<L>;
  /** Первый показ: отметка в памяти сразу, на диск — фоном. Та же история (тот же ключ) — без изменений. */
  recordFirstShow: (owner: string, local: L) => void;
  /** Просмотр: в памяти сразу, на диск — фоном; чужой id или нет отметки — false с причиной в журнале. */
  markSeen: (eventId: string) => boolean;
  reset: () => void;
}>;

const short = (id: string | null): string => (id ? `${id.slice(0, 6)}…` : '—');
const reasonOf = (error: unknown): string => (error instanceof Error ? `${error.name}: ${error.message}` : String(error));

function currentOwner(): string | null {
  const token = captureAccountGeneration();
  return token.phase === 'active' && token.stableId ? token.stableId : null;
}

export function createProjectionStoryStore<L extends ProjectionStoryLocalBase>(cfg: ProjectionStoryConfig<L>): ProjectionStoryStore<L> {
  const LOG = cfg.log;
  const empty: ProjectionStorySnapshot<L> = Object.freeze({ owner: null, sourceUid: null, raw: null, local: null, localLoaded: false });
  let sourceUid: string | null = null;
  let raw: string | null = null;
  /** Отметки по аккаунтам: значение null — записи нет; ключа нет — ещё не загружена. */
  const locals = new Map<string, L | null>();
  const loads = new Map<string, Promise<void>>();
  const listeners = new Set<() => void>();
  let snapshot: ProjectionStorySnapshot<L> = empty;
  let generationSubscribed = false;
  const keyOf = (owner: string): string => `${cfg.keyPrefix}:${owner}`;

  function recompute(why: string): void {
    const owner = currentOwner();
    const localLoaded = owner !== null && locals.has(owner);
    const local = owner !== null ? locals.get(owner) ?? null : null;
    // зачем: те же данные — тот же снимок, без лишней перерисовки Главной
    if (owner === snapshot.owner && sourceUid === snapshot.sourceUid && raw === snapshot.raw && local === snapshot.local && localLoaded === snapshot.localLoaded) return;
    snapshot = Object.freeze({ owner, sourceUid, raw, local, localLoaded });
    const mark = localLoaded ? (local ? `${cfg.keyOfLocal(local)} seen=${String(local.seen)}` : 'нет') : 'не загружена';
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
      const parsed = cfg.parseLocal(stored);
      if (stored && !parsed) DebugLogger.warn(LOG, `отметка на телефоне битая — считаем, что история ещё не показана (${stored.slice(0, 80)})`);
      if (!locals.has(owner)) locals.set(owner, parsed);
      DebugLogger.info(LOG, `отметка загружена: ${parsed ? `${cfg.keyOfLocal(parsed)} first=${parsed.firstShownAtMs} seen=${String(parsed.seen)}` : 'нет'} · ${Date.now() - startedAt} мс`);
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
    // зачем: сменился аккаунт — отметку берём нового владельца, строку проекции сверяем с ним (решение истории → other_account)
    subscribeAccountGeneration(() => {
      const owner = currentOwner();
      if (owner && raw && sourceUid === owner) ensureLoaded(owner);
      recompute('account_generation');
    });
  }

  async function persist(owner: string, local: L, what: string): Promise<void> {
    try {
      await AsyncStorage.setItem(keyOf(owner), cfg.serializeLocal(local));
      DebugLogger.info(LOG, `отметка записана: ${what} · ${cfg.keyOfLocal(local)}`);
    } catch (error) {
      // зачем: в памяти отметка верная (кольцо уже отразило факт); на диск не легла — после перезапуска история может появиться снова
      DebugLogger.warn(LOG, `отметка не записалась (${what}, ${cfg.keyOfLocal(local)}): ${reasonOf(error)}`);
    }
  }

  return Object.freeze({
    publish(stableUid: string, value: unknown): void {
      try {
        const nextRaw = typeof value === 'string' && value.length > 0 ? value : null;
        const nextUid = stableUid || null;
        if (nextUid === sourceUid && nextRaw === raw) return;
        if (value !== undefined && value !== null && typeof value !== 'string') DebugLogger.warn(LOG, `проекция: поле ${cfg.field} не строка (${typeof value}) — считаем, что его нет`);
        DebugLogger.info(LOG, `проекция: аккаунт ${short(nextUid)} · поле ${nextRaw ? `есть, ${nextRaw.length} зн.` : 'нет'}`);
        sourceUid = nextUid;
        raw = nextRaw;
        ensureGenerationSubscription();
        // зачем: отметку с диска читаем, только если история есть — у большинства людей поля нет, и чтения диска нет тоже
        if (nextRaw && nextUid && nextUid === currentOwner()) ensureLoaded(nextUid);
        recompute('projection');
      } catch (error) {
        console.warn(`${LOG} передача из проекции не удалась: ${reasonOf(error)}`); // guard-ok: сбой моста не должен задеть Plus — только сигнал
      }
    },
    subscribe(listener: () => void): () => void {
      ensureGenerationSubscription();
      listeners.add(listener); // guard-ok: Set подписчиков в памяти, не запись данных
      return () => { listeners.delete(listener); };
    },
    peek(): ProjectionStorySnapshot<L> {
      return snapshot;
    },
    recordFirstShow(owner: string, local: L): void {
      const prev = locals.get(owner);
      if (prev && cfg.keyOfLocal(prev) === cfg.keyOfLocal(local)) return;
      locals.set(owner, local);
      recompute('first_show');
      void persist(owner, local, 'first_show');
    },
    markSeen(eventId: string): boolean {
      const owner = currentOwner();
      const local = owner ? locals.get(owner) ?? null : null;
      if (!owner || !local || cfg.eventIdOf(local) !== eventId) {
        DebugLogger.warn(LOG, `просмотр ${eventId}: отметка ${local ? cfg.keyOfLocal(local) : 'нет'}, аккаунт ${short(owner)} — пропуск`);
        return false;
      }
      if (local.seen) return true;
      const next: L = { ...local, seen: true };
      locals.set(owner, next);
      recompute('seen');
      void persist(owner, next, 'seen');
      return true;
    },
    reset(): void {
      sourceUid = null;
      raw = null;
      locals.clear();
      loads.clear();
      listeners.clear();
      snapshot = empty;
      generationSubscribed = false;
    },
  });
}
