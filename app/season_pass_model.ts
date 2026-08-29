// ════════════════════════════════════════════════════════════════════════════
// season_pass_model.ts — Season Pass: сезон-квартал, уровни за заработанные руны.
// Этап 1 (каркас): только прогресс, без клеймов наград и без покупки платной
// дорожки — они приходят этапом 2 с серверными callable.
//
// зачем 2026-08-03 (владелец: «сезон с главной надо перенести в турнир и
// переделать чтобы сезон очки капали не за опыт а за звёзды»): раньше дорожка
// качалась ЛЮБЫМ earned-XP из registerXP — уроками, повторениями, бустами.
// Сезон из-за этого не был связан с турнирами вообще: пропуск закрывался
// пассивной учёбой, а турнирные звёзды никуда не вели. Теперь единственный
// источник прогресса — звёзды, заработанные в турнире, поэтому сезон стал
// наградой именно за соревновательную игру.
//
// Владелец 2026-08-03 выбрал ЖЁСТКИЙ вариант: уроки сезон НЕ двигают вовсе.
// ════════════════════════════════════════════════════════════════════════════
import AsyncStorage from '@react-native-async-storage/async-storage';
import { emitAppEvent } from './events';
import {
  isCurrentAccountGeneration,
  withAccountTransitionLock,
  type AccountTransitionLockLease,
  type AccountGenerationToken,
} from './account_generation';

// зачем: ключ сменён с season_pass_xp_v1 — валюта дорожки другая, и старое
// значение в звёздах читалось бы как гигантский прогресс (400 XP ≠ 400⭐).
// Релиза ещё не было, накопленного прогресса ни у кого нет (подтверждено
// владельцем), поэтому миграция не нужна: чистый старт.
// Legacy Arena compatibility journal. The Season screen must not use it as a
// second source of truth: canonical unlock progress comes from the owner-scoped
// rune checkpoint below. Arena may keep writing this compatibility journal.
const STORAGE_KEY = 'season_pass_stars_v1';

export const SEASON_PASS_LEVELS = 60;
export const SEASON_PASS_CHAPTER_SIZE = 20;

/**
 * Калибровка шкалы (владелец 2026-08-03: «просчитать систему чтобы было сложно
 * но реализуемо», цель — 1 турнир в день ровно в срок).
 *
 * Потолок за ИДЕАЛЬНЫЙ турнир — ~68⭐ (16 заданий: раунд 1 сложности 1 → 4×3⭐,
 * раунд 2 → 3 задания + поле пар, раунд 3 сложности 2 → 4×4⭐, раунд 4
 * сложности 3 → 3×5⭐ + поле пар). Поле пар даёт звезду за каждую верную пару
 * плюс надбавку за полный сбор, то есть до 6-8⭐. Реальный крепкий игрок
 * ошибается и берёт ~45⭐ — калибровка построена именно на этом числе, а не на
 * потолке, поэтому запас переживает уточнения шкалы пар.
 *
 * Бюджет квартала: 90 дней × 45⭐ ≈ 4050⭐. Закладываем ~10% на пропущенные дни
 * → цель ≈ 3600⭐ на 60 уровней.
 *
 *   уровни 1–10  × 35⭐ =  350⭐   (быстрая вкатка: ~8 дней)
 *   уровни 11–60 × 65⭐ = 3250⭐
 *   ─────────────────────────────
 *   итого               3600⭐   ≈ 80 дней при 45⭐/день
 *
 * Остаток ~10 дней — запас на пропуски. Игрок, идущий на 2 турнира в день,
 * закрывает сезон примерно за 40 дней; играющий раз в два дня — не успевает,
 * и это осознанная планка сложности.
 */
const EARLY_LEVELS = 10;
const EARLY_LEVEL_COST_STARS = 35;
const LATE_LEVEL_COST_STARS = 65;

export function seasonPassLevelCostStars(level: number): number {
  return level <= EARLY_LEVELS ? EARLY_LEVEL_COST_STARS : LATE_LEVEL_COST_STARS;
}

/** Полная стоимость сезона в звёздах — для витрины и тестов баланса. */
export const SEASON_PASS_TOTAL_STARS =
  EARLY_LEVELS * EARLY_LEVEL_COST_STARS
  + (SEASON_PASS_LEVELS - EARLY_LEVELS) * LATE_LEVEL_COST_STARS;

/**
 * Сколько ВСЕГО звёзд за сезон нужно накопить, чтобы открылся данный уровень.
 *
 * зачем 2026-08-03 (владелец: «убери полоску уровня, просто возле каждого
 * подарка показывай сколько звёзд надо набрать чтобы он открылся»): полоска
 * показывала прогресс ТОЛЬКО текущего уровня, и дальние подарки оставались без
 * цены — игрок не понимал, далеко ли до конкретной награды. Порог накопительный
 * (а не «осталось набрать»), потому что он обязан быть постоянной меткой
 * подарка: сравнивается напрямую с общим счётом звёзд в шапке и не исчезает,
 * когда уровень уже пройден.
 */
export function seasonPassStarsToUnlockLevel(level: number): number {
  const target = Math.min(SEASON_PASS_LEVELS, Math.max(0, Math.floor(level)));
  const earlyLevels = Math.min(EARLY_LEVELS, target);
  const lateLevels = Math.max(0, target - EARLY_LEVELS);
  return earlyLevels * EARLY_LEVEL_COST_STARS + lateLevels * LATE_LEVEL_COST_STARS;
}

/** 'YYYY-Qn' — сезон равен календарному кварталу, кронов не требует. */
export function getSeasonPassSeasonId(now: Date = new Date()): string {
  const q = Math.floor(now.getUTCMonth() / 3) + 1;
  return `${now.getUTCFullYear()}-Q${q}`;
}

export function seasonPassEndsAtMs(now: Date = new Date()): number {
  const q = Math.floor(now.getUTCMonth() / 3) + 1;
  const endMonth = q * 3; // следующий квартал начинается с этого месяца (0-based: q*3)
  return Date.UTC(now.getUTCFullYear(), endMonth, 1, 0, 0, 0, 0);
}

export function seasonPassDaysLeft(now: Date = new Date()): number {
  return Math.max(0, Math.ceil((seasonPassEndsAtMs(now) - now.getTime()) / (24 * 60 * 60 * 1000)));
}

/**
 * зачем 2026-08-03: поля переименованы Xp → Stars намеренно, а не «для красоты».
 * Валюта дорожки сменилась, и одинаковое имя поля при разном смысле — прямой
 * путь к тому, что какой-нибудь экран продолжит показывать «400» там, где
 * теперь «35». Компилятор обязан поймать КАЖДОГО потребителя.
 */
export interface SeasonPassProgress {
  seasonId: string;
  /** Максимум уже полученных рун, зафиксированный как прогресс сезона. */
  totalStars: number;
  level: number;          // 0..SEASON_PASS_LEVELS (0 = ещё не открыт первый)
  intoLevelStars: number; // сколько звёзд набрано внутри текущего уровня
  levelCostStars: number; // цена текущего (следующего открываемого) уровня
  chapter: 1 | 2 | 3;
}

export function computeSeasonPassProgress(seasonId: string, totalStars: number): SeasonPassProgress {
  let remaining = Math.max(0, Math.floor(totalStars));
  let level = 0;
  while (level < SEASON_PASS_LEVELS) {
    const cost = seasonPassLevelCostStars(level + 1);
    if (remaining < cost) break;
    remaining -= cost;
    level += 1;
  }
  const chapter = (Math.min(2, Math.floor(Math.max(0, level - (level > 0 ? 1 : 0)) / SEASON_PASS_CHAPTER_SIZE)) + 1) as 1 | 2 | 3;
  return {
    seasonId,
    totalStars: Math.max(0, Math.floor(totalStars)),
    level,
    intoLevelStars: level >= SEASON_PASS_LEVELS ? 0 : remaining,
    levelCostStars: level >= SEASON_PASS_LEVELS ? 0 : seasonPassLevelCostStars(level + 1),
    chapter,
  };
}

/**
 * A level is reachable only from progress belonging to the season currently
 * rendered. This explicit season binding prevents a mounted Q3 screen from
 * lending its high-water level to Q4 during the UTC-quarter transition.
 */
export function isSeasonPassLevelReached(
  progress: SeasonPassProgress,
  renderSeasonId: string,
  level: number,
): boolean {
  return progress.seasonId === renderSeasonId
    && Number.isSafeInteger(level)
    && level >= 1
    && level <= SEASON_PASS_LEVELS
    && progress.level >= level;
}

type SeasonPassRuneProgressInput = Readonly<{ balance: unknown; earnedTotal: unknown }>;

export type SeasonPassRuneCheckpointV1 = Readonly<{
  schemaVersion: 'season-pass-rune-checkpoint.v1';
  ownerStableId: string;
  seasonId: string;
  baselineWalletBasis: number;
  highWaterProgress: number;
}>;

export const SEASON_PASS_RUNE_CHECKPOINT_KEY_PREFIX = 'season_pass_rune_checkpoint_v1:';
export const SEASON_PASS_ENTITLEMENT_KEY_PREFIX = 'season_pass_entitlement_v1:';
const LEGACY_SEASON_PASS_ENTITLEMENT_KEY = 'season_pass_owned_v1';
const SEASON_PASS_RUNE_CHECKPOINT_MIGRATION_SEASON_ID = '2026-Q3';

type SeasonPassEntitlementV1 = Readonly<{
  schemaVersion: 'season-pass-entitlement.v1';
  ownerStableId: string;
  seasonId: string;
  purchasedAtMs: number;
}>;

function normalizedRunes(value: unknown): number {
  const normalized = Math.trunc(Number(value));
  return Number.isSafeInteger(normalized) && normalized > 0 ? normalized : 0;
}

function runeWalletBasis(wallet: SeasonPassRuneProgressInput): number {
  return Math.max(normalizedRunes(wallet.balance), normalizedRunes(wallet.earnedTotal));
}

export function seasonPassRuneCheckpointKey(ownerStableId: string): string {
  const owner = ownerStableId.trim();
  if (!owner || owner.includes('/')) throw new Error('season_pass_rune_checkpoint_owner_invalid');
  return `${SEASON_PASS_RUNE_CHECKPOINT_KEY_PREFIX}${encodeURIComponent(owner)}`;
}

export function seasonPassEntitlementStorageKey(ownerStableId: string): string {
  const owner = ownerStableId.trim();
  if (!owner || owner.includes('/')) throw new Error('season_pass_entitlement_owner_invalid');
  return `${SEASON_PASS_ENTITLEMENT_KEY_PREFIX}${encodeURIComponent(owner)}`;
}

function entitlementRecord(
  ownerStableId: string,
  seasonId: string,
  purchasedAtMs: number,
): SeasonPassEntitlementV1 {
  if (!/^\d{4}-Q[1-4]$/.test(seasonId) || !Number.isSafeInteger(purchasedAtMs) || purchasedAtMs < 0) {
    throw new Error('season_pass_entitlement_invalid');
  }
  seasonPassEntitlementStorageKey(ownerStableId);
  return Object.freeze({
    schemaVersion: 'season-pass-entitlement.v1',
    ownerStableId,
    seasonId,
    purchasedAtMs,
  });
}

function parseEntitlement(value: unknown): SeasonPassEntitlementV1 | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const record = value as Partial<SeasonPassEntitlementV1>;
  return record.schemaVersion === 'season-pass-entitlement.v1'
    && typeof record.ownerStableId === 'string' && !!record.ownerStableId.trim()
    && typeof record.seasonId === 'string' && /^\d{4}-Q[1-4]$/.test(record.seasonId)
    && Number.isSafeInteger(record.purchasedAtMs) && Number(record.purchasedAtMs) >= 0
    ? record as SeasonPassEntitlementV1
    : null;
}

export function prepareSeasonPassEntitlementLocalWrite(
  token: AccountGenerationToken,
  now: Date = new Date(),
  purchasedAtMs: number = now.getTime(),
): readonly [string, string] {
  const owner = token.stableId?.trim();
  if (!owner || !isCurrentAccountGeneration(token, owner)) {
    throw new Error('season_pass_entitlement_identity_changed');
  }
  const record = entitlementRecord(owner, getSeasonPassSeasonId(now), purchasedAtMs);
  return Object.freeze([
    seasonPassEntitlementStorageKey(owner),
    JSON.stringify(record),
  ] as const);
}

/**
 * Reads only the active owner's entitlement. The unscoped legacy record is
 * claimed by exactly one owner by tagging it before materializing the scoped
 * key, so a second account can never inherit the same purchase.
 */
export async function hydrateSeasonPassEntitlementForAccount(
  token: AccountGenerationToken,
  now: Date = new Date(),
  inheritedLease?: AccountTransitionLockLease,
): Promise<boolean> {
  const owner = token.stableId?.trim();
  const seasonId = getSeasonPassSeasonId(now);
  if (!owner || !isCurrentAccountGeneration(token, owner)) return false;
  try {
    return await withAccountTransitionLock(async () => {
      if (!isCurrentAccountGeneration(token, owner)) return false;
      const scopedKey = seasonPassEntitlementStorageKey(owner);
      const scopedRaw = await AsyncStorage.getItem(scopedKey);
      if (!isCurrentAccountGeneration(token, owner)) return false;
      if (scopedRaw) {
        let parsed: unknown;
        try { parsed = JSON.parse(scopedRaw) as unknown; } catch { return false; }
        const scoped = parseEntitlement(parsed);
        return !!scoped && scoped.ownerStableId === owner && scoped.seasonId === seasonId;
      }

      const legacyRaw = await AsyncStorage.getItem(LEGACY_SEASON_PASS_ENTITLEMENT_KEY);
      if (!legacyRaw || !isCurrentAccountGeneration(token, owner)) return false;
      let legacy: Record<string, unknown>;
      try { legacy = JSON.parse(legacyRaw) as Record<string, unknown>; } catch { return false; }
      if (!legacy || typeof legacy !== 'object' || legacy.seasonId !== seasonId) return false;
      const taggedOwner = typeof legacy.ownerStableId === 'string' ? legacy.ownerStableId.trim() : '';
      if (taggedOwner && taggedOwner !== owner) return false;
      const purchasedAtMs = Number.isSafeInteger(legacy.purchasedAtMs)
        ? Number(legacy.purchasedAtMs)
        : Number.isSafeInteger(legacy.purchasedAt) ? Number(legacy.purchasedAt) : 0;
      const record = entitlementRecord(owner, seasonId, purchasedAtMs);
      if (!taggedOwner) {
        await AsyncStorage.setItem(LEGACY_SEASON_PASS_ENTITLEMENT_KEY, JSON.stringify(record));
        if (!isCurrentAccountGeneration(token, owner)) return false;
      }
      await AsyncStorage.setItem(scopedKey, JSON.stringify(record));
      return isCurrentAccountGeneration(token, owner);
    }, inheritedLease);
  } catch {
    return false;
  }
}

function parseSeasonPassRuneCheckpoint(input: unknown): SeasonPassRuneCheckpointV1 | null {
  if (!input || typeof input !== 'object' || Array.isArray(input)) return null;
  const value = input as Partial<SeasonPassRuneCheckpointV1>;
  const keys = Object.keys(value).sort();
  const expected = [
    'schemaVersion', 'ownerStableId', 'seasonId', 'baselineWalletBasis', 'highWaterProgress',
  ].sort();
  if (keys.length !== expected.length
    || !keys.every((key, index) => key === expected[index])
    || value.schemaVersion !== 'season-pass-rune-checkpoint.v1'
    || typeof value.ownerStableId !== 'string' || !value.ownerStableId.trim()
    || typeof value.seasonId !== 'string' || !/^\d{4}-Q[1-4]$/.test(value.seasonId)
    || !Number.isSafeInteger(value.baselineWalletBasis) || Number(value.baselineWalletBasis) < 0
    || !Number.isSafeInteger(value.highWaterProgress) || Number(value.highWaterProgress) < 0) return null;
  return value as SeasonPassRuneCheckpointV1;
}

export function transitionSeasonPassRuneCheckpoint(input: Readonly<{
  ownerStableId: string;
  checkpoint: unknown | null;
  wallet: SeasonPassRuneProgressInput;
  now?: Date;
}>): Readonly<{ checkpoint: SeasonPassRuneCheckpointV1; progress: SeasonPassProgress }> {
  const owner = input.ownerStableId.trim();
  seasonPassRuneCheckpointKey(owner);
  const seasonId = getSeasonPassSeasonId(input.now ?? new Date());
  const basis = runeWalletBasis(input.wallet);
  let next: SeasonPassRuneCheckpointV1;

  if (input.checkpoint === null) {
    // One-time rollout migration for the already-running 2026-Q3 Season:
    // existing received runes count immediately. A first observation in every
    // later quarter starts from that quarter's current wallet basis instead.
    const migrateExistingSeason = seasonId === SEASON_PASS_RUNE_CHECKPOINT_MIGRATION_SEASON_ID;
    next = Object.freeze({
      schemaVersion: 'season-pass-rune-checkpoint.v1',
      ownerStableId: owner,
      seasonId,
      baselineWalletBasis: migrateExistingSeason ? 0 : basis,
      highWaterProgress: migrateExistingSeason ? basis : 0,
    });
  } else {
    const current = parseSeasonPassRuneCheckpoint(input.checkpoint);
    if (!current) throw new Error('season_pass_rune_checkpoint_corrupt');
    if (current.ownerStableId !== owner) throw new Error('season_pass_rune_checkpoint_owner_mismatch');
    next = current.seasonId === seasonId
      ? Object.freeze({
        ...current,
        highWaterProgress: Math.max(
          current.highWaterProgress,
          Math.max(0, basis - current.baselineWalletBasis),
        ),
      })
      : Object.freeze({
        schemaVersion: 'season-pass-rune-checkpoint.v1',
        ownerStableId: owner,
        seasonId,
        baselineWalletBasis: basis,
        highWaterProgress: 0,
      });
  }
  return Object.freeze({
    checkpoint: next,
    progress: computeSeasonPassProgress(next.seasonId, next.highWaterProgress),
  });
}

export async function observeSeasonPassRuneProgressForAccount(
  token: AccountGenerationToken,
  wallet: SeasonPassRuneProgressInput,
  now: Date = new Date(),
  quality: 'durable' | 'fallback' = 'durable',
): Promise<SeasonPassProgress | null> {
  const owner = token.stableId?.trim();
  if (!owner || !isCurrentAccountGeneration(token, owner)) return null;
  return withAccountTransitionLock(async () => {
    if (!isCurrentAccountGeneration(token, owner)) return null;
    const key = seasonPassRuneCheckpointKey(owner);
    const raw = await AsyncStorage.getItem(key);
    if (!isCurrentAccountGeneration(token, owner)) return null;
    let checkpoint: unknown | null = null;
    if (raw !== null) {
      try { checkpoint = JSON.parse(raw) as unknown; } catch {
        throw new Error('season_pass_rune_checkpoint_corrupt');
      }
    }
    const transitioned = transitionSeasonPassRuneCheckpoint({ ownerStableId: owner, checkpoint, wallet, now });
    if (!isCurrentAccountGeneration(token, owner)) return null;
    // A snapshot fallback is intentionally display-only. It may be incomplete,
    // so it must never establish the next quarter's durable wallet baseline.
    // Once a full projection is available, the durable observation performs
    // the authoritative transition from the still-preserved old checkpoint.
    if (quality === 'fallback') return transitioned.progress;
    await AsyncStorage.setItem(key, JSON.stringify(transitioned.checkpoint));
    return isCurrentAccountGeneration(token, owner) ? transitioned.progress : null;
  });
}

/**
 * Final mutation-time authorization for a Season claim. UI state is only a
 * preview: the durable owner checkpoint, current account generation and UTC
 * quarter must all still agree immediately before a gift is created.
 */
export async function authorizeSeasonPassClaimForAccount(
  token: AccountGenerationToken,
  requestedSeasonId: string,
  level: number,
  now: Date = new Date(),
  inheritedLease?: AccountTransitionLockLease,
): Promise<boolean> {
  const owner = token.stableId?.trim();
  if (!owner || !Number.isSafeInteger(level) || level < 1 || level > SEASON_PASS_LEVELS
    || requestedSeasonId !== getSeasonPassSeasonId(now)
    || !isCurrentAccountGeneration(token, owner)) return false;
  try {
    return await withAccountTransitionLock(async () => {
      if (!isCurrentAccountGeneration(token, owner)) return false;
      const raw = await AsyncStorage.getItem(seasonPassRuneCheckpointKey(owner));
      if (!raw || !isCurrentAccountGeneration(token, owner)) return false;
      let parsed: unknown;
      try { parsed = JSON.parse(raw) as unknown; } catch { return false; }
      const checkpoint = parseSeasonPassRuneCheckpoint(parsed);
      if (!checkpoint || checkpoint.ownerStableId !== owner
        || checkpoint.seasonId !== requestedSeasonId
        || !isCurrentAccountGeneration(token, owner)) return false;
      return checkpoint.highWaterProgress >= seasonPassStarsToUnlockLevel(level);
    }, inheritedLease);
  } catch {
    return false;
  }
}

type Stored = { seasonId: string; stars: number };

// Синхронный кэш для мгновенного первого кадра плашки
// (Performance Bible: первый кадр = финальная геометрия, без default-then-patch).
let cache: Stored | null = null;
let hydrated = false;

function freshStored(): Stored {
  return { seasonId: getSeasonPassSeasonId(), stars: 0 };
}

export function peekSeasonPassProgress(): SeasonPassProgress {
  const s = cache && cache.seasonId === getSeasonPassSeasonId() ? cache : freshStored();
  return computeSeasonPassProgress(s.seasonId, s.stars);
}

export async function hydrateSeasonPassProgress(): Promise<SeasonPassProgress> {
  // зачем: last-write-guard — если между стартом чтения диска и его завершением
  // addSeasonPassStars успел поднять кэш в памяти (турнир закончился и игрок
  // вернулся на экран одновременно), диск не должен откатывать прогресс-бар
  // назад. Диск побеждает только если он реально свежее (или начался новый сезон).
  const beforeSeasonId = cache?.seasonId;
  const beforeStars = cache?.stars ?? -1;
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    const parsed: Stored | null = raw ? JSON.parse(raw) : null;
    const fromDisk = parsed && parsed.seasonId === getSeasonPassSeasonId()
      ? { seasonId: parsed.seasonId, stars: Math.max(0, Math.floor(Number(parsed.stars) || 0)) }
      : freshStored();
    // guard-ok: это сезонный счётчик, а не баланс — обнуление при смене квартала
    // и есть контракт сезона (user_total_xp/жемчуг не затрагиваются вообще).
    // Ветка ниже — не «понижение», а отказ применить УСТАРЕВШЕЕ чтение поверх
    // уже более свежей записи того же сезона; при смене сезона диск всегда побеждает.
    cache = (fromDisk.seasonId === beforeSeasonId && fromDisk.stars < beforeStars)
      ? cache
      : fromDisk;
  } catch {
    cache = cache ?? freshStored();
  }
  hydrated = true;
  return peekSeasonPassProgress();
}

/**
 * Начисление сезонных звёзд за завершённый турнирный раунд.
 *
 * зачем 2026-08-03 (владелец: «сезон очки капали не за опыт а за звёзды»):
 * здесь была addSeasonPassXp, которую дёргал registerXP на ЛЮБОЕ начисление
 * опыта — сезон качался уроками и бустами, а турниры на него не влияли вовсе.
 * Теперь единственный вызывающий — турнирный экран, и звёзды приходят только
 * из подтверждённого сервером результата.
 *
 * Идемпотентность по раунду обязательна: экран может перемонтироваться, а
 * снапшот комнаты — прийти повторно. Ключ раунда гарантирует, что один и тот же
 * результат не начислится дважды.
 */
export async function addSeasonPassStars(delta: number): Promise<void> {
  if (!Number.isFinite(delta) || delta <= 0) return;
  if (!hydrated) await hydrateSeasonPassProgress();
  const current = cache && cache.seasonId === getSeasonPassSeasonId() ? cache : freshStored();
  cache = { seasonId: current.seasonId, stars: current.stars + Math.floor(delta) };
  emitAppEvent('season_pass_stars_changed', { totalStars: cache.stars });
  try {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(cache));
  } catch {
    // Ошибка диска не откатывает кэш: следующая гидрация возьмёт последний
    // успешно записанный снапшот.
  }
}

/** Комнаты, уже зачтённые в сезон. Ключ переживает перезапуск приложения. */
const CREDITED_ROOMS_KEY = 'season_pass_credited_rooms_v1';

/**
 * Зачесть итог турнира в сезон РОВНО ОДИН РАЗ.
 *
 * зачем 2026-08-03: экран результатов перемонтируется (свернул/развернул
 * приложение, ушёл в разбор и вернулся), а снапшот комнаты приходит повторно на
 * каждое обновление документа. Без ключа комнаты один турнир начислялся бы
 * столько раз, сколько раз экран увидел финальный счёт, — и дорожка сезона
 * накручивалась бы простым переоткрытием экрана.
 *
 * Хранится список последних комнат, а не флаг: игрок за сезон играет много
 * турниров, и каждый должен быть зачтён свой ровно один раз. Список подрезаем,
 * чтобы ключ не рос бесконечно — 200 комнат заведомо перекрывают квартал при
 * трёх слотах в день.
 */
const CREDITED_ROOMS_LIMIT = 200;

export async function creditTournamentStarsToSeason(roomId: string, stars: number): Promise<boolean> {
  if (!roomId || !Number.isFinite(stars) || stars <= 0) return false;
  const seasonId = getSeasonPassSeasonId();
  const entryKey = `${seasonId}:${roomId}`;
  try {
    const raw = await AsyncStorage.getItem(CREDITED_ROOMS_KEY);
    const credited: string[] = raw ? JSON.parse(raw) : [];
    if (Array.isArray(credited) && credited.includes(entryKey)) return false;
    const next = [entryKey, ...(Array.isArray(credited) ? credited : [])].slice(0, CREDITED_ROOMS_LIMIT);
    // Отметку ставим ДО начисления: повторный вход, случившийся между двумя
    // операциями, не должен успеть начислить второй раз. Потерянное начисление
    // безопаснее задвоенного — сезон не должен накручиваться.
    await AsyncStorage.setItem(CREDITED_ROOMS_KEY, JSON.stringify(next));
  } catch {
    // Диск недоступен — не начисляем вовсе, чтобы не задвоить при следующем
    // запуске, когда отметка так и не сохранится.
    return false;
  }
  await addSeasonPassStars(stars);
  return true;
}
