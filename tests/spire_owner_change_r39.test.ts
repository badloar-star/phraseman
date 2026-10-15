// зачем (Ревизор F02, координатор 15.10, R39 🔴): после выхода A и входа B экран Пика держал Пик A (личность, комната, друзья, неделя,
// позиция для окон), а досылка очереди шла с ids A от имени B. Сценарий A → выход → B: эпоха владельца растёт, память модулей Пика
// чистится, отправка очереди с личностью не текущего владельца не уходит; экран сбрасывает состояние и берёт личность заново.
import fs from 'node:fs';
import path from 'node:path';

const mockResets = new Map<string, () => void>();
jest.mock('../app/account_owner_change', () => ({ onAccountOwnerChanged: (name: string, reset: () => void) => { mockResets.set(name, reset); } }));
let mockOwner: string | null = 'stable-A';
jest.mock('../app/stable_id', () => ({ peekStableId: () => mockOwner, getStableId: () => Promise.resolve(mockOwner) }));
jest.mock('../app/config', () => ({ CLOUD_SYNC_ENABLED: true, IS_EXPO_GO: false }));
jest.mock('../app/coin_rank_state_v1', () => ({ peekCoinRank: () => 0 }));
jest.mock('../app/debug-logger', () => ({ DebugLogger: { info: jest.fn(), warn: jest.fn(), error: jest.fn() } }));
jest.mock('@react-native-async-storage/async-storage', () => ({ __esModule: true, default: { getItem: () => Promise.resolve(null), setItem: () => Promise.resolve() } }));
const mockFlushReports = jest.fn();
jest.mock('../modules/spire/report_store', () => ({
  spireFlushReports: (...args: unknown[]) => mockFlushReports(...args),
  spireLoadWeekLocal: () => Promise.resolve(null),
  spireRecordStep: () => Promise.resolve({ effect: 'applied' }),
}));

import { spireFlushNow } from '../app/spire_report_client';
import { peekSpireOwnerEpoch } from '../app/spire/spire_owner_epoch';
import { peekSpirePositionFeed, publishSpirePositionFeed } from '../app/spire/spire_position_feed';
import { DebugLogger } from '../app/debug-logger';

const switchOwner = (next: string | null) => { mockOwner = next; for (const reset of mockResets.values()) reset(); };

describe('R39 · Пик: A → выход → B', () => {
  beforeEach(() => { mockOwner = 'stable-A'; mockFlushReports.mockReset(); mockFlushReports.mockResolvedValue({ status: 'sent' }); jest.spyOn(console, 'log').mockImplementation(() => undefined); });

  it('все модули Пика подписаны на смену владельца', () => {
    expect(mockResets.has('spire_owner_epoch')).toBe(true);
    expect(mockResets.has('spire_report_client')).toBe(true);
    expect(mockResets.has('spire_position_feed')).toBe(true);
  });

  it('эпоха владельца растёт на выход и на вход другого', () => {
    const before = peekSpireOwnerEpoch();
    switchOwner(null);
    switchOwner('stable-B');
    expect(peekSpireOwnerEpoch()).toBe(before + 2);
    expect(console.log).toHaveBeenCalledWith('[SPIRE]', 'owner_changed', expect.any(String));
  });

  it('очередь A не отправляется от имени B, а своя — уходит', async () => {
    switchOwner('stable-B');
    await expect(spireFlushNow({ uid: 'uid-A', stableId: 'stable-A', lang: 'en' as never, trigger: 'screen_leave' as never })).resolves.toBeNull();
    expect(mockFlushReports).not.toHaveBeenCalled();
    expect(DebugLogger.warn).toHaveBeenCalledWith('[SPIRE-REPORT]', expect.stringContaining('личность не текущего владельца'));
    await spireFlushNow({ uid: 'uid-B', stableId: 'stable-B', lang: 'en' as never, trigger: 'app_start' as never });
    expect(mockFlushReports).toHaveBeenCalledTimes(1);
    expect(mockFlushReports.mock.calls[0]![1]).toMatchObject({ uid: 'uid-B' });
  });

  it('позиция для окон Пика (m05) прошлого владельца сбрасывается', () => {
    publishSpirePositionFeed({ uid: 'uid-A', lang: 'en', weekId: '2026-W42', roomFetchedAtMs: 1, rows: [], rankBy: 'steps' });
    switchOwner('stable-B');
    expect(peekSpirePositionFeed()).toBeNull();
  });
});

describe('R39 · экран Пика сбрасывает состояние и личность на смену владельца', () => {
  const src = fs.readFileSync(path.join(__dirname, '..', 'app', 'spire', 'use_spire_game.ts'), 'utf8');
  it('сброс по языку И эпохе владельца, личность берётся заново', () => {
    expect(src).toContain('const ownerEpoch = useSpireOwnerEpoch();');
    expect(src).toContain('if (ownerChanged) setIds(null);');
    expect(src).toMatch(/\}, \[lang, ownerEpoch\]\);/);
    expect(src).toMatch(/\}, \[gate, lang, ownerEpoch\]\);/);
    expect(src.split('\n').length).toBeLessThanOrEqual(400);
  });
});
