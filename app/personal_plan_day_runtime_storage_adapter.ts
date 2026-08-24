import type { PersonalPlanId } from './personal_plan_catalog';
import {
  parsePlanDayRuntimePersistedState,
  planDayRuntimeStateBelongsToInstance,
  serializePlanDayRuntimePersistedState,
  validatePlanDayRuntimePersistedState,
  type PlanDayRuntimePersistedStateIssue,
  type PlanDayRuntimePersistedStateV1,
} from './personal_plan_day_runtime_persistence_contract';
import {
  commitPhoneStatePracticeRegister,
  readOrImportPhoneStatePracticeRegister,
} from './phone_state_practice_bridge';

export type PlanDayRuntimeStorageLike = {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
  removeItem(key: string): Promise<void>;
};

export type PlanDayRuntimeStorageKeyInput = {
  planInstanceId: string;
  planId: PersonalPlanId;
  dayIndex: number;
};

export type PlanDayRuntimeStorageReadyResult = {
  status: 'ready';
  key: string;
};

export type PlanDayRuntimeStorageLoadResult =
  | {
    status: 'ready';
    state: PlanDayRuntimePersistedStateV1;
  }
  | {
    status: 'empty';
  }
  | {
    status: 'blocked';
    issues: Array<PlanDayRuntimePersistedStateIssue | 'invalid_json' | 'invalid_shape' | 'plan_instance_mismatch'>;
  };

export type PlanDayRuntimeStorageAdapter = {
  save(state: PlanDayRuntimePersistedStateV1): Promise<PlanDayRuntimeStorageReadyResult | {
    status: 'blocked';
    issues: PlanDayRuntimePersistedStateIssue[];
  }>;
  load(input: PlanDayRuntimeStorageKeyInput): Promise<PlanDayRuntimeStorageLoadResult>;
  reset(input: PlanDayRuntimeStorageKeyInput): Promise<PlanDayRuntimeStorageReadyResult>;
};

function cleanKeyPart(value: string): string {
  return value.trim().replace(/[^a-zA-Z0-9_-]/g, '_');
}

export function buildPlanDayRuntimeStorageKey(
  input: PlanDayRuntimeStorageKeyInput,
): string {
  return [
    'personal_plan_day_runtime_v1',
    cleanKeyPart(input.planInstanceId),
    input.planId,
    input.dayIndex,
  ].join(':');
}

export function createPlanDayRuntimeStorageAdapter(
  storage: PlanDayRuntimeStorageLike,
): PlanDayRuntimeStorageAdapter {
  return {
    async save(state) {
      const issues = validatePlanDayRuntimePersistedState(state);
      if (issues.length > 0) {
        return {
          status: 'blocked',
          issues,
        };
      }

      const key = buildPlanDayRuntimeStorageKey({
        planInstanceId: state.planInstanceId,
        planId: state.planId,
        dayIndex: state.dayIndex,
      });
      await commitPhoneStatePracticeRegister(`day_runtime:${key}`, state);
      await storage.setItem(key, serializePlanDayRuntimePersistedState(state));

      return {
        status: 'ready',
        key,
      };
    },

    async load(input) {
      const key = buildPlanDayRuntimeStorageKey(input);
      const raw = await storage.getItem(key);
      if (!raw) {
        return {
          status: 'empty',
        };
      }

      const legacyParsed = parsePlanDayRuntimePersistedState(raw);
      const projected = legacyParsed.status === 'ready'
        ? await readOrImportPhoneStatePracticeRegister(`day_runtime:${key}`, legacyParsed.state)
        : null;
      const parsed = projected === null
        ? legacyParsed
        : parsePlanDayRuntimePersistedState(serializePlanDayRuntimePersistedState(projected));
      if (parsed.status !== 'ready') {
        return parsed;
      }
      if (!planDayRuntimeStateBelongsToInstance(parsed.state, input.planInstanceId)) {
        return {
          status: 'blocked',
          issues: ['plan_instance_mismatch'],
        };
      }

      return {
        status: 'ready',
        state: parsed.state,
      };
    },

    async reset(input) {
      const key = buildPlanDayRuntimeStorageKey(input);
      await commitPhoneStatePracticeRegister(`day_runtime:${key}`, null);
      await storage.removeItem(key);

      return {
        status: 'ready',
        key,
      };
    },
  };
}
