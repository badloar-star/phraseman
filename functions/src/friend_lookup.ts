import * as admin from 'firebase-admin';
import { HttpsError, onCall } from 'firebase-functions/v2/https';
import { HOT_CALLABLE_OPTIONS } from './callable_options';

const NAME_INDEX = 'name_index';

function sanitizeString(value: unknown, max: number): string {
  return String(value ?? '').normalize('NFKC').replace(/\s+/g, ' ').trim().slice(0, max);
}

function normalizeNameQuery(value: unknown): { name: string; nameLower: string } {
  // Сначала нормализуем и обрезаем пробелы, ПОТОМ снимаем ведущий @. Если снимать @
  // первым, ввод вида "  @Roma" (пробелы перед @) оставлял @ на месте → ключ "@roma"
  // → промах в name_index. Порядок важен.
  const name = sanitizeString(value, 32).replace(/^@+/, '').trim();
  return { name, nameLower: name.toLowerCase() };
}

function nameIndexDocIsHidden(data: FirebaseFirestore.DocumentData | undefined): boolean {
  return data?.identityHidden === true;
}

/** Публичный профиль найденного юзера из users/{uid}.progress (первичный источник). */
interface LookupProfile {
  name: string;
  totalXp: number;
  level: number;
  avatar: string;
  frame: string;
  aura: string;
  isPremium: boolean;
}

function readLookupProfile(userData: FirebaseFirestore.DocumentData | undefined): LookupProfile {
  const p = (userData?.progress ?? {}) as FirebaseFirestore.DocumentData;
  const num = (v: unknown): number => {
    const n = Math.floor(Number(v));
    return Number.isFinite(n) && n > 0 ? n : 0;
  };
  const premiumPlan = String(p.premium_plan ?? '').trim().toLowerCase();
  const premiumActive = premiumPlan.length > 0 && premiumPlan !== 'free' && premiumPlan !== 'none';
  return {
    name: sanitizeString(p.user_name, 40),
    totalXp: num(p.user_total_xp),
    level: num(p.user_level),
    avatar: sanitizeString(p.user_avatar, 64),
    frame: sanitizeString(p.user_avatar_frame ?? p.user_frame, 64),
    aura: sanitizeString(p.user_avatar_aura, 64),
    isPremium: premiumActive,
  };
}

/** Проверка видимости + возврат данных юзера (чтобы не читать users/{uid} дважды). */
async function loadVisibleTarget(
  db: FirebaseFirestore.Firestore,
  uid: string,
): Promise<FirebaseFirestore.DocumentData | null> {
  const cleanUid = sanitizeString(uid, 180);
  if (!cleanUid) return null;
  const [userSnap, bannedSnap] = await Promise.all([
    db.collection('users').doc(cleanUid).get().catch(() => null),
    db.collection('banned_users').doc(cleanUid).get().catch(() => null),
  ]);
  if (bannedSnap?.exists || !userSnap?.exists) return null;
  const data = userSnap.data() ?? {};
  if (data.identityHidden === true || data.banned === true) return null;
  return data;
}

/**
 * Запасной поиск для юзеров, которых НЕТ в name_index (старые аккаунты, у кого имя
 * успело записаться только в users.progress / leaderboard, либо разовая запись при
 * онбординге сорвалась). Точный лукап по name_index — это единственный «быстрый» путь;
 * если он промахнулся, мы обязаны заглянуть в те же старые источники, что и nameReserve
 * (leaderboard.ts → legacyNameHasLiveOwner), иначе реально существующий юзер выглядит
 * как «не найден». Возвращаем uid ПЕРВОГО живого владельца имени (точное совпадение
 * nameLower). Порядок запросов повторяет проверку занятости имени.
 */
async function resolveUidByLegacyName(
  db: FirebaseFirestore.Firestore,
  name: string,
  nameLower: string,
): Promise<string | null> {
  const queries = [
    db.collection('users').where('progress.user_name_lower', '==', nameLower).limit(5),
    db.collection('leaderboard').where('nameLower', '==', nameLower).limit(5),
    db.collection('users').where('progress.user_name', '==', name).limit(5),
  ];
  for (const query of queries) {
    // eslint-disable-next-line no-await-in-loop
    const snap = await query.get().catch(() => null);
    for (const doc of snap?.docs ?? []) {
      const candidate = sanitizeString(doc.id, 180);
      // eslint-disable-next-line no-await-in-loop
      if (candidate && (await loadVisibleTarget(db, candidate))) return candidate;
    }
  }
  return null;
}

/**
 * Префиксный поиск: «Vitalii» должен находить «Vitalii Virchyk». name_index — это
 * точный лукап по doc-id, префикс он не умеет, поэтому диапазонный запрос идём по
 * users.progress.user_name_lower (одно поле → авто-индекс Firestore). Возвращаем
 * первого живого юзера, чей ник НАЧИНАЕТСЯ на введённое. Не трогаем, если prefix
 * слишком короткий — иначе половина базы попадёт под совпадение.
 */
async function resolveUidByNamePrefix(
  db: FirebaseFirestore.Firestore,
  prefixLower: string,
): Promise<string | null> {
  if (prefixLower.length < 2) return null;
  const end = `${prefixLower}`;
  const snap = await db
    .collection('users')
    .where('progress.user_name_lower', '>=', prefixLower)
    .where('progress.user_name_lower', '<', end)
    .orderBy('progress.user_name_lower')
    .limit(10)
    .get()
    .catch(() => null);
  for (const doc of snap?.docs ?? []) {
    const candidate = sanitizeString(doc.id, 180);
    // eslint-disable-next-line no-await-in-loop
    if (candidate && (await loadVisibleTarget(db, candidate))) return candidate;
  }
  return null;
}

/**
 * Самолечение индекса: нашли юзера в обход name_index → дописываем недостающую запись,
 * чтобы следующий поиск того же имени пошёл быстрым точным путём. Best-effort: провал
 * записи (правила/сеть) не должен ломать текущий ответ поиска.
 */
async function backfillNameIndex(
  db: FirebaseFirestore.Firestore,
  nameLower: string,
  uid: string,
  name: string,
): Promise<void> {
  try {
    const ref = db.collection(NAME_INDEX).doc(nameLower);
    const existing = await ref.get();
    // Никогда не перетираем чужую живую запись — только заполняем пустое.
    if (existing.exists && sanitizeString(existing.data()?.uid, 180) !== uid) return;
    await ref.set(
      { uid, name: sanitizeString(name, 32), nameLower, backfilledAt: Date.now() },
      { merge: true },
    );
  } catch {
    /* best-effort self-heal */
  }
}

function buildUserResponse(
  uid: string,
  userData: FirebaseFirestore.DocumentData,
  fallbackName: string,
): {
  uid: string;
  source: 'name_index';
  name: string;
  totalXp: number;
  level: number;
  avatar: string;
  frame: string;
  aura: string;
  isPremium: boolean;
} {
  const profile = readLookupProfile(userData);
  return {
    uid,
    source: 'name_index',
    name: profile.name || sanitizeString(fallbackName, 40),
    totalXp: profile.totalXp,
    level: profile.level,
    avatar: profile.avatar,
    frame: profile.frame,
    aura: profile.aura,
    isPremium: profile.isPremium,
  };
}

export const friendLookupUser = onCall(HOT_CALLABLE_OPTIONS, async (request) => {
  if (!request.auth?.uid) throw new HttpsError('unauthenticated', 'auth_required');
  const db = admin.firestore();
  // Поиск — только публичное чтение. Проверенного Firebase Auth выше достаточно:
  // stableId ищущего не участвует ни в запросе, ни в ответе. Не запускаем перед
  // name_index отдельную цепочку account-deletion/auth_links/users, иначе холодный
  // первый запрос ждёт несколько лишних последовательных Firestore round trips.

  const { name, nameLower } = normalizeNameQuery(request.data?.query);
  if (name.length < 2 || name.length > 32) {
    throw new HttpsError('invalid-argument', 'query_length');
  }

  // 1) Быстрый путь: точный лукап в name_index.
  const idxSnap = await db.collection(NAME_INDEX).doc(nameLower).get();
  const idx = idxSnap.data();
  const idxUid = sanitizeString(idx?.uid, 180);
  if (idxSnap.exists && !nameIndexDocIsHidden(idx) && idxUid) {
    const userData = await loadVisibleTarget(db, idxUid);
    if (userData) {
      // Возвращаем ПОЛНЫЙ публичный профиль из users/{uid}.progress (первичный источник).
      // Раньше клиент догружал профиль из нескольких коллекций — у юзеров без записи там
      // получался прочерк + уровень 1. Теперь имя/уровень/аватар приходят сразу.
      return { ok: true, user: buildUserResponse(idxUid, userData, idx?.name || name) };
    }
  }

  // 2) Запасной путь: точное совпадение имени в старых источниках (для аккаунтов вне
  //    name_index). При попадании — самолечим индекс, чтобы дальше был быстрый путь.
  const legacyUid = await resolveUidByLegacyName(db, name, nameLower);
  if (legacyUid) {
    const userData = await loadVisibleTarget(db, legacyUid);
    if (userData) {
      await backfillNameIndex(db, nameLower, legacyUid, readLookupProfile(userData).name || name);
      return { ok: true, user: buildUserResponse(legacyUid, userData, name) };
    }
  }

  // 3) Префиксный путь: «Vitalii» → «Vitalii Virchyk». Индекс не самолечим (ключ там
  //    полное имя, а не введённый префикс).
  const prefixUid = await resolveUidByNamePrefix(db, nameLower);
  if (prefixUid) {
    const userData = await loadVisibleTarget(db, prefixUid);
    if (userData) {
      return { ok: true, user: buildUserResponse(prefixUid, userData, name) };
    }
  }

  return { ok: true, user: null };
});
