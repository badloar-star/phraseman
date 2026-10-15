// зачем (координатор 15.10): старые серверные анонсы 1.6.x («всем», активные, неистёкшие) не должны всплыть окном в 2.0.
const store: Record<string, string> = {};
jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(async (k: string) => store[k] ?? null),
  setItem: jest.fn(async (k: string, v: string) => { store[k] = v; }),
}));

import { ANNOUNCEMENT_FLOOR_KEY, readOrInitAnnouncementFloor, skipAnnouncementsBeforeFloor } from '../app/announcement_version_floor';
import { normalizeAppMessage } from '../app/app_messages';

const NOW = 1_800_000_000_000;
const msg = (id: string, createdAtMs: number, createdAtKnown = true) => ({ id, createdAtMs, createdAtKnown });

beforeEach(() => { Object.keys(store).forEach((k) => delete store[k]); });

describe('announcement floor (2.0)', () => {
  it('first run stores "now" as the floor; later runs keep it', async () => {
    await expect(readOrInitAnnouncementFloor(NOW)).resolves.toBe(NOW);
    expect(store[ANNOUNCEMENT_FLOOR_KEY]).toBe(String(NOW));
    await expect(readOrInitAnnouncementFloor(NOW + 60_000)).resolves.toBe(NOW);
  });

  it('a floor from the future (clock skew) or garbage is replaced with "now"', async () => {
    store[ANNOUNCEMENT_FLOOR_KEY] = String(NOW + 60 * 60 * 1000);
    await expect(readOrInitAnnouncementFloor(NOW)).resolves.toBe(NOW);
    store[ANNOUNCEMENT_FLOOR_KEY] = 'oops';
    await expect(readOrInitAnnouncementFloor(NOW)).resolves.toBe(NOW);
  });

  it('only announcements created after the first 2.0 launch pop up; no date — not shown', () => {
    const queue = [msg('old-1.6', NOW - 10 * 24 * 3600_000), msg('new', NOW + 1000), msg('same-ms', NOW), msg('no-date', NOW + 5000, false)];
    expect(skipAnnouncementsBeforeFloor(queue, NOW).map((m) => m.id)).toEqual(['new']);
  });

  it('normalizeAppMessage marks a server message without createdAt as unknown (it used to become "now")', () => {
    expect(normalizeAppMessage('a', { titleRu: 't' }, NOW).createdAtKnown).toBe(false);
    expect(normalizeAppMessage('b', { titleRu: 't', createdAtMs: NOW - 1000 }, NOW).createdAtKnown).toBe(true);
    expect(normalizeAppMessage('c', { titleRu: 't', createdAt: '2026-08-01T10:00:00Z' }, NOW).createdAtKnown).toBe(true);
  });
});
