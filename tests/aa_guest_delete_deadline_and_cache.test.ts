/**
 * Удаление аккаунта (координатор 12.10, журнал прода):
 * - B(1): постановка удаления ГОСТЯ ждёт ответ в фоне до 25 с (холодный старт accountDeleteEnqueue ≈9 с > прежних 8 с);
 *   связанные аккаунты и пути возобновления — прежние 8 с.
 */
import fs from 'fs';
import path from 'path';

const root = path.join(__dirname, '..');
const read = (rel: string) => fs.readFileSync(path.join(root, rel), 'utf8');

describe('B(1) дедлайн постановки удаления', () => {
  it('гость — 25 с, связанные — прежние 8 с', () => {
    const t = read('app/account_delete_timeout.ts');
    expect(t).toContain('export const ACCOUNT_DELETE_ENQUEUE_TIMEOUT_MS = 8_000;');
    expect(t).toContain('export const ACCOUNT_DELETE_GUEST_BACKGROUND_ENQUEUE_TIMEOUT_MS = 25_000;');
    const auth = read('app/auth_provider.ts');
    const start = auth.indexOf('const cloudDeleteEnqueueOperation = isProvablyAnonymousAccount');
    expect(start).toBeGreaterThan(0);
    const block = auth.slice(start, start + 600);
    expect(block).toContain('timeoutMs: ACCOUNT_DELETE_GUEST_BACKGROUND_ENQUEUE_TIMEOUT_MS');
    expect(block).toContain(": startCloudDeletionEnqueue(pendingDeleteStableId, enqueueProof, ...accountsV2EnqueueArgs);");
    // пути возобновления (связанные) — без нового аргумента
    expect(auth).toContain('const op = startCloudDeletionEnqueue(lock.stableId, proof, ...retryAccountsV2Args);');
    expect(auth).toContain('const ack = await startCloudDeletionEnqueue(lock.stableId, proof).acknowledgment;');
  });

  it('cloud_sync: один и тот же дедлайн и для таймера, и для таймаута вызова', () => {
    const cs = read('app/cloud_sync.ts');
    const fn = cs.slice(cs.indexOf('export function startCloudDeletionEnqueue('), cs.indexOf('const ACCOUNT_DELETE_CREDENTIAL_SAFE_WAIT_MS'));
    expect(fn).toContain('const enqueueTimeoutMs = options?.timeoutMs ?? ACCOUNT_DELETE_ENQUEUE_TIMEOUT_MS;');
    expect(fn).toContain("{ timeout: enqueueTimeoutMs }");
    expect(fn).not.toContain('ACCOUNT_DELETE_ENQUEUE_TIMEOUT_MS,\n');
  });
});
