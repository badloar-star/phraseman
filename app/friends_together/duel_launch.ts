/**
 * «Дуэль на 5 фраз» (идея 3) — что передаётся экрану дуэли (app/friends_duel.tsx) через адрес и как это проверяется.
 * зачем: адрес экрана — граница системы (его может собрать пуш, вкладка «Друзья» или ссылка), поэтому всё, что пришло,
 * проверяем здесь: режим, друг, ровно 5 разных id фраз, номер дуэли для ответа. Плохой адрес — экран не играет чужое,
 * а показывает «Дуэль не открылась» с причиной в журнале. Туда и обратно — одним модулем, чтобы вкладка и экран не разошлись.
 */
import { DUEL_PHRASES } from './duel_core';

export type DuelLaunchMode = 'challenge' | 'answer';

export type DuelLaunch = Readonly<{
  mode: DuelLaunchMode;
  friendUid: string;
  friendName: string;
  friendCoinRank: number | null;
  friendIsPlus: boolean;
  phraseIds: readonly string[];
  /** Номер дуэли — только у ответа на вызов. */
  duelId: string | null;
  myName: string;
}>;

/** Параметры адреса экрана дуэли (expo-router отдаёт строки). */
export type DuelLaunchParams = Readonly<{ mode: string; friend: string; name: string; rank: string; plus: string; ids: string; duel: string; me: string }>;

type RawParams = Readonly<Partial<Record<keyof DuelLaunchParams, string | string[]>>>;

const MAX_UID = 128;
const MAX_NAME = 64;
const MAX_COIN_RANK = 19;

export function duelLaunchParams(launch: DuelLaunch): DuelLaunchParams {
  return {
    mode: launch.mode,
    friend: launch.friendUid,
    name: launch.friendName,
    rank: launch.friendCoinRank === null ? '' : String(launch.friendCoinRank),
    plus: launch.friendIsPlus ? '1' : '0',
    ids: launch.phraseIds.join(','),
    duel: launch.duelId ?? '',
    me: launch.myName,
  };
}

const first = (value: string | string[] | undefined): string => (Array.isArray(value) ? value[0] ?? '' : value ?? '').trim();

function name(value: string, fallback: string): string {
  const cleaned = value.replace(/\s+/gu, ' ').trim().slice(0, MAX_NAME);
  return cleaned || fallback;
}

export type DuelLaunchCheck = Readonly<{ ok: true; launch: DuelLaunch }> | Readonly<{ ok: false; reason: string }>;

/** Проверка адреса экрана дуэли. Причина отказа — для журнала, человеку показываем одно «Дуэль не открылась». */
export function parseDuelLaunch(raw: RawParams, fallbackName: string): DuelLaunchCheck {
  const mode = first(raw.mode);
  if (mode !== 'challenge' && mode !== 'answer') return { ok: false, reason: `mode=${mode || 'none'}` };
  const friendUid = first(raw.friend);
  if (!friendUid || friendUid.length > MAX_UID) return { ok: false, reason: `friend_len=${friendUid.length}` };
  const phraseIds = first(raw.ids).split(',').map((id) => id.trim()).filter(Boolean);
  if (phraseIds.length !== DUEL_PHRASES || new Set(phraseIds).size !== DUEL_PHRASES) return { ok: false, reason: `ids=${phraseIds.length}` };
  const duelId = first(raw.duel);
  if (mode === 'answer' && (!duelId || duelId.length > MAX_UID)) return { ok: false, reason: 'answer_without_duel' };
  const rankText = first(raw.rank);
  const rank = rankText === '' ? null : Number(rankText);
  const friendCoinRank = rank !== null && Number.isInteger(rank) && rank >= 0 && rank <= MAX_COIN_RANK ? rank : null;
  return {
    ok: true,
    launch: {
      mode,
      friendUid,
      friendName: name(first(raw.name), '?'),
      friendCoinRank,
      friendIsPlus: first(raw.plus) === '1',
      phraseIds,
      duelId: mode === 'answer' ? duelId : null,
      myName: name(first(raw.me), fallbackName),
    },
  };
}

/* expo-router route shim */
export default function __RouteShim() { return null; }
