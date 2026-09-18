import AsyncStorage from '@react-native-async-storage/async-storage';
import { FREE_AI_MISTAKE_EXPLAINS_PER_DAY_DEFAULT } from './ai_mistake_explain_flags';
import {
  isCurrentAccountGeneration,
  withAccountTransitionLock,
  type AccountGenerationToken,
} from './account_generation';
import { DebugLogger } from './debug-logger';
import { mergeLevelSpinServerStars, readUnifiedLevelSpinStars } from './level_spin_star_grants';
import { withStorageLock } from './storage_mutex';

export { FREE_AI_MISTAKE_EXPLAINS_PER_DAY_DEFAULT };

/**
 * Цена разбора промаха, когда три бесплатных за день кончились.
 *
 * зачем (владелец, 2026-09-17, экран 5 макета docs/design/runes/MAKET.html):
 * руны покупают ЯЗЫК. Разбор собственной ошибки — самое ценное объяснение,
 * какое приложение вообще даёт: оно про ЕГО промах, а не про абстрактное
 * правило.
 *
 * ⚠️ САМ РАЗБОР НЕ ТРОГАЕМ (прямое требование владельца: «они уже идеальны»).
 * Здесь только экономика: где именно списываются руны.
 *
 * Счётчик ЕДИНЫЙ на все экраны — уроки, диалоги, «Мои ошибки» (решение
 * владельца 2026-09-17). Отдельные счётчики дали бы 9 бесплатных разборов
 * вместо трёх и сделали бы лимит бессмысленным.
 */
export const MISTAKE_EXPLAIN_PRICE_RUNES = 120;

export type MistakeExplainPurchaseResult =
  | { ok: true; balance: number }
  | { ok: false; reason: 'insufficient_runes' | 'identity_changed' };

/**
 * Купить разбор за руны. Как и вся экономика рун: решает ТЕЛЕФОН и мгновенно —
 * списали и показываем. Сети в самой покупке нет; за разбором экран ходит той
 * же дорогой, что и раньше.
 */
export async function buyMistakeExplainLocally(
  token: AccountGenerationToken,
): Promise<MistakeExplainPurchaseResult> {
  const ownerStableId = token.stableId?.trim();
  if (!ownerStableId || !isCurrentAccountGeneration(token, ownerStableId)) {
    DebugLogger.info('[MISTAKE-BUY] denied', 'identity_changed');
    return { ok: false, reason: 'identity_changed' };
  }
  return withAccountTransitionLock(async () => withStorageLock(async () => {
    if (!isCurrentAccountGeneration(token, ownerStableId)) {
      return { ok: false, reason: 'identity_changed' } as const;
    }
    const { balance } = await readUnifiedLevelSpinStars(token);
    if (balance < MISTAKE_EXPLAIN_PRICE_RUNES) {
      DebugLogger.info('[MISTAKE-BUY] denied', `insufficient balance=${balance} price=${MISTAKE_EXPLAIN_PRICE_RUNES}`);
      return { ok: false, reason: 'insufficient_runes' } as const;
    }
    const balanceAfter = balance - MISTAKE_EXPLAIN_PRICE_RUNES;
    await mergeLevelSpinServerStars(token, { stars: balanceAfter });
    DebugLogger.info('[MISTAKE-BUY] ok', `balance ${balance}→${balanceAfter}`);
    return { ok: true, balance: balanceAfter } as const;
  }));
}

export const DAILY_AI_MISTAKE_EXPLAIN_KEY = 'ai_mistake_explain_session_v1';
export const DAILY_AI_MISTAKE_LIMIT_NOTICE_KEY = 'ai_mistake_limit_notice_shown_v1';

interface DailyMistakeExplainState {
  date: string;
  count: number;
}

const todayKey = (): string => new Date().toISOString().split('T')[0];
let limitNoticeShownDayMemory: string | null = null;

function parseState(raw: string | null): DailyMistakeExplainState | null {
  if (!raw) return null;
  try {
    const data = JSON.parse(raw) as DailyMistakeExplainState;
    return typeof data?.date === 'string' && typeof data?.count === 'number' ? data : null;
  } catch (error) {
    // Немой catch запрещён: битая запись молча вернула бы «бесплатные есть»,
    // и разборы уходили бы даром без единого следа. Теперь у денег есть журнал.
    DebugLogger.error(
      'ai_mistake_explain_limit_session:parse',
      error instanceof Error ? error : new Error(String(error)),
      'warning',
    );
    return null;
  }
}

export async function getAiMistakeExplainsLeftToday(): Promise<number> {
  try {
    const data = parseState(await AsyncStorage.getItem(DAILY_AI_MISTAKE_EXPLAIN_KEY));
    if (!data || data.date !== todayKey()) return FREE_AI_MISTAKE_EXPLAINS_PER_DAY_DEFAULT;
    return Math.max(0, FREE_AI_MISTAKE_EXPLAINS_PER_DAY_DEFAULT - data.count);
  } catch (error) {
    // Сбой чтения трактуем в пользу человека (даём бесплатные), но пишем в лог:
    // иначе «почему разборы бесплатны у всех» осталось бы без следа.
    DebugLogger.error(
      'ai_mistake_explain_limit_session:left_today',
      error instanceof Error ? error : new Error(String(error)),
      'warning',
    );
    return FREE_AI_MISTAKE_EXPLAINS_PER_DAY_DEFAULT;
  }
}

export async function markAiMistakeExplainUsed(): Promise<void> {
  try {
    const existing = parseState(await AsyncStorage.getItem(DAILY_AI_MISTAKE_EXPLAIN_KEY));
    const data = existing && existing.date === todayKey() ? existing : { date: todayKey(), count: 0 };
    await AsyncStorage.setItem(
      DAILY_AI_MISTAKE_EXPLAIN_KEY,
      JSON.stringify({ date: data.date, count: data.count + 1 }),
    );
  } catch (e) {
      DebugLogger.error('ai_mistake_explain_limit_session:data', e instanceof Error ? e : new Error(String(e)), 'warning');
    }
}

export function peekAiMistakeLimitNoticeShownToday(): boolean {
  return limitNoticeShownDayMemory === todayKey();
}

export async function hasShownAiMistakeLimitNoticeToday(): Promise<boolean> {
  const today = todayKey();
  if (limitNoticeShownDayMemory === today) return true;
  try {
    const storedDay = await AsyncStorage.getItem(DAILY_AI_MISTAKE_LIMIT_NOTICE_KEY);
    const shown = storedDay === today;
    if (shown) limitNoticeShownDayMemory = today;
    return shown;
  } catch {
    return false;
  }
}

export async function markAiMistakeLimitNoticeShownToday(): Promise<void> {
  const today = todayKey();
  limitNoticeShownDayMemory = today;
  try {
    await AsyncStorage.setItem(DAILY_AI_MISTAKE_LIMIT_NOTICE_KEY, today);
  } catch (e) {
      DebugLogger.error('ai_mistake_explain_limit_session:today', e instanceof Error ? e : new Error(String(e)), 'warning');
    }
}

export function __resetAiMistakeLimitNoticeMemoryForTests(): void {
  limitNoticeShownDayMemory = null;
}
