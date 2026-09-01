import * as admin from 'firebase-admin';
import { HttpsError, onCall } from 'firebase-functions/v2/https';
import { HOT_CALLABLE_OPTIONS } from './callable_options';
import {
  ACCOUNT_ID_FIELD,
  ACCOUNT_ID_INDEX,
  accountIdIndexDocId,
  cleanAliases,
  newAccountId,
} from './account_id';
import { findAccountByAlias } from './account_id_lookup';
import { assertAuthAccountUsable } from './account_gate';

/*
 * АККАУНТ ВЫДАЁТ СЕРВЕР — этап 4 перестройки идентичности (владелец, 01.09.2026).
 *
 * зачем: 3645 из 4703 живых аккаунтов — анонимные, они живут ТОЛЬКО на своём
 * телефоне. Отсюда два больших следствия:
 *   1) человек теряет всё при потере телефона;
 *   2) вход через Google превращается в СЛИЯНИЕ двух личностей — самую хрупкую
 *      операцию во всей системе. Разбор 01.09: слияний было 286, и лишь у 14
 *      из них вообще был прогресс. В 95% случаев сливать было нечего — просто
 *      пустой локальный аккаунт схлопывался с настоящим.
 *
 * Здесь ключевое отличие от нынешней схемы: личность выдаёт СЕРВЕР и сразу
 * кладёт её в карту имён. Телефон больше не рождает собственный id, который
 * потом всю жизнь «знакомится» с серверным, — а значит исчезает сам шов, из
 * которого росли слияния, якоря и вечные карантины.
 *
 * ЧТО ЭТО НЕ ЛОМАЕТ: старый путь остаётся на месте. Приложение начнёт звать
 * эту функцию только с новым выпуском; до тех пор всё работает как раньше.
 *
 * Firebase-экономия: повторный вызов с тем же uid — ОДНО чтение карты имён и
 * ни одной записи. Дороже одного чтения обходится только самый первый вызов
 * в жизни человека.
 */

/** Что сервер отвечает приложению. */
export type AccountClaimResult = Readonly<{
  /** Постоянное имя аккаунта. */
  accountId: string;
  /** Рабочий ключ документов — пока это по-прежнему stable_id. */
  stableId: string;
  /** true — аккаунт только что создан; false — узнали существующего. */
  created: boolean;
}>;

/**
 * Выдаёт аккаунт для текущего входа, создавая его при первом обращении.
 *
 * Идемпотентна по построению: повторный вызов с тем же uid возвращает ТОТ ЖЕ
 * аккаунт. Это не удобство, а требование — иначе повторный запуск приложения
 * или гонка двух экранов заводили бы человеку второй профиль, и мы вернулись
 * бы ровно к той проблеме, ради которой всё затевалось.
 */
export async function claimAccountForAuth(
  db: admin.firestore.Firestore,
  authUid: string,
  nowMs = Date.now(),
): Promise<AccountClaimResult> {
  // Удаляемый аккаунт не имеет права получить новую личность в обход grace:
  // иначе человек внутри 14 дней тихо получил бы чистый профиль вместо
  // предложения вернуть свой.
  await assertAuthAccountUsable(db, authUid);

  // Запись карты, которую мы уже признали негодной: она НЕ должна выглядеть
  // как гонка внутри транзакции ниже — иначе человек не получит аккаунт вовсе.
  let staleIndexAccountId = '';

  // Знакомый вход — отвечаем одним чтением, ничего не создавая.
  const known = await findAccountByAlias(db, authUid);
  if (known) {
    const snap = await db.collection('users').doc(known.stableId).get();
    const data = snap.exists ? snap.data() ?? {} : null;
    if (data && data.identityHidden !== true) {
      return { accountId: known.accountId, stableId: known.stableId, created: false };
    }
    // Карта ведёт на слитый или исчезнувший аккаунт — она устарела. Молча
    // заводим новую личность: вести человека по мёртвой ссылке нельзя, это
    // ровно тот пустой профиль, от которого мы уходим.
    console.warn(JSON.stringify({
      event: 'account_claim_stale_index',
      reason: data ? 'identity_hidden' : 'user_missing',
    }));
    staleIndexAccountId = known.accountId;
  }

  const accountId = newAccountId();
  // Рабочим ключом документа пока остаётся stable_id: переезд на account_id как
  // на ключ — отдельный шаг, и делать его одновременно с выдачей опасно.
  const stableId = accountId;
  const userRef = db.collection('users').doc(stableId);

  try {
    await db.runTransaction(async (tx) => {
      // Гонка двух экранов реальна: приложение может позвать нас дважды, пока
      // первый ответ в пути. Читаем карту ВНУТРИ транзакции.
      const indexRef = db.collection(ACCOUNT_ID_INDEX).doc(accountIdIndexDocId(authUid));
      const [indexSnap, userSnap] = await Promise.all([tx.get(indexRef), tx.get(userRef)]);
      const seenAccountId = String((indexSnap.data() ?? {}).accountId ?? '').trim();
      if (indexSnap.exists && seenAccountId !== staleIndexAccountId) {
        // Настоящая гонка: кто-то успел раньше — не создаём второй аккаунт.
        // Устаревшую запись, которую мы выше признали негодной, гонкой НЕ
        // считаем: иначе человек с испорченной картой не получит аккаунт вовсе.
        throw new HttpsError('aborted', 'account_claim_raced');
      }
      if (userSnap.exists) {
        throw new HttpsError('aborted', 'account_claim_id_taken');
      }

      tx.create(userRef, {
        [ACCOUNT_ID_FIELD]: accountId,
        firebaseAuthUid: authUid,
        accountIdAssignedAt: nowMs,
        accountIdAssignedReason: 'stage4_server_issued_2026_09_01',
        updatedAt: nowMs,
      });
      tx.set(db.collection('auth_links').doc(authUid), {
        stable_id: stableId,
        updatedAt: nowMs,
      }, { merge: true });
      // Карта заполняется В ТОЙ ЖЕ транзакции — иначе она разойдётся с
      // реальностью, и опознание по имени перестанет работать для новых людей.
      for (const { alias, kind } of cleanAliases([
        { alias: stableId, kind: 'stable' },
        { alias: authUid, kind: 'auth' },
      ])) {
        tx.set(db.collection(ACCOUNT_ID_INDEX).doc(accountIdIndexDocId(alias)), {
          accountId, alias, kind, stableId, updatedAt: nowMs,
        }, { merge: true });
      }
    });
  } catch (error) {
    const code = (error as { code?: unknown })?.code;
    if (code === 'aborted') {
      // Проиграли гонку — отдаём аккаунт, который создал победитель. Это и есть
      // идемпотентность: два одновременных запуска дают ОДИН аккаунт.
      const winner = await findAccountByAlias(db, authUid);
      if (winner) {
        return { accountId: winner.accountId, stableId: winner.stableId, created: false };
      }
    }
    // зачем не глотаем молча (правило проекта): человек остался без аккаунта,
    // и причина обязана быть видна — иначе это немой отказ на самом входе.
    console.warn(JSON.stringify({
      event: 'account_claim_failed',
      code: String(code ?? 'unknown'),
      message: String((error as { message?: unknown })?.message ?? error).slice(0, 160),
    }));
    throw error;
  }

  return { accountId, stableId, created: true };
}

/**
 * Приложение спрашивает: «кто я?» — и получает аккаунт.
 *
 * Заменяет собой связку «телефон придумал id → сервер его признал», из-за
 * которой и появлялись два аккаунта у одного человека.
 */
export const accountClaimMine = onCall(HOT_CALLABLE_OPTIONS, async (request) => {
  // Прогрев с экрана входа — как у соседних callable, чтобы первый настоящий
  // вызов не платил за холодный старт.
  if (request.data?.warmup === true) return { ok: true, warm: true };
  const authUid = String(request.auth?.uid ?? '').trim();
  if (!authUid) throw new HttpsError('unauthenticated', 'auth_required');
  return claimAccountForAuth(admin.firestore(), authUid);
});
