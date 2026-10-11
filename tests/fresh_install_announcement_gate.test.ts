// зачем (координатор 12.10, находка Сверки): новичок после онбординга видел «Замочки ушли в отпуск!» — объявление «что нового» тому, кто ничего
// старого не видел. Сторож: правило «меньше суток после онбординга», пропуск очереди с логом, подключение в онбординг и в очередь модалок.
const mockStore = new Map<string, string>();
let mockReadFails = false;
jest.mock('@react-native-async-storage/async-storage', () => ({
  __esModule: true,
  default: {
    getItem: jest.fn(async (key: string) => {
      if (mockReadFails) throw new Error('storage_down');
      return mockStore.has(key) ? mockStore.get(key)! : null;
    }),
    setItem: jest.fn(async (key: string, value: string) => { mockStore.set(key, value); }),
  },
}));

/* eslint-disable import/first */
import fs from 'node:fs';
import path from 'node:path';
import {
  FRESH_INSTALL_ANNOUNCEMENT_WINDOW_MS,
  ONBOARDING_COMPLETED_AT_KEY,
  judgeFreshInstall,
  readFreshInstallVerdict,
  skipAnnouncementsForFreshInstall,
} from '../app/fresh_install_gate';

const NOW = 1_800_000_000_000;
const HOUR = 60 * 60 * 1000;

describe('fresh install announcement gate', () => {
  let log: jest.SpyInstance;
  beforeEach(() => {
    mockStore.clear();
    mockReadFails = false;
    log = jest.spyOn(console, 'log').mockImplementation(() => {});
    jest.spyOn(console, 'warn').mockImplementation(() => {});
  });
  afterEach(() => { jest.restoreAllMocks(); });

  it('treats onboarding finished less than a day ago as fresh', () => {
    expect(judgeFreshInstall(NOW, NOW)).toMatchObject({ fresh: true, reason: 'recent', ageMs: 0 });
    expect(judgeFreshInstall(NOW - 23 * HOUR, NOW).fresh).toBe(true);
  });

  it('treats a day or more as not fresh', () => {
    expect(judgeFreshInstall(NOW - FRESH_INSTALL_ANNOUNCEMENT_WINDOW_MS, NOW)).toMatchObject({ fresh: false, reason: 'old' });
    expect(judgeFreshInstall(NOW - 40 * 24 * HOUR, NOW).fresh).toBe(false);
  });

  it('does not hide announcements for existing users without a timestamp', () => {
    expect(judgeFreshInstall(null, NOW)).toMatchObject({ fresh: false, reason: 'no_timestamp', ageMs: null });
    expect(judgeFreshInstall(Number.NaN, NOW).reason).toBe('no_timestamp');
    expect(judgeFreshInstall(0, NOW).reason).toBe('no_timestamp');
  });

  it('does not trust a timestamp from the future (device clock moved)', () => {
    expect(judgeFreshInstall(NOW + 2 * 60 * 1000, NOW).fresh).toBe(true); // небольшой уход часов допустим
    expect(judgeFreshInstall(NOW + 3 * HOUR, NOW)).toMatchObject({ fresh: false, reason: 'clock_skew' });
  });

  it('reads the stored timestamp', async () => {
    mockStore.set(ONBOARDING_COMPLETED_AT_KEY, String(NOW - HOUR));
    expect(await readFreshInstallVerdict(NOW)).toMatchObject({ fresh: true, reason: 'recent' });
    mockStore.clear();
    expect(await readFreshInstallVerdict(NOW)).toMatchObject({ fresh: false, reason: 'no_timestamp' });
  });

  it('falls back to showing announcements when the read fails, and says why', async () => {
    mockReadFails = true;
    expect(await readFreshInstallVerdict(NOW)).toMatchObject({ fresh: false, reason: 'read_failed' });
    expect(console.warn).toHaveBeenCalledWith(expect.stringContaining('read_failed storage_down'));
  });

  it('empties the modal queue for a newcomer and logs skip reason=fresh_install', () => {
    const queue = [{ id: 'locks-vacation' }, { id: 'poll-1' }];
    expect(skipAnnouncementsForFreshInstall(queue, { fresh: true, reason: 'recent', ageMs: HOUR })).toEqual([]);
    expect(log).toHaveBeenCalledWith(expect.stringContaining('[APP-MESSAGE] skip reason=fresh_install count=2 ids=locks-vacation,poll-1'));
  });

  it('keeps the queue for everyone else', () => {
    const queue = [{ id: 'a' }];
    expect(skipAnnouncementsForFreshInstall(queue, { fresh: false, reason: 'old', ageMs: 40 * 24 * HOUR })).toBe(queue);
    expect(skipAnnouncementsForFreshInstall([], { fresh: true, reason: 'recent', ageMs: 0 })).toEqual([]);
    expect(log).not.toHaveBeenCalledWith(expect.stringContaining('skip reason=fresh_install'));
  });

  it('is wired into onboarding completion and the modal queue', () => {
    const read = (rel: string) => fs.readFileSync(path.join(__dirname, '..', rel), 'utf8');
    expect(read('components/CleanOnboarding.tsx')).toMatch(/\[ONBOARDING_COMPLETED_AT_KEY, String\(Date\.now\(\)\)\]/);
    const layout = read('app/_layout.tsx');
    expect(layout).toMatch(/readFreshInstallVerdict\(\)/);
    expect(layout).toMatch(/setAppMessageModalQueue\(verdict \? skipAnnouncementsForFreshInstall\(queue, verdict\) : queue\)/);
  });
});
