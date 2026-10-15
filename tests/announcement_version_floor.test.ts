// зачем (координатор 15.10): старые серверные анонсы 1.6.x («всем», активные, неистёкшие) не должны всплыть окном в 2.0.
const store: Record<string, string> = {};
jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(async (k: string) => store[k] ?? null),
  setItem: jest.fn(async (k: string, v: string) => { store[k] = v; }),
}));

import { ANNOUNCEMENT_FLOOR_KEY, readOrInitAnnouncementFloor, skipAnnouncementsBeforeFloor } from '../app/announcement_version_floor';
import { normalizeAppMessage } from '../app/app_messages';

const NOW = 1_800_000_000_000;
const msg = (id: string, createdAtMs: number, createdAtKnown = true, targetAppVersions: string[] = []) => ({ id, createdAtMs, createdAtKnown, targetAppVersions });

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

  // Правила координатора 15.10: старый без цели — нет; старый с целевой версией 2.0 — да; без даты — нет; новый — да.
  it('old untargeted — no; old targeted at 2.0 — yes; no date — no (even targeted); new — yes', () => {
    const queue = [
      msg('old-1.6', NOW - 10 * 24 * 3600_000),
      msg('release-2.0', NOW - 3600_000, true, ['2.0.0']),
      msg('no-date', NOW + 5000, false),
      msg('no-date-targeted', NOW + 5000, false, ['2.0.0']),
      msg('new', NOW + 1000),
      msg('same-ms', NOW),
    ];
    expect(skipAnnouncementsBeforeFloor(queue, NOW).map((m) => m.id)).toEqual(['release-2.0', 'new']);
  });

  it('normalizeAppMessage marks a server message without createdAt as unknown (it used to become "now")', () => {
    expect(normalizeAppMessage('a', { titleRu: 't' }, NOW).createdAtKnown).toBe(false);
    expect(normalizeAppMessage('b', { titleRu: 't', createdAtMs: NOW - 1000 }, NOW).createdAtKnown).toBe(true);
    expect(normalizeAppMessage('c', { titleRu: 't', createdAt: '2026-08-01T10:00:00Z' }, NOW).createdAtKnown).toBe(true);
  });
});
