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
    // §CORE-0162: мёртвый subscribeUserAppMessages удалён — блок заканчивается следующим объявлением.
    expect(appMessagesSource).not.toContain('export function subscribeUserAppMessages');
    const refreshEnd = appMessagesSource.indexOf('function enqueueAppMessageVisibilityMutation(', refreshStart);
    expect(refreshEnd).toBeGreaterThan(refreshStart);
    const refreshBlock = appMessagesSource.slice(refreshStart, refreshEnd);

    expect(refreshBlock).toContain('readCachedSnapshot()');
    expect(refreshBlock).toContain('readLastBackgroundRefreshMs()');
    expect(refreshBlock).toContain('writeLastBackgroundRefreshMs(nowMs, uid)');
    expect(refreshBlock.indexOf('flushPendingAppMessageVisibility(firestoreFactory, uid)')).toBeLessThan(
      refreshBlock.indexOf('if (!options.force)'),
    );
    expect(refreshBlock).toContain('limit(APP_MESSAGES_BACKGROUND_FETCH_LIMIT)');
    // Разовое чтение (не подписка): после перевода на модульный API (§67) — getDocs(…).
    expect(refreshBlock).toMatch(/getDocs\(|\.get\(\)/);
    expect(refreshBlock).not.toContain('.onSnapshot(');
    expect(refreshBlock).not.toContain('onSnapshot(');
  });

  it('keeps the unified notification center cache-only while the closed badge refreshes', () => {
    const pollStart = inboxSource.indexOf('const refreshBadge = async () =>');
    const pollEnd = inboxSource.indexOf('}, [applyAppMessagesSnapshot, effectiveVisible, runtimeActive]);', pollStart);
    const pollBlock = inboxSource.slice(pollStart, pollEnd);

    expect(inboxSource).not.toContain('subscribeUserAppMessages');
    expect(inboxSource).toContain('BADGE_FOREGROUND_REFRESH_MIN_INTERVAL_MS = 12 * 60 * 60_000');
    expect(pollBlock).toContain('readCachedAppMessagesSnapshot()');
    // зачем (смета Ядра e72a5417b №2, 13.10): открытая шторка читает сеть не чаще раза в 60 с (было 0 — до 240 чтений на открытие).
    expect(inboxSource).toContain('INBOX_OPEN_REFRESH_MIN_INTERVAL_MS = 60_000');
    expect(pollBlock).toContain('const minIntervalMs = effectiveVisible ? INBOX_OPEN_REFRESH_MIN_INTERVAL_MS : BADGE_FOREGROUND_REFRESH_MIN_INTERVAL_MS;');
    expect(pollBlock).not.toMatch(/effectiveVisible \? 0 :/);
    expect(pollBlock).toContain('[INBOX-REFRESH]');
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
    // 04.10: немой catch заменён записью причины (PM-229) — возобновление зачислений на месте.
    expect(cloudSyncSource).toContain("await resumePendingReportReplyShardClaims().catch(swallowError('cloud_sync:doSyncToCloud'));");
  });
});
