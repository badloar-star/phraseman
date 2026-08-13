import { buildApprovalToken } from './jarvis/approval_token';
import {
  buildSupportTelegramReviewPreview,
  formatSupportTelegramReview,
  parseSupportReviewApprovalToken,
  supportDraftHash,
  supportEditSessionId,
  supportTelegramJobLeaseOwns,
  supportReviewTokenDepartment,
} from './support_telegram_review';

const MESSAGE_ID = `m_${'a'.repeat(64)}`;

describe('support Telegram review contract', () => {
  test('button token binds action to exact message, revision and draft hash', () => {
    const hash = supportDraftHash('Ответ пользователю');
    const built = buildApprovalToken({
      nonce: 'n'.repeat(32), decisionHash: hash.slice(0, 32),
      department: supportReviewTokenDepartment(MESSAGE_ID, 7), action: 'approve',
      ownerTelegramUserId: '1', ownerTelegramChatId: '1', nowMs: 1000,
    });
    expect(parseSupportReviewApprovalToken(built.doc)).toEqual({
      messageDocId: MESSAGE_ID, draftRevision: 7, action: 'send', draftHashPrefix: hash.slice(0, 32),
    });
  });

  test('reject action means request owner edits, never delete or send', () => {
    const built = buildApprovalToken({
      nonce: 'n'.repeat(32), decisionHash: 'a'.repeat(32),
      department: supportReviewTokenDepartment(MESSAGE_ID, 2), action: 'reject',
      ownerTelegramUserId: '1', ownerTelegramChatId: '1', nowMs: 1000,
    });
    expect(parseSupportReviewApprovalToken(built.doc)?.action).toBe('edit');
  });

  test('preview omits the subject and escapes the complete sealed body', () => {
    const text = formatSupportTelegramReview({ subject: '<Problem>', draftReply: 'Use <Settings>.', draftRevision: 1 });
    expect(text).not.toContain('Problem');
    expect(text).toContain('&lt;Settings&gt;');
  });

  test('edit session id is stable but does not expose Telegram ids', () => {
    const id = supportEditSessionId('374480287', '374480287');
    expect(id).toMatch(/^[a-f0-9]{64}$/);
    expect(id).not.toContain('374480287');
  });

  test('never puts an approval button behind hidden or sensitive bytes', () => {
    expect(buildSupportTelegramReviewPreview({ finalText: `${'A'.repeat(3000)}\npassword: secret`, draftRevision: 4 })).toMatchObject({ approvable: false });
    expect(buildSupportTelegramReviewPreview({ finalText: 'Write to learner@example.com', draftRevision: 4 })).toMatchObject({ approvable: false });
  });

  test('never offers approval or auto-send for an ungrounded or internal reply', () => {
    expect(buildSupportTelegramReviewPreview({
      finalText: 'В доступном снимке продукта не нашлось достаточно надёжных фактов.',
      draftRevision: 5,
      customerReady: false,
      customerIssue: 'Куда делся Компас?',
    })).toMatchObject({ approvable: false, violations: expect.arrayContaining(['internal_process_language']) });
    expect(buildSupportTelegramReviewPreview({
      finalText: 'Здравствуйте! Здесь нужна ручная проверка.',
      draftRevision: 5,
      customerReady: false,
    })).toMatchObject({ approvable: false });
  });

  test('a stale worker cannot settle a job after a newer lease reclaims it', () => {
    const reclaimed = {
      action: 'send' as const,
      state: 'processing' as const,
      reviewId: 'review', messageDocId: 'message', draftRevision: 1,
      createdAtMs: 1, updatedAtMs: 2, leaseId: 'worker-b', leaseExpiresAtMs: 3,
    };
    expect(supportTelegramJobLeaseOwns(reclaimed, 'worker-a')).toBe(false);
    expect(supportTelegramJobLeaseOwns(reclaimed, 'worker-b')).toBe(true);
    expect(supportTelegramJobLeaseOwns({ ...reclaimed, state: 'accepted' }, 'worker-b')).toBe(false);
  });
});
