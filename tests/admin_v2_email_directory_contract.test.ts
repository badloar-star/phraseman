import fs from 'fs';
import path from 'path';

const root = process.cwd();
const core = fs.readFileSync(path.join(root, 'admin/v2/scripts/admin-core.js'), 'utf8');
const firebase = fs.readFileSync(path.join(root, 'admin/v2/scripts/admin-firebase.js'), 'utf8');
const capabilities = fs.readFileSync(path.join(root, 'admin/v2/scripts/admin-capabilities.js'), 'utf8');

describe('Admin v2 native email directory', () => {
  test('uses protected callables and never reads contact PII directly', () => {
    expect(firebase).toContain("httpsCallable(functionsUs, 'adminListEmailContacts')");
    expect(firebase).toContain("httpsCallable(functionsUs, 'adminExportEmailContacts')");
    expect(firebase).not.toContain("collection(db, 'email_contacts')");
    expect(firebase).not.toContain("collection(db, 'web_premium_orders')");
  });

  test('has a native contacts route with source, eligibility and suppression filters', () => {
    expect(core).toContain("emails: { title: 'Email-контакты'");
    expect(core).toContain('function renderEmails()');
    expect(core).toContain('data-email-source');
    expect(core).toContain('data-email-eligibility');
    expect(core).toContain('data-email-suppression');
    expect(core).toContain('email-directory-query');
    expect(core).toContain('Причина экспорта');
    expect(core).toContain('data-action="export-email-directory"');
  });

  test('routes the legacy capability to the native screen without exposing direct send', () => {
    expect(capabilities).toContain("'emails': 'emails'");
    expect(core).toContain("renderers = {");
    expect(core).toContain("emails: renderEmails");
    expect(core).not.toContain('data-action="send-email-campaign"');
  });

  test('provides the protected preview, second-admin approval, queue and cancellation workflow', () => {
    for (const callable of [
      'adminPreviewEmailCampaign',
      'adminRequestEmailCampaignApproval',
      'adminApproveEmailCampaign',
      'adminCreateEmailCampaign',
      'adminListEmailCampaigns',
      'adminCancelEmailCampaign',
    ]) expect(firebase).toContain(`httpsCallable(functionsUs, '${callable}')`);
    expect(core).toContain('data-action="preview-email-campaign"');
    expect(core).toContain('data-action="request-email-approval"');
    expect(core).toContain('data-action="approve-email-campaign"');
    expect(core).toContain('data-action="publish-approved-email"');
    expect(core).toContain('data-action="cancel-email-campaign"');
    expect(core).toContain('phraseman_admin_email_operation_');
    expect(core).toContain('accepted_by_provider');
    expect(core).toContain('approval.content?.text');
    expect(core).toContain('Полный неизменяемый текст письма');
    expect(core).toContain('JSON.stringify(approval.audience');
  });
});
