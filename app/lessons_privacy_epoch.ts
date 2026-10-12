// зачем (B1, §AUTH-0070, реестр п.73): при входе в аккаунт вкладка уроков под онбордингом пересобиралась 7 раз (~2 с каждая, ~9 с входа), потому что эпоха
// росла на КАЖДОМ событии поколения аккаунта, включая «смена → смена». Здесь правило роста вынесено в чистую функцию, чтобы его можно было проверить тестом.
// Эпоха растёт ТОЛЬКО: при уходе из active, при новом active (в т. ч. тот же владелец после отменённой смены) и при сбое подписки. «Смена → смена» лишь
// обновляет фазу. Первое усыновление владельца (uninitialized → active) эпоху не растит.
import type { AccountGenerationToken } from './account_generation';

export type LessonsPrivacyState = Readonly<{
  epoch: number;
  phase: AccountGenerationToken['phase'];
  failClosed: boolean;
}>;

export type LessonsEpochDecision = Readonly<{ bump: boolean; reason: string }>;

type TokenLike = Pick<AccountGenerationToken, 'generation' | 'phase' | 'stableId'>;

// currentEpoch === 0 означает, что вкладка ещё ни разу не пересобиралась (владелец не уходил из active): только тогда uninitialized → active — первое усыновление.
export function decideLessonsEpoch(previous: TokenLike, next: TokenLike, currentEpoch: number = 0): LessonsEpochDecision {
  if (previous.phase === 'uninitialized' && next.phase === 'active' && currentEpoch === 0) return { bump: false, reason: 'initial_adoption' };
  if (previous.phase === 'active' && next.phase === 'active' && previous.stableId === next.stableId) return { bump: false, reason: 'same_active_owner' };
  if (previous.generation === next.generation && previous.phase === next.phase && previous.stableId === next.stableId) return { bump: false, reason: 'duplicate_event' };
  if (previous.phase === 'active' && next.phase !== 'active') return { bump: true, reason: 'left_active' };
  if (next.phase === 'active') return { bump: true, reason: previous.phase === 'active' ? 'new_active_owner' : 'new_active' };
  return { bump: false, reason: 'transition_step' };
}

/** Следующее состояние после события поколения. Фаза обновляется всегда, кроме полностью совпавших событий. */
export function applyLessonsReconcile(
  current: LessonsPrivacyState,
  previous: TokenLike,
  next: TokenLike,
): Readonly<{ state: LessonsPrivacyState; decision: LessonsEpochDecision }> {
  const decision = decideLessonsEpoch(previous, next, current.epoch);
  if (decision.reason === 'same_active_owner' || decision.reason === 'duplicate_event') return { state: current, decision };
  if (decision.bump) return { state: { epoch: current.epoch + 1, phase: next.phase, failClosed: current.failClosed }, decision };
  return { state: { ...current, phase: next.phase }, decision };
}

/** Сбой подписки на поколение: закрыть вкладку навсегда (fail-closed) и пересобрать. */
export function failClosedLessons(current: LessonsPrivacyState): LessonsPrivacyState {
  return { epoch: current.epoch + 1, phase: 'transitioning', failClosed: true };
}

/** Крышка вкладки уроков: сбой подписки, переходная фаза или эпоха новее той, что была усыновлена активным владельцем. */
export function computeLessonsCover(state: LessonsPrivacyState, activatedEpoch: number): boolean {
  return state.failClosed || state.phase === 'transitioning' || activatedEpoch < state.epoch;
}

/** Эпоха, усыновлённая активным владельцем: обновляется только в active без сбоя. */
export function nextActivatedEpoch(state: LessonsPrivacyState, activatedEpoch: number): number {
  return state.phase === 'active' && !state.failClosed ? state.epoch : activatedEpoch;
}
