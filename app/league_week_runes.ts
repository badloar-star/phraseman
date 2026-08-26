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
 *      игрок закрывает занятие и не видит движения. Догон копит дельты события
 *      `runes_balance_updated` поверх снимка и обнуляется, когда приходит более
 *      свежий серверный снимок или сменилась неделя.
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

import { loadRunesServerStats, peekRunesServerStats } from './runes_wallet_stats';
import { onAppEvent } from './events';

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

type Catchup = Readonly<{
  /** ISO-неделя, к которой относится догон. Смена недели его обнуляет. */
  weekKey: string;
  /** Серверный снимок, поверх которого копится догон (защита от двойного счёта). */
  baseFetchedAtMs: number;
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

const EMPTY_CATCHUP: Catchup = Object.freeze({ weekKey: '', baseFetchedAtMs: 0, delta: 0, hotBonus: 0 });

let memoryCatchup: Catchup = EMPTY_CATCHUP;
let catchupLoaded = false;

function int(value: unknown): number {
  const parsed = Math.trunc(Number(value));
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : 0;
}

function parseCatchup(raw: string | null): Catchup {
  if (!raw) return EMPTY_CATCHUP;
  try {
    const parsed = JSON.parse(raw) as Partial<Catchup>;
    if (!parsed || typeof parsed !== 'object') return EMPTY_CATCHUP;
    return Object.freeze({
      weekKey: typeof parsed.weekKey === 'string' ? parsed.weekKey : '',
      baseFetchedAtMs: int(parsed.baseFetchedAtMs),
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
function usableCatchup(catchup: Catchup, weekKeyNow: string, snapshotFetchedAtMs: number): number {
  if (!catchup.weekKey || catchup.weekKey !== weekKeyNow) return 0;
  if (snapshotFetchedAtMs > catchup.baseFetchedAtMs) return 0;
  return catchup.delta;
}

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
  const stats = peekRunesServerStats();
  const weekKeyNow = isoWeekKey(new Date());
  // Снимок чужой недели даёт 0 заработанного — это честно: новая неделя
  // начинается с нуля, а не наследует прошлую.
  const serverEarned = stats && stats.weekKey === weekKeyNow ? stats.weekEarned : 0;
  const catchup = usableCatchup(memoryCatchup, weekKeyNow, stats?.fetchedAtMs ?? 0);
  const hotBonus = usableHotBonus(memoryCatchup, weekKeyNow);
  return Math.max(0, serverEarned + catchup + hotBonus);
}

/**
 * Авторитетные очки лиги: серверный снимок (кэш 6 часов) + локальный догон.
 *
 * Ошибка сети не роняет число: `loadRunesServerStats` вернёт последний
 * известный снимок этого же аккаунта, а догон останется поверх него.
 */
export async function getMyLeagueWeekRunes(): Promise<number> {
  await ensureCatchupLoaded();
  const weekKeyNow = isoWeekKey(new Date());
  let stats = null as Awaited<ReturnType<typeof loadRunesServerStats>>;
  try {
    stats = await loadRunesServerStats();
  } catch {
    stats = peekRunesServerStats();
  }
  const serverEarned = stats && stats.weekKey === weekKeyNow ? stats.weekEarned : 0;
  const catchup = usableCatchup(memoryCatchup, weekKeyNow, stats?.fetchedAtMs ?? 0);

  // Неделя сменилась, а сервер ещё помнит прошлую — снимаем финал ДО того, как
  // счётчик обнулится. Этим снимком league_engine считает переход лиги, если
  // на границе недели не было сети (см. getLastWeekLeagueRunes).
  if (stats && stats.weekKey && stats.weekKey !== weekKeyNow && stats.weekEarned > 0) {
    await rememberLeagueWeekRunesFinal(stats.weekKey, stats.weekEarned);
  }

  // Снимок обогнал догон — стираем догон, иначе он будет вечно висеть в памяти
  // и однажды сложится с уже учтёнными сервером рунами.
  if (catchup === 0 && memoryCatchup.delta > 0) await resetCatchup(weekKeyNow, stats?.fetchedAtMs ?? 0);
  const hotBonus = usableHotBonus(memoryCatchup, weekKeyNow);
  return Math.max(0, serverEarned + catchup + hotBonus);
}

async function ensureCatchupLoaded(): Promise<void> {
  if (catchupLoaded) return;
  catchupLoaded = true;
  memoryCatchup = parseCatchup(await AsyncStorage.getItem(CATCHUP_KEY).catch(() => null));
}

async function resetCatchup(weekKey: string, baseFetchedAtMs: number): Promise<void> {
  // Надбавку горячих часов НЕ сбрасываем: её нет в серверном снимке, и
  // обнуление здесь стёрло бы честно заработанное удвоение.
  const hotBonus = usableHotBonus(memoryCatchup, weekKey);
  memoryCatchup = Object.freeze({ weekKey, baseFetchedAtMs, delta: 0, hotBonus });
  await AsyncStorage.setItem(CATCHUP_KEY, JSON.stringify(memoryCatchup)).catch(() => {});
}

/**
 * Учесть только что начисленные руны в очках лиги, не дожидаясь сервера.
 *
 * Это и есть Optimistic UI для лиги: игрок закрыл занятие — его строка в
 * таблице двигается сразу, а серверный снимок догоняет в течение 6 часов.
 * Отрицательные дельты (траты) игнорируются намеренно: очки лиги считают
 * приток, и открытие занятия не должно опускать игрока в таблице.
 */
export async function noteRunesEarnedForLeague(delta: number): Promise<void> {
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
  await ensureCatchupLoaded();
  const weekKeyNow = isoWeekKey(new Date());
  const stats = peekRunesServerStats();
  const baseFetchedAtMs = stats?.fetchedAtMs ?? memoryCatchup.baseFetchedAtMs;
  const carried = usableCatchup(memoryCatchup, weekKeyNow, stats?.fetchedAtMs ?? 0);
  const carriedBonus = usableHotBonus(memoryCatchup, weekKeyNow);
  memoryCatchup = Object.freeze({
    weekKey: weekKeyNow,
    baseFetchedAtMs,
    delta: carried + base,
    hotBonus: carriedBonus + Math.max(0, bonus),
  });
  await AsyncStorage.setItem(CATCHUP_KEY, JSON.stringify(memoryCatchup)).catch(() => {});
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
const LAST_FINAL_KEY = 'league_week_runes_last_final_v1';

export async function rememberLeagueWeekRunesFinal(weekKey: string, points: number): Promise<void> {
  const clean = int(points);
  if (!weekKey) return;
  await AsyncStorage
    .setItem(LAST_FINAL_KEY, JSON.stringify({ weekKey, points: clean }))
    .catch(() => {});
}

/** Руны завершившейся недели, если снимок относится именно к ней; иначе null. */
export async function getLastWeekLeagueRunes(weekId: string): Promise<number | null> {
  try {
    const raw = await AsyncStorage.getItem(LAST_FINAL_KEY);
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
    const { getCachedLeagueStateSync } = require('./league_open_cache_policy') as
      typeof import('./league_open_cache_policy');
    const state = getCachedLeagueStateSync();
    if (!state?.group) return 1;
    const { resolveLeagueHotHoursMultiplier } = require('./league_hot_hours') as
      typeof import('./league_hot_hours');
    return resolveLeagueHotHoursMultiplier({ now: Date.now(), group: state.group });
  } catch {
    return 1;
  }
}

let subscribed = false;

/**
 * Подписка на начисления рун — ставится один раз при старте приложения.
 *
 * зачем: без неё догон пришлось бы звать вручную из каждого места, где руны
 * начисляются (Арена, занятия, друзья, спин), и любое новое место молча
 * выпало бы из лиги. Событие `runes_balance_updated` эмитит единый кошелёк
 * (`runes_system.subscribeRunesBalance`), поэтому источник ровно один.
 */
export function startLeagueWeekRunesTracking(): () => void {
  if (subscribed) return () => {};
  subscribed = true;
  const subscription = onAppEvent('runes_balance_updated', ({ delta }) => {
    void noteRunesEarnedForLeague(delta);
  });
  return () => {
    subscribed = false;
    subscription.remove();
  };
}
