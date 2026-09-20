/**
 * Экономика подсказок «Как ответить» в диалоге: 3 в день бесплатно, дальше
 * 80 рун за показ.
 *
 * зачем (владелец, 2026-09-17, экран 4 макета docs/design/runes/MAKET.html):
 * руны покупают ЯЗЫК. Готовые ответы — это язык: человек получает две живые
 * реплики уровня своего CEFR, которые можно отправить прямо сейчас.
 *
 * ⚠️ ПЕРЕВОД БЕСПЛАТЕН ВСЕГДА (прямое требование макета). Платные — ТОЛЬКО
 * готовые ответы (`suggestions`). Объяснение «почему так» и перевод остаются
 * открытыми: за понимание чужой речи мы не берём плату, иначе человек просто
 * перестанет открывать шторку и потеряет обучающую часть.
 *
 * ⚠️ ГЕНЕРАЦИИ ПО ТАПУ НЕТ. Подсказки приезжают ВМЕСТЕ с репликой в поле
 * `coach` того же вызова (app/ai_dialog_coach.ts) — они уже загружены. Поэтому
 * покупка не запускает сеть и не может «ждать»: она лишь снимает занавес с
 * готового текста. Никаких «Готовим подсказку…» быть не должно (владелец).
 *
 * Счётчик дня — локальный, по образцу ai_mistake_explain_limit_session.ts:
 * это UX-лимит, а не защита от злоупотреблений. Руны же списываются через
 * общий журнал, поэтому реальная трата остаётся сверяемой.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  isCurrentAccountGeneration,
  withAccountTransitionLock,
  type AccountGenerationToken,
} from './account_generation';
import { DebugLogger } from './debug-logger';
import { dialogueStateStorageKey, resolveDialogueStudyTarget } from './dialogue_language_registry';
import { mergeLevelSpinServerStars, readUnifiedLevelSpinStars } from './level_spin_star_grants';
import { withStorageLock } from './storage_mutex';

/** Цена показа готовых ответов, когда бесплатные кончились. */
export const DIALOG_HINT_PRICE_RUNES = 80;
/** Сколько подсказок в день бесплатно. */
export const FREE_DIALOG_HINTS_PER_DAY = 3;

const DAILY_HINT_KEY = 'ai_dialog_hint_session_v1';

export function dialogHintDailyStorageKey(studyTarget: unknown): string | null {
  return dialogueStateStorageKey(studyTarget, DAILY_HINT_KEY);
}

interface DailyHintState {
  date: string;
  count: number;
}

const todayKey = (): string => new Date().toISOString().split('T')[0];

function parseState(raw: string | null): DailyHintState | null {
  if (!raw) return null;
  try {
    const data = JSON.parse(raw) as DailyHintState;
    return typeof data?.date === 'string' && typeof data?.count === 'number' ? data : null;
  } catch (error) {
    // Немой catch запрещён: битая запись молча вернула бы «бесплатные есть»,
    // и человек получал бы подсказки даром без единого следа.
    DebugLogger.error(
      'ai_dialog_hint_economy:parse',
      error instanceof Error ? error : new Error(String(error)),
      'warning',
    );
    return null;
  }
}

/** Сколько бесплатных подсказок осталось сегодня. */
export async function getDialogHintsLeftToday(studyTarget: unknown): Promise<number> {
  const storageKey = dialogHintDailyStorageKey(studyTarget);
  if (!storageKey) return 0;
  const raw = await AsyncStorage.getItem(storageKey).catch((error: unknown) => {
    DebugLogger.error(
      'ai_dialog_hint_economy:read',
      error instanceof Error ? error : new Error(String(error)),
      'warning',
    );
    return null;
  });
  const data = parseState(raw);
  if (!data || data.date !== todayKey()) return FREE_DIALOG_HINTS_PER_DAY;
  return Math.max(0, FREE_DIALOG_HINTS_PER_DAY - data.count);
}

/** Отметить израсходованную бесплатную подсказку. */
export async function markDialogHintUsed(studyTarget: unknown): Promise<void> {
  const storageKey = dialogHintDailyStorageKey(studyTarget);
  if (!storageKey) return;
  await withStorageLock(async () => {
    const existing = parseState(await AsyncStorage.getItem(storageKey).catch(() => null));
    const today = todayKey();
    const base = existing && existing.date === today ? existing : { date: today, count: 0 };
    await AsyncStorage.setItem(storageKey, JSON.stringify({ date: today, count: base.count + 1 }))
      .catch((error: unknown) => {
        // Счётчик не записался — человек получит лишнюю бесплатную подсказку.
        // Это дешевле, чем отнять уже показанную, но знать об этом надо.
        DebugLogger.error(
          'ai_dialog_hint_economy:write',
          error instanceof Error ? error : new Error(String(error)),
          'warning',
        );
      });
  });
}

export type HintPurchaseResult =
  | { ok: true; balance: number }
  | { ok: false; reason: 'insufficient_runes' | 'identity_changed' | 'invalid_target' };

/**
 * Купить показ готовых ответов за руны.
 *
 * Как и вся экономика рун: решает ТЕЛЕФОН и МГНОВЕННО. Списываем локально,
 * возвращаем ok — шторка раскрывает ответы в том же кадре. Сервер догоняет
 * общей синхронизацией баланса, отдельного вызова тут нет: подсказка не
 * открывает контент навсегда, это разовый показ уже загруженного текста.
 */
export async function buyDialogHintLocally(
  studyTarget: unknown,
  token: AccountGenerationToken,
): Promise<HintPurchaseResult> {
  if (!resolveDialogueStudyTarget(studyTarget)) {
    console.log('[HINT-BUY] denied invalid_target'); // guard-ok: ранний выход обязан логироваться и в релизе
    return { ok: false, reason: 'invalid_target' };
  }
  const ownerStableId = token.stableId?.trim();
  if (!ownerStableId || !isCurrentAccountGeneration(token, ownerStableId)) {
    console.log('[HINT-BUY] denied identity_changed'); // guard-ok: ранний выход обязан логироваться и в релизе
    return { ok: false, reason: 'identity_changed' };
  }

  return withAccountTransitionLock(async () => withStorageLock(async () => {
    if (!isCurrentAccountGeneration(token, ownerStableId)) {
      return { ok: false, reason: 'identity_changed' } as const;
    }
    const { balance } = await readUnifiedLevelSpinStars(token);
    if (balance < DIALOG_HINT_PRICE_RUNES) {
      console.log(`[HINT-BUY] denied insufficient balance=${balance} price=${DIALOG_HINT_PRICE_RUNES}`); // guard-ok: отказ обязан логироваться и в релизе
      return { ok: false, reason: 'insufficient_runes' } as const;
    }
    const balanceAfter = balance - DIALOG_HINT_PRICE_RUNES;
    await mergeLevelSpinServerStars(token, { stars: balanceAfter });
    console.log(`[HINT-BUY] ok balance ${balance}→${balanceAfter}`); // guard-ok: финальный результат обязан логироваться и в релизе
    return { ok: true, balance: balanceAfter } as const;
  }));
}
