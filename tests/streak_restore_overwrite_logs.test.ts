// зачем (координатор 12.10, 🔴 streakJump): облачные 12 через 2 с снова стали 5. «Сперва логи»: ловушка записи серии
// показывает каждую запись `streak_count` со значением и кадрами стека; восстановление пишет возраст прочитанной серии.
// Этап 2 (одобрен): Главная после восстановления перечитывает данные (только диск) с дебаунсом.
import fs from 'fs';
import path from 'path';

import { installStreakWriteTracer } from '../app/dev_streak_restore_jump';

describe('ловушка записи серии (dev)', () => {
  let warn: jest.SpyInstance;
  beforeEach(() => {
    jest.spyOn(console, 'log').mockImplementation(() => undefined);
    warn = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
  });
  afterEach(() => jest.restoreAllMocks());

  function fakeStorage() {
    const data = new Map<string, string>();
    return {
      data,
      setItem: jest.fn(async (k: string, v: string) => { data.set(k, v); }),
      multiSet: jest.fn(async (pairs: readonly (readonly [string, string])[]) => { pairs.forEach(([k, v]) => data.set(k, v)); }),
    };
  }

  it('пишет [STREAK-WRITE] со значением и кадрами только для streak_count; запись проходит как прежде', async () => {
    const storage = fakeStorage();
    const uninstall = installStreakWriteTracer(storage, 60_000);
    await storage.setItem('streak_count', '12');
    await storage.setItem('other', 'x');
    await storage.multiSet([['last_active_date', '2026-10-12'], ['streak_count', '5']]);
    const lines = warn.mock.calls.filter((c) => c[0] === '[STREAK-WRITE]').map((c) => JSON.parse(String(c[1])));
    expect(lines.map((l) => [l.via, l.value])).toEqual([['setItem', '12'], ['multiSet', '5']]);
    expect(Array.isArray(lines[0].frames)).toBe(true);
    expect(storage.data.get('streak_count')).toBe('5');
    expect(storage.data.get('other')).toBe('x');
    uninstall();
  });

  it('снимается сама — исходные методы возвращаются', async () => {
    const storage = fakeStorage();
    const originalSet = storage.setItem;
    const uninstall = installStreakWriteTracer(storage, 60_000);
    expect(storage.setItem).not.toBe(originalSet);
    uninstall();
    expect(storage.setItem).toBe(originalSet);
  });
});

describe('восстановление и Главная (контракт по исходнику)', () => {
  const read = (rel: string) => fs.readFileSync(path.join(__dirname, '..', rel), 'utf8');

  it('восстановление печатает возраст прочитанной серии в момент записи', () => {
    const src = read('app/cloud_sync.ts');
    expect(src).toContain('streakReadAtMs = Date.now();');
    expect(src).toContain('[STREAK] restore_pair streak=${mergedStreak.streak} localRead=${String(localStreakRaw)} cloud=${String(cloudData[\'streak_count\'])} readAgoMs=${Date.now() - streakReadAtMs}');
  });

  it('Главная на cloud_profile_hydrated перечитывает данные с дебаунсом и чистит таймер', () => {
    const src = read('app/(tabs)/home.tsx');
    const start = src.indexOf("const restoreJumpSub = onAppEvent('cloud_profile_hydrated'");
    const block = src.slice(start, start + 1200);
    expect(block).toContain('if (restoreRefreshTimer) clearTimeout(restoreRefreshTimer);');
    expect(block).toContain('requestHomeDataRefresh();');
    expect(block).toContain('HOME_RESTORE_REFRESH_DEBOUNCE_MS');
    expect(src).toMatch(/restoreJumpSub\.remove\(\);\s*if \(restoreRefreshTimer\) clearTimeout\(restoreRefreshTimer\);/);
  });
});
