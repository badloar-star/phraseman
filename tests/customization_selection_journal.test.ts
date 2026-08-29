import {
  customizationSelectionHeadKey,
  customizationSelectionOperationKey,
  customizationSelectionOutboxKey,
  commitCustomizationSelection,
  drainCustomizationSelectionOutbox,
  resolveCustomizationSelectionAuthority,
  type CustomizationSelectionStorage,
} from '../app/customization_selection_journal';
import {
  __resetAccountGenerationForTests,
  beginAccountGeneration,
} from '../app/account_generation';

function memoryStorage(seed: Record<string, string> = {}): {
  values: Record<string, string>;
  api: CustomizationSelectionStorage;
} {
  const values = { ...seed };
  return {
    values,
    api: {
      getItem: jest.fn(async (key: string) => values[key] ?? null),
      multiGet: jest.fn(async (keys: readonly string[]) => keys.map((key) => [key, values[key] ?? null] as [string, string | null])),
      multiSet: jest.fn(async (pairs: readonly (readonly [string, string])[]) => {
        pairs.forEach(([key, value]) => { values[key] = value; });
      }),
      multiRemove: jest.fn(async (keys: readonly string[]) => {
        keys.forEach((key) => { delete values[key]; });
      }),
      getAllKeys: jest.fn(async () => Object.keys(values)),
    },
  };
}

const selection = {
  avatarValue: 'custom:custom-gen-73:aurora:black:avatar100-v1',
  frameId: 'frame-18',
  storedAuraSelection: 'aura-aurora',
  level: 18,
} as const;

beforeEach(() => {
  jest.clearAllMocks();
  __resetAccountGenerationForTests();
});

it('commits one immutable owner+lineage selection root, head, projections and durable mirror marker', async () => {
  const storage = memoryStorage();
  const token = beginAccountGeneration('owner-a');
  const mirror = jest.fn(async () => true);

  const result = await commitCustomizationSelection({
    token,
    operationId: 'selection:purchase:avatar-73',
    source: 'user',
    selection,
  }, {
    storage: storage.api,
    resolveLineage: jest.fn(async () => 7),
    mirror,
  });

  expect(result).toMatchObject({ duplicate: false, operation: {
    ownerStableId: 'owner-a', lineage: 7, revision: 1, parentOperationId: null,
    source: 'user', selection,
  } });
  expect(storage.values[customizationSelectionOperationKey('owner-a', 7, result.operation.operationId)])
    .toBe(JSON.stringify(result.operation));
  expect(JSON.parse(storage.values[customizationSelectionHeadKey('owner-a', 7)])).toMatchObject({
    operationId: result.operation.operationId,
    revision: 1,
  });
  expect(JSON.parse(storage.values[customizationSelectionOutboxKey('owner-a', 7)])).toEqual([
    result.operation.operationId,
  ]);
  expect(storage.values.user_avatar).toBe(selection.avatarValue);
  expect(storage.values.user_frame).toBe(selection.frameId);
  expect(storage.values.user_avatar_aura).toBe(selection.storedAuraSelection);

  // The local commit boundary never waits for or removes the detached mirror marker.
  expect(mirror).not.toHaveBeenCalled();
});

it('re-materializes a same-id immutable root left before head/projection publication', async () => {
  const storage = memoryStorage();
  const token = beginAccountGeneration('owner-a');
  const deps = { storage: storage.api, resolveLineage: jest.fn(async () => 7), mirror: jest.fn(async () => true) };
  const input = {
    token,
    operationId: 'selection:purchase:partial-root',
    source: 'user' as const,
    selection,
  };
  const first = await commitCustomizationSelection(input, deps);
  delete storage.values[customizationSelectionHeadKey('owner-a', 7)];
  delete storage.values[customizationSelectionOutboxKey('owner-a', 7)];
  delete storage.values.user_avatar;
  delete storage.values.user_frame;
  delete storage.values.user_avatar_aura;

  await expect(commitCustomizationSelection(input, deps)).resolves.toMatchObject({
    duplicate: true,
    operation: { operationId: first.operation.operationId },
  });
  expect(JSON.parse(storage.values[customizationSelectionHeadKey('owner-a', 7)])).toMatchObject({
    operationId: first.operation.operationId,
    revision: 1,
  });
  expect(JSON.parse(storage.values[customizationSelectionOutboxKey('owner-a', 7)]))
    .toEqual([first.operation.operationId]);
  expect(storage.values.user_avatar).toBe(selection.avatarValue);
  expect(storage.values.user_frame).toBe(selection.frameId);
  expect(storage.values.user_avatar_aura).toBe(selection.storedAuraSelection);
});

it('replays the same occurrence exactly once and a later user selection remains the head', async () => {
  const storage = memoryStorage();
  const token = beginAccountGeneration('owner-a');
  const deps = { storage: storage.api, resolveLineage: jest.fn(async () => 3), mirror: jest.fn(async () => true) };
  const occurrenceInput = {
    token,
    operationId: 'selection:league-chest:claim-123:aura',
    source: 'external' as const,
    occurrenceId: 'league-chest:claim-123:aura',
    selection,
  };
  const first = await commitCustomizationSelection(occurrenceInput, deps);
  const user = await commitCustomizationSelection({
    token,
    operationId: 'selection:user:after-chest',
    source: 'user',
    selection: { ...selection, storedAuraSelection: 'aura-ember' },
  }, deps);
  const replay = await commitCustomizationSelection(occurrenceInput, deps);

  expect(first.duplicate).toBe(false);
  expect(user.operation.revision).toBe(2);
  expect(replay).toMatchObject({ duplicate: true, operation: { operationId: first.operation.operationId } });
  expect(JSON.parse(storage.values[customizationSelectionHeadKey('owner-a', 3)])).toMatchObject({
    operationId: user.operation.operationId,
    revision: 2,
  });
  expect(storage.values.user_avatar_aura).toBe('aura-ember');
});

it.each([
  ['false', async () => false],
  ['throw', async () => { throw new Error('sqlite_busy'); }],
  ['hang', () => new Promise<boolean>(() => {})],
] as const)('retains the exact durable marker when PhoneState mirror returns %s', async (_label, mirror) => {
  const storage = memoryStorage();
  const token = beginAccountGeneration('owner-a');
  const committed = await commitCustomizationSelection({
    token, operationId: 'selection:user:mirror-retry', source: 'user', selection,
  }, { storage: storage.api, resolveLineage: async () => 4, mirror });

  await expect(drainCustomizationSelectionOutbox({ token, lineage: 4 }, {
    storage: storage.api,
    mirror,
    timeoutMs: 5,
  })).resolves.toEqual({ synced: 0, pending: 1 });
  expect(JSON.parse(storage.values[customizationSelectionOutboxKey('owner-a', 4)]))
    .toEqual([committed.operation.operationId]);
});

it('removes a mirror marker only after true and an unchanged owner generation + lineage', async () => {
  const storage = memoryStorage();
  const token = beginAccountGeneration('owner-a');
  const committed = await commitCustomizationSelection({
    token, operationId: 'selection:user:mirror-ok', source: 'user', selection,
  }, { storage: storage.api, resolveLineage: async () => 2, mirror: jest.fn() });
  const mirror = jest.fn(async () => true);

  await expect(drainCustomizationSelectionOutbox({ token, lineage: 2 }, {
    storage: storage.api, mirror, timeoutMs: 20,
  })).resolves.toEqual({ synced: 1, pending: 0 });
  expect(mirror).toHaveBeenCalledWith(committed.operation);
  expect(JSON.parse(storage.values[customizationSelectionOutboxKey('owner-a', 2)])).toEqual([]);
});

it('never drops a selection appended while an earlier mirror is in flight', async () => {
  const storage = memoryStorage();
  const token = beginAccountGeneration('owner-a');
  const deps = { storage: storage.api, resolveLineage: async () => 2, mirror: jest.fn() };
  const first = await commitCustomizationSelection({
    token, operationId: 'selection:user:first-in-flight', source: 'user', selection,
  }, deps);
  let releaseMirror: (() => void) | null = null;
  const mirror = jest.fn(() => new Promise<boolean>((resolve) => {
    releaseMirror = () => resolve(true);
  }));
  const draining = drainCustomizationSelectionOutbox({ token, lineage: 2 }, {
    storage: storage.api, mirror, timeoutMs: 100,
  });
  for (let turn = 0; turn < 12 && !releaseMirror; turn += 1) await Promise.resolve();
  const second = await commitCustomizationSelection({
    token,
    operationId: 'selection:user:second-in-flight',
    source: 'user',
    selection: { ...selection, storedAuraSelection: 'aura-second' },
  }, deps);
  expect(releaseMirror).not.toBeNull();
  releaseMirror?.();

  await expect(draining).resolves.toEqual({ synced: 1, pending: 1 });
  expect(JSON.parse(storage.values[customizationSelectionOutboxKey('owner-a', 2)])).toEqual([
    second.operation.operationId,
  ]);
  expect(first.operation.operationId).not.toBe(second.operation.operationId);
});

it('does not remove or touch another owner or lineage marker', async () => {
  const storage = memoryStorage();
  const tokenA = beginAccountGeneration('owner-a');
  await commitCustomizationSelection({
    token: tokenA, operationId: 'selection:user:owner-a', source: 'user', selection,
  }, { storage: storage.api, resolveLineage: async () => 1, mirror: jest.fn() });
  const oldOutbox = storage.values[customizationSelectionOutboxKey('owner-a', 1)];
  const tokenB = beginAccountGeneration('owner-b');

  await expect(drainCustomizationSelectionOutbox({ token: tokenB, lineage: 2 }, {
    storage: storage.api, mirror: jest.fn(async () => true), timeoutMs: 20,
  })).resolves.toEqual({ synced: 0, pending: 0 });
  expect(storage.values[customizationSelectionOutboxKey('owner-a', 1)]).toBe(oldOutbox);
});

it('restores the higher-revision PhoneState winner before stale raw cloud and seeds legacy only once', async () => {
  const storage = memoryStorage({
    user_avatar: '18', user_frame: 'frame-18', user_avatar_aura: 'aura-stale-cloud',
  });
  const token = beginAccountGeneration('owner-a');
  await commitCustomizationSelection({
    token, operationId: 'selection:user:local', source: 'user', selection,
  }, { storage: storage.api, resolveLineage: async () => 6, mirror: jest.fn() });
  const remote = memoryStorage();
  await commitCustomizationSelection({
    token, operationId: 'selection:user:phone-base', source: 'user', selection,
  }, { storage: remote.api, resolveLineage: async () => 6, mirror: jest.fn() });
  const phoneWinner = (await commitCustomizationSelection({
    token,
    operationId: 'selection:user:phone-newer',
    source: 'user',
    selection: { ...selection, avatarValue: '44', frameId: 'frame-44', storedAuraSelection: 'aura-phone' },
  }, { storage: remote.api, resolveLineage: async () => 6, mirror: jest.fn() })).operation;

  const resolved = await resolveCustomizationSelectionAuthority({
    token,
    cloudSelection: { avatarValue: '3', frameId: 'frame-3', storedAuraSelection: 'aura-cloud', level: 3 },
  }, {
    storage: storage.api,
    resolveLineage: async () => 6,
    readPhoneState: jest.fn(async () => phoneWinner),
    mirror: jest.fn(),
  });

  expect(resolved.selection).toEqual(phoneWinner.selection);
  expect(storage.values.user_avatar).toBe('44');
  expect(storage.values.user_frame).toBe('frame-44');
  expect(storage.values.user_avatar_aura).toBe('aura-phone');
  expect(JSON.parse(storage.values[customizationSelectionHeadKey('owner-a', 6)])).toMatchObject({
    operationId: phoneWinner.operationId, revision: 2,
  });
});

it('continues locally after adopting a PhoneState head whose earlier roots live on another device', async () => {
  const token = beginAccountGeneration('owner-a');
  const remote = memoryStorage();
  let phoneWinner!: Awaited<ReturnType<typeof commitCustomizationSelection>>['operation'];
  for (let revision = 1; revision <= 5; revision += 1) {
    phoneWinner = (await commitCustomizationSelection({
      token,
      operationId: `selection:user:remote-${revision}`,
      source: 'user',
      selection: { ...selection, storedAuraSelection: `aura-remote-${revision}` },
    }, { storage: remote.api, resolveLineage: async () => 8, mirror: jest.fn() })).operation;
  }
  const isolated = memoryStorage();
  await resolveCustomizationSelectionAuthority({
    token,
    cloudSelection: { avatarValue: '3', frameId: 'frame-3', storedAuraSelection: null, level: 3 },
  }, {
    storage: isolated.api,
    resolveLineage: async () => 8,
    readPhoneState: async () => phoneWinner,
    mirror: jest.fn(),
  });

  await expect(commitCustomizationSelection({
    token,
    operationId: 'selection:user:after-remote-head',
    source: 'user',
    selection: { ...selection, storedAuraSelection: 'aura-local-newer' },
  }, { storage: isolated.api, resolveLineage: async () => 8, mirror: jest.fn() }))
    .resolves.toMatchObject({ operation: { revision: 6, parentOperationId: phoneWinner.operationId } });
});

it('creates one deterministic legacy migration only when no journal or PhoneState selection exists', async () => {
  const storage = memoryStorage({ user_avatar: '18', user_frame: 'frame-18', user_avatar_aura: 'aura-local' });
  const token = beginAccountGeneration('owner-a');
  const deps = {
    storage: storage.api,
    resolveLineage: async () => 9,
    readPhoneState: jest.fn(async () => null),
    mirror: jest.fn(),
  };
  const first = await resolveCustomizationSelectionAuthority({
    token,
    cloudSelection: { avatarValue: '3', frameId: 'frame-3', storedAuraSelection: 'aura-cloud', level: 3 },
  }, deps);
  const second = await resolveCustomizationSelectionAuthority({
    token,
    cloudSelection: { avatarValue: '4', frameId: 'frame-4', storedAuraSelection: 'aura-new-cloud', level: 4 },
  }, deps);

  expect(first.operation.operationId).toBe('customization_legacy_v1');
  expect(first.selection).toMatchObject({ avatarValue: '18', frameId: 'frame-18', storedAuraSelection: 'aura-local' });
  expect(second.operation.operationId).toBe(first.operation.operationId);
  expect(second.selection).toEqual(first.selection);
  expect(Object.keys(storage.values).filter((key) => key.includes('customization_selection_operation_v1'))).toHaveLength(1);
});

it('keeps a newer local head over stale PhoneState and raw cloud mirrors', async () => {
  const storage = memoryStorage();
  const remote = memoryStorage();
  const token = beginAccountGeneration('owner-a');
  const stalePhone = (await commitCustomizationSelection({
    token, operationId: 'selection:user:stale-phone', source: 'user', selection,
  }, { storage: remote.api, resolveLineage: async () => 11, mirror: jest.fn() })).operation;
  await commitCustomizationSelection({
    token, operationId: 'selection:user:local-base', source: 'user', selection,
  }, { storage: storage.api, resolveLineage: async () => 11, mirror: jest.fn() });
  const localHead = (await commitCustomizationSelection({
    token,
    operationId: 'selection:user:local-newer',
    source: 'user',
    selection: { ...selection, avatarValue: '88', frameId: 'frame-88', storedAuraSelection: 'aura-local' },
  }, { storage: storage.api, resolveLineage: async () => 11, mirror: jest.fn() })).operation;

  const resolved = await resolveCustomizationSelectionAuthority({
    token,
    cloudSelection: { avatarValue: '2', frameId: 'frame-2', storedAuraSelection: 'aura-cloud', level: 2 },
  }, {
    storage: storage.api,
    resolveLineage: async () => 11,
    readPhoneState: async () => stalePhone,
    mirror: jest.fn(),
  });

  expect(resolved.operationId).toBe(localHead.operationId);
  expect(storage.values.user_avatar).toBe('88');
  expect(storage.values.user_frame).toBe('frame-88');
  expect(storage.values.user_avatar_aura).toBe('aura-local');
});

it('excludes a PhoneState selection from an old persistent lineage', async () => {
  const storage = memoryStorage();
  const remote = memoryStorage();
  const token = beginAccountGeneration('owner-a');
  const oldLineage = (await commitCustomizationSelection({
    token, operationId: 'selection:user:old-lineage', source: 'user', selection,
  }, { storage: remote.api, resolveLineage: async () => 12, mirror: jest.fn() })).operation;

  const resolved = await resolveCustomizationSelectionAuthority({
    token,
    cloudSelection: { avatarValue: '3', frameId: 'frame-3', storedAuraSelection: null, level: 3 },
  }, {
    storage: storage.api,
    resolveLineage: async () => 13,
    readPhoneState: async () => oldLineage,
    mirror: jest.fn(),
  });

  expect(resolved.operationId).toBe('customization_legacy_v1');
  expect(resolved.lineage).toBe(13);
  expect(resolved.selection.avatarValue).toBe('3');
});
