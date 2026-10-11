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
export const DEV_SWITCH_MODES = ['not_uploaded', 'backup_blocked', 'unsaved_cards', 'pending_spend', 'quarantine', 'guard', 'slow'] as const;
export type DevSwitchMode = (typeof DEV_SWITCH_MODES)[number];
export const DEV_LOGOUT_MODES = ['fail', 'precommit'] as const;
export type DevLogoutMode = (typeof DEV_LOGOUT_MODES)[number];

type SignOutReason = 'wipe_failed' | 'sync_failed' | 'pending_shard_spend' | 'shard_queue_quarantined' | 'unknown';
export type DevSignOutOutcome = Readonly<{ reason: SignOutReason; detail?: string; delayMs: number }>;

type State = {
  authNone: boolean;
  switchMode: DevSwitchMode | null;
  logoutMode: DevLogoutMode | null;
  deleteFail: boolean;
  restoreRetired: boolean;
  plusTransfer: boolean;
  /** `greet=<строка>`: имя на экране приветствия онбординга (onboarding-010, длинное имя). */
  greetName: string | null;
};
const EMPTY: State = { authNone: false, switchMode: null, logoutMode: null, deleteFail: false, restoreRetired: false, plusTransfer: false, greetName: null };
let state: State = EMPTY;

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
  plusTransfer: boolean;
  greetName: string | null;
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
    plusTransfer: patch.plusTransfer ?? state.plusTransfer,
    greetName: patch.greetName === undefined ? state.greetName : patch.greetName,
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
  if (state.logoutMode === 'fail') return { reason: 'wipe_failed', detail: 'dev_logout_fail', delayMs: 0 };
  if (state.logoutMode === 'precommit') return { reason: 'sync_failed', delayMs: 0 };
  const mode = state.switchMode;
  if (mode === null) return null; // нет флагов — настоящее поведение, как в стор-сборке
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
    case 'guard': return { reason: 'sync_failed', delayMs: 0 };
  }
}

/** Ошибка входа вместо настоящего входа (null — нет подмены): `switch=not_uploaded|backup_blocked`, `restore=retired`. */
export function getDevSignInError(): string | null {
  if (!devAccountAvailable()) return null;
  if (state.restoreRetired) return 'identity_retired';
  if (state.switchMode === 'not_uploaded') return 'local_progress_not_uploaded';
  if (state.switchMode === 'backup_blocked') return 'local_progress_backup_blocked';
  return null;
}

/** `switch=unsaved_cards`: перед сменой спросить про карточки, не доехавшие до облака (auth-gap-013). */
export function isDevUnsavedCardsPrompt(): boolean {
  return devAccountAvailable() && state.switchMode === 'unsaved_cards';
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
export function getDevGreetName(): string | null {
  return devAccountAvailable() ? state.greetName : null;
}

/** Только для тестов. */
export function resetDevAccountStateForTests(): void {
  state = EMPTY;
}

/* expo-router route shim: keeps utility module from warning when discovered as route */
export default function __RouteShim() { return null; }
