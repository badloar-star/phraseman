// зачем (D153, решено координатором 04.10): у замка хранилища один названный предел ожидания и диагностика владельца — без немого зависания.
import {
  STORAGE_LOCK_DEADLINE_MS,
  acquireStorageLock,
  releaseStorageLock,
  withStorageLockDeadline,
} from '../app/storage_mutex';

describe('storage mutex deadline (D153)', () => {
  let warn: jest.SpyInstance;
  beforeEach(() => {
    jest.useFakeTimers();
    warn = jest.spyOn(console, 'warn').mockImplementation(() => {});
  });
  afterEach(() => {
    warn.mockRestore();
    jest.useRealTimers();
  });

  it('the deadline is the measured worst hold times three, never below two seconds', () => {
    const worstMeasuredHoldMs = 4_268;
    expect(STORAGE_LOCK_DEADLINE_MS).toBe(13_000);
    expect(STORAGE_LOCK_DEADLINE_MS).toBeGreaterThanOrEqual(worstMeasuredHoldMs * 3 - 1_000);
    expect(STORAGE_LOCK_DEADLINE_MS).toBeGreaterThanOrEqual(2_000);
  });

  it('a waiter queued behind a stuck holder writes one [STORAGE-MUTEX] line with holder and held time, and is not cancelled', async () => {
    await acquireStorageLock();
    let granted = false;
    const waiter = acquireStorageLock().then(() => { granted = true; });
    await jest.advanceTimersByTimeAsync(STORAGE_LOCK_DEADLINE_MS + 50);
    const lines = warn.mock.calls.map((c) => String(c[0])).filter((l) => l.includes('[STORAGE-MUTEX] wait_exceeded'));
    expect(lines).toHaveLength(1);
    expect(lines[0]).toMatch(/waitedMs=1\d{4}/);
    expect(lines[0]).toMatch(/holder=\S/);
    expect(lines[0]).toMatch(/heldMs=1\d{4}/);
    expect(granted).toBe(false);
    releaseStorageLock();
    await waiter;
    expect(granted).toBe(true);
    releaseStorageLock();
  });

  it('a waiter that gets the lock in time stays silent', async () => {
    await acquireStorageLock();
    const waiter = acquireStorageLock();
    await jest.advanceTimersByTimeAsync(500);
    releaseStorageLock();
    await waiter;
    await jest.advanceTimersByTimeAsync(STORAGE_LOCK_DEADLINE_MS + 50);
    expect(warn.mock.calls.some((c) => String(c[0]).includes('[STORAGE-MUTEX]'))).toBe(false);
    releaseStorageLock();
  });

  it('the deadline variant defaults to the named deadline and its timeout line names the holder', async () => {
    await acquireStorageLock();
    const pending = withStorageLockDeadline(async () => 'unreachable');
    await jest.advanceTimersByTimeAsync(STORAGE_LOCK_DEADLINE_MS + 50);
    await expect(pending).resolves.toEqual({ completed: false });
    const line = warn.mock.calls.map((c) => String(c[0])).find((l) => l.includes('[STORAGE-MUTEX] deadline_timeout'));
    expect(line).toMatch(/timeoutMs=13000/);
    expect(line).toMatch(/holder=\S/);
    releaseStorageLock();
    await expect(withStorageLockDeadline(async () => 'after')).resolves.toEqual({ completed: true, value: 'after' });
  });
});
