import fs from 'node:fs';
import path from 'node:path';

const core = fs.readFileSync(path.resolve(__dirname, '..', 'admin', 'v2', 'scripts', 'admin-core.js'), 'utf8');
const firebase = fs.readFileSync(path.resolve(__dirname, '..', 'admin', 'v2', 'scripts', 'admin-firebase.js'), 'utf8');
const server = fs.readFileSync(path.resolve(__dirname, '..', 'functions', 'src', 'support_inbox.ts'), 'utf8');
const legacy = fs.readFileSync(path.resolve(__dirname, '..', 'admin', 'index.html'), 'utf8');

describe('Admin v2 support mail surface', () => {
  test('keeps support inside the existing control plane and exposes protected actions', () => {
    expect(core).toContain("support: { title: 'Почта поддержки'");
    expect(firebase).toContain("httpsCallable(functionsUs, 'adminSupportList')");
    expect(firebase).toContain("httpsCallable(functionsUs, 'adminSupportPull')");
    expect(firebase).toContain("httpsCallable(functionsUs, 'adminSupportGenerateReply')");
    expect(firebase).toContain("httpsCallable(functionsUs, 'adminSupportPrepareReply')");
    expect(firebase).toContain("httpsCallable(functionsUs, 'adminSupportDispatchReply')");
    expect(firebase).toContain("httpsCallable(functionsUs, 'adminSupportCancelReply')");
    expect(firebase).toContain("httpsCallable(functionsUs, 'adminSupportPrepareReplyBatch')");
    expect(firebase).toContain("httpsCallable(functionsUs, 'adminSupportDispatchReplyBatch')");
    expect(firebase).toContain("httpsCallable(functionsUs, 'adminSupportCancelReplyBatch')");
    expect(firebase).toContain("httpsCallable(functionsUs, 'adminSupportSaveSignature')");
    expect(firebase).toContain("httpsCallable(functionsUs, 'adminSupportSetStatus')");
    expect(firebase).toContain("httpsCallable(functionsUs, 'adminWebsiteInboxList')");
    expect(firebase).toContain("httpsCallable(functionsUs, 'adminWebsiteInboxMarkRead')");
    expect(core).toContain('generate-support-reply');
    expect(core).toContain('prepare-support-reply');
    expect(core).toContain('dispatch-support-reply');
    expect(core).toContain('cancel-support-reply');
    expect(core).toContain('prepare-support-reply-batch');
    expect(core).toContain('dispatch-support-reply-batch');
    expect(core).toContain('expectedDraftRevision');
    expect(core).toContain('confirmationNonce');
    expect(core).toContain('save-support-signature');
    expect(core).toContain('set-support-status');
    expect(core).toContain('load-website-inbox');
    expect(core).toContain('preview-website-inbox-read');
    expect(core).toContain('confirm-website-inbox-read');
    expect(core).toContain('Обращения с сайта');
    expect(server).toContain('const [snap, signatureConfig] = await Promise.all([');
    expect(server).toContain('signature: signatureConfig.signature');
    expect(server).toContain('pendingReplies,');
    expect(server).toContain('pendingBatches,');
    expect(server).toContain('export const adminWebsiteInboxList');
    expect(server).toContain('export const adminWebsiteInboxMarkRead');
    expect(server).toContain("collection('website_contact_inbox')");
    expect(server).toContain("action: 'support.website.read'");
    expect(core).toContain('function applySupportListResult(result)');
    expect(core).toContain('admin/index.html#gmail-support');
    expect(legacy).toContain("supportCallable('adminSupportPrepareReplyBatch')");
    expect(legacy).toContain('_supportPendingReplies');
    expect(legacy).toContain('_supportPendingBatches');
    expect(legacy).toContain('window.supportResolveUnknown');
    expect(legacy).toContain("['prepared', 'dispatching', 'attention_required', 'partial'].includes(item.state)");
    expect(legacy).toContain('escapeHtml(prepared.manifestHash');
    expect(legacy).not.toContain('esc(prepared.manifestHash');
  });

  test('does not reintroduce direct client reads of private support_inbox', () => {
    expect(firebase).not.toContain("collection(db, 'support_inbox')");
  });
});
