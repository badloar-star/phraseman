/**
 * DEV-состояния зоны аккаунта для робот-съёмки: `dev_state?auth=none&switch=pending_spend&logout=fail&delete=fail&restore=retired&plustransfer=on`
 * (R1_SHOT_LIST «нет пути»: onboarding-006, profile-029, auth-gap-004/005/008/011/012/013/014/015/017/018).
 *
 * зачем (координатор 12.10): эти отказы определяет сервер, повреждённая очередь, сбой хранилища или 14-дневный срок — штатно не воспроизвести.
 * ПРАВИЛА БЕЗОПАСНОСТИ: только флаги В ПАМЯТИ процесса (как app/dev_vip_override.ts), хуки стоят в начале функций и возвращают отказ ДО любого
 * побочного эффекта (замки, запись, сеть), реальное стирание/удаление/вход недостижимы — и обычная, и форсированная («Сменить без сохранения»)
 * попытки выхода при включённом флаге получают отказ. Только `__DEV__ && !IS_STORE_RELEASE`: в стор-сборке геттеры всегда «выключено».
 * Логи: [DEV-STATE].
 */
import { IS_STORE_RELEASE } from './config';

const LOG = '[DEV-STATE]';

/** Значения `switch=` (кроме ok). */
// зачем (координатор 12.10, auth-gap-003/012): `required` — вход отдаёт account_switch_required ДО сети (окно входа с «Сменить аккаунт»).
export const DEV_SWITCH_MODES = ['not_uploaded', 'backup_blocked', 'unsaved_cards', 'pending_spend', 'quarantine', 'guard', 'slow', 'required'] as const;
export type DevSwitchMode = (typeof DEV_SWITCH_MODES)[number];
export const DEV_LOGOUT_MODES = ['fail', 'precommit', 'hold'] as const;
export type DevLogoutMode = (typeof DEV_LOGOUT_MODES)[number];
/** `namecheck=`: ответ проверки занятости имени в окне «Изменить имя» (settings-gap-024/025/026/031). */
export const DEV_NAME_CHECKS = ['checking', 'available', 'taken', 'error'] as const;
export type DevNameCheck = (typeof DEV_NAME_CHECKS)[number];
/**
 * `restore=offer|restored` (auth-gap-007/006): вход отдаёт account_delete_pending ДО сети, окно «Восстановить аккаунт?» получает
 * подставной статус (13 дней). offer — только окно; restored — «Восстановить» даёт итог «Аккаунт восстановлен». Настоящее
 * восстановление (restoreDeletedAccount) и сервер при подмене не вызываются.
 */
export const DEV_RESTORE_MODES = ['offer', 'restored'] as const;
export type DevRestoreMode = (typeof DEV_RESTORE_MODES)[number];
/**
 * `signin=hold|offline|generic` (onboarding-003/004/008): результат входа ДО замков и сети. hold — ждёт 60 с и «отменено»
 * (окно «Вход всё ещё выполняется…» видно после 8 с); offline — «нет связи»; generic — общая ошибка. Коды с префиксом dev_stub:
 * онбординг в dev не дописывает к тексту (кадр = макет).
 */
export const DEV_SIGNIN_MODES = ['hold', 'offline', 'generic'] as const;
export type DevSignInMode = (typeof DEV_SIGNIN_MODES)[number];
export type DevSignInStub = Readonly<{ mode: DevSignInMode; delayMs: number; error: string | null }>;
const DEV_SIGNIN_HOLD_MS = 60_000;
/** Сколько держать «Выходим из аккаунта» при `logout=hold` (profile-028), потом отказ — стирание недостижимо. */
const DEV_LOGOUT_HOLD_MS = 120_000;

type SignOutReason = 'wipe_failed' | 'sync_failed' | 'pending_shard_spend' | 'shard_queue_quarantined' | 'unknown';
export type DevSignOutOutcome = Readonly<{ reason: SignOutReason; detail?: string; delayMs: number }>;

type State = {
  authNone: boolean;
  switchMode: DevSwitchMode | null;
  logoutMode: DevLogoutMode | null;
  deleteFail: boolean;
  restoreRetired: boolean;
  restoreMode: DevRestoreMode | null;
  signIn: DevSignInMode | null;
  plusTransfer: boolean;
  /** `greet=<строка>`: имя на экране приветствия онбординга (onboarding-010, длинное имя). */
  greetName: string | null;
  /** `confetti=hold`: конфетти онбординга замирает на кадре пика (onboarding-019/020/021), только в памяти. */
  confettiHold: boolean;
  /** `namecheck=`: подменённый ответ проверки имени, только в памяти; сервер при подмене не вызывается. */
  nameCheck: DevNameCheck | null;
};
const EMPTY: State = { authNone: false, switchMode: null, logoutMode: null, deleteFail: false, restoreRetired: false, restoreMode: null, signIn: null, plusTransfer: false, greetName: null, confettiHold: false, nameCheck: null };
let state: State = EMPTY;
/**
 * Защёлка (ревью безопасности 12.10, R-2): после первого dev-отказа выхода ФОРСИРОВАННАЯ попытка («Сменить без сохранения») в этом процессе продолжает
 * отказывать, даже если флаги сняли (`switch=ok`/`logout=ok` при открытом окне) — настоящее стирание без синхронизации недостижимо. Сбрасывается перезапуском.
 */
let forcedRefusalLatched = false;

function devAccountAvailable(): boolean {
  return typeof __DEV__ !== 'undefined' && __DEV__ === true && !IS_STORE_RELEASE;
}

/** Выставить флаги. Не переданное не меняется. В стор-сборке — отказ с логом. */
export function setDevAccountState(patch: Partial<{
  authNone: boolean;
  switchMode: DevSwitchMode | null;
  logoutMode: DevLogoutMode | null;
  deleteFail: boolean;
  restoreRetired: boolean;
  restoreMode: DevRestoreMode | null;
  signIn: DevSignInMode | null;
  plusTransfer: boolean;
  greetName: string | null;
  confettiHold: boolean;
  nameCheck: DevNameCheck | null;
}>): boolean {
  if (!devAccountAvailable()) {
    console.warn(`${LOG} account: отклонено — не dev-сборка`, { keys: Object.keys(patch) }); // guard-ok: ранний выход логируется
    return false;
  }
  state = {
    authNone: patch.authNone ?? state.authNone,
    switchMode: patch.switchMode === undefined ? state.switchMode : patch.switchMode,
    logoutMode: patch.logoutMode === undefined ? state.logoutMode : patch.logoutMode,
    deleteFail: patch.deleteFail ?? state.deleteFail,
    restoreRetired: patch.restoreRetired ?? state.restoreRetired,
    restoreMode: patch.restoreMode === undefined ? state.restoreMode : patch.restoreMode,
    signIn: patch.signIn === undefined ? state.signIn : patch.signIn,
    plusTransfer: patch.plusTransfer ?? state.plusTransfer,
    greetName: patch.greetName === undefined ? state.greetName : patch.greetName,
    confettiHold: patch.confettiHold ?? state.confettiHold,
    nameCheck: patch.nameCheck === undefined ? state.nameCheck : patch.nameCheck,
  };
  console.log(`${LOG} account: ${JSON.stringify(state)}`); // guard-ok: единичный лог на ссылку
  return true;
}

/** `auth=none`: Google и Apple недоступны («Вход недоступен»). */
export function isDevAuthNone(): boolean {
  return devAccountAvailable() && state.authNone;
}

/**
 * Результат выхода/смены аккаунта вместо настоящего (null — нет подмены). `forced` — форсированная попытка («Сменить без сохранения»):
 * при `switch=` она получает общий отказ защитной проверки (`unknown`), чтобы реальное стирание было недостижимо.
 */
export function getDevSignOutOutcome(forced: boolean): DevSignOutOutcome | null {
  if (!devAccountAvailable()) return null;
  const outcome = computeDevSignOutOutcome(forced);
  if (outcome) forcedRefusalLatched = true;
  return outcome;
}

function computeDevSignOutOutcome(forced: boolean): DevSignOutOutcome | null {
  if (state.logoutMode === 'fail') return { reason: 'wipe_failed', detail: 'dev_logout_fail', delayMs: 0 };
  if (state.logoutMode === 'precommit') return { reason: 'sync_failed', delayMs: 0 };
  // зачем (координатор 12.10, profile-028 «выход выполняется»): окно стадии стирания живёт доли секунды — держим его, затем отказ
  // (форсированная попытка тоже отказывает), настоящий выход и стирание недостижимы.
  if (state.logoutMode === 'hold') return forced ? { reason: 'unknown', detail: 'dev_logout_hold', delayMs: DEV_LOGOUT_HOLD_MS } : { reason: 'sync_failed', delayMs: DEV_LOGOUT_HOLD_MS };
  const mode = state.switchMode;
  // зачем (ревью безопасности 12.10, R-1): при ЛЮБОМ включённом флаге зоны аккаунта (не только switch=/logout=) выход тоже отказывает — иначе тап «Сменить» в окне
  // plustransfer=on / restore=retired / auth=none / delete=fail запускал бы настоящее стирание.
  if (mode === null && (state.authNone || state.restoreRetired || state.restoreMode !== null || state.signIn !== null || state.deleteFail || state.plusTransfer)) {
    return forced ? { reason: 'unknown', detail: 'dev_guard', delayMs: 0 } : { reason: 'sync_failed', delayMs: 0 };
  }
  if (mode === null) {
    // нет флагов — настоящее поведение, как в стор-сборке; но если dev-отказ уже выдавался, форсированная попытка остаётся отказной (защёлка, R-2)
    return forced && forcedRefusalLatched ? { reason: 'unknown', detail: 'dev_guard_latched', delayMs: 0 } : null;
  }
  // зачем (ревью безопасности 12.10): при ЛЮБОМ включённом switch= настоящее стирание недостижимо — и для not_uploaded/backup_blocked (их экран — ошибка ВХОДА,
  // но в настройках вход идёт после выхода: выход тоже должен отказать, а не стереть данные).
  if (forced) return { reason: 'unknown', detail: 'dev_guard', delayMs: 0 };
  switch (mode) {
    case 'pending_spend': return { reason: 'pending_shard_spend', delayMs: 0 };
    case 'quarantine': return { reason: 'shard_queue_quarantined', delayMs: 0 };
    case 'slow': return { reason: 'sync_failed', delayMs: 50_000 }; // дольше ACCOUNT_SWITCH_UI_DEADLINE_MS (45 с)
    case 'not_uploaded':
    case 'backup_blocked':
    case 'unsaved_cards':
    case 'required':
    case 'guard': return { reason: 'sync_failed', delayMs: 0 };
    default: return { reason: 'unknown', detail: 'dev_guard', delayMs: 0 }; // R-3: незнакомый режим отказывает, а не пропускает к настоящему выходу
  }
}

/** Ошибка входа вместо настоящего входа (null — нет подмены): `switch=not_uploaded|backup_blocked`, `restore=retired`. */
export function getDevSignInError(): string | null {
  if (!devAccountAvailable()) return null;
  if (state.restoreRetired) return 'identity_retired';
  // зачем (координатор 12.10, auth-gap-006/007): аккаунт «на удалении, 14 дней ещё идут» — ветка окна восстановления, без сети.
  if (state.restoreMode !== null) return 'account_delete_pending';
  if (state.switchMode === 'not_uploaded') return 'local_progress_not_uploaded';
  if (state.switchMode === 'backup_blocked') return 'local_progress_backup_blocked';
  if (state.switchMode === 'required') return 'account_switch_required';
  return null;
}

/** `switch=unsaved_cards`: перед сменой спросить про карточки, не доехавшие до облака (auth-gap-013). */
export function isDevUnsavedCardsPrompt(): boolean {
  return devAccountAvailable() && state.switchMode === 'unsaved_cards';
}

/** `namecheck=`: ответ проверки занятости имени вместо сервера (null — нет подмены; вне dev всегда null). */
export function getDevNameCheck(): DevNameCheck | null {
  return devAccountAvailable() ? state.nameCheck : null;
}

/** `signin=`: подставной результат входа (null — нет подмены; вне dev / в стор-сборке всегда null). */
export function getDevSignInStub(): DevSignInStub | null {
  if (!devAccountAvailable() || state.signIn === null) return null;
  if (state.signIn === 'hold') return { mode: 'hold', delayMs: DEV_SIGNIN_HOLD_MS, error: null };
  if (state.signIn === 'offline') return { mode: 'offline', delayMs: 0, error: 'dev_stub:network-request-failed' };
  return { mode: 'generic', delayMs: 0, error: 'dev_stub:generic' };
}

/** `restore=offer|restored`: подставной режим окна восстановления (null — нет подмены; вне dev всегда null). */
export function getDevAccountRestoreMode(): DevRestoreMode | null {
  return devAccountAvailable() ? state.restoreMode : null;
}

/** `delete=fail`: локальная фаза удаления отказывает ДО любого побочного эффекта (auth-gap-011). */
export function isDevDeleteFail(): boolean {
  return devAccountAvailable() && state.deleteFail;
}

/** `plustransfer=on`: в окне смены аккаунта показать строку про перенос Plus (auth-gap-012). */
export function isDevPlusTransferNotice(): boolean {
  return devAccountAvailable() && state.plusTransfer;
}

/**
 * `greet=<строка>`: имя для экрана приветствия вместо имени из Google (onboarding-010 — длинное имя). Строка обрезается до 24 символов (как у
 * настоящего первого слова имени), нигде не хранится и никуда не уходит. Вне dev — всегда null. Вставку в CleanOnboarding делает Авторизация.
 */
/**
 * `confetti=hold`: конфетти онбординга останавливается на кадре пика, чтобы Сверка успела снять кадр (onboarding-019/020/021).
 * Только в памяти; вне dev / в стор-сборке — всегда false. Вставку в CleanOnboarding делает Авторизация.
 */
export function isDevConfettiHold(): boolean {
  return devAccountAvailable() && state.confettiHold;
}

export function getDevGreetName(): string | null {
  return devAccountAvailable() ? state.greetName : null;
}

/** Только для тестов. */
export function resetDevAccountStateForTests(): void {
  state = EMPTY;
  forcedRefusalLatched = false;
}

/* expo-router route shim: keeps utility module from warning when discovered as route */
export default function __RouteShim() { return null; }
