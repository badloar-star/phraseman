// ═══════════════════════════════════════════════════════════════════════════
// contest_win_story.ts — история победителю «Набор месяца»: разбор поля contestLastWin и правила показа (чистые функции).
//
// зачем (владелец 29.10: «победителю придёт своя история»; форма и доставка — Ядро 29.10): сервер пишет progress.contest_last_win (JSON v1)
// той же транзакцией, что Plus, и кладёт ту же строку в access_projection/current.contestLastWin — этот документ приложение уже слушает
// (PremiumContext), новых чтений нет. Здесь: разбор строки (битая или чужая версия — причина, не тишина), окно показа (начать не позже 28 дней
// после итогов, держать 7 дней от первого показа на телефоне) и событие историй type 'contest_winner' (ключ повтора — monthId).
// ═══════════════════════════════════════════════════════════════════════════
import { STORY_EVENT_TTL_MS, type StoryEvent } from './story_events_core';

const DAY_MS = 24 * 60 * 60 * 1000;
/** Ядро 29.10: показывать, если с итогов (grantedAtMs) прошло не больше 28 дней. */
export const CONTEST_WIN_START_WITHIN_MS = 28 * DAY_MS;
/** Ядро 29.10: держать 7 дней от первого показа на телефоне — как остальные истории. */
export const CONTEST_WIN_LIVE_MS = STORY_EVENT_TTL_MS;
export const CONTEST_WIN_ID_PREFIX = 'contest_winner:';
const MONTH_ID = /^\d{4}-(0[1-9]|1[0-2])$/;
const RAW_MAX = 4096;

/** Поле Ядра (ContestWinStory v1, functions/src/community_month_tally.ts) после проверки. */
export type ContestWin = Readonly<{
  monthId: string; place: 1 | 2 | 3; plusMonths: number; packId: string; packTitle: string; hearts: number; grantedAtMs: number;
}>;

export type ContestWinParse = Readonly<{ ok: true; win: ContestWin }> | Readonly<{ ok: false; reason: string }>;

const isRecord = (v: unknown): v is Readonly<Record<string, unknown>> => typeof v === 'object' && v !== null && !Array.isArray(v);
const finite = (v: unknown): number | null => (typeof v === 'number' && Number.isFinite(v) ? v : null);

/** Строка поля → победа; иначе причина (absent — поля нет, это норма; остальное — данные не те, что пишет Ядро). */
export function parseContestLastWin(raw: string | null): ContestWinParse {
  if (raw === null || raw === '') return { ok: false, reason: 'absent' };
  if (raw.length > RAW_MAX) return { ok: false, reason: `too_long:${raw.length}` };
  let value: unknown;
  try {
    value = JSON.parse(raw);
  } catch (error) {
    // зачем: битая строка — не повод ронять кольцо историй; причина уходит в лог моста ([STORY-CONTEST])
    return { ok: false, reason: `bad_json:${error instanceof Error ? error.name : 'unknown'}` };
  }
  if (!isRecord(value)) return { ok: false, reason: 'not_object' };
  if (value.v !== 1) return { ok: false, reason: `version:${String(value.v)}` };
  const monthId = typeof value.monthId === 'string' ? value.monthId : '';
  if (!MONTH_ID.test(monthId)) return { ok: false, reason: `month_id:${monthId.slice(0, 16)}` };
  const place = value.place === 1 || value.place === 2 || value.place === 3 ? value.place : null;
  if (place === null) return { ok: false, reason: `place:${String(value.place)}` };
  const grantedAtMs = finite(value.grantedAtMs);
  if (grantedAtMs === null || grantedAtMs <= 0) return { ok: false, reason: 'granted_at' };
  const plusMonths = finite(value.plusMonths);
  if (plusMonths === null || plusMonths < 0) return { ok: false, reason: `plus_months:${String(value.plusMonths)}` };
  return {
    ok: true,
    win: {
      monthId, place, plusMonths: Math.trunc(plusMonths), grantedAtMs,
      packId: typeof value.packId === 'string' ? value.packId : '',
      packTitle: typeof value.packTitle === 'string' ? value.packTitle : '',
      hearts: Math.max(0, Math.trunc(finite(value.hearts) ?? 0)),
    },
  };
}

/** Запись на телефоне: какой месяц уже показан, когда впервые и просмотрен ли (только последняя победа). */
export type ContestWinLocal = Readonly<{ monthId: string; firstShownAtMs: number; seen: boolean }>;

export function parseContestWinLocal(raw: string | null): ContestWinLocal | null {
  if (!raw) return null;
  try {
    const value: unknown = JSON.parse(raw);
    if (!isRecord(value) || value.v !== 1 || typeof value.monthId !== 'string' || finite(value.firstShownAtMs) === null) return null;
    return { monthId: value.monthId, firstShownAtMs: finite(value.firstShownAtMs) ?? 0, seen: value.seen === true };
  } catch {
    // зачем: битая отметка = «не показывали»; история появится снова — это лучше, чем потерять её молча (причину пишет загрузка в store)
    return null;
  }
}

export function serializeContestWinLocal(local: ContestWinLocal): string {
  return JSON.stringify({ v: 1, monthId: local.monthId, firstShownAtMs: local.firstShownAtMs, seen: local.seen });
}

export function contestWinEventId(monthId: string): string {
  return `${CONTEST_WIN_ID_PREFIX}${monthId}`;
}

export type ContestWinInput = Readonly<{
  /** Флаг историй stories_v1. */
  enabled: boolean;
  /** Аккаунт телефона сейчас (captureAccountGeneration). */
  owner: string | null;
  /** Чей снапшот проекции прислал PremiumContext. */
  sourceUid: string | null;
  raw: string | null;
  local: ContestWinLocal | null;
  localLoaded: boolean;
  nowMs: number;
}>;

export type ContestWinDecision =
  | Readonly<{ show: true; event: StoryEvent; firstShow: boolean }>
  | Readonly<{ show: false; reason: string }>;

/** Показывать ли историю победителю и какой; причина отказа — для лога моста. */
export function contestWinDecision(input: ContestWinInput): ContestWinDecision {
  if (!input.enabled) return { show: false, reason: 'stories_off' };
  if (!input.owner) return { show: false, reason: 'no_owner' };
  if (input.sourceUid === null) return { show: false, reason: 'no_projection' };
  // зачем: сменили аккаунт, а у нового ещё нет документа проекции — строка прежнего аккаунта чужая, её не показываем
  if (input.sourceUid !== input.owner) return { show: false, reason: 'other_account' };
  const parsed = parseContestLastWin(input.raw);
  if (!parsed.ok) return { show: false, reason: parsed.reason };
  if (!input.localLoaded) return { show: false, reason: 'loading' };
  const { win } = parsed;
  const same = input.local !== null && input.local.monthId === win.monthId ? input.local : null;
  if (!same && input.nowMs - win.grantedAtMs > CONTEST_WIN_START_WITHIN_MS) return { show: false, reason: 'too_old' };
  const firstShownAtMs = same ? same.firstShownAtMs : input.nowMs;
  if (input.nowMs - firstShownAtMs > CONTEST_WIN_LIVE_MS) return { show: false, reason: 'expired' };
  const event: StoryEvent = Object.freeze({
    id: contestWinEventId(win.monthId),
    type: 'contest_winner',
    payload: Object.freeze({
      monthId: win.monthId, place: win.place, plusMonths: win.plusMonths, packId: win.packId, packTitle: win.packTitle,
      hearts: win.hearts, grantedAtMs: win.grantedAtMs,
    }),
    atMs: firstShownAtMs,
    seen: same?.seen === true,
  });
  return { show: true, event, firstShow: !same };
}
