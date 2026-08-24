import {
  __resetAccountGenerationForTests,
  beginAccountGeneration,
  type PhoneStateAccountContext,
} from '../app/account_generation';
import {
  createPhoneStateBootstrapLifecycle,
  type PhoneStateBootstrapSession,
} from '../app/phone_state_bootstrap';

afterEach(() => __resetAccountGenerationForTests());

function accountBootstrapHarness(input: Readonly<{
  localStableUid?: string;
  providerStableUid?: string;
  stableUid?: string;
}>) {
  const initial = input.stableUid ?? input.localStableUid ?? 'anon-A';
  const provider = input.providerStableUid ?? initial;
  const queues = new Map<string, string[]>();
  const opened: string[] = [];
  const imported = new Map<string, string[]>();
  let requestedUid = initial;

  const lifecycle = createPhoneStateBootstrapLifecycle({
    resolveAuthoritativeStableUid: async () => provider === input.providerStableUid ? provider : requestedUid,
    resolveAccountContext: async (stableUid, runtimeToken): Promise<PhoneStateAccountContext> => ({
      stableUid,
      lineage: 1,
      runtimeToken,
    }),
    isRuntimeTokenCurrent: (runtimeToken) => runtimeToken.stableId === requestedUid,
    openAccount: async (context): Promise<PhoneStateBootstrapSession> => {
      opened.push(context.stableUid);
      queues.set(context.stableUid, queues.get(context.stableUid) ?? []);
      return {
        context,
        close: async () => {},
      };
    },
    importLegacy: async (session) => {
      imported.set(session.context.stableUid, [`${session.context.stableUid}:imported`]);
    },
    installDormantSync: async () => {},
  });

  const bootstrap = async () => {
    const token = beginAccountGeneration(requestedUid);
    await lifecycle.bootstrap({ localStableUid: requestedUid, runtimeToken: token });
  };
  return {
    bootstrap,
    openedScopes: () => [...opened],
    importedKeysFrom: (stableUid: string) => imported.get(stableUid) ?? [],
    appendPending: async () => { queues.set(requestedUid, [...(queues.get(requestedUid) ?? []), 'pending-1']); },
    switchTo: async (stableUid: string) => {
      requestedUid = stableUid;
      await bootstrap();
    },
    visibleOperations: (stableUid: string) => stableUid === requestedUid ? [...(queues.get(stableUid) ?? [])] : [],
    pendingOperations: (stableUid: string) => [...(queues.get(stableUid) ?? [])],
  };
}

test('provider-linked stableUid is resolved before any import', async () => {
  const harness = accountBootstrapHarness({ localStableUid: 'anon-A', providerStableUid: 'account-B' });
  await harness.bootstrap();
  expect(harness.openedScopes()).toEqual(['account-B']);
  expect(harness.importedKeysFrom('anon-A')).toEqual([]);
});

test('logout closes but preserves the owner queue and blocks the next account', async () => {
  const harness = accountBootstrapHarness({ stableUid: 'account-A' });
  await harness.bootstrap();
  await harness.appendPending();
  await harness.switchTo('account-B');
  expect(harness.visibleOperations('account-B')).toEqual([]);
  await harness.switchTo('account-A');
  expect(harness.pendingOperations('account-A')).toHaveLength(1);
});
