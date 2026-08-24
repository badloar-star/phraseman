import type { PersonalOperation } from '../contracts';
import type { DomainReducer } from '../reducer_registry';
import {
  applyPersonalProgressCommand,
  emptyPersonalProgressState,
  type PersonalProgressCommand,
  type PersonalProgressState,
} from './progress_projection';

function isRecord(value: unknown): value is Readonly<Record<string, unknown>> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function commandFrom(operation: PersonalOperation): PersonalProgressCommand {
  if (!isRecord(operation.payload)) throw new Error('phone_state_progress_input_invalid');
  return operation.payload as PersonalProgressCommand;
}

function validProjection(value: unknown): boolean {
  if (!isRecord(value)) return false;
  return Number.isSafeInteger(value.totalXp)
    && (value.totalXp as number) >= 0
    && Number.isSafeInteger(value.level)
    && (value.level as number) >= 1
    && Number.isSafeInteger(value.weeklyXp)
    && (value.weeklyXp as number) >= 0
    && ['activityDates', 'completedLessons', 'passedExams', 'unlockedLessons']
      .every((key) => Array.isArray(value[key]) && (value[key] as unknown[]).every((item) => typeof item === 'string'))
    && isRecord(value.bestResults)
    && Object.values(value.bestResults).every((item) => typeof item === 'number' && Number.isFinite(item));
}

function validState(value: unknown): value is PersonalProgressState {
  return isRecord(value)
    && validProjection(value.projection)
    && Array.isArray(value.appliedEventIds)
    && value.appliedEventIds.every((item) => typeof item === 'string');
}

export function createPersonalProgressReducer(
  levelForXp: (totalXp: number) => number,
): DomainReducer<PersonalProgressState> {
  return Object.freeze({
    domain: 'progress',
    version: 1,
    initial: emptyPersonalProgressState,
    apply: (state, operation) => applyPersonalProgressCommand(
      state,
      commandFrom(operation),
      levelForXp,
    ).state,
    validate: validState,
  });
}
