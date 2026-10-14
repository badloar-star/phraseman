/**
 * Шпиль — строки «Комнаты недели» из документа комнаты + своих локальных ступеней (пакет B).
 * Чистый модуль: ни React, ни Firebase, ни часов (nowMs приходит снаружи).
 *
 * зачем (TOWER.md §4.5, D56): документ spire_groups/{id} несёт только живых
 * (members) и лица ботов (roster); ступени ботов считаются формулой на
 * устройстве (residents.ts). Свои ступени берём ЛОКАЛЬНЫЕ — маркер и место
 * меняются мгновенно после ступени, без ожидания сервера (Optimistic UI), и
 * боты сразу уступают зону. Чужие живые — из кэша комнаты (TTL 6 ч).
 */
import {
  spireResidentRows,
  spireRoomResidents,
  type SpireResidentTuning,
  type SpireRosterEntry,
} from './residents';
import { spireBotCoinRank } from './bot_coin_rank';
import { spireBotWeekCoins, type SpireRankBy } from './config_contract';

/** Живой участник комнаты — поля документа, которые нужны экрану. */
export type SpireRoomMember = Readonly<{
  uid: string;
  name: string;
  steps: number;
  reachedAtMs: number;
  totalMs: number;
  /** зачем (владелец 13.10, «аватары ников — монеты рангов»): ранг монеты 0..19 из того же документа комнаты; нет поля — null (рисуется базовая монета). */
  coinRank?: number | null;
  /** D162: монеты недели всех режимов — снимок сервера при последнем входе/отчёте участника; нет поля — 0. */
  weekCoins?: number;
}>;

/** Кэш комнаты недели на устройстве (форма app/spire/spire_room_client.ts). */
export type SpireRoomSnapshot = Readonly<{
  schema: 'spire-room-cache.v1';
  uid: string;
  lang: string;
  weekId: string;
  groupId: string;
  tier: number;
  cohortDay: number;
  weekStartMs: number;
  members: readonly SpireRoomMember[];
  roster: readonly SpireRosterEntry[];
  fetchedAtMs: number;
}>;

export type SpireRoomRow = Readonly<{
  uid: string;
  name: string;
  steps: number;
  reachedAtMs: number;
  isMe: boolean;
  coinRank?: number | null;
  /** D162: монеты недели (у ботов — формула от ступеней, только для показа). */
  weekCoins: number;
}>;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function num(value: unknown): number {
  const n = Number(value);
  return Number.isFinite(n) ? Math.max(0, Math.trunc(n)) : 0;
}

/** Ранг монеты из документа: целое 0..19, иначе null (чужое значение не угадываем). */
export function spireDecodeCoinRank(value: unknown): number | null {
  return typeof value === 'number' && Number.isInteger(value) && value >= 0 && value <= 19 ? value : null;
}

/** members документа (карта uid → запись) → массив. Мусорные записи отбрасываются. */
export function spireDecodeRoomMembers(raw: unknown): SpireRoomMember[] {
  if (!isRecord(raw)) return [];
  const out: SpireRoomMember[] = [];
  for (const [key, value] of Object.entries(raw)) {
    if (!isRecord(value)) continue;
    const uid = typeof value.uid === 'string' && value.uid ? value.uid : key;
    const name = typeof value.name === 'string' ? value.name.trim().slice(0, 48) : '';
    out.push({ uid, name: name || '—', steps: num(value.steps), reachedAtMs: num(value.reachedAtMs), totalMs: num(value.totalMs), coinRank: spireDecodeCoinRank(value.coinRank), weekCoins: num(value.weekCoins) });
  }
  return out;
}

/** roster документа → лица ботов. Запись без слота/имени не показывается (T26). */
export function spireDecodeRoster(raw: unknown): SpireRosterEntry[] {
  if (!Array.isArray(raw)) return [];
  const out: SpireRosterEntry[] = [];
  for (const value of raw) {
    if (!isRecord(value) || !Number.isInteger(value.slot) || typeof value.uid !== 'string' || typeof value.name !== 'string') continue;
    out.push({
      uid: value.uid,
      slot: Number(value.slot),
      name: value.name,
      avatar: typeof value.avatar === 'string' ? value.avatar : null,
      aura: null,
      isPremium: value.isPremium === true,
      streak: num(value.streak),
      coinRank: spireDecodeCoinRank(value.coinRank),
    });
  }
  return out;
}

/** Порядок комнаты: ступени по убыванию, ничья — кто раньше дошёл (0 = не играл — ниже). */
export function spireCompareRows(a: SpireRoomRow, b: SpireRoomRow): number {
  if (b.steps !== a.steps) return b.steps - a.steps;
  const ar = a.reachedAtMs > 0 ? a.reachedAtMs : Number.MAX_SAFE_INTEGER;
  const br = b.reachedAtMs > 0 ? b.reachedAtMs : Number.MAX_SAFE_INTEGER;
  return ar - br;
}

/**
 * D162 (OWNER_FINAL 10.10): при rankBy='coins' порядок комнаты — монеты недели всех режимов, ничья — прежний порядок по ступеням.
 * Тот же порядок, что у сервера в итоге недели (compareSpireStandingBy), иначе человек видел бы одно место, а получал другое.
 */
export function spireCompareRowsBy(rankBy: SpireRankBy): (a: SpireRoomRow, b: SpireRoomRow) => number {
  if (rankBy !== 'coins') return spireCompareRows;
  return (a, b) => (b.weekCoins !== a.weekCoins ? b.weekCoins - a.weekCoins : spireCompareRows(a, b));
}

export type SpireRoomRowsInput = Readonly<{
  room: SpireRoomSnapshot;
  myUid: string;
  /** Локальные ступени недели (авторитетны для своего маркера). */
  mySteps: number;
  myReachedAtMs: number;
  nowMs: number;
  tuning: SpireResidentTuning;
  /** D162: чем ранжировать (spireEffectiveRankBy из уже кэшируемого конфига); нет — ступени. */
  rankBy?: SpireRankBy;
  /**
   * D162, только dev-показ (dev_state?spireRankBy=coins): до выкладки сервера у живых нет снимка weekCoins — пустую сумму
   * заполняем формулой показа ботов (ступени × 30), чтобы кадр не был «0 монет» у всех. В боевом пути не передаётся.
   */
  fillMissingWeekCoinsForPreview?: boolean;
}>;

/** Все строки комнаты (живые + боты), уже отсортированные. */
export function spireBuildRoomRows(input: SpireRoomRowsInput): SpireRoomRow[] {
  const { room, myUid } = input;
  const liveWeekCoins = (value: number | undefined, steps: number): number =>
    (value ?? 0) > 0 || !input.fillMissingWeekCoinsForPreview ? (value ?? 0) : spireBotWeekCoins(steps);
  const serverMe = room.members.find((m) => m.uid === myUid);
  const serverSteps = serverMe?.steps ?? 0;
  const mySteps = Math.max(input.mySteps, serverSteps);
  const myReached = input.mySteps >= serverSteps ? input.myReachedAtMs : (serverMe?.reachedAtMs ?? 0);
  const live: SpireRoomRow[] = room.members
    .filter((m) => m.uid !== myUid)
    .map((m) => ({ uid: m.uid, name: m.name, steps: m.steps, reachedAtMs: m.reachedAtMs, isMe: false, coinRank: m.coinRank ?? null, weekCoins: liveWeekCoins(m.weekCoins, m.steps) }));
  live.push({ uid: myUid, name: serverMe?.name ?? '—', steps: mySteps, reachedAtMs: myReached, isMe: true, coinRank: serverMe?.coinRank ?? null, weekCoins: liveWeekCoins(serverMe?.weekCoins, mySteps) });

  const states = spireRoomResidents({
    groupId: room.groupId,
    weekStartMs: room.weekStartMs,
    cohortDay: room.cohortDay,
    nowMs: input.nowMs,
    live: live.map((m) => ({ uid: m.uid, steps: m.steps })),
    tuning: input.tuning,
  });
  const bots: SpireRoomRow[] = spireResidentRows(room.roster, states)
    .map((r) => ({ uid: r.uid, name: r.name, steps: r.steps, reachedAtMs: r.reachedAtMs, isMe: false, coinRank: r.coinRank ?? spireBotCoinRank(r.uid, room.groupId), weekCoins: spireBotWeekCoins(r.steps) })); // зачем (Ядро 13.10): у ботов старых комнат ранга в roster нет — детерминированная формула, как на сервере
  return [...live, ...bots].sort(spireCompareRowsBy(input.rankBy ?? 'steps'));
}

/** Моё место (1-based) или null. */
export function spireMyPlace(rows: readonly SpireRoomRow[]): number | null {
  const i = rows.findIndex((r) => r.isMe);
  return i >= 0 ? i + 1 : null;
}
