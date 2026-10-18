import * as admin from 'firebase-admin';
import { HttpsError, onCall } from 'firebase-functions/v2/https';
import { HOT_CALLABLE_OPTIONS } from './callable_options';
import { recoveryHintClientIp, resolveStableUidForAuth } from './auth_identity';
import { createHash, randomInt } from 'node:crypto';

import { swallowed } from './swallowed_error'; // зачем: PM-229 — немой catch пишет причину [PM-229]
const NAME_INDEX = 'name_index';
// зачем (владелец 18.10: «ник можно менять хоть каждую секунду, убери правило 14 дней»): кулдауна смены ника больше нет.
// Поле nickname_change_available_at продолжает писаться (= момент смены), чтобы старые клиенты видели «можно сейчас».
const NICKNAME_CHANGE_COOLDOWN_MS = 0;
// зачем (владелец 18.10, кнопками через координатора): ник — не больше 5 смен в час на аккаунт. Окно и счётчик живут в
// users/{uid}.progress и пишутся в той же транзакции (без лишних чтений). Считается только настоящая смена (isNameChange);
// набор в окне ника смену не тратит — там лишь проверка nameCheckAvailability, применение — по «Готово».
const NICKNAME_RENAME_WINDOW_MS = 60 * 60 * 1000;
const NICKNAME_RENAMES_PER_HOUR = 5;
// зачем (владелец 18.10, защита от накрутки счёта Firebase): анонимов можно наплодить — отдельный потолок смен и проверок на IP.
// Проверка «свободно/занято» тоже ограничена: 60 в час на uid и 200 на IP. Счётчики — в name_rate_limits по хэшу (без uid/IP
// в открытом виде), фиксированное окно в час, как у authRecoveryHint.
const NICKNAME_RENAMES_PER_HOUR_PER_IP = 20;
const NAME_CHECKS_PER_HOUR = 60;
const NAME_CHECKS_PER_HOUR_PER_IP = 200;
const NAME_RATE_LIMITS = 'name_rate_limits';

function nameRateDocId(kind: 'check_uid' | 'check_ip' | 'reserve_ip', key: string): string {
  return `${kind}_${createHash('sha256').update(key).digest('hex').slice(0, 32)}`;
}

function readRateWindow(data: FirebaseFirestore.DocumentData | undefined, now: number): { start: number; count: number } {
  const start = Number(data?.windowStartMs ?? 0);
  const active = Number.isFinite(start) && start > 0 && now - start < NICKNAME_RENAME_WINDOW_MS;
  return active ? { start, count: Number(data?.count ?? 0) || 0 } : { start: now, count: 0 };
}

function nameRateLog(outcome: string, extra: Record<string, unknown> = {}): void {
  console.log(JSON.stringify({ event: 'name_rate', tag: '[NICK-RATE]', outcome, ...extra }));
}

/** Проверка имени: один счётчик на uid и один на IP, отказ — без записи. */
async function consumeNameCheckRate(
  db: FirebaseFirestore.Firestore,
  authUid: string,
  ip: string,
  now = Date.now(),
): Promise<'ok' | 'limited_uid' | 'limited_ip'> {
  const refs = [
    { kind: 'uid' as const, max: NAME_CHECKS_PER_HOUR, ref: db.collection(NAME_RATE_LIMITS).doc(nameRateDocId('check_uid', authUid)) },
    ...(ip ? [{ kind: 'ip' as const, max: NAME_CHECKS_PER_HOUR_PER_IP, ref: db.collection(NAME_RATE_LIMITS).doc(nameRateDocId('check_ip', ip)) }] : []),
  ];
  return db.runTransaction(async (tx) => {
    const snaps = await Promise.all(refs.map(({ ref }) => tx.get(ref)));
    const windows = snaps.map((snap) => readRateWindow(snap.exists ? snap.data() : undefined, now));
    const limitedAt = windows.findIndex((w, i) => w.count >= refs[i].max);
    if (limitedAt >= 0) return refs[limitedAt].kind === 'uid' ? 'limited_uid' : 'limited_ip';
    refs.forEach(({ ref }, i) => {
      tx.set(ref, { count: windows[i].count + 1, windowStartMs: windows[i].start, updatedAtMs: now }, { merge: true });
    });
    return 'ok';
  });
}
const GENERATED_NICKNAME_WORDS = [
  'Alpha', 'Axiom', 'Cosmos', 'Delta', 'Helium', 'Ion', 'Lambda', 'Neon',
  'Nova', 'Omega', 'Orbit', 'Photon', 'Quark', 'Quantum', 'Radium', 'Sigma',
  'Tensor', 'Vector', 'Vertex', 'Xenon', 'Zenith',
] as const;
const GENERATED_NICKNAME_ATTEMPTS = 16;

function sanitizeString(value: unknown, max: number): string {
  return String(value ?? '').normalize('NFKC').replace(/\s+/g, ' ').trim().slice(0, max);
}

function normalizeName(value: unknown): { name: string; nameLower: string } {
  const name = sanitizeString(value, 32);
  return { name, nameLower: name.toLowerCase() };
}

function readProgressString(
  data: FirebaseFirestore.DocumentData | undefined,
  key: string,
): string {
  const value = data?.progress?.[key];
  return typeof value === 'string' ? value.trim() : '';
}

function readProgressMs(
  data: FirebaseFirestore.DocumentData | undefined,
  key: string,
): number {
  const raw = data?.progress?.[key];
  const value = typeof raw === 'string' ? Number(raw) : Number(raw ?? 0);
  return Number.isFinite(value) && value > 0 ? value : 0;
}

function readProgressFlag(
  data: FirebaseFirestore.DocumentData | undefined,
  key: string,
): boolean {
  const raw = data?.progress?.[key];
  return raw === true || raw === '1' || raw === 'true';
}

function readProgressCount(
  data: FirebaseFirestore.DocumentData | undefined,
  key: string,
): number | null {
  const raw = data?.progress?.[key];
  if (raw === undefined || raw === null || raw === '') return null;
  const value = Math.trunc(Number(raw));
  return Number.isFinite(value) ? Math.max(0, value) : null;
}

function generateNicknameCandidates(): string[] {
  const candidates = new Set<string>();
  while (candidates.size < GENERATED_NICKNAME_ATTEMPTS) {
    const word = GENERATED_NICKNAME_WORDS[randomInt(GENERATED_NICKNAME_WORDS.length)];
    candidates.add(`${word} ${randomInt(10_000, 100_000)}`);
  }
  return [...candidates];
}

/** Коллекция счётчиков «сколько уже таких имён»: doc id = имя в нижнем регистре. */
const NAME_COUNTERS = 'name_counters';
/** Максимум номеров, которые пробуем подряд, если счётчик отстал от индекса. */
const NAMED_NICKNAME_ATTEMPTS = 20;

/**
 * Базовое имя из аккаунта → чистое «Имя», пригодное для ника, или '' если мусор.
 *
 * зачем 2026-08-17 (владелец): ник из почты/аккаунта не должен быть случайным
 * «Аксим 48213» — берём настоящее имя. Оставляем только буквы/цифры/пробел/дефис,
 * схлопываем пробелы, режем до 20 символов, чтобы «Имя 123» влезло в лимит 32.
 */
export function sanitizeBaseNickname(raw: unknown): string {
  const text = String(raw ?? '')
    .replace(/[^\p{L}\p{N} \-]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 20)
    .trim();
  return text.length >= 2 ? text : '';
}

/**
 * Кандидаты вида «Имя N», начиная с уже известного числа таких имён.
 *
 * зачем 2026-08-17 (владелец): «порядковая цифра ника — сколько таких уже есть:
 * третий Виталий будет Виталий 3». Счётчик хранится отдельно и растёт монотонно;
 * если запись в индекс уже занята (гонка, старые данные) — просто идём дальше.
 */
export function buildNumberedNicknameCandidates(base: string, alreadyTaken: number): string[] {
  const start = Math.max(0, Math.trunc(alreadyTaken)) + 1;
  const out: string[] = [];
  for (let n = start; n < start + NAMED_NICKNAME_ATTEMPTS; n++) out.push(`${base} ${n}`);
  return out;
}

function assertValidName(name: string): void {
  if (name.length < 2 || name.length > 32) {
    throw new HttpsError('invalid-argument', 'name_length');
  }
  if (/[\r\n\t]/.test(name) || /https?:\/\//i.test(name) || /www\./i.test(name) || /[@#]/.test(name)) {
    throw new HttpsError('invalid-argument', 'name_invalid');
  }
}

async function resolveStableUid(
  db: FirebaseFirestore.Firestore,
  authUid: string,
  requestedStableId?: unknown,
): Promise<string> {
  return resolveStableUidForAuth(db, authUid, requestedStableId, { requireKnownIdentity: true });
}

async function assertNotBanned(db: FirebaseFirestore.Firestore, stableUid: string): Promise<void> {
  // зачем (PM-252 п.4, координатор 04.10): прежний .catch(() => null) при сбое чтения ПРОПУСКАЛ забаненного.
  // Это запись (выдача/резерв) — при сбое закрываем, причину пишем в лог.
  const failures: string[] = [];
  const read = (label: string, ref: FirebaseFirestore.DocumentReference) => ref.get().catch((error: unknown) => {
    failures.push(`${label}:${String((error as { code?: unknown })?.code ?? (error as { message?: unknown })?.message ?? error).slice(0, 80)}`);
    return null;
  });
  const [userSnap, bannedSnap] = await Promise.all([
    read('users', db.collection('users').doc(stableUid)),
    read('banned_users', db.collection('banned_users').doc(stableUid)),
  ]);
  if (failures.length > 0) {
    console.warn('[BAN-CHECK] read_failed — fail-closed', JSON.stringify({ site: 'leaderboard_name', failures }));
    throw new HttpsError('unavailable', 'ban_check_unavailable');
  }
  if (bannedSnap?.exists || userSnap?.data()?.banned === true) {
    console.info('[BAN-CHECK] denied', JSON.stringify({ site: 'leaderboard_name', source: bannedSnap?.exists ? 'banned_users' : 'users.banned' }));
    throw new HttpsError('permission-denied', 'user_banned');
  }
}

/**
 * Whether the current owner of a name reservation is a LIVE account.
 *
 * A reservation may only be reclaimed by a different user if its owner is
 * genuinely gone — i.e. the owner's users/{uid} doc is missing OR has been
 * tombstoned (identityHidden / banned). Crucially this is keyed on the OWNER'S
 * USER DOC only, NOT on whether they happen to have a visible leaderboard row.
 *
 * The previous implementation treated "no visible leaderboard row" as "inactive",
 * which let a second user STEAL the name of any real account that simply hadn't
 * reached the leaderboard yet. That was the root cause of duplicate usernames.
 */
async function nameOwnerIsLive(db: FirebaseFirestore.Firestore, uid: string): Promise<boolean> {
  const cleanUid = sanitizeString(uid, 180);
  if (!cleanUid) return false;
  const userSnap = await db.collection('users').doc(cleanUid).get().catch(swallowed('leaderboard:get', null));
  if (!userSnap?.exists) return false;
  const data = userSnap.data() ?? {};
  if (data.identityHidden === true) return false;
  if (data.banned === true) return false;
  return true;
}

async function txNameOwnerIsLive(
  tx: FirebaseFirestore.Transaction,
  db: FirebaseFirestore.Firestore,
  uid: string,
): Promise<boolean> {
  const cleanUid = sanitizeString(uid, 180);
  if (!cleanUid) return false;
  const userSnap = await tx.get(db.collection('users').doc(cleanUid));
  if (!userSnap.exists) return false;
  const data = userSnap.data() ?? {};
  if (data.identityHidden === true) return false;
  if (data.banned === true) return false;
  return true;
}

/** A name_index doc that is itself tombstoned never blocks a new reservation. */
function nameIndexDocIsHidden(data: FirebaseFirestore.DocumentData | undefined): boolean {
  return data?.identityHidden === true;
}

async function txAssertNoLiveLegacyNameOwner(
  tx: FirebaseFirestore.Transaction,
  db: FirebaseFirestore.Firestore,
  stableUid: string,
  name: string,
  nameLower: string,
): Promise<void> {
  const queries = [
    db.collection('users').where('progress.user_name_lower', '==', nameLower).limit(5),
    db.collection('users').where('progress.user_name', '==', name).limit(5),
    db.collection('leaderboard').where('nameLower', '==', nameLower).limit(5),
  ];

  for (const query of queries) {
    const snap = await tx.get(query);
    for (const doc of snap.docs) {
      const ownerUid = sanitizeString(doc.id, 180);
      if (!ownerUid || ownerUid === stableUid) continue;
      if (await txNameOwnerIsLive(tx, db, ownerUid)) {
        throw new HttpsError('already-exists', 'name_taken');
      }
    }
  }
}

async function legacyNameHasLiveOwner(
  db: FirebaseFirestore.Firestore,
  stableUid: string,
  name: string,
  nameLower: string,
): Promise<boolean> {
  const queries = [
    db.collection('users').where('progress.user_name_lower', '==', nameLower).limit(5),
    db.collection('users').where('progress.user_name', '==', name).limit(5),
    db.collection('leaderboard').where('nameLower', '==', nameLower).limit(5),
  ];

  for (const query of queries) {
    const snap = await query.get();
    for (const doc of snap.docs) {
      const ownerUid = sanitizeString(doc.id, 180);
      if (!ownerUid || ownerUid === stableUid) continue;
      if (await nameOwnerIsLive(db, ownerUid)) return true;
    }
  }
  return false;
}

export const nameCheckAvailability = onCall(HOT_CALLABLE_OPTIONS, async (request) => {
  if (!request.auth?.uid) throw new HttpsError('unauthenticated', 'auth_required');
  const db = admin.firestore();
  const stableUid = await resolveStableUid(db, request.auth.uid, request.data?.stableId);
  const { name, nameLower } = normalizeName(request.data?.name);
  assertValidName(name);
  const ip = recoveryHintClientIp(request.rawRequest);
  const rate = await consumeNameCheckRate(db, request.auth.uid, ip);
  if (rate !== 'ok') {
    // Клиент молча не показывает статус до «Готово»: применение всё равно проверит имя атомарно в nameReserve.
    nameRateLog(`check_${rate}`, { hasIp: Boolean(ip) });
    return { ok: true, available: null, limited: true };
  }

  // Source of truth = name_index/{nameLower}. A reservation owned by another,
  // still-live account makes the name unavailable. (No leaderboard fallback —
  // that was the steal vector that let unreached-leaderboard accounts lose names.)
  const idxSnap = await db.collection(NAME_INDEX).doc(nameLower).get();
  const indexOwner = sanitizeString(idxSnap.data()?.uid, 180);
  if (
    idxSnap.exists &&
    !nameIndexDocIsHidden(idxSnap.data()) &&
    indexOwner !== stableUid &&
    (await nameOwnerIsLive(db, indexOwner))
  ) {
    return { ok: true, available: false };
  }
  if (await legacyNameHasLiveOwner(db, stableUid, name, nameLower)) {
    return { ok: true, available: false };
  }
  return { ok: true, available: true };
});

export const nameGenerateAndReserve = onCall(HOT_CALLABLE_OPTIONS, async (request) => {
  if (!request.auth?.uid) throw new HttpsError('unauthenticated', 'auth_required');
  const db = admin.firestore();
  const authUid = request.auth.uid;
  const stableUid = await resolveStableUid(db, authUid, request.data?.stableId);
  await assertNotBanned(db, stableUid);
  // зачем 2026-08-17 (владелец): если клиент знает имя из аккаунта — ник строится
  // как «Имя N», где N = сколько таких имён уже выдано + 1. Без базового имени —
  // прежний случайный «Слово 12345».
  const baseName = sanitizeBaseNickname(request.data?.baseName);
  const counterRef = baseName ? db.collection(NAME_COUNTERS).doc(baseName.toLowerCase()) : null;
  let assignedName = '';

  await db.runTransaction(async (tx) => {
    const now = Date.now();
    const userRef = db.collection('users').doc(stableUid);
    const userSnap = await tx.get(userRef);
    // Счётчик читаем в той же транзакции: параллельные регистрации одного имени
    // не получат одинаковый номер — транзакция перезапустится на конфликте.
    let takenSoFar = 0;
    if (counterRef) {
      const counterSnap = await tx.get(counterRef);
      takenSoFar = Math.max(0, Math.trunc(Number(counterSnap.data()?.count ?? 0)) || 0);
    }
    const candidates = baseName
      ? buildNumberedNicknameCandidates(baseName, takenSoFar)
      : generateNicknameCandidates();
    const userData = userSnap.data();
    const existingName = readProgressString(userData, 'user_name');
    const existingNameLower = readProgressString(userData, 'user_name_lower') || existingName.toLowerCase();
    if (existingName && existingNameLower) {
      const existingRef = db.collection(NAME_INDEX).doc(existingNameLower);
      const existingSnap = await tx.get(existingRef);
      if (
        existingSnap.exists &&
        existingSnap.data()?.uid === stableUid &&
        !nameIndexDocIsHidden(existingSnap.data())
      ) {
        assignedName = existingName;
        return;
      }
    }

    let chosen: { name: string; nameLower: string; ref: FirebaseFirestore.DocumentReference } | null = null;
    for (const candidate of candidates) {
      const normalized = normalizeName(candidate);
      const ref = db.collection(NAME_INDEX).doc(normalized.nameLower);
      const snap = await tx.get(ref);
      if (!snap.exists || nameIndexDocIsHidden(snap.data())) {
        try {
          await txAssertNoLiveLegacyNameOwner(tx, db, stableUid, normalized.name, normalized.nameLower);
          chosen = { ...normalized, ref };
          break;
        } catch (error) {
          if (error instanceof HttpsError && error.message === 'name_taken') continue;
          throw error;
        }
      }
    }
    if (!chosen) throw new HttpsError('resource-exhausted', 'nickname_generation_exhausted');

    assignedName = chosen.name;
    if (counterRef) {
      // Счётчик = номер только что выданного ника: следующий такой же получит N+1.
      // Берём число из выбранного имени, а не takenSoFar+1: если несколько номеров
      // оказались заняты, счётчик перепрыгнет их и больше в них не упрётся.
      const issued = Number(chosen.name.slice(chosen.name.lastIndexOf(' ') + 1)) || takenSoFar + 1;
      tx.set(counterRef, { base: baseName, count: issued, updatedAt: now }, { merge: true });
    }
    tx.set(chosen.ref, {
      uid: stableUid,
      authUid,
      name: chosen.name,
      nameLower: chosen.nameLower,
      identityHidden: admin.firestore.FieldValue.delete(),
      updatedAt: now,
    }, { merge: true });
    // зачем: аудит безопасности 2026-08-22 — firebaseAuthUid раньше писался и
    // сюда, а leaderboard читает любой авторизованный юзер (firestore.rules) —
    // внутренний auth-uid утекал наружу без пользы (клиент его отсюда не
    // читает, идентичность живёт в users/{uid}, см. canonicalUserMatchesAuth).
    tx.set(db.collection('leaderboard').doc(stableUid), { name: chosen.name, nameLower: chosen.nameLower, updatedAt: now }, { merge: true });
    tx.set(userRef, {
      progress: {
        user_name: chosen.name,
        user_name_lower: chosen.nameLower,
        nickname_changed_at: String(now),
        nickname_change_available_at: String(now + NICKNAME_CHANGE_COOLDOWN_MS),
        nickname_grace_renames_remaining: '3',
      },
      updatedAt: now,
    }, { merge: true });
    tx.set(db.collection('public_profiles').doc(stableUid), { uid: stableUid, name: chosen.name, nameLower: chosen.nameLower, updatedAt: now }, { merge: true });
  });

  return { ok: true, status: 'ok' as const, name: assignedName };
});

export const nameReserve = onCall(HOT_CALLABLE_OPTIONS, async (request) => {
  if (!request.auth?.uid) throw new HttpsError('unauthenticated', 'auth_required');
  const db = admin.firestore();
  const authUid = request.auth.uid;
  const stableUid = await resolveStableUid(db, authUid, request.data?.stableId);
  await assertNotBanned(db, stableUid);

  const { name, nameLower } = normalizeName(request.data?.name);
  const oldNameLower = sanitizeString(request.data?.oldName, 32).toLowerCase();
  assertValidName(name);
  const ip = recoveryHintClientIp(request.rawRequest);
  let rateLimitedBy: 'uid' | 'ip' | null = null;

  // Atomic reservation. The ONLY source of truth is name_index/{nameLower}.
  // Every concurrent claimant reads that exact doc inside the transaction, so
  // Firestore serializes them: the first commit wins, the rest retry and then
  // see the now-owned doc → 'taken'. There is NO out-of-transaction pre-check
  // (that was a TOCTOU race) and NO "owner has a leaderboard row" escape hatch
  // (that let live-but-unranked accounts get their name stolen).
  //
  // The single legitimate takeover is a genuinely DEAD reservation — the owner's
  // users/{uid} doc is missing or tombstoned (identityHidden/banned). That is
  // checked transactionally via txNameOwnerIsLive, keyed on the owner's USER doc.
  let cooldownUntil = 0;
  let rateLimitedUntil = 0;
  try {
    await db.runTransaction(async (tx) => {
      const now = Date.now();
      const nameRef = db.collection(NAME_INDEX).doc(nameLower);
      const userRef = db.collection('users').doc(stableUid);
      const profileRef = db.collection('public_profiles').doc(stableUid);
      const nameSnap = await tx.get(nameRef);
      const userSnap = await tx.get(userRef);
      const userData = userSnap.data();
      const ipRateRef = ip ? db.collection(NAME_RATE_LIMITS).doc(nameRateDocId('reserve_ip', ip)) : null;
      const ipRateSnap = ipRateRef ? await tx.get(ipRateRef) : null;
      const ipWindow = readRateWindow(ipRateSnap?.exists ? ipRateSnap.data() : undefined, now);
      const currentNameLower =
        readProgressString(userData, 'user_name_lower') ||
        readProgressString(userData, 'user_name').toLowerCase() ||
        oldNameLower;
      // users.progress is authoritative. oldName only covers legacy clients
      // whose current name has not reached the user document yet.
      const oldIndexNameLower = currentNameLower || oldNameLower;
      const oldRef = oldIndexNameLower && oldIndexNameLower !== nameLower ? db.collection(NAME_INDEX).doc(oldIndexNameLower) : null;
      const oldSnap = oldRef ? await tx.get(oldRef) : null;
      const previousChangeAt = readProgressMs(userData, 'nickname_changed_at');
      const isNameChange = Boolean(currentNameLower && currentNameLower !== nameLower);
      const isInitialNameSet = !currentNameLower;
      const freeChangeAvailable = readProgressFlag(userData, 'nickname_free_change_available');
      const storedGraceChanges = readProgressCount(userData, 'nickname_grace_renames_remaining');
      const graceChangesRemaining = storedGraceChanges ?? (freeChangeAvailable ? 1 : 0);
      const consumesGraceChange = isNameChange && graceChangesRemaining > 0;
      const grantsFreeChange = isInitialNameSet;
      const nicknameChangedAt = isNameChange || previousChangeAt <= 0 ? now : previousChangeAt;

      // зачем (владелец 18.10): проверка 14-дневного кулдауна убрана — смена ника не ограничена по времени.
      // Ветка ответа 'cooldown' ниже остаётся для совместимости, но сервер её больше не выдаёт.
      void cooldownUntil;
      const renameWindowStart = readProgressMs(userData, 'nickname_rename_window_start');
      const renameWindowCount = readProgressCount(userData, 'nickname_rename_window_count') ?? 0;
      const renameWindowActive = renameWindowStart > 0 && now - renameWindowStart < NICKNAME_RENAME_WINDOW_MS;
      if (isNameChange && renameWindowActive && renameWindowCount >= NICKNAME_RENAMES_PER_HOUR) {
        rateLimitedUntil = renameWindowStart + NICKNAME_RENAME_WINDOW_MS;
        rateLimitedBy = 'uid';
        throw new HttpsError('resource-exhausted', 'name_change_rate_limited');
      }
      if (isNameChange && ipRateRef && ipWindow.count >= NICKNAME_RENAMES_PER_HOUR_PER_IP) {
        rateLimitedUntil = ipWindow.start + NICKNAME_RENAME_WINDOW_MS;
        rateLimitedBy = 'ip';
        throw new HttpsError('resource-exhausted', 'name_change_rate_limited');
      }
      const nextRenameWindow = !isNameChange
        ? null
        : renameWindowActive
          ? { start: renameWindowStart, count: renameWindowCount + 1 }
          : { start: now, count: 1 };

      if (nameSnap.exists && !nameIndexDocIsHidden(nameSnap.data())) {
        const indexOwner = sanitizeString(nameSnap.data()?.uid, 180);
        if (indexOwner && indexOwner !== stableUid) {
          // Owned by someone else → block UNLESS that owner is provably dead.
          const ownerLive = await txNameOwnerIsLive(tx, db, indexOwner);
          if (ownerLive) {
            throw new HttpsError('already-exists', 'name_taken');
          }
          // Dead owner → reclaim is allowed; fall through to overwrite below.
        }
      }

      // Legacy protection until the full backfill has run: older accounts may
      // still have names only in users.progress / leaderboard, not name_index.
      // This path only blocks live owners; it never treats a missing leaderboard
      // row as proof that a name can be reclaimed.
      await txAssertNoLiveLegacyNameOwner(tx, db, stableUid, name, nameLower);

      tx.set(nameRef, {
        uid: stableUid,
        authUid,
        name,
        nameLower,
        identityHidden: admin.firestore.FieldValue.delete(),
        updatedAt: now,
      }, { merge: true });

      if (oldRef && oldSnap?.exists && oldSnap.data()?.uid === stableUid) {
        tx.delete(oldRef);
      }

      if (isNameChange && ipRateRef) {
        tx.set(ipRateRef, { count: ipWindow.count + 1, windowStartMs: ipWindow.start, updatedAtMs: now }, { merge: true });
      }

      tx.set(db.collection('leaderboard').doc(stableUid), {
        name,
        nameLower,
        updatedAt: now,
      }, { merge: true });

      tx.set(userRef, {
        progress: {
          user_name: name,
          user_name_lower: nameLower,
          nickname_changed_at: String(nicknameChangedAt),
          nickname_change_available_at: String(nicknameChangedAt + NICKNAME_CHANGE_COOLDOWN_MS),
          ...(grantsFreeChange && storedGraceChanges === null ? { nickname_free_change_available: '1' } : {}),
          ...(nextRenameWindow ? {
            nickname_rename_window_start: String(nextRenameWindow.start),
            nickname_rename_window_count: String(nextRenameWindow.count),
          } : {}),
          ...(consumesGraceChange ? {
            nickname_grace_renames_remaining: String(graceChangesRemaining - 1),
            nickname_free_change_available: '0',
          } : {}),
        },
        updatedAt: now,
      }, { merge: true });

      tx.set(profileRef, {
        uid: stableUid,
        name,
        nameLower,
        updatedAt: now,
      }, { merge: true });
    });
  } catch (e) {
    if (e instanceof HttpsError && e.code === 'already-exists') {
      return { ok: true, status: 'taken' };
    }
    if (e instanceof HttpsError && e.message === 'name_change_cooldown') {
      return { ok: true, status: 'cooldown', nextChangeAt: cooldownUntil };
    }
    if (e instanceof HttpsError && e.message === 'name_change_rate_limited') {
      nameRateLog(`reserve_limited_${rateLimitedBy ?? 'unknown'}`, { hasIp: Boolean(ip), waitMs: rateLimitedUntil - Date.now() });
      return { ok: true, status: 'rate_limited', nextChangeAt: rateLimitedUntil };
    }
    throw e;
  }

  return { ok: true, status: 'ok' };
});

export const nameReleaseMine = onCall(HOT_CALLABLE_OPTIONS, async (request) => {
  if (!request.auth?.uid) throw new HttpsError('unauthenticated', 'auth_required');
  const db = admin.firestore();
  const authUid = request.auth.uid;
  const stableUid = await resolveStableUid(db, authUid, request.data?.stableId);
  const candidates = new Set<string>();

  // Cap the client-supplied names hint: it is only a supplement — the authoritative
  // candidates are re-derived below from the caller's own leaderboard doc and a
  // limit(20) uid-index query. Without a cap, a huge names array forced one
  // sequential Firestore read per entry (cost/DoS amplification). Legitimate clients
  // release at most a handful of their own past names, so slice(0, 20) is ample.
  const names = (Array.isArray(request.data?.names) ? request.data.names : []).slice(0, 20);
  for (const n of names) {
    const { nameLower } = normalizeName(n);
    if (nameLower) candidates.add(nameLower);
  }

  const lbSnap = await db.collection('leaderboard').doc(stableUid).get().catch(swallowed('leaderboard:get', null));
  const lb = lbSnap?.data() || {};
  if (typeof lb.nameLower === 'string' && lb.nameLower.trim()) candidates.add(lb.nameLower.trim().toLowerCase());
  if (typeof lb.name === 'string' && lb.name.trim()) candidates.add(lb.name.trim().toLowerCase());

  const byUid = await db.collection(NAME_INDEX).where('uid', '==', stableUid).limit(20).get().catch(swallowed('leaderboard:get', null));
  byUid?.docs.forEach((doc) => candidates.add(doc.id));

  const batch = db.batch();
  let deleted = 0;
  for (const nameLower of candidates) {
    const ref = db.collection(NAME_INDEX).doc(nameLower);
    const snap = await ref.get().catch(swallowed('leaderboard:get', null));
    if (snap?.exists && snap.data()?.uid === stableUid) {
      batch.delete(ref);
      deleted += 1;
    }
  }
  if (deleted > 0) await batch.commit();
  return { ok: true, deleted };
});
