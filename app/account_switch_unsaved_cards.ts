/**
 * Account V2, Пакет 8L — подтверждение «Сменить без сохранения», когда карточки не выгружены.
 *
 * зачем (решение координатора §85): после 8J/8K запертые ключи карточек (ошибка чтения
 * страниц) и упёршаяся в потолок выгрузка страниц делают forceSyncToCloud = false.
 * «Сменить без сохранения» в таком состоянии стирает с телефона карточки, которых нет
 * в облаке. Человек должен увидеть это ДО стирания и получить выбор: ещё раз сохранить
 * или сменить без сохранения.
 *
 * Решение — чистая функция (тестируется без экрана); чтение сигналов — отдельная обёртка.
 * Логи: префикс [ACC-MUT], без uid и без содержимого карточек.
 */
import { readFlashcardPagesWriteLocks } from './flashcard_pages_read_result';
import {
  FLASHCARD_CLOUD_KEYS,
  peekLastForceFlashcardFailure,
  type ForceFlashcardFailureRecord,
} from './flashcards_cloud_upload';

export type UnsavedCardsReason = 'pages_locked' | 'pages_timeout';

export type AccountSwitchWithoutSaveDecision =
  | Readonly<{ kind: 'switch_now' }>
  | Readonly<{ kind: 'confirm_unsaved_cards'; reason: UnsavedCardsReason }>;

export type AccountSwitchWithoutSaveInput = Readonly<{
  /** Сколько ключей карточек сейчас под замком 8J. */
  lockedFlashcardKeyCount: number;
  /** Последний отказ выгрузки карточек в принудительной синхронизации. */
  lastForceFailure: ForceFlashcardFailureRecord | null;
  /** Начало текущей попытки смены: отказы раньше этого момента не считаются. */
  attemptStartedAtMs: number;
}>;

export function decideAccountSwitchWithoutSaveConfirm(
  input: AccountSwitchWithoutSaveInput,
): AccountSwitchWithoutSaveDecision {
  if (input.lockedFlashcardKeyCount > 0) return { kind: 'confirm_unsaved_cards', reason: 'pages_locked' };
  const failure = input.lastForceFailure;
  if (
    failure
    && failure.atMs >= input.attemptStartedAtMs
    && (failure.reason === 'pages_locked' || failure.reason === 'pages_timeout')
  ) {
    return { kind: 'confirm_unsaved_cards', reason: failure.reason };
  }
  return { kind: 'switch_now' };
}

/**
 * Собрать сигналы и принять решение. Ошибка чтения замков — не «замков нет»:
 * при сбое спрашиваем (безопасная сторона), причину пишем в лог.
 */
export async function readAccountSwitchUnsavedCardsDecision(
  attemptStartedAtMs: number,
): Promise<AccountSwitchWithoutSaveDecision> {
  let lockedFlashcardKeyCount = 0;
  try {
    const locked = await readFlashcardPagesWriteLocks(FLASHCARD_CLOUD_KEYS.map(([key]) => key));
    lockedFlashcardKeyCount = locked.size;
  } catch (error: unknown) {
    console.warn(`[ACC-MUT] unsaved_cards locks_read_failed kind=${error instanceof Error ? error.name : typeof error} result=confirm`);
    return { kind: 'confirm_unsaved_cards', reason: 'pages_locked' };
  }
  const lastForceFailure = peekLastForceFlashcardFailure();
  const decision = decideAccountSwitchWithoutSaveConfirm({ lockedFlashcardKeyCount, lastForceFailure, attemptStartedAtMs });
  console.log(`[ACC-MUT] unsaved_cards decision=${decision.kind} locked_keys=${lockedFlashcardKeyCount}`
    + ` last_force_failure=${lastForceFailure ? lastForceFailure.reason : 'none'}`
    + ` fresh=${lastForceFailure ? lastForceFailure.atMs >= attemptStartedAtMs : 'n/a'}`);
  return decision;
}

/* expo-router route shim: keeps utility module from warning when discovered as route */
export default function __RouteShim() { return null; }
