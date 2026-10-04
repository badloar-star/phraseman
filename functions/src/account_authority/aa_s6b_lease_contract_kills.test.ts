import {
  asAccountId,
  asDeviceId,
  asFirebaseAuthUid,
  asOperationId,
  asProviderSubject,
  asSessionId,
  asTenantId,
  createEmptyAccountLeaseState,
  releaseActiveAccountLease,
  startOrRenewAccountLease,
  type AccountLeaseState,
} from './lease_contract';

/*
 * AA S6b: точечные тесты по мутантам контракта аренды, выжившим на прежних
 * наборах (LC1, LC4, LC5, LC8, LC9, LC12). Каждый тест назван по мутанту.
 */

const ACCOUNT = asAccountId('account-a');
const TENANT = asTenantId('tenant-a');
const DEVICE_1 = asDeviceId('device-1');
const DEVICE_2 = asDeviceId('device-2');
const NO_RETIRED = Object.freeze({ isRetired: () => false });

function principal(authEpoch: number) {
  return Object.freeze({
    accountId: ACCOUNT,
    tenantId: TENANT,
    firebaseAuthUid: asFirebaseAuthUid('firebase-a'),
    providerSubject: asProviderSubject('provider-a'),
    authEpoch,
  });
}

function acquire(
  state: AccountLeaseState,
  input: Readonly<{ device: typeof DEVICE_1; session: string; op: string; epoch: number; revision: number; now: number }>,
) {
  return startOrRenewAccountLease(state, {
    principal: principal(input.epoch),
    deviceId: input.device,
    sessionId: asSessionId(input.session),
    operationId: asOperationId(input.op),
    expectedRevision: input.revision,
    serverNowMs: input.now,
  }, NO_RETIRED);
}

function firstLease(epoch = 10, now = 2_000) {
  return acquire(createEmptyAccountLeaseState(ACCOUNT, TENANT), {
    device: DEVICE_1, session: 'session-1', op: 'op-1', epoch, revision: 0, now,
  });
}

describe('AA-S6b убийцы выживших мутантов: контракт аренды', () => {
  test('LC1: часы сервера назад — clock_rollback, состояние не меняется', () => {
    const { state } = firstLease(10, 2_000);
    expect(() => acquire(state, { device: DEVICE_1, session: 'session-1', op: 'op-2', epoch: 10, revision: state.revision, now: 1_000 }))
      .toThrow('clock_rollback');
  });

  test('LC4: продление той же аренды с более старой эпохой привязки — stale_auth_epoch', () => {
    const { state } = firstLease(10);
    expect(() => acquire(state, { device: DEVICE_1, session: 'session-1', op: 'op-2', epoch: 9, revision: state.revision, now: 3_000 }))
      .toThrow('stale_auth_epoch');
  });

  test('LC5: другое устройство с эпохой РАВНОЙ последней — stale_auth_epoch (граница <=)', () => {
    const { state } = firstLease(10);
    expect(() => acquire(state, { device: DEVICE_2, session: 'session-2', op: 'op-2', epoch: 10, revision: state.revision, now: 3_000 }))
      .toThrow('stale_auth_epoch');
    expect(acquire(state, { device: DEVICE_2, session: 'session-2', op: 'op-3', epoch: 11, revision: state.revision, now: 3_000 }).result)
      .toMatchObject({ type: 'acquired' });
  });

  test('LC8: повтор той же операции с ДРУГОГО устройства — operation_reused, а не чужая квитанция', () => {
    const { state } = firstLease(10);
    expect(() => acquire(state, { device: DEVICE_2, session: 'session-1', op: 'op-1', epoch: 10, revision: 0, now: 3_000 }))
      .toThrow('operation_reused');
  });

  test('LC9: выход с устаревшей ревизией — revision_mismatch, аренда цела', () => {
    const { state } = firstLease(10);
    expect(() => releaseActiveAccountLease(state, {
      accountId: ACCOUNT, tenantId: TENANT, deviceId: DEVICE_1, sessionId: asSessionId('session-1'),
      operationId: asOperationId('release-1'), expectedRevision: state.revision - 1, serverNowMs: 3_000,
    }, NO_RETIRED)).toThrow('revision_mismatch');
  });

  test('LC12: последняя эпоха не убывает даже при несогласованном сохранённом состоянии', () => {
    const { state } = firstLease(5);
    // Хранилище несогласовано (последняя эпоха выше эпохи активной аренды) —
    // продление не должно опускать отметку, иначе старая привязка снова «свежая».
    const skewed: AccountLeaseState = Object.freeze({ ...state, latestAuthEpoch: 9 });
    const renewed = acquire(skewed, { device: DEVICE_1, session: 'session-1', op: 'op-2', epoch: 6, revision: skewed.revision, now: 3_000 });
    expect(renewed.result.type).toBe('renewed');
    expect(renewed.state.latestAuthEpoch).toBe(9);
  });
});
