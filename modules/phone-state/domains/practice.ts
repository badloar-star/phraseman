import type { HybridClock } from '../contracts';
import type { PersonalOperation } from '../contracts';
import type { DomainReducer } from '../reducer_registry';

export type PracticeOperation =
  | Readonly<{ kind: 'fact'; factType: 'completed_task' | 'mistake' | 'mastered' | 'attempt'; entityId: string }>
  | Readonly<{ kind: 'register'; field: string; value: unknown; clock: HybridClock }>;

type Register = Readonly<{ value: unknown; clock: HybridClock }>;

const compare = (left: HybridClock, right: HybridClock): number => (
  left.counter - right.counter || left.deviceId.localeCompare(right.deviceId)
);

const sorted = (values: Iterable<string>): readonly string[] => Object.freeze([...new Set(values)].sort());

export function replayPractice(operations: readonly PracticeOperation[]): Readonly<{
  completedTasks: readonly string[];
  mistakeIds: readonly string[];
  masteredIds: readonly string[];
  attemptIds: readonly string[];
  registers: Readonly<Record<string, unknown>>;
  planMode: unknown;
}> {
  const facts = {
    completed_task: new Set<string>(), mistake: new Set<string>(), mastered: new Set<string>(), attempt: new Set<string>(),
  };
  const registers = new Map<string, Register>();
  for (const operation of operations) {
    if (operation.kind === 'fact') {
      if (!operation.entityId.trim()) throw new Error('phone_state_practice_fact_invalid');
      facts[operation.factType].add(operation.entityId);
      continue;
    }
    if (!operation.field.trim()) throw new Error('phone_state_practice_register_invalid');
    const current = registers.get(operation.field);
    if (!current || compare(operation.clock, current.clock) > 0) {
      registers.set(operation.field, { value: operation.value, clock: operation.clock });
    }
  }
  const values = Object.freeze(Object.fromEntries([...registers.entries()].sort(([a], [b]) => a.localeCompare(b))
    .map(([field, register]) => [field, register.value])));
  return Object.freeze({
    completedTasks: sorted(facts.completed_task),
    mistakeIds: sorted(facts.mistake),
    masteredIds: sorted(facts.mastered),
    attemptIds: sorted(facts.attempt),
    registers: values,
    planMode: values.plan_mode ?? null,
  });
}

export function portabilityOf(field: string): 'portable' | 'device_only' {
  return /(?:audio_buffer|animation|cursor|gesture|screen_draft)/.test(field) ? 'device_only' : 'portable';
}

export const practiceOperations = Object.freeze({
  completeTask: (entityId: string): PracticeOperation => ({ kind: 'fact', factType: 'completed_task', entityId }),
  captureMistake: (entityId: string): PracticeOperation => ({ kind: 'fact', factType: 'mistake', entityId }),
  master: (entityId: string): PracticeOperation => ({ kind: 'fact', factType: 'mastered', entityId }),
  attempt: (entityId: string): PracticeOperation => ({ kind: 'fact', factType: 'attempt', entityId }),
  setField: (field: string, value: unknown, clock: HybridClock): PracticeOperation => ({ kind: 'register', field, value, clock }),
});

type PracticeFactType = 'completed_task' | 'mistake' | 'mastered' | 'attempt';
type PracticeCell = Readonly<{ value: unknown; clock: HybridClock }>;

export type PracticeReducerState = Readonly<{
  facts: Readonly<Record<PracticeFactType, Readonly<Record<string, unknown>>>>;
  registers: Readonly<Record<string, PracticeCell>>;
  appliedOperationIds: readonly string[];
}>;

export type PracticeProjection = Readonly<{
  completedTasks: Readonly<Record<string, unknown>>;
  mistakes: Readonly<Record<string, unknown>>;
  mastered: Readonly<Record<string, unknown>>;
  attempts: Readonly<Record<string, unknown>>;
  registers: Readonly<Record<string, unknown>>;
}>;

const FACT_KINDS = new Set<PracticeFactType>(['completed_task', 'mistake', 'mastered', 'attempt']);

export function practiceProjectionFromReducerState(state: PracticeReducerState): PracticeProjection {
  return Object.freeze({
    completedTasks: state.facts.completed_task,
    mistakes: state.facts.mistake,
    mastered: state.facts.mastered,
    attempts: state.facts.attempt,
    registers: Object.freeze(Object.fromEntries(
      Object.entries(state.registers).map(([field, cell]) => [field, cell.value]),
    )),
  });
}

export function createPracticeReducer(): DomainReducer<PracticeReducerState> {
  return Object.freeze({
    domain: 'practice',
    version: 1,
    initial: () => Object.freeze({
      facts: Object.freeze({
        completed_task: Object.freeze({}),
        mistake: Object.freeze({}),
        mastered: Object.freeze({}),
        attempt: Object.freeze({}),
      }),
      registers: Object.freeze({}),
      appliedOperationIds: Object.freeze([]),
    }),
    apply: (state, operation: PersonalOperation) => {
      if (state.appliedOperationIds.includes(operation.operationId)) return state;
      const payload = operation.payload as { field?: unknown; value?: unknown } | null;
      let next: PracticeReducerState;
      if (FACT_KINDS.has(operation.kind as PracticeFactType)) {
        if (!operation.entityId?.trim()) throw new Error('phone_state_practice_fact_invalid');
        const factType = operation.kind as PracticeFactType;
        next = Object.freeze({
          ...state,
          facts: Object.freeze({
            ...state.facts,
            [factType]: Object.freeze({
              ...state.facts[factType],
              [operation.entityId]: payload?.value ?? operation.exactResult,
            }),
          }),
        });
      } else if (operation.kind === 'set_field') {
        if (typeof payload?.field !== 'string' || !payload.field.trim() || portabilityOf(payload.field) !== 'portable') {
          throw new Error('phone_state_practice_register_invalid');
        }
        const current = state.registers[payload.field];
        next = !current || compare(operation.hybridClock, current.clock) > 0
          ? Object.freeze({
            ...state,
            registers: Object.freeze({
              ...state.registers,
              [payload.field]: Object.freeze({ value: payload.value, clock: operation.hybridClock }),
            }),
          })
          : state;
      } else {
        throw new Error('phone_state_practice_operation_invalid');
      }
      return Object.freeze({
        ...next,
        appliedOperationIds: Object.freeze([...next.appliedOperationIds, operation.operationId].sort()),
      });
    },
    validate: (value: unknown): value is PracticeReducerState => {
      if (!value || typeof value !== 'object') return false;
      const state = value as Partial<PracticeReducerState>;
      return !!state.facts && typeof state.facts === 'object'
        && !!state.registers && typeof state.registers === 'object'
        && Array.isArray(state.appliedOperationIds)
        && state.appliedOperationIds.every((id) => typeof id === 'string');
    },
  });
}
