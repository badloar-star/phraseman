/**
 * PM-215 шаг 0 (координатор §115): метрики глобального замка хранилища — только наблюдение.
 * зачем: прежде чем менять порядок очереди или ставить дедлайны, нужны числа (глубина, ожидание,
 * удержание). Тест держит два инварианта: FIFO и поведение прежние, а счётчики честные.
 */
import {
  getStorageLockMetrics,
  resetStorageLockMetricsForTests,
  withStorageLock,
  withStorageLockDeadline,
  __resetStorageLockLeasesForTests,
} from '../app/storage_mutex';

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

beforeEach(() => {
  resetStorageLockMetricsForTests();
  __resetStorageLockLeasesForTests();
  jest.spyOn(console, 'warn').mockImplementation(() => undefined);
});

afterEach(() => {
  (console.warn as jest.Mock).mockRestore();
});

test('FIFO order is unchanged and queue depth / wait / hold are recorded', async () => {
  const order: number[] = [];
  const first = withStorageLock(async () => { await sleep(30); order.push(1); });
  const second = withStorageLock(async () => { order.push(2); });
  const third = withStorageLock(async () => { order.push(3); });
  await Promise.all([first, second, third]);

  expect(order).toEqual([1, 2, 3]);
  const m = getStorageLockMetrics();
  expect(m.acquisitions).toBe(3);
  expect(m.maxQueueDepth).toBe(2);
  expect(m.maxWaitMs).toBeGreaterThanOrEqual(20);
  expect(m.maxHoldMs).toBeGreaterThanOrEqual(20);
  expect(m.slowWaits).toBe(0);
});

test('a wait longer than 1 s is logged as slow_wait', async () => {
  const holder = withStorageLock(async () => { await sleep(1_050); });
  const waiter = withStorageLock(async () => undefined);
  await Promise.all([holder, waiter]);
  const m = getStorageLockMetrics();
  expect(m.slowWaits).toBe(1);
  const logged = (console.warn as jest.Mock).mock.calls.map((c) => String(c[0])).join('\n');
  expect(logged).toContain('[STORAGE-LOCK] slow_wait');
});

test('deadline branch counts timeouts and still releases the lock normally', async () => {
  const holder = withStorageLock(async () => { await sleep(60); });
  const timedOut = await withStorageLockDeadline(async () => 'late', 10);
  expect(timedOut).toEqual({ completed: false });
  await holder;
  const ok = await withStorageLockDeadline(async () => 'now', 50);
  expect(ok).toEqual({ completed: true, value: 'now' });
  const m = getStorageLockMetrics();
  expect(m.deadlineTimeouts).toBe(1);
  expect(m.acquisitions).toBe(2);
});
