// Домен завершений удалённого курса занятий в личном журнале телефона — только воспроизведение.
//
// зачем: выпущенные версии писали в журнал операции этого домена, они лежат на телефонах и в облачных сегментах.
// Курс удалён и новых операций никто не создаёт, но журнал обязан воспроизводиться как прежде: без этого редьюсера
// старые сегменты стали бы «неизвестным доменом», а состояние разошлось бы с устройствами на прежних версиях.
// Поэтому логика применения операции и имена домена, вида операции и кодов ошибок сохранены без изменений —
// это формат уже записанных данных. Писателя (моста из экранов курса) больше нет.
import type { PersonalOperation } from '../contracts';
import type { DomainReducer } from '../reducer_registry';

/** Имя домена в уже записанных операциях; менять нельзя. */
export const RETIRED_COURSE_COMPLETION_DOMAIN = 'learning_v2';

export type RetiredCourseCompletion = Readonly<{
  mutationId: string;
  requiredSessionId: string;
  courseId: string;
  exactResult: unknown;
}>;

function assertCompletion(completion: RetiredCourseCompletion): void {
  if (!completion.mutationId.trim() || !completion.requiredSessionId.trim() || !completion.courseId.trim()) {
    throw new Error('phone_state_learning_v2_completion_invalid');
  }
}

export type RetiredCourseCompletionReducerState = Readonly<{
  receipts: Readonly<Record<string, RetiredCourseCompletion>>;
  appliedOperationIds: readonly string[];
}>;

export function createRetiredCourseCompletionReducer(): DomainReducer<RetiredCourseCompletionReducerState> {
  return Object.freeze({
    domain: RETIRED_COURSE_COMPLETION_DOMAIN,
    version: 1,
    initial: () => Object.freeze({ receipts: Object.freeze({}), appliedOperationIds: Object.freeze([]) }),
    apply: (state, operation: PersonalOperation) => {
      if (state.appliedOperationIds.includes(operation.operationId)) return state;
      if (operation.kind !== 'required_session_completion' || !operation.entityId) {
        throw new Error('phone_state_learning_v2_completion_invalid');
      }
      const completion = operation.payload as RetiredCourseCompletion;
      assertCompletion(completion);
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
    validate: (value: unknown): value is RetiredCourseCompletionReducerState => {
      if (!value || typeof value !== 'object') return false;
      const state = value as Partial<RetiredCourseCompletionReducerState>;
      return !!state.receipts && typeof state.receipts === 'object'
        && Array.isArray(state.appliedOperationIds)
        && state.appliedOperationIds.every((id) => typeof id === 'string');
    },
  });
}
