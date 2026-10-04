import fs from 'node:fs';
import path from 'node:path';

const legacy = fs.readFileSync(path.resolve(__dirname, '..', 'admin', 'v2', 'legacy.html'), 'utf8');

function block(startMarker: string, endMarker: string): string {
  const start = legacy.indexOf(startMarker);
  const end = legacy.indexOf(endMarker, start + startMarker.length);
  expect(start).toBeGreaterThanOrEqual(0);
  expect(end).toBeGreaterThan(start);
  return legacy.slice(start, end);
}

describe('Legacy admin protected full account deletion queue', () => {
  test('declares exactly one cached protected callable', () => {
    expect(legacy.match(/httpsCallable\(functionsUs, 'adminQueueAccountDeletion'\)/g) || []).toHaveLength(1);
  });

  test('queues the full irreversible deletion with a mandatory reason and honest hardening result', () => {
    const handler = block(
      'window.deleteUser = async function(uid)',
      'window.openDetail = function(uid)',
    );
    expect(handler).toContain('showConfirmModal({');
    expect(handler).toMatch(/полное удаление|полностью удалён/i);
    expect(handler).toMatch(/очеред/i);
    expect(handler).toMatch(/необратим/i);
    expect(handler).toContain('showInputModal({');
    expect(handler).toContain('reason: reason');
    expect(handler).toContain("createAdminCommandId('account_delete_request')");
    expect(handler).toContain("createAdminCommandId('account_delete_operation')");
    expect(handler).toContain('await getAdminQueueAccountDeletionCallable()');
    expect(handler).toContain('if (!data || data.ok !== true)');
    expect(handler).toContain('data.authHardening');
    expect(handler).not.toMatch(/\b(?:deleteDoc|logAction)\s*\(/);
    expect(handler).not.toContain('window._users = window._users.filter');
    expect(handler).not.toContain('closeDetail();');
  });

  test('leaves duplicate deletion and merge workflows present', () => {
    expect(legacy).toContain('window.deleteDupe = async function(uid)');
    expect(legacy).toContain('window.mergeUserPrompt = async function mergeUserPrompt(sourceUid, sourceName)');
  });
});
