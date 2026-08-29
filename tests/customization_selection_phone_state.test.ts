import { createHash } from 'node:crypto';
import {
  commitPhoneStateCustomizationSelection,
  configurePhoneStateEconomyBridge,
  readPhoneStateCustomizationSelection,
} from '../app/phone_state_economy_bridge';

const fingerprintPayload = {
  schemaVersion: 1,
  operationId: 'selection:user:phone-state',
  ownerStableId: 'account-a',
  lineage: 3,
  accountGeneration: 7,
  parentOperationId: null,
  revision: 1,
  source: 'user',
  occurrenceId: null,
  selection: {
    avatarValue: '44', frameId: 'frame-44', storedAuraSelection: 'aura-ember', level: 44,
  },
  createdAtMs: 105,
};
const operation = {
  schemaVersion: 'customization-selection-operation.v1' as const,
  operationId: fingerprintPayload.operationId,
  ownerStableId: fingerprintPayload.ownerStableId,
  lineage: fingerprintPayload.lineage,
  accountGeneration: fingerprintPayload.accountGeneration,
  parentOperationId: fingerprintPayload.parentOperationId,
  revision: fingerprintPayload.revision,
  source: fingerprintPayload.source as 'user',
  selection: fingerprintPayload.selection,
  createdAtMs: fingerprintPayload.createdAtMs,
  requestFingerprint: createHash('sha256').update(JSON.stringify(fingerprintPayload)).digest('hex'),
};

afterEach(() => configurePhoneStateEconomyBridge(null));

it('mirrors and reads the exact lineage-scoped customization selection composite', async () => {
  const commit = jest.fn(async () => ({ duplicate: false }));
  const readProjection = jest.fn(async () => ({ state: {
    receipts: {
      [operation.operationId]: {
        operationId: operation.operationId,
        delta: 0,
        grant: {
          kind: 'customization_selection_v1',
          entitlementId: operation.operationId,
          exactResult: operation,
        },
      },
    },
  } }));
  configurePhoneStateEconomyBridge({
    scope: { stableUid: 'account-a', accountGeneration: 3 }, runtimeGeneration: 7, deviceId: 'device-a',
    store: { commit, readProjection, replay: jest.fn() } as never,
    triggerSync: jest.fn(),
  });

  await expect(commitPhoneStateCustomizationSelection(operation)).resolves.toBe(true);
  expect(commit).toHaveBeenCalledWith(expect.objectContaining({
    stableUid: 'account-a', accountGeneration: 3, entityId: operation.operationId,
    payload: expect.objectContaining({
      delta: 0,
      grant: expect.objectContaining({ kind: 'customization_selection_v1' }),
    }),
  }), { idempotencyKey: `economy:${operation.operationId}` });
  await expect(readPhoneStateCustomizationSelection('account-a', 3)).resolves.toMatchObject({
    operationId: operation.operationId, revision: 1, selection: operation.selection,
  });
});

