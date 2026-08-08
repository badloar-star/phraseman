import { readFileSync } from 'node:fs';
import path from 'node:path';

const source = readFileSync(path.resolve(__dirname, '../admin/v2/legacy.html'), 'utf8');

function editShardsHandler(): string {
  const start = source.indexOf('window.editShards = async function(uid) {');
  const end = source.indexOf('\n  window.editUserField', start);
  expect(start).toBeGreaterThan(-1);
  expect(end).toBeGreaterThan(start);
  return source.slice(start, end);
}

describe('live admin absolute shard balance callable contract', () => {
  it('caches exactly one protected adminSetShardBalance callable', () => {
    expect(source.match(/httpsCallable\(functionsUs, 'adminSetShardBalance'\)/g) || []).toHaveLength(1);
    expect(source).toContain('function getAdminSetShardBalanceCallable()');
  });

  it('strictly bounds the requested absolute balance and requires a reason', () => {
    const body = editShardsHandler();
    expect(body).toContain('Number(String(val).trim())');
    expect(body).toContain('Number.isSafeInteger(newBalance)');
    expect(body).toMatch(/newBalance\s*>\s*1000000/);
    expect(body).toContain('const reason = String(await showInputModal({');
    expect(body).toContain('.trim();');
    expect(body).toMatch(/if\s*\(!reason\)/);
  });

  it('sends an idempotent server-authoritative balance command', () => {
    const body = editShardsHandler();
    expect(body).toContain("createAdminCommandId('shard_balance_request')");
    expect(body).toContain("createAdminCommandId('shard_balance_operation')");
    expect(body).toContain('await getAdminSetShardBalanceCallable()({');
    expect(body).toContain('uid,');
    expect(body).toContain('newBalance,');
    expect(body).toContain('reason,');
    expect(body).toContain('requestId,');
    expect(body).toContain('idempotencyKey,');
    expect(body).toContain('response.data.ok !== true');
  });

  it('updates cache and existing detail/table refresh only after acknowledged canonical result', () => {
    const body = editShardsHandler();
    const call = body.indexOf('await getAdminSetShardBalanceCallable()({');
    const acknowledged = body.indexOf('response.data.ok !== true');
    const canonicalUid = body.indexOf('const writeUid = response.data.uid;', acknowledged);
    const balance = body.indexOf('const confirmedBalance = Number(response.data.balance);', acknowledged);
    const cachedUser = body.indexOf('const writeUser = _cachedUser(writeUid) || u;', balance);
    const mutation = body.indexOf('writeUser.shards = confirmedBalance;', cachedUser);
    const detail = body.indexOf('openDetail(writeUid);', mutation);
    const table = body.indexOf('renderTable();', detail);
    const successToast = body.indexOf('showToast(', table);
    const errorToast = body.lastIndexOf('showToast(');

    expect(call).toBeGreaterThan(-1);
    expect(acknowledged).toBeGreaterThan(call);
    expect(canonicalUid).toBeGreaterThan(acknowledged);
    expect(balance).toBeGreaterThan(canonicalUid);
    expect(cachedUser).toBeGreaterThan(balance);
    expect(mutation).toBeGreaterThan(cachedUser);
    expect(detail).toBeGreaterThan(mutation);
    expect(table).toBeGreaterThan(detail);
    expect(successToast).toBeGreaterThan(table);
    expect(errorToast).toBeGreaterThan(successToast);
    expect(body.slice(errorToast)).toContain("'err'");
  });

  it('has no direct Firestore write, client audit, or canonical fallback', () => {
    const body = editShardsHandler();
    expect(body).not.toMatch(/\b(?:getDoc|setDoc|updateDoc|deleteDoc)\s*\(/);
    expect(body).not.toContain('logAction(');
    expect(body).not.toContain('resolveAdminVipWriteTarget');
    expect(body).not.toMatch(/response\.data\.uid\s*\|\||target\.uid\s*\|\|/);
  });
});
