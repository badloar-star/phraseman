// Баланс монет на время принудительной сверки (координатор 15.10, аудит Optimistic UI п.5).
// зачем: после «не хватает монет» баланс обнулялся ДО ответа — число мигало «—». Теперь прежнее значение держится до ответа;
// подтверждено → новое число, не подтверждено → «—» (покупка выключена, как раньше). Сработал — чини логику, а не сторожа.
import fs from 'node:fs';
import path from 'node:path';
import { act, renderHook } from '@testing-library/react-native';

let mockResolveRead: ((v: unknown) => void) | null = null;
let mockRejectRead: ((e: unknown) => void) | null = null;
const mockRead = jest.fn(() => new Promise((resolve, reject) => { mockResolveRead = resolve; mockRejectRead = reject; }));
jest.mock('../app/runes_system', () => ({ getRunesBalanceRead: () => mockRead(), peekRunes: () => 100 }));
jest.mock('../app/app_snapshot_store', () => ({ subscribeAppSnapshot: () => () => undefined }));
jest.mock('../app/debug-logger', () => ({ DebugLogger: { info: jest.fn(), warn: jest.fn(), error: jest.fn() } }));
jest.mock('../app/account_generation', () => {
  const token = { generation: 1, stableId: 'owner-1', phase: 'active' };
  return {
    captureAccountGeneration: () => token,
    isCurrentAccountGeneration: () => true,
    subscribeAccountGeneration: () => ({ remove: () => undefined }),
  };
});

import { useCoinBalance } from '../hooks/use_coin_balance';

async function mountAndSettleInitialRead() {
  const hook = await renderHook(() => useCoinBalance());
  // первичная сверка при монтировании — отвечаем тем же числом
  await act(async () => { mockResolveRead?.({ quality: 'durable', wallet: { balance: 100 } }); });
  return hook;
}

describe('useCoinBalance: принудительная сверка не обнуляет баланс до ответа', () => {
  beforeEach(() => { mockRead.mockClear(); mockResolveRead = null; mockRejectRead = null; });

  it('во время сверки — прежнее число; подтверждено → новое', async () => {
    const { result } = await mountAndSettleInitialRead();
    expect(result.current.balance).toBe(100);
    let pending: Promise<string> = Promise.resolve('');
    await act(async () => { pending = result.current.forceBalanceReconcile(); });
    expect(result.current.balance).toBe(100); // ← раньше здесь был null («—»)
    await act(async () => { mockResolveRead?.({ quality: 'durable', wallet: { balance: 40 } }); await pending; });
    await expect(pending).resolves.toBe('durable');
    expect(result.current.balance).toBe(40);
  });

  it('ответ «не подтверждено» → «—» (null), покупка выключена', async () => {
    const { result } = await mountAndSettleInitialRead();
    let pending: Promise<string> = Promise.resolve('');
    await act(async () => { pending = result.current.forceBalanceReconcile(); });
    expect(result.current.balance).toBe(100);
    await act(async () => { mockResolveRead?.({ quality: 'cache', wallet: { balance: 999 } }); await pending; });
    await expect(pending).resolves.toBe('unavailable');
    expect(result.current.balance).toBeNull();
  });

  it('сбой чтения → «—» (null), причина в журнале', async () => {
    const { result } = await mountAndSettleInitialRead();
    let pending: Promise<string> = Promise.resolve('');
    await act(async () => { pending = result.current.forceBalanceReconcile(); });
    await act(async () => { mockRejectRead?.(new Error('disk')); await pending.catch(() => undefined); });
    await expect(pending).resolves.toBe('unavailable');
    expect(result.current.balance).toBeNull();
  });

  it('экран «Ранг игрока» (своя копия хука) — то же правило: нет обнуления до await', () => {
    const src = fs.readFileSync(path.join(__dirname, '..', 'app', 'coin_rank.tsx'), 'utf8');
    const body = src.slice(src.indexOf('const forceBalanceReconcile = useCallback'), src.indexOf('useEffect(', src.indexOf('const forceBalanceReconcile = useCallback')));
    expect(body.indexOf('setBalance(null)')).toBeGreaterThan(body.indexOf('await getRunesBalanceRead()'));
    expect(body).not.toMatch(/catch \{/);
  });
});
