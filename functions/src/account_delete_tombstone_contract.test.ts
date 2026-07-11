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

  it('blocks client recreation and updates of a tombstoned user document', () => {
    expect(rules).toContain('function accountDeletionNotPending(userId) {');
    expect(rules).toContain('account_deletion_tombstones/$(userId)');
    expect(rules).toMatch(/allow update:[^;]*accountDeletionNotPending\(userId\)/);
    expect(rules).toMatch(/allow create:[^;]*accountDeletionNotPending\(userId\)/);
  });
});
