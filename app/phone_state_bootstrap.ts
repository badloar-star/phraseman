import type { AccountGenerationToken, PhoneStateAccountContext } from './account_generation';
import {
  isCurrentAccountGeneration,
  resolvePhoneStateAccountContext,
} from './account_generation';
import { retirePhoneStateLineageAfterDeletion } from '../modules/phone-state/account_secret';

export type PhoneStateBootstrapSession = Readonly<{
  context: PhoneStateAccountContext;
  close(): Promise<void>;
}>;

export type PhoneStateBootstrapDependencies = Readonly<{
  resolveAuthoritativeStableUid(localStableUid: string): Promise<string>;
  resolveAccountContext(
    stableUid: string,
    runtimeToken: AccountGenerationToken,
  ): Promise<PhoneStateAccountContext>;
  isRuntimeTokenCurrent(runtimeToken: AccountGenerationToken, localStableUid: string): boolean;
  openAccount(context: PhoneStateAccountContext): Promise<PhoneStateBootstrapSession>;
  importLegacy(session: PhoneStateBootstrapSession): Promise<void>;
  compareShadow?(session: PhoneStateBootstrapSession): Promise<void>;
  installDormantSync(session: PhoneStateBootstrapSession): Promise<void>;
}>;

export type PhoneStateBootstrapLifecycle = Readonly<{
  bootstrap(input: Readonly<{
    localStableUid: string;
    runtimeToken: AccountGenerationToken;
  }>): Promise<PhoneStateBootstrapSession>;
  closeActive(): Promise<void>;
}>;

export function createPhoneStateBootstrapLifecycle(
  dependencies: PhoneStateBootstrapDependencies,
): PhoneStateBootstrapLifecycle {
  let active: PhoneStateBootstrapSession | null = null;
  let tail: Promise<void> = Promise.resolve();

  const serialized = async <T>(work: () => Promise<T>): Promise<T> => {
    const previous = tail;
    let release!: () => void;
    tail = new Promise<void>((resolve) => { release = resolve; });
    await previous;
    try {
      return await work();
    } finally {
      release();
    }
  };

  const bootstrap: PhoneStateBootstrapLifecycle['bootstrap'] = (input) => serialized(async () => {
    const authoritativeStableUid = (await dependencies.resolveAuthoritativeStableUid(
      input.localStableUid,
    )).trim();
    if (!authoritativeStableUid) throw new Error('phone_state_identity_unresolved');
    if (!dependencies.isRuntimeTokenCurrent(input.runtimeToken, input.localStableUid)) {
      throw new Error('phone_state_generation_stale');
    }
    const context = await dependencies.resolveAccountContext(
      authoritativeStableUid,
      input.runtimeToken,
    );
    if (!dependencies.isRuntimeTokenCurrent(input.runtimeToken, input.localStableUid)) {
      throw new Error('phone_state_generation_stale');
    }
    if (
      active
      && active.context.stableUid === context.stableUid
      && active.context.lineage === context.lineage
    ) {
      return active;
    }
    if (active) {
      await active.close();
      active = null;
    }
    const opened = await dependencies.openAccount(context);
    if (!dependencies.isRuntimeTokenCurrent(input.runtimeToken, input.localStableUid)) {
      await opened.close();
      throw new Error('phone_state_generation_stale');
    }
    try {
      await dependencies.importLegacy(opened);
      if (!dependencies.isRuntimeTokenCurrent(input.runtimeToken, input.localStableUid)) {
        throw new Error('phone_state_generation_stale');
      }
      await dependencies.compareShadow?.(opened);
      if (!dependencies.isRuntimeTokenCurrent(input.runtimeToken, input.localStableUid)) {
        throw new Error('phone_state_generation_stale');
      }
      await dependencies.installDormantSync(opened);
      if (!dependencies.isRuntimeTokenCurrent(input.runtimeToken, input.localStableUid)) {
        throw new Error('phone_state_generation_stale');
      }
      active = opened;
      return opened;
    } catch (error) {
      await opened.close();
      throw error;
    }
  });

  const closeActive = (): Promise<void> => serialized(async () => {
    const closing = active;
    active = null;
    if (closing) await closing.close();
  });

  return Object.freeze({ bootstrap, closeActive });
}

let configuredLifecycle: PhoneStateBootstrapLifecycle | null = null;

export function configurePhoneStateBootstrapRuntime(
  dependencies: PhoneStateBootstrapDependencies | null,
): void {
  const previous = configuredLifecycle;
  configuredLifecycle = dependencies ? createPhoneStateBootstrapLifecycle(dependencies) : null;
  if (previous) void previous.closeActive().catch(() => {});
}

export async function bootstrapPhoneState(input: Readonly<{
  stableUid: string;
  runtimeToken: AccountGenerationToken;
}>): Promise<boolean> {
  const lifecycle = configuredLifecycle;
  if (!lifecycle) return false;
  await lifecycle.bootstrap({ localStableUid: input.stableUid, runtimeToken: input.runtimeToken });
  return true;
}

export async function closePhoneStateBeforeLocalWipe(): Promise<void> {
  await configuredLifecycle?.closeActive();
}

export async function retirePhoneStateAfterDeletion(stableUid: string): Promise<void> {
  await closePhoneStateBeforeLocalWipe();
  await retirePhoneStateLineageAfterDeletion(stableUid);
}

export const defaultPhoneStateBootstrapDependencies = Object.freeze({
  resolveAuthoritativeStableUid: async (stableUid: string) => stableUid,
  resolveAccountContext: resolvePhoneStateAccountContext,
  isRuntimeTokenCurrent: (
    runtimeToken: AccountGenerationToken,
    stableUid: string,
  ) => isCurrentAccountGeneration(runtimeToken, stableUid),
});
