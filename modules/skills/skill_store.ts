// ═══════════════════════════════════════════════════════════════════════════
// skill_store.ts — хранение очков навыков и единая точка начисления.
//
// зачем (владелец 11.11.2026: «всё с макетов вноси в приложение»; координатор: «начисление — через ОДНУ
// точку-адаптер»): любой режим сообщает «верный ответ» функцией recordSkillAction, экраны читают итоги из
// памяти процесса (peek) без ожидания диска и сети.
//   • Хранение — AsyncStorage на устройстве, ключ на владельца. Firestore НЕ читается и НЕ пишется.
//   • Изменения идут через одну очередь — два ответа подряд не затирают друг друга.
//   • Итог виден сразу; при сбое записи состояние держится в памяти и пишется повторно при следующем событии.
//   • Поздравление с уровнем НЕ сохраняется: levelUps возвращаются вызывающему как факт этого события
//     (правило владельца 01.09 — празднование не durable).
// Логи — префикс [SKILLS] на каждом раннем выходе и catch.
// ═══════════════════════════════════════════════════════════════════════════
import AsyncStorage from '@react-native-async-storage/async-storage';

import { onAccountOwnerChanged } from '../../app/account_owner_change';
import {
  addSkillPoints, awardSkillPoints, emptySkillDayLedger,
  type SkillAwardInput, type SkillAwardSkipReason, type SkillDayLedger,
} from './skill_award';
import { EMPTY_SKILL_TOTALS, skillLevelUps, type SkillLevelUp, type SkillTotals } from './skill_levels';
import { SKILL_IDS, type SkillId } from './skill_points_table';

const LOG = '[SKILLS]';
const STATE_KEY_PREFIX = 'skills_v1:';
const ANON_OWNER = 'anon';

export interface SkillsState {
  readonly ownerKey: string;
  readonly totals: SkillTotals;
  readonly ledger: SkillDayLedger;
}

export type SkillsDeps = Readonly<{
  now: () => number;
  /** stableId активного аккаунта или null. */
  ownerStableId: () => Promise<string | null>;
}>;

export type SkillActionEvent = Omit<SkillAwardInput, 'day'>;

export interface SkillRecordResult {
  readonly skill: SkillId | null;
  readonly points: number;
  readonly skipped: SkillAwardSkipReason | null;
  readonly levelUps: readonly SkillLevelUp[];
  /** false — очки показаны, но на диск пока не легли (повтор при следующем событии). */
  readonly saved: boolean;
}

async function defaultOwnerStableId(): Promise<string | null> {
  const { captureAccountGeneration } = await import('../../app/account_generation');
  const token = captureAccountGeneration();
  return token.phase === 'active' && token.stableId ? token.stableId : null;
}

const DEFAULT_DEPS: SkillsDeps = Object.freeze({ now: () => Date.now(), ownerStableId: defaultOwnerStableId });

let deps: SkillsDeps = DEFAULT_DEPS;
let current: SkillsState | null = null;
let unsaved = false;
let queue: Promise<unknown> = Promise.resolve();
const listeners = new Set<(state: SkillsState | null) => void>();

// зачем: память модуля принадлежит владельцу — без сброса следующий аккаунт увидел бы чужие уровни.
onAccountOwnerChanged('skills', () => {
  const previous = current;
  if (unsaved && previous) void persist(previous).then((ok) => log('owner_change:unsaved_flushed', { ok }));
  unsaved = false;
  current = null;
  listeners.forEach((listener) => listener(null));
});

function log(event: string, fields: Record<string, unknown>): void {
  console.log(`${LOG} ${event} ${JSON.stringify(fields)}`);
}

function errText(error: unknown): string {
  return error instanceof Error ? `${error.name}: ${error.message}` : String(error);
}

function localDayKey(nowMs: number): string {
  const d = new Date(nowMs);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function serialized<T>(work: () => Promise<T>): Promise<T> {
  const run = queue.then(work, work);
  queue = run.catch((error: unknown) => {
    console.warn(`${LOG} queue:previous_failed ${JSON.stringify({ error: errText(error) })}`);
  });
  return run;
}

function publish(next: SkillsState | null): void {
  current = next;
  for (const listener of listeners) {
    try {
      listener(next);
    } catch (error) {
      console.warn(`${LOG} listener:failed ${JSON.stringify({ error: errText(error) })}`);
    }
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function cleanCounts(value: unknown): Record<string, number> {
  if (!isRecord(value)) return {};
  return Object.fromEntries(
    Object.entries(value).filter((entry): entry is [string, number] => typeof entry[1] === 'number' && Number.isFinite(entry[1]) && entry[1] > 0),
  );
}

/** Разбор содержимого диска: что не число или меньше нуля — обнуляется, чужой день журнала — отбрасывается позже. */
export function parseSkillsState(raw: string | null, ownerKey: string, dayKey: string): SkillsState {
  const empty: SkillsState = { ownerKey, totals: EMPTY_SKILL_TOTALS, ledger: emptySkillDayLedger(dayKey) };
  if (!raw) return empty;
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch (error) {
    console.warn(`${LOG} parse:bad_json ${JSON.stringify({ error: errText(error), action: 'start_empty' })}`);
    return empty;
  }
  if (!isRecord(parsed)) {
    console.warn(`${LOG} parse:not_object ${JSON.stringify({ action: 'start_empty' })}`);
    return empty;
  }
  const rawTotals = isRecord(parsed.totals) ? parsed.totals : {};
  const totals = Object.fromEntries(SKILL_IDS.map((skill) => {
    const value = rawTotals[skill];
    return [skill, typeof value === 'number' && Number.isFinite(value) && value > 0 ? value : 0];
  })) as Record<SkillId, number>;
  const rawLedger = isRecord(parsed.ledger) ? parsed.ledger : {};
  const ledger: SkillDayLedger = rawLedger.day === dayKey
    ? { day: dayKey, itemHits: cleanCounts(rawLedger.itemHits), actionHits: cleanCounts(rawLedger.actionHits) }
    : emptySkillDayLedger(dayKey);
  return { ownerKey, totals, ledger };
}

async function persist(state: SkillsState): Promise<boolean> {
  try {
    await AsyncStorage.setItem(`${STATE_KEY_PREFIX}${state.ownerKey}`, JSON.stringify({ v: 1, totals: state.totals, ledger: state.ledger }));
    return true;
  } catch (error) {
    console.warn(`${LOG} persist:failed ${JSON.stringify({ ownerKey: state.ownerKey.slice(0, 8), error: errText(error), status: 'stays_in_memory' })}`);
    return false;
  }
}

/** Состояние текущего владельца: из памяти, иначе с диска. Вызывать только внутри serialized. */
async function ensureLoaded(): Promise<SkillsState> {
  const ownerKey = (await deps.ownerStableId()) ?? ANON_OWNER;
  const dayKey = localDayKey(deps.now());
  if (current && current.ownerKey === ownerKey) return current;
  let raw: string | null = null;
  try {
    raw = await AsyncStorage.getItem(`${STATE_KEY_PREFIX}${ownerKey}`);
  } catch (error) {
    // зачем: сбой чтения не должен ронять режим — начинаем с пустого, но причина видна в журнале
    console.warn(`${LOG} load:read_failed ${JSON.stringify({ ownerKey: ownerKey.slice(0, 8), error: errText(error), action: 'start_empty' })}`);
  }
  const state = parseSkillsState(raw, ownerKey, dayKey);
  publish(state);
  return state;
}

/** Сообщить о действии из таблицы очков. Итог виден сразу, запись на диск — следом. */
export function recordSkillAction(event: SkillActionEvent): Promise<SkillRecordResult> {
  return serialized(async () => {
    const before = await ensureLoaded();
    const award = awardSkillPoints({ ...event, day: localDayKey(deps.now()) }, before.ledger);
    if (award.skipped && award.skipped !== 'repeat_exhausted') {
      log('record:skipped', { action: event.action, reason: award.skipped });
    }
    const totals = addSkillPoints(before.totals, award.skill, award.points);
    const changed = totals !== before.totals || award.ledger !== before.ledger;
    if (!changed && !unsaved) {
      return { skill: award.skill, points: 0, skipped: award.skipped, levelUps: [], saved: true };
    }
    const next: SkillsState = { ownerKey: before.ownerKey, totals, ledger: award.ledger };
    publish(next);
    const saved = await persist(next);
    unsaved = !saved;
    return { skill: award.skill, points: award.points, skipped: award.skipped, levelUps: skillLevelUps(before.totals, totals), saved };
  });
}

/** Догрузить состояние с диска (вход на экран, прогрев после первого кадра) и дописать несохранённое. */
export function refreshSkills(): Promise<SkillsState> {
  return serialized(async () => {
    const state = await ensureLoaded();
    if (unsaved) {
      unsaved = !(await persist(state));
      log('refresh:unsaved_retry', { saved: !unsaved });
    }
    return state;
  });
}

/** Мгновенное чтение для первого кадра; null — диск ещё не читали. */
export function peekSkills(): SkillsState | null {
  return current;
}

export function subscribeSkills(listener: (state: SkillsState | null) => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export const __skillStoreTestHooks = Object.freeze({
  reset(): void {
    deps = DEFAULT_DEPS;
    current = null;
    unsaved = false;
    queue = Promise.resolve();
    listeners.clear();
  },
  setDeps(next: SkillsDeps): void {
    deps = next;
  },
});
