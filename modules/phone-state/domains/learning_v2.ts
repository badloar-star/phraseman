export type LearningV2Completion = Readonly<{
  mutationId: string;
  requiredSessionId: string;
  courseId: string;
  exactResult: unknown;
}>;

export function replayLearningV2Completions(
  completions: readonly LearningV2Completion[],
): Readonly<{ completedSessionIds: readonly string[]; receipts: Readonly<Record<string, LearningV2Completion>> }> {
  const receipts: Record<string, LearningV2Completion> = {};
  for (const completion of completions) {
    if (!completion.mutationId.trim() || !completion.requiredSessionId.trim() || !completion.courseId.trim()) {
      throw new Error('phone_state_learning_v2_completion_invalid');
    }
    const existing = receipts[completion.mutationId];
    if (existing && JSON.stringify(existing) !== JSON.stringify(completion)) {
      throw new Error('phone_state_learning_v2_mutation_reused');
    }
    receipts[completion.mutationId] = Object.freeze({ ...completion });
  }
  return Object.freeze({
    completedSessionIds: Object.freeze([...new Set(Object.values(receipts).map((item) => item.requiredSessionId))].sort()),
    receipts: Object.freeze(receipts),
  });
}

export interface LearningV2CompletionJournal {
  commit(completion: LearningV2Completion): Promise<Readonly<{ duplicate: boolean }>>;
}

export function createLearningV2CompletionAdapter(journal: LearningV2CompletionJournal) {
  return Object.freeze({
    commit: (completion: LearningV2Completion) => {
      replayLearningV2Completions([completion]);
      return journal.commit(completion);
    },
  });
}

export type LearningV2ReducerState = Readonly<{
  receipts: Readonly<Record<string, LearningV2Completion>>;
  appliedOperationIds: readonly string[];
}>;

export function learningV2ProjectionFromReducerState(state: LearningV2ReducerState) {
  return replayLearningV2Completions(Object.values(state.receipts));
}

export function createLearningV2Reducer(): DomainReducer<LearningV2ReducerState> {
  return Object.freeze({
    domain: 'learning_v2',
    version: 1,
    initial: () => Object.freeze({ receipts: Object.freeze({}), appliedOperationIds: Object.freeze([]) }),
    apply: (state, operation: PersonalOperation) => {
      if (state.appliedOperationIds.includes(operation.operationId)) return state;
      if (operation.kind !== 'required_session_completion' || !operation.entityId) {
        throw new Error('phone_state_learning_v2_completion_invalid');
      }
      const completion = operation.payload as LearningV2Completion;
      replayLearningV2Completions([completion]);
      if (completion.mutationId !== operation.entityId) throw new Error('phone_state_learning_v2_completion_invalid');
      const existing = state.receipts[completion.mutationId];
      if (existing && JSON.stringify(existing) !== JSON.stringify(completion)) {
        throw new Error('phone_state_learning_v2_mutation_reused');
      }
      return Object.freeze({
        receipts: existing ? state.receipts : Object.freeze({ ...state.receipts, [completion.mutationId]: Object.freeze(completion) }),
        appliedOperationIds: Object.freeze([...state.appliedOperationIds, operation.operationId].sort()),
      });
    },
    validate: (value: unknown): value is LearningV2ReducerState => {
      if (!value || typeof value !== 'object') return false;
      const state = value as Partial<LearningV2ReducerState>;
      return !!state.receipts && typeof state.receipts === 'object'
        && Array.isArray(state.appliedOperationIds)
        && state.appliedOperationIds.every((id) => typeof id === 'string');
    },
  });
}
import type { PersonalOperation } from '../contracts';
import type { DomainReducer } from '../reducer_registry';
