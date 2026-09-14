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
  /** Базовая цена (3) или цена повтора (1) — фиксируется на старте сессии. */
  awardPerItem: number;
  /** Элементы, за которые руны уже начислены в этой копилке. */
  creditedItemIds: readonly string[];
  /** Сколько рун накоплено и ждёт экрана завершения. */
  pendingRunes: number;
}>;

/** Идентификатор элемента (слово, карточка, глагол) — живёт только на телефоне. */
function normalizeId(value: string): string {
  return value.trim().slice(0, 200);
}

/**
 * Максимальная длина ключа сессии. Обязана совпадать с серверным
 * `SESSION_KEY = /^[A-Za-z0-9_-]{1,72}$/` в functions/src/practice_rune_grant.ts.
 *
 * зачем именно 72 (аудит 2026-08-27): итоговый opId журнала допускает хвост
 * максимум 96 символов, а хвост склеивается как
 * `{activity}_{sessionKey}_{ordinal}`. Исторические ordinal до 999 с самой
 * длинной активностью ровно помещаются; для 1000+ helper opId ниже сокращает
 * только свою копию sessionKey с хэш-суффиксом, не меняя поле операции.
 */
const SESSION_KEY_MAX = 72;

/**
 * Нормализация ключа СЕССИИ — отдельно от элементов, потому что этот ключ
 * уезжает на сервер и обязан пройти серверную проверку.
 *
 * зачем (аудит 2026-08-27): ключ нормализовался в двух местах по-разному —
 * копилка резала до 200 символов и оставляла любые символы, а идентификатор
 * расписки дополнительно чистил charset. Из-за этого кириллический раздел
 * («урок-1») или ключ с пробелом уходил на сервер сырым, сервер отвергал его
 * как invalid-argument, и заработанные руны сгорали МОЛЧА: копилка на телефоне
 * к тому моменту уже считалась зачтённой. Теперь правило ровно одно и оно
 * совпадает с серверным.
 */
/** FNV-1a — та же схема, что shortHash в app/app_health.ts, продублирована
    здесь намеренно (не хотим завязывать копилку рун на модуль диагностики). */
function fnv1aBase36(input: string): string {
  let h = 2166136261;
  for (let i = 0; i < input.length; i += 1) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0).toString(36);
}

/**
 * зачем (аудит 2026-08-28): простое .slice(0, 72) обрезало ХВОСТ ключа —
 * для контент-хэшированных ключей (отработка ошибок, тренировка карточек по
 * многим наборам) именно хвост нёс уникальность. Две разные сессии,
 * совпадающие первыми 72 символами, схлопывались в один ключ: вторая
 * сессия читала чужую («уже кредитовано») копилку с диска, руны за
 * реально новые ответы не начислялись, а зачёт отклонялся сервером как
 * дублирующая расписка. Хвост заменяем коротким хэшем от полной строки —
 * тот же префикс для читаемости в логах, но коллизия исключена.
 */
function normalizeSessionKey(value: string): string {
  const cleaned = value.trim().replace(/[^A-Za-z0-9_-]/g, '_');
  if (cleaned.length <= SESSION_KEY_MAX) return cleaned;
  const suffix = `_${fnv1aBase36(cleaned)}`;
  return cleaned.slice(0, SESSION_KEY_MAX - suffix.length) + suffix;
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
  const sessionKey = normalizeSessionKey(input.sessionKey);
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
 * Бонус обычного урока за непрерывную серию: 1–9 = 0, 10–19 = 1,
 * 20–29 = 2 и так далее без потолка.
 *
 * `creditedItemCount` ограничивает вход математически возможным номером нового
 * оплачиваемого элемента. Это не cap механики: граница растёт вместе с числом
 * честно отвеченных элементов, но ошибочный/подменённый streak=100 на первом
 * ответе не может сразу превратиться в +10 рун.
 */
export function lessonPracticeRuneStreakBonus(
  correctStreak: number | undefined,
  creditedItemCount: number,
): number {
  if (!Number.isSafeInteger(correctStreak) || (correctStreak ?? 0) < 1) return 0;
  if (!Number.isSafeInteger(creditedItemCount) || creditedItemCount < 0) return 0;
  const boundedStreak = Math.min(correctStreak as number, creditedItemCount + 1);
  return Math.floor(boundedStreak / 10);
}

/** Максимальная сумма streak-бонусов для N уникально оплаченных ответов. */
function maximumLessonStreakBonus(creditedItemCount: number): number {
  const fullTens = Math.floor(creditedItemCount / 10);
  if (fullTens <= 0) return 0;
  const remainder = creditedItemCount % 10;
  return 5 * fullTens * (fullTens - 1) + fullTens * (remainder + 1);
}

/**
 * Проверяет точную разницу между уже подтверждённым prefix и более свежей
 * локальной копилкой после crash/restart. Для старых активностей сохраняется
 * прежнее строгое равенство `suffixCount × base`. Урок дополнительно допускает
 * лишь бонус, который мог появиться на позициях suffix непрерывной серии.
 */
export function recoverablePracticeRunePendingDelta(input: Readonly<{
  activity: PracticeRuneActivity;
  awardPerItem: number;
  committedItemCount: number;
  storedItemCount: number;
  committedPendingRunes: number;
  storedPendingRunes: number;
}>): number | null {
  const values = [
    input.awardPerItem,
    input.committedItemCount,
    input.storedItemCount,
    input.committedPendingRunes,
    input.storedPendingRunes,
  ];
  if (!values.every(Number.isSafeInteger)
    || input.awardPerItem < 1
    || input.committedItemCount < 0
    || input.storedItemCount < input.committedItemCount
    || input.committedPendingRunes < 0
    || input.storedPendingRunes < input.committedPendingRunes) {
    return null;
  }

  const suffixCount = input.storedItemCount - input.committedItemCount;
  const observedDelta = input.storedPendingRunes - input.committedPendingRunes;
  const baseDelta = suffixCount * input.awardPerItem;
  if (!Number.isSafeInteger(observedDelta) || !Number.isSafeInteger(baseDelta)) return null;
  if (input.activity !== 'lesson') return observedDelta === baseDelta ? observedDelta : null;

  const maximumBonusDelta = maximumLessonStreakBonus(input.storedItemCount)
    - maximumLessonStreakBonus(input.committedItemCount);
  const maximumDelta = baseDelta + maximumBonusDelta;
  return observedDelta >= baseDelta && observedDelta <= maximumDelta
    ? observedDelta
    : null;
}

/** Единый чистый расчёт награды для реального и DEV-контуров. */
export function practiceRuneAwardForCorrectStreak(input: Readonly<{
  activity: PracticeRuneActivity;
  awardPerItem: number;
  correctStreak?: number;
  creditedItemCount: number;
}>): number {
  const streakBonus = input.activity === 'lesson'
    ? lessonPracticeRuneStreakBonus(input.correctStreak, input.creditedItemCount)
    : 0;
  return input.awardPerItem + streakBonus;
}

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
  correctStreak?: number,
): PracticeRuneAwardResult {
  const id = normalizeId(itemId);
  if (!id) return Object.freeze({ earnings, awarded: 0 });
  if (earnings.creditedItemIds.includes(id)) {
    return Object.freeze({ earnings, awarded: 0 });
  }
  const awarded = practiceRuneAwardForCorrectStreak({
    activity: earnings.activity,
    awardPerItem: earnings.awardPerItem,
    correctStreak,
    creditedItemCount: earnings.creditedItemIds.length,
  });
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

/**
 * Premium-порог ошибок: сгорает лишь незачтённая копилка текущего прохода.
 * Уже оплаченные элементы остаются в списке, поэтому повторный ответ после
 * восстановления сердец не позволяет нафармить те же руны второй раз.
 */
export function forfeitPendingPracticeRunes(
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
  const sessionKey = normalizeSessionKey(input.sessionKey);
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
  if (candidate.sessionKey !== normalizeSessionKey(expected.sessionKey)) return null;

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
  // элементов. Только обычный урок имеет streak-бонус; остальные активности
  // сохраняют прежнюю строгую границу count × base.
  const maximumPendingRunes = creditedItemIds.length * awardPerItem
    + (expected.activity === 'lesson'
      ? maximumLessonStreakBonus(creditedItemIds.length)
      : 0);
  if ((pendingRunes as number) > maximumPendingRunes) return null;

  return Object.freeze({
    schemaVersion: 'practice-rune-earnings.v1',
    activity: expected.activity,
    sessionKey: normalizeSessionKey(expected.sessionKey),
    awardPerItem,
    creditedItemIds: Object.freeze(creditedItemIds),
    pendingRunes: pendingRunes as number,
  });
}

export type PracticeRuneAccumulator = Readonly<{
  schemaVersion: 'practice-rune-accumulator.v2';
  earnings: PracticeRuneEarnings;
  /** Immutable settlement identity for this exact in-progress completion. */
  completionOrdinal: number | null;
}>;

/**
 * Persists the accumulator and its allocated settlement identity together.
 * A raw v1 earnings object remains readable below for installed clients that
 * already have an unfinished session on disk.
 */
export function serializePracticeRuneAccumulator(
  earnings: PracticeRuneEarnings,
  completionOrdinal: number | null,
): string {
  if (completionOrdinal !== null
    && (!Number.isSafeInteger(completionOrdinal) || completionOrdinal < 1)) {
    throw new Error('practice_rune_completion_ordinal_invalid');
  }
  return JSON.stringify({
    schemaVersion: 'practice-rune-accumulator.v2',
    earnings,
    completionOrdinal,
  });
}

export function parsePracticeRuneAccumulator(
  raw: unknown,
  expected: Readonly<{ activity: PracticeRuneActivity; sessionKey: string }>,
): PracticeRuneAccumulator | null {
  const legacyEarnings = parsePracticeRuneEarnings(raw, expected);
  if (legacyEarnings) {
    return Object.freeze({
      schemaVersion: 'practice-rune-accumulator.v2',
      earnings: legacyEarnings,
      completionOrdinal: null,
    });
  }

  let value: unknown = raw;
  if (typeof raw === 'string') {
    try { value = JSON.parse(raw); } catch { return null; }
  }
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const candidate = value as Record<string, unknown>;
  if (candidate.schemaVersion !== 'practice-rune-accumulator.v2') return null;
  const earnings = parsePracticeRuneEarnings(candidate.earnings, expected);
  if (!earnings) return null;
  const completionOrdinal = candidate.completionOrdinal;
  if (completionOrdinal !== null
    && (!Number.isSafeInteger(completionOrdinal) || (completionOrdinal as number) < 1)) {
    return null;
  }
  return Object.freeze({
    schemaVersion: 'practice-rune-accumulator.v2',
    earnings,
    completionOrdinal: completionOrdinal as number | null,
  });
}

const SETTLED_ONCE_PREFIX = 'practice_rune_settled_once_v1';

/**
 * Ключ отметки «эта сессия уже когда-то приносила руны».
 *
 * зачем отдельно от прогресса урока/словаря (владелец, 2026-08-27): у каждого
 * из семи экранов свой формат хранения пройденности (массив оценок урока,
 * счётчики повторений слова...), и опираться на них для решения «первое
 * прохождение или нет» означало бы семь разных детекторов. Здесь один простой
 * булев флаг: сессия уже была зачтена хоть раз — значит теперь цена ответа 1,
 * а не 3. Он НЕ совпадает с «урок выучен»: если человек прошёл урок ДО того,
 * как в приложении появились руны, для рун это всё ещё первый раз.
 */
export function practiceRuneSettledOnceStorageKey(input: Readonly<{
  ownerStableId: string;
  activity: PracticeRuneActivity;
  sessionKey: string;
}>): string {
  const owner = input.ownerStableId.trim();
  if (!owner) throw new Error('practice_rune_owner_invalid');
  const sessionKey = normalizeSessionKey(input.sessionKey);
  if (!sessionKey) throw new Error('practice_rune_session_key_invalid');
  return `${SETTLED_ONCE_PREFIX}:${encodeURIComponent(owner)}:${input.activity}:${encodeURIComponent(sessionKey)}`;
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
  const sessionKey = normalizeSessionKey(input.sessionKey);
  if (!sessionKey) throw new Error('practice_rune_session_key_invalid');
  // зачем (аудит 2026-08-27): журнал рун принимает РОВНО ОДНО двоеточие —
  // OP_ID_RE в functions/src/stars_ledger.ts. Прежний формат с тремя
  // двоеточиями отвергался валидатором, и ни одна руна не начислилась бы ни на
  // одном экране. Разделитель внутри хвоста — подчёркивание.
  const ordinalText = String(ordinal);
  const maxSessionKeyInOperationId = 96 - input.activity.length - ordinalText.length - 2;
  const operationSessionKey = sessionKey.length <= maxSessionKeyInOperationId
    ? sessionKey
    : (() => {
        const suffix = `_${fnv1aBase36(sessionKey)}`;
        return sessionKey.slice(0, maxSessionKeyInOperationId - suffix.length) + suffix;
      })();
  return `practice_rune:${input.activity}_${operationSessionKey}_${ordinalText}`;
}
