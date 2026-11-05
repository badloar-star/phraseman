// ═══════════════════════════════════════════════════════════════════════════
// referral_ladder_story.ts — история лесенки приглашений: разбор поля referralLastReward и правила показа (чистые функции).
//
// зачем (владелец 29.10: «автоматически, плюс история»; форма и доставка — Ядро 29.10): сервер пишет progress.referral_last_reward
// (LadderStory v1) той же транзакцией, что монеты и Plus, и кладёт ту же строку в access_projection/current.referralLastReward — этот
// документ приложение уже слушает (PremiumContext), новых чтений нет. Здесь: разбор строки (битая или чужая версия — причина, не тишина),
// флаг лесенки (referral_ladder_enabled), окно (начать не позже 7 дней после награды, держать 7 дней от первого показа) и событие историй
// type 'referral_ladder' (ключ — роль + номер друга + время награды; поле хранит только последнюю награду — придёт одна история).
// ═══════════════════════════════════════════════════════════════════════════
import { STORY_EVENT_TTL_MS, type StoryEvent } from './story_events_core';

const DAY_MS = 24 * 60 * 60 * 1000;
/** Ядро 29.10: награды частые — начать показ не позже 7 дней после неё. */
export const LADDER_STORY_START_WITHIN_MS = 7 * DAY_MS;
/** Держать 7 дней от первого показа на телефоне — как остальные истории. */
export const LADDER_STORY_LIVE_MS = STORY_EVENT_TTL_MS;
export const LADDER_STORY_ID_PREFIX = 'referral_ladder:';
const RAW_MAX = 1024;

/** Поле Ядра (LadderStory v1, functions/src/referral_ladder_server.ts) после проверки. */
export type LadderReward = Readonly<{ role: 'referrer' | 'referee'; coins: number; plusDays: number; friendNumber: number; atMs: number }>;

export type LadderRewardParse = Readonly<{ ok: true; reward: LadderReward }> | Readonly<{ ok: false; reason: string }>;

const isRecord = (v: unknown): v is Readonly<Record<string, unknown>> => typeof v === 'object' && v !== null && !Array.isArray(v);
const finite = (v: unknown): number | null => (typeof v === 'number' && Number.isFinite(v) ? v : null);

/** Строка поля → награда; иначе причина (absent — поля нет, это норма; остальное — данные не те, что пишет Ядро). */
export function parseReferralLastReward(raw: string | null): LadderRewardParse {
  if (raw === null || raw === '') return { ok: false, reason: 'absent' };
  if (raw.length > RAW_MAX) return { ok: false, reason: `too_long:${raw.length}` };
  let value: unknown;
  try {
    value = JSON.parse(raw);
  } catch (error) {
    // зачем: битая строка — не повод ронять кольцо историй; причина уходит в лог моста ([STORY-LADDER])
    console.warn(`[STORY-LADDER] parse: битый JSON → ${error instanceof Error ? error.name : 'unknown'}`); // guard-ok: catch называет причину
    return { ok: false, reason: `bad_json:${error instanceof Error ? error.name : 'unknown'}` };
  }
  if (!isRecord(value)) return { ok: false, reason: 'not_object' };
  if (value.v !== 1) return { ok: false, reason: `version:${String(value.v)}` };
  if (value.kind !== 'ladder') return { ok: false, reason: `kind:${String(value.kind)}` };
  const role = value.role === 'referrer' || value.role === 'referee' ? value.role : null;
  if (role === null) return { ok: false, reason: `role:${String(value.role)}` };
  const coins = finite(value.coins);
  if (coins === null || coins <= 0) return { ok: false, reason: `coins:${String(value.coins)}` };
  const plusDays = finite(value.plusDays);
  if (plusDays === null || plusDays < 0) return { ok: false, reason: `plus_days:${String(value.plusDays)}` };
  const atMs = finite(value.atMs);
  if (atMs === null || atMs <= 0) return { ok: false, reason: 'at_ms' };
  return {
    ok: true,
    reward: { role, coins: Math.trunc(coins), plusDays: Math.trunc(plusDays), friendNumber: Math.max(0, Math.trunc(finite(value.friendNumber) ?? 0)), atMs }, // guard-ok: разбор чисел для текста истории, баланс не меняется

  };
}

/** Ключ награды: одна и та же награда (роль, номер друга, время) — одна история; новая награда — новая история. */
export function ladderRewardKey(reward: LadderReward): string {
  return `${reward.role}:${reward.friendNumber}:${reward.atMs}`;
}

export function ladderStoryEventId(key: string): string {
  return `${LADDER_STORY_ID_PREFIX}${key}`;
}

/** Отметка на телефоне: какая награда уже показана, когда впервые и просмотрена ли (только последняя). */
export type LadderStoryLocal = Readonly<{ key: string; firstShownAtMs: number; seen: boolean }>;

export function parseLadderStoryLocal(raw: string | null): LadderStoryLocal | null {
  if (!raw) return null;
  try {
    const value: unknown = JSON.parse(raw);
    if (!isRecord(value) || value.v !== 1 || typeof value.key !== 'string' || finite(value.firstShownAtMs) === null) return null;
    return { key: value.key, firstShownAtMs: finite(value.firstShownAtMs) ?? 0, seen: value.seen === true };
  } catch (error) {
    console.warn(`[STORY-LADDER] отметка показа: битая запись → «не показывали» (${error instanceof Error ? error.name : 'unknown'})`); // guard-ok: catch называет причину
    // зачем: битая отметка = «не показывали»; история появится снова — это лучше, чем потерять её молча (причину пишет загрузка в store)
    return null;
  }
}

export function serializeLadderStoryLocal(local: LadderStoryLocal): string {
  return JSON.stringify({ v: 1, key: local.key, firstShownAtMs: local.firstShownAtMs, seen: local.seen });
}

export type LadderStoryInput = Readonly<{
  /** Флаг историй stories_v1. */
  enabled: boolean;
  /** Флаг лесенки referral_ladder_enabled (тот же, что у экрана лесенки Дизайна). */
  ladderEnabled: boolean;
  owner: string | null;
  sourceUid: string | null;
  raw: string | null;
  local: LadderStoryLocal | null;
  localLoaded: boolean;
  /** Бессрочный Plus (usePremium().isPro): фраза «ещё N — и Plus» для него неправда. */
  lifetime: boolean;
  nowMs: number;
}>;

export type LadderStoryDecision =
  | Readonly<{ show: true; event: StoryEvent; firstShow: boolean; key: string }>
  | Readonly<{ show: false; reason: string }>;

/** Показывать ли историю лесенки и какую; причина отказа — для лога моста. */
export function ladderStoryDecision(input: LadderStoryInput): LadderStoryDecision {
  if (!input.enabled) return { show: false, reason: 'stories_off' };
  if (!input.ladderEnabled) return { show: false, reason: 'ladder_off' };
  if (!input.owner) return { show: false, reason: 'no_owner' };
  if (input.sourceUid === null) return { show: false, reason: 'no_projection' };
  // зачем: сменили аккаунт, а у нового ещё нет документа проекции — строка прежнего аккаунта чужая, её не показываем
  if (input.sourceUid !== input.owner) return { show: false, reason: 'other_account' };
  const parsed = parseReferralLastReward(input.raw);
  if (!parsed.ok) return { show: false, reason: parsed.reason };
  if (!input.localLoaded) return { show: false, reason: 'loading' };
  const { reward } = parsed;
  const key = ladderRewardKey(reward);
  const same = input.local !== null && input.local.key === key ? input.local : null;
  if (!same && input.nowMs - reward.atMs > LADDER_STORY_START_WITHIN_MS) return { show: false, reason: 'too_old' };
  const firstShownAtMs = same ? same.firstShownAtMs : input.nowMs;
  if (input.nowMs - firstShownAtMs > LADDER_STORY_LIVE_MS) return { show: false, reason: 'expired' };
  const event: StoryEvent = Object.freeze({
    id: ladderStoryEventId(key),
    type: 'referral_ladder',
    payload: Object.freeze({
      role: reward.role, coins: reward.coins, plusDays: reward.plusDays, friendNumber: reward.friendNumber, atMs: reward.atMs, lifetime: input.lifetime,
    }),
    atMs: firstShownAtMs,
    seen: same?.seen === true,
  });
  return { show: true, event, firstShow: !same, key };
}
