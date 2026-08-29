import fs from 'fs';
import path from 'path';
import { HttpsError } from 'firebase-functions/v2/https';
import {
  adminVoiceMinuteGrantFingerprint,
  assertAdminVoiceMinuteGrantReplay,
  normalizeAdminVoiceMinuteGrantInput,
} from './admin_voice_minutes';

const validInput = {
  uid: 'stable-user_1',
  minutes: 45,
  reason: 'Компенсация после подтверждённой ошибки звонка',
  comment: 'Обращение support-42',
  idempotencyKey: 'voice-minutes-grant-1',
  requestId: 'voice-minutes-request-1',
};

describe('admin voice-minute grant command', () => {
  it('normalizes a bounded command and fingerprints every material field', () => {
    const input = normalizeAdminVoiceMinuteGrantInput(validInput);
    expect(input).toEqual(validInput);
    expect(adminVoiceMinuteGrantFingerprint(input)).toBe(JSON.stringify({
      action: 'grant_voice_minutes',
      uid: validInput.uid,
      minutes: validInput.minutes,
      reason: validInput.reason,
      comment: validInput.comment,
    }));
  });

  it.each([
    { ...validInput, uid: '../users' },
    { ...validInput, minutes: '45' },
    { ...validInput, minutes: 0 },
    { ...validInput, minutes: 10_001 },
    { ...validInput, minutes: 1.5 },
    { ...validInput, reason: '' },
    { ...validInput, idempotencyKey: '../reuse' },
    { ...validInput, requestId: '' },
  ])('rejects unsafe command %#', (unsafe) => {
    expect(() => normalizeAdminVoiceMinuteGrantInput(unsafe)).toThrow(HttpsError);
  });

  it('accepts an exact replay and rejects key reuse by another payload, actor, or action', () => {
    const fingerprint = adminVoiceMinuteGrantFingerprint(normalizeAdminVoiceMinuteGrantInput(validInput));
    expect(() => assertAdminVoiceMinuteGrantReplay({
      action: 'grant_voice_minutes', requestFingerprint: fingerprint, actorUid: 'admin-1',
    }, fingerprint, 'admin-1')).not.toThrow();
    expect(() => assertAdminVoiceMinuteGrantReplay({
      action: 'grant_voice_minutes', requestFingerprint: 'different', actorUid: 'admin-1',
    }, fingerprint, 'admin-1')).toThrow(HttpsError);
    expect(() => assertAdminVoiceMinuteGrantReplay({
      action: 'grant_voice_minutes', requestFingerprint: fingerprint, actorUid: 'admin-2',
    }, fingerprint, 'admin-1')).toThrow(HttpsError);
    expect(() => assertAdminVoiceMinuteGrantReplay({
      action: 'grant_reward', requestFingerprint: fingerprint, actorUid: 'admin-1',
    }, fingerprint, 'admin-1')).toThrow(HttpsError);
  });

  it('ships a protected canonical transaction that appends the immutable event and never mutates balances or Premium', () => {
    const source = fs.readFileSync(path.join(__dirname, 'admin_voice_minutes.ts'), 'utf8');
    const indexSource = fs.readFileSync(path.join(__dirname, 'index.ts'), 'utf8');
    expect(source).toContain('ADMIN_SENSITIVE_WRITE_OPTIONS');
    expect(source).toContain('requireAdminAppCheck(request);');
    expect(source).toContain("'money.manual_access.write'");
    expect(source).toContain('resolveCanonicalAdminAccessTarget(tx, db, input.uid)');
    expect(source).toContain('createVoiceMinuteAdminGrantEvent({');
    expect(source).toContain('appendVoiceMinuteEventInTransaction(tx, db, event)');
    expect(source).toContain("collection('admin_command_operations')");
    expect(source).toContain("collection('admin_log')");
    expect(source).not.toContain('premium_plan');
    expect(source).not.toContain('premium_expiry');
    expect(source).not.toContain('shards');
    expect(source).not.toMatch(/tx\.(?:set|update)\([^\n]*(?:voice_minute_wallets|grantedSeconds|availableSeconds)/);
    expect(indexSource).toContain('adminGrantVoiceMinutes');
  });
});
