import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const html = fs.readFileSync(path.join(root, 'admin/v2/legacy.html'), 'utf8');
const rules = fs.readFileSync(path.join(root, 'firestore.rules'), 'utf8');
const server = fs.readFileSync(path.join(root, 'functions/src/admin_global_broadcast.ts'), 'utf8');
const jarvis = fs.readFileSync(path.join(root, 'functions/src/jarvis/jarvis_data_contract_guard.test.ts'), 'utf8');
const functionsPackage = JSON.parse(fs.readFileSync(path.join(root, 'functions/package.json'), 'utf8')) as {
  scripts: Record<string, string>;
};
const appBroadcast = fs.readFileSync(path.join(root, 'app/global_broadcast_modal.ts'), 'utf8');
const publicServer = fs.readFileSync(path.join(root, 'functions/src/global_broadcast_public.ts'), 'utf8');

function block(start: string, end: string): string {
  const from = html.indexOf(start);
  const to = html.indexOf(end, from + start.length);
  expect(from).toBeGreaterThanOrEqual(0);
  expect(to).toBeGreaterThan(from);
  return html.slice(from, to);
}

describe('Admin D2 post-review security and truth contracts', () => {
  test('global broadcast browser reads and writes are denied while the app uses the safe callable projection', () => {
    const explicitStart = rules.indexOf('match /global_broadcast_modals/{docId}');
    const explicitEnd = rules.indexOf('\n    }', explicitStart);
    const explicit = rules.slice(explicitStart, explicitEnd);
    const catchAll = rules.slice(rules.indexOf('match /{collection}/{document=**}'));
    expect(explicit).toContain('allow read, create, update, delete: if false;');
    expect(catchAll).toContain('!isServerOwnedSupportRoot(collection)');
    expect(rules).toMatch(/function isServerOwnedSupportRoot\(collection\)[\s\S]*\(admin_command_operations\|global_broadcast_modals\)/);
    expect(rules).not.toContain('function globalBroadcastHasNoAdminMetadata');
    expect(jarvis).toContain("collection: 'global_broadcast_modals'");
    expect(appBroadcast).toContain("'globalBroadcastListActive'");
    expect(appBroadcast).not.toContain("'global_broadcast_modals'");
    expect(publicServer).toContain('inspectGlobalBroadcastPublicAuthority');
    expect(publicServer).toContain('PUBLIC_GLOBAL_BROADCAST_FIELDS');
    expect(functionsPackage.scripts['deploy:admin-global-broadcast-rules-after-scrub']).toContain('firestore:rules');
  });

  test('global broadcast privacy scrub is owner-only, audited, cursor-bounded, and deployed in safe stages', () => {
    const index = fs.readFileSync(path.join(root, 'functions/src/index.ts'), 'utf8');
    expect(server).toContain('FORBIDDEN_GLOBAL_BROADCAST_METADATA_FIELDS');
    expect(server).toContain("role !== 'owner'");
    expect(server).toContain("action: 'global_broadcast_metadata_scrub'");
    expect(server).toContain("orderBy(admin.firestore.FieldPath.documentId())");
    expect(server).toContain('limit(input.limit + 1)');
    expect(server).toContain('admin.firestore.FieldValue.delete()');
    expect(server).toContain('unknownKeys');
    expect(server).toContain('blockedUnknownCount');
    expect(server).toContain('sourceHealth');
    expect(server).not.toMatch(/tx\.update\(active\.ref,[\s\S]{0,500}(?:replacedBy|replacementOperationId|deactivatedBy|deactivationOperationId)/);
    expect(index).toContain('adminScrubGlobalBroadcastMetadata');
    expect(index).toContain('adminVerifyGlobalBroadcastPrivacyReadiness');
    const stageFunctions = functionsPackage.scripts['deploy:admin-global-broadcast-stage-functions'];
    const stageRules = functionsPackage.scripts['deploy:admin-global-broadcast-rules-after-scrub'];
    expect(stageFunctions).toContain('functions:adminScrubGlobalBroadcastMetadata');
    expect(stageFunctions).toContain('functions:adminVerifyGlobalBroadcastPrivacyReadiness');
    expect(stageFunctions).toContain('functions:globalBroadcastClaim');
    expect(stageFunctions).toContain('functions:globalBroadcastListActive');
    expect(stageFunctions).toContain('functions:flashcardPackGiftGrantGlobalBroadcast');
    expect(stageFunctions).toContain('hosting:admin');
    expect(stageFunctions).not.toContain('firestore:rules');
    expect(stageRules).toContain('firestore:rules');
    expect(stageRules).not.toContain('functions:');
    expect(functionsPackage.scripts['deploy:admin-global-broadcast']).not.toContain('firestore:rules');
    const ui = block('let _fnAdminListGlobalBroadcasts', 'const VIP_SURVEY_ID');
    expect(ui).toContain("httpsCallable(functionsUs, 'adminScrubGlobalBroadcastMetadata')");
    expect(ui).toContain("httpsCallable(functionsUs, 'adminVerifyGlobalBroadcastPrivacyReadiness')");
    expect(ui).toContain("action === 'scrub'");
    expect(ui).toContain("claims.adminRole || 'owner'");
    expect(ui).toContain("prompt('Причина privacy scrub");
    expect(ui).toContain('showConfirmModal({');
    expect(ui).toContain('adminRunGlobalBroadcastPrivacyScrub');
    expect(ui).not.toContain('let verifyCursor = null');
    expect(ui).toContain('verificationReceipt');
    expect(ui).toContain('blockedUnknownCount');
    expect(ui).toContain('неизвестные поля');
    expect(ui).toContain('Rules остаются заблокированы до подтверждения client floor');
    expect(ui).not.toContain('теперь можно отдельно публиковать Firestore Rules');
    expect(server).toContain("action: 'global_broadcast_scrub_cursor'");
    expect(server).toContain('pageQuery.startAfter(cursorAfterDocumentId)');
    expect(server).not.toContain('pageQuery.startAfter(input.cursor)');
    expect(server).toContain("receiptType: 'global_broadcast_privacy_final_v1'");
    expect(server).toContain("scope: 'aggregate'");
    expect(server).toContain('GLOBAL_BROADCAST_FINAL_VERIFY_CAP + 1');
  });

  test('broadcast checkpoint is durable, PII-free, actor-safe, and cleared only after a server receipt', () => {
    const ui = block('let _fnAdminListGlobalBroadcasts', 'const VIP_SURVEY_ID');
    expect(ui).toContain("GLOBAL_BROADCAST_CHECKPOINT_KEY = 'pm_admin_global_broadcast_operations_v1'");
    expect(ui).toContain('GLOBAL_BROADCAST_CHECKPOINT_LIMIT');
    expect(ui).toContain("crypto.subtle.digest('SHA-256'");
    expect(ui).toContain('payloadFingerprint');
    expect(ui).toContain('resolveGlobalBroadcastCheckpoints');
    expect(ui).toContain('operationIds');
    expect(ui).toContain("status === 'conflict'");
    expect(ui).toContain('clearGlobalBroadcastCheckpointAfterReceipt');
    expect(ui).not.toMatch(/checkpoint[^\n]{0,120}(?:uid|email|titles|messages|reason)/i);
    const publish = ui.slice(ui.indexOf('window.sendGlobalBroadcastModal'));
    expect(ui).toContain('persistGlobalBroadcastCheckpoint');
    expect(publish.indexOf('prepareGlobalBroadcastCheckpoint')).toBeGreaterThanOrEqual(0);
    expect(publish.indexOf('prepareGlobalBroadcastCheckpoint')).toBeLessThan(publish.indexOf('getAdminPublishGlobalBroadcastCallable()'));
    expect(publish.indexOf('clearGlobalBroadcastCheckpointAfterReceipt')).toBeGreaterThan(publish.indexOf('receipt.ok'));
    expect(server).toContain('operationIds');
    expect(server).toContain('projectGlobalBroadcastOperationStatus');
    expect(server).toContain("status: 'conflict'");
    expect(server).toContain('if (!operation.actorUid || operation.actorUid !== actorUid)');
  });

  test('User360 carries structured source health and never renders exact payment/referral totals from samples', () => {
    const helpers = block('async function u360Query(', 'window.u360LoadLazySection = async function');
    const lazy = block('window.u360LoadLazySection = async function', 'window._userIdeasLoaded = false');
    expect(helpers).toContain('sourceHealth');
    expect(helpers).toContain('u360SourceHealth');
    expect(helpers).toContain('u360DisplayCount');
    expect(lazy).not.toContain('failures.includes(');
    expect(lazy).not.toContain('failures.some(');
    const payments = lazy.slice(lazy.indexOf("kind === 'payments'"), lazy.indexOf("kind === 'social'"));
    const social = lazy.slice(lazy.indexOf("kind === 'social'"), lazy.indexOf("kind === 'unified'"));
    expect(payments).toContain('u360DisplayCount(prem)');
    expect(payments).toContain('u360DisplayCount(shards)');
    expect(social).toContain('u360DisplayCount(refByMe)');
    expect(lazy).toMatch(/≥|sample|выборк/);
  });

  test('bounded timeline propagates truncation and cannot claim globally empty from a capped source', () => {
    const loader = block('window.pmPhase3LoadUserTimeline = async function', 'window.__pmAdminCore');
    const renderer = block('function renderTimeline(host,result)', 'function installTimeline(uid)');
    expect(loader).toContain('found.truncated');
    expect(loader).toContain("'partial'");
    expect(loader).toContain('sourceHealth');
    expect(renderer).toMatch(/ограниченн|выборк|старые/i);
    expect(renderer).not.toContain('В доступных существующих источниках событий нет.');
  });
});
