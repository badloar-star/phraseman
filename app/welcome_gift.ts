/**
 * welcome_gift.ts — стартовый подарок новичку: +100 жемчужин и +300 рун.
 *
 * зачем (владелец, 2026-08-26): «модал сразу приветствует юзера и начисляет ему
 * 100 жемчужин просто так и сразу 300 рун тоже просто так… мгновенное
 * начисление, чтобы юзер не видел нулей с самого первого входа».
 *
 * Архитектура — по действующим рельсам двух валют, без новых писателей:
 *  - ЖЕМЧУЖИНЫ клиентски-авторитетны (economy constitution):
 *    awardOneTimeVariable → commitShardCreditOperation. Начисление МГНОВЕННОЕ
 *    и офлайн-безопасное, идемпотентно по eventKey, журнал сам доезжает в облако.
 *  - РУНЫ авторитетен сервер (единственный клиентский писатель —
 *    level_spin_star_grants, и он только про спины). Начисляет callable
 *    welcomeGiftClaim (functions/src/welcome_gift.ts) через stars_ledger с
 *    opId `welcome_gift:{uid}` — одна выдача на аккаунт навсегда. Ответ
 *    мерджится в локальную проекцию (mergeLevelSpinServerStars), как у сундука
 *    друзей и Арены.
 *
 * Чек-лист класса «награду показали, но не начислили» (memory 2026-08-26):
 *  - идемпотентность по ключу выдачи, а не по «уже показывали»: eventKey у
 *    жемчужин, requestId+opId у рун;
 *  - маркер 'done' пишется ТОЛЬКО после успеха; провал оставляет 'pending',
 *    и хост повторяет попытку при следующем запуске (resumeWelcomeGiftIfPending);
 *  - начисление НЕ привязано к CTA модалки: стартует в момент решения показать
 *    приветствие, размонтирование модалки ничего не теряет.
 *
 * Firebase-экономия: ровно один вызов callable на весь жизненный цикл аккаунта
 * (плюс редкие ретраи при отказе сети), никаких чтений Firestore с клиента.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getApp } from '@react-native-firebase/app';
import { getFunctions, httpsCallable } from '@react-native-firebase/functions';

import {
  captureAccountGeneration,
  isCurrentAccountGeneration,
} from './account_generation';
import { CLOUD_SYNC_ENABLED, IS_EXPO_GO } from './config';
import { initFirebaseAppCheckIfAvailable } from './app_check_init';
import { mergeLevelSpinServerStars } from './level_spin_star_grants';
import { awardOneTimeVariable } from './shards_system';
import { DebugLogger } from './debug-logger';

const REGION = 'us-central1';

/** Суммы подарка. Серверная константа обязана совпадать —
 * сторожит tests/welcome_gift_contract.test.ts. */
export const WELCOME_GIFT_PEARLS = 100;
export const WELCOME_GIFT_RUNES = 300;

/**
 * Ключ идемпотентности жемчужин в реестре one-time событий кошелька.
 *
 * ⚠️ СТРОГО 1 РАЗ НА АККАУНТ (владелец, 2026-08-26, дословно: «зафиксируй
 * жёстко»): значение НИКОГДА не должно зависеть от deviceId, времени или
 * случайного числа — только фиксированная строка. awardOneTimeVariable строит
 * operationId как sha256(`welcome_gift:${этот ключ}`), а
 * client_shard_operation_ledger мержит журналы РАЗНЫХ устройств одного
 * аккаунта по operationId («replaying an identical operation is success with
 * no second economic effect», docs/economy/ECONOMY_CONSTITUTION.md §4-5).
 * Поменять этот ключ на нефиксированный — значит превратить «1 раз на
 * аккаунт» в «1 раз на устройство».
 */
export const WELCOME_GIFT_PEARLS_EVENT_KEY = 'welcome_gift_v1';

/**
 * Состояние выдачи на диске. Ключа нет = подарок этому устройству не положен
 * (старый пользователь) ЛИБО уже полностью выдан (ключ подчищаем) — оба случая
 * для resume равнозначны «делать нечего», лишних чтений у старых юзеров нет.
 */
const STATE_KEY = 'welcome_gift_state_v1';
const RUNES_REQUEST_KEY = 'welcome_gift_runes_request_v1';

type PartState = 'pending' | 'done';
type WelcomeGiftState = Readonly<{ pearls: PartState; runes: PartState }>;

function parseState(raw: string | null): WelcomeGiftState | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as { pearls?: unknown; runes?: unknown };
    const part = (v: unknown): PartState => (v === 'done' ? 'done' : 'pending');
    return Object.freeze({ pearls: part(parsed?.pearls), runes: part(parsed?.runes) });
  } catch {
    // Битый ключ читаем как «всё pending»: повторная выдача безопасна,
    // идемпотентность живёт уровнем ниже (eventKey / opId), не в этом маркере.
    return Object.freeze({ pearls: 'pending', runes: 'pending' } as const);
  }
}

async function readState(): Promise<WelcomeGiftState | null> {
  return parseState(await AsyncStorage.getItem(STATE_KEY).catch(() => null));
}

async function writeState(state: WelcomeGiftState): Promise<void> {
  if (state.pearls === 'done' && state.runes === 'done') {
    // Выдано полностью — ключ больше не нужен, храним ноль лишних байт.
    await AsyncStorage.removeItem(STATE_KEY).catch(() => {});
    return;
  }
  await AsyncStorage.setItem(STATE_KEY, JSON.stringify(state)).catch(() => {});
}

function makeRequestId(): string {
  const now = Date.now().toString(36);
  const rand = Math.random().toString(36).slice(2, 10);
  return `wg_${now}_${rand}`;
}

async function getOrCreateRunesRequestId(): Promise<string> {
  const existing = await AsyncStorage.getItem(RUNES_REQUEST_KEY).catch(() => null);
  if (existing && /^[A-Za-z0-9_-]{12,96}$/.test(existing)) return existing;
  const id = makeRequestId();
  await AsyncStorage.setItem(RUNES_REQUEST_KEY, id).catch(() => {});
  return id;
}

type WelcomeGiftClaimWire = Readonly<{
  ok?: boolean;
  alreadyClaimed?: unknown;
  starsGranted?: unknown;
  stars?: unknown;
  starsEarnedTotal?: unknown;
  starsSeq?: unknown;
}>;

/** Жемчужины: мгновенный локальный кредит. true = выдано (сейчас или раньше). */
async function grantPearlsLocal(): Promise<boolean> {
  const result = await awardOneTimeVariable(
    WELCOME_GIFT_PEARLS_EVENT_KEY,
    WELCOME_GIFT_PEARLS,
    'welcome_gift',
  );
  return result.awarded > 0 || result.alreadyClaimed;
}

/** Руны: серверный грант + мердж авторитетного баланса. true = выдано. */
async function claimRunesFromServer(): Promise<boolean> {
  if (IS_EXPO_GO || !CLOUD_SYNC_ENABLED) return false;
  const token = captureAccountGeneration();
  const ownerStableId = token.stableId?.trim();
  if (!ownerStableId || !isCurrentAccountGeneration(token, ownerStableId)) return false;
  try {
    await initFirebaseAppCheckIfAvailable().catch(() => {});
    const requestId = await getOrCreateRunesRequestId();
    if (!isCurrentAccountGeneration(token, ownerStableId)) return false;
    const fn = httpsCallable<{ stableId: string; requestId: string }, WelcomeGiftClaimWire>(
      getFunctions(getApp(), REGION),
      'welcomeGiftClaim',
    );
    const res = await fn({ stableId: ownerStableId, requestId });
    if (!isCurrentAccountGeneration(token, ownerStableId)) return false;
    const data = res.data;
    const stars = Number(data?.stars);
    const earned = Number(data?.starsEarnedTotal);
    const seq = Number(data?.starsSeq);
    await mergeLevelSpinServerStars(token, {
      ...(Number.isFinite(stars) ? { stars: Math.max(0, Math.trunc(stars)) } : {}),
      ...(Number.isFinite(earned) ? { starsEarnedTotal: Math.max(0, Math.trunc(earned)) } : {}),
      ...(Number.isSafeInteger(seq) && seq >= 0 ? { starsSeq: seq } : {}),
    });
    await AsyncStorage.removeItem(RUNES_REQUEST_KEY).catch(() => {});
    return true;
  } catch (error) {
    const text = String((error as { code?: unknown })?.code ?? '')
      + ' ' + String((error as { message?: unknown })?.message ?? error ?? '');
    // Сервер уже выдавал этому аккаунту (ответ первого вызова потерялся) —
    // выдача состоялась, повторять нельзя; баланс догонит обычный пулл.
    if (text.toLowerCase().includes('claimed') || text.toLowerCase().includes('already-exists')) {
      await AsyncStorage.removeItem(RUNES_REQUEST_KEY).catch(() => {});
      return true;
    }
    DebugLogger.error('welcome_gift:claimRunes', error, 'warning');
    return false;
  }
}

// Однопроцессный замок: хост может позвать begin и resume в одном запуске,
// вторая попытка ждёт первую, а не гонится с ней за AsyncStorage.
let inFlight: Promise<void> | null = null;

async function runPendingParts(): Promise<void> {
  const state = await readState();
  if (!state) return;
  let next = state;
  if (next.pearls === 'pending' && await grantPearlsLocal()) {
    next = { ...next, pearls: 'done' };
    await writeState(next);
  }
  if (next.runes === 'pending' && await claimRunesFromServer()) {
    next = { ...next, runes: 'done' };
    await writeState(next);
  }
}

function runExclusive(): Promise<void> {
  if (inFlight) return inFlight;
  inFlight = runPendingParts()
    .catch((error) => DebugLogger.error('welcome_gift:run', error, 'warning'))
    .finally(() => { inFlight = null; });
  return inFlight;
}

/**
 * Начать выдачу подарка. Зовётся хостом в момент решения показать приветствие —
 * ДО и НЕЗАВИСИМО от CTA модалки. Повторный вызов безопасен.
 */
export async function beginWelcomeGiftGrant(): Promise<void> {
  const existing = await readState();
  if (!existing) {
    await writeState(Object.freeze({ pearls: 'pending', runes: 'pending' } as const));
  }
  await runExclusive();
}

/**
 * Дожать незавершённую выдачу (крэш/офлайн между частями). Хост зовёт при
 * каждом монтировании; у пользователей без незавершённого подарка это одно
 * чтение AsyncStorage и выход.
 */
export async function resumeWelcomeGiftIfPending(): Promise<void> {
  const state = await readState();
  if (!state || (state.pearls === 'done' && state.runes === 'done')) return;
  await runExclusive();
}

/* expo-router route shim */
export default function __RouteShim() { return null; }
