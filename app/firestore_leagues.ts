// ════════════════════════════════════════════════════════════════════════════
// firestore_leagues.ts — Реальные лиги через Firestore
//
// Структура Firestore:
//   league_groups/{weekId}_{leagueId}_{groupId} → { members: [...], createdAt }
//   leaderboard/{uid} → { ..., leagueId, weekId, groupId, weekPoints }
//
// Логика:
//   1. При открытии лиги — ищем незаполненную группу своего уровня на этой неделе
//   2. Если нет — создаём новую группу
//   3. Группа фиксируется на неделю (groupId сохраняется локально)
//   4. Очки обновляются в реальном времени через pushMyScore
//
// Активно только при CLOUD_SYNC_ENABLED = true.
// ════════════════════════════════════════════════════════════════════════════

import AsyncStorage from '@react-native-async-storage/async-storage';
import { CLOUD_SYNC_ENABLED, IS_EXPO_GO } from './config';
import { ensureAnonUser } from './cloud_sync';
import { GroupMember, getWeekId } from './league_engine';
import { getMyWeekPoints } from './hall_of_fame_utils';
import { getVerifiedPremiumStatus } from './premium_guard';

// Дебаунс для updateMyGroupPoints — не чаще 1 раза в 8 сек
let _groupPtsTimer: ReturnType<typeof setTimeout> | null = null;
let _pendingGroupPts: number | null = null;

const getFirestore = () => {
  if (IS_EXPO_GO || !CLOUD_SYNC_ENABLED) return null;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    return require('@react-native-firebase/firestore').default();
  } catch { return null; }
};

const COL_LB = 'leaderboard';
const GROUP_SIZE = 20;
/** Сколько league_groups максимум читаем на неделю+клуб, чтобы не создавать сольные группы из-за .limit(100) */
const BROAD_GROUP_QUERY_LIMIT = 500;

function countMembersInData(data: any): number {
  const m = data?.members;
  if (!m || typeof m !== 'object') return 0;
  return Object.keys(m).length;
}

/** Firestore числа + надёжное сравнение id клуба (избегаем рассинхрона 0 / long / int). */
function normLeagueIdData(v: unknown, fallback: number = 0): number {
  const n = Number(v);
  if (!Number.isFinite(n)) return fallback;
  return Math.trunc(n);
}

/**
 * Скан `league_groups` на неделю+клуб: в каком документе реально лежит uid в `members`.
 * При нескольких (рассинхрон после миграции) — документ с большим числом участников.
 */
async function findBestLeagueGroupDocIdForUser(
  db: any,
  weekId: string,
  targetLeagueId: number,
  uid: string,
): Promise<string | null> {
  let broad: any;
  try {
    broad = await db
      .collection('league_groups')
      .where('weekId', '==', weekId)
      .where('leagueId', '==', targetLeagueId)
      .limit(BROAD_GROUP_QUERY_LIMIT)
      .get();
  } catch (e1) {
    if (__DEV__) console.warn('[firestore_leagues] findBest weekId+leagueId query failed', e1);
    try {
      broad = await db
        .collection('league_groups')
        .where('weekId', '==', weekId)
        .limit(BROAD_GROUP_QUERY_LIMIT)
        .get();
    } catch (e2) {
      if (__DEV__) console.warn('[firestore_leagues] findBest weekId-only query failed', e2);
      return null;
    }
  }
  let best: { id: string; n: number } | null = null;
  for (const doc of broad.docs) {
    const d = doc.data();
    if (normLeagueIdData(d?.leagueId) !== targetLeagueId) continue;
    if (!d?.members?.[uid]) continue;
    const n = countMembersInData(d);
    if (!best || n > best.n) best = { id: doc.id, n };
  }
  return best?.id ?? null;
}

/**
 * Тот же поиск, но по всем клубам недели (если leagueId в профиле не совпал с doc в БД).
 */
async function findAnyLeagueGroupDocIdForUser(
  db: any,
  weekId: string,
  uid: string,
): Promise<{ id: string; leagueId: number; n: number } | null> {
  let broad: any;
  try {
    broad = await db
      .collection('league_groups')
      .where('weekId', '==', weekId)
      .limit(BROAD_GROUP_QUERY_LIMIT)
      .get();
  } catch (e) {
    if (__DEV__) console.warn('[firestore_leagues] findAny weekId query failed', e);
    return null;
  }
  let best: { id: string; n: number; leagueId: number } | null = null;
  for (const doc of broad.docs) {
    const d = doc.data();
    if (!d?.members?.[uid]) continue;
    const n = countMembersInData(d);
    if (!best || n > best.n) {
      best = { id: doc.id, n, leagueId: normLeagueIdData(d?.leagueId) };
    }
  }
  return best;
}

/**
 * Находит id группы с местом: сначала по memberCount (индекс), иначе широкий запрос
 * и выбор по фактическому числу ключей в members (источник истины).
 * Предпочитаем самую «полную» незаполненную группу, чтобы не плодить пустые.
 * excludeGroupId — не предлагать этот документ (при «эвакуации» из сольного league_groups).
 */
async function findGroupIdWithSpace(
  db: any,
  weekId: string,
  leagueId: number,
  myUid: string,
  excludeGroupId?: string | null,
): Promise<string | null> {
  const idOk = (docId: string) => !excludeGroupId || docId !== excludeGroupId;

  // 1) Быстрый путь: memberCount < GROUP_SIZE, от большего к меньшему
  try {
    const q = await db
      .collection('league_groups')
      .where('weekId', '==', weekId)
      .where('leagueId', '==', leagueId)
      .where('memberCount', '<', GROUP_SIZE)
      .orderBy('memberCount', 'desc')
      .limit(25)
      .get();
    for (const doc of q.docs) {
      if (!idOk(doc.id)) continue;
      const d = doc.data();
      if (normLeagueIdData(d.leagueId) !== normLeagueIdData(leagueId)) continue;
      const n = countMembersInData(d);
      if (n >= GROUP_SIZE) continue;
      if (d.members?.[myUid]) return doc.id;
      return doc.id;
    }
  } catch (e) {
    // нет композитного индекса — ниже broad
    if (__DEV__) console.warn('[firestore_leagues] findGroupIdWithSpace fast path failed (likely no index)', e);
  }

  // 2) Все группы этой недели и клуба (до лимита), сортировка в JS по числу участников
  let broad: any;
  try {
    broad = await db
      .collection('league_groups')
      .where('weekId', '==', weekId)
      .where('leagueId', '==', leagueId)
      .limit(BROAD_GROUP_QUERY_LIMIT)
      .get();
  } catch (e) {
    if (__DEV__) console.warn('[firestore_leagues] findGroupIdWithSpace broad weekId+leagueId failed', e);
    broad = await db
      .collection('league_groups')
      .where('weekId', '==', weekId)
      .limit(BROAD_GROUP_QUERY_LIMIT)
      .get();
  }

  const candidates: { id: string; n: number }[] = [];
  for (const doc of broad.docs) {
    if (!idOk(doc.id)) continue;
    const d = doc.data();
    if (normLeagueIdData(d.leagueId) !== normLeagueIdData(leagueId)) continue;
    const n = countMembersInData(d);
    if (n >= GROUP_SIZE) continue;
    if (d.members?.[myUid]) return doc.id;
    candidates.push({ id: doc.id, n });
  }
  candidates.sort((a, b) => b.n - a.n);
  return candidates[0]?.id ?? null;
}

/**
 * Сольник по документу league_groups — перенести в другую неполную группу, удалив пустой from.
 * Раньше user с уже сохранённым groupId на эту неделю никогда не выходил на поиск.
 */
async function tryRelocateSoloToSharedGroup(
  db: any,
  weekId: string,
  leagueId: number,
  uid: string,
  fromGroupId: string,
  memberData: Record<string, unknown>,
): Promise<string | null> {
  const gRef = (id: string) => db.collection('league_groups').doc(id);
  const fromSnap = await gRef(fromGroupId).get();
  if (!fromSnap.exists) return null;
  const sData = fromSnap.data() ?? {};
  if (countMembersInData(sData) !== 1 || !sData.members?.[uid]) return null;

  const toId = await findGroupIdWithSpace(db, weekId, leagueId, uid, fromGroupId);
  if (!toId || toId === fromGroupId) return null;

  try {
    await moveUserBetweenGroups(db, fromGroupId, toId, uid, memberData, weekId, leagueId);
    return toId;
  } catch {
    return null;
  }
}

async function moveUserBetweenGroups(
  db: any,
  fromId: string,
  toId: string,
  uid: string,
  memberData: Record<string, unknown>,
  weekId: string,
  leagueId: number,
): Promise<void> {
  if (fromId === toId) throw new Error('relocate');
  const g = (id: string) => db.collection('league_groups').doc(id);
  const lb = db.collection(COL_LB).doc(uid);
  await db.runTransaction(async (t: any) => {
    const sSnap = await t.get(g(fromId));
    const tSnap = await t.get(g(toId));
    if (!sSnap.exists || !tSnap.exists) {
      throw new Error('relocate');
    }
    const sD = sSnap.data() ?? {};
    const tD = tSnap.data() ?? {};
    if ((sD.weekId ?? weekId) !== (tD.weekId ?? weekId) || normLeagueIdData(sD.leagueId) !== normLeagueIdData(tD.leagueId)) {
      throw new Error('relocate');
    }
    const sM: Record<string, unknown> = { ...(sD.members || {}) };
    const tM: Record<string, unknown> = { ...(tD.members || {}) };
    if (Object.keys(sM).length !== 1 || sM[uid] === undefined) {
      throw new Error('relocate');
    }
    if (tM[uid] !== undefined) {
      throw new Error('relocate');
    }
    if (Object.keys(tM).length >= GROUP_SIZE) {
      throw new Error('relocate');
    }
    tM[uid] = { ...(sM[uid] as object), ...memberData };
    delete sM[uid];
    t.set(
      g(toId),
      {
        weekId:      tD.weekId ?? weekId,
        leagueId:    tD.leagueId ?? leagueId,
        members:     tM,
        memberCount: Object.keys(tM).length,
      },
      { merge: true },
    );
    t.delete(g(fromId));
    t.set(lb, { groupId: toId, groupWeekId: weekId, leagueId: tD.leagueId ?? leagueId }, { merge: true });
  });
}

type AddMemberResult = 'ok' | 'full';

/** Атомарно вступить в группу; при гонке за последний слот вернёт 'full' */
async function addMemberToLeagueGroup(
  db: any,
  groupId: string,
  uid: string,
  memberData: Record<string, unknown>,
): Promise<AddMemberResult> {
  let out: AddMemberResult = 'ok';
  await db.runTransaction(async (t: any) => {
    const ref = db.collection('league_groups').doc(groupId);
    const snap = await t.get(ref);
    if (!snap.exists) {
      out = 'full';
      return;
    }
    const data = snap.data() ?? {};
    const members: Record<string, unknown> = { ...(data.members || {}) };
    if (members[uid]) {
      t.update(ref, { [`members.${uid}`]: memberData, memberCount: Object.keys(members).length });
      return;
    }
    const n = Object.keys(members).length;
    if (n >= GROUP_SIZE) {
      out = 'full';
      return;
    }
    t.update(ref, {
      [`members.${uid}`]: memberData,
      memberCount: n + 1,
    });
  });
  return out;
}

// ── Получить или создать группу для пользователя на текущей неделе ───────────
// Все пользователи регистрируются в league_groups.
export async function getOrCreateLeagueGroup(
  weekId: string,
  leagueId: number,
  myName: string,
  myWeekPoints: number,
): Promise<GroupMember[] | null> {
  if (!CLOUD_SYNC_ENABLED) return null;
  const db = getFirestore();
  if (!db) return null;
  const uid = await ensureAnonUser();
  if (!uid) return null;

  // Читаем аватар и рамку чтобы сохранить их в данных участника
  const [[, avatarRaw], [, frameRaw], [, streakRaw], [, totalXpRaw]] =
    await AsyncStorage.multiGet(['user_avatar', 'user_frame', 'streak_count', 'user_total_xp']);
  const memberAvatar   = avatarRaw  ?? undefined;
  const memberFrame    = frameRaw   ?? undefined;
  const memberPremium  = await getVerifiedPremiumStatus().catch(() => false);
  const memberStreak   = streakRaw  ? parseInt(streakRaw, 10) : 0;
  const memberTotalXp  = totalXpRaw ? parseInt(totalXpRaw, 10) || 0 : 0;

  const memberData = {
    name:      myName,
    points:    myWeekPoints,
    uid,
    avatar:    memberAvatar,
    frame:     memberFrame,
    isPremium: memberPremium,
    streak:    memberStreak,
    totalXp:   memberTotalXp,
  };

  try {
    // Проверяем — есть ли у нас уже groupId на эту неделю
    const myDoc = await db.collection(COL_LB).doc(uid).get();
    const myData = myDoc.exists ? myDoc.data() : {};
    const savedGroupId: string | undefined = myData?.groupId;
    const savedWeekId: string | undefined  = myData?.groupWeekId;
    // Локальное значение с экрана клуба + нормализация из Firebase (int/long)
    const leagueIdForGroup = normLeagueIdData(myData?.leagueId, normLeagueIdData(leagueId, 0));

    // Источник истины — поле `members` в league_groups, а не только leaderboard.groupId
    // (указатель мог остаться на сольнике после миграции, гонки вступления, ручного правок).
    let canonicalGid   = await findBestLeagueGroupDocIdForUser(db, weekId, leagueIdForGroup, uid);
    let effectiveLeagueId = leagueIdForGroup;
    if (!canonicalGid) {
      const any = await findAnyLeagueGroupDocIdForUser(db, weekId, uid);
      if (any) {
        canonicalGid = any.id;
        effectiveLeagueId = any.leagueId;
      }
    }
    if (canonicalGid) {
      if (canonicalGid !== savedGroupId || savedWeekId !== weekId || normLeagueIdData(myData?.leagueId) !== effectiveLeagueId) {
        await db.collection(COL_LB).doc(uid).set(
          { groupId: canonicalGid, groupWeekId: weekId, leagueId: effectiveLeagueId },
          { merge: true },
        );
      }
      const newGroupId = await tryRelocateSoloToSharedGroup(
        db, weekId, effectiveLeagueId, uid, canonicalGid, memberData,
      );
      const effective = newGroupId ?? canonicalGid;
      await db.collection('league_groups').doc(effective).update({
        [`members.${uid}`]: memberData,
      }).catch(() => {});
      return await fetchGroupMembers(db, effective, uid, myName, myWeekPoints);
    }

    // Уже в группе на эту неделю — но сначала проверяем что savedGroupId реально валиден.
    // Раньше слепое доверие к savedGroupId оставляло пользователя в его собственной solo-группе,
    // если ВЕТКА 1 не нашла его в members ни одной группы (например после удаления/слияния).
    if (savedGroupId && savedWeekId === weekId) {
      let savedSnap: any = null;
      try {
        savedSnap = await db.collection('league_groups').doc(savedGroupId).get();
      } catch (e) {
        if (__DEV__) console.warn('[firestore_leagues] read savedGroupId failed', e);
      }
      const savedData = savedSnap?.exists ? savedSnap.data() ?? {} : null;
      const savedMembers: Record<string, unknown> = (savedData?.members as Record<string, unknown>) || {};
      const savedMemberCount = countMembersInData(savedData);
      const iAmInSaved = !!savedMembers[uid];

      if (savedData && iAmInSaved) {
        // Я реально в этой группе. Если она solo — пробуем relocate;
        // если relocate не помог и группа всё ещё solo, проваливаемся в ВЕТКУ 3 (поиск/создание).
        let effective: string | null = savedGroupId;
        if (savedMemberCount <= 1) {
          const newGroupId = await tryRelocateSoloToSharedGroup(
            db, weekId, leagueIdForGroup, uid, savedGroupId, memberData,
          );
          if (newGroupId) effective = newGroupId;
          else effective = null; // остался в solo — пусть ВЕТКА 3 попробует найти/создать общую
        }
        if (effective) {
          await db.collection('league_groups').doc(effective).update({
            [`members.${uid}`]: memberData,
          }).catch((e: unknown) => {
            if (__DEV__) console.warn('[firestore_leagues] update members[uid] failed', e);
          });
          return await fetchGroupMembers(db, effective, uid, myName, myWeekPoints);
        }
      }
      // savedGroupId недействителен (не существует / меня там нет / solo без relocate-цели):
      // обнуляем и идём в ВЕТКУ 3.
    }

    // Подбор группы: не полагаться на memberCount в случайных N документах (плодились
    // сольные группы). Ищем по фактическим members, широкий лимит, приоритет — заполнить
    // самую «полную» незаполненную группу. Вступление — транзакция (последний слот, гонки).
    let groupId: string | null = null;
    const maxJoinAttempts = 4;
    for (let attempt = 0; attempt < maxJoinAttempts; attempt++) {
      const candidate = await findGroupIdWithSpace(db, weekId, leagueId, uid);
      if (!candidate) break;
      const res = await addMemberToLeagueGroup(db, candidate, uid, memberData);
      if (res === 'ok') {
        groupId = candidate;
        break;
      }
    }
    if (!groupId) {
      groupId = `${weekId}_${leagueId}_${Date.now()}`;
      await db.collection('league_groups').doc(groupId).set({
        weekId,
        leagueId,
        memberCount: 1,
        createdAt: Date.now(),
        members: { [uid]: memberData },
      });
      // Сразу же пробуем переместить в общую группу: за время поиска кто-то мог
      // освободить слот, или появилась группа. Это закрывает гонку
      // «findGroupIdWithSpace вернул full → создал solo» и сразу нашёл свободную.
      const relocatedTo = await tryRelocateSoloToSharedGroup(
        db, weekId, leagueId, uid, groupId, memberData,
      );
      if (relocatedTo) groupId = relocatedTo;
    }

    // Сохраняем groupId и leagueId в профиле пользователя
    await db.collection(COL_LB).doc(uid).set(
      { groupId, groupWeekId: weekId, leagueId },
      { merge: true }
    );

    return await fetchGroupMembers(db, groupId, uid, myName, myWeekPoints);
  } catch (e) {
    if (__DEV__) console.warn('[firestore_leagues] getOrCreateLeagueGroup failed', e);
    return null;
  }
}

// ── Загрузить топ участников любого клуба ────────────────────────────────────
export async function fetchLeagueTopMembers(
  weekId: string,
  leagueId: number,
  limit = 20,
): Promise<GroupMember[]> {
  if (!CLOUD_SYNC_ENABLED) return [];
  const db = getFirestore();
  if (!db) return [];
  try {
    // Сначала пробуем точный запрос weekId + leagueId.
    // Если индекс не готов, fallback на weekId с расширенным лимитом.
    let snap: any;
    try {
      snap = await db
        .collection('league_groups')
        .where('weekId', '==', weekId)
        .where('leagueId', '==', leagueId)
        .limit(100)
        .get();
    } catch {
      snap = await db
        .collection('league_groups')
        .where('weekId', '==', weekId)
        .limit(300)
        .get();
    }

    const all: GroupMember[] = [];

    if (!snap.empty) {
      snap.docs
        .filter((doc: any) => normLeagueIdData(doc.data().leagueId) === normLeagueIdData(leagueId))
        .forEach((doc: any) => {
          const members: Record<string, { name: string; points: number; uid: string }> =
            doc.data()?.members ?? {};
          Object.values(members).forEach(m => {
            all.push({ name: m.name, points: m.points, isMe: false });
          });
        });
    }

    // Фолбэк: ищем игроков по leagueId прямо в leaderboard
    if (all.length < 3) {
      try {
        // Сначала ищем по leagueId (новые пользователи с обновлённым кодом)
        const lbSnap = await db
          .collection('leaderboard')
          .where('leagueId', '==', leagueId)
          .limit(limit)
          .get();

        const existingNames = new Set(all.map((m: GroupMember) => m.name.trim().toLowerCase()));

        if (!lbSnap.empty) {
          lbSnap.docs.forEach((doc: any) => {
            const d = doc.data();
            if (d?.name && !existingNames.has((d.name as string).trim().toLowerCase())) {
              all.push({ name: d.name, points: d.weekPoints ?? 0, isMe: false });
              existingNames.add((d.name as string).trim().toLowerCase());
            }
          });
        }

        // Для клуба 0 — показываем всех пользователей у кого нет leagueId (старые клиенты)
        // Все новые пользователи начинают с leagueId=0
        if (all.length < 3 && leagueId === 0) {
          const allUsersSnap = await db
            .collection('leaderboard')
            .limit(limit)
            .get();

          allUsersSnap.docs.forEach((doc: any) => {
            const d = doc.data();
            const hasLeagueId = d?.leagueId !== undefined && d?.leagueId !== null;
            if (d?.name && !hasLeagueId && !existingNames.has((d.name as string).trim().toLowerCase())) {
              all.push({ name: d.name, points: d.weekPoints ?? 0, isMe: false });
              existingNames.add((d.name as string).trim().toLowerCase());
            }
          });
        }
      } catch {}
    }

    return all
      .sort((a, b) => b.points - a.points)
      .slice(0, limit);
  } catch {
    return [];
  }
}

// ── Обновить очки в группе (дебаунс 8с) ────────────────────────────────────
// 8 секунд — компромисс: не спамим Firestore при серии уроков, но не теряем
// очки при закрытии приложения через 10-20 сек после занятия.
export function updateMyGroupPoints(weekPoints: number): Promise<void> {
  if (!CLOUD_SYNC_ENABLED) return Promise.resolve();
  _pendingGroupPts = weekPoints;
  if (_groupPtsTimer) clearTimeout(_groupPtsTimer);
  return new Promise(resolve => {
    _groupPtsTimer = setTimeout(async () => {
      _groupPtsTimer = null;
      const pts = _pendingGroupPts;
      _pendingGroupPts = null;
      if (pts === null) { resolve(); return; }
      await _doUpdateGroupPoints(pts);
      resolve();
    }, 8_000);
  });
}

async function _doUpdateGroupPoints(weekPoints: number): Promise<void> {
  const db = getFirestore();
  if (!db) return;
  const uid = await ensureAnonUser();
  if (!uid) return;
  try {
    const [[, avatarRaw], [, frameRaw], [, streakRaw], [, totalXpRaw]] =
      await AsyncStorage.multiGet(['user_avatar', 'user_frame', 'streak_count', 'user_total_xp']);
    const memberPremium = await getVerifiedPremiumStatus().catch(() => false);
    const memberTotalXp = totalXpRaw ? parseInt(totalXpRaw, 10) || 0 : 0;
    const myDoc = await db.collection(COL_LB).doc(uid).get();
    const groupId: string | undefined = myDoc.exists ? myDoc.data()?.groupId : undefined;
    if (!groupId) return;
    await db.collection('league_groups').doc(groupId).update({
      [`members.${uid}.points`]:    weekPoints,
      [`members.${uid}.avatar`]:    avatarRaw  ?? null,
      [`members.${uid}.frame`]:     frameRaw   ?? null,
      [`members.${uid}.isPremium`]: memberPremium,
      [`members.${uid}.streak`]:    streakRaw  ? parseInt(streakRaw, 10) : 0,
      [`members.${uid}.totalXp`]:   memberTotalXp,
    });
  } catch {}
}

// ── Тихая регистрация в группу при старте приложения ────────────────────────
// Вызывается из _layout.tsx чтобы каждый пользователь попал в league_groups
// даже если он никогда не открывал экран клубов.
export async function registerInLeagueGroupSilently(isPremium?: boolean): Promise<void> {
  if (!CLOUD_SYNC_ENABLED) return;
  try {
    const [[, nameRaw], [, leagueRaw], [, weekPtsRaw]] =
      await AsyncStorage.multiGet(['user_name', 'league_state_v3', 'week_points_v2']);

    const name = (nameRaw ?? '').trim();
    if (!name) return;

    let leagueState: { leagueId?: number; weekId?: string } | null = null;
    try {
      leagueState = leagueRaw ? JSON.parse(leagueRaw) : null;
    } catch {
      leagueState = null;
    }
    const leagueId: number = normLeagueIdData(leagueState?.leagueId, 0);
    // Всегда текущая ISO-неделя (getWeekId). weekId в league_state_v3 обновляется
    // с экрана клуба — до этого он может отставать, из-за чего тихая регистрация
    // писала в «прошлую» неделю, а UI и leaderboard — в текущую, и указатель
    // groupId указывал на сольник.
    const weekId = getWeekId();

    let weekPoints = 0;
    try {
      const wpData = weekPtsRaw ? JSON.parse(weekPtsRaw) : null;
      weekPoints = wpData?.points ?? 0;
    } catch {}

    await getOrCreateLeagueGroup(weekId, leagueId, name, weekPoints);
  } catch {}
}

// ── Загрузить участников группы ──────────────────────────────────────────────
function mapLeagueMembersToGroupList(
  members: Record<string, any>,
  myUid: string,
  myName: string,
  myWeekPoints: number,
): GroupMember[] {
  return Object.entries(members)
    .map(([key, m]) => ({
      name: m.name,
      points: key === myUid ? myWeekPoints : (m.points ?? 0),
      isMe: key === myUid,
      uid: key,
      isPremium: m.isPremium ?? false,
      avatar: m.avatar ?? undefined,
      frame: m.frame ?? undefined,
      streak: m.streak ?? undefined,
      totalXp: m.totalXp ?? undefined,
    } as GroupMember))
    .sort((a, b) => b.points - a.points);
}

async function fetchGroupMembers(
  db: any,
  groupId: string,
  myUid: string,
  myName: string,
  myWeekPoints: number,
): Promise<GroupMember[]> {
  const snap = await db.collection('league_groups').doc(groupId).get();
  if (!snap.exists) return [];
  const members: Record<string, any> = snap.data()?.members ?? {};
  return mapLeagueMembersToGroupList(members, myUid, myName, myWeekPoints);
}

/**
 * Живе оновлення списку учасників клубу (та сама `league_groups` що в адмінці), без 60s кешу league_engine.
 */
export function subscribeToLeagueGroupMembers(
  onUpdate: (members: GroupMember[]) => void,
): () => void {
  if (!CLOUD_SYNC_ENABLED) return () => {};
  const db = getFirestore();
  if (!db) return () => {};
  const r: { lb: (() => void) | null; g: (() => void) | null } = { lb: null, g: null };
  let cancelled = false;
  let lastReconcileAt = 0;
  const RECONCILE_THROTTLE_MS = 30_000;

  const triggerReconcile = (myLeagueId: number) => {
    const now = Date.now();
    if (now - lastReconcileAt < RECONCILE_THROTTLE_MS) return;
    lastReconcileAt = now;
    void (async () => {
      try {
        const myName = ((await AsyncStorage.getItem('user_name')) || '').trim() || 'Игрок';
        const wp = await getMyWeekPoints();
        await getOrCreateLeagueGroup(getWeekId(), myLeagueId, myName, wp);
      } catch (e) {
        if (__DEV__) console.warn('[firestore_leagues] reconcile failed', e);
      }
    })();
  };

  void (async () => {
    const uid = await ensureAnonUser();
    if (cancelled || !uid) return;
    r.lb = db.collection(COL_LB).doc(uid).onSnapshot(
      (lbSnap: any) => {
        if (r.g) {
          r.g();
          r.g = null;
        }
        if (!lbSnap?.exists) {
          onUpdate([]);
          return;
        }
        const lbData =
          (lbSnap.data() as { groupId?: string; groupWeekId?: string; leagueId?: number } | undefined) || {};
        const gid = lbData.groupId;
        const gWeekId = lbData.groupWeekId;
        const myLeagueId = normLeagueIdData(lbData.leagueId, 0);
        const currentWeekId = getWeekId();

        // Stale weekId или нет groupId — игнорируем и форсим reconcile
        if (!gid || gWeekId !== currentWeekId) {
          onUpdate([]);
          triggerReconcile(myLeagueId);
          return;
        }

        r.g = db.collection('league_groups').doc(gid).onSnapshot(
          (gSnap: any) => {
            if (!gSnap?.exists) {
              onUpdate([]);
              triggerReconcile(myLeagueId);
              return;
            }
            void (async () => {
              const myName = ((await AsyncStorage.getItem('user_name')) || '').trim() || 'Игрок';
              const wp = await getMyWeekPoints();
              const members: Record<string, any> =
                (gSnap.data() as { members?: Record<string, any> } | undefined)?.members ?? {};
              const memberCount = Object.keys(members).length;

              // Solo-группа — пользователь застрял один. Не выдаём в UI, форсим reconcile.
              if (memberCount <= 1) {
                triggerReconcile(myLeagueId);
                return;
              }
              onUpdate(mapLeagueMembersToGroupList(members, uid, myName, wp));
            })();
          },
        );
      },
    );
  })();

  return () => {
    cancelled = true;
    r.g?.();
    r.lb?.();
  };
}

/* expo-router route shim: keeps utility module from warning when discovered as route */
export default function __RouteShim() { return null; }
