// ════════════════════════════════════════════════════════════════════════════
// firestore_leaderboard.ts — Глобальный рейтинг через Firestore
//
// Структура Firestore:
//   leaderboard/{uid}  → { name, points, lang, avatar, weekKey, weekPoints, updatedAt }
//
// Активно только при CLOUD_SYNC_ENABLED = true.
// При отключённом флаге все функции возвращают пустые данные.
// ════════════════════════════════════════════════════════════════════════════

import AsyncStorage from '@react-native-async-storage/async-storage';
import { CLOUD_SYNC_ENABLED, IS_EXPO_GO } from './config';
import { getCanonicalUserId } from './user_id_policy';
import { ensureAnonUser } from './cloud_sync';
import { getWeekKey } from './hall_of_fame_utils';

// ── Дебаунс для pushMyScore — пишем в Firestore не чаще 1 раза в 30 сек ─────
// Экономит ~95% записей (урок = 20+ ответов, а пишем 1 раз в конце паузы)
let _pushDebounceTimer: ReturnType<typeof setTimeout> | null = null;
let _pendingPush: {
  name: string;
  totalPoints: number;
  weekPoints: number;
  lang: string;
  avatar?: string;
  frame?: string;
  streak?: number;
  leagueId?: number;
  isPremium?: boolean;
} | null = null;

const PUSH_DEBOUNCE_MS = 30_000; // 30 секунд

// ── Кэш глобального рейтинга — читаем Firestore не чаще 1 раза в 10 минут ──
/** Экспорт для сброса при pull-to-refresh в Зале славы. */
export const GLOBAL_LB_ASYNC_CACHE_KEY = 'global_lb_cache_v4';
const LB_CACHE_KEY = GLOBAL_LB_ASYNC_CACHE_KEY;
const LB_CACHE_TTL = 3 * 60 * 1000; // 3 минуты

/** Прогрев кэша глобального топа при старте — экран «Зал славы» открывается без ожидания сети. */
export function prefetchGlobalLeaderboard(): void {
  if (!CLOUD_SYNC_ENABLED || IS_EXPO_GO) return;
  void fetchGlobalLeaderboard().catch(() => {});
}

/** Сколько строк набрать из Firestore до остановки (запас под дедуп на клиенте). */
const LEADERBOARD_FETCH_GOAL = 130;
const LEADERBOARD_PAGE = 60;
const LEADERBOARD_MAX_PAGES = 8;
const LEADERBOARD_MAX_RETURN = 220;

export interface RemoteLeaderEntry {
  uid: string;
  name: string;
  points: number;
  lang: string;
  avatar?: string;
  frame?: string;
  weekPoints?: number;
  weekKey?: string;
  streak?: number;
  leagueId?: number;
  isPremium?: boolean;
}

const getFirestore = () => {
  if (IS_EXPO_GO || !CLOUD_SYNC_ENABLED) return null;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    return require('@react-native-firebase/firestore').default();
  } catch {
    return null;
  }
};

const COL = 'leaderboard';

// ── Обновить/создать запись текущего пользователя в глобальном рейтинге ──────
// Использует дебаунс 30с — при частых начислениях XP пишет только 1 раз
export function pushMyScore(
  name: string,
  totalPoints: number,
  weekPoints: number,
  lang: string,
  avatar?: string,
  streak?: number,
  leagueId?: number,
  frame?: string,
  isPremium?: boolean,
): Promise<void> {
  if (!CLOUD_SYNC_ENABLED || !name) return Promise.resolve();

  // Накапливаем последние значения
  _pendingPush = { name, totalPoints, weekPoints, lang, avatar, frame, streak, leagueId, isPremium };

  // Сбрасываем предыдущий таймер и ставим новый
  if (_pushDebounceTimer) clearTimeout(_pushDebounceTimer);
  return new Promise(resolve => {
    _pushDebounceTimer = setTimeout(async () => {
      _pushDebounceTimer = null;
      const p = _pendingPush;
      _pendingPush = null;
      if (!p) { resolve(); return; }
      await _doPushMyScore(p.name, p.totalPoints, p.weekPoints, p.lang, p.avatar, p.streak, p.leagueId, p.frame, p.isPremium);
      resolve();
    }, PUSH_DEBOUNCE_MS);
  });
}

async function _doPushMyScore(
  name: string,
  totalPoints: number,
  weekPoints: number,
  lang: string,
  avatar?: string,
  streak?: number,
  leagueId?: number,
  frame?: string,
  isPremium?: boolean,
): Promise<void> {
  const db = getFirestore();
  if (!db) return;
  const uid = await ensureAnonUser();
  if (!uid) return;
  try {
    // Не пишем в лидерборд если пользователь забанен
    const banDoc = await db.collection('banned_users').doc(uid).get();
    if (banDoc.exists) return;
  } catch {}
  try {
    await db.collection(COL).doc(uid).set({
      name: name.trim(),
      nameLower: name.trim().toLowerCase(),
      points: totalPoints,
      weekPoints,
      weekKey: getWeekKey(new Date()),
      lang,
      avatar: avatar ?? null,
      frame: frame ?? null,
      streak: streak ?? null,
      leagueId: leagueId ?? null,
      isPremium: isPremium ?? false,
      updatedAt: Date.now(),
    }, { merge: true });
  } catch {}
}

/** Обновляет только isPremium в leaderboard — вызывается при старте приложения. */
export async function updateMyPremiumInLeaderboard(isPremium: boolean): Promise<void> {
  const db = getFirestore();
  if (!db) return;
  const uid = await ensureAnonUser();
  if (!uid) return;
  try {
    await db.collection(COL).doc(uid).set({ isPremium }, { merge: true });
  } catch {}
}

const NAME_IDX = 'name_index'; // коллекция резервации уникальных ников

// ── Атомарно зарезервировать ник через транзакцию ───────────────────────────
// Возвращает 'ok' | 'taken' | 'error'
// oldName — прежний ник пользователя (для освобождения старого слота)
export async function reserveName(
  name: string,
  oldName: string,
): Promise<'ok' | 'taken' | 'error'> {
  if (!CLOUD_SYNC_ENABLED) return 'ok';
  const db = getFirestore();
  if (!db) return 'ok';
  try {
    const myUid = await ensureAnonUser();
    if (!myUid) return 'error';
    const nameLower = name.trim().toLowerCase();
    const oldNameLower = oldName.trim().toLowerCase();

    // Legacy-страховка: у старых аккаунтов может не быть записи в name_index.
    // Проверяем сам leaderboard, чтобы не выдать уже занятый ник.
    const sameNameSnap = await db
      .collection(COL)
      .where('nameLower', '==', nameLower)
      .limit(5)
      .get();
    if (sameNameSnap.docs.some((d: any) => d.id !== myUid)) {
      return 'taken';
    }

    await db.runTransaction(async (tx: any) => {
      const nameRef = db.collection(NAME_IDX).doc(nameLower);
      const snap = await tx.get(nameRef);

      if (snap.exists && snap.data()?.uid !== myUid) {
        throw new Error('NAME_TAKEN');
      }

      tx.set(nameRef, { uid: myUid, name: name.trim(), updatedAt: Date.now() });

      // Освобождаем старый слот если имя изменилось
      if (oldNameLower && oldNameLower !== nameLower) {
        const oldRef = db.collection(NAME_IDX).doc(oldNameLower);
        const oldSnap = await tx.get(oldRef);
        if (oldSnap.exists && oldSnap.data()?.uid === myUid) {
          tx.delete(oldRef);
        }
      }
    });

    return 'ok';
  } catch (e: any) {
    if (e?.message === 'NAME_TAKEN') return 'taken';
    return 'error';
  }
}

// ── Проверить уникальность ника (без резервации, только read-only) ───────────
// Используется для валидации перед показом ошибки. Основная блокировка — reserveName.
export async function isNameAvailable(name: string): Promise<boolean> {
  if (!CLOUD_SYNC_ENABLED) return true;
  const db = getFirestore();
  if (!db) return true;
  try {
    const myUid = await ensureAnonUser();
    const nameLower = name.trim().toLowerCase();

    const snap = await db.collection(NAME_IDX).doc(nameLower).get();
    if (snap.exists) {
      // Занят только самим пользователем — разрешаем
      if (myUid && snap.data()?.uid === myUid) return true;
      return false;
    }

    // Fallback для legacy-данных без name_index:
    // если в leaderboard уже есть такой nameLower у другого uid — ник занят.
    const sameNameSnap = await db
      .collection(COL)
      .where('nameLower', '==', nameLower)
      .limit(5)
      .get();
    const takenByOther = sameNameSnap.docs.some((d: any) => d.id !== myUid);
    return !takenByOther;
  } catch {
    return true; // при ошибке не блокируем
  }
}

// ── Загрузить топ-100 глобального рейтинга (кэш 15 минут) ───────────────────
export async function fetchGlobalLeaderboard(): Promise<RemoteLeaderEntry[]> {
  if (!CLOUD_SYNC_ENABLED) return [];

  // Проверяем кэш — экономит 200 чтений при каждом открытии вкладки
  try {
    const raw = await AsyncStorage.getItem(LB_CACHE_KEY);
    if (raw) {
      const { ts, data }: { ts: number; data: RemoteLeaderEntry[] } = JSON.parse(raw);
      if (Date.now() - ts < LB_CACHE_TTL) return data;
    }
  } catch {}

  const db = getFirestore();
  if (!db) return [];
  try {
    const mapDoc = (doc: any): RemoteLeaderEntry => ({
      uid: doc.id,
      name: doc.data().name ?? '',
      points: doc.data().points ?? 0,
      lang: doc.data().lang ?? 'ru',
      avatar: doc.data().avatar ?? undefined,
      frame: doc.data().frame ?? undefined,
      weekPoints: doc.data().weekPoints ?? 0,
      weekKey: doc.data().weekKey ?? '',
      streak: doc.data().streak ?? undefined,
      leagueId: doc.data().leagueId ?? undefined,
      isPremium: doc.data().isPremium ?? false,
    });

    const passesFilter = (e: RemoteLeaderEntry) =>
      e.points >= 50 && e.name.trim() !== '' && !(e as any).banned;

    const collected: RemoteLeaderEntry[] = [];
    let lastDoc: FirebaseFirestore.QueryDocumentSnapshot | null = null;

    for (let page = 0; page < LEADERBOARD_MAX_PAGES; page++) {
      let q = db.collection(COL).orderBy('points', 'desc').limit(LEADERBOARD_PAGE);
      if (lastDoc) q = q.startAfter(lastDoc);
      const snap = await q.get();
      if (snap.empty) break;

      for (const doc of snap.docs) {
        const e = mapDoc(doc);
        if (passesFilter(e)) collected.push(e);
      }

      lastDoc = snap.docs[snap.docs.length - 1] ?? null;
      if (collected.length >= LEADERBOARD_FETCH_GOAL) break;
      if (snap.size < LEADERBOARD_PAGE) break;
    }

    const result = collected.slice(0, LEADERBOARD_MAX_RETURN);
    await AsyncStorage.setItem(LB_CACHE_KEY, JSON.stringify({ ts: Date.now(), data: result }));
    return result;
  } catch {
    return [];
  }
}

// ── Получить глобальный ранг пользователя (сколько людей с XP > моего) ───────
export async function fetchMyGlobalRank(myPoints: number): Promise<number | null> {
  if (!CLOUD_SYNC_ENABLED || myPoints <= 0) return null;
  const db = getFirestore();
  if (!db) return null;
  try {
    // Считаем количество документов с points > myPoints
    const snap = await db
      .collection(COL)
      .where('points', '>', myPoints)
      .count()
      .get();
    return (snap.data().count ?? 0) + 1; // ранг = кол-во лучших + 1
  } catch {
    // Фолбэк: если count() не поддерживается — запрашиваем без лимита (дорого, только если нет другого пути)
    try {
      const snap2 = await db.collection(COL).where('points', '>', myPoints).get();
      return snap2.size + 1;
    } catch {
      return null;
    }
  }
}

// ── Удалить запись пользователя из рейтинга (вызывается при удалении аккаунта)
export async function deleteMyLeaderboardEntry(): Promise<void> {
  if (!CLOUD_SYNC_ENABLED) return;
  const db = getFirestore();
  if (!db) return;
  try {
    const canonicalUid = await getCanonicalUserId();
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const auth = require('@react-native-firebase/auth').default();
    const authUid = auth.currentUser?.uid ?? null;
    const docIds = Array.from(new Set([canonicalUid, authUid].filter(Boolean) as string[]));
    await Promise.all(docIds.map((id) => db.collection(COL).doc(id).delete().catch(() => {})));
  } catch {}
}

/* expo-router route shim: keeps utility module from warning when discovered as route */
export default function __RouteShim() { return null; }
