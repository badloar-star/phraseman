/*
 * Перенос Plus при смене аккаунта — «удержание» локального Plus (AA S2d 🔴1, §127, вариант B).
 *
 * зачем: Plus куплен в сторе этого устройства (Apple ID / Google), а в RevenueCat
 * он висит на appUserID ПРЕЖНЕГО аккаунта. После любой смены аккаунта RevenueCat
 * переносит покупку только по «Восстановить покупки» — до этого человек видел
 * «оплата на одном аккаунте, а на другом нет», а экран Plus мигал «нет / есть».
 * Решение (вариант B, Fable): после смены — тихое восстановление покупок
 * (plus_transfer.ts) с повтором на старте/возврате из фона, а ПОКА ответа нет,
 * прежний Plus держится локально. Откат — только при ПОДТВЕРЖДЁННОМ отсутствии.
 *
 * Модуль намеренно лёгкий (только AsyncStorage + трассировка): его читает
 * premium_guard на каждом решении доступа, поэтому здесь нет RevenueCat и сети.
 *
 * Удержание — НЕ запись премиума в хранилище аккаунта: ключи premium_* нового
 * аккаунта не трогаются. Откат = удалить удержание (ничего «чужого» не остаётся).
 * Ключ лежит вне инвентаря аккаунта (его не стирает wipe) и пишется ПОСЛЕ смены.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { isDevPlusTransferNotice } from './dev_account_state';
import { identityErrorCode, identityTag, identityTrace } from './identity_trace';

export const PLUS_TRANSFER_HOLD_KEY = 'plus_transfer_hold_v1';
/** Паритет с RC_STALE_GRACE_MS (premium_guard): столько же длится локальное доверие к Plus без ответа RC. */
export const PLUS_TRANSFER_HOLD_TTL_MS = 72 * 60 * 60 * 1000;
/** Свидетельство Plus старого аккаунта годится для переноса, только если оно свежее. */
const EVIDENCE_MAX_AGE_MS = 24 * 60 * 60 * 1000;

export type PlusTransferSwitchReason = 'stable_id_set' | 'stable_id_cleared';

export type PlusTransferHold = Readonly<{
  v: 1;
  /** stable_id нового аккаунта; null — выход в свежий профиль, привязывается при первой проверке. */
  target: string | null;
  reason: PlusTransferSwitchReason;
  /** Был ли у прежнего аккаунта подтверждённый store-Plus (тогда держим его локально). */
  heldPlus: boolean;
  plan: string | null;
  createdAt: number;
  until: number;
  attempts: number;
  lastAttemptAt: number;
}>;

type StorePlusEvidence = Readonly<{ stableId: string; active: boolean; plan: string | null; at: number }>;

let lastStorePlusEvidence: StorePlusEvidence | null = null;
let holdMemory: PlusTransferHold | null | undefined;
let holdLoad: Promise<PlusTransferHold | null> | null = null;

/**
 * premium_guard сообщает РЕАЛЬНОЕ (из хранилища, без удержания) решение по
 * store-Plus текущего аккаунта. Только память: ноль операций ввода-вывода.
 */
export function notePlusStoreAccessEvidence(stableId: string | null, active: boolean, plan: string | null): void {
  if (!stableId) return;
  lastStorePlusEvidence = { stableId, active, plan, at: Date.now() };
}

/** Есть ли у ТЕКУЩЕГО аккаунта подтверждённый store-Plus (по последнему решению premium_guard). */
export function hasFreshStorePlusEvidenceFor(stableId: string | null): boolean {
  const evidence = lastStorePlusEvidence;
  return Boolean(
    stableId
    && evidence
    && evidence.stableId === stableId
    && evidence.active
    && Date.now() - evidence.at <= EVIDENCE_MAX_AGE_MS,
  );
}

function parseHold(raw: string | null): PlusTransferHold | null {
  if (!raw) return null;
  try {
    const value = JSON.parse(raw) as Partial<PlusTransferHold>;
    if (value?.v !== 1 || typeof value.until !== 'number' || typeof value.createdAt !== 'number') return null;
    return {
      v: 1,
      target: typeof value.target === 'string' && value.target ? value.target : null,
      reason: value.reason === 'stable_id_cleared' ? 'stable_id_cleared' : 'stable_id_set',
      heldPlus: value.heldPlus === true,
      plan: typeof value.plan === 'string' ? value.plan : null,
      createdAt: value.createdAt,
      until: value.until,
      attempts: typeof value.attempts === 'number' ? value.attempts : 0,
      lastAttemptAt: typeof value.lastAttemptAt === 'number' ? value.lastAttemptAt : 0,
    };
  } catch (error) {
    identityTrace('[PLUS-TRANSFER]', 'hold parse_failed', { code: identityErrorCode(error) });
    return null;
  }
}

export async function readPlusTransferHold(): Promise<PlusTransferHold | null> {
  if (holdMemory !== undefined) return holdMemory;
  if (!holdLoad) {
    holdLoad = AsyncStorage.getItem(PLUS_TRANSFER_HOLD_KEY)
      .then((raw) => {
        const parsed = parseHold(raw);
        if (holdMemory === undefined) holdMemory = parsed;
        return holdMemory ?? null;
      })
      .catch((error: unknown) => {
        identityTrace('[PLUS-TRANSFER]', 'hold read_failed', { code: identityErrorCode(error) });
        return null;
      })
      .finally(() => { holdLoad = null; });
  }
  return holdLoad;
}

export async function writePlusTransferHold(hold: PlusTransferHold): Promise<void> {
  holdMemory = hold;
  try {
    await AsyncStorage.setItem(PLUS_TRANSFER_HOLD_KEY, JSON.stringify(hold));
  } catch (error) {
    // Память уже держит удержание на эту сессию; следующий старт просто не повторит проверку.
    identityTrace('[PLUS-TRANSFER]', 'hold write_failed', { code: identityErrorCode(error) }, { persist: true });
  }
}

export async function clearPlusTransferHold(reason: string): Promise<void> {
  const previous = holdMemory ?? null;
  holdMemory = null;
  identityTrace('[PLUS-TRANSFER]', 'hold cleared', {
    reason,
    target: identityTag(previous?.target ?? null),
    heldPlus: previous?.heldPlus ?? null,
  });
  try {
    await AsyncStorage.removeItem(PLUS_TRANSFER_HOLD_KEY);
  } catch (error) {
    identityTrace('[PLUS-TRANSFER]', 'hold remove_failed', { reason, code: identityErrorCode(error) }, { persist: true });
  }
}

/**
 * Смена аккаунта (вызывается из слушателя смены stable_id). Синхронно ставит
 * удержание в память — premium_guard увидит его ДО первого решения по новому
 * аккаунту (иначе Plus мигнул бы «нет» до ответа RevenueCat) — и пишет на диск.
 */
export function beginPlusTransferHold(
  previousStableId: string | null,
  nextStableId: string | null,
  reason: PlusTransferSwitchReason,
): PlusTransferHold {
  const now = Date.now();
  // зачем (AA S2d раунд 2, M-S2d-1): держим Plus только при свапе на КОНКРЕТНЫЙ
  // аккаунт. «Сменить аккаунт» (clear) ведёт в свежий профиль, куда потом может
  // войти кто угодно — Plus туда не переносим без ответа RevenueCat.
  const heldPlus = reason === 'stable_id_set'
    && nextStableId !== null
    && hasFreshStorePlusEvidenceFor(previousStableId);
  const hold: PlusTransferHold = {
    v: 1,
    target: nextStableId,
    reason,
    heldPlus,
    plan: heldPlus ? lastStorePlusEvidence?.plan ?? null : null,
    createdAt: now,
    until: now + PLUS_TRANSFER_HOLD_TTL_MS,
    attempts: 0,
    lastAttemptAt: 0,
  };
  holdMemory = hold;
  identityTrace('[PLUS-TRANSFER]', 'hold begin', {
    reason,
    from: identityTag(previousStableId),
    to: identityTag(nextStableId),
    heldPlus,
    plan: hold.plan,
  }, { persist: heldPlus });
  void writePlusTransferHold(hold);
  return hold;
}

/**
 * Решение доступа для premium_guard: держать ли Plus, пока RevenueCat не ответил.
 * Только при heldPlus, своём аккаунте и не истёкшем окне.
 */
export async function plusTransferHoldGrantsAccess(stableId: string | null): Promise<boolean> {
  if (!stableId) return false;
  const hold = await readPlusTransferHold();
  if (!hold || !hold.heldPlus) return false;
  // M-S2d-1: удержание без конкретного target (выход в свежий профиль) Plus не даёт.
  if (hold.target === null || hold.target !== stableId) return false;
  return Date.now() < hold.until;
}

// ── Мягкое предупреждение перед ручной сменой аккаунта ───────────────────────
/** Ключ текста для «Дизайна». */
export const PLUS_TRANSFER_SWITCH_WARNING_TEXT_KEY = 'plus_transfer_switch_warning';
/**
 * ЧЕРНОВИК текста — не финал. Вид и окончательную формулировку даёт «Дизайн»;
 * здесь только смысл, чтобы точка вызова была рабочей.
 */
export const PLUS_TRANSFER_SWITCH_WARNING_DRAFT = {
  ru: 'Plus перейдёт на новый аккаунт на этом устройстве',
  uk: 'Plus перейде на новий акаунт на цьому пристрої',
  en: 'Plus will move to the new account on this device',
  es: 'Plus pasará a la nueva cuenta en este dispositivo',
} as const;

export type PlusTransferSwitchWarning = Readonly<{
  show: boolean;
  textKey: typeof PLUS_TRANSFER_SWITCH_WARNING_TEXT_KEY;
}>;

/** Точка вызова перед ручной сменой аккаунта: синхронно, без сети (по решению premium_guard). */
export function getPlusTransferSwitchWarning(currentStableId: string | null): PlusTransferSwitchWarning {
  // зачем (координатор 12.10, R1 «нет пути», аккаунт): dev `plustransfer=on` — строка про перенос Plus в окне смены аккаунта без свежего store-Plus; в стор-сборке геттер выключен. Только предупреждение, перенос не затрагивается.
  const show = hasFreshStorePlusEvidenceFor(currentStableId) || isDevPlusTransferNotice();
  identityTrace('[PLUS-TRANSFER]', 'manual_switch warning_point', {
    account: identityTag(currentStableId),
    show,
  });
  return { show, textKey: PLUS_TRANSFER_SWITCH_WARNING_TEXT_KEY };
}

export function __resetPlusTransferHoldForTests(): void {
  lastStorePlusEvidence = null;
  holdMemory = undefined;
  holdLoad = null;
}

/* expo-router route shim: keeps utility module from warning when discovered as route */
export default function __RouteShim() { return null; }
