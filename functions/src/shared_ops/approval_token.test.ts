import {
  APPROVAL_TTL_MS,
  buildApprovalToken,
  hashNonce,
  parseCallbackData,
  verifyApprovalToken,
} from './approval_token';

const NOW = 1_800_000_000_000;
const OWNER = { telegramUserId: '374480287', telegramChatId: '374480287' };

function token(over: Partial<Parameters<typeof buildApprovalToken>[0]> = {}) {
  return buildApprovalToken({
    nonce: 'a'.repeat(32),
    decisionHash: 'deadbeef',
    department: 'payments',
    action: 'approve',
    ownerTelegramUserId: OWNER.telegramUserId,
    ownerTelegramChatId: OWNER.telegramChatId,
    nowMs: NOW,
    ...over,
  });
}

describe('Jarvis approval token — a button press must prove who, what and when', () => {
  test('stores only the hash of the nonce, never the nonce itself', () => {
    const built = token();
    const serialized = JSON.stringify(built.doc);
    expect(serialized).not.toContain('a'.repeat(32));
    expect(built.doc.nonceHash).toBe(hashNonce('a'.repeat(32)));
  });

  test('the same nonce always hashes the same way, different nonces do not collide', () => {
    expect(hashNonce('abc')).toBe(hashNonce('abc'));
    expect(hashNonce('abc')).not.toBe(hashNonce('abd'));
  });

  test('expires within ten minutes, as the runbook requires', () => {
    expect(APPROVAL_TTL_MS).toBeLessThanOrEqual(10 * 60 * 1000);
    expect(token().doc.expiresAtMs).toBe(NOW + APPROVAL_TTL_MS);
  });

  test('accepts a press from the owner within the window', () => {
    const { doc } = token();
    const verdict = verifyApprovalToken({
      doc,
      nonce: 'a'.repeat(32),
      fromTelegramUserId: OWNER.telegramUserId,
      fromTelegramChatId: OWNER.telegramChatId,
      nowMs: NOW + 60_000,
    });
    expect(verdict.ok).toBe(true);
  });

  test('rejects a press from a different Telegram user', () => {
    const { doc } = token();
    const verdict = verifyApprovalToken({
      doc,
      nonce: 'a'.repeat(32),
      fromTelegramUserId: '999999',
      fromTelegramChatId: OWNER.telegramChatId,
      nowMs: NOW + 1000,
    });
    expect(verdict.ok).toBe(false);
    if (verdict.ok) throw new Error('ожидался отказ');
    expect(verdict.reason).toBe('wrong_user');
  });

  test('rejects a press forwarded into another chat', () => {
    const { doc } = token();
    const verdict = verifyApprovalToken({
      doc,
      nonce: 'a'.repeat(32),
      fromTelegramUserId: OWNER.telegramUserId,
      fromTelegramChatId: '-100500',
      nowMs: NOW + 1000,
    });
    expect(verdict.ok).toBe(false);
    if (verdict.ok) throw new Error('ожидался отказ');
    expect(verdict.reason).toBe('wrong_chat');
  });

  test('rejects an expired token', () => {
    const { doc } = token();
    const verdict = verifyApprovalToken({
      doc,
      nonce: 'a'.repeat(32),
      fromTelegramUserId: OWNER.telegramUserId,
      fromTelegramChatId: OWNER.telegramChatId,
      nowMs: NOW + APPROVAL_TTL_MS + 1,
    });
    expect(verdict.ok).toBe(false);
    if (verdict.ok) throw new Error('ожидался отказ');
    expect(verdict.reason).toBe('expired');
  });

  test('rejects a token that was already used — one press, one effect', () => {
    const { doc } = token();
    const used = { ...doc, usedAtMs: NOW + 5_000 };
    const verdict = verifyApprovalToken({
      doc: used,
      nonce: 'a'.repeat(32),
      fromTelegramUserId: OWNER.telegramUserId,
      fromTelegramChatId: OWNER.telegramChatId,
      nowMs: NOW + 6_000,
    });
    expect(verdict.ok).toBe(false);
    if (verdict.ok) throw new Error('ожидался отказ');
    expect(verdict.reason).toBe('already_used');
  });

  test('rejects a nonce that does not match the stored hash', () => {
    const { doc } = token();
    const verdict = verifyApprovalToken({
      doc,
      nonce: 'b'.repeat(32),
      fromTelegramUserId: OWNER.telegramUserId,
      fromTelegramChatId: OWNER.telegramChatId,
      nowMs: NOW + 1000,
    });
    expect(verdict.ok).toBe(false);
    if (verdict.ok) throw new Error('ожидался отказ');
    expect(verdict.reason).toBe('unknown_nonce');
  });

  test('parses the callback payload the buttons carry', () => {
    expect(parseCallbackData('jv1:a:abc123')).toEqual({ action: 'approve', nonce: 'abc123' });
    expect(parseCallbackData('jv1:r:abc123')).toEqual({ action: 'reject', nonce: 'abc123' });
  });

  test('refuses callback payloads of an unknown shape or version', () => {
    expect(parseCallbackData('ao1:a:abc')).toBeNull();
    expect(parseCallbackData('jv1:x:abc')).toBeNull();
    expect(parseCallbackData('garbage')).toBeNull();
    expect(parseCallbackData('jv1:a:')).toBeNull();
  });

  test('a nonce is long enough that guessing it is hopeless', () => {
    const { nonce } = token({ nonce: undefined as unknown as string });
    expect(nonce.length).toBeGreaterThanOrEqual(32);
  });
});
