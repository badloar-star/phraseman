import AsyncStorage from '@react-native-async-storage/async-storage';

import {
  __resetAccountGenerationForTests,
  beginAccountGeneration,
} from '../app/account_generation';
import {
  acknowledgeEnergySessionStart,
  commitEnergySessionStart,
  createEnergySessionIntent,
  readEnergySessionStartStatus,
  refundEnergySessionStart,
  type EnergySessionProjection,
} from '../app/energy_session_operation_ledger';

const projection = (nowMs: number): EnergySessionProjection => ({
  schemaVersion: 2,
  baseEnergy: 100,
  bonusEnergy: 0,
  bonusCapacity: 0,
  bonusExpiresAt: 0,
  refundCredit: 0,
  lastSettledAt: nowMs,
  recoveryCreditMicrounits: 0,
  recoveryDivisionRemainder: 0,
  maxEnergy: 100,
});

beforeEach(async () => {
  await AsyncStorage.clear();
  __resetAccountGenerationForTests();
});

test('read-only status follows an existing debit through durable ACK without changing its format', async () => {
  const token = beginAccountGeneration('account-a');
  const intent = createEnergySessionIntent('flashcards_swipe', 'saved', 'attempt-1');
  const opening = projection(Date.now());
  await expect(commitEnergySessionStart(intent, 20, opening, 'boot:test', { accountToken: token }))
    .resolves.toEqual(expect.objectContaining({ status: 'applied' }));
  await expect(readEnergySessionStartStatus(intent.operationId, token)).resolves.toEqual({ status: 'charged' });

  await expect(acknowledgeEnergySessionStart(intent.operationId, token)).resolves.toBe(true);
  await expect(readEnergySessionStartStatus(intent.operationId, token)).resolves.toEqual({ status: 'acknowledged' });
});

test('read-only status recognizes the existing idempotent refund operation', async () => {
  const token = beginAccountGeneration('account-a');
  const intent = createEnergySessionIntent('flashcards_recall', 'saved', 'attempt-2');
  const opening = projection(Date.now());
  const debit = await commitEnergySessionStart(intent, 20, opening, 'boot:test', { accountToken: token });
  if (debit.status !== 'applied') throw new Error(`unexpected debit: ${debit.status}`);
  await expect(refundEnergySessionStart(
    intent.operationId,
    'entry_cancelled',
    debit.projection,
    'boot:test',
    { accountToken: token },
  )).resolves.toEqual(expect.objectContaining({ status: 'applied' }));

  await expect(readEnergySessionStartStatus(intent.operationId, token)).resolves.toEqual({ status: 'refunded' });
});

test('ACK refuses an existing refund under the shared account and storage lock', async () => {
  const token = beginAccountGeneration('account-a');
  const intent = createEnergySessionIntent('flashcards_speaking', 'saved', 'attempt-conflict');
  const opening = projection(Date.now());
  const debit = await commitEnergySessionStart(intent, 20, opening, 'boot:test', { accountToken: token });
  if (debit.status !== 'applied') throw new Error(`unexpected debit: ${debit.status}`);
  await refundEnergySessionStart(
    intent.operationId,
    'entry_cancelled',
    debit.projection,
    'boot:test',
    { accountToken: token },
  );
  await expect(acknowledgeEnergySessionStart(intent.operationId, token)).resolves.toBe(false);

  await expect(readEnergySessionStartStatus(intent.operationId, token)).resolves.toEqual({ status: 'refunded' });
});

test('concurrent ACK and refund create exactly one terminal outcome, never both', async () => {
  const token = beginAccountGeneration('account-a');
  const intent = createEnergySessionIntent('flashcards_blitz', 'saved', 'attempt-race');
  const opening = projection(Date.now());
  const debit = await commitEnergySessionStart(intent, 20, opening, 'boot:test', { accountToken: token });
  if (debit.status !== 'applied') throw new Error(`unexpected debit: ${debit.status}`);

  const [acknowledged, refunded] = await Promise.all([
    acknowledgeEnergySessionStart(intent.operationId, token),
    refundEnergySessionStart(
      intent.operationId,
      'entry_cancelled',
      debit.projection,
      'boot:test',
      { accountToken: token },
    ),
  ]);
  const status = await readEnergySessionStartStatus(intent.operationId, token);

  expect([status.status]).toEqual(expect.arrayContaining([
    acknowledged ? 'acknowledged' : 'refunded',
  ]));
  expect(status.status === 'acknowledged' || status.status === 'refunded').toBe(true);
  expect(acknowledged && (refunded.status === 'applied' || refunded.status === 'already-applied')).toBe(false);
});
