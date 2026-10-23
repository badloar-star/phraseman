/**
 * «Урок вместе» (идея 2): награда «вместе» +2 — начисляет сам телефон, у друга и у пригласившего.
 *
 * зачем (закон владельца 22.10 «сервер для сохранения, а не решений — монеты выдаёт телефон»; Ядро 652953424, план
 * docs/work/tasks/friends-law-rebuild-2026-10-22.md; макет friends-full.html, идея 2 «Друг прошёл»):
 * - у друга: «Начать занятие» в окне приглашения запоминает приглашение (inviteId, кто позвал, номера урока и занятия, срок).
 *   Learning V2 шлёт learning_v2_session_credited {sessionId, mutationId, awardedAtMs} → подходит приглашение того же занятия,
 *   не истёкшее к моменту засчитывания → +2 через очередь кошелька СРАЗУ и тост → friendsLessonTogetherMark {inviteId, dayKey}
 *   фоном (сервер хранит «выполнено» и зовёт пригласившего). Отметка не ушла (сеть) — повтор при следующем запуске.
 * - у пригласившего: уведомление lesson_together в «Сообщениях» (уже загружено — 0 чтений) → +2 тем же способом.
 * - Ключ кошелька lessontogether_<sha256(пара|день друга|я)[0..40]>: пара упорядочена, поэтому ключ один на A→B и B→A —
 *   «раз в день на пару» решает ключ (повтор — replay), а не сервер.
 * Слушатель ставится один раз и только при включённом выключателе — в выпуске без «Вместе» здесь ничего не работает.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';

import * as Crypto from 'expo-crypto';

import { captureAccountGeneration } from '../account_generation';
import { emitAppEvent, onAppEvent } from '../events';
import { maskUid } from '../diagnostic_mask';
import { getLocalDayKey } from '../local_date';
import { getCanonicalUserId } from '../user_id_policy';
import type { UserNotification } from '../user_notifications';
import { FRIENDS_TOGETHER_UI_ENABLED } from './together_config';
import { markLessonTogether } from './lesson_invite_client';
import { lessonTogetherClaimToast } from './lesson_invite_friend_copy';

const KEY = 'friends_lesson_invites_accepted_v1';
const KEEP = 10;
/** Отметки «выполнено», не дошедшие до сервера (сеть): монеты уже на телефоне, повторяем при следующем запуске. */
const PENDING_MARKS_KEY = 'friends_lesson_marks_pending_v1';
/** Уведомления «друг прошёл по приглашению», за которые +2 уже поставлено в очередь кошелька (второй раз не тостим). */
const INVITER_CREDITED_KEY = 'friends_lesson_inviter_credited_v1';
const KEEP_MARKS = 20;
/** Номинал «вместе» (кошелёк stars_2, зеркала Ядра 652953424). */
export const LESSON_TOGETHER_COINS = 2;

export type AcceptedLessonInvite = Readonly<{
  inviteId: string;
  /** Кто позвал (стабильный uid) — вторая половина пары в ключе кошелька. */
  inviterUid: string;
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
  && typeof (v as AcceptedLessonInvite).inviterUid === 'string' && (v as AcceptedLessonInvite).inviterUid.length > 0
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

type Sha256Hex = (input: string) => Promise<string>;
const sha256Hex: Sha256Hex = (input) => Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, input);

/** Ключ кошелька «вместе»: пара упорядочена (A→B и B→A — один ключ), день — день друга, прошедшего занятие, плюс свой uid. */
export async function lessonTogetherRequestId(myUid: string, friendUid: string, dayKey: string, hash: Sha256Hex = sha256Hex): Promise<string | null> {
  if (!myUid || !friendUid || myUid === friendUid || !/^\d{4}-\d{2}-\d{2}$/.test(dayKey)) return null;
  const pair = [myUid, friendUid].sort().join('|');
  const hex = (await hash(`${pair}|${dayKey}|${myUid}`)).toLowerCase().replace(/[^0-9a-f]/g, '');
  return hex.length >= 40 ? `lessontogether_${hex.slice(0, 40)}` : null;
}

type CreditOutcome = 'credited' | 'failed' | 'skipped';

/** +2 через очередь кошелька телефона: баланс растёт сразу, сервер сохраняет фоном (повтор ключа — replay, второго +2 нет). */
async function creditTogether(friendUid: string, dayKey: string, side: 'friend' | 'inviter'): Promise<CreditOutcome> {
  const token = captureAccountGeneration();
  const me = token.phase === 'active' ? token.stableId?.trim() ?? '' : '';
  if (!me) {
    log(`credit:skip side=${side} reason=no_active_account phase=${token.phase}`);
    return 'skipped';
  }
  const requestId = await lessonTogetherRequestId(me, friendUid, dayKey);
  if (!requestId) {
    log(`credit:skip side=${side} reason=bad_key friend=${maskUid(friendUid)} day=${dayKey}`);
    return 'skipped';
  }
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const wallet = require('../level_spin_star_grants') as typeof import('../level_spin_star_grants');
    await wallet.enqueueLevelSpinStarGrant({ token, requestId, lane: 'base', giftId: 'stars_2', promotionEligibility: 'gameplay' }, { syncNow: false });
    log(`credit:ok side=${side} friend=${maskUid(friendUid)} day=${dayKey} key=${requestId.slice(0, 22)}… source=local_journal`);
    void wallet.syncPendingLevelSpinStarGrants(token).then(
      (sync) => log(`credit:synced side=${side} synced=${sync.synced} pending=${sync.pending}`),
      (e: unknown) => console.warn(`[FRIENDS-2] credit:sync_failed side=${side} → операция ждёт в очереди: ${errText(e)}`), // guard-ok: catch называет причину
    );
    return 'credited';
  } catch (e) {
    console.warn(`[FRIENDS-2] credit:failed side=${side} friend=${maskUid(friendUid)} → без +2: ${errText(e)}`); // guard-ok: catch называет причину
    return 'failed';
  }
}

function toastTogether(name: string): void {
  const t = lessonTogetherClaimToast(name, LESSON_TOGETHER_COINS);
  emitAppEvent('action_toast', { type: 'success', messageRu: t.ru, messageUk: t.uk, messageEn: t.en, messageEs: t.es, messagePtBr: t.ptBr, messageVi: t.vi, messageId: t.id, messageTr: t.tr, messagePl: t.pl });
}

type PendingMark = Readonly<{ inviteId: string; dayKey: string; atMs: number }>;

async function readList<T>(key: string, scope: string, valid: (v: unknown) => v is T): Promise<T[]> {
  try {
    const raw = await AsyncStorage.getItem(`${key}::${scope}`);
    const parsed: unknown = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.filter(valid) : [];
  } catch (e) {
    console.warn(`[FRIENDS-2] ${key}:read failed owner=${maskUid(scope)}: ${errText(e)}`); // guard-ok: catch называет причину
    return [];
  }
}

async function writeList(key: string, scope: string, list: readonly unknown[]): Promise<void> {
  try {
    await AsyncStorage.setItem(`${key}::${scope}`, JSON.stringify(list));
  } catch (e) {
    console.warn(`[FRIENDS-2] ${key}:write failed owner=${maskUid(scope)}: ${errText(e)}`); // guard-ok: catch называет причину
  }
}

const isPendingMark = (v: unknown): v is PendingMark => !!v && typeof v === 'object'
  && typeof (v as PendingMark).inviteId === 'string' && typeof (v as PendingMark).dayKey === 'string' && typeof (v as PendingMark).atMs === 'number';
const isString = (v: unknown): v is string => typeof v === 'string' && v.length > 0;

/** Отметить «выполнено» на сервере; окончательный ответ (ок / не наше / битое) снимает отметку из очереди повторов. */
async function sendMark(scope: string, mark: PendingMark): Promise<void> {
  const result = await markLessonTogether({ inviteId: mark.inviteId, dayKey: mark.dayKey });
  const final = result.ok || result.reason === 'not_invited' || result.reason === 'invalid';
  log(`mark:${final ? 'done' : 'keep'} invite=${maskUid(mark.inviteId)} ${result.ok ? `replay=${result.replay}` : `reason=${result.reason}`}`);
  if (!final) return;
  await writeList(PENDING_MARKS_KEY, scope, (await readList(PENDING_MARKS_KEY, scope, isPendingMark)).filter((m) => m.inviteId !== mark.inviteId));
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
  const scope = await getCanonicalUserId();
  if (!scope) {
    log(`claim:skip reason=no_user invite=${maskUid(invite.inviteId)}`);
    return;
  }
  const dayKey = getLocalDayKey(new Date(event.awardedAtMs));
  // зачем (двойной сигнал засчитывания): приглашение снимаем ДО начисления — второй сигнал того же занятия его уже не найдёт
  await forget(invite.inviteId);
  const credited = await creditTogether(invite.inviterUid, dayKey, 'friend');
  log(`claim:result invite=${maskUid(invite.inviteId)} credit=${credited} day=${dayKey}`);
  if (credited === 'credited') toastTogether(invite.inviterName);
  // отметку шлём в любом случае: пригласивший получит своё +2 по уведомлению, даже если у меня очередь кошелька не приняла
  const mark: PendingMark = { inviteId: invite.inviteId, dayKey, atMs: Date.now() };
  const pending = (await readList(PENDING_MARKS_KEY, scope, isPendingMark)).filter((m) => m.inviteId !== mark.inviteId);
  await writeList(PENDING_MARKS_KEY, scope, [...pending, mark].slice(-KEEP_MARKS));
  await sendMark(scope, mark);
}

/** Повтор отметок, не дошедших до сервера (сеть / «Вместе» выключено на сервере). */
async function retryPendingMarks(): Promise<void> {
  const scope = await getCanonicalUserId();
  if (!scope) {
    log('mark:retry skip reason=no_user');
    return;
  }
  const pending = await readList(PENDING_MARKS_KEY, scope, isPendingMark);
  if (pending.length === 0) return;
  log(`mark:retry count=${pending.length}`);
  for (const mark of pending) await sendMark(scope, mark);
}

/**
 * У пригласившего: «друг прошёл по твоему приглашению» из уже загруженных «Сообщений» → +2 тем же общим ключом (день друга).
 * Повторный вызов с теми же уведомлениями ничего не начисляет и не тостит. Возвращает, сколько начислено сейчас.
 */
export async function creditLessonTogetherForInviter(rows: readonly UserNotification[]): Promise<number> {
  if (!FRIENDS_TOGETHER_UI_ENABLED) return 0;
  const done = rows.flatMap((row) => {
    const nav = row.nav;
    return nav?.kind === 'friend_event' && nav.action === 'lesson_together' && nav.dayKey
      ? [{ eventId: nav.eventId, friendUid: nav.actorStableUid, dayKey: nav.dayKey, name: row.fromName ?? '' }]
      : [];
  });
  if (done.length === 0) return 0;
  const scope = await getCanonicalUserId();
  if (!scope) {
    log(`inviter:skip reason=no_user rows=${done.length}`);
    return 0;
  }
  const seen = new Set(await readList(INVITER_CREDITED_KEY, scope, isString));
  const fresh = done.filter((item) => !seen.has(item.eventId));
  if (fresh.length === 0) return 0;
  let credited = 0;
  const handled: string[] = [];
  for (const item of fresh) {
    const outcome = await creditTogether(item.friendUid, item.dayKey, 'inviter');
    log(`inviter:result event=${maskUid(item.eventId)} friend=${maskUid(item.friendUid)} credit=${outcome}`);
    if (outcome === 'failed') continue; // повторим при следующем чтении «Сообщений»
    handled.push(item.eventId);
    if (outcome === 'credited') {
      credited += 1;
      toastTogether(item.name);
    }
  }
  await writeList(INVITER_CREDITED_KEY, scope, [...seen, ...handled].slice(-KEEP_MARKS));
  return credited;
}

let started = false;

/** Поставить слушатель засчитываний один раз; при выключенном «Вместе» — ничего не делает. */
export function startLessonTogetherClaimer(): void {
  if (!FRIENDS_TOGETHER_UI_ENABLED || started) return;
  started = true;
  void retryPendingMarks().catch((e: unknown) => {
    console.warn(`[FRIENDS-2] mark:retry failed → повторим при следующем запуске: ${errText(e)}`); // guard-ok: catch называет причину
  });
  onAppEvent('learning_v2_session_credited', (event) => {
    onCredited(event).catch((e: unknown) => {
      console.warn(`[FRIENDS-2] claim:failed session=${event.sessionId} → без награды «вместе»: ${errText(e)}`); // guard-ok: catch называет причину
    });
  });
  log('claim:listener started');
}

/* expo-router route shim */
export default function __RouteShim() { return null; }
