/**
 * «Урок вместе» (идея 2) — сторона телефона: позвать друзей на занятие, помнить отправленные приглашения и забрать
 * награду «вместе» после засчитанного занятия у друга.
 *
 * зачем (владелец 21.10, макет docs/design/v2-app/friends-full.html, идея 2; формат сервера согласован с 1 · ЯДРО 22.10):
 * - friendsLessonInvite {friendUids ≤ 3, lessonKey, requestId, minutes?, stars?} → {ok, inviteIds{uid: id}, expiresAtMs{uid: ms}};
 *   повтор с тем же requestId сервер узнаёт по расписке — второго пуша не будет.
 * - friendsLessonTogetherClaim {inviteId, mutationId} → {ok, coins, inviterName} | reason expired / not_completed /
 *   already_claimed / not_invited. not_completed — засчитывание ещё не дошло до сервера: один повтор через ~3 с, потом тихо.
 * - Отправленные приглашения — только на телефоне (AsyncStorage, своё на аккаунт): строка «приглашение закончилось
 *   в полночь» считается здесь, без планировщика и без чтений Firestore.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getApp } from '@react-native-firebase/app';
import { getFunctions, httpsCallable } from '@react-native-firebase/functions';

import { maskUid } from '../diagnostic_mask';
import { getCanonicalUserId } from '../user_id_policy';
import { prepareTogetherSender } from './sender_identity';
import { LESSON_INVITE_MAX } from './lesson_together';

const REGION = 'us-central1';
const SENT_KEY = 'friends_lesson_invites_sent_v1';
/** Сколько хранить отправленные приглашения после истечения — для строки «закончилось» утром. */
const SENT_KEEP_AFTER_EXPIRY_MS = 36 * 60 * 60 * 1000;
export const LESSON_CLAIM_RETRY_MS = 3_000;

export type LessonInviteSendReason = 'network' | 'limit' | 'not_friends' | 'disabled' | 'no_sender';
export type LessonInviteSendResult =
  | Readonly<{ ok: true; inviteIds: Readonly<Record<string, string>>; expiresAtMs: Readonly<Record<string, number>> }>
  | Readonly<{ ok: false; reason: LessonInviteSendReason }>;

export type LessonClaimReason = 'expired' | 'not_completed' | 'already_claimed' | 'not_invited' | 'network';
export type LessonClaimResult =
  | Readonly<{ ok: true; coins: number; inviterName: string }>
  | Readonly<{ ok: false; reason: LessonClaimReason }>;

export type SentLessonInvite = Readonly<{ inviteId: string; friendUid: string; lessonKey: string; sentAtMs: number; expiresAtMs: number }>;

const log = (line: string): void => { console.log(`[FRIENDS-2] ${line}`); }; // guard-ok: журнал «Урок вместе», одна строка на шаг
const errText = (e: unknown): string => (e instanceof Error ? e.message : String((e as { message?: unknown })?.message ?? e));

function makeRequestId(): string {
  return `flt_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
}

function classifySendError(error: unknown): LessonInviteSendReason {
  const text = `${String((error as { code?: unknown })?.code ?? '')} ${errText(error)}`.toLowerCase();
  if (text.includes('disabled')) return 'disabled';
  if (text.includes('limit')) return 'limit';
  if (text.includes('not_friends')) return 'not_friends';
  return 'network';
}

function classifyClaimError(error: unknown): LessonClaimReason {
  const text = `${String((error as { code?: unknown })?.code ?? '')} ${errText(error)}`.toLowerCase();
  if (text.includes('expired')) return 'expired';
  if (text.includes('not_completed')) return 'not_completed';
  if (text.includes('already_claimed')) return 'already_claimed';
  if (text.includes('not_invited')) return 'not_invited';
  return 'network';
}

const isCount = (v: unknown, max: number): v is number => typeof v === 'number' && Number.isInteger(v) && v >= 0 && v <= max;

async function readSentRaw(scope: string): Promise<SentLessonInvite[]> {
  try {
    const raw = await AsyncStorage.getItem(`${SENT_KEY}::${scope}`);
    const parsed: unknown = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((v): v is SentLessonInvite => !!v && typeof v === 'object'
      && typeof (v as SentLessonInvite).inviteId === 'string' && typeof (v as SentLessonInvite).friendUid === 'string'
      && typeof (v as SentLessonInvite).lessonKey === 'string' && typeof (v as SentLessonInvite).expiresAtMs === 'number'
      && typeof (v as SentLessonInvite).sentAtMs === 'number');
  } catch (e) {
    console.warn(`[FRIENDS-2] sent:read failed owner=${maskUid(scope)} → без строки «закончилось»: ${errText(e)}`); // guard-ok: catch называет причину
    return [];
  }
}

async function rememberSent(scope: string, invites: readonly SentLessonInvite[], nowMs: number): Promise<void> {
  const kept = (await readSentRaw(scope)).filter((v) => v.expiresAtMs + SENT_KEEP_AFTER_EXPIRY_MS > nowMs);
  try {
    await AsyncStorage.setItem(`${SENT_KEY}::${scope}`, JSON.stringify([...kept, ...invites]));
  } catch (e) {
    console.warn(`[FRIENDS-2] sent:write failed owner=${maskUid(scope)} → утром без строки «закончилось»: ${errText(e)}`); // guard-ok: catch называет причину
  }
}

/** Отправленные приглашения своего аккаунта (свежие и истёкшие не старше полутора суток). */
export async function readSentLessonInvites(nowMs: number = Date.now()): Promise<SentLessonInvite[]> {
  const scope = await getCanonicalUserId();
  if (!scope) {
    log('sent:read none reason=no_user');
    return [];
  }
  return (await readSentRaw(scope)).filter((v) => v.expiresAtMs + SENT_KEEP_AFTER_EXPIRY_MS > nowMs);
}

type InviteResponse = { ok?: unknown; inviteIds?: unknown; expiresAtMs?: unknown };

/** Позвать до трёх друзей на занятие lessonKey. Повтор при сбое сети — тем же requestId. */
export async function sendLessonInvites(input: Readonly<{ friendUids: readonly string[]; lessonKey: string; minutes?: number; stars?: number }>): Promise<LessonInviteSendResult> {
  const friendUids = [...new Set(input.friendUids)].slice(0, LESSON_INVITE_MAX);
  if (friendUids.length === 0 || !input.lessonKey) {
    log(`invite:skip reason=${friendUids.length === 0 ? 'no_friends' : 'no_lesson'}`);
    return { ok: false, reason: 'not_friends' };
  }
  const sender = await prepareTogetherSender();
  if (!sender) {
    log('invite:skip reason=no_sender');
    return { ok: false, reason: 'no_sender' };
  }
  const requestId = makeRequestId();
  const payload = {
    stableId: sender.stableId,
    ...(sender.displayName ? { senderDisplayName: sender.displayName } : {}),
    friendUids,
    lessonKey: input.lessonKey,
    requestId,
    // зачем (ЯДРО 22.10): числа телефона сервер только обрезает — шлём лишь целые в пределах, иначе поле не кладём
    ...(isCount(input.minutes, 180) ? { minutes: input.minutes } : {}),
    ...(isCount(input.stars, 999) ? { stars: input.stars } : {}),
  };
  const fn = httpsCallable<typeof payload, InviteResponse>(getFunctions(getApp(), REGION), 'friendsLessonInvite');
  for (let attempt = 1; attempt <= 2; attempt += 1) {
    const startedAt = Date.now();
    try {
      const res = await fn(payload);
      const data = res.data ?? {};
      const inviteIds = (data.inviteIds && typeof data.inviteIds === 'object' ? data.inviteIds : {}) as Record<string, string>;
      const expiresAtMs = (data.expiresAtMs && typeof data.expiresAtMs === 'object' ? data.expiresAtMs : {}) as Record<string, number>;
      log(`invite:ok lesson=${input.lessonKey} friends=${friendUids.map(maskUid).join(',')} invites=${Object.keys(inviteIds).length} attempt=${attempt} ms=${Date.now() - startedAt}`);
      const scope = await getCanonicalUserId();
      if (scope) {
        const now = Date.now();
        const sent = friendUids.flatMap((uid) => (typeof inviteIds[uid] === 'string' && typeof expiresAtMs[uid] === 'number'
          ? [{ inviteId: inviteIds[uid], friendUid: uid, lessonKey: input.lessonKey, sentAtMs: now, expiresAtMs: expiresAtMs[uid] }]
          : []));
        await rememberSent(scope, sent, now);
      } else {
        log('invite:remember skip reason=no_user');
      }
      return { ok: true, inviteIds, expiresAtMs };
    } catch (error) {
      const reason = classifySendError(error);
      log(`invite:error lesson=${input.lessonKey} reason=${reason} attempt=${attempt} ms=${Date.now() - startedAt} raw="${errText(error).slice(0, 160)}"`);
      if (reason !== 'network' || attempt === 2) return { ok: false, reason };
    }
  }
  return { ok: false, reason: 'network' };
}

type ClaimResponse = { ok?: unknown; coins?: unknown; inviterName?: unknown };

const wait = (ms: number): Promise<void> => new Promise((resolve) => { setTimeout(resolve, ms); });

/**
 * Забрать награду «вместе» за занятие по приглашению. Один повтор через ~3 с, если засчитывание ещё не дошло до сервера
 * (not_completed) или пропала сеть; дальше — тихо, без бесконечных повторов.
 */
export async function claimLessonTogether(input: Readonly<{ inviteId: string; mutationId: string }>, retryDelayMs: number = LESSON_CLAIM_RETRY_MS): Promise<LessonClaimResult> {
  if (!input.inviteId || !input.mutationId) {
    log(`claim:skip reason=${input.inviteId ? 'no_mutation' : 'no_invite'}`);
    return { ok: false, reason: 'not_invited' };
  }
  const fn = httpsCallable<{ inviteId: string; mutationId: string }, ClaimResponse>(getFunctions(getApp(), REGION), 'friendsLessonTogetherClaim');
  for (let attempt = 1; attempt <= 2; attempt += 1) {
    try {
      const res = await fn({ inviteId: input.inviteId, mutationId: input.mutationId });
      const data = res.data ?? {};
      const coins = typeof data.coins === 'number' && Number.isFinite(data.coins) ? data.coins : 0;
      const inviterName = typeof data.inviterName === 'string' ? data.inviterName : '';
      log(`claim:ok invite=${maskUid(input.inviteId)} coins=${coins} attempt=${attempt}`);
      return { ok: true, coins, inviterName };
    } catch (error) {
      const reason = classifyClaimError(error);
      log(`claim:error invite=${maskUid(input.inviteId)} reason=${reason} attempt=${attempt} raw="${errText(error).slice(0, 160)}"`);
      if ((reason !== 'not_completed' && reason !== 'network') || attempt === 2) return { ok: false, reason };
      await wait(retryDelayMs);
    }
  }
  return { ok: false, reason: 'network' };
}

/* expo-router route shim */
export default function __RouteShim() { return null; }
