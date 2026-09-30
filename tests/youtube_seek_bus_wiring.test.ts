import fs from 'fs';
import path from 'path';
import {
  activePhraseIndex,
  hasYoutubeSeekHandler,
  publishYoutubePosition,
  registerYoutubeSeekHandler,
  requestYoutubeSeek,
  subscribeYoutubePosition,
  takePendingYoutubeSeek,
} from '../app/youtube_player_seek_bus';
import { createYoutubeSeekController } from '../app/youtube_seek_controller';
import { buildLingmanEmbedHtml } from '../app/lingman_youtube';

const read = (rel: string) => fs.readFileSync(path.join(__dirname, '..', rel), 'utf8');

beforeEach(() => {
  jest.spyOn(console, 'log').mockImplementation(() => undefined);
  jest.spyOn(console, 'warn').mockImplementation(() => undefined);
});
afterEach(() => jest.restoreAllMocks());

describe('youtube seek bus wiring (VIDEO-SEEK)', () => {
  it('player registers on mount and unregisters on unmount (source contract)', () => {
    const player = read('components/youtube/YoutubeInlinePlayer.tsx');
    expect(player).toContain('registerYoutubeSeekHandler(videoId, seekController.requestSeek)');
    expect(player).toMatch(/return \(\) => \{\s*unregister\(\);/);
    expect(player).toContain('publishYoutubePosition(videoId, positionMs / 1000)');
    expect(player).toContain("parsed.type === 'ready'");
  });

  it('bus: register → has → request reaches handler with the right second → unregister', () => {
    const handler = jest.fn();
    const off = registerYoutubeSeekHandler('vidA', handler);
    expect(hasYoutubeSeekHandler('vidA')).toBe(true);
    expect(requestYoutubeSeek('vidA', 42)).toBe(true);
    expect(handler).toHaveBeenCalledWith(42);
    off();
    expect(hasYoutubeSeekHandler('vidA')).toBe(false);
    expect(requestYoutubeSeek('vidA', 7)).toBe(false);
    takePendingYoutubeSeek('vidA');
  });

  it('phrase list emits seek only when a player is open, else opens the card (source contract)', () => {
    const phrases = read('components/youtube/YoutubeVideoPhrases.tsx');
    expect(phrases).toContain('hasYoutubeSeekHandler(videoId)');
    expect(phrases).toContain('requestYoutubeSeek(videoId, start)');
    expect(phrases).toContain('onLongPress={() => setSelected(phrase)}');
  });

  it('controller queues the last seek until ready, then applies it once', () => {
    const send = jest.fn();
    const c = createYoutubeSeekController('vidB', send);
    c.requestSeek(10);
    c.requestSeek(25);
    expect(send).not.toHaveBeenCalled();
    c.markReady();
    expect(send).toHaveBeenCalledTimes(1);
    expect(send).toHaveBeenCalledWith(25);
    c.requestSeek(30);
    expect(send).toHaveBeenLastCalledWith(30);
    c.reset();
    c.requestSeek(5);
    expect(send).toHaveBeenCalledTimes(2);
    c.markReady();
    expect(send).toHaveBeenLastCalledWith(5);
  });

  it('controller takes a bus-pending seek on ready and rejects bad seconds', () => {
    const send = jest.fn();
    const c = createYoutubeSeekController('vidC', send, () => 99);
    c.requestSeek(-1);
    c.requestSeek(NaN);
    c.markReady();
    expect(send).toHaveBeenCalledTimes(1);
    expect(send).toHaveBeenCalledWith(99);
  });

  it('position channel + active phrase highlight', () => {
    const got: number[] = [];
    const off = subscribeYoutubePosition('vidD', (p) => got.push(p));
    publishYoutubePosition('vidD', 12.5);
    off();
    publishYoutubePosition('vidD', 13);
    expect(got).toEqual([12.5]);
    expect(activePhraseIndex([0, 10, 20], 12)).toBe(1);
    expect(activePhraseIndex([undefined, 10], 5)).toBe(-1);
  });

  it('embed html exposes ready signal and seek function', () => {
    const html = buildLingmanEmbedHtml('abc', { autoplay: true });
    expect(html).toContain("type: 'ready'");
    expect(html).toContain('window.__lingmanSeek');
    expect(html).toContain('player.seekTo(sec, true)');
  });
});
