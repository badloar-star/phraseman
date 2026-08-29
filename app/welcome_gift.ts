/**
 * welcome_gift.ts — стартовый подарок: +100 жемчужин и +300 рун, СТРОГО один
 * раз на аккаунт.
 *
 * зачем (владелец, 2026-08-26): «модал сразу приветствует юзера и начисляет ему
 * 100 жемчужин просто так и сразу 300 рун тоже просто так… мгновенное
 * начисление, чтобы юзер не видел нулей с самого первого входа», плюс правка
 * тем же днём: «сделай чтобы все получили — и новый юзер, и все старые кто
 * после обновы откроет приложение».
 *
 * ПЕРЕПИСАНО ПОСЛЕ ИНЦИДЕНТА (владелец, 2026-08-26 вечер: «модал появился, но
 * начисление не сработало, вижу нули постоянно»). Аудит нашёл три корня:
 *
 *  1. ДЕВАЙС-глобальные ключи. Старые welcome_gift_state_v1 /
 *     welcome_gift_runes_request_v1 и реестр one-time событий кошелька
 *     (shards_one_time_events) не привязаны к аккаунту. При смене/восстановлении
 *     аккаунта без полной очистки хранилища (вход Apple/Google — класс
 *     project_account_generation_stale_cache_class) новый аккаунт наследовал
 *     чужие маркеры: awardOneTimeVariable отвечал alreadyClaimed=true, подарок
 *     помечался «выдан», НИЧЕГО не начислив. Теперь состояние выдачи и
 *     requestId рун скоупятся по stableId, а жемчужины минуют девайс-глобальный
 *     пре-чек и решаются АККАУНТ-скоупным леджером операций (см. п. про opId).
 *
 *  2. Гонка готовности аккаунта. Выдача стартовала на монтировании хоста —
 *     раньше, чем account_generation становится active на холодном старте;
 *     commitShardCreditOperation молча отвечал stale_account_generation, ретрай
 *     ждал следующего запуска и снова стрелял слишком рано. Теперь выдача ЖДЁТ
 *     waitForActiveAccountGeneration (до 15с, не блокируя ничего вокруг).
 *
 *  3. Молчаливые отказы. Ни один отказ жемчужин не логировался — часы поиска
 *     вслепую. Теперь каждый отказ пишет причину в DebugLogger.
 *
 * Архитектура выдачи (без новых писателей валют):
 *  - ЖЕМЧУЖИНЫ клиентски-авторитетны: awardOneTimePerAccount (shards_system) —
 *    ТОТ ЖЕ детерминированный operationId, что строил awardOneTimeVariable
 *    (`one-time:` + sha256('welcome_gift:welcome_gift_v1')[0..40]), но БЕЗ
 *    девайс-глобального пре-чека: аккаунты, уже получившие подарок старым
 *    путём, получают от леджера already-applied, а не второй кредит. Леджер
 *    скоупится по stableId и мержится между устройствами одного аккаунта по
 *    operationId (ECONOMY_CONSTITUTION §4-5) — «строго 1 раз на аккаунт»
 *    держится им, а не девайс-локальным списком.
 *  - РУНЫ авторитетен сервер: callable welcomeGiftClaim (stars_ledger, opId
 *    `welcome_gift:{uid}`, claim-док reward_claims/welcome_gift). Ответ
 *    мерджится в локальную проекцию (mergeLevelSpinServerStars).
 *
 * Семантика «все получили»: отсутствие per-account состояния = аккаунту ещё не
 * выдавали → выдать. Деньги НЕ зависят от модалки/флагов показа — модалка
 * только празднует. Старый девайс-глобальный state_v1 игнорируется и
 * подчищается: для того же аккаунта леджер/сервер ответят already-applied
 * (двойного кредита не будет), для другого — честно выдадут его подарок.
 *
 * Firebase-экономия: один callable на аккаунт за всю жизнь (плюс ретраи при
 * отказе сети), никаких чтений Firestore с клиента.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getApp } from '@react-native-firebase/app';
import { getFunctions, httpsCallable } from '@react-native-firebase/functions';

import {
  isCurrentAccountGeneration,
  waitForActiveAccountGeneration,
  type AccountGenerationToken,
} from './account_generation';
import { CLOUD_SYNC_ENABLED, IS_EXPO_GO } from './config';
import { initFirebaseAppCheckIfAvailable } from './app_check_init';
import { mergeLevelSpinServerStars } from './level_spin_star_grants';
import { awardOneTimePerAccount } from './shards_system';
import { getRemoteBool } from './remote_flags';
import { DebugLogger } from './debug-logger';

const REGION = 'us-central1';

/** Суммы подарка. Серверная константа обязана совпадать —
 * сторожит tests/welcome_gift_contract.test.ts. */
export const WELCOME_GIFT_PEARLS = 100;
export const WELCOME_GIFT_RUNES = 300;

/**
 * Семя идемпотентности жемчужин.
 *
 * ⚠️ СТРОГО 1 РАЗ НА АККАУНТ (владелец: «зафиксируй жёстко»): значение НИКОГДА
 * не зависит от deviceId/времени/случайности. Из него детерминированно
 * строится operationId (`one-time:` + sha256('welcome_gift:welcome_gift_v1')),
 * ИДЕНТИЧНЫЙ прежнему пути через awardOneTimeVariable — уже выданные аккаунты
 * получат already-applied от леджера. Ключ выдачи — operationId в
 * аккаунт-скоупном леджере, а НЕ девайс-глобальный shards_one_time_events
 * (тот наследуется чужим аккаунтом при restore-входе и давал ложный
 * alreadyClaimed — корень инцидента 2026-08-26).
 */
export const WELCOME_GIFT_PEARLS_EVENT_KEY = 'welcome_gift_v1';

/** Девайс-глобальный ключ прежней версии — только для подчистки при миграции. */
const LEGACY_STATE_KEY = 'welcome_gift_state_v1';
const LEGACY_RUNES_REQUEST_KEY = 'welcome_gift_runes_request_v1';

/** Состояние выдачи ТЕКУЩЕГО аккаунта. Ключа нет = этому аккаунту не выдавали. */
function stateKeyFor(stableId: string): string {
  return `welcome_gift_state_v2:${encodeURIComponent(stableId)}`;
}

function runesRequestKeyFor(stableId: string): string {
  return `welcome_gift_runes_request_v2:${encodeURIComponent(stableId)}`;
}

type PartState = 'pending' | 'done';
type WelcomeGiftState = Readonly<{ pearls: PartState; runes: PartState }>;

const FRESH_STATE: WelcomeGiftState = Object.freeze({ pearls: 'pending', runes: 'pending' });

function parseState(raw: string | null): WelcomeGiftState {
  // Отсутствие или порча ключа = «не выдано»: повторная попытка безопасна,
  // идемпотентность живёт уровнем ниже (operationId леджера / серверный opId).
  if (!raw) return FRESH_STATE;
  try {
    const parsed = JSON.parse(raw) as { pearls?: unknown; runes?: unknown };
    const part = (v: unknown): PartState => (v === 'done' ? 'done' : 'pending');
    return Object.freeze({ pearls: part(parsed?.pearls), runes: part(parsed?.runes) });
  } catch {
    return FRESH_STATE;
  }
}

async function readState(stableId: string): Promise<WelcomeGiftState> {
  return parseState(await AsyncStorage.getItem(stateKeyFor(stableId)).catch(() => null));
}

async function writeState(stableId: string, state: WelcomeGiftState): Promise<void> {
  await AsyncStorage.setItem(stateKeyFor(stableId), JSON.stringify(state)).catch(() => {});
}

function makeRequestId(): string {
  const now = Date.now().toString(36);
  const rand = Math.random().toString(36).slice(2, 10);
  return `wg_${now}_${rand}`;
}

async function getOrCreateRunesRequestId(stableId: string): Promise<string> {
  const key = runesRequestKeyFor(stableId);
  const existing = await AsyncStorage.getItem(key).catch(() => null);
  if (existing && /^[A-Za-z0-9_-]{12,96}$/.test(existing)) return existing;
  const id = makeRequestId();
  await AsyncStorage.setItem(key, id).catch(() => {});
  return id;
}

type WelcomeGiftClaimWire = Readonly<{
  ok?: boolean;
  alreadyClaimed?: unknown;
  starsGranted?: unknown;
  stars?: unknown;
  starsEarnedTotal?: unknown;
  starsSeq?: unknown;
}>;

/**
 * Жемчужины: мгновенный локальный кредит через аккаунт-скоупный леджер.
 * true = выдано этому аккаунту (сейчас или раньше, на этом или другом девайсе).
 */
async function grantPearlsLocal(token: AccountGenerationToken): Promise<boolean> {
  try {
    // awardOneTimePerAccount: тот же детерминированный operationId, что строил
    // прежний awardOneTimeVariable (аккаунты, выданные старым путём, получат
    // already-applied вместо второго кредита), но БЕЗ девайс-глобального
    // пре-чека, который и был корнем инцидента. Маркер в реестр пишется внутри.
    const result = await awardOneTimePerAccount(
      WELCOME_GIFT_PEARLS_EVENT_KEY,
      WELCOME_GIFT_PEARLS,
      'welcome_gift',
      token,
    );
    if (result.awarded > 0 || result.alreadyClaimed) return true;
    // зачем: молчаливый отказ уже стоил часов поиска — причина обязана быть в
    // логе. Детальную причину пишет сам awardOneTimePerAccount.
    DebugLogger.error('welcome_gift:pearls', new Error('grant_refused'), 'warning');
    return false;
  } catch (error) {
    DebugLogger.error('welcome_gift:pearls', error, 'warning');
    return false;
  }
}

/** Руны: серверный грант + мердж авторитетного баланса. true = выдано аккаунту. */
async function claimRunesFromServer(token: AccountGenerationToken, stableId: string): Promise<boolean> {
  if (IS_EXPO_GO || !CLOUD_SYNC_ENABLED) return false;
  try {
    await initFirebaseAppCheckIfAvailable().catch(() => {});
    const requestId = await getOrCreateRunesRequestId(stableId);
    if (!isCurrentAccountGeneration(token, stableId)) return false;
    const fn = httpsCallable<{ stableId: string; requestId: string }, WelcomeGiftClaimWire>(
      getFunctions(getApp(), REGION),
      'welcomeGiftClaim',
    );
    const res = await fn({ stableId, requestId });
    if (!isCurrentAccountGeneration(token, stableId)) return false;
    const data = res.data;
    const stars = Number(data?.stars);
    const earned = Number(data?.starsEarnedTotal);
    const seq = Number(data?.starsSeq);
    await mergeLevelSpinServerStars(token, {
      ...(Number.isFinite(stars) ? { stars: Math.max(0, Math.trunc(stars)) } : {}),
      ...(Number.isFinite(earned) ? { starsEarnedTotal: Math.max(0, Math.trunc(earned)) } : {}),
      ...(Number.isSafeInteger(seq) && seq >= 0 ? { starsSeq: seq } : {}),
    });
    await AsyncStorage.removeItem(runesRequestKeyFor(stableId)).catch(() => {});
    return true;
  } catch (error) {
    const text = String((error as { code?: unknown })?.code ?? '')
      + ' ' + String((error as { message?: unknown })?.message ?? error ?? '');
    // Сервер уже выдавал этому аккаунту (ответ первого вызова потерялся) —
    // выдача состоялась, повторять нельзя; баланс догонит обычный пулл.
    if (text.toLowerCase().includes('claimed') || text.toLowerCase().includes('already-exists')) {
      await AsyncStorage.removeItem(runesRequestKeyFor(stableId)).catch(() => {});
      return true;
    }
    DebugLogger.error('welcome_gift:claimRunes', error, 'warning');
    return false;
  }
}

// Однопроцессный замок: несколько триггеров (монтирование хоста, событие
// PENDING, повторный запуск) не гонятся друг с другом за AsyncStorage.
let inFlight: Promise<void> | null = null;

async function runPendingParts(): Promise<void> {
  // Рубильник из админки гасит и модалку, и подарок разом (решение владельца).
  if (!getRemoteBool('onboarding_welcome_sheet_enabled')) return;

  // зачем: корень №2 инцидента — выдача стартовала до готовности аккаунта и
  // молча падала в stale_account_generation. Ждём активную генерацию (не
  // блокируя ничего: вызов fire-and-forget); не дождались — ретрай при
  // следующем триггере/запуске.
  const token = await waitForActiveAccountGeneration(15_000);
  const stableId = token?.stableId?.trim();
  if (!token || !stableId) {
    // Глобальный хост легально живёт и без готового аккаунта. Это не сбой:
    // подписка хоста повторит выдачу при следующей active-генерации.
    DebugLogger.info('welcome_gift:run', 'account_not_active_in_15s');
    return;
  }

  // Миграция: девайс-глобальные ключи прежней версии больше не читаются —
  // только подчищаются. Чей бы аккаунт их ни записал, правду про ТЕКУЩИЙ
  // аккаунт знают леджер (жемчужины) и сервер (руны) — им и решать.
  void AsyncStorage.multiRemove([LEGACY_STATE_KEY, LEGACY_RUNES_REQUEST_KEY]).catch(() => {});

  const state = await readState(stableId);
  if (state.pearls === 'done' && state.runes === 'done') return;
  if (!isCurrentAccountGeneration(token, stableId)) return;

  let next = state;
  if (next.pearls === 'pending' && await grantPearlsLocal(token)) {
    next = { ...next, pearls: 'done' };
    await writeState(stableId, next);
  }
  if (!isCurrentAccountGeneration(token, stableId)) return;
  if (next.runes === 'pending' && await claimRunesFromServer(token, stableId)) {
    next = { ...next, runes: 'done' };
    await writeState(stableId, next);
  }
}

function runExclusive(): Promise<void> {
  if (inFlight) return inFlight;
  inFlight = runPendingParts()
    .catch((error) => DebugLogger.error('welcome_gift:run', error, 'warning'))
    .finally(() => { inFlight = null; });
  return inFlight;
}

/**
 * Гарантировать выдачу подарка текущему аккаунту. Идемпотентна и безопасна при
 * повторных вызовах; НЕ зависит от модалки/CTA/флагов показа — деньги первичны,
 * модалка только празднует. Хост зовёт при каждом монтировании и по событию
 * onboarding_welcome_pending_raised; аккаунту без выданного подарка выдаёт,
 * остальным стоит одно чтение AsyncStorage.
 */
export async function ensureWelcomeGiftGranted(): Promise<void> {
  await runExclusive();
}

/** @deprecated Совместимость с хостом/тестами: то же, что ensureWelcomeGiftGranted. */
export async function beginWelcomeGiftGrant(): Promise<void> {
  await runExclusive();
}

/** @deprecated Совместимость с хостом/тестами: то же, что ensureWelcomeGiftGranted. */
export async function resumeWelcomeGiftIfPending(): Promise<void> {
  await runExclusive();
}

/* expo-router route shim */
export default function __RouteShim() { return null; }
