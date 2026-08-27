/**
 * practice_rune_earnings.ts — копилка рун учебной сессии.
 *
 * зачем (владелец, 2026-08-27): «надо сделать чтобы руны можно было
 * зарабатывать в уроках, в словаре, неправильные глаголы, блиц, тренировка,
 * отработка ошибок, отработка голосом». До этого руны давали только Арена,
 * курс Learning V2, друзья, спин и биржа — семь учебных экранов не приносили
 * валюту вообще.
 *
 * Правила владельца, зафиксированные 2026-08-27:
 *   • +3 руны за правильный ответ; ошибся — руна за этот элемент НЕ идёт, но
 *     если переответил правильно, засчитывается;
 *   • один элемент приносит руны РОВНО один раз за сессию, сколько бы раз он ни
 *     повторился внутри неё;
 *   • руны падают на баланс ТОЛЬКО когда игрок дошёл до экрана празднования;
 *   • вышел посреди сессии — копилка ждёт его сколько угодно, ничего не сгорает;
 *   • повторное прохождение той же сессии даёт +1 вместо +3 (полная цена только
 *     за первое прохождение).
 *
 * Этот модуль — ЧИСТОЕ ядро: он считает и хранит копилку, но САМ НЕ начисляет
 * руны на баланс и не ходит в сеть. Начисление остаётся у единственного писателя
 * (`level_spin_star_grants.ts`), как того требует контракт экономики — здесь
 * лишь решение «сколько причитается».
 *
 * Firebase-экономия: ноль чтений и записей Firestore. Копилка живёт в
 * AsyncStorage рядом с прогрессом сессии, на сервер уходит ОДНА операция на всю
 * сессию — в момент завершения, а не по три на каждый ответ.
 */

/** Полная цена правильного ответа — первое прохождение сессии. */
export const PRACTICE_RUNE_FULL_AWARD = 3;

/** Цена правильного ответа при повторном прохождении той же сессии. */
export const PRACTICE_RUNE_REPEAT_AWARD = 1;

/**
 * Учебные активности, приносящие руны. Значение уезжает на сервер в `sourceKind`
 * расписки, поэтому строки стабильны и не переименовываются задним числом.
 */
export type PracticeRuneActivity =
  | 'lesson'
  | 'vocabulary'
  | 'irregular_verbs'
  | 'flashcards_blitz'
  | 'flashcards_training'
  | 'mistake_practice'
  | 'speaking_practice';

export type PracticeRuneEarnings = Readonly<{
  schemaVersion: 'practice-rune-earnings.v1';
  activity: PracticeRuneActivity;
  /** Ключ сессии: урок, набор карточек, раздел словаря. */
  sessionKey: string;
  /** Полная цена (3) или цена повтора (1) — фиксируется на старте сессии. */
  awardPerItem: number;
  /** Элементы, за которые руны уже начислены в этой копилке. */
  creditedItemIds: readonly string[];
  /** Сколько рун накоплено и ждёт экрана завершения. */
  pendingRunes: number;
}>;

function normalizeId(value: string): string {
  return value.trim().slice(0, 200);
}

/**
 * Пустая копилка. `firstCompletion` решает цену: первое прохождение — по 3,
 * повторное — по 1 (решение владельца против фарма на перепрохождении).
 */
export function createPracticeRuneEarnings(input: Readonly<{
  activity: PracticeRuneActivity;
  sessionKey: string;
  firstCompletion: boolean;
}>): PracticeRuneEarnings {
  const sessionKey = normalizeId(input.sessionKey);
  if (!sessionKey) throw new Error('practice_rune_session_key_invalid');
  return Object.freeze({
    schemaVersion: 'practice-rune-earnings.v1',
    activity: input.activity,
    sessionKey,
    awardPerItem: input.firstCompletion
      ? PRACTICE_RUNE_FULL_AWARD
      : PRACTICE_RUNE_REPEAT_AWARD,
    creditedItemIds: Object.freeze([]),
    pendingRunes: 0,
  });
}

export type PracticeRuneAwardResult = Readonly<{
  earnings: PracticeRuneEarnings;
  /** Сколько рун прибавилось прямо сейчас: 0, если элемент уже оплачен. */
  awarded: number;
}>;

/**
 * Правильный ответ по элементу `itemId`.
 *
 * Возвращает НОВЫЙ объект копилки (правило неизменяемости) и число рун, которое
 * должна показать анимация полёта. Повторный правильный ответ по тому же
 * элементу возвращает 0 — счётчик не дрогнет, и анимация не запустится.
 *
 * Ошибочный ответ сюда просто НЕ приходит: экран зовёт эту функцию только на
 * правильном исходе. Поэтому «ошибся → переответил правильно» работает само
 * собой — засчитается второй, верный вызов.
 */
export function awardPracticeRune(
  earnings: PracticeRuneEarnings,
  itemId: string,
): PracticeRuneAwardResult {
  const id = normalizeId(itemId);
  if (!id) return Object.freeze({ earnings, awarded: 0 });
  if (earnings.creditedItemIds.includes(id)) {
    return Object.freeze({ earnings, awarded: 0 });
  }
  const awarded = earnings.awardPerItem;
  return Object.freeze({
    earnings: Object.freeze({
      ...earnings,
      creditedItemIds: Object.freeze([...earnings.creditedItemIds, id]),
      pendingRunes: earnings.pendingRunes + awarded,
    }),
    awarded,
  });
}

/** Уже оплачен ли элемент — для UI, чтобы не мигать счётчиком впустую. */
export function isPracticeRuneItemCredited(
  earnings: PracticeRuneEarnings,
  itemId: string,
): boolean {
  return earnings.creditedItemIds.includes(normalizeId(itemId));
}

/**
 * Копилка после зачёта на экране празднования: руны ушли на баланс, счётчик
 * обнулён, но список оплаченных элементов СОХРАНЯЕТСЯ — иначе повторный проход
 * без выхода с экрана начислил бы за те же слова второй раз.
 */
export function settlePracticeRuneEarnings(
  earnings: PracticeRuneEarnings,
): PracticeRuneEarnings {
  if (earnings.pendingRunes === 0) return earnings;
  return Object.freeze({ ...earnings, pendingRunes: 0 });
}

const STORAGE_PREFIX = 'practice_rune_earnings_v1';

/**
 * Ключ хранения. Привязан к аккаунту, активности и сессии: смена аккаунта не
 * должна отдавать чужую копилку (класс бага «чужой прогресс после входа»).
 */
export function practiceRuneEarningsStorageKey(input: Readonly<{
  ownerStableId: string;
  activity: PracticeRuneActivity;
  sessionKey: string;
}>): string {
  const owner = input.ownerStableId.trim();
  if (!owner) throw new Error('practice_rune_owner_invalid');
  const sessionKey = normalizeId(input.sessionKey);
  if (!sessionKey) throw new Error('practice_rune_session_key_invalid');
  return `${STORAGE_PREFIX}:${encodeURIComponent(owner)}:${input.activity}:${encodeURIComponent(sessionKey)}`;
}

/**
 * Разбор сохранённой копилки. Битое или чужое значение молча превращается в
 * `null`: потерять копилку неприятно, но начислить руны по мусорным данным —
 * хуже (руны это валюта, её можно потратить в магазине).
 */
export function parsePracticeRuneEarnings(
  raw: unknown,
  expected: Readonly<{ activity: PracticeRuneActivity; sessionKey: string }>,
): PracticeRuneEarnings | null {
  let value: unknown = raw;
  if (typeof raw === 'string') {
    try { value = JSON.parse(raw); } catch { return null; }
  }
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const candidate = value as Record<string, unknown>;
  if (candidate.schemaVersion !== 'practice-rune-earnings.v1') return null;
  if (candidate.activity !== expected.activity) return null;
  if (candidate.sessionKey !== normalizeId(expected.sessionKey)) return null;

  const awardPerItem = candidate.awardPerItem;
  if (awardPerItem !== PRACTICE_RUNE_FULL_AWARD
    && awardPerItem !== PRACTICE_RUNE_REPEAT_AWARD) return null;

  const rawItems = candidate.creditedItemIds;
  if (!Array.isArray(rawItems)) return null;
  if (!rawItems.every((item) => typeof item === 'string' && item.length > 0
    && item.length <= 200)) return null;
  const creditedItemIds = Array.from(new Set(rawItems as string[]));

  const pendingRunes = candidate.pendingRunes;
  if (!Number.isSafeInteger(pendingRunes) || (pendingRunes as number) < 0) return null;
  // Копилка не может обещать больше, чем даёт её собственный список оплаченных
  // элементов: расхождение означает подмену файла, а не законный прогресс.
  if ((pendingRunes as number) > creditedItemIds.length * awardPerItem) return null;

  return Object.freeze({
    schemaVersion: 'practice-rune-earnings.v1',
    activity: expected.activity,
    sessionKey: normalizeId(expected.sessionKey),
    awardPerItem,
    creditedItemIds: Object.freeze(creditedItemIds),
    pendingRunes: pendingRunes as number,
  });
}

/**
 * Идентификатор серверной операции: одна сессия — одна расписка. Повторный
 * зачёт той же сессии сервер отбросит как дубль, а не начислит второй раз.
 */
export function practiceRuneSettlementOperationId(input: Readonly<{
  activity: PracticeRuneActivity;
  sessionKey: string;
  /** Порядковый номер прохождения: второй проход — вторая законная расписка. */
  completionOrdinal: number;
}>): string {
  const ordinal = Math.trunc(input.completionOrdinal);
  if (!Number.isSafeInteger(ordinal) || ordinal < 1) {
    throw new Error('practice_rune_completion_ordinal_invalid');
  }
  const sessionKey = normalizeId(input.sessionKey).replace(/[^A-Za-z0-9_-]/g, '_');
  if (!sessionKey) throw new Error('practice_rune_session_key_invalid');
  return `practice_rune:${input.activity}:${sessionKey}:${ordinal}`;
}
