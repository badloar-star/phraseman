/**
 * «Урок вместе» (идея 2) у друга: принятое приглашение → занятие засчитано → награда «вместе».
 *
 * зачем (макет docs/design/v2-app/friends-full.html, идея 2 «Друг прошёл»; формат — 1 · ЯДРО и Learning V2, 22.10):
 * «Начать занятие» в окне приглашения запоминает приглашение на телефоне (inviteId, номера урока и занятия, срок).
 * Learning V2 шлёт learning_v2_session_credited {sessionId, mutationId, awardedAtMs}, когда сервер принял засчитывание.
 * Подходит приглашение того же занятия (id занятия строится по номерам — learningV2CourseSessionIdV1) и не истёкшее к моменту
 * засчитывания → friendsLessonTogetherClaim {inviteId, mutationId}. Награда раз в день на пару — решает сервер.
 * Слушатель ставится один раз и только при включённом выключателе — в выпуске без «Вместе» здесь ничего не работает.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';

import { emitAppEvent, onAppEvent } from '../events';
import { maskUid } from '../diagnostic_mask';
import { getCanonicalUserId } from '../user_id_policy';
import { FRIENDS_TOGETHER_UI_ENABLED } from './together_config';
import { claimLessonTogether } from './lesson_invite_client';
import { lessonTogetherClaimToast } from './lesson_invite_friend_copy';

const KEY = 'friends_lesson_invites_accepted_v1';
const KEEP = 10;

export type AcceptedLessonInvite = Readonly<{
  inviteId: string;
  lessonOrdinal: number;
  sessionOrdinal: number;
  /** Полночь друга из приглашения; нет — считаем, что срок не задан (решает сервер). */
  expiresAtMs: number | null;
  inviterName: string;
  acceptedAtMs: number;
}>;

const log = (line: string): void => { console.log(`[FRIENDS-2] ${line}`); }; // guard-ok: журнал награды «вместе», одна строка на шаг
const errText = (e: unknown): string => (e instanceof Error ? e.message : String(e));

const isAccepted = (v: unknown): v is AcceptedLessonInvite => !!v && typeof v === 'object'
  && typeof (v as AcceptedLessonInvite).inviteId === 'string'
  && Number.isInteger((v as AcceptedLessonInvite).lessonOrdinal)
  && Number.isInteger((v as AcceptedLessonInvite).sessionOrdinal)
  && typeof (v as AcceptedLessonInvite).acceptedAtMs === 'number';

const alive = (v: AcceptedLessonInvite, nowMs: number): boolean => v.expiresAtMs === null || v.expiresAtMs > nowMs;

async function readRaw(scope: string): Promise<AcceptedLessonInvite[]> {
  try {
    const raw = await AsyncStorage.getItem(`${KEY}::${scope}`);
    const parsed: unknown = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.filter(isAccepted) : [];
  } catch (e) {
    console.warn(`[FRIENDS-2] accepted:read failed owner=${maskUid(scope)} → без награды «вместе»: ${errText(e)}`); // guard-ok: catch называет причину
    return [];
  }
}

async function writeRaw(scope: string, list: readonly AcceptedLessonInvite[]): Promise<void> {
  try {
    await AsyncStorage.setItem(`${KEY}::${scope}`, JSON.stringify(list));
  } catch (e) {
    console.warn(`[FRIENDS-2] accepted:write failed owner=${maskUid(scope)}: ${errText(e)}`); // guard-ok: catch называет причину
  }
}

/** Принятые приглашения своего аккаунта, только не истёкшие. */
export async function readAcceptedLessonInvites(nowMs: number = Date.now()): Promise<AcceptedLessonInvite[]> {
  const scope = await getCanonicalUserId();
  if (!scope) {
    log('accepted:read none reason=no_user');
    return [];
  }
  return (await readRaw(scope)).filter((v) => alive(v, nowMs));
}

/** «Начать занятие» по приглашению — запомнить его до засчитывания. Повтор того же inviteId не дублирует. */
export async function rememberAcceptedLessonInvite(invite: AcceptedLessonInvite, nowMs: number = Date.now()): Promise<void> {
  const scope = await getCanonicalUserId();
  if (!scope) {
    log('accepted:remember skip reason=no_user');
    return;
  }
  const kept = (await readRaw(scope)).filter((v) => alive(v, nowMs) && v.inviteId !== invite.inviteId);
  const next = alive(invite, nowMs) ? [...kept, invite] : kept;
  await writeRaw(scope, next.slice(-KEEP));
  log(`accepted:remember invite=${maskUid(invite.inviteId)} lesson=${invite.lessonOrdinal} session=${invite.sessionOrdinal} kept=${Math.min(next.length, KEEP)}`);
}

/**
 * Приглашение под засчитанное занятие: тот же id занятия (по номерам) и не истекло к моменту засчитывания.
 * sessionIdOf — Learning V2 learningV2CourseSessionIdV1; номера, по которым id не строится, пропускаем.
 */
export function matchAcceptedLessonInvite(
  list: readonly AcceptedLessonInvite[],
  sessionId: string,
  awardedAtMs: number,
  sessionIdOf: (lessonOrdinal: number, sessionOrdinal: number) => string,
): AcceptedLessonInvite | null {
  for (const invite of list) {
    if (invite.expiresAtMs !== null && awardedAtMs > invite.expiresAtMs) continue;
    try {
      if (sessionIdOf(invite.lessonOrdinal, invite.sessionOrdinal) === sessionId) return invite;
    } catch (e) {
      log(`claim:match skip invite=${maskUid(invite.inviteId)} reason=bad_ordinals ${errText(e)}`);
    }
  }
  return null;
}

async function forget(inviteId: string): Promise<void> {
  const scope = await getCanonicalUserId();
  if (!scope) {
    log(`accepted:forget skip invite=${maskUid(inviteId)} reason=no_user`);
    return;
  }
  await writeRaw(scope, (await readRaw(scope)).filter((v) => v.inviteId !== inviteId));
}

async function onCredited(event: Readonly<{ sessionId: string; mutationId: string; awardedAtMs: number }>): Promise<void> {
  const list = await readAcceptedLessonInvites(event.awardedAtMs);
  if (list.length === 0) {
    log(`claim:skip reason=no_accepted_invites session=${event.sessionId}`);
    return;
  }
  // зачем: модули курса грузятся лениво (как у Learning V2) — id занятия считаем только когда есть приглашения
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { learningV2CourseSessionIdV1 } = require('../../modules/learning-v2/content/course_topology_v1') as typeof import('../../modules/learning-v2/content/course_topology_v1');
  const invite = matchAcceptedLessonInvite(list, event.sessionId, event.awardedAtMs, learningV2CourseSessionIdV1);
  if (!invite) {
    log(`claim:skip reason=no_matching_invite session=${event.sessionId} accepted=${list.length}`);
    return;
  }
  const result = await claimLessonTogether({ inviteId: invite.inviteId, mutationId: event.mutationId });
  log(`claim:result invite=${maskUid(invite.inviteId)} ok=${result.ok}${result.ok ? ` coins=${result.coins}` : ` reason=${result.reason}`}`);
  if (result.ok) {
    await forget(invite.inviteId);
    const t = lessonTogetherClaimToast(result.inviterName || invite.inviterName, result.coins);
    emitAppEvent('action_toast', { type: 'success', messageRu: t.ru, messageUk: t.uk, messageEn: t.en, messageEs: t.es, messagePtBr: t.ptBr, messageVi: t.vi, messageId: t.id, messageTr: t.tr, messagePl: t.pl });
    return;
  }
  // зачем: эти ответы окончательные — приглашение больше не пригодится; сеть и «ещё не дошло» — оставляем до срока
  if (result.reason === 'already_claimed' || result.reason === 'expired' || result.reason === 'not_invited') await forget(invite.inviteId);
}

let started = false;

/** Поставить слушатель засчитываний один раз; при выключенном «Вместе» — ничего не делает. */
export function startLessonTogetherClaimer(): void {
  if (!FRIENDS_TOGETHER_UI_ENABLED || started) return;
  started = true;
  onAppEvent('learning_v2_session_credited', (event) => {
    onCredited(event).catch((e: unknown) => {
      console.warn(`[FRIENDS-2] claim:failed session=${event.sessionId} → награда не забрана: ${errText(e)}`); // guard-ok: catch называет причину
    });
  });
  log('claim:listener started');
}

/* expo-router route shim */
export default function __RouteShim() { return null; }
