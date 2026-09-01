import * as admin from 'firebase-admin';
import { HttpsError } from 'firebase-functions/v2/https';
import {
  ACCOUNT_DELETE_AUTH_MARKERS,
  ACCOUNT_DELETE_PERMANENT_DENIALS,
  ACCOUNT_DELETE_TOMBSTONES,
  accountDeletePermanentDenialId,
} from './account_delete_job';

/*
 * ЕДИНАЯ ДВЕРЬ АККАУНТА — этап 1 перестройки идентичности (владелец, 01.09.2026).
 *
 * зачем: сегодня 122 места в 15 файлах читают метки удаления ВРУЧНУЮ, каждое
 * своей формой. Именно поэтому дыры появляются регулярно: 01.09 нашлись сразу
 * две — одна проверка смотрела не на то поле, другая читала метку, которую
 * воркер забывал обновить. При 122 самодельных проверках это статистика, а не
 * небрежность: чтобы ошибиться, достаточно одного невнимательного места.
 *
 * Здесь — ОДНА функция, через которую проходит любой вопрос «пускать ли».
 * Ошибиться можно будет только в одном месте, и починить — тоже в одном.
 *
 * ЧТО ЭТО НЕ ДЕЛАЕТ: не меняет поведение. Возвращает ровно те же вердикты,
 * что и нынешние проверки, — чтобы переезд 122 мест был механическим и
 * безопасным. Новая семантика (одно поле состояния в самом аккаунте) придёт
 * этапом позже, и заменить придётся ТОЛЬКО эту функцию.
 *
 * Firebase-экономия: ровно два точечных чтения по известным id на одну
 * личность, параллельно. Ни одного скана. Столько же, сколько тратила любая
 * из прежних самодельных проверок.
 */

/** Состояние аккаунта — единственная правда о том, жив он или нет. */
export type AccountState =
  /** Обычный живой аккаунт. Пускаем. */
  | { kind: 'active' }
  /** Заявлено удаление, но 14 дней ещё идут: данные ЦЕЛЫ, можно вернуть. */
  | { kind: 'grace'; graceDeadlineMs: number; subject: GateSubject }
  /** Воркер уже сносит данные либо снёс. Возврата нет. */
  | { kind: 'deleted'; subject: GateSubject };

export type GateSubject = 'auth' | 'stable';

/**
 * Читает состояние по метке.
 *
 * Отличать grace от смерти по факту СУЩЕСТВОВАНИЯ метки нельзя: маркер,
 * надгробие и постоянные отказы пишутся сразу при подаче заявки и живут все
 * 14 дней. Единственный честный признак — поле `status`.
 *
 * Тип дедлайна проверяется строго: `Number('9999999999999')` дало бы валидное
 * число, и человеку пообещали бы восстановление, которого сервер не выполнит
 * (он читает то же поле числом). При любом сомнении отвечаем строго — «мёртв».
 */
function readMarkerState(
  snap: FirebaseFirestore.DocumentSnapshot | null | undefined,
  nowMs: number,
): 'none' | 'grace' | 'deleted' | { grace: number } {
  if (!snap?.exists) return 'none';
  const data = snap.data() ?? {};
  if (String(data.status ?? '') !== 'pending') return 'deleted';
  const deadline = data.graceDeadlineMs;
  if (typeof deadline !== 'number' || !Number.isFinite(deadline) || deadline <= 0) return 'deleted';
  return deadline > nowMs ? { grace: deadline } : 'deleted';
}

type GateReads = {
  marker: FirebaseFirestore.DocumentSnapshot | null;
  denial: FirebaseFirestore.DocumentSnapshot | null;
};

function verdictFrom(reads: GateReads, subject: GateSubject, nowMs: number): AccountState {
  const state = readMarkerState(reads.marker, nowMs);
  if (typeof state === 'object') {
    return { kind: 'grace', graceDeadlineMs: state.grace, subject };
  }
  // Постоянный отказ намеренно НЕ несёт grace: он ставится закрытием личности
  // и снимается только восстановлением. Метка со статусом решает первой; если
  // её нет, а отказ стоит — аккаунт мёртв.
  if (state === 'deleted' || reads.denial?.exists) return { kind: 'deleted', subject };
  return { kind: 'active' };
}

/**
 * Состояние по uid входа (Firebase Auth).
 *
 * Оба чтения обёрнуты: недоступность базы НЕ должна выглядеть как «аккаунт
 * жив» — это открыло бы доступ к удаляемому аккаунту при сбое сети.
 */
export async function readAuthAccountState(
  db: admin.firestore.Firestore,
  authUid: string,
  nowMs = Date.now(),
): Promise<AccountState> {
  const [marker, denial] = await Promise.all([
    db.collection(ACCOUNT_DELETE_AUTH_MARKERS).doc(authUid).get(),
    db.collection(ACCOUNT_DELETE_PERMANENT_DENIALS)
      .doc(accountDeletePermanentDenialId(authUid)).get(),
  ]);
  return verdictFrom({ marker, denial }, 'auth', nowMs);
}

/** Состояние по стабильному id аккаунта. */
export async function readStableAccountState(
  db: admin.firestore.Firestore,
  stableId: string,
  nowMs = Date.now(),
): Promise<AccountState> {
  const [marker, denial] = await Promise.all([
    db.collection(ACCOUNT_DELETE_TOMBSTONES).doc(stableId).get(),
    db.collection(ACCOUNT_DELETE_PERMANENT_DENIALS)
      .doc(accountDeletePermanentDenialId(stableId)).get(),
  ]);
  return verdictFrom({ marker, denial }, 'stable', nowMs);
}

/**
 * То же, но внутри транзакции — чтобы решение не устарело между чтением и
 * записью. Гонка «проверили живой → пока писали, человек удалился» реальна:
 * заявка ставится одним тапом.
 */
export async function readStableAccountStateInTx(
  tx: admin.firestore.Transaction,
  db: admin.firestore.Firestore,
  stableId: string,
  nowMs = Date.now(),
): Promise<AccountState> {
  const [marker, denial] = await Promise.all([
    tx.get(db.collection(ACCOUNT_DELETE_TOMBSTONES).doc(stableId)),
    tx.get(db.collection(ACCOUNT_DELETE_PERMANENT_DENIALS)
      .doc(accountDeletePermanentDenialId(stableId))),
  ]);
  return verdictFrom({ marker, denial }, 'stable', nowMs);
}

/** То же для uid входа внутри транзакции. */
export async function readAuthAccountStateInTx(
  tx: admin.firestore.Transaction,
  db: admin.firestore.Firestore,
  authUid: string,
  nowMs = Date.now(),
): Promise<AccountState> {
  const [marker, denial] = await Promise.all([
    tx.get(db.collection(ACCOUNT_DELETE_AUTH_MARKERS).doc(authUid)),
    tx.get(db.collection(ACCOUNT_DELETE_PERMANENT_DENIALS)
      .doc(accountDeletePermanentDenialId(authUid))),
  ]);
  return verdictFrom({ marker, denial }, 'auth', nowMs);
}

/**
 * Решение по УЖЕ ПРОЧИТАННЫМ снапшотам.
 *
 * зачем отдельно от readStableAccountState: внутри транзакций метки читаются
 * вместе с остальными документами одним пакетом, и повторное чтение стоило бы
 * лишних обращений к базе на каждый вход. Смысл при этом обязан быть ТОТ ЖЕ —
 * поэтому оба пути сходятся в одной функции verdictFrom.
 *
 * Принимает несколько надгробий разом (аккаунт + его псевдонимы после слияний):
 * grace хотя бы на одном означает, что человеку положено предложение вернуть
 * аккаунт, а не пустой профиль.
 */
export function accountStateFromSnapshots(
  input: Readonly<{
    marker?: FirebaseFirestore.DocumentSnapshot | null;
    markers?: readonly (FirebaseFirestore.DocumentSnapshot | null | undefined)[];
    denial?: FirebaseFirestore.DocumentSnapshot | null;
    denials?: readonly (FirebaseFirestore.DocumentSnapshot | null | undefined)[];
    subject: GateSubject;
  }>,
  nowMs = Date.now(),
): AccountState {
  const markers = [input.marker, ...(input.markers ?? [])].filter(Boolean);
  const denials = [input.denial, ...(input.denials ?? [])].filter(Boolean);
  const denialExists = denials.some((snap) => snap?.exists);

  // Grace важнее смерти: если хоть одна метка ещё в 14 днях — аккаунт жив.
  for (const marker of markers) {
    const state = readMarkerState(marker, nowMs);
    if (typeof state === 'object') {
      return { kind: 'grace', graceDeadlineMs: state.grace, subject: input.subject };
    }
  }
  if (markers.some((m) => readMarkerState(m, nowMs) === 'deleted') || denialExists) {
    return { kind: 'deleted', subject: input.subject };
  }
  return { kind: 'active' };
}

/**
 * Единственная точка, где отказ превращается в ошибку для клиента.
 *
 * Коды намеренно РАЗНЫЕ и это принципиально:
 *   • `account_delete_pending` — аккаунт жив, приложение обязано предложить
 *     «Восстановить аккаунт?»;
 *   • `identity_retired` — аккаунта больше нет, открывается чистый профиль.
 * Схлопывание этих двух кодов в один и было главной дырой, найденной 01.09:
 * человек внутри 14 дней молча получал пустой профиль вместо предложения
 * вернуть свой прогресс.
 */
export function assertAccountUsable(state: AccountState): void {
  if (state.kind === 'active') return;
  if (state.kind === 'grace') {
    throw new HttpsError('failed-precondition', 'account_delete_pending', {
      subject: state.subject,
      graceDeadlineMs: state.graceDeadlineMs,
      recovery: 'offer_restore',
    });
  }
  throw new HttpsError('failed-precondition', 'identity_retired', {
    subject: state.subject,
    recovery: 'create_fresh_anonymous',
  });
}

/** Короткая форма для самого частого случая: прочитать и сразу отказать. */
export async function assertStableAccountUsable(
  db: admin.firestore.Firestore,
  stableId: string,
  nowMs = Date.now(),
): Promise<void> {
  assertAccountUsable(await readStableAccountState(db, stableId, nowMs));
}

/** То же по uid входа. */
export async function assertAuthAccountUsable(
  db: admin.firestore.Firestore,
  authUid: string,
  nowMs = Date.now(),
): Promise<void> {
  assertAccountUsable(await readAuthAccountState(db, authUid, nowMs));
}

/**
 * Проверка группы личностей разом (аккаунт + его псевдонимы после слияний).
 *
 * Отказ выдаёт ПЕРВАЯ мёртвая личность, но grace имеет приоритет над смертью:
 * если хоть одна личность ещё в 14 днях, человеку положено предложение
 * восстановить, а не пустой профиль.
 */
export async function assertStableGroupUsable(
  db: admin.firestore.Firestore,
  stableIds: readonly string[],
  nowMs = Date.now(),
): Promise<void> {
  const unique = [...new Set(stableIds.map((id) => String(id ?? '').trim()).filter(Boolean))];
  if (unique.length === 0) return;
  const states = await Promise.all(
    unique.map((id) => readStableAccountState(db, id, nowMs)),
  );
  const grace = states.find((st) => st.kind === 'grace');
  if (grace) assertAccountUsable(grace);
  const dead = states.find((st) => st.kind === 'deleted');
  if (dead) assertAccountUsable(dead);
}
