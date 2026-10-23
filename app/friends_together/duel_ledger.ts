/**
 * «Дуэль на 5 фраз» (идея 3) — свои отправленные вызовы на телефоне: сколько сегодня и с кем дуэль ещё идёт.
 *
 * зачем (правила дуэли: три вызова в день, одна открытая дуэль на друга; Firebase-экономия; закон владельца 22.10
 * «сервер для сохранения, а не решений»): лимит решает телефон — canChallenge по этому журналу, без чтений сервера.
 * Запись — СРАЗУ при отправке вызова (Optimistic UI): второй вызов тому же другу закрыт мгновенно, не дожидаясь сети;
 * сервер отказал по целостности (не друзья, битый ход) — запись снимается (forgetSentDuel). Храним сутки.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';

import { getLocalDayKey } from '../local_date';
import { maskUid } from '../diagnostic_mask';
import { getCanonicalUserId } from '../user_id_policy';
import { DUEL_ANSWER_WINDOW_MS } from './duel_core';

const KEY = 'friends_duel_sent_v1';
/** Больше записей не бывает: три в день, храним сутки. Потолок — от мусора в хранилище. */
const MAX_ENTRIES = 12;

/** closed — пришёл итог или отказ: в лимит дня вызов входит, «дуэль уже идёт» — уже нет. */
export type SentDuel = Readonly<{ friendUid: string; sentAtMs: number; dayKey: string; closed?: boolean }>;

const log = (line: string): void => { console.log(`[FRIENDS-DUEL] ${line}`); }; // guard-ok: журнал вызовов дуэли, одна строка на шаг
const errText = (e: unknown): string => (e instanceof Error ? e.message : String(e));

function isSentDuel(value: unknown): value is SentDuel {
  if (!value || typeof value !== 'object') return false;
  const v = value as Record<string, unknown>;
  return typeof v.friendUid === 'string' && v.friendUid.length > 0 && typeof v.sentAtMs === 'number' && typeof v.dayKey === 'string';
}

async function readRaw(scope: string): Promise<SentDuel[]> {
  try {
    const raw = await AsyncStorage.getItem(`${KEY}::${scope}`);
    const parsed: unknown = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.filter(isSentDuel) : [];
  } catch (e) {
    console.warn(`[FRIENDS-DUEL] ledger:read failed owner=${maskUid(scope)} → считаем, что вызовов не было (решит сервер): ${errText(e)}`); // guard-ok: catch называет причину
    return [];
  }
}

/** Свои вызовы за последние сутки. Нет пользователя — пусто (шторка ничего не запрещает; отправить вызов без аккаунта нельзя). */
export async function readSentDuels(nowMs: number = Date.now()): Promise<SentDuel[]> {
  const scope = await getCanonicalUserId();
  if (!scope) {
    log('ledger:read none reason=no_user');
    return [];
  }
  return (await readRaw(scope)).filter((d) => nowMs - d.sentAtMs < DUEL_ANSWER_WINDOW_MS);
}

/** Запомнить отправленный вызов (ушёл в сеть или ждёт сети на телефоне). */
export async function recordSentDuel(friendUid: string, nowMs: number = Date.now(), dayKey: string = getLocalDayKey()): Promise<void> {
  const scope = await getCanonicalUserId();
  if (!scope || !friendUid) {
    log(`ledger:skip reason=${scope ? 'no_friend' : 'no_user'}`);
    return;
  }
  const kept = (await readRaw(scope)).filter((d) => nowMs - d.sentAtMs < DUEL_ANSWER_WINDOW_MS);
  const next = [...kept, { friendUid, sentAtMs: nowMs, dayKey }].slice(-MAX_ENTRIES);
  try {
    await AsyncStorage.setItem(`${KEY}::${scope}`, JSON.stringify(next));
    log(`ledger:recorded friend=${maskUid(friendUid)} today=${duelSentToday(next, dayKey)}`);
  } catch (e) {
    console.warn(`[FRIENDS-DUEL] ledger:write failed owner=${maskUid(scope)} → лимит дня не учтёт этот вызов: ${errText(e)}`); // guard-ok: catch называет причину
  }
}

/** Откат записи вызова: сервер отказал по целостности — вызова не было, место в «три в день» возвращается. */
export async function forgetSentDuel(friendUid: string, sentAtMs: number): Promise<void> {
  const scope = await getCanonicalUserId();
  if (!scope) {
    log(`ledger:forget skip reason=no_user friend=${maskUid(friendUid)}`);
    return;
  }
  const list = await readRaw(scope);
  const next = list.filter((d) => !(d.friendUid === friendUid && d.sentAtMs === sentAtMs));
  if (next.length === list.length) {
    log(`ledger:forget skip reason=not_found friend=${maskUid(friendUid)}`);
    return;
  }
  try {
    await AsyncStorage.setItem(`${KEY}::${scope}`, JSON.stringify(next));
    log(`ledger:forgot friend=${maskUid(friendUid)} left=${next.length}`);
  } catch (e) {
    console.warn(`[FRIENDS-DUEL] ledger:forget write failed owner=${maskUid(scope)} → вызов останется в лимите до суток: ${errText(e)}`); // guard-ok: catch называет причину
  }
}

/**
 * Дуэль закрыта (пришёл итог или отказ) — снять «дуэль уже идёт» с этим другом: убираем вызовы, отправленные ДО строки
 * закрытия. Счёт «три в день» от этого не меняется: он про отправку, а не про исход. Пишем, только если есть что убрать.
 */
export async function closeSentDuels(closures: readonly Readonly<{ friendUid: string; atMs: number }>[]): Promise<void> {
  if (closures.length === 0) return;
  const scope = await getCanonicalUserId();
  if (!scope) {
    log('ledger:close skip reason=no_user');
    return;
  }
  const list = await readRaw(scope);
  const closedAt = new Map<string, number>();
  for (const c of closures) closedAt.set(c.friendUid, Math.max(closedAt.get(c.friendUid) ?? 0, c.atMs));
  const next = list.map((d) => (d.closed !== true && d.sentAtMs <= (closedAt.get(d.friendUid) ?? -1) ? { ...d, closed: true } : d));
  if (next.every((d, i) => d === list[i])) return;
  try {
    await AsyncStorage.setItem(`${KEY}::${scope}`, JSON.stringify(next));
    log(`ledger:closed duels=${next.filter((d, i) => d !== list[i]).length}`);
  } catch (e) {
    console.warn(`[FRIENDS-DUEL] ledger:close write failed owner=${maskUid(scope)} → «дуэль идёт» до суток: ${errText(e)}`); // guard-ok: catch называет причину
  }
}

/** Сколько вызовов отправлено в этот локальный день. */
export function duelSentToday(list: readonly SentDuel[], dayKey: string): number {
  return list.filter((d) => d.dayKey === dayKey).length;
}

/** Дуэль с другом ещё идёт: вызов ушёл меньше суток назад (сервер закроет её раньше, если друг ответит или откажется). */
export function duelOpenWithFriend(list: readonly SentDuel[], friendUid: string, nowMs: number): boolean {
  return list.some((d) => d.friendUid === friendUid && d.closed !== true && nowMs - d.sentAtMs < DUEL_ANSWER_WINDOW_MS);
}

/* expo-router route shim */
export default function __RouteShim() { return null; }
