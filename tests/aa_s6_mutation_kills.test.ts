import {
  parseAccountId,
  parseDeviceId,
  parseOperationId,
  parseSessionId,
} from '../modules/account-authority-v2/account_authority_ids';
import {
  evaluatePreservedDomainCommit,
  initialAccountAuthorityState,
  reduceAccountAuthorityState,
  type AccountAuthorityEvent,
} from '../modules/account-authority-v2/account_authority_reducer';
import { accountAuthorityGeneration } from '../modules/account-authority-v2/account_authority_contract';

/*
 * AA S6: тесты, добавленные по выжившим мутантам (ручное мутационное
 * тестирование, отчёт — в пакете docs/work/tasks/aa-s6-scenario-matrix-mutations-2026-10-04.md).
 * Каждый тест назван по мутанту, которого он убивает.
 */

const deviceId = parseDeviceId('device-01');
const accountA = parseAccountId('account-a');
const sessionA = parseSessionId('session-a');
const sessionB = parseSessionId('session-b');
const attemptA = parseOperationId('attempt-a');
const attemptB = parseOperationId('attempt-b');

function event<T extends AccountAuthorityEvent>(value: T): T { return value; }

function authenticated() {
  const base = initialAccountAuthorityState(deviceId);
  const started = reduceAccountAuthorityState(base, event({ type: 'authentication_started', attemptId: attemptA })).state;
  return reduceAccountAuthorityState(started, event({
    type: 'authenticated', accountId: accountA, sessionId: sessionA,
    expectedGeneration: started.generation, expectedAttemptId: attemptA,
  })).state;
}

describe('AA-S6 убийцы выживших мутантов: reducer', () => {
  test('RD1: поздний «authenticated» со старым поколением игнорируется', () => {
    const started = reduceAccountAuthorityState(initialAccountAuthorityState(deviceId), event({
      type: 'authentication_started', attemptId: attemptA,
    })).state;
    const stale = reduceAccountAuthorityState(started, event({
      type: 'authenticated', accountId: accountA, sessionId: sessionA,
      expectedGeneration: accountAuthorityGeneration(started.generation.value + 7), expectedAttemptId: attemptA,
    }));
    expect(stale.state).toBe(started);
    expect(stale.result).toBeUndefined();
  });

  test('RD3: отмена ЧУЖОЙ попытки входа не трогает текущую', () => {
    const started = reduceAccountAuthorityState(initialAccountAuthorityState(deviceId), event({
      type: 'authentication_started', attemptId: attemptA,
    })).state;
    const other = reduceAccountAuthorityState(started, event({ type: 'provider_cancelled', attemptId: attemptB }));
    expect(other.state).toBe(started);
    expect(other.result).toBeUndefined();
  });

  test('RD4: вытеснение с устаревшим поколением не сбрасывает живую сессию', () => {
    const live = authenticated();
    const late = reduceAccountAuthorityState(live, event({
      type: 'device_taken_over', revokedSessionId: sessionA,
      expectedGeneration: accountAuthorityGeneration(live.generation.value + 1),
    }));
    expect(late.state).toBe(live);
    expect(late.result).toBeUndefined();
  });

  test('RD5: вытеснение во время входа срабатывает по удерживаемой прежней сессии', () => {
    const live = authenticated();
    const switching = reduceAccountAuthorityState(live, event({ type: 'authentication_started', attemptId: attemptB })).state;
    const taken = reduceAccountAuthorityState(switching, event({
      type: 'device_taken_over', revokedSessionId: sessionA, expectedGeneration: switching.generation,
    }));
    expect(taken.result).toMatchObject({ type: 'device_taken_over' });
    const notOurs = reduceAccountAuthorityState(switching, event({
      type: 'device_taken_over', revokedSessionId: sessionB, expectedGeneration: switching.generation,
    }));
    expect(notOurs.state).toBe(switching);
  });

  test('RD7: запись того же аккаунта, но другой сессии — stale_session', () => {
    const live = authenticated();
    expect(evaluatePreservedDomainCommit(live, {
      type: 'commit_preserved_domain', operationId: parseOperationId('write-1'),
      accountId: accountA, sessionId: sessionB, expectedGeneration: live.generation, domain: 'lesson_progress',
    })).toMatchObject({ type: 'rejected', reason: 'stale_session' });
  });
});
