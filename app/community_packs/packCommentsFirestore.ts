/**
 * Firestore-слой откликов под наборами сообщества.
 *
 * Данные:
 *   community_packs/{packId}.commentsCount            — денормализованный счётчик
 *   community_packs/{packId}/pack_comments/{id}       — сами отклики
 *
 * Правила (`firestore.rules`) разрешают клиенту:
 *   • создать отклик только от своего имени и только если он добавил набор себе
 *     (документ `pack_adds/{uid}` существует — то же условие, что у лайка);
 *   • удалить/скрыть только СВОЙ отклик; закрепить — только автору набора;
 *   • менять `commentsCount` на документе набора ровно на ±1.
 *
 * ЗАЧЕМ СЧЁТЧИК В ДОКУМЕНТЕ НАБОРА: список наборов и так читает документ ради
 * лайков, поэтому «💬 7» в каталоге стоит НОЛЬ дополнительных чтений. Пересчёт
 * подколлекции потребовал бы запроса на каждый набор в списке — десятки чтений
 * на один экран (правило экономии Firebase, CLAUDE.md §4).
 *
 * НЕМЫХ catch ЗДЕСЬ НЕТ. Соседний соц-слой лайков полгода прятал за пустым
 * `catch {}` отказ прав, и «лайк не ставится» разбирали три круга
 * (см. комментарий в packSocialFirestore.ts). Каждый ранний выход и каждая
 * проглоченная ошибка называют причину под префиксом [PACK-COMMENTS].
 */
import firestore from '@react-native-firebase/firestore';
import { CLOUD_SYNC_ENABLED, IS_EXPO_GO } from '../config';
import { COMMUNITY_PACKS_COLLECTION } from './schema';
import { COMMUNITY_PACK_ADDS_SUBCOLLECTION } from './packSocial';
import {
  COMMUNITY_PACK_COMMENTS_COUNT_FIELD,
  COMMUNITY_PACK_COMMENTS_SUBCOLLECTION,
  PACK_COMMENTS_PAGE_SIZE,
  readPackCommentsCount,
  sortPackComments,
  type PackComment,
  type PackCommentReaction,
} from './packComments';
import { DebugLogger } from '../debug-logger';

const LOG = '[PACK-COMMENTS]';

function socialEnabled(): boolean {
  return CLOUD_SYNC_ENABLED && !IS_EXPO_GO;
}

/**
 * Дождаться входа перед записью.
 *
 * зачем: тот же класс бага, что убивал лайк. Правила пускают к откликам только
 * при `request.auth != null`, а анонимный вход поднимается асинхронно — на
 * холодном старте запись уходила раньше авторизации и получала permission-denied.
 */
async function ensureCommentsAuth(): Promise<boolean> {
  if (!socialEnabled()) {
    console.warn(`${LOG} облако выключено — операция пропущена`, {
      cloudSyncEnabled: CLOUD_SYNC_ENABLED,
      isExpoGo: IS_EXPO_GO,
    });
    return false;
  }
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const auth = require('@react-native-firebase/auth').default;
    if (typeof auth !== 'function') {
      console.warn(`${LOG} модуль auth недоступен — операция пропущена`);
      return false;
    }
    if (auth().currentUser) return true;
    await auth().signInAnonymously();
    const ok = !!auth().currentUser;
    if (!ok) console.warn(`${LOG} анонимный вход не дал пользователя — правила отклонят запись`);
    return ok;
  } catch (e) {
    // зачем: немой catch здесь уже стоил трёх кругов разбора в соседнем соц-слое.
    DebugLogger.warn(
      'packCommentsFirestore:auth',
      `вход перед записью отклика не удался: ${e instanceof Error ? e.message : String(e)}`,
    );
    return false;
  }
}

function packRef(packId: string) {
  return firestore().collection(COMMUNITY_PACKS_COLLECTION).doc(packId);
}

function commentsRef(packId: string) {
  return packRef(packId).collection(COMMUNITY_PACK_COMMENTS_SUBCOLLECTION);
}

/** Документ «я добавил набор себе» — им правила проверяют право писать отклик. */
function addMembershipRef(packId: string, userId: string) {
  return packRef(packId).collection(COMMUNITY_PACK_ADDS_SUBCOLLECTION).doc(userId);
}

type RawComment = Record<string, unknown>;

/** Разбор серверного документа. Битые поля не роняют ветку — отклик пропускается. */
function parseComment(packId: string, id: string, raw: RawComment, myUserId: string | null): PackComment | null {
  const text = String(raw.text ?? '').trim();
  const authorId = String(raw.authorId ?? '').trim();
  if (!text || !authorId) {
    console.warn(`${LOG} отклик пропущен — пустой текст или автор`, {
      packId,
      commentId: id,
      hasText: !!text,
      hasAuthor: !!authorId,
    });
    return null;
  }
  const createdRaw = raw.createdAtMs;
  const createdAtMs = typeof createdRaw === 'number' && Number.isFinite(createdRaw) ? createdRaw : 0;
  const reactionsRaw = (raw.reactions ?? {}) as Record<string, unknown>;
  const reactions: PackComment['reactions'] = {};
  for (const key of ['like', 'fire'] as PackCommentReaction[]) {
    const v = Number(reactionsRaw[key]);
    if (Number.isFinite(v) && v > 0) reactions[key] = Math.floor(v);
  }
  const reactedBy = (raw.reactedBy ?? {}) as Record<string, unknown>;
  const mine = myUserId ? (reactedBy[myUserId] as unknown) : null;
  const myReactions = Array.isArray(mine)
    ? (mine.filter((r) => r === 'like' || r === 'fire') as PackCommentReaction[])
    : [];
  return {
    id,
    packId,
    authorId,
    authorName: String(raw.authorName ?? '').trim(),
    text,
    createdAtMs,
    pinned: raw.pinned === true,
    reactions,
    myReactions,
    status: 'published',
  };
}

/**
 * Прочитать ветку набора.
 *
 * Одна страница (20 последних + закреплённый) — этого хватает на экран, и это
 * ровно один запрос. Скрытые автором отклики сюда не попадают: у них
 * `hiddenByAuthor: true` и правило чтения их не отдаёт.
 */
export async function fetchPackComments(
  packId: string,
  myUserId: string | null,
): Promise<PackComment[]> {
  if (!socialEnabled() || !packId) {
    console.warn(`${LOG} чтение ветки пропущено`, { packId, enabled: socialEnabled() });
    return [];
  }
  const startedAt = Date.now();
  try {
    const snap = await commentsRef(packId)
      .orderBy('createdAtMs', 'desc')
      .limit(PACK_COMMENTS_PAGE_SIZE)
      .get();
    const parsed: PackComment[] = [];
    snap.docs.forEach((d: { id: string; data: () => RawComment }) => {
      const c = parseComment(packId, d.id, d.data() ?? {}, myUserId);
      if (c) parsed.push(c);
    });
    console.warn(`${LOG} ветка прочитана`, {
      packId,
      получено: snap.docs.length,
      разобрано: parsed.length,
      мсек: Date.now() - startedAt,
    });
    return sortPackComments(parsed);
  } catch (e) {
    const code = (e as { code?: string } | null)?.code ?? '';
    DebugLogger.warn(
      'packCommentsFirestore:fetch',
      `ветка не прочитана packId=${packId} code=${code} reason=${e instanceof Error ? e.message : String(e)}`,
    );
    return [];
  }
}

/** Проверить право писать: набор должен быть добавлен себе (то же правило, что у лайка). */
export async function canWritePackComment(packId: string, userId: string): Promise<boolean> {
  if (!socialEnabled() || !packId || !userId) return false;
  try {
    const snap = await addMembershipRef(packId, userId).get();
    return !!snap?.exists;
  } catch (e) {
    // зачем: отказ чтения membership трактуем как «нельзя» — но НЕ молча, иначе
    // «кнопка не работает» снова будет разбираться вслепую.
    DebugLogger.warn(
      'packCommentsFirestore:canWrite',
      `проверка права писать не удалась packId=${packId}: ${e instanceof Error ? e.message : String(e)}`,
    );
    return false;
  }
}

export type PublishCommentResult =
  | { ok: true; commentId: string }
  | { ok: false; reason: 'disabled' | 'auth' | 'denied' | 'network' };

/**
 * Опубликовать отклик и поднять счётчик набора одной транзакцией.
 *
 * зачем транзакция: счётчик и сам отклик должны появиться вместе. Иначе при
 * обрыве между записями число разойдётся с веткой — ровно тот класс бага
 * «награду показали, но не начислили», который уже ловили в наградах.
 */
export async function publishPackComment(
  packId: string,
  userId: string,
  authorName: string,
  text: string,
): Promise<PublishCommentResult> {
  if (!socialEnabled() || !packId || !userId || !text) {
    console.warn(`${LOG} публикация пропущена до сети`, {
      packId,
      hasUser: !!userId,
      hasText: !!text,
      enabled: socialEnabled(),
    });
    return { ok: false, reason: 'disabled' };
  }
  if (!(await ensureCommentsAuth())) return { ok: false, reason: 'auth' };
  const ref = commentsRef(packId).doc();
  const startedAt = Date.now();
  try {
    await firestore().runTransaction(async (tx: any) => {
      // guard-ok: set БЕЗ merge здесь намеренно — `commentsRef(packId).doc()`
      // выдаёт НОВЫЙ идентификатор, документа по нему ещё нет, затирать нечего.
      // merge:true скрыл бы случайное совпадение id вместо того, чтобы сломаться.
      tx.set(ref, {
        authorId: userId,
        authorName,
        text,
        createdAtMs: Date.now(),
        createdAt: firestore.FieldValue.serverTimestamp(),
        pinned: false,
        reactions: {},
        reactedBy: {},
      });
      tx.set(
        packRef(packId),
        { [COMMUNITY_PACK_COMMENTS_COUNT_FIELD]: firestore.FieldValue.increment(1) },
        { merge: true },
      );
    });
    console.warn(`${LOG} отклик опубликован`, { packId, commentId: ref.id, мсек: Date.now() - startedAt });
    return { ok: true, commentId: ref.id };
  } catch (e) {
    const code = String((e as { code?: string } | null)?.code ?? '');
    const denied = code.includes('permission-denied');
    DebugLogger.error(
      'packCommentsFirestore:publish',
      e instanceof Error ? e : new Error(String(e)),
      denied ? 'warning' : 'warning',
    );
    console.warn(`${LOG} отклик НЕ опубликован`, {
      packId,
      code,
      мсек: Date.now() - startedAt,
      reason: e instanceof Error ? e.message : String(e),
      подсказка: denied ? 'правила: набор не добавлен себе либо нет входа' : 'сеть',
    });
    return { ok: false, reason: denied ? 'denied' : 'network' };
  }
}

/**
 * Удалить свой отклик и опустить счётчик.
 *
 * Счётчик не уходит ниже нуля: правило допускает дельту −1, а серверное значение
 * уже не может стать отрицательным (`commentsCount >= 0` в правиле).
 */
export async function deletePackComment(
  packId: string,
  commentId: string,
): Promise<boolean> {
  if (!socialEnabled() || !packId || !commentId) return false;
  if (!(await ensureCommentsAuth())) return false;
  try {
    await firestore().runTransaction(async (tx: any) => {
      // guard-ok: increment(-1) здесь — счётчик ОТКЛИКОВ, не валюта и не XP.
      // Понижение законно: человек удаляет свой отклик, и число должно упасть.
      // От накрутки вниз защищают правила: дельта ограничена ±1, значение >= 0,
      // а удалить чужой отклик правило не даёт (authorId == auth.uid).
      tx.delete(commentsRef(packId).doc(commentId));
      tx.set(
        packRef(packId),
        { [COMMUNITY_PACK_COMMENTS_COUNT_FIELD]: firestore.FieldValue.increment(-1) },
        { merge: true },
      );
    });
    console.warn(`${LOG} отклик удалён`, { packId, commentId });
    return true;
  } catch (e) {
    DebugLogger.warn(
      'packCommentsFirestore:delete',
      `отклик не удалён packId=${packId} commentId=${commentId}: ${e instanceof Error ? e.message : String(e)}`,
    );
    return false;
  }
}

/** Закрепить/снять закрепление — доступно только автору набора (проверяют правила). */
export async function setPackCommentPinned(
  packId: string,
  commentId: string,
  pinned: boolean,
): Promise<boolean> {
  if (!socialEnabled() || !packId || !commentId) return false;
  if (!(await ensureCommentsAuth())) return false;
  try {
    await commentsRef(packId).doc(commentId).set({ pinned }, { merge: true });
    console.warn(`${LOG} закрепление изменено`, { packId, commentId, pinned });
    return true;
  } catch (e) {
    DebugLogger.warn(
      'packCommentsFirestore:pin',
      `закрепление не изменено packId=${packId} commentId=${commentId}: ${e instanceof Error ? e.message : String(e)}`,
    );
    return false;
  }
}

/**
 * Переключить свою реакцию на отклик.
 *
 * `reactedBy.{uid}` — массив видов реакций этого пользователя; `reactions.{вид}` —
 * счётчик. Обе части меняются одной записью, поэтому счётчик не может разойтись
 * со списком «кто отреагировал».
 */
export async function togglePackCommentReaction(
  packId: string,
  commentId: string,
  userId: string,
  reaction: PackCommentReaction,
  nextOn: boolean,
): Promise<boolean> {
  if (!socialEnabled() || !packId || !commentId || !userId) return false;
  if (!(await ensureCommentsAuth())) return false;
  try {
    await firestore().runTransaction(async (tx: any) => {
      const ref = commentsRef(packId).doc(commentId);
      const snap = await tx.get(ref);
      const data = (snap?.data() ?? {}) as RawComment;
      const reactedBy = { ...((data.reactedBy ?? {}) as Record<string, unknown>) };
      const mine = Array.isArray(reactedBy[userId]) ? (reactedBy[userId] as string[]) : [];
      const had = mine.includes(reaction);
      // зачем ранний выход: повторное нажатие того же состояния (двойной тап,
      // поздний ретрай) не должно двигать счётчик — идемпотентность как у лайка.
      if (had === nextOn) return;
      reactedBy[userId] = nextOn ? [...mine, reaction] : mine.filter((r) => r !== reaction);
      if (!(reactedBy[userId] as string[]).length) delete reactedBy[userId];
      tx.set(
        ref,
        {
          reactedBy,
          // guard-ok: счётчик РЕАКЦИЙ, не валюта. Снятие своей реакции обязано
          // уменьшать число; идемпотентность защищена ранним выходом выше
          // (had === nextOn), поэтому двойной тап счётчик не двигает.
          reactions: { [reaction]: firestore.FieldValue.increment(nextOn ? 1 : -1) },
        },
        { merge: true },
      );
    });
    return true;
  } catch (e) {
    DebugLogger.warn(
      'packCommentsFirestore:reaction',
      `реакция не сохранена packId=${packId} commentId=${commentId} вид=${reaction}: ${e instanceof Error ? e.message : String(e)}`,
    );
    return false;
  }
}

/**
 * Счётчик откликов набора с сервера.
 *
 * Отдельный вызов нужен экрану набора; списки берут число из уже прочитанного
 * документа набора и НЕ зовут это (иначе +1 чтение на каждый элемент списка).
 */
export async function fetchPackCommentsCount(packId: string): Promise<number> {
  if (!socialEnabled() || !packId) return 0;
  try {
    const snap = await packRef(packId).get();
    return readPackCommentsCount(snap?.data() as Record<string, unknown> | undefined);
  } catch (e) {
    DebugLogger.warn(
      'packCommentsFirestore:count',
      `счётчик не прочитан packId=${packId}: ${e instanceof Error ? e.message : String(e)}`,
    );
    return 0;
  }
}

/* expo-router route shim: keeps utility module from warning when discovered as route */
export default function __RouteShim() { return null; }
