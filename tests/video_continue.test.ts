/**
 * «Продолжить» в ленте «Видео» (владелец 11.11): правила, что запоминать и что показывать. Только чистые функции —
 * без диска и сети.
 */
import {
  freshVideoContinue,
  parseVideoContinue,
  shouldRememberVideoContinue,
  VIDEO_CONTINUE_TTL_MS,
  videoContinueMinutesLeft,
} from '../app/video_continue';

jest.mock('@react-native-async-storage/async-storage', () => ({ getItem: jest.fn(), setItem: jest.fn(), removeItem: jest.fn() }));
jest.mock('../app/stable_id', () => ({ peekStableId: () => 'owner-1' }));

const NOW = 1_800_000_000_000;

describe('video_continue', () => {
  it('едва начатый ролик не запоминается: меньше 10 секунд', () => {
    expect(shouldRememberVideoContinue(0, 600)).toBe(false);
    expect(shouldRememberVideoContinue(9.9, 600)).toBe(false);
    expect(shouldRememberVideoContinue(10, 600)).toBe(true);
  });

  it('досмотренный ролик не запоминается: 90 % и больше', () => {
    expect(shouldRememberVideoContinue(539, 600)).toBe(true);
    expect(shouldRememberVideoContinue(540, 600)).toBe(false);
    expect(shouldRememberVideoContinue(600, 600)).toBe(false);
  });

  it('без длительности решает только порог начала', () => {
    expect(shouldRememberVideoContinue(120)).toBe(true);
    expect(shouldRememberVideoContinue(3)).toBe(false);
    expect(shouldRememberVideoContinue(Number.NaN, 600)).toBe(false);
  });

  it('запись старше 14 дней не показывается', () => {
    const record = { videoId: 'v', positionSec: 120, durationSec: 600, atMs: NOW };
    expect(freshVideoContinue(record, NOW + VIDEO_CONTINUE_TTL_MS)).toEqual(record);
    expect(freshVideoContinue(record, NOW + VIDEO_CONTINUE_TTL_MS + 1)).toBeNull();
    expect(freshVideoContinue(null, NOW)).toBeNull();
  });

  it('запись о досмотренном ролике не показывается, даже если она свежая', () => {
    expect(freshVideoContinue({ videoId: 'v', positionSec: 590, durationSec: 600, atMs: NOW }, NOW)).toBeNull();
  });

  it('остаток считается в минутах вверх, минимум одна; без длительности его нет', () => {
    expect(videoContinueMinutesLeft({ videoId: 'v', positionSec: 359, durationSec: 725, atMs: NOW })).toBe(7);
    expect(videoContinueMinutesLeft({ videoId: 'v', positionSec: 700, durationSec: 725, atMs: NOW })).toBe(1);
    expect(videoContinueMinutesLeft({ videoId: 'v', positionSec: 60, atMs: NOW })).toBeNull();
  });

  it('с диска принимается только корректная запись', () => {
    expect(parseVideoContinue({ videoId: 'v', positionSec: 12.7, durationSec: 600, atMs: NOW })).toEqual({ videoId: 'v', positionSec: 12, durationSec: 600, atMs: NOW });
    expect(parseVideoContinue({ videoId: 'v', positionSec: 12, atMs: NOW })).toEqual({ videoId: 'v', positionSec: 12, atMs: NOW });
    expect(parseVideoContinue({ videoId: '', positionSec: 12, atMs: NOW })).toBeNull();
    expect(parseVideoContinue({ videoId: 'v', positionSec: -1, atMs: NOW })).toBeNull();
    expect(parseVideoContinue({ videoId: 'v', positionSec: '12', atMs: NOW })).toBeNull();
    expect(parseVideoContinue(null)).toBeNull();
    expect(parseVideoContinue([])).toBeNull();
  });
});
