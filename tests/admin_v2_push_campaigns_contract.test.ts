import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(__dirname, '..');
const read = (file: string) => fs.readFileSync(path.join(root, file), 'utf8');

describe('Admin v2 push campaigns', () => {
  test('replaces direct browser Firestore operations with protected callables', () => {
    const server = read('functions/src/admin_push_control.ts');
    const firebase = read('admin/v2/scripts/admin-firebase.js');
    const core = read('admin/v2/scripts/admin-core.js');
    expect(server).toContain('export const adminPreviewPushAudience = onCall(');
    expect(server).toContain('export const adminCreatePushJob = onCall(');
    expect(server).toContain('export const adminListPushJobs = onCall(');
    expect(server).toContain('export const adminCancelPushJob = onCall(');
    expect(server).toContain("hasPermission(role, 'campaigns.write')");
    expect(server).toContain("action: 'push_job.create'");
    expect(server).toContain("action: 'push_job.cancel'");
    expect(firebase).toContain("httpsCallable(functionsUs, 'adminPreviewPushAudience')");
    expect(firebase).toContain("httpsCallable(functionsUs, 'adminCreatePushJob')");
    expect(core).toContain('function renderPushCampaigns');
    expect(core).toContain('data-action="preview-push-campaign"');
    expect(core).toContain('data-action="publish-push-campaign"');
    expect(core).toContain('data-action="cancel-push-job"');
    expect(firebase).not.toContain("collection(db, 'admin_push_jobs')");
  });

  test('preserves every legacy push mode and consolidates it under campaigns', () => {
    const capabilities = read('admin/v2/scripts/admin-capabilities.js');
    const core = read('admin/v2/scripts/admin-core.js');
    expect(capabilities).toContain("'push-notify': 'campaigns'");
    for (const mode of ['uid', 'segment', 'reactivate', 'scheduled']) expect(core).toContain(`value="${mode}"`);
    expect(core).toContain('push-campaign-reason');
    expect(core).toContain('push-campaign-title');
    expect(core).toContain('push-campaign-body');
    expect(core).toContain('push-campaign-action');
  });

  test('shows an informed immutable approval packet and gates dangerous actions', () => {
    const core = read('admin/v2/scripts/admin-core.js');
    for (const detail of ['requestedBy', 'expiresAtMs', 'previewId', 'notification.body', 'scheduledAtMs', 'summary.action']) {
      expect(core).toContain(detail);
    }
    expect(core).toContain("can('campaigns.write')");
    expect(core).toContain('pushApprovalIsLive');
    expect(core).toContain('pushOperationKey');
    expect(core).toContain("approval.status === 'consumed'");
    expect(core).toContain('previewExpiresAtMs');
    expect(core).toContain('preview: ${Number(job.audiencePreviewCount || 0)}');
  });
});
