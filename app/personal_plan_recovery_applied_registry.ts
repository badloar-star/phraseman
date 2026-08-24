import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  captureAccountGeneration,
  isCurrentAccountGeneration,
  withAccountTransitionLock,
  type AccountGenerationToken,
} from './account_generation';

import {
  writePlanRecoveryActions,
  type PlanRecoveryWriteOptions,
  type PlanRecoveryWriteResult,
} from './personal_plan_recovery_write_adapter';
import type { PlanRecoveryAction } from './personal_plan_recovery_actions';

const PLAN_RECOVERY_APPLIED_ACTIONS_STORAGE_KEY = 'personal_plan_recovery_applied_actions_v1';

type AppliedActionRegistry = Record<string, string[]>;

function cleanPlanInstanceId(planInstanceId: string): string {
  return planInstanceId.trim();
}

function parseRegistry(raw: string | null): AppliedActionRegistry {
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {};

    const registry: AppliedActionRegistry = {};
    for (const [instanceId, ids] of Object.entries(parsed)) {
      if (!Array.isArray(ids)) continue;
      const cleanIds = ids
        .filter((id): id is string => typeof id === 'string')
        .map((id) => id.trim())
        .filter(Boolean);
      if (cleanIds.length > 0) registry[instanceId] = [...new Set(cleanIds)];
    }
    return registry;
  } catch {
    return {};
  }
}

async function readRegistry(): Promise<AppliedActionRegistry> {
  return parseRegistry(await AsyncStorage.getItem(PLAN_RECOVERY_APPLIED_ACTIONS_STORAGE_KEY));
}

async function writeRegistry(registry: AppliedActionRegistry): Promise<void> {
  await AsyncStorage.setItem(PLAN_RECOVERY_APPLIED_ACTIONS_STORAGE_KEY, JSON.stringify(registry));
}

export function personalPlanRecoveryAppliedActionsStorageKey(): string {
  return PLAN_RECOVERY_APPLIED_ACTIONS_STORAGE_KEY;
}

function assertCurrentAccountGeneration(generation: AccountGenerationToken): void {
  if (!isCurrentAccountGeneration(generation)) {
    throw new Error('stale_account_generation');
  }
}

async function listAppliedPlanRecoveryActionIdsForGeneration(
  planInstanceId: string,
  generation: AccountGenerationToken,
): Promise<string[]> {
  const instanceId = cleanPlanInstanceId(planInstanceId);
  if (!instanceId) return [];
  return withAccountTransitionLock(async () => {
    assertCurrentAccountGeneration(generation);
    const registry = await readRegistry();
    assertCurrentAccountGeneration(generation);
    return registry[instanceId] ?? [];
  });
}

export async function listAppliedPlanRecoveryActionIds(planInstanceId: string): Promise<string[]> {
  const generation = captureAccountGeneration();
  return listAppliedPlanRecoveryActionIdsForGeneration(planInstanceId, generation);
}

async function addAppliedPlanRecoveryActionIdsForGeneration(
  planInstanceId: string,
  actionIds: string[],
  generation: AccountGenerationToken,
): Promise<string[]> {
  const instanceId = cleanPlanInstanceId(planInstanceId);
  if (!instanceId) return [];

  return withAccountTransitionLock(async () => {
    assertCurrentAccountGeneration(generation);
    const registry = await readRegistry();
    assertCurrentAccountGeneration(generation);
    const nextIds = [
      ...(registry[instanceId] ?? []),
      ...actionIds.map((id) => id.trim()).filter(Boolean),
    ];
    const uniqueIds = [...new Set(nextIds)];
    await writeRegistry({
      ...registry,
      [instanceId]: uniqueIds,
    });
    return uniqueIds;
  });
}

export async function addAppliedPlanRecoveryActionIds(
  planInstanceId: string,
  actionIds: string[],
): Promise<string[]> {
  const generation = captureAccountGeneration();
  return addAppliedPlanRecoveryActionIdsForGeneration(planInstanceId, actionIds, generation);
}

export async function clearAppliedPlanRecoveryActionIds(planInstanceId: string): Promise<void> {
  const generation = captureAccountGeneration();
  const instanceId = cleanPlanInstanceId(planInstanceId);
  await withAccountTransitionLock(async () => {
    assertCurrentAccountGeneration(generation);
    const registry = await readRegistry();
    assertCurrentAccountGeneration(generation);
    if (!instanceId) {
      await writeRegistry({});
      return;
    }

    const remaining = Object.fromEntries(
      Object.entries(registry).filter(([key]) => key !== instanceId),
    );
    await writeRegistry(remaining);
  });
}

export type RegisteredPlanRecoveryWriteOptions = Omit<PlanRecoveryWriteOptions, 'appliedActionIds' | 'currentPlanInstanceId'>;

export async function writePlanRecoveryActionsWithRegistry(
  planInstanceId: string,
  actions: PlanRecoveryAction[],
  options: RegisteredPlanRecoveryWriteOptions = {},
): Promise<PlanRecoveryWriteResult[]> {
  const generation = captureAccountGeneration();
  const instanceId = cleanPlanInstanceId(planInstanceId);
  const appliedActionIds = await listAppliedPlanRecoveryActionIdsForGeneration(instanceId, generation);
  const results = await writePlanRecoveryActions(actions, {
    ...options,
    currentPlanInstanceId: instanceId,
    appliedActionIds,
  });

  if (options.mode === 'apply') {
    const appliedIds = results
      .filter((result) => result.status === 'applied')
      .map((result) => result.actionId);
    if (appliedIds.length > 0) {
      await addAppliedPlanRecoveryActionIdsForGeneration(instanceId, appliedIds, generation);
    }
  }

  return results;
}
