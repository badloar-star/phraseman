import { readFileSync } from 'fs';
import path from 'path';

const root = process.cwd();

describe('admin emails surface', () => {
  const adminHtml = readFileSync(path.join(root, 'admin/index.html'), 'utf8');
  const webCheckout = readFileSync(path.join(root, 'functions/src/web_checkout.ts'), 'utf8');
  const authIdentity = readFileSync(path.join(root, 'functions/src/auth_identity.ts'), 'utf8');
  const emailContacts = readFileSync(path.join(root, 'functions/src/email_contacts.ts'), 'utf8');
  const adminEmail = readFileSync(path.join(root, 'functions/src/admin_email.ts'), 'utf8');
  const functionsIndex = readFileSync(path.join(root, 'functions/src/index.ts'), 'utf8');

  test('admin has a dedicated emails tab with app/site segments and copy action', () => {
    expect(adminHtml).toContain('id="tab-emails"');
    expect(adminHtml).toContain("switchTab('emails')");
    expect(adminHtml).toContain("setAdminEmailSource('all')");
    expect(adminHtml).toContain("setAdminEmailSource('app')");
    expect(adminHtml).toContain("setAdminEmailSource('site')");
    expect(adminHtml).toContain('copyAdminEmailList');
    expect(adminHtml).toContain('syncAdminEmailContactsBackfill');
    expect(adminHtml).toContain("httpsCallable(functionsUs, 'adminEmailContactsBackfill')");
    expect(adminHtml).toContain('Скопировать все');
  });

  test('admin email list merges app and site sources while hiding Apple private relay from app segment', () => {
    expect(adminHtml).toContain('email_contacts');
    expect(adminHtml).toContain('web_premium_orders');
    expect(adminHtml).toContain('website_contact_inbox');
    expect(adminHtml).toContain('@privaterelay.appleid.com');
    expect(adminHtml).toContain('adminEmailIsApplePrivateRelay');
    expect(adminHtml).toContain('appLastStableId');
    expect(adminHtml).toContain('appLastSignInAt');
  });

  test('mass email uses a server callable instead of exposing provider credentials in the browser', () => {
    expect(adminHtml).toContain("httpsCallable(functionsUs, 'adminEmailBroadcast')");
    expect(adminHtml).toContain('getAdminEmailBroadcastCallable');
    expect(adminHtml).toContain('sendAdminEmailCampaign');
    expect(adminHtml).not.toContain('api.resend.com/emails');
  });

  test('web checkout sends activation email and persists site emails', () => {
    expect(webCheckout).toContain("defineString('RESEND_API_KEY'");
    expect(webCheckout).toContain('sendActivationEmail');
    expect(webCheckout).toContain('handlePaidOrderSideEffects');
    expect(webCheckout).toContain('customerEmailSentAt');
    expect(webCheckout).toContain('email_contacts');
    expect(webCheckout).toContain('upsertEmailContact');
    expect(webCheckout).toContain("from './email_contacts'");
  });

  test('app sign-in persists visible provider emails into the shared contact collection', () => {
    expect(authIdentity).toContain("from './email_contacts'");
    expect(authIdentity).toContain('upsertEmailContact(db, {');
    expect(authIdentity).toContain("source: 'app'");
    expect(emailContacts).toContain('email_contacts');
    expect(emailContacts).toContain('@privaterelay.appleid.com');
    expect(emailContacts).toContain('isApplePrivateRelayEmail');
  });

  test('admin can backfill old app and site emails server-side', () => {
    expect(adminEmail).toContain('adminEmailContactsBackfill');
    expect(adminEmail).toContain("collectionName: 'users'");
    expect(adminEmail).toContain("collectionName: 'auth_links'");
    expect(adminEmail).toContain("collectionName: 'web_premium_orders'");
    expect(adminEmail).toContain("collectionName: 'website_contact_inbox'");
    expect(adminEmail).toContain("source: 'app'");
    expect(adminEmail).toContain("source: 'site'");
  });

  test('admin email functions are exported', () => {
    expect(functionsIndex).toContain("export { adminEmailBroadcast, adminEmailContactsBackfill } from './admin_email';");
  });
});
