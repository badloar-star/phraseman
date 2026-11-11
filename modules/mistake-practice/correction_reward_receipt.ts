// Расписка награды за исправленную ошибку: запись, которую практика ошибок кладёт в свой журнал (событие
// correction_rewarded, поле replayReceipt) и по которой повторный запуск узнаёт уже выданную награду.
//
// зачем: раньше эта расписка жила в модулях кошелька удалённого курса занятий и вдобавок зачислялась в его кошелёк.
// Курса и кошелька больше нет, а журнал практики ошибок с такими расписками уже лежит на телефонах и в облаке —
// поэтому формат (имена полей, schemaVersion, способ вычисления отпечатка аккаунта) сохранён байт-в-байт,
// меняется только место, где он описан. Зачисления в кошелёк курса нет: звезда остаётся отметкой в журнале ошибок.
import { canonicalJsonV1, hashCanonicalBody, sha256Utf8 } from '../canonical_json';
import type { LearningLanguageTarget } from '../../app/learning_language_contour';

export interface MistakeCorrectionWalletCompositeV1 {
  readonly schemaVersion: 'mistake-correction-wallet-composite.v1';
  readonly accountScopeHash: string;
  readonly rewardKey: string;
  readonly mistakeId: string;
  readonly cycleId: string;
  // зачем: StudyTarget расширен до en|fr|es|de; узкий тип отклонял награду за исправление ошибок для es/de.
  readonly studyTarget: LearningLanguageTarget;
  readonly correctionEventId: string;
  readonly correctionEventFingerprint: string;
  /** Нет только у старых расписок, запечатанных до «Супер-воскресенья». */
  readonly earnedAtMs?: number;
  readonly rewardVersion: 1;
}

const LEGACY_KEYS = [
  'schemaVersion',
  'accountScopeHash',
  'rewardKey',
  'mistakeId',
  'cycleId',
  'studyTarget',
  'correctionEventId',
  'correctionEventFingerprint',
  'rewardVersion',
] as const;
const KEYS = [
  ...LEGACY_KEYS.slice(0, -1),
  'earnedAtMs',
  'rewardVersion',
] as const;
const HASH = /^[a-f0-9]{64}$/;
const MISTAKE = /^mistake:v1:[a-f0-9]{64}$/;
const CYCLE = /^mistake-cycle:v1:[a-f0-9]{64}$/;
const EVENT = /^mistake-practice:v1:[a-f0-9]{64}$/;
const STABLE_UID = /^[A-Za-z0-9._-]{1,160}$/;
const MAX_STRING_UNITS = 4096;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);
const fail = (): never => { throw new Error('mistake_correction_wallet_composite_invalid'); };

/**
 * Отпечаток аккаунта в расписке. Имя схемы внутри хэша — то, под которым расписки выпускали прежние версии;
 * изменить его значило бы сделать все уже сохранённые расписки «чужими».
 */
export const deriveMistakeRewardAccountScopeHash = (stableUid: unknown): string => {
  if (typeof stableUid !== 'string' || !STABLE_UID.test(stableUid) || stableUid === '.' || stableUid === '..') {
    throw new Error('mistake_correction_account_scope_invalid');
  }
  return hashCanonicalBody({
    schemaVersion: 'learning-v2-economic-account-scope.v1',
    stableUid,
  });
};

/** Плоская запись из простых значений: без вложенности, геттеров, чужих прототипов и длинных строк. */
function detachFlatRecord(input: unknown): Record<string, unknown> {
  if (!isRecord(input)) return fail();
  const prototype = Object.getPrototypeOf(input);
  if (prototype !== Object.prototype && prototype !== null) return fail();
  if (Reflect.ownKeys(input).some((key) => typeof key !== 'string')) return fail();
  const descriptors = Object.getOwnPropertyDescriptors(input);
  const keys = Object.keys(descriptors);
  if (keys.length > KEYS.length) return fail();
  let stringUnits = 0;
  for (const key of keys) {
    const descriptor = descriptors[key];
    if (!descriptor || !('value' in descriptor) || !descriptor.enumerable) return fail();
    const value: unknown = descriptor.value;
    if (typeof value === 'object' && value !== null) return fail();
    stringUnits += key.length + (typeof value === 'string' ? value.length : 0);
    if (stringUnits > MAX_STRING_UNITS) return fail();
  }
  try {
    const detached: unknown = JSON.parse(canonicalJsonV1(input));
    return isRecord(detached) ? detached : fail();
  } catch (error: unknown) {
    // зачем (правило владельца «никаких немых catch», сторож SILENT-CATCH 11.11): почему запись награды не разобралась — в журнал;
    // значения полей не пишем, только число ключей и сообщение ошибки.
    console.warn('[MISTAKE-REWARD-RECEIPT] detach:failed', JSON.stringify({ keys: keys.length, reason: error instanceof Error ? error.message : String(error) }));
    return fail();
  }
}

export function parseMistakeCorrectionWalletComposite(
  input: unknown,
): MistakeCorrectionWalletCompositeV1 {
  const detached = detachFlatRecord(input);
  const detachedKeys = Object.keys(detached);
  const hasCurrentKeys = detachedKeys.length === KEYS.length &&
    detachedKeys.every((key) => KEYS.includes(key as typeof KEYS[number]));
  const hasLegacyKeys = detachedKeys.length === LEGACY_KEYS.length &&
    detachedKeys.every((key) => LEGACY_KEYS.includes(key as typeof LEGACY_KEYS[number]));
  if ((!hasCurrentKeys && !hasLegacyKeys) ||
    detached.schemaVersion !== 'mistake-correction-wallet-composite.v1' ||
    typeof detached.accountScopeHash !== 'string' || !HASH.test(detached.accountScopeHash) ||
    typeof detached.rewardKey !== 'string' ||
    typeof detached.mistakeId !== 'string' || !MISTAKE.test(detached.mistakeId) ||
    typeof detached.cycleId !== 'string' || !CYCLE.test(detached.cycleId) ||
    (detached.studyTarget !== 'en' && detached.studyTarget !== 'fr' &&
      detached.studyTarget !== 'es' && detached.studyTarget !== 'de') ||
    typeof detached.correctionEventId !== 'string' || !EVENT.test(detached.correctionEventId) ||
    typeof detached.correctionEventFingerprint !== 'string' || !HASH.test(detached.correctionEventFingerprint) ||
    (detached.earnedAtMs !== undefined &&
      (!Number.isSafeInteger(detached.earnedAtMs) || Number(detached.earnedAtMs) < 0)) ||
    detached.rewardVersion !== 1) return fail();
  const expectedRewardKey = `mistake-correction:v1:${sha256Utf8(canonicalJsonV1({
    mistakeId: detached.mistakeId,
    cycleId: detached.cycleId,
    studyTarget: detached.studyTarget,
    rewardVersion: 1,
  }))}`;
  if (detached.rewardKey !== expectedRewardKey) return fail();
  return Object.freeze({
    schemaVersion: 'mistake-correction-wallet-composite.v1',
    accountScopeHash: detached.accountScopeHash,
    rewardKey: detached.rewardKey,
    mistakeId: detached.mistakeId,
    cycleId: detached.cycleId,
    studyTarget: detached.studyTarget,
    correctionEventId: detached.correctionEventId,
    correctionEventFingerprint: detached.correctionEventFingerprint,
    ...(detached.earnedAtMs === undefined ? {} : { earnedAtMs: Number(detached.earnedAtMs) }),
    rewardVersion: 1,
  });
}
