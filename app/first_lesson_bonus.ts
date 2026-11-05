/**
 * Бонус новичку: +500 монет за ПЕРВОЕ завершённое занятие (владелец 30.10; цену ранга 1000 и награды за задания не менять).
 *
 * зачем: по расчёту заработка (≈45 монет за занятие) ранг 1 приходил за 20+ занятий — владелец решил дать новичку стартовый бонус.
 * Правила: только «новый» по локальной когорте (use rank_gates_new_user: неизвестный/старый не получает; после восстановления с прогрессом — «старый»);
 * ОДНОРАЗОВО — флаг на устройстве + идемпотентный ключ операции (повтор того же ключа сервер и локальный кошелёк схлопывают); начисление мгновенно на
 * телефоне через существующий путь монет (enqueueLevelSpinStarGrant, источник dailyjourney_ — уже в белом списке сервера, номинал stars_500 разрешён) —
 * новых серверных функций и деплоя не нужно; за флагом Пульта rank_gates_enabled. Лог: [RANK-GATE] first_lesson_bonus.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { RankGateUserVerdict } from './rank_gates_new_user';
import { isDevForceNewbie } from './dev_force_newbie';

export const FIRST_LESSON_BONUS_COINS = 500;
export const FIRST_LESSON_BONUS_GIFT_ID = 'stars_500';
// зачем (координатор 04.11, Ревизор): флаг был ОБЩИМ на устройство и вне списка стирания — после выхода второй новый аккаунт на том же телефоне бонус не получал.
// Теперь флаг на владельца и в стираемом семействе story_events_v1: (чистится вместе с остальным при выходе/удалении). Сервер идемпотентен по владельцу — дубля не будет.
export const FIRST_LESSON_BONUS_FLAG_KEY_PREFIX = 'story_events_v1:first_lesson_bonus_granted';
export const firstLessonBonusFlagKey = (owner: string): string => `${FIRST_LESSON_BONUS_FLAG_KEY_PREFIX}:${owner}`;

export type FirstLessonBonusDecision =
  | Readonly<{ grant: true }>
  | Readonly<{ grant: false; reason: 'flag_off' | 'not_new' | 'unknown' | 'already_granted' }>;

/** Чистое решение. verdict null = ещё не определён (неизвестный → не получает). */
export function decideFirstLessonBonus(input: Readonly<{ gatesEnabled: boolean; verdict: RankGateUserVerdict | null; alreadyGranted: boolean }>): FirstLessonBonusDecision {
  if (!input.gatesEnabled) return { grant: false, reason: 'flag_off' };
  if (!input.verdict) return { grant: false, reason: 'unknown' };
  if (!input.verdict.isNew) return { grant: false, reason: 'not_new' };
  if (input.alreadyGranted) return { grant: false, reason: 'already_granted' };
  return { grant: true };
}

/** Ключ операции: один на владельца навсегда (sha256 владельца → 32 символа), форма dailyjourney_<32>_<n> из белого списка сервера. */
export async function firstLessonBonusRequestId(ownerStableId: string, sha256Hex: (input: string) => Promise<string>): Promise<string> {
  const hash = await sha256Hex(`rank-first-lesson-bonus.v1|${ownerStableId}`);
  return `dailyjourney_${hash.slice(0, 32)}_1`;
}

export type FirstLessonBonusDeps = Readonly<{
  gatesEnabled: () => boolean;
  verdict: () => Promise<RankGateUserVerdict>;
  ownerStableId: () => Promise<string | null>;
  sha256Hex: (input: string) => Promise<string>;
  grant: (request: Readonly<{ requestId: string; giftId: string }>) => Promise<void>;
  readFlag: (owner: string) => Promise<boolean>;
  writeFlag: (owner: string) => Promise<void>;
  onGranted?: (coins: number) => void;
}>;

let inFlight: Promise<boolean> | null = null;
let recentGrant: { coins: number; atMs: number } | null = null;
const RECENT_GRANT_WINDOW_MS = 10 * 60 * 1000;

/** Выдан ли бонус только что (для экрана результата, открывшегося после начисления). */
export function peekFirstLessonBonusRecentCoins(nowMs: number = Date.now()): number | null {
  return recentGrant && nowMs - recentGrant.atMs < RECENT_GRANT_WINDOW_MS ? recentGrant.coins : null;
}

/** Выдать бонус, если положен. true — выдан сейчас. Ошибка начисления → флаг НЕ ставится (откат: следующее завершение занятия повторит, ключ тот же). */
export function maybeGrantFirstLessonBonus(deps: FirstLessonBonusDeps): Promise<boolean> {
  if (inFlight) return inFlight; // защита от двойного вызова
  inFlight = (async () => {
    try {
      // зачем: владелец определяется ПЕРВЫМ — флаг «выдан» читается и пишется по нему (а не общий на телефон)
      const owner = await deps.ownerStableId();
      if (!owner) {
        console.warn('[RANK-GATE] first_lesson_bonus skip', JSON.stringify({ reason: 'no_owner' })); // guard-ok: ранний выход с причиной
        return false;
      }
      // зачем (Сверка 06.11, dev-ключ «новичок» на боевом аккаунте): монеты +500 при ключе НЕ выдаём — иначе они ушли бы на настоящий аккаунт владельца.
      if (await isDevForceNewbie()) {
        console.warn('[NEWBIE-SIM] first_lesson_bonus skip', JSON.stringify({ reason: 'dev_force_newbie_no_real_coins' })); // guard-ok: ранний выход с причиной
        return false;
      }
      const [verdict, alreadyGranted] = await Promise.all([deps.verdict(), deps.readFlag(owner)]);
      const decision = decideFirstLessonBonus({ gatesEnabled: deps.gatesEnabled(), verdict, alreadyGranted });
      if (!decision.grant) {
        console.log('[RANK-GATE] first_lesson_bonus skip', JSON.stringify({ reason: decision.reason })); // guard-ok: ранний выход с причиной
        return false;
      }
      const requestId = await firstLessonBonusRequestId(owner, deps.sha256Hex);
      await deps.grant({ requestId, giftId: FIRST_LESSON_BONUS_GIFT_ID });
      await deps.writeFlag(owner); // зачем: флаг тому владельцу, кому начислили, даже если аккаунт сменился во время await
      console.log('[RANK-GATE] first_lesson_bonus granted', JSON.stringify({ coins: FIRST_LESSON_BONUS_COINS })); // guard-ok: разовое событие
      deps.onGranted?.(FIRST_LESSON_BONUS_COINS);
      return true;
    } catch (error) {
      console.warn('[RANK-GATE] first_lesson_bonus failed — флаг не ставим, повтор при следующем завершении', error instanceof Error ? error.message : String(error)); // guard-ok: catch с причиной
      return false;
    } finally {
      inFlight = null;
    }
  })();
  return inFlight;
}

const listeners = new Set<(coins: number) => void>();
/** Подтверждение для окна результата занятия: «+500 монет за первое занятие» (текст — через Переводчика). */
export function subscribeFirstLessonBonus(listener: (coins: number) => void): () => void {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
}

/** Боевые зависимости (ленивые импорты — модуль остаётся лёгким для тестов). */
export function defaultFirstLessonBonusDeps(readFlagOn: () => boolean): FirstLessonBonusDeps {
  return {
    gatesEnabled: readFlagOn,
    verdict: async () => (await import('./rank_gates_new_user')).readRankGateUserVerdict(),
    ownerStableId: async () => {
      const { captureAccountGeneration } = await import('./account_generation');
      const token = captureAccountGeneration();
      return token.phase === 'active' && token.stableId ? token.stableId : null;
    },
    sha256Hex: async (input) => {
      const Crypto = await import('expo-crypto');
      return Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, input);
    },
    grant: async ({ requestId, giftId }) => {
      const [{ captureAccountGeneration }, { enqueueLevelSpinStarGrant }] = await Promise.all([import('./account_generation'), import('./level_spin_star_grants')]);
      await enqueueLevelSpinStarGrant({ token: captureAccountGeneration(), requestId, lane: 'base', giftId, promotionEligibility: 'gameplay' });
    },
    readFlag: async (owner) => (await AsyncStorage.getItem(firstLessonBonusFlagKey(owner))) === '1',
    writeFlag: async (owner) => { await AsyncStorage.setItem(firstLessonBonusFlagKey(owner), '1'); },
    onGranted: (coins) => { recentGrant = { coins, atMs: Date.now() }; listeners.forEach((l) => l(coins)); },
  };
}
