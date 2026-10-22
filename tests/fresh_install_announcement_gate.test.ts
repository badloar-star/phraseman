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
  decideTeamModal,
  judgeFreshInstall,
  readFreshInstallVerdict,
  skipAnnouncementsCreatedBeforeFirstEntry,
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
    // зачем (владелец 22.10): вердикт считается всегда — им же гейтятся личное окно и объявления до первого входа
    expect(layout).toContain('setAppMessageModalQueue(skipAnnouncementsForFreshInstall(queue, verdict));');
    expect(layout).toContain('skipAnnouncementsCreatedBeforeFirstEntry(');
    expect(layout).toContain("const personalDecision = decideTeamModal({ verdict, createdAtMs: personal.createdAtMs, personal: true });");
    expect(layout).toContain("setPersonalAdminMessage(personalDecision === 'show' ? personal : null);");
    expect(layout).toContain('teamModalVerdict: verdict');
    const broadcast = read('app/global_broadcast_modal.ts');
    expect(broadcast).toContain("if (decision === 'skip_created_before_first_entry') return settled(`created_before_first_entry id=${payload.id}`);");
  });

  // ── владелец 22.10: окна «от команды» — только тем, кто в приложении ≥ 48 ч ──
  describe('team modal: 48 h and «created before the first entry»', () => {
    const DAY = 24 * HOUR;
    it('the newcomer window is 48 h, not a day', () => {
      expect(FRESH_INSTALL_ANNOUNCEMENT_WINDOW_MS).toBe(48 * HOUR);
      expect(judgeFreshInstall(NOW - 47 * HOUR, NOW).fresh).toBe(true);
      expect(judgeFreshInstall(NOW - 48 * HOUR, NOW)).toMatchObject({ fresh: false, reason: 'old', firstEntryMs: NOW - 48 * HOUR });
    });

    it('newcomer (< 48 h): no team window at all — broadcast, announcement or personal', () => {
      const verdict = judgeFreshInstall(NOW - 30 * HOUR, NOW);
      for (const personal of [false, true]) {
        expect(decideTeamModal({ verdict, createdAtMs: NOW - HOUR, personal })).toBe('skip_new_user_48h');
      }
    });

    it('after 48 h: a broadcast created before the first entry never pops up; a newer one does', () => {
      const firstEntry = NOW - 3 * DAY;
      const verdict = judgeFreshInstall(firstEntry, NOW);
      expect(decideTeamModal({ verdict, createdAtMs: firstEntry - DAY, personal: false })).toBe('skip_created_before_first_entry');
      expect(decideTeamModal({ verdict, createdAtMs: firstEntry, personal: false })).toBe('skip_created_before_first_entry');
      expect(decideTeamModal({ verdict, createdAtMs: null, personal: false })).toBe('skip_created_before_first_entry');
      expect(decideTeamModal({ verdict, createdAtMs: firstEntry + HOUR, personal: false })).toBe('show');
    });

    it('a personal team message waits 48 h, then shows even if written earlier (it was written to this person)', () => {
      const verdict = judgeFreshInstall(NOW - 3 * DAY, NOW);
      expect(decideTeamModal({ verdict, createdAtMs: NOW - 4 * DAY, personal: true })).toBe('show');
    });

    it('people without a first-entry stamp (earlier users) keep the old behaviour', () => {
      for (const verdict of [judgeFreshInstall(null, NOW), judgeFreshInstall(NOW + 3 * HOUR, NOW)]) {
        expect(decideTeamModal({ verdict, createdAtMs: 1, personal: false })).toBe('show');
      }
    });

    it('filters the announcement queue and logs every decision with [INBOX-MODAL]', () => {
      const log = jest.spyOn(console, 'log').mockImplementation(() => undefined);
      const firstEntry = NOW - 3 * DAY;
      const verdict = judgeFreshInstall(firstEntry, NOW);
      const queue = [
        { id: 'old', createdAtMs: firstEntry - DAY },
        { id: 'undated', createdAtMs: NOW, createdAtKnown: false },
        { id: 'new', createdAtMs: firstEntry + DAY },
      ];
      expect(skipAnnouncementsCreatedBeforeFirstEntry(queue, verdict).map((m) => m.id)).toEqual(['new']);
      const lines = log.mock.calls.filter((c) => c[0] === '[INBOX-MODAL]').map((c) => JSON.parse(String(c[1])));
      expect(lines.map((l) => [l.id, l.decision])).toEqual([
        ['old', 'skip_created_before_first_entry'],
        ['undated', 'skip_created_before_first_entry'],
        ['new', 'show'],
      ]);
      log.mockRestore();
    });
  });
});
