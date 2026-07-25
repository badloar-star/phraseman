/**
 * referral_welcome_state — решает, показывать ли ПРИГЛАШЁННОМУ приветствие
 * «ты пришёл по приглашению → пройди первый урок → пригласившему начислится прокрут».
 *
 * Зачем: раньше реферал-ссылка молча открывала главную, и новичок НЕ узнавал, что
 * за первый пройденный урок приглашение станет квалифицированным. Сервер автоматически
 * начислит пригласившему прокрут после реального прохождения урока 1, но мотивации
 * «пройди урок» в точке входа раньше не было. Эта модалка показывает её один раз.
 *
 * Источник правды о том, что человек «по приглашению»: PENDING_REF_KEY
 * ('pending_referral_code') и/или applied-маркер (referral_applied_ref::{stableId})
 * из app/referral_bootstrap.ts. Достаточно любого из них — pending значит ссылку
 * поймали, applied значит код уже привязан (но урок мог быть ещё не пройден).
 *
 * Показ — РОВНО ОДИН РАЗ на устройство-аккаунт (ключ welcome-seen), и только если
 * награда ещё НЕ получена (иначе мотивировать нечем). Награду фиксируем тем же
 * applied-маркером + флагом refereeRewarded, который ставит referral_vip при синке.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { isReferralCloudEnabled } from './referral_flags';
import { getCanonicalUserId } from './user_id_policy';
import { hasLocalReferralExistingAccountActivity } from './referral_account_activity';

const PENDING_REF_KEY = 'pending_referral_code';
const PENDING_REF_SOURCE_KEY = 'pending_referral_source';
const ONBOARDING_DONE_KEY = 'onboarding_done';

/** «Приветствие уже показывали этому пользователю» — одноразовость. Скоупим по stableId. */
function welcomeSeenKey(stableId: string): string {
  return `referral_welcome_seen::${stableId}`;
}

/** Маркер успешного apply из referral_bootstrap (referral_applied_ref::{stableId}). */
function appliedKey(stableId: string): string {
  return `referral_applied_ref::${stableId}`;
}

/**
 * «Приглашение уже квалифицировано» — ставится клиентом, когда из облака
 * прилетел признак reward (см. markRefereeWelcomeRewarded). После этого
 * приветствие «пройди первый урок» больше не нужно.
 */
function refereeRewardedKey(stableId: string): string {
  return `referral_referee_rewarded::${stableId}`;
}

export interface ReferralWelcomeDecision {
  /** Показывать ли приветствие сейчас. */
  show: boolean;
  /** Реферальный код, по которому пришёл человек (для текста/аналитики), если известен. */
  code: string | null;
  /** true только когда код ещё не применён и нужен ручной fallback ввода. */
  needsCodeEntry: boolean;
}

const NO: ReferralWelcomeDecision = { show: false, code: null, needsCodeEntry: false };

/**
 * Чистая-по-смыслу проверка (читает только AsyncStorage, без сети): надо ли показать
 * приветствие приглашённому. Возвращает show=false при любой неопределённости —
 * лучше не показать, чем показать не тому.
 */
export async function decideReferralWelcome(): Promise<ReferralWelcomeDecision> {
  if (!isReferralCloudEnabled()) return NO;

  // Онбординг должен быть пройден — иначе модалка наложится на онбординг (та же
  // ошибка, что ловили с брифингом Компаса: оверлей главной поверх онбординга).
  const onboardingDone = (await AsyncStorage.getItem(ONBOARDING_DONE_KEY).catch(() => null)) === '1';
  if (!onboardingDone) return NO;

  const stableId = await getCanonicalUserId();
  if (!stableId) return NO;

  // Уже показывали — больше не повторяем.
  const seen = await AsyncStorage.getItem(welcomeSeenKey(stableId)).catch(() => null);
  if (seen === '1') return NO;

  // Награда уже получена — мотивировать нечем.
  const rewarded = await AsyncStorage.getItem(refereeRewardedKey(stableId)).catch(() => null);
  if (rewarded === '1') return NO;
  if (await hasLocalReferralExistingAccountActivity().catch(() => false)) return NO;

  // «По приглашению» = есть pending-код ИЛИ уже привязанный applied-код.
  const pending = (await AsyncStorage.getItem(PENDING_REF_KEY).catch(() => null) ?? '').trim().toUpperCase();
  const pendingSource = (await AsyncStorage.getItem(PENDING_REF_SOURCE_KEY).catch(() => null) ?? '').trim();
  const applied = (await AsyncStorage.getItem(appliedKey(stableId)).catch(() => null) ?? '').trim().toUpperCase();
  const code = applied || pending || null;
  if (!code) return NO;

  return { show: true, code, needsCodeEntry: !applied && !!pending && pendingSource !== 'manual_code' };
}

/** Помечает приветствие показанным — одноразовость. Идемпотентно. */
export async function markReferralWelcomeSeen(): Promise<void> {
  const stableId = await getCanonicalUserId();
  if (!stableId) return;
  await AsyncStorage.setItem(welcomeSeenKey(stableId), '1').catch(() => {});
}

/**
 * Помечает, что приглашённый получил свои referee-дни (вызывать, когда из облака
 * пришёл признак reward). Гасит будущие показы приветствия. Идемпотентно.
 */
export async function markRefereeWelcomeRewarded(): Promise<void> {
  const stableId = await getCanonicalUserId();
  if (!stableId) return;
  await AsyncStorage.setItem(refereeRewardedKey(stableId), '1').catch(() => {});
}

/* expo-router route shim: keeps utility module from warning when discovered as route */
export default function __RouteShim() { return null; }
