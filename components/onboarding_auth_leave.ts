/**
 * Уход с экрана входа онбординга, пока вход Apple/Google ещё идёт.
 *
 * зачем (ревью TG-A3996AF645F1, 11.10): «Позже»/«Назад» нельзя пускать сразу — уход
 * посреди обычного входа бросал результат без экрана (ошибка, окно смены аккаунта или
 * onDone поверх шагов). Но и держать их закрытыми всё время входа нельзя: у входа нет
 * общего потолка (нативный лист Apple, Firestore-шаги, замок перехода), и повисший вход
 * запирал человека на первом экране до убийства приложения. Поэтому как в окне входа
 * (RegistrationPromptModal.handleLater: `loadingProvider !== null && !signInSlow`):
 * до порога «вход идёт медленно» уход игнорируется, после — разрешён, а поздний ответ
 * гасится сверкой номера попытки.
 *
 * Сам вход не отменяется (мутацию провайдера отменить нельзя) и замок не снимается:
 * повторный тап на том же экране по-прежнему отбивается, пока старый вход не завершится.
 */

export type OnboardingAuthLeaveDecision = 'free' | 'ignored_in_flight' | 'leave_and_drop_result';

/** Можно ли уйти с экрана входа: вход не идёт → свободно; идёт быстро → ждём; повис → уходим. */
export function decideOnboardingAuthLeave(inFlight: boolean, slow: boolean): OnboardingAuthLeaveDecision {
  if (!inFlight) return 'free';
  return slow ? 'leave_and_drop_result' : 'ignored_in_flight';
}

/** Счётчик попыток входа (ref компонента): номер растёт при старте и при уходе с экрана. */
export type OnboardingAuthAttemptRef = { current: number };

export function beginOnboardingAuthAttempt(ref: OnboardingAuthAttemptRef): number {
  ref.current += 1;
  return ref.current;
}

/** Уход с экрана: любой идущий ответ входа становится чужим и отбрасывается. */
export function abandonOnboardingAuthAttempt(ref: OnboardingAuthAttemptRef): void {
  ref.current += 1;
}

export function isOnboardingAuthAttemptCurrent(ref: OnboardingAuthAttemptRef, token: number): boolean {
  return ref.current === token;
}

// ── Поздний ответ входа после ухода с экрана ─────────────────────────────────
//
// зачем (повторное ревью TG-C8E5C56B2F02): вход при уходе НЕ отменяется. Успешный
// linked_existing / merged_devices / linked_pending уже сменил личность и восстановил
// прогресс из облака — отбросить его значит пустить человека дальше по анкете как
// новичка: шаг «name» перезаписал бы user_profile восстановленного аккаунта и поставил
// метку автоника (новый ник существующему аккаунту). Такой ответ засчитываем: онбординг
// завершается так же, как штатный успех. Отбрасываем только то, что личность не сменило
// или требует экрана: error, cancelled, created_new (вопрос «создать аккаунт?»).

const IDENTITY_CHANGING_RESULTS: ReadonlySet<string> = new Set(['linked_existing', 'merged_devices', 'linked_pending']);

export type OnboardingLateAuthAction = 'honor_late_success' | 'already_completed' | 'drop';

export function decideLateOnboardingAuthResult(result: string, onboardingDoneCalled: boolean): OnboardingLateAuthAction {
  if (!IDENTITY_CHANGING_RESULTS.has(result)) return 'drop';
  return onboardingDoneCalled ? 'already_completed' : 'honor_late_success';
}

/** Общее для онбординга: onDone ровно один раз, анкета не пишет поверх засчитанного входа. */
export type OnboardingCompletionState = {
  /** onDone() уже вызван (штатный вход, финал после пейвола или засчитанный поздний вход). */
  doneCalled: boolean;
  /** Засчитан поздний успешный вход — анкета больше не пишет профиль и метку автоника. */
  lateSuccessHonored: boolean;
  /** Шаг «name» уже записал user_profile и метку автоника этого онбординга. */
  questionnaireWritten: boolean;
};

export function createOnboardingCompletionState(): OnboardingCompletionState {
  return { doneCalled: false, lateSuccessHonored: false, questionnaireWritten: false };
}

/** Может ли шаг «name» писать user_profile/метку автоника: нет, если вход уже засчитан или онбординг закрыт. */
export function canQuestionnaireWriteProfile(state: OnboardingCompletionState): boolean {
  return !state.lateSuccessHonored && !state.doneCalled;
}

export type HonorLateOnboardingAuthEffects = {
  /** DONE_KEY/FLOW_VERSION_KEY и снятие сохранённого шага — как у штатного успеха. */
  persistDone: () => Promise<void>;
  /** Снять метку автоника, записанную анкетой этого онбординга (аккаунт уже существует). */
  clearNicknamePending: () => Promise<void>;
  onDone: () => void;
  log: (line: string) => void;
};

/**
 * Засчитать поздний успешный вход: завершить онбординг один раз.
 * Возвращает итог для лога/теста; onDone не зовётся, если онбординг уже закрыт.
 */
export async function honorLateOnboardingAuthSuccess(
  state: OnboardingCompletionState,
  result: string,
  attempt: number,
  effects: HonorLateOnboardingAuthEffects,
): Promise<'honored' | 'already_completed'> {
  if (state.doneCalled) {
    effects.log(`[ONBOARDING-AUTH] late_success_after_completion result=${result} attempt=${attempt}`);
    return 'already_completed';
  }
  state.lateSuccessHonored = true;
  effects.log(`[ONBOARDING-AUTH] late_success_honored result=${result} attempt=${attempt} questionnaire=${state.questionnaireWritten ? 1 : 0}`);
  if (state.questionnaireWritten) await effects.clearNicknamePending();
  await effects.persistDone();
  // Пока писали, онбординг мог закрыться сам (финал после пейвола) — второй onDone нельзя.
  if (state.doneCalled) {
    effects.log(`[ONBOARDING-AUTH] late_success_after_completion result=${result} attempt=${attempt} stage=after_persist`);
    return 'already_completed';
  }
  state.doneCalled = true;
  effects.onDone();
  return 'honored';
}
