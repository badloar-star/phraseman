// ═══ Визитка «Про»: чтение чужой визитки и запись своего текста ═══════════════
// зачем (владелец 2026-09-30): свой текст визитки «Про» видят другие игроки, когда
// открывают визитку. Пишется ТОЛЬКО через callable profileCardBioSetMine (правила
// Firestore запрещают клиенту писать public_profiles). Чтение чужой визитки — один
// документ public_profiles/{uid} по явному открытию визитки, с кэшем в памяти на
// 10 минут и склейкой одновременных запросов (Firebase-экономия: повторное
// открытие той же визитки не читает сеть).
import firestore from '@react-native-firebase/firestore';

import { withCallableTimeout } from './callable_timeout';
import { CLOUD_SYNC_ENABLED, IS_EXPO_GO } from './config';
import { DebugLogger } from './debug-logger';
import { isProfileCardProStyle, type ProfileCardProStyle } from './profile_card_styles';

const LOG = '[PROFILE-CARD]';
const REGION = 'us-central1';
const PUBLIC_CARD_TTL_MS = 10 * 60 * 1000;
const PUBLIC_CARD_CACHE_MAX = 128;

export const PROFILE_CARD_BIO_MAX_CHARS = 80;

export type PublicProfileCard = Readonly<{
  pro: boolean;
  style: ProfileCardProStyle | null;
  /** Текст показывается только при pro === true. */
  bio: string;
}>;

const EMPTY_CARD: PublicProfileCard = Object.freeze({ pro: false, style: null, bio: '' });

type CacheEntry = { card: PublicProfileCard; fetchedAt: number };
const cache = new Map<string, CacheEntry>();
const inFlight = new Map<string, Promise<PublicProfileCard>>();

export function normalizePublicProfileCard(data: Record<string, unknown> | null | undefined): PublicProfileCard {
  if (!data) return EMPTY_CARD;
  const pro = data.profileCardPro === true;
  const style = pro && isProfileCardProStyle(data.profileCardStyle) ? data.profileCardStyle : null;
  const rawBio = typeof data.profileCardBio === 'string' ? data.profileCardBio : '';
  // Сервер уже проверил текст; здесь лишь страховка от старых/чужих записей.
  const bio = pro ? Array.from(rawBio.replace(/\s+/g, ' ').trim()).slice(0, PROFILE_CARD_BIO_MAX_CHARS).join('') : '';
  return Object.freeze({ pro, style, bio });
}

export function peekPublicProfileCard(uid: string): PublicProfileCard | null {
  const entry = cache.get(uid);
  if (!entry || Date.now() - entry.fetchedAt >= PUBLIC_CARD_TTL_MS) return null;
  return entry.card;
}

function remember(uid: string, card: PublicProfileCard): void {
  cache.delete(uid);
  cache.set(uid, { card, fetchedAt: Date.now() });
  while (cache.size > PUBLIC_CARD_CACHE_MAX) {
    const oldest = cache.keys().next().value as string | undefined;
    if (oldest === undefined) break;
    cache.delete(oldest); // guard-ok: Map в памяти, не Firestore
  }
}

/** Визитка другого игрока. Никогда не бросает: сбой → обычная визитка без текста + лог. */
export function fetchPublicProfileCard(uid: string): Promise<PublicProfileCard> {
  const id = uid.trim();
  if (!id) {
    DebugLogger.info(LOG, 'чужая визитка: пустой uid — показываем обычную');
    return Promise.resolve(EMPTY_CARD);
  }
  const cached = peekPublicProfileCard(id);
  if (cached) return Promise.resolve(cached);
  if (IS_EXPO_GO || !CLOUD_SYNC_ENABLED) {
    DebugLogger.info(LOG, `чужая визитка: облако выключено ${JSON.stringify({ uid: id, IS_EXPO_GO, CLOUD_SYNC_ENABLED })}`);
    return Promise.resolve(EMPTY_CARD);
  }
  const pending = inFlight.get(id);
  if (pending) return pending;
  const startedAt = Date.now();
  const run = (async () => {
    try {
      const snap = await firestore().collection('public_profiles').doc(id).get(); // guard-ok: один документ по id
      const data = snap.exists ? (snap.data() as Record<string, unknown> | undefined) ?? null : null;
      const card = normalizePublicProfileCard(data);
      DebugLogger.info(LOG, `чужая визитка: прочитана ${JSON.stringify({
        uid: id, exists: snap.exists, pro: card.pro, style: card.style, bioLength: card.bio.length, ms: Date.now() - startedAt,
      })}`);
      remember(id, card);
      return card;
    } catch (error) {
      DebugLogger.warn(LOG, `чужая визитка: чтение упало — показываем обычную ${JSON.stringify({ uid: id, error: String(error) })}`);
      return EMPTY_CARD;
    } finally {
      inFlight.delete(id);
    }
  })();
  inFlight.set(id, run);
  return run;
}

// ── Свой текст ──────────────────────────────────────────────────────────────

export type ProfileCardBioSaveFailure =
  | 'pro_required'
  | 'too_long'
  | 'line_break'
  | 'control_char'
  | 'profanity'
  | 'rate_limited'
  | 'offline'
  | 'failed';

export type ProfileCardBioSaveResult =
  | Readonly<{ ok: true; text: string }>
  | Readonly<{ ok: false; reason: ProfileCardBioSaveFailure; retryAfterMs?: number }>;

const LINE_BREAK_RE = /[\r\n]/;

/** Быстрая проверка до сети — те же правила, что на сервере (сервер всё равно решает). */
export function precheckProfileCardBio(text: string): ProfileCardBioSaveFailure | null {
  if (LINE_BREAK_RE.test(text)) return 'line_break';
  if (Array.from(text.trim()).length > PROFILE_CARD_BIO_MAX_CHARS) return 'too_long';
  return null;
}

function reasonFromError(error: unknown): { reason: ProfileCardBioSaveFailure; retryAfterMs?: number } {
  const e = error as { code?: unknown; message?: unknown; details?: unknown } | null;
  const details = (e?.details && typeof e.details === 'object') ? e.details as Record<string, unknown> : {};
  const raw = String(details.reason ?? e?.message ?? '');
  const known: readonly ProfileCardBioSaveFailure[] = [
    'pro_required', 'too_long', 'line_break', 'control_char', 'profanity', 'rate_limited',
  ];
  const hit = known.find((reason) => raw.includes(reason));
  if (hit) {
    const retry = Number(details.retryAfterMs);
    return Number.isFinite(retry) && retry > 0 ? { reason: hit, retryAfterMs: retry } : { reason: hit };
  }
  const code = String(e?.code ?? '');
  if (code.includes('unavailable') || code.includes('deadline') || code === 'callable_timeout') return { reason: 'offline' };
  return { reason: 'failed' };
}

export async function saveMyProfileCardBio(
  input: Readonly<{ stableId: string; text: string }>,
): Promise<ProfileCardBioSaveResult> {
  const startedAt = Date.now();
  DebugLogger.info(LOG, `свой текст: отправка ${JSON.stringify({ stableId: input.stableId, length: input.text.length })}`);
  const pre = precheckProfileCardBio(input.text);
  if (pre) {
    DebugLogger.info(LOG, `свой текст: отказ до сети ${JSON.stringify({ reason: pre })}`);
    return { ok: false, reason: pre };
  }
  if (IS_EXPO_GO || !CLOUD_SYNC_ENABLED) {
    DebugLogger.info(LOG, `свой текст: облако выключено ${JSON.stringify({ IS_EXPO_GO, CLOUD_SYNC_ENABLED })}`);
    return { ok: false, reason: 'offline' };
  }
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { getApp } = require('@react-native-firebase/app');
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { getFunctions, httpsCallable } = require('@react-native-firebase/functions');
    const fn = httpsCallable(getFunctions(getApp(), REGION), 'profileCardBioSetMine') as (
      data: { stableId: string; text: string },
    ) => Promise<{ data: { ok?: boolean; status?: string; text?: unknown } }>;
    const res = await withCallableTimeout(fn({ stableId: input.stableId, text: input.text }), 'profileCardBioSetMine');
    const text = typeof res.data?.text === 'string' ? res.data.text : input.text.trim();
    DebugLogger.info(LOG, `свой текст: сервер принял ${JSON.stringify({ status: res.data?.status ?? null, length: text.length, ms: Date.now() - startedAt })}`);
    return { ok: true, text };
  } catch (error) {
    const mapped = reasonFromError(error);
    DebugLogger.warn(LOG, `свой текст: сервер отказал ${JSON.stringify({
      ...mapped, code: (error as { code?: unknown })?.code ?? null, message: String((error as { message?: unknown })?.message ?? error), ms: Date.now() - startedAt,
    })}`);
    return { ok: false, ...mapped };
  }
}

export const __profileCardPublicTestHooks = {
  reset: (): void => { cache.clear(); inFlight.clear(); },
  remember,
};
