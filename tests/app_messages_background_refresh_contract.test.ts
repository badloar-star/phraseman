import fs from 'fs';
import path from 'path';

describe('app messages background refresh contract', () => {
  const root = process.cwd();
  const appMessagesSource = fs.readFileSync(path.join(root, 'app', 'app_messages.ts'), 'utf8');
  const inboxSource = fs.readFileSync(path.join(root, 'components', 'AppMessagesInbox.tsx'), 'utf8');

  it('keeps the closed-inbox refresh daily, cached, and one-shot', () => {
    expect(appMessagesSource).toContain('APP_MESSAGES_BACKGROUND_REFRESH_INTERVAL_MS = 24 * 60 * 60 * 1000');
    expect(appMessagesSource).toContain('APP_MESSAGES_LAST_BACKGROUND_REFRESH_KEY');
    expect(appMessagesSource).toContain('export async function readCachedAppMessagesSnapshot');
    expect(appMessagesSource).toContain('export async function refreshAppMessagesSnapshotOnce');

    const refreshStart = appMessagesSource.indexOf('export async function refreshAppMessagesSnapshotOnce');
    const refreshEnd = appMessagesSource.indexOf('export function subscribeUserAppMessages');
    const refreshBlock = appMessagesSource.slice(refreshStart, refreshEnd);

    expect(refreshBlock).toContain('readCachedSnapshot()');
    expect(refreshBlock).toContain('readLastBackgroundRefreshMs()');
    expect(refreshBlock).toContain('writeLastBackgroundRefreshMs(nowMs, uid)');
    expect(refreshBlock.indexOf('flushPendingAppMessageVisibility(firestoreFactory, uid)')).toBeLessThan(
      refreshBlock.indexOf('if (!options.force)'),
    );
    expect(refreshBlock).toContain('limit(APP_MESSAGES_BACKGROUND_FETCH_LIMIT)');
    expect(refreshBlock).toContain('.get()');
    expect(refreshBlock).not.toContain('.onSnapshot(');
  });

  it('keeps the unified notification center cache-only while the closed badge refreshes', () => {
    const pollStart = inboxSource.indexOf('const refreshBadge = async () =>');
    const pollEnd = inboxSource.indexOf('}, [applyAppMessagesSnapshot, effectiveVisible, runtimeActive]);', pollStart);
    const pollBlock = inboxSource.slice(pollStart, pollEnd);

    expect(inboxSource).not.toContain('subscribeUserAppMessages');
    expect(inboxSource).toContain('BADGE_FOREGROUND_REFRESH_MIN_INTERVAL_MS = 12 * 60 * 60_000');
    expect(pollBlock).toContain('readCachedAppMessagesSnapshot()');
    expect(pollBlock).toContain('minIntervalMs: BADGE_FOREGROUND_REFRESH_MIN_INTERVAL_MS');
    expect(pollBlock.indexOf('readCachedAppMessagesSnapshot()')).toBeLessThan(
      pollBlock.indexOf('refreshAppMessagesSnapshotOnce({'),
    );
    expect(pollBlock).not.toContain('subscribeUserAppMessages');
  });

  it('preserves local pending report-reply reward claims across refresh and background sync', () => {
    const cloudSyncSource = fs.readFileSync(path.join(root, 'app', 'cloud_sync.ts'), 'utf8');
    expect(appMessagesSource).toContain('REPORT_REPLY_PENDING_CLAIMS_KEY');
    expect(appMessagesSource).toContain('readPendingReportReplyShardClaims()');
    expect(appMessagesSource).toContain('pendingClaims.map((claim) => claim.messageId)');
    expect(appMessagesSource).toContain('export async function resumePendingReportReplyShardClaims');
    expect(cloudSyncSource).toContain("import { resumePendingReportReplyShardClaims } from './app_messages';");
    expect(cloudSyncSource).toContain('await resumePendingReportReplyShardClaims().catch(() => {});');
  });
});
