import fs from 'fs';
import path from 'path';

describe('account deletion tombstone contract', () => {
  const jobSource = fs.readFileSync(path.join(__dirname, 'account_delete_job.ts'), 'utf8');
  const rules = fs.readFileSync(path.join(__dirname, '../../firestore.rules'), 'utf8');

  it('atomically creates a stable-id tombstone with the durable deletion job', () => {
    expect(jobSource).toContain("export const ACCOUNT_DELETE_TOMBSTONES = 'account_deletion_tombstones'");
    expect(jobSource).toContain('const tombstoneRef = db.collection(ACCOUNT_DELETE_TOMBSTONES).doc(stableUid)');
    expect(jobSource).toContain('tx.set(tombstoneRef');
  });

  it('atomically creates an auth-scoped marker that only the same signed-in uid can read', () => {
    expect(jobSource).toContain("export const ACCOUNT_DELETE_AUTH_MARKERS = 'account_deletion_auth_markers'");
    expect(jobSource).toContain('const authMarkerRef = db.collection(ACCOUNT_DELETE_AUTH_MARKERS).doc(authUid)');
    expect(jobSource).toContain('tx.set(authMarkerRef');
    expect(rules).toContain('match /account_deletion_auth_markers/{authUid} {');
    expect(rules).toContain('allow read: if request.auth != null && request.auth.uid == authUid;');
    expect(rules).toContain('allow write: if false;');
  });

  it('blocks client recreation and updates of a tombstoned user document', () => {
    expect(rules).toContain('function accountDeletionNotPending(userId) {');
    expect(rules).toContain('account_deletion_tombstones/$(userId)');
    expect(rules).toMatch(/allow update:[^;]*accountDeletionNotPending\(userId\)/);
    expect(rules).toMatch(/allow create:[^;]*accountDeletionNotPending\(userId\)/);
  });
});
