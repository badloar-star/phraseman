// ═══════════════════════════════════════════════════════════════════════════
// collectibles.ts — серверный движок дропов «Сокровищницы» (коллекционные
// карточки-фразы). Единственный источник выдачи: клиент НЕ может писать
// collectibles_owned_v1 / collectibles_state_v1 (blocklist в firestore.rules).
//
// Принципы (по образцу league_chest.ts):
//   - детерминированный seed-roll (FNV-1a): один eventId — один исход навсегда,
//     reroll-абьюз невозможен;
//   - без дублей: пул вычерпывается, дубликат не выпадает никогда;
//   - pity: epic гарантирован каждые ≤15 дропов, legendary — ≤35;
//   - кап 3 дропа/день (premium 4); первая карточка за всё время гарантирована
//     (100%, один раз), дальше единый шанс 15%;
//   - идемпотентность: леджер users/{uid}/collectible_claims/{eventId} —
//     повторный вызов с тем же eventId возвращает тот же результат;
//   - сет собран (10/10) → в той же транзакции секретная 11-я карточка
//     + осколки сет-бонуса + shard_log.
//
// Тюнинг — хардкод-константами (серверного remote config в проекте нет,
// см. паттерн league_chest/premium_dialog).
// ═══════════════════════════════════════════════════════════════════════════

import * as admin from 'firebase-admin';
import { appendExternalEconomyEvent } from './external_economy_events';
import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { HOT_CALLABLE_OPTIONS } from './callable_options';
import { resolveStableUidForAuth } from './auth_identity';
import { isPremiumAccessActive } from './premium_status';
import {
  isTournamentTestRoom,
  TOURNAMENT_ROOMS_COLLECTION,
  type TournamentRoomDoc,
} from './tournament_core';
import { normalizeTournamentEconomy } from './tournament_economy';
import { assertTournamentsReleased } from './tournament_release_gate';
import {
  COLLECTIBLE_POOL,
  COLLECTIBLE_SECRET_BY_SET,
  COLLECTIBLE_SET_CARD_IDS,
  CollectiblePoolCard,
  CollectibleRarity,
} from './collectibles_catalog';

export const COLLECTIBLES_OWNED_KEY = 'collectibles_owned_v1';
export const COLLECTIBLES_STATE_KEY = 'collectibles_state_v1';

// ── Тюнинг дропа карточек (крутится из «Пульта» без релиза) ─────────────────
// Раньше всё было хардкод-константами; теперь это конфиг с дефолтами, читаемый
// из remote_config/app.numbers (тот же документ, что и арена) — см.
// resolveCollectiblesDropConfig ниже. rollCollectibleDrop по умолчанию берёт
// дефолты (обратная совместимость + тривиальные юнит-тесты).
export interface CollectiblesDropConfig {
  /** Общий шанс дропа для «качественных» активностей (0..1). */
  flatDropChance: number;
  /** Дневной кап дропов для free-аккаунта. */
  dailyDropCapFree: number;
  /** Дневной кап дропов для premium. */
  dailyDropCapPremium: number;
  /** Потолок попыток/день — отсекает перебор eventId. */
  dailyAttemptCap: number;
  /** Не больше N дропов без epic+ (pity). */
  pityEpicAt: number;
  /** Не больше N дропов без legendary (pity). */
  pityLegendaryAt: number;
  /** Осколки за сбор сета (секретка). */
  setBonusShards: number;
}

export const COLLECTIBLES_DROP_DEFAULTS: CollectiblesDropConfig = {
  flatDropChance: 0.15,
  dailyDropCapFree: 3,
  dailyDropCapPremium: 4,
  dailyAttemptCap: 24,
  pityEpicAt: 15,
  pityLegendaryAt: 35,
  // Новая экономика (план 2026-07-20, §7): бонус за сбор сета не даёт монет.
  // Поле конфига сохранено (мёртвая структура); gameplay-начисление = 0.
  setBonusShards: 0,
};

// Активности без дропа вовсе (произношение / диалог с Компасом): шанс = 0.
const NO_DROP_KINDS: ReadonlySet<string> = new Set(['pronounce', 'dialog']);

// Качественные активности; kind = префикс eventId до первого ':'.
// зачем: владелец попросил давать шанс карточки не только за урок — добавлены
// tournament (участие в турнире, независимо от места), vocab (закрыт словарь
// урока), verbs (закрыт раздел неправильных глаголов), prep (закрыт раздел
// предлогов). Шанс/кап/pity у них ОБЩИЕ с уроком — отдельной экономики нет,
// поэтому список правил дропа не меняется, только расширяется валидация.
export const EVENT_ID_RE =
  /^(lesson|plan|exam|tournament|vocab|verbs|prep|pronounce|dialog):[A-Za-z0-9_.:-]{1,80}$/;

/**
 * Шанс дропа для типа активности с учётом конфига. pronounce/dialog → 0,
 * остальные «качественные» → flatDropChance. Первая карточка за всё время
 * гарантирована отдельно (см. rollCollectibleDrop).
 */
function dropChanceForKind(kind: string, config: CollectiblesDropConfig): number {
  if (NO_DROP_KINDS.has(kind)) return 0;
  return config.flatDropChance;
}

/** Верхняя граница множителя магнита — защита от порчи данных в документе юзера. */
export const COLLECTIBLES_MAX_DROP_MULTIPLIER = 2;

/** Ключ «Магнита коллекции» в `users/{uid}.progress` — пишется season_pass.ts. */
export const SEASON_COLLECTION_MAGNET_KEY = 'season_collection_magnet_v1';

function clampNum(value: unknown, min: number, max: number, fallback: number): number {
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.max(min, Math.min(max, n));
}

/**
 * Чистый парсер конфига дропа из remote_config/app.numbers. Любое отсутствие/
 * мусор → дефолт по полю. НИКОГДА не бросает (денежная математика).
 */
export function collectiblesDropConfigFromData(
  numbers: Record<string, unknown> | undefined,
): CollectiblesDropConfig {
  const n = numbers ?? {};
  const d = COLLECTIBLES_DROP_DEFAULTS;
  return {
    flatDropChance: clampNum(n.collectibles_drop_chance_pct, 0, 100, d.flatDropChance * 100) / 100,
    dailyDropCapFree: Math.trunc(clampNum(n.collectibles_daily_cap_free, 0, 999, d.dailyDropCapFree)),
    dailyDropCapPremium: Math.trunc(clampNum(n.collectibles_daily_cap_premium, 0, 999, d.dailyDropCapPremium)),
    dailyAttemptCap: Math.trunc(clampNum(n.collectibles_attempt_cap, 1, 9999, d.dailyAttemptCap)),
    pityEpicAt: Math.trunc(clampNum(n.collectibles_pity_epic_at, 1, 9999, d.pityEpicAt)),
    pityLegendaryAt: Math.trunc(clampNum(n.collectibles_pity_legendary_at, 1, 9999, d.pityLegendaryAt)),
    setBonusShards: Math.trunc(clampNum(n.collectibles_set_bonus_shards, 0, 9999, d.setBonusShards)),
  };
}

/**
 * Читает тюнинг дропа из remote_config/app.numbers (тот же документ, что и арена).
 * НИКОГДА не бросает: при ошибке/отсутствии → дефолты (поведение как до фичи).
 * Один get на вызов callable — дёшево.
 */
export async function resolveCollectiblesDropConfig(
  db: FirebaseFirestore.Firestore,
): Promise<CollectiblesDropConfig> {
  try {
    const snap = await db.collection('remote_config').doc('app').get();
    const data = snap.data() as { numbers?: Record<string, unknown> } | undefined;
    return collectiblesDropConfigFromData(data?.numbers);
  } catch (e) {
    console.warn('resolveCollectiblesDropConfig failed, using defaults', e);
    return { ...COLLECTIBLES_DROP_DEFAULTS };
  }
}

/* ── детерминированный ролл (FNV-1a, как в league_chest) ──── */
function hash32(seed: string): number {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i += 1) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}
function rollUnit(seed: string): number {
  return hash32(seed) / 0x100000000;
}
function pickOne<T>(seed: string, items: readonly T[]): T | null {
  if (items.length === 0) return null;
  return items[Math.min(items.length - 1, Math.floor(rollUnit(seed) * items.length))] ?? null;
}

function readInt(value: unknown, fallback = 0): number {
  const n = Math.trunc(Number(value));
  return Number.isFinite(n) ? n : fallback;
}

function parseJsonObject(raw: unknown): Record<string, unknown> {
  try {
    const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed)
      ? parsed as Record<string, unknown>
      : {};
  } catch {
    return {};
  }
}

/**
 * Множитель шанса дропа от «Магнита коллекции» (награда Season Pass, ур. 11/29/47/58).
 *
 * зачем (аудит 2026-08-24): подарок обещал «24 часа карточки выпадают вдвое
 * чаще», но НЕ РАБОТАЛ вообще. Магнит писали в `progress.season_collection_magnet_v1`
 * и клиент, и сервер (season_pass.ts), однако решение о дропе принимает ТОЛЬКО
 * сервер (rollCollectibleDrop), а он это поле не читал — потребителя не было ни
 * одного во всём репозитории. Игрок видел «магнит включён» и получал ровно
 * прежний шанс.
 *
 * Читается из УЖЕ загруженного `progress` юзер-транзакции — дополнительных
 * чтений Firestore не добавляет.
 *
 * Срок ставит сервер при выдаче (season_pass.ts), подделать длительность с
 * клиента нельзя. Множитель всё равно клампится: испорченное или раздутое
 * значение в документе не должно превращаться в гарантированный дроп.
 */
export function collectiblesDropMultiplier(
  progress: Record<string, unknown> | undefined,
  nowMs: number,
): number {
  const parsed = parseJsonObject(progress?.[SEASON_COLLECTION_MAGNET_KEY]);
  const expiresAt = Number(parsed.expiresAt);
  if (!Number.isFinite(expiresAt) || expiresAt <= nowMs) return 1;
  const multiplier = Number(parsed.multiplier);
  if (!Number.isFinite(multiplier) || multiplier <= 1) return 1;
  return Math.min(COLLECTIBLES_MAX_DROP_MULTIPLIER, multiplier);
}

function getProgress(data: FirebaseFirestore.DocumentData | undefined): Record<string, unknown> {
  const raw = data?.progress;
  return raw && typeof raw === 'object' && !Array.isArray(raw) ? raw as Record<string, unknown> : {};
}

function getExistingField(data: FirebaseFirestore.DocumentData | undefined, key: string): unknown {
  const progress = getProgress(data);
  return data?.[key] ?? progress[key] ?? data?.[`progress.${key}`];
}

function todayStrUtc(): string {
  return new Date().toISOString().slice(0, 10);
}

function safeId(value: string): string {
  return value.replace(/[^\w.:-]/g, '_').slice(0, 140);
}

/* ── состояние дропов (хранится JSON-строкой в progress) ───── */
export type CollectiblesDropState = {
  date: string;          // UTC-день последнего учёта
  drops: number;         // дропов сегодня
  attempts: number;      // попыток сегодня (включая no_luck)
  sinceEpic: number;     // дропов с последнего epic+
  sinceLegendary: number;// дропов с последнего legendary
  total: number;         // всего дропов за всё время
};

export function parseDropState(raw: unknown, today: string): CollectiblesDropState {
  const obj = parseJsonObject(raw);
  const sameDay = obj.date === today;
  return {
    date: today,
    drops: sameDay ? Math.max(0, readInt(obj.drops, 0)) : 0,
    attempts: sameDay ? Math.max(0, readInt(obj.attempts, 0)) : 0,
    sinceEpic: Math.max(0, readInt(obj.sinceEpic, 0)),
    sinceLegendary: Math.max(0, readInt(obj.sinceLegendary, 0)),
    total: Math.max(0, readInt(obj.total, 0)),
  };
}

/* ── чистый движок ролла (детерминированный, тестируемый) ──── */
export type DropDecision =
  | { dropped: false; reason: 'daily_cap' | 'attempt_cap' | 'no_luck' | 'pool_exhausted' }
  | {
      dropped: true;
      card: CollectiblePoolCard;
      setCompleted: boolean;
      secretCardId: string | null;
      bonusShards: number;
      nextState: Pick<CollectiblesDropState, 'sinceEpic' | 'sinceLegendary'>;
    };

const RARITY_ORDER: CollectibleRarity[] = ['common', 'rare', 'epic', 'legendary'];
// Веса 50/30/15/5 — кумулятивно.
const RARITY_CUMULATIVE: Array<{ rarity: CollectibleRarity; upTo: number }> = [
  { rarity: 'common', upTo: 0.50 },
  { rarity: 'rare', upTo: 0.80 },
  { rarity: 'epic', upTo: 0.95 },
  { rarity: 'legendary', upTo: 1.0 },
];

function rollRarity(seed: string): CollectibleRarity {
  const u = rollUnit(seed);
  for (const step of RARITY_CUMULATIVE) {
    if (u < step.upTo) return step.rarity;
  }
  return 'legendary';
}

/**
 * Выбрать редкость с учётом pity и наличия карточек в пуле.
 * Если в выбранной редкости всё собрано — спускаемся вниз, потом вверх.
 */
function resolveRarity(params: {
  seed: string;
  state: CollectiblesDropState;
  unowned: CollectiblePoolCard[];
  config: CollectiblesDropConfig;
}): CollectibleRarity | null {
  const { seed, state, unowned, config } = params;
  const available = new Set(unowned.map((c) => c.rarity));
  if (available.size === 0) return null;

  let target: CollectibleRarity;
  if (state.sinceLegendary >= config.pityLegendaryAt - 1 && available.has('legendary')) {
    target = 'legendary';
  } else if (state.sinceEpic >= config.pityEpicAt - 1 && (available.has('epic') || available.has('legendary'))) {
    target = available.has('epic') ? 'epic' : 'legendary';
  } else {
    target = rollRarity(seed);
  }

  if (available.has(target)) return target;
  const idx = RARITY_ORDER.indexOf(target);
  for (let i = idx - 1; i >= 0; i -= 1) {
    if (available.has(RARITY_ORDER[i])) return RARITY_ORDER[i];
  }
  for (let i = idx + 1; i < RARITY_ORDER.length; i += 1) {
    if (available.has(RARITY_ORDER[i])) return RARITY_ORDER[i];
  }
  return null;
}

/**
 * Полный детерминированный ролл одного события. Не мутирует входы.
 * seedBase должен включать uid и eventId — повтор даёт тот же исход.
 */
export function rollCollectibleDrop(params: {
  seedBase: string;
  kind: string;
  owned: Record<string, unknown>;
  state: CollectiblesDropState;
  isPremium: boolean;
  pool?: CollectiblePoolCard[];
  config?: CollectiblesDropConfig;
  /**
   * Множитель шанса от «Магнита коллекции» (см. collectiblesDropMultiplier).
   * По умолчанию 1 — без магнита поведение ровно прежнее.
   */
  dropChanceMultiplier?: number;
}): DropDecision {
  const { seedBase, kind, owned, state, isPremium } = params;
  const pool = params.pool ?? COLLECTIBLE_POOL;
  const config = params.config ?? COLLECTIBLES_DROP_DEFAULTS;

  // зачем: магнит умножает ТОЛЬКО шанс. Дневной кап, лимит попыток и pity он
  // не трогает — иначе подарок за 24 часа выкачал бы весь пул и обесценил
  // коллекцию. Шанс клампится единицей: 15% × 2 = 30%, но никогда > 100%.
  const magnet = Math.max(1, Math.min(
    COLLECTIBLES_MAX_DROP_MULTIPLIER,
    Number(params.dropChanceMultiplier) || 1,
  ));
  const dropChance = Math.min(1, dropChanceForKind(kind, config) * magnet);
  // Активность типа pronounce/dialog дроп не даёт вовсе (шанс 0).
  if (dropChance <= 0) return { dropped: false, reason: 'no_luck' };

  if (state.attempts >= config.dailyAttemptCap) return { dropped: false, reason: 'attempt_cap' };
  const cap = isPremium ? config.dailyDropCapPremium : config.dailyDropCapFree;
  if (state.drops >= cap) return { dropped: false, reason: 'daily_cap' };

  const unowned = pool.filter((c) => owned[c.id] == null);
  if (unowned.length === 0) return { dropped: false, reason: 'pool_exhausted' };

  // Самая первая карточка за всё время гарантирована (100%, ровно один раз),
  // дальше — общий шанс 15%. Дневной «первый дроп» больше НЕ гарантируется.
  const guaranteed = state.total === 0;
  if (!guaranteed && rollUnit(`${seedBase}:chance`) >= dropChance) {
    return { dropped: false, reason: 'no_luck' };
  }

  const rarity = resolveRarity({ seed: `${seedBase}:rarity`, state, unowned, config });
  if (!rarity) return { dropped: false, reason: 'pool_exhausted' };
  const candidates = unowned.filter((c) => c.rarity === rarity);
  const card = pickOne(`${seedBase}:pick`, candidates);
  if (!card) return { dropped: false, reason: 'pool_exhausted' };

  const epicPlus = card.rarity === 'epic' || card.rarity === 'legendary';
  const nextState = {
    sinceEpic: epicPlus ? 0 : state.sinceEpic + 1,
    sinceLegendary: card.rarity === 'legendary' ? 0 : state.sinceLegendary + 1,
  };

  // Сет собран? Секретка выдаётся в том же дропе.
  const setIds = COLLECTIBLE_SET_CARD_IDS[card.setId] ?? [];
  const secretId = COLLECTIBLE_SECRET_BY_SET[card.setId] ?? null;
  const setCompleted = setIds.length > 0
    && setIds.every((id) => id === card.id || owned[id] != null);
  const grantSecret = setCompleted && secretId != null && owned[secretId] == null;

  return {
    dropped: true,
    card,
    setCompleted,
    secretCardId: grantSecret ? secretId : null,
    bonusShards: grantSecret ? config.setBonusShards : 0,
    nextState,
  };
}

/* ── onCall: collectiblesClaimDrop ─────────────────────────── */
async function assertNotBanned(db: FirebaseFirestore.Firestore, stableUid: string): Promise<void> {
  const [userSnap, bannedSnap] = await Promise.all([
    db.collection('users').doc(stableUid).get().catch(() => null),
    db.collection('banned_users').doc(stableUid).get().catch(() => null),
  ]);
  if (bannedSnap?.exists || userSnap?.data()?.banned === true) {
    throw new HttpsError('permission-denied', 'user_banned');
  }
}

type TournamentCollectibleRoom = Pick<
  TournamentRoomDoc,
  'roomId' | 'slotId' | 'ticketsRequired' | 'testMode' | 'economySnapshot'
>;

/**
 * Tournament event ids are server-authoritative: a client-supplied room id is
 * eligible only when it resolves to the same persisted, paid, rewarding room.
 * Other collectible event kinds retain their existing behavior and perform no
 * tournament read.
 */
export async function assertCollectibleRewardEventEligible(
  eventId: string,
  loadRoom: (roomId: string) => Promise<unknown>,
): Promise<void> {
  if (!eventId.startsWith('tournament:')) return;

  const roomId = eventId.slice('tournament:'.length);
  const rawRoom = await loadRoom(roomId);
  if (!rawRoom || typeof rawRoom !== 'object' || Array.isArray(rawRoom)) {
    throw new HttpsError('failed-precondition', 'tournament_collectible_room_invalid');
  }

  const room = rawRoom as Partial<TournamentCollectibleRoom>;
  if (room.roomId !== roomId || typeof room.slotId !== 'string' || room.slotId.length === 0) {
    throw new HttpsError('failed-precondition', 'tournament_collectible_room_invalid');
  }

  const persistedRoom = room as TournamentCollectibleRoom;
  const entryGems = persistedRoom.economySnapshot
    ? normalizeTournamentEconomy(persistedRoom.economySnapshot).entryGems
    : null;
  const ticketsRequired = persistedRoom.ticketsRequired;
  if (isTournamentTestRoom(persistedRoom)
    || typeof ticketsRequired !== 'number'
    || !Number.isSafeInteger(ticketsRequired)
    || ticketsRequired <= 0
    || entryGems === 0) {
    throw new HttpsError('failed-precondition', 'tournament_collectible_reward_disabled');
  }
}

export const collectiblesClaimDrop = onCall(HOT_CALLABLE_OPTIONS, async (request) => {
  const authUid = request.auth?.uid;
  if (!authUid) throw new HttpsError('unauthenticated', 'auth_required');

  const eventIdRaw = String(request.data?.eventId ?? '').trim();
  if (!EVENT_ID_RE.test(eventIdRaw)) {
    throw new HttpsError('invalid-argument', 'bad_event_id');
  }
  // Collectibles is a shared callable, so it needs its own fail-closed check:
  // an old tournament client must not bypass the retired tournament callables
  // by submitting a tournament event through this otherwise-live endpoint.
  if (eventIdRaw.startsWith('tournament:')) assertTournamentsReleased();

  const db = admin.firestore();
  await assertCollectibleRewardEventEligible(eventIdRaw, async (roomId) => {
    const roomSnap = await db.collection(TOURNAMENT_ROOMS_COLLECTION).doc(roomId).get();
    return roomSnap.exists ? roomSnap.data() : null;
  });
  // stableId НИКОГДА не берём из тела запроса (см. phraseman security audit).
  const stableUid = await resolveStableUidForAuth(db, authUid);
  await assertNotBanned(db, stableUid);

  // Тюнинг дропа из «Пульта» (remote_config/app.numbers). Читаем ДО транзакции:
  // это отдельный документ, не входит в read-set юзер-транзакции. Fallback на дефолты.
  const dropConfig = await resolveCollectiblesDropConfig(db);

  const now = Date.now();
  const today = todayStrUtc();
  const userRef = db.collection('users').doc(stableUid);
  const claimRef = userRef.collection('collectible_claims').doc(safeId(eventIdRaw));

  return db.runTransaction(async (tx) => {
    const [claimSnap, userSnap] = await Promise.all([tx.get(claimRef), tx.get(userRef)]);

    // Идемпотентность: тот же eventId → тот же результат, без второй выдачи.
    if (claimSnap.exists) {
      const prev = claimSnap.data() ?? {};
      return {
        ok: true,
        alreadyClaimed: true,
        dropped: prev.cardId != null,
        card: prev.cardId
          ? { id: prev.cardId, setId: prev.setId, rarity: prev.rarity }
          : null,
        setCompleted: prev.setCompleted === true,
        secretCardId: prev.secretCardId ?? null,
        bonusShards: Math.max(0, readInt(prev.shards, 0)),
      };
    }

    const user = userSnap.data() || {};
    const progress = getProgress(user);
    const isPremium = isPremiumAccessActive(progress, now);
    const owned = parseJsonObject(getExistingField(user, COLLECTIBLES_OWNED_KEY));
    const state = parseDropState(getExistingField(user, COLLECTIBLES_STATE_KEY), today);

    const decision = rollCollectibleDrop({
      seedBase: `collect:${stableUid}:${eventIdRaw}`,
      kind: eventIdRaw.split(':')[0],
      owned,
      state,
      isPremium,
      config: dropConfig,
      // зачем (аудит 2026-08-24): «Магнит коллекции» Season Pass наконец влияет
      // на шанс. `progress` уже прочитан этой же транзакцией — лишних чтений нет.
      dropChanceMultiplier: collectiblesDropMultiplier(progress, now),
    });

    if (!decision.dropped) {
      // Попытку учитываем (отсекает перебор eventId), леджер не пишем:
      // событие не «потрачено», а ролл детерминирован по сиду.
      // зачем (аудит 2026-08-24): с «Магнитом коллекции» исход неудачной попытки
      // перестал быть вечно неизменным — повтор ТОГО ЖЕ eventId под активным
      // магнитом может выпасть, хотя без магнита не выпадал. Это безопасно:
      // лимит попыток (dailyAttemptCap) и дневной кап дропов не обходятся, а
      // удачный дроп по-прежнему пишет леджер и второй раз не выдаётся.
      const nextState: CollectiblesDropState = { ...state, attempts: state.attempts + 1 };
      tx.set(userRef, {
        progress: { [COLLECTIBLES_STATE_KEY]: JSON.stringify(nextState) },
        updatedAt: now,
      }, { merge: true });
      return { ok: true, dropped: false, reason: decision.reason };
    }

    const newOwned: Record<string, unknown> = { ...owned, [decision.card.id]: now };
    if (decision.secretCardId) newOwned[decision.secretCardId] = now;
    const nextState: CollectiblesDropState = {
      date: today,
      drops: state.drops + 1,
      attempts: state.attempts + 1,
      sinceEpic: decision.nextState.sinceEpic,
      sinceLegendary: decision.nextState.sinceLegendary,
      total: state.total + 1,
    };

    const progressPatch: Record<string, unknown> = {
      [COLLECTIBLES_OWNED_KEY]: JSON.stringify(newOwned),
      [COLLECTIBLES_STATE_KEY]: JSON.stringify(nextState),
    };
    const userPatch: Record<string, unknown> = { progress: progressPatch, updatedAt: now };

    if (decision.bonusShards > 0) {
      appendExternalEconomyEvent(tx, userRef, {
        source: 'collectibles',
        eventId: eventIdRaw,
        ownerStableId: stableUid,
        delta: decision.bonusShards,
        reason: 'collectible_set_bonus',
        kind: 'collectible_set_bonus',
        subjectId: decision.card.setId,
        payload: { cardId: decision.card.id, setId: decision.card.setId },
        createdAtMs: now,
      });
    }

    tx.set(claimRef, {
      uid: stableUid,
      authUid,
      eventId: eventIdRaw,
      kind: eventIdRaw.split(':')[0],
      cardId: decision.card.id,
      setId: decision.card.setId,
      rarity: decision.card.rarity,
      setCompleted: decision.setCompleted,
      secretCardId: decision.secretCardId,
      shards: decision.bonusShards,
      dropsToday: nextState.drops,
      createdAt: now,
    });
    tx.set(userRef, userPatch, { merge: true });
    if (decision.bonusShards > 0) {
      tx.set(userRef.collection('shard_log').doc(), {
        ts: new Date(now).toISOString(),
        type: 'earn',
        amount: decision.bonusShards,
        reason: 'collectible_set_bonus',
        authority: 'external_event',
        setId: decision.card.setId,
      });
    }

    return {
      ok: true,
      dropped: true,
      card: { id: decision.card.id, setId: decision.card.setId, rarity: decision.card.rarity },
      setCompleted: decision.setCompleted,
      secretCardId: decision.secretCardId,
      bonusShards: decision.bonusShards,
      ownedCount: Object.keys(newOwned).length,
      dropsToday: nextState.drops,
      dropsCapToday: isPremium ? dropConfig.dailyDropCapPremium : dropConfig.dailyDropCapFree,
    };
  });
});
