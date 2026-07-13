import { runInNewContext } from 'node:vm';

import {
  buildLingmanEmbedHtml,
  LINGMAN_CHANNEL_HANDLE,
  LINGMAN_CHANNEL_ID,
  LINGMAN_CHANNEL_URL,
  getLingmanYoutubeUnreadCount,
  getLingmanYoutubeWatchUrl,
  getValidLingmanYoutubeVideoId,
  getTrustedLingmanYoutubeUrl,
  isLingmanLongFormVideo,
  LINGMAN_YOUTUBE_EMBED_BASE_URL,
  parseLingmanYoutubeFeed,
  parseYoutubeVideoId,
  parsePinnedVideos,
  mergePinnedVideos,
  type LingmanYoutubeVideo,
} from '../app/lingman_youtube';
import { parseYoutubePlayerMessage } from '../app/youtube_analytics_contract';

type BridgeEventListener = () => void;

type BridgeHarnessOptions = {
  autoApiReady?: boolean;
  constructorThrows?: boolean;
};

function createBridgeHarness(options: BridgeHarnessOptions = {}) {
  const html = buildLingmanEmbedHtml('X7L3Xg3qITo');
  const inlineScript = html.match(/<script>\s*([\s\S]*?)<\/script>/)?.[1];
  if (!inlineScript) throw new Error('Generated bridge script not found');

  const rawMessages: string[] = [];
  const documentListeners = new Map<string, BridgeEventListener>();
  const windowListeners = new Map<string, BridgeEventListener>();
  const intervals = new Map<number, () => void>();
  const timeouts = new Map<number, { callback: () => void; delayMs: number }>();
  const insertedScripts: Array<{ src?: string; async?: boolean; id?: string; onerror?: () => void }> = [];
  let nextIntervalId = 1;
  let nextTimeoutId = 10_000;
  let playerState = 2;
  let currentTimeThrows = false;
  let durationThrows = false;
  let playerStateThrows = false;
  let playerEvents: Record<string, (event?: { data?: number }) => void> | null = null;
  let constructorArgs: { elementId: string; options: Record<string, unknown> } | null = null;
  let callbackInstalledWhenScriptAppended = false;

  const player = {
    getCurrentTime: () => {
      if (currentTimeThrows) throw new Error('current time unavailable');
      return 12.345;
    },
    getDuration: () => {
      if (durationThrows) throw new Error('duration unavailable');
      return 60;
    },
    getPlayerState: () => {
      if (playerStateThrows) throw new Error('player state unavailable');
      return playerState;
    },
  };
  const documentObject = {
    visibilityState: 'visible',
    addEventListener: (name: string, listener: BridgeEventListener) => {
      documentListeners.set(name, listener);
    },
    createElement: (tagName: string) => {
      if (tagName !== 'script') throw new Error(`Unexpected element: ${tagName}`);
      return {} as { src?: string; async?: boolean; id?: string; onerror?: () => void };
    },
    getElementById: (id: string) => insertedScripts.find((script) => script.id === id) ?? null,
    head: {
      appendChild: (script: { src?: string; async?: boolean; id?: string; onerror?: () => void }) => {
        callbackInstalledWhenScriptAppended = typeof windowObject.onYouTubeIframeAPIReady === 'function';
        insertedScripts.push(script);
      },
    },
  };
  const windowObject: Record<string, unknown> = {
    ReactNativeWebView: {
      postMessage: (raw: string) => rawMessages.push(raw),
    },
    addEventListener: (name: string, listener: BridgeEventListener) => {
      windowListeners.set(name, listener);
    },
  };
  function MockPlayer(
    elementId: string,
    options: { events: Record<string, (event?: { data?: number }) => void> },
  ) {
    if (optionsForHarness.constructorThrows) throw new Error('constructor failed');
    constructorArgs = { elementId, options: options as unknown as Record<string, unknown> };
    playerEvents = options.events;
    return player;
  }
  const YT = { Player: MockPlayer };
  const optionsForHarness = options;
  windowObject.YT = YT;

  runInNewContext(inlineScript, {
    window: windowObject,
    document: documentObject,
    YT,
    setInterval: (callback: () => void, delayMs: number) => {
      if (delayMs !== 1_000) throw new Error(`Unexpected interval: ${delayMs}`);
      const id = nextIntervalId;
      nextIntervalId += 1;
      intervals.set(id, callback);
      return id;
    },
    clearInterval: (id: number) => intervals.delete(id),
    setTimeout: (callback: () => void, delayMs: number) => {
      const id = nextTimeoutId;
      nextTimeoutId += 1;
      timeouts.set(id, { callback, delayMs });
      return id;
    },
    clearTimeout: (id: number) => timeouts.delete(id),
  });

  function fireApiReady() {
    const apiReady = windowObject.onYouTubeIframeAPIReady;
    if (typeof apiReady !== 'function') throw new Error('YouTube API callback not installed');
    apiReady();
  }

  if (options.autoApiReady !== false) fireApiReady();

  return {
    emitYoutubeState(state: number) {
      playerState = state;
      playerEvents?.onStateChange({ data: state });
    },
    fireApiReady,
    firePlayerReady() {
      playerEvents?.onReady();
    },
    firePlayerError(code: number) {
      playerEvents?.onError({ data: code });
    },
    fireScriptError() {
      insertedScripts[0]?.onerror?.();
    },
    fireTimeouts() {
      const pending = [...timeouts.values()];
      timeouts.clear();
      pending.forEach(({ callback }) => callback());
    },
    runPollingCallbacks() {
      [...intervals.values()].forEach((callback) => callback());
    },
    setPlayerMethodThrows(methods: { currentTime?: boolean; duration?: boolean; state?: boolean }) {
      currentTimeThrows = methods.currentTime === true;
      durationThrows = methods.duration === true;
      playerStateThrows = methods.state === true;
    },
    setAnalyticsActive(active: boolean) {
      const setter = windowObject.__phrasemanSetAnalyticsActive;
      if (typeof setter !== 'function') throw new Error('Analytics activity setter not installed');
      setter(active);
    },
    setVisibility(visibilityState: 'visible' | 'hidden') {
      documentObject.visibilityState = visibilityState;
      documentListeners.get('visibilitychange')?.();
    },
    dispatchWindowEvent(name: 'pagehide' | 'beforeunload' | 'pageshow') {
      windowListeners.get(name)?.();
    },
    parsedMessages() {
      return rawMessages.map(parseYoutubePlayerMessage);
    },
    get intervalCount() {
      return intervals.size;
    },
    get timeoutCount() {
      return timeouts.size;
    },
    get timeoutDelays() {
      return [...timeouts.values()].map(({ delayMs }) => delayMs);
    },
    get insertedScripts() {
      return insertedScripts;
    },
    get callbackInstalledWhenScriptAppended() {
      return callbackInstalledWhenScriptAppended;
    },
    get constructorArgs() {
      return constructorArgs;
    },
  };
}

function makeVideo(id: string): LingmanYoutubeVideo {
  return {
    id,
    title: id,
    description: '',
    thumbnailUrl: `https://i.ytimg.com/vi/${id}/hqdefault.jpg`,
    publishedAt: '2026-06-01T00:00:00+00:00',
    updatedAt: '2026-06-01T00:00:00+00:00',
    watchUrl: getLingmanYoutubeWatchUrl(id),
  };
}

describe('lingman_youtube', () => {
  it('points the catalog feed and channel button to the PHRASEMAN English channel', () => {
    expect(LINGMAN_CHANNEL_ID).toBe('UCNNVZbMkh4jrW6uluaaJTwA');
    expect(LINGMAN_CHANNEL_HANDLE).toBe('@PhrasemanENGLISH');
    expect(LINGMAN_CHANNEL_URL).toBe('https://www.youtube.com/@PhrasemanENGLISH/videos');
  });

  it('parses the YouTube RSS feed entries used by the catalog', () => {
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
      <feed xmlns:yt="http://www.youtube.com/xml/schemas/2015" xmlns:media="http://search.yahoo.com/mrss/" xmlns="http://www.w3.org/2005/Atom">
        <entry>
          <yt:videoId>X7L3Xg3qITo</yt:videoId>
          <title>200 phrases</title>
          <published>2026-05-31T13:21:06+00:00</published>
          <updated>2026-05-31T14:37:55+00:00</updated>
          <media:group>
            <media:title>200 phrases</media:title>
            <media:thumbnail url="https://i1.ytimg.com/vi/X7L3Xg3qITo/hqdefault.jpg" width="480" height="360"/>
            <media:description>Practice phrases after the video.</media:description>
            <media:community>
              <media:statistics views="179"/>
            </media:community>
          </media:group>
        </entry>
      </feed>`;

    const videos = parseLingmanYoutubeFeed(xml);

    expect(videos).toEqual([
      {
        id: 'X7L3Xg3qITo',
        title: '200 phrases',
        description: 'Practice phrases after the video.',
        thumbnailUrl: 'https://i1.ytimg.com/vi/X7L3Xg3qITo/hqdefault.jpg',
        publishedAt: '2026-05-31T13:21:06+00:00',
        updatedAt: '2026-05-31T14:37:55+00:00',
        watchUrl: 'https://www.youtube.com/watch?v=X7L3Xg3qITo',
        viewCount: 179,
      },
    ]);
  });

  it('filters Shorts out of the catalog feed', () => {
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
      <feed xmlns:yt="http://www.youtube.com/xml/schemas/2015" xmlns:media="http://search.yahoo.com/mrss/" xmlns="http://www.w3.org/2005/Atom">
        <entry>
          <yt:videoId>longVideo1</yt:videoId>
          <title>Long lesson</title>
          <published>2026-06-19T14:05:20+00:00</published>
          <updated>2026-06-19T14:12:17+00:00</updated>
          <media:group>
            <media:title>Long lesson</media:title>
            <media:description>Full lesson with examples.</media:description>
          </media:group>
        </entry>
        <entry>
          <yt:videoId>shortVideo1</yt:videoId>
          <title>Short clip</title>
          <published>2026-06-19T13:31:12+00:00</published>
          <updated>2026-06-19T13:48:03+00:00</updated>
          <media:group>
            <media:title>Short clip</media:title>
            <media:description>Fast clip #short</media:description>
          </media:group>
        </entry>
      </feed>`;

    expect(parseLingmanYoutubeFeed(xml).map((video) => video.id)).toEqual(['longVideo1']);
    expect(isLingmanLongFormVideo({ id: 'xdISurogEds', title: 'Any title', description: '' })).toBe(false);
  });

  it('builds an official YouTube IFrame API player without autoplay', () => {
    const html = buildLingmanEmbedHtml('X7L3Xg3qITo');

    expect(html).toContain('https://www.youtube.com/iframe_api');
    expect(html).not.toContain('<script src="https://www.youtube.com/iframe_api"');
    expect(html).toContain('new YT.Player(');
    expect(html).toContain(`videoId: 'X7L3Xg3qITo'`);
    expect(html).toContain("playsinline: 1");
    expect(html).toContain("rel: 0");
    expect(html).toContain("controls: 1");
    expect(html).toContain("fs: 1");
    expect(html).toContain(`origin: '${LINGMAN_YOUTUBE_EMBED_BASE_URL.replace(/\/$/, '')}'`);
    expect(html).toContain(`widget_referrer: '${LINGMAN_YOUTUBE_EMBED_BASE_URL}'`);
    expect(html).toContain('<meta name="referrer" content="strict-origin-when-cross-origin">');
    expect(html).not.toMatch(/autoplay\s*[:=]/);
    expect(html).not.toMatch(/modestbranding\s*[:=]/);
    expect(html).not.toContain(' autoplay;');
  });

  it('bridges ready, bounded errors, and exact supported player state snapshots', () => {
    const html = buildLingmanEmbedHtml('X7L3Xg3qITo');

    expect(html).toContain("postMessage(JSON.stringify(message))");
    expect(html).toContain("postMessage({ version: 1, type: 'ready' })");
    expect(html).toContain("postMessage({ version: 1, type: 'error', code: errorCode })");
    expect(html).toContain("0: 'ended'");
    expect(html).toContain("1: 'playing'");
    expect(html).toContain("2: 'paused'");
    expect(html).toContain("3: 'buffering'");
    expect(html).toContain("events: { onReady: onReady, onStateChange: onStateChange, onError: onError }");
    expect(html).toContain("positionMs = toBoundedMs(player.getCurrentTime())");
    expect(html).toContain("durationMs = toBoundedMs(player.getDuration())");
    expect(html).toContain('[2, 5, 100, 101, 150]');
  });

  it('polls once per second only while active, visible, and playing', () => {
    const html = buildLingmanEmbedHtml('X7L3Xg3qITo');

    expect(html).toContain('setInterval(emitCurrentState, 1000)');
    expect(html).toContain('if (pollTimer !== null) return');
    expect(html).toContain('clearInterval(pollTimer)');
    expect(html).toContain('player.getPlayerState() === 1');
    expect(html).toContain('analyticsActive');
    expect(html).toContain("document.visibilityState !== 'visible'");
    expect(html).toContain('window.__phrasemanSetAnalyticsActive = function(active)');
    expect(html).toContain("document.addEventListener('visibilitychange'");
    expect(html).toContain("window.addEventListener('pagehide'");
    expect(html).toContain("window.addEventListener('beforeunload'");
  });

  it('rejects invalid video IDs before interpolating generated HTML', () => {
    expect(() => buildLingmanEmbedHtml(`bad'</script><script>alert(1)</script>`)).toThrow('Invalid YouTube video ID');
  });

  it('normalizes malformed route IDs before the render path reaches the strict builder', () => {
    const validVideoId = getValidLingmanYoutubeVideoId(`bad'</script><script>alert(1)</script>`);

    expect(validVideoId).toBeNull();
    expect(() => (validVideoId ? buildLingmanEmbedHtml(validVideoId) : null)).not.toThrow();
  });

  it('installs the API callback before dynamically loading the script exactly once', () => {
    const bridge = createBridgeHarness({ autoApiReady: false });

    expect(bridge.insertedScripts).toHaveLength(1);
    expect(bridge.insertedScripts[0]).toMatchObject({
      src: 'https://www.youtube.com/iframe_api',
      async: true,
    });
    expect(bridge.callbackInstalledWhenScriptAppended).toBe(true);
    expect(bridge.timeoutCount).toBe(1);
    expect(bridge.timeoutDelays[0]).toBeGreaterThan(0);
    expect(bridge.timeoutDelays[0]).toBeLessThanOrEqual(15_000);
  });

  it.each(['script error', 'timeout'] as const)('fails initialization once with code 5 on %s', (failure) => {
    const bridge = createBridgeHarness({ autoApiReady: false });

    if (failure === 'script error') bridge.fireScriptError();
    else bridge.fireTimeouts();
    bridge.fireScriptError();
    bridge.fireTimeouts();
    bridge.fireApiReady();

    expect(bridge.parsedMessages()).toEqual([{ version: 1, type: 'error', code: 5 }]);
    expect(bridge.intervalCount).toBe(0);
    expect(bridge.timeoutCount).toBe(0);
    expect(bridge.constructorArgs).toBeNull();
  });

  it('fails once with code 5 when the YT.Player constructor throws', () => {
    const bridge = createBridgeHarness({ autoApiReady: false, constructorThrows: true });

    bridge.fireApiReady();
    bridge.fireApiReady();
    bridge.fireTimeouts();

    expect(bridge.parsedMessages()).toEqual([{ version: 1, type: 'error', code: 5 }]);
    expect(bridge.intervalCount).toBe(0);
    expect(bridge.timeoutCount).toBe(0);
  });

  it('keeps the watchdog until player ready and latches timeout against late callbacks', () => {
    const bridge = createBridgeHarness({ autoApiReady: false });

    bridge.fireApiReady();
    expect(bridge.constructorArgs).not.toBeNull();
    expect(bridge.timeoutCount).toBe(1);

    bridge.fireTimeouts();
    bridge.firePlayerReady();
    bridge.setAnalyticsActive(true);
    bridge.emitYoutubeState(1);

    expect(bridge.parsedMessages()).toEqual([{ version: 1, type: 'error', code: 5 }]);
    expect(bridge.intervalCount).toBe(0);
    expect(bridge.timeoutCount).toBe(0);
  });

  it('executes ready/error handlers once and keeps official bounded error codes', () => {
    const bridge = createBridgeHarness();

    bridge.firePlayerReady();
    bridge.firePlayerReady();
    bridge.firePlayerError(150);
    bridge.firePlayerError(999);

    expect(bridge.parsedMessages()).toEqual([
      { version: 1, type: 'ready' },
      { version: 1, type: 'error', code: 150 },
    ]);
    expect(bridge.timeoutCount).toBe(0);
  });

  it('defaults analytics inactive and preserves playback player variables without autoplay', () => {
    const bridge = createBridgeHarness();
    const constructorArgs = bridge.constructorArgs as null | {
      elementId: string;
      options: { videoId: string; playerVars: Record<string, unknown> };
    };

    bridge.emitYoutubeState(1);
    expect(bridge.intervalCount).toBe(0);
    bridge.setAnalyticsActive(true);
    expect(bridge.intervalCount).toBe(1);
    expect(constructorArgs).toEqual({
      elementId: 'player',
      options: expect.objectContaining({
        videoId: 'X7L3Xg3qITo',
        playerVars: expect.objectContaining({ playsinline: 1, rel: 0, controls: 1, fs: 1 }),
      }),
    });
    expect(constructorArgs?.options.playerVars).not.toHaveProperty('autoplay');
  });

  it('executes the generated bridge and ignores unknown YouTube states', () => {
    const bridge = createBridgeHarness();

    bridge.emitYoutubeState(-1);
    bridge.emitYoutubeState(5);

    expect(bridge.parsedMessages()).toEqual([]);
    expect(bridge.intervalCount).toBe(0);
  });

  it.each([-1, 5])('immediately stops polling without emitting on unsupported state %s', (state) => {
    const bridge = createBridgeHarness();
    bridge.setAnalyticsActive(true);
    bridge.emitYoutubeState(1);
    const messagesBeforeUnsupportedState = bridge.parsedMessages();
    expect(bridge.intervalCount).toBe(1);

    bridge.emitYoutubeState(state);

    expect(bridge.intervalCount).toBe(0);
    expect(bridge.parsedMessages()).toEqual(messagesBeforeUnsupportedState);
  });

  it('keeps one interval and gates it by analytics activity, visibility, and playback state', () => {
    const bridge = createBridgeHarness();

    bridge.setAnalyticsActive(true);
    bridge.emitYoutubeState(1);
    bridge.emitYoutubeState(1);
    expect(bridge.intervalCount).toBe(1);

    bridge.setAnalyticsActive(false);
    expect(bridge.intervalCount).toBe(0);
    bridge.emitYoutubeState(1);
    expect(bridge.intervalCount).toBe(0);

    bridge.setAnalyticsActive(true);
    expect(bridge.intervalCount).toBe(1);
    bridge.setVisibility('hidden');
    expect(bridge.intervalCount).toBe(0);
    bridge.setAnalyticsActive(true);
    expect(bridge.intervalCount).toBe(0);

    bridge.setVisibility('visible');
    expect(bridge.intervalCount).toBe(1);
    bridge.emitYoutubeState(2);
    expect(bridge.intervalCount).toBe(0);
    bridge.setAnalyticsActive(false);
    bridge.setAnalyticsActive(true);
    expect(bridge.intervalCount).toBe(0);
  });

  it.each(['pagehide', 'beforeunload'] as const)('stops generated bridge polling on %s', (eventName) => {
    const bridge = createBridgeHarness();
    bridge.setAnalyticsActive(true);
    bridge.emitYoutubeState(1);

    bridge.dispatchWindowEvent(eventName);

    expect(bridge.intervalCount).toBe(0);
  });

  it('latches pagehide against late restarts and restores bfcache pages only under all gates', () => {
    const bridge = createBridgeHarness();
    bridge.setAnalyticsActive(true);
    bridge.emitYoutubeState(1);
    expect(bridge.intervalCount).toBe(1);

    bridge.dispatchWindowEvent('pagehide');
    bridge.emitYoutubeState(1);
    bridge.setAnalyticsActive(true);
    expect(bridge.intervalCount).toBe(0);

    bridge.setVisibility('hidden');
    bridge.dispatchWindowEvent('pageshow');
    expect(bridge.intervalCount).toBe(0);
    bridge.setVisibility('visible');
    expect(bridge.intervalCount).toBe(1);
  });

  it('does not restore polling after beforeunload', () => {
    const bridge = createBridgeHarness();
    bridge.setAnalyticsActive(true);
    bridge.emitYoutubeState(1);

    bridge.dispatchWindowEvent('beforeunload');
    bridge.dispatchWindowEvent('pageshow');
    bridge.emitYoutubeState(1);
    bridge.setAnalyticsActive(true);

    expect(bridge.intervalCount).toBe(0);
  });

  it('executes polling callbacks and contains player method failures', () => {
    const bridge = createBridgeHarness();
    bridge.setAnalyticsActive(true);
    bridge.emitYoutubeState(1);
    const messagesAfterPlaying = bridge.parsedMessages().length;

    bridge.runPollingCallbacks();
    expect(bridge.parsedMessages()).toHaveLength(messagesAfterPlaying + 1);

    bridge.setPlayerMethodThrows({ state: true });
    bridge.runPollingCallbacks();
    expect(bridge.intervalCount).toBe(0);
    expect(bridge.parsedMessages()).toHaveLength(messagesAfterPlaying + 1);

    bridge.setPlayerMethodThrows({ currentTime: true, duration: true });
    bridge.emitYoutubeState(2);
    expect(bridge.parsedMessages().at(-1)).toEqual({
      version: 1,
      type: 'state',
      state: 'paused',
      positionMs: 0,
      durationMs: 0,
    });
  });

  it('emits bridge state shapes accepted by the React Native parser', () => {
    const bridge = createBridgeHarness();

    bridge.emitYoutubeState(1);
    bridge.emitYoutubeState(3);
    bridge.emitYoutubeState(2);
    bridge.emitYoutubeState(0);

    expect(bridge.parsedMessages()).toEqual([
      { version: 1, type: 'state', state: 'playing', positionMs: 12_345, durationMs: 60_000 },
      { version: 1, type: 'state', state: 'buffering', positionMs: 12_345, durationMs: 60_000 },
      { version: 1, type: 'state', state: 'paused', positionMs: 12_345, durationMs: 60_000 },
      { version: 1, type: 'state', state: 'ended', positionMs: 12_345, durationMs: 60_000 },
    ]);
  });

  it('counts unread videos relative to the last opened latest video', () => {
    const videos = [
      { id: 'latest' },
      { id: 'middle' },
      { id: 'seen' },
    ].map((video) => ({
      ...video,
      title: video.id,
      description: '',
      thumbnailUrl: `https://i.ytimg.com/vi/${video.id}/hqdefault.jpg`,
      publishedAt: '2026-05-31T13:21:06+00:00',
      updatedAt: '2026-05-31T13:21:06+00:00',
      watchUrl: getLingmanYoutubeWatchUrl(video.id),
    }));

    expect(getLingmanYoutubeUnreadCount([], null)).toBe(0);
    expect(getLingmanYoutubeUnreadCount(videos, null)).toBe(1);
    expect(getLingmanYoutubeUnreadCount(videos, 'latest')).toBe(0);
    expect(getLingmanYoutubeUnreadCount(videos, 'middle')).toBe(1);
    expect(getLingmanYoutubeUnreadCount(videos, 'seen')).toBe(2);
    expect(getLingmanYoutubeUnreadCount(videos, 'missing')).toBe(1);
  });

  it('only returns trusted YouTube URLs for external fallbacks', () => {
    expect(getLingmanYoutubeWatchUrl('X7L3Xg3qITo')).toBe('https://www.youtube.com/watch?v=X7L3Xg3qITo');
    expect(getTrustedLingmanYoutubeUrl('https://www.youtube.com/watch?v=X7L3Xg3qITo')).toBe('https://www.youtube.com/watch?v=X7L3Xg3qITo');
    expect(getTrustedLingmanYoutubeUrl('https://m.youtube.com/watch?v=X7L3Xg3qITo')).toBe('https://m.youtube.com/watch?v=X7L3Xg3qITo');
    expect(getTrustedLingmanYoutubeUrl('https://youtu.be/X7L3Xg3qITo')).toBe('https://youtu.be/X7L3Xg3qITo');
    expect(getTrustedLingmanYoutubeUrl('https://www.youtube.com/@PhrasemanENGLISH/videos')).toBe('https://www.youtube.com/@PhrasemanENGLISH/videos');
    expect(getTrustedLingmanYoutubeUrl('https://evil.example/watch?v=X7L3Xg3qITo', 'X7L3Xg3qITo')).toBe('https://www.youtube.com/watch?v=X7L3Xg3qITo');
    expect(getTrustedLingmanYoutubeUrl('javascript:alert(1)', 'X7L3Xg3qITo')).toBe('https://www.youtube.com/watch?v=X7L3Xg3qITo');
    expect(getTrustedLingmanYoutubeUrl('https://evil.example/watch?v=X7L3Xg3qITo')).toBeNull();
  });
});

describe('lingman_youtube pinned ("manual") videos', () => {
  it('extracts a videoId from any YouTube URL shape or a bare id', () => {
    expect(parseYoutubeVideoId('dQw4w9WgXcQ')).toBe('dQw4w9WgXcQ');
    expect(parseYoutubeVideoId('https://www.youtube.com/watch?v=dQw4w9WgXcQ')).toBe('dQw4w9WgXcQ');
    expect(parseYoutubeVideoId('https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=42s')).toBe('dQw4w9WgXcQ');
    expect(parseYoutubeVideoId('https://youtu.be/dQw4w9WgXcQ')).toBe('dQw4w9WgXcQ');
    expect(parseYoutubeVideoId('https://www.youtube.com/shorts/dQw4w9WgXcQ')).toBe('dQw4w9WgXcQ');
    expect(parseYoutubeVideoId('https://www.youtube.com/embed/dQw4w9WgXcQ')).toBe('dQw4w9WgXcQ');
    expect(parseYoutubeVideoId('https://www.youtube.com/live/dQw4w9WgXcQ')).toBe('dQw4w9WgXcQ');
    // мусор / неполный id → ''
    expect(parseYoutubeVideoId('https://example.com/foo')).toBe('');
    expect(parseYoutubeVideoId('not an id')).toBe('');
    expect(parseYoutubeVideoId('')).toBe('');
    expect(parseYoutubeVideoId(null)).toBe('');
  });

  it('parses the pinned-videos JSON (objects, strings, dedup, garbage tolerance)', () => {
    const raw = JSON.stringify([
      { id: 'https://youtu.be/aaaaaaaaaaa', title: 'First' },
      'https://www.youtube.com/watch?v=bbbbbbbbbbb',
      { url: 'ccccccccccc' },
      { id: 'aaaaaaaaaaa' }, // дубль первого → отбрасывается
      { id: 'nope' },        // невалидный id → отбрасывается
      42,                     // мусор → отбрасывается
    ]);
    const pins = parsePinnedVideos(raw);
    expect(pins.map((p) => p.id)).toEqual(['aaaaaaaaaaa', 'bbbbbbbbbbb', 'ccccccccccc']);
    expect(pins[0].title).toBe('First');
    expect(pins[1].title).toBeUndefined();
  });

  it('returns no pins for empty/invalid JSON without throwing', () => {
    expect(parsePinnedVideos('')).toEqual([]);
    expect(parsePinnedVideos('not json')).toEqual([]);
    expect(parsePinnedVideos('{"not":"array"}')).toEqual([]);
    expect(parsePinnedVideos(null)).toEqual([]);
  });

  it('merges pinned videos to the FRONT and de-dups them out of the channel feed', () => {
    const pinned = [makeVideo('pin1'), makeVideo('pin2')];
    const feed = [makeVideo('pin2'), makeVideo('feedA'), makeVideo('feedB')];
    const merged = mergePinnedVideos(pinned, feed);
    // пины первыми, дубль pin2 убран из фида, порядок фида сохранён
    expect(merged.map((v) => v.id)).toEqual(['pin1', 'pin2', 'feedA', 'feedB']);
  });

  it('returns the feed unchanged when there are no pins', () => {
    const feed = [makeVideo('a'), makeVideo('b')];
    expect(mergePinnedVideos([], feed)).toBe(feed);
  });
});
