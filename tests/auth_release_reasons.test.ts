/**
 * Коды причин аккаунтных потоков (шаг 3 RELEASE_LOGGING_R1_2026-10-13.md, помощник Ядра 4faca60d8).
 * зачем: релиз вырезает console.log — без этих кодов обращение не показывает, почему не вышло войти / сменить / удалить аккаунт.
 */
import fs from 'fs';
import path from 'path';

const calls: Array<[string, string, string]> = [];
jest.mock('../app/release_reason', () => {
  const actual = jest.requireActual('../app/release_reason');
  return {
    ...actual,
    releaseReason: (area: string, code: string, result: string = 'blocked') => { calls.push([area, code, result]); },
  };
});

import { isValidReleaseReasonCode } from '../app/release_reason';
import {
  releaseReasonForAuthEvent,
  reportAccountDeleteHandoffFailed,
  reportAccountDeleteHandoffThrew,
  reportSignInOutcome,
  reportSignInThrew,
} from '../app/auth_release_reasons';

const root = path.join(__dirname, '..');
const read = (rel: string) => fs.readFileSync(path.join(root, rel), 'utf8').replace(/\r\n/g, '\n');

beforeEach(() => { calls.length = 0; });

describe('reportSignInOutcome', () => {
  it('cancel by provider, refusals blocked, failures error, success silent', () => {
    reportSignInOutcome('google', { result: 'cancelled' });
    reportSignInOutcome('apple', { result: 'cancelled' });
    reportSignInOutcome('google', { result: 'error', error: 'account_delete_pending' });
    reportSignInOutcome('google', { result: 'error', error: 'firebase_unavailable' });
    reportSignInOutcome('apple', { result: 'error', error: 'account_switch_required' });
    reportSignInOutcome('google', { result: 'linked' });
    expect(calls).toEqual([
      ['auth', 'google_cancelled', 'blocked'],
      ['auth', 'apple_cancelled', 'blocked'],
      ['auth', 'account_delete_pending', 'blocked'],
      ['auth', 'firebase_unavailable', 'error'],
      ['account_switch', 'required', 'blocked'],
    ]);
  });

  it('never passes raw provider text: anything outside the schema becomes sign_in_failed', () => {
    reportSignInOutcome('google', { result: 'error', error: 'auth/network-request-failed' });
    reportSignInOutcome('google', { result: 'error', error: 'person@example.com' });
    reportSignInOutcome('google', { result: 'error', error: 'uid_1234567890abcdef1234' });
    expect(calls.map((c) => c[1])).toEqual(['sign_in_failed', 'sign_in_failed', 'sign_in_failed']);
    reportSignInThrew();
    expect(calls[3]).toEqual(['auth', 'sign_in_threw', 'error']);
  });
});

describe('releaseReasonForAuthEvent and delete handoff', () => {
  it('maps sign-out and delete analytics events; unknown events write nothing', () => {
    releaseReasonForAuthEvent('auth_signout_wipe_failed', { stage: 'backup', error: 'secret text' });
    releaseReasonForAuthEvent('auth_signout_wipe_sync_failed_aborted');
    releaseReasonForAuthEvent('auth_account_delete_enqueued');
    releaseReasonForAuthEvent('auth_account_delete_enqueue_failed');
    releaseReasonForAuthEvent('auth_account_delete_quarantined', { reason: 'firebase_signout_failed' });
    releaseReasonForAuthEvent('auth_account_delete_quarantined', { reason: 'guest_server_deletion_deferred' });
    releaseReasonForAuthEvent('auth_signin_linked', { provider: 'google' });
    expect(calls).toEqual([
      ['auth', 'sign_out_failed_backup', 'error'],
      ['auth', 'sign_out_sync_aborted', 'blocked'],
      ['account_delete', 'queued', 'info'],
      ['account_delete', 'enqueue_failed', 'error'],
      ['account_delete', 'firebase_signout_failed', 'error'],
      ['account_delete', 'guest_server_deletion_deferred', 'info'],
    ]);
    reportAccountDeleteHandoffFailed('pending_guard_persist_failed');
    reportAccountDeleteHandoffFailed('Some Error: text');
    reportAccountDeleteHandoffThrew();
    expect(calls.slice(6)).toEqual([
      ['account_delete', 'pending_guard_persist_failed', 'error'],
      ['account_delete', 'local_rejected', 'error'],
      ['account_delete', 'local_delete_threw', 'error'],
    ]);
  });

  it('every code produced here passes the journal schema (nothing silently dropped)', () => {
    releaseReasonForAuthEvent('auth_signout_wipe_failed', { stage: 'unknown' });
    releaseReasonForAuthEvent('auth_account_delete_lock_release_failed');
    reportSignInOutcome('google', { result: 'error', error: 'provider_handoff_recovery_required' });
    for (const [, code] of calls) expect(isValidReleaseReasonCode(code)).toBe(true);
  });
});

describe('wiring in account flows', () => {
  const literalCodes = (src: string) => [...src.matchAll(/releaseReason\('([a-z_]+)', '([a-z0-9_]+)'/g)].map((m) => m[2]);

  it('switch confirm and restore prompt: one line next to each refusal / failure log', () => {
    const sw = read('app/onboarding_account_switch_confirm.ts');
    expect((sw.match(/releaseReason\('account_switch', /g) ?? []).length).toBe(8);
    const restore = read('app/account_delete_restore_prompt.ts');
    // зачем (патч 6): + status_unavailable — статус удаления не получен и после тихих повторов.
    expect((restore.match(/releaseReason\('account_restore', /g) ?? []).length).toBe(4);
    expect(restore).toContain("choice === THEMED_ALERT_DISMISSED ? 'declined_back' : 'declined_button'");
    for (const code of [...literalCodes(sw), ...literalCodes(restore)]) expect(isValidReleaseReasonCode(code)).toBe(true);
  });

  it('sign-in screens, delete modal and logAuthEvent call the helpers', () => {
    const onboarding = read('components/CleanOnboarding.tsx');
    expect((onboarding.match(/reportSignInOutcome\(provider, result\);/g) ?? []).length).toBe(2);
    expect((onboarding.match(/reportSignInThrew\(\);/g) ?? []).length).toBe(2);
    const modal = read('components/RegistrationPromptModal.tsx');
    expect((modal.match(/reportSignInOutcome\(provider, result\);/g) ?? []).length).toBe(1);
    expect((modal.match(/reportSignInThrew\(\);/g) ?? []).length).toBe(1);
    const del = read('components/DeleteAccountConfirmModal.tsx');
    expect(del).toContain('reportAccountDeleteHandoffFailed(res.reason);');
    expect(del).toContain('reportAccountDeleteHandoffThrew();');
    const auth = read('app/auth_provider.ts');
    const fn = auth.slice(auth.indexOf('export function logAuthEvent('), auth.indexOf('export function logAuthEvent(') + 400);
    expect(fn).toContain('releaseReasonForAuthEvent(name, params);');
  });
});
