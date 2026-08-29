/**
 * league_week_runes.ts — очки лиги = РУНЫ, заработанные за текущую ISO-неделю.
 *
 * зачем (владелец, 2026-08-26): «в разделе лига очки это руны», «весь раздел
 * лига переходит на руны, никакого ХП, только руны». До этого лига брала число
 * из `getMyWeekPoints()` — общего недельного счётчика ОПЫТА (`weekly_xp` /
 * `week_points_v2`), который делят Зал славы, экран друзей и серверные
 * лидерборды. Переключать его целиком нельзя: те разделы про опыт и остаются
 * про опыт. Поэтому у лиги появился СВОЙ источник — этот модуль.
 *
 * Откуда берётся правда:
 *   1. Сервер. Журнал рун (functions/src/stars_ledger.ts) ведёт `stars.weekEarned`
 *      с ключом ISO-недели `stars.weekKey` — это авторитетное «заработано игрой
 *      за неделю». Класс `grant` (подарок за вход, спин, обмен) в него НЕ идёт:
 *      лига обязана мерить игру, а не подарки, иначе бонус 300 за вход разом
 *      закинул бы новичка в зону повышения.
 *   2. Локальный догон. Серверный снимок живёт с TTL 6 часов (правило владельца
 *      «чужие цифры раз в 6 часов»), а свои очки обязаны быть живыми — иначе
 *      игрок закрывает занятие и не видит движения. Догон копит дельты
 *      `starsEarnedTotal` поверх снимка и обнуляется, когда приходит более
 *      свежий серверный снимок или сменилась неделя. Это не дельта баланса:
 *      подарки и траты лигу не двигают.
 *
 * Firebase-экономия: НОЛЬ собственных чтений. Серверную часть отдаёт
 * `runes_wallet_stats.loadRunesServerStats()` — то самое одно чтение
 * `users/{uid}` с кэшем на 6 часов, которое уже делает раздел «Руны».
 *
 * Почему не берём баланс кошелька: баланс уменьшается при тратах (открытие
 * занятия — это `spend`), и очки лиги начали бы падать посреди недели. Лига
 * считает ПРИТОК, а не остаток.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

import {
  captureAccountGeneration,
  isCurrentAccountGeneration,
} from './account_generation';
import { emitAppEvent } from './events';
import { DebugLogger } from './debug-logger';
import {
  accountScopedLeagueRunesStorageKey,
  canonicalLeagueLocalOverlay,
  leagueEarnedDelta,
  remainingLeagueRunesCatchup,
} from './league_week_runes_delta';
import { loadRunesServerStats, peekRunesServerStats } from './runes_wallet_stats';
import { peekRunesBalance, subscribeRunesSnapshot } from './runes_system';
import { starsWeekEarned } from './stars_view';

/**
 * Локальный догон: сколько рун пришло ПОСЛЕ последнего серверного снимка.
 * Живёт на диске, чтобы перезапуск приложения не откатывал очки к снимку
 * шестичасовой давности.
 */
/**
 * Ключ ISO-недели. Формула — копия getWeekKey/getWeekId (hall_of_fame_utils,
 * league_engine, functions/src/progress_events), сверена с ними символ в символ.
 *
 * зачем дубль, а не импорт: hall_of_fame_utils тянет firestore_leagues, а тот —
 * этот модуль. Импорт замкнул бы цикл, и на старте бандлер отдал бы undefined
 * вместо функции. Формула ISO-недели за десять лет не менялась ни разу, цена
 * дубля ниже цены цикла.
 */
function isoWeekKey(now: Date): string {
  const date = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const day = date.getUTCDay() || 7;
  date.setUTCDate(date.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  const weekNum = Math.ceil((((date.getTime() - yearStart.getTime()) / 86_400_000) + 1) / 7);
  return `${date.getUTCFullYear()}-W${String(weekNum).padStart(2, '0')}`;
}

const CATCHUP_KEY = 'league_week_runes_catchup_v1';
const LAST_FINAL_KEY = 'league_week_runes_last_final_v1';

type Catchup = Readonly<{
  /** ISO-неделя, к которой относится догон. Смена недели его обнуляет. */
  weekKey: string;
  /** Серверный снимок, поверх которого копится догон (защита от двойного счёта). */
  baseFetchedAtMs: number;
  /** Заработок недели в базовом серверном снимке; null = снимка ещё не было. */
  baseWeekEarned: number | null;
  /** Сумма дельт начислений после снимка. Только рост: траты сюда не идут. */
  delta: number;
  /**
   * Надбавка горячих часов за неделю — ОТДЕЛЬНО от догона.
   *
   * зачем: сервер о горячих часах не знает, его `weekEarned` содержит
   * одинарные руны. Лежи надбавка в `delta`, первый же свежий снимок
   * обнулил бы её вместе с догоном, и удвоение бесследно исчезло бы через
   * шесть часов. Этот счётчик снимком не гасится — только сменой недели.
   */
  hotBonus: number;
}>;

const EMPTY_CATCHUP: Catchup = Object.freeze({
  weekKey: '', baseFetchedAtMs: 0, baseWeekEarned: null, delta: 0, hotBonus: 0,
});

let memoryCatchup: Catchup = EMPTY_CATCHUP;
let catchupLoaded = false;
let memoryCatchupOwnerStableId: string | null = null;

function activeOwnerStableId(): string | null {
  const token = captureAccountGeneration();
  return token.phase === 'active' ? token.stableId : null;
}

function int(value: unknown): number {
  const parsed = Math.trunc(Number(value));
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : 0;
}

function nonNegativeInt(value: unknown): number | null {
  const parsed = Math.trunc(Number(value));
  return Number.isSafeInteger(parsed) && parsed >= 0 ? parsed : null;
}

function parseCatchup(raw: string | null): Catchup {
  if (!raw) return EMPTY_CATCHUP;
  try {
    const parsed = JSON.parse(raw) as Partial<Catchup>;
    if (!parsed || typeof parsed !== 'object') return EMPTY_CATCHUP;
    return Object.freeze({
      weekKey: typeof parsed.weekKey === 'string' ? parsed.weekKey : '',
      baseFetchedAtMs: int(parsed.baseFetchedAtMs),
      baseWeekEarned: nonNegativeInt(parsed.baseWeekEarned),
      delta: int(parsed.delta),
      hotBonus: int(parsed.hotBonus),
    });
  } catch {
    return EMPTY_CATCHUP;
  }
}

/**
 * Догон, пригодный к применению ПРЯМО СЕЙЧАС.
 *
 * Отбрасывается в двух случаях, и оба — защита от вранья:
 *  - неделя сменилась: прошлые начисления к новой неделе отношения не имеют;
 *  - серверный снимок новее базы догона: сервер уже учёл эти руны сам,
 *    и складывать их второй раз значило бы завысить очки (класс бага
 *    «награду показали дважды»).
 */

/**
 * Надбавка горячих часов текущей недели. В отличие от догона её НЕ гасит
 * свежий серверный снимок: сервер про горячие часы не знает и всегда отдаёт
 * одинарные руны. Гасится только сменой недели.
 */
function usableHotBonus(catchup: Catchup, weekKeyNow: string): number {
  if (!catchup.weekKey || catchup.weekKey !== weekKeyNow) return 0;
  return catchup.hotBonus;
}

/**
 * Синхронные очки лиги для первого кадра: снимок из памяти + локальный догон.
 *
 * Никаких чтений диска и сети — годится для `useState`-инициализатора, поэтому
 * первый кадр рисуется сразу правильным числом, без «0 и прыжка»
 * (правило стабильности вёрстки из Performance Bible).
 */
export function peekMyLeagueWeekRunes(): number {
  const ownerStableId = activeOwnerStableId();
  const observedStats = peekRunesServerStats();
  const stats = ownerStableId && observedStats?.uid === ownerStableId ? observedStats : null;
  const weekKeyNow = isoWeekKey(new Date());
  const accountCatchup = ownerStableId && memoryCatchupOwnerStableId === ownerStableId
    ? memoryCatchup
    : EMPTY_CATCHUP;
  // Снимок чужой недели даёт 0 заработанного — это честно: новая неделя
  // начинается с нуля, а не наследует прошлую.
  const serverEarned = starsWeekEarned(stats ?? undefined, weekKeyNow);
  // Before the account-scoped server snapshot is loaded there is no safe way
  // to distinguish this week's delta from an old/corrupt persisted event sum.
  // The async read below replaces this first-frame zero immediately.
  const catchup = stats
    ? canonicalLeagueLocalOverlay(peekRunesBalance().earnedTotal, stats.earnedTotal)
    : 0;
  const hotBonus = usableHotBonus(accountCatchup, weekKeyNow);
  return Math.max(0, serverEarned + catchup + hotBonus);
}

/**
 * Авторитетные очки лиги: серверный снимок (кэш 6 часов) + локальный догон.
 *
 * Ошибка сети не роняет число: `loadRunesServerStats` вернёт последний
 * известный снимок этого же аккаунта, а догон останется поверх него.
 */
export async function getMyLeagueWeekRunes(): Promise<number> {
  const ownerStableId = await ensureCatchupLoaded();
  const accountCatchup = ownerStableId && memoryCatchupOwnerStableId === ownerStableId
    ? memoryCatchup
    : EMPTY_CATCHUP;
  const weekKeyNow = isoWeekKey(new Date());
  let stats = null as Awaited<ReturnType<typeof loadRunesServerStats>>;
  try {
    stats = await loadRunesServerStats();
  } catch {
    stats = peekRunesServerStats();
  }
  if (ownerStableId && activeOwnerStableId() !== ownerStableId) return 0;
  if (stats && (!ownerStableId || stats.uid !== ownerStableId)) stats = null;
  const serverEarned = starsWeekEarned(stats ?? undefined, weekKeyNow);
  const eventCatchup = remainingLeagueRunesCatchup(accountCatchup, weekKeyNow, serverEarned);
  const localEarnedTotal = peekRunesBalance().earnedTotal;
  // Event delivery is intentionally not authoritative: Fast Refresh and boot
  // hydration can replay the whole earnedTotal transition. The exact wallet
  // counters provide an idempotent overlay and repair any previously inflated
  // catchup as soon as a same-account server snapshot is available.
  const catchup = stats
    ? canonicalLeagueLocalOverlay(localEarnedTotal, stats.earnedTotal)
    : eventCatchup;

  // Неделя сменилась, а сервер ещё помнит прошлую — снимаем финал ДО того, как
  // счётчик обнулится. Этим снимком league_engine считает переход лиги, если
  // на границе недели не было сети (см. getLastWeekLeagueRunes).
  const observedStatsWeekEarned = starsWeekEarned(stats ?? undefined, stats?.weekKey ?? '');
  if (stats && stats.weekKey && stats.weekKey !== weekKeyNow && observedStatsWeekEarned > 0) {
    await rememberLeagueWeekRunesFinal(stats.weekKey, observedStatsWeekEarned, ownerStableId);
  }

  // Списываем только ту часть догона, которую сервер доказуемо поглотил.
  // Более свежий fetchedAt сам по себе ничего не доказывает: callable мог быть
  // offline/NOT FOUND, и прежняя логика стирала честные очки при входе в лигу.
  if (ownerStableId && (accountCatchup.weekKey !== weekKeyNow
    || accountCatchup.baseWeekEarned !== serverEarned
    || accountCatchup.delta !== catchup)) {
    await rebaseCatchup(ownerStableId, weekKeyNow, stats?.fetchedAtMs ?? 0, serverEarned, catchup);
  }
  const hotBonus = usableHotBonus(
    ownerStableId && memoryCatchupOwnerStableId === ownerStableId ? memoryCatchup : accountCatchup,
    weekKeyNow,
  );
  const result = Math.max(0, serverEarned + catchup + hotBonus);
  DebugLogger.info('league_runes:read_week_points', JSON.stringify({
    weekKey: weekKeyNow,
    serverEarned,
    serverEarnedTotal: stats?.earnedTotal ?? null,
    localEarnedTotal,
    localCatchup: catchup,
    hotBonus,
    result,
  }));
  return result;
}

async function ensureCatchupLoaded(expectedOwnerStableId?: string): Promise<string | null> {
  const token = captureAccountGeneration();
  const ownerStableId = token.phase === 'active' ? token.stableId : null;
  if (!ownerStableId || (expectedOwnerStableId && expectedOwnerStableId !== ownerStableId)) {
    return null;
  }
  if (catchupLoaded && memoryCatchupOwnerStableId === ownerStableId) return ownerStableId;
  const raw = await AsyncStorage.getItem(
    accountScopedLeagueRunesStorageKey(CATCHUP_KEY, ownerStableId),
  ).catch(() => null);
  if (!isCurrentAccountGeneration(token, ownerStableId)) return null;
  memoryCatchup = parseCatchup(raw);
  memoryCatchupOwnerStableId = ownerStableId;
  catchupLoaded = true;
  return ownerStableId;
}

async function rebaseCatchup(
  ownerStableId: string,
  weekKey: string,
  baseFetchedAtMs: number,
  baseWeekEarned: number,
  delta: number,
): Promise<void> {
  if (activeOwnerStableId() !== ownerStableId) return;
  if (memoryCatchupOwnerStableId !== ownerStableId) memoryCatchup = EMPTY_CATCHUP;
  // Надбавку горячих часов НЕ сбрасываем: её нет в серверном снимке, и
  // обнуление здесь стёрло бы честно заработанное удвоение.
  const hotBonus = usableHotBonus(memoryCatchup, weekKey);
  memoryCatchup = Object.freeze({ weekKey, baseFetchedAtMs, baseWeekEarned, delta, hotBonus });
  memoryCatchupOwnerStableId = ownerStableId;
  catchupLoaded = true;
  await AsyncStorage.setItem(
    accountScopedLeagueRunesStorageKey(CATCHUP_KEY, ownerStableId),
    JSON.stringify(memoryCatchup),
  ).catch(() => {});
}

/**
 * Учесть только что начисленные руны в очках лиги, не дожидаясь сервера.
 *
 * Это и есть Optimistic UI для лиги: игрок закрыл занятие — его строка в
 * таблице двигается сразу, а серверный снимок догоняет в течение 6 часов.
 * Отрицательные дельты (траты) игнорируются намеренно: очки лиги считают
 * приток, и открытие занятия не должно опускать игрока в таблице.
 */
export async function noteRunesEarnedForLeague(
  delta: number,
  expectedOwnerStableId?: string,
): Promise<void> {
  const base = int(delta);
  if (base <= 0) return;
  // «Горячие 2 часа»: в последние два часа недели зона вылета получает ×2 —
  // драма камбэков вместо тихого вылета. Механика была написана
  // (league_hot_hours.ts), но НИКТО её не вызывал: экран обещал удвоение,
  // которого не происходило. Владелец 2026-08-26 велел доделать.
  // Чтений нет: множитель считается по кэшу группы, уже лежащему в памяти.
  // Базовую часть сервер учтёт сам — она идёт в догон и гаснет свежим
  // снимком. Надбавку горячих часов сервер не знает: она копится отдельно.
  const bonus = base * (getLeagueHotHoursMultiplierSync() - 1);
  const ownerStableId = await ensureCatchupLoaded(expectedOwnerStableId);
  if (!ownerStableId) return;
  const weekKeyNow = isoWeekKey(new Date());
  const observedStats = peekRunesServerStats();
  const stats = observedStats?.uid === ownerStableId ? observedStats : null;
  const sameWeekStats = stats?.weekKey === weekKeyNow ? stats : null;
  const baseFetchedAtMs = stats?.fetchedAtMs ?? memoryCatchup.baseFetchedAtMs;
  const serverWeekEarned = starsWeekEarned(sameWeekStats ?? undefined, weekKeyNow);
  const carried = remainingLeagueRunesCatchup(memoryCatchup, weekKeyNow, serverWeekEarned);
  const carriedBonus = usableHotBonus(memoryCatchup, weekKeyNow);
  memoryCatchup = Object.freeze({
    weekKey: weekKeyNow,
    baseFetchedAtMs,
    baseWeekEarned: sameWeekStats ? serverWeekEarned : null,
    delta: carried + base,
    hotBonus: carriedBonus + Math.max(0, bonus),
  });
  if (activeOwnerStableId() !== ownerStableId) return;
  await AsyncStorage.setItem(
    accountScopedLeagueRunesStorageKey(CATCHUP_KEY, ownerStableId),
    JSON.stringify(memoryCatchup),
  ).catch(() => {});
  if (activeOwnerStableId() !== ownerStableId) return;
  emitAppEvent('league_local_state_updated');
}

/**
 * Финал завершившейся недели В РУНАХ — для резервного расчёта перехода лиги.
 *
 * зачем (владелец, 2026-08-26): на границе недели без сети league_engine
 * считает переход локально и раньше брал `week_points_last_final` — снимок
 * недельного ОПЫТА. После перехода лиги на руны это разошлось бы с таблицей:
 * в комнате руны, а исход посчитан по XP. Здесь тот же приём, но по своей
 * валюте: снимок последней недели, снятый ДО того, как счётчик обнулится.
 *
 * Ключ отдельный от `week_points_last_final` намеренно — опыт продолжает
 * жить своей жизнью для Зала славы и друзей.
 */
export async function rememberLeagueWeekRunesFinal(
  weekKey: string,
  points: number,
  expectedOwnerStableId?: string | null,
): Promise<void> {
  const clean = int(points);
  if (!weekKey) return;
  if (expectedOwnerStableId === null) return;
  const ownerStableId = expectedOwnerStableId ?? activeOwnerStableId();
  if (!ownerStableId || activeOwnerStableId() !== ownerStableId) return;
  await AsyncStorage
    .setItem(
      accountScopedLeagueRunesStorageKey(LAST_FINAL_KEY, ownerStableId),
      JSON.stringify({ weekKey, points: clean }),
    )
    .catch(() => {});
}

/** Руны завершившейся недели, если снимок относится именно к ней; иначе null. */
export async function getLastWeekLeagueRunes(weekId: string): Promise<number | null> {
  try {
    const token = captureAccountGeneration();
    const ownerStableId = token.phase === 'active' ? token.stableId : null;
    if (!ownerStableId) return null;
    const raw = await AsyncStorage.getItem(
      accountScopedLeagueRunesStorageKey(LAST_FINAL_KEY, ownerStableId),
    );
    if (!isCurrentAccountGeneration(token, ownerStableId)) return null;
    if (!raw) return null;
    const data = JSON.parse(raw) as { weekKey?: unknown; points?: unknown };
    if (typeof data.weekKey !== 'string' || data.weekKey !== weekId) return null;
    return int(data.points);
  } catch {
    return null;
  }
}

/**
 * Множитель горячих часов по кэшу лиги. Синхронный и без чтений: кэш группы
 * уже в памяти, а при любых сомнениях (нет кэша, один участник, себя нет в
 * группе) возвращается 1 — удвоить лишнего хуже, чем не удвоить.
 *
 * зачем ленивый require, а не импорт наверху: league_hot_hours тянет
 * league_engine ради размера зоны, а league_engine тянет этот модуль ради
 * рунного финала недели — статический импорт замкнул бы цикл и отдал бы
 * undefined на старте. Здесь вызов происходит уже после загрузки всех
 * модулей, поэтому цикла не возникает.
 */
function getLeagueHotHoursMultiplierSync(): number {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports -- lazy by design: avoids league_engine cycle
    const { getCachedLeagueStateSync } = require('./league_open_cache_policy') as
      typeof import('./league_open_cache_policy');
    const state = getCachedLeagueStateSync();
    if (!state?.group) return 1;
    // eslint-disable-next-line @typescript-eslint/no-require-imports -- lazy by design: avoids league_engine cycle
    const { resolveLeagueHotHoursMultiplier } = require('./league_hot_hours') as
      typeof import('./league_hot_hours');
    return resolveLeagueHotHoursMultiplier({ now: Date.now(), group: state.group });
  } catch {
    return 1;
  }
}

let subscribedOwnerStableId: string | null = null;

/**
 * Подписка на начисления рун — ставится один раз при старте приложения.
 *
 * зачем: без неё догон пришлось бы звать вручную из каждого места, где руны
 * начисляются (Арена, занятия, друзья), и любое новое место молча выпало бы из
 * лиги. Слушаем канонический снапшот напрямую: UI-событие баланса существует
 * только пока открыт экран-подписчик и включает подарки, которые в лигу не идут.
 */
export function startLeagueWeekRunesTracking(expectedOwnerStableId?: string): () => void {
  const ownerStableId = activeOwnerStableId();
  if (!ownerStableId || (expectedOwnerStableId && expectedOwnerStableId !== ownerStableId)) {
    return () => {};
  }
  if (subscribedOwnerStableId) return () => {};
  subscribedOwnerStableId = ownerStableId;
  const baseline = peekRunesServerStats();
  DebugLogger.info('league_runes:tracking_started', JSON.stringify({
    balanceEarnedTotal: peekRunesBalance().earnedTotal,
    serverWeekEarned: baseline ? starsWeekEarned(baseline, baseline.weekKey) : null,
  }));
  const unsubscribe = subscribeRunesSnapshot((next, previous) => {
    const delta = leagueEarnedDelta(previous.earnedTotal, next.earnedTotal);
    if (delta > 0) {
      DebugLogger.info('league_runes:earned_delta', JSON.stringify({
        previousEarnedTotal: previous.earnedTotal,
        nextEarnedTotal: next.earnedTotal,
        delta,
      }));
      void noteRunesEarnedForLeague(delta, ownerStableId);
    }
  });
  return () => {
    if (subscribedOwnerStableId === ownerStableId) subscribedOwnerStableId = null;
    unsubscribe();
  };
}
