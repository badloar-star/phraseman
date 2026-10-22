/**
 * «Дуэль на 5 фраз» (идея 3) — что передаётся экрану дуэли (app/friends_duel.tsx) через адрес и как это проверяется.
 * зачем: адрес экрана — граница системы (его может собрать пуш, вкладка «Друзья» или ссылка), поэтому всё, что пришло,
 * проверяем здесь: режим, друг, ровно 5 разных id фраз, номер дуэли для ответа. Плохой адрес — экран не играет чужое,
 * а показывает «Дуэль не открылась» с причиной в журнале. Туда и обратно — одним модулем, чтобы вкладка и экран не разошлись.
 * Режимы: challenge — свой вызов (ход первым); answer — ответ на вызов друга; result — итог у вызвавшего, только просмотр
 * (всё для экрана — из строки уведомления «Итог дуэли», без чтений сервера).
 */
import { DUEL_MAX_ELAPSED_MS, DUEL_PHRASES, type DuelOutcome } from './duel_core';

export type DuelLaunchMode = 'challenge' | 'answer' | 'result';

/** Итог для режима result: исход с моей стороны, счёт обоих; свои отметки — если сервер их положил. */
export type DuelLaunchResult = Readonly<{
  outcome: DuelOutcome;
  mine: Readonly<{ correct: number; elapsedMs: number; results: readonly boolean[] | null }>;
  theirs: Readonly<{ correct: number; elapsedMs: number; results: readonly boolean[] }>;
}>;

export type DuelLaunch = Readonly<{
  mode: DuelLaunchMode;
  friendUid: string;
  friendName: string;
  friendCoinRank: number | null;
  friendIsPlus: boolean;
  /** 5 id фраз; в итоге — пусто, если сервер их не положил (тогда без таблицы фраз). */
  phraseIds: readonly string[];
  /** Номер дуэли — у ответа и итога. */
  duelId: string | null;
  myName: string;
  /** Строка уведомления о вызове: после отправленного хода отмечаем прочитанной — маркер гаснет. */
  notificationId: string | null;
  result: DuelLaunchResult | null;
}>;

/** Параметры адреса экрана дуэли (expo-router отдаёт строки). */
export type DuelLaunchParams = Readonly<{
  mode: string; friend: string; name: string; rank: string; plus: string; ids: string; duel: string; me: string; n: string;
  out: string; mc: string; mt: string; mr: string; tc: string; tt: string; tr: string;
}>;

type RawParams = Readonly<Partial<Record<keyof DuelLaunchParams, string | string[]>>>;

const MAX_UID = 128;
const MAX_NAME = 64;
const MAX_COIN_RANK = 19;

const bits = (results: readonly boolean[] | null): string => (results ? results.map((r) => (r ? '1' : '0')).join('') : '');

export function duelLaunchParams(launch: DuelLaunch): DuelLaunchParams {
  const r = launch.result;
  return {
    mode: launch.mode,
    friend: launch.friendUid,
    name: launch.friendName,
    rank: launch.friendCoinRank === null ? '' : String(launch.friendCoinRank),
    plus: launch.friendIsPlus ? '1' : '0',
    ids: launch.phraseIds.join(','),
    duel: launch.duelId ?? '',
    me: launch.myName,
    n: launch.notificationId ?? '',
    out: r?.outcome ?? '',
    mc: r ? String(r.mine.correct) : '',
    mt: r ? String(r.mine.elapsedMs) : '',
    mr: bits(r?.mine.results ?? null),
    tc: r ? String(r.theirs.correct) : '',
    tt: r ? String(r.theirs.elapsedMs) : '',
    tr: bits(r?.theirs.results ?? null),
  };
}

const first = (value: string | string[] | undefined): string => (Array.isArray(value) ? value[0] ?? '' : value ?? '').trim();

function name(value: string, fallback: string): string {
  const cleaned = value.replace(/\s+/gu, ' ').trim().slice(0, MAX_NAME);
  return cleaned || fallback;
}

function intIn(text: string, min: number, max: number): number | null {
  if (!/^\d{1,9}$/u.test(text)) return null;
  const value = Number(text);
  return value >= min && value <= max ? value : null;
}

function parseBits(text: string): boolean[] | null {
  return new RegExp(`^[01]{${DUEL_PHRASES}}$`, 'u').test(text) ? [...text].map((c) => c === '1') : null;
}

/** Итог из адреса: исход и счёт обоих обязательны, отметки друга — тоже; свои отметки — по возможности. */
function parseResult(raw: RawParams): DuelLaunchResult | null {
  const outcome = first(raw.out);
  const mineCorrect = intIn(first(raw.mc), 0, DUEL_PHRASES);
  const mineMs = intIn(first(raw.mt), 0, DUEL_MAX_ELAPSED_MS);
  const theirCorrect = intIn(first(raw.tc), 0, DUEL_PHRASES);
  const theirMs = intIn(first(raw.tt), 0, DUEL_MAX_ELAPSED_MS);
  const theirResults = parseBits(first(raw.tr));
  if ((outcome !== 'win' && outcome !== 'loss' && outcome !== 'draw') || mineCorrect === null || mineMs === null
    || theirCorrect === null || theirMs === null || !theirResults) return null;
  return {
    outcome,
    mine: { correct: mineCorrect, elapsedMs: mineMs, results: parseBits(first(raw.mr)) },
    theirs: { correct: theirCorrect, elapsedMs: theirMs, results: theirResults },
  };
}

export type DuelLaunchCheck = Readonly<{ ok: true; launch: DuelLaunch }> | Readonly<{ ok: false; reason: string }>;

/** Проверка адреса экрана дуэли. Причина отказа — для журнала, человеку показываем одно «Дуэль не открылась». */
export function parseDuelLaunch(raw: RawParams, fallbackName: string): DuelLaunchCheck {
  const mode = first(raw.mode);
  if (mode !== 'challenge' && mode !== 'answer' && mode !== 'result') return { ok: false, reason: `mode=${mode || 'none'}` };
  const friendUid = first(raw.friend);
  if (!friendUid || friendUid.length > MAX_UID) return { ok: false, reason: `friend_len=${friendUid.length}` };
  const phraseIds = first(raw.ids).split(',').map((id) => id.trim()).filter(Boolean);
  const idsOk = phraseIds.length === DUEL_PHRASES && new Set(phraseIds).size === DUEL_PHRASES;
  // зачем: в итоге фраз может не быть (старый сервер) — тогда экран без таблицы; играть без пяти фраз нельзя
  if (!idsOk && !(mode === 'result' && phraseIds.length === 0)) return { ok: false, reason: `ids=${phraseIds.length}` };
  const duelId = first(raw.duel);
  if (mode !== 'challenge' && (!duelId || duelId.length > MAX_UID)) return { ok: false, reason: `${mode}_without_duel` };
  const result = mode === 'result' ? parseResult(raw) : null;
  if (mode === 'result' && !result) return { ok: false, reason: 'result_fields' };
  const rankText = first(raw.rank);
  const rank = rankText === '' ? null : Number(rankText);
  const friendCoinRank = rank !== null && Number.isInteger(rank) && rank >= 0 && rank <= MAX_COIN_RANK ? rank : null;
  const notificationId = first(raw.n);
  return {
    ok: true,
    launch: {
      mode,
      friendUid,
      friendName: name(first(raw.name), '?'),
      friendCoinRank,
      friendIsPlus: first(raw.plus) === '1',
      phraseIds,
      duelId: mode === 'challenge' ? null : duelId,
      myName: name(first(raw.me), fallbackName),
      notificationId: mode === 'answer' && notificationId && notificationId.length <= 256 ? notificationId : null,
      result,
    },
  };
}

/* expo-router route shim */
export default function __RouteShim() { return null; }
