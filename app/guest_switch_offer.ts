/**
 * Правило 2 владельца (18.10): гость С прогрессом входит в ДРУГОЙ, уже существующий аккаунт → одно предупреждение
 * (шторка GuestSwitchWarningSheet, Дизайн e4869015b) → «Войти» = вход в существующий аккаунт, прогресс гостя НЕ переносится
 * (никакого слияния), «Отмена» = остаёмся гостем.
 *
 * зачем отдельный модуль: окно входа (RegistrationPromptModal) само вызывает вход и само показывает шторку — ему нужен
 * один источник её состояния и одна функция «что делать после отказа account_switch_required». Подключение в окне —
 * у Дизайна: `guestSwitch={useGuestSwitchOffer()}` и `await runGuestSwitchToExistingAccount(provider)` в той ветке.
 *
 * Механизм тот же, что «Сменить аккаунт» в онбординге: signOutAndWipeForAccountSwitch (аварийная копия гостя под
 * замком до стирания, облако догоняет не дольше 3 с) → resumeSignInAfterAccountSwitch (тот же выбор Google без второго
 * окна). Apple у гостя тратит пропуск на попытку привязки — после смены окно Apple откроется ещё раз.
 */
import { useSyncExternalStore } from 'react';
import {
  discardAccountSwitchResumeCredential,
  resumeSignInAfterAccountSwitch,
  signInWithProvider,
  signOutAndWipeForAccountSwitch,
  type AuthProviderId,
  type SignInResult,
} from './auth_provider';
import { identityErrorCode } from './identity_trace';

/** Потолок ожидания облака при смене гостя — тот же, что у выхода и смены из онбординга. */
const GUEST_SWITCH_SYNC_DEADLINE_MS = 3000;

export type GuestSwitchOutcome =
  | Readonly<{ kind: 'signed_in'; result: SignInResult }>
  | Readonly<{ kind: 'cancelled' }>
  | Readonly<{ kind: 'failed'; reason: string }>;

export type GuestSwitchSheetProps = Readonly<{
  visible: boolean;
  accountLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
}>;

type OfferState = Readonly<{ visible: boolean; accountLabel?: string }>;
type Choice = 'confirm' | 'cancel';

let offerState: OfferState = { visible: false };
let pendingChoice: ((choice: Choice) => void) | null = null;
const listeners = new Set<() => void>();

function trace(step: string, fields: Record<string, unknown> = {}): void {
  console.warn(`[AUTH-SWITCH] ${new Date().toISOString()} ${step} ${JSON.stringify(fields)}`); // guard-ok: без uid/почты
}

function publish(next: OfferState): void {
  offerState = next;
  listeners.forEach((listener) => listener());
}

function answer(choice: Choice): void {
  const resolve = pendingChoice;
  if (!resolve) {
    trace('rule2 sheet_answer_ignored', { choice, reason: 'no_pending_offer' });
    return;
  }
  pendingChoice = null;
  // зачем: шторку закрывает поток (контракт Дизайна) — сразу, чтобы под ней было видно «Входим…» окна входа.
  publish({ visible: false });
  resolve(choice);
}

const confirmOffer = (): void => answer('confirm');
const cancelOffer = (): void => answer('cancel');

/** Закрыть висящее предложение (окно входа закрылось) — равносильно «Отмена». */
export function cancelGuestSwitchOffer(reason: string): void {
  if (!pendingChoice) return;
  trace('rule2 sheet_cancelled_externally', { reason });
  answer('cancel');
}

/** Состояние шторки для окна входа: `guestSwitch={useGuestSwitchOffer()}`. */
export function useGuestSwitchOffer(): GuestSwitchSheetProps {
  const state = useSyncExternalStore(
    (listener) => { listeners.add(listener); return () => { listeners.delete(listener); }; },
    () => offerState,
    () => offerState,
  );
  return { visible: state.visible, accountLabel: state.accountLabel, onConfirm: confirmOffer, onCancel: cancelOffer };
}

/**
 * Вызывается окном входа на отказ `account_switch_required` гостю (вход шёл с captureAccountSwitchResume).
 * Показывает шторку, ждёт решения и доводит вход до конца; итог — как у обычного входа.
 */
export async function runGuestSwitchToExistingAccount(
  provider: AuthProviderId,
  options: Readonly<{ accountLabel?: string }> = {},
): Promise<GuestSwitchOutcome> {
  const startedAt = Date.now();
  if (pendingChoice) {
    // защита от двойного запуска: второе предложение поверх первого не показываем
    trace('rule2 offer_skipped', { provider, reason: 'offer_already_open' });
    return { kind: 'cancelled' };
  }
  trace('rule2 offer_shown', { provider, reason: 'guest_has_progress_existing_account' });
  const choice = await new Promise<Choice>((resolve) => {
    pendingChoice = resolve;
    publish({ visible: true, accountLabel: options.accountLabel });
  });
  trace('rule2 offer_answered', { provider, choice, waitedMs: Date.now() - startedAt });
  if (choice === 'cancel') {
    discardAccountSwitchResumeCredential('guest_sheet_cancel');
    return { kind: 'cancelled' };
  }
  const switchStartedAt = Date.now();
  try {
    const switched = await signOutAndWipeForAccountSwitch({ syncDeadlineMs: GUEST_SWITCH_SYNC_DEADLINE_MS, allowWipeWithoutSync: true });
    if (!switched.ok) {
      discardAccountSwitchResumeCredential('guest_switch_failed');
      trace('rule2 switch_failed', { provider, reason: switched.reason, tookMs: Date.now() - switchStartedAt, outcome: 'stay_guest' });
      return { kind: 'failed', reason: switched.reason };
    }
    trace('rule2 switched', { provider, synced: switched.synced ? 'yes' : 'no', tookMs: Date.now() - switchStartedAt });
  } catch (error) {
    discardAccountSwitchResumeCredential('guest_switch_threw');
    const reason = identityErrorCode(error);
    trace('rule2 switch_threw', { provider, reason });
    return { kind: 'failed', reason };
  }
  const resumed = await resumeSignInAfterAccountSwitch(provider);
  if (resumed) {
    trace('rule2 done', { provider, result: resumed.result, source: 'same_choice', tookMs: Date.now() - startedAt });
    return { kind: 'signed_in', result: resumed };
  }
  // Пропуска нет (Apple: потрачен попыткой привязки; Google: протух) — гость уже чистый, обычный вход откроет окно.
  trace('rule2 resume_unavailable', { provider, next: 'fresh_sign_in' });
  const fresh = await signInWithProvider(provider);
  trace('rule2 done', { provider, result: fresh.result, source: 'fresh_picker', tookMs: Date.now() - startedAt });
  return fresh.result === 'cancelled' ? { kind: 'cancelled' } : { kind: 'signed_in', result: fresh };
}

/* expo-router route shim: app/ files are treated as routes and need a default export. */
export default function __RouteShim() {
  return null;
}
