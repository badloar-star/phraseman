import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(__dirname, '..');

describe('support inbox server-read boundary', () => {
  test('admin inbox uses the protected callable instead of a direct client collection read', () => {
    const adminHtml = fs.readFileSync(path.join(root, 'admin', 'index.html'), 'utf8');
    expect(adminHtml).toContain("supportCallable('adminSupportList')({ limit: 500 })");
    expect(adminHtml).not.toContain("collection(db, 'support_inbox')");
    expect(adminHtml).not.toContain("getDoc(doc(db, 'admin_config', 'support_inbox'))");
  });

  test('the callable is exported and requires the support read permission', () => {
    const source = fs.readFileSync(path.join(root, 'functions', 'src', 'support_inbox.ts'), 'utf8');
    const index = fs.readFileSync(path.join(root, 'functions', 'src', 'index.ts'), 'utf8');
    expect(source).toContain('export const adminSupportList = onCall(');
    expect(source).toContain("requireSupportPermission(request, 'support.inbox.read')");
    expect(index).toContain('  adminSupportList,');
  });

  test('reply delivery uses the sealed prepare and dispatch callables', () => {
    const source = fs.readFileSync(path.join(root, 'functions', 'src', 'support_inbox.ts'), 'utf8');
    const index = fs.readFileSync(path.join(root, 'functions', 'src', 'index.ts'), 'utf8');
    expect(source).toContain('export const adminSupportPrepareReply = onCall(');
    expect(source).toContain('export const adminSupportDispatchReply = onCall(');
    expect(source).toContain("state: 'delivery_unknown'");
    expect(source).toContain("'X-Phraseman-Operation-Id': operationId");
    expect(source).toContain('legacyDocIdForMessageId(raw.messageId)');
    expect(source).toContain('legacyMatchesMessage');
    expect(source).toContain('existing.exists || legacyMatchesMessage');
    expect(index).toContain('  adminSupportPrepareReply,');
    expect(index).toContain('  adminSupportDispatchReply,');
    expect(index).toContain('  adminSupportPrepareReplyBatch,');
    expect(index).toContain('  adminSupportDispatchReplyBatch,');
    expect(index).toContain('supportReplyDispatchSweeperCron');
  });

  test('prepare replays before mutable draft checks and batch terminal states are guarded', () => {
    const source = fs.readFileSync(path.join(root, 'functions', 'src', 'support_inbox.ts'), 'utf8');
    const replayIndex = source.indexOf('if (commandSnap.exists) {', source.indexOf('async function prepareSupportReplyOperation'));
    const draftCheckIndex = source.indexOf('draft_changed_reload_before_sending', source.indexOf('async function prepareSupportReplyOperation'));
    expect(replayIndex).toBeGreaterThan(0);
    expect(replayIndex).toBeLessThan(draftCheckIndex);
    expect(source).toContain('isSupportReplyBatchDispatchableState(fresh.state)');
    expect(source).toContain("if (!['dispatching', 'attention_required', 'partial'].includes(beforeState))");
    expect(source).toContain('imapUidValidity: fetched.uidValidity');
    expect(source).toContain('imapFailedUids: nextFailedUids');
  });
});
