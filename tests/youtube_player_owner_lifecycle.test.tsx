import React, { act } from 'react';
import { createRoot, type Root } from 'test-renderer';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

type BridgeHandler = (event: { nativeEvent: { data: string } }) => void;
type WebViewTarget = {
  injectedScripts: string[];
  mounted: boolean;
  onError: () => void;
  onMessage: BridgeHandler;
};

const mockTargets: WebViewTarget[] = [];
const mockAwakeTags = new Set<string>();
const mockActivateKeepAwakeAsync = jest.fn<Promise<void>, [string]>();
const mockDeactivateKeepAwake = jest.fn<Promise<void>, [string]>(() => Promise.resolve());
const mockSetManagedAudioMode = jest.fn(() => Promise.resolve({ ok: true }));
const mockReadYoutubeResumeSec = jest.fn<Promise<number | null>, [string]>();
const mockRecordingState = { active: false };

jest.mock('react-native', () => ({
  ActivityIndicator: 'ActivityIndicator',
  TouchableOpacity: 'TouchableOpacity',
  View: 'View',
  StyleSheet: { absoluteFill: {}, absoluteFillObject: {}, create: <T,>(styles: T): T => styles },
}));

jest.mock('react-native-webview', () => {
  const ReactRuntime = jest.requireActual<typeof React>('react');
  const WebView = ReactRuntime.forwardRef(function WebViewProbe(
    props: { onError: () => void; onMessage: BridgeHandler; testID?: string },
    ref: React.ForwardedRef<{ injectJavaScript(script: string): void }>,
  ) {
    const targetRef = ReactRuntime.useRef<WebViewTarget | null>(null);
    if (!targetRef.current) {
      targetRef.current = {
        injectedScripts: [],
        mounted: false,
        onError: props.onError,
        onMessage: props.onMessage,
      };
      mockTargets.push(targetRef.current);
    }
    targetRef.current.onError = props.onError;
    targetRef.current.onMessage = props.onMessage;
    ReactRuntime.useImperativeHandle(ref, () => ({
      injectJavaScript: (script: string) => { targetRef.current!.injectedScripts.push(script); },
    }), []);
    ReactRuntime.useEffect(() => {
      const target = targetRef.current!;
      target.mounted = true;
      return () => { target.mounted = false; };
    }, []);
    return ReactRuntime.createElement('NativeWebView', { testID: props.testID });
  });
  return { __esModule: true, default: WebView };
});

jest.mock('expo-keep-awake', () => ({
  activateKeepAwakeAsync: (tag: string) => mockActivateKeepAwakeAsync(tag),
  deactivateKeepAwake: (tag: string) => mockDeactivateKeepAwake(tag),
}));
jest.mock('@expo/vector-icons/Ionicons', () => 'Ionicons');
jest.mock('expo-image', () => ({ Image: 'Image' }));
jest.mock('../app/lingman_youtube', () => ({
  LINGMAN_PLAYER_BRIDGE_SOURCE: 'lingman-player',
  LINGMAN_YOUTUBE_EMBED_BASE_URL: 'https://app.phraseman/',
  buildLingmanEmbedHtml: () => '<html></html>',
}));
jest.mock('../app/youtube_player_seek_bus', () => ({
  publishYoutubePosition: jest.fn(),
  registerYoutubePauseHandler: () => () => undefined,
  registerYoutubeSeekHandler: () => () => undefined,
  takePendingYoutubeSeek: () => null,
}));
jest.mock('../app/youtube_resume_position', () => ({
  forgetYoutubePosition: jest.fn(),
  readYoutubeResumeSec: (videoId: string) => mockReadYoutubeResumeSec(videoId),
  rememberYoutubePosition: jest.fn(),
}));
jest.mock('../constants/i18n', () => ({ triLang: (_lang: string, values: Record<string, string>) => values.en }));
jest.mock('../app/audio_session_coordinator', () => ({
  getManagedAudioModeSnapshot: () => ({ recordingActive: mockRecordingState.active }),
  setManagedAudioMode: (...args: unknown[]) => mockSetManagedAudioMode(...args),
  subscribeManagedAudioMode: () => () => undefined,
}));
jest.mock('../app/audio_mode_outcome_diagnostics', () => ({ reportYoutubeAudioModeOutcome: jest.fn() }));
jest.mock('../app/audio_playback_mode', () => ({ UI_SFX_AUDIO_MODE: {} }));
jest.mock('../modules/audio/audio_activity', () => ({
  acquireAudioActivity: () => ({ release: () => undefined }),
  whenAudioActivityReady: () => Promise.resolve(true),
}));
jest.mock('../modules/audio/voice_playback_policy', () => ({
  voicePlaybackPolicy: { isEnabled: () => true, registerStop: () => undefined },
}));
jest.mock('../components/LangContext', () => ({ useLang: () => ({ lang: 'en' }) }));
jest.mock('../components/ThemeContext', () => ({ useTheme: () => ({ liquidGlassThemeId: 'test' }) }));
jest.mock('../constants/liquidGlassThemePalette', () => ({ liquidGlassTokens: () => ({}) }));
jest.mock('../components/video/video_media_tones', () => ({
  useVideoMediaTones: () => ({ stage: '#000', ink: '#fff', control: '#000' }),
}));
jest.mock('../components/v2/ShadowSurface', () => ({ plateBoxShadow: () => undefined }));
jest.mock('../app/train_nav_trace', () => ({ trainNavMark: jest.fn() }));
jest.mock('../app/video_open_trace', () => ({ videoOpenMark: jest.fn() }));
jest.mock('../components/text-integrity', () => ({ FlowText: 'Text' }));
jest.mock('../components/youtube/YoutubePlayerConveniences', () => () => null);

import YoutubeInlinePlayer from '../components/youtube/YoutubeInlinePlayer';
import { videoAudioArbiter } from '../modules/audio/audio_runtime_arbiter';

const playback = (target: WebViewTarget, playing: boolean): void => {
  target.onMessage({ nativeEvent: { data: JSON.stringify({
    source: 'lingman-player', type: 'playback', playing, positionMs: 12_000,
  }) } });
};

const ready = (target: WebViewTarget): void => {
  target.onMessage({ nativeEvent: { data: JSON.stringify({ source: 'lingman-player', type: 'ready' }) } });
};

describe('YoutubeInlinePlayer media-owner lifecycle', () => {
  let root: Root;

  const render = async (active: boolean, videoId = 'owner-a', startSec?: number): Promise<void> => {
    await act(() => root.render(React.createElement(YoutubeInlinePlayer, {
      active, videoId, startSec, title: 'Owner lifecycle probe', presentation: 'preview',
    })));
  };

  beforeEach(() => {
    root = createRoot();
    mockTargets.length = 0;
    mockAwakeTags.clear();
    mockActivateKeepAwakeAsync.mockReset().mockImplementation(async (tag) => { mockAwakeTags.add(tag); });
    mockDeactivateKeepAwake.mockReset().mockImplementation(async (tag) => { mockAwakeTags.delete(tag); });
    mockSetManagedAudioMode.mockClear();
    mockRecordingState.active = false;
    mockReadYoutubeResumeSec.mockReset().mockResolvedValue(null);
    videoAudioArbiter.stopCurrent();
  });

  afterEach(async () => {
    await act(() => root.unmount());
    videoAudioArbiter.stopCurrent();
    jest.useRealTimers();
  });

  it('releases its real arbiter claim and keep-awake when inactive without a final bridge message', async () => {
    await render(true);
    const oldTarget = mockTargets[0];
    await act(() => playback(oldTarget, true));
    expect(videoAudioArbiter.hasOwner()).toBe(true);
    expect(mockActivateKeepAwakeAsync).toHaveBeenCalledTimes(1);

    await render(false);
    expect(oldTarget.mounted).toBe(false);
    expect(videoAudioArbiter.hasOwner()).toBe(false);
    expect(mockDeactivateKeepAwake).toHaveBeenCalledTimes(1);

    await render(false);
    await act(() => playback(oldTarget, true));
    expect(videoAudioArbiter.hasOwner()).toBe(false);
    expect(mockActivateKeepAwakeAsync).toHaveBeenCalledTimes(1);
    expect(mockDeactivateKeepAwake).toHaveBeenCalledTimes(1);
  });

  // F20: экран ролика при уходе даёт active=false, а не размонтирует плеер — режим звука обязан вернуться уже тогда.
  it('returns the app audio mode once when going inactive, not again on unmount', async () => {
    await render(true);
    expect(mockSetManagedAudioMode).not.toHaveBeenCalled();
    await render(false);
    expect(mockSetManagedAudioMode).toHaveBeenCalledTimes(1);
    await act(() => root.unmount());
    expect(mockSetManagedAudioMode).toHaveBeenCalledTimes(1);
    root = createRoot();
  });

  it('never touched the audio mode if the player was never active', async () => {
    await render(false);
    await act(() => root.unmount());
    expect(mockSetManagedAudioMode).not.toHaveBeenCalled();
    root = createRoot();
  });

  // F20: выгрузка плеера отложена до конца перехода — к ней следующий экран уже может писать с микрофона.
  it('does not overwrite a live recording mode when the player leaves late', async () => {
    await render(true);
    mockRecordingState.active = true;
    await render(false);
    expect(mockSetManagedAudioMode).not.toHaveBeenCalled();
  });

  it('rejects old native-target messages after reactivation and replacement, but current playback reacquires', async () => {
    await render(true);
    const firstTarget = mockTargets[0];
    await render(false);
    await render(true);
    const reactivatedTarget = mockTargets[1];

    await act(() => playback(firstTarget, true));
    expect(videoAudioArbiter.hasOwner()).toBe(false);
    await act(() => playback(reactivatedTarget, true));
    expect(videoAudioArbiter.hasOwner()).toBe(true);

    await render(true, 'owner-b');
    const replacementTarget = mockTargets[2];
    expect(videoAudioArbiter.hasOwner()).toBe(false);
    await act(() => playback(reactivatedTarget, true));
    expect(videoAudioArbiter.hasOwner()).toBe(false);
    await act(() => playback(replacementTarget, true));
    expect(videoAudioArbiter.hasOwner()).toBe(true);
  });

  it('orders inactive deactivation after pending activation without duplicating it on unmount', async () => {
    let finishActivation!: () => void;
    mockActivateKeepAwakeAsync.mockImplementationOnce(() => new Promise<void>((resolve) => {
      finishActivation = resolve;
    }));
    await render(true);
    await act(() => playback(mockTargets[0], true));
    await render(false);
    expect(videoAudioArbiter.hasOwner()).toBe(false);
    expect(mockDeactivateKeepAwake).not.toHaveBeenCalled();

    await act(async () => finishActivation());
    expect(mockDeactivateKeepAwake).toHaveBeenCalledTimes(1);
    await act(() => root.unmount());
    expect(mockDeactivateKeepAwake).toHaveBeenCalledTimes(1);
    root = createRoot();
  });

  it('releases only the inactive instance keep-awake when two players retain the same video', async () => {
    const pair = async (firstActive: boolean, secondActive: boolean): Promise<void> => {
      await act(() => root.render(React.createElement(React.Fragment, null,
        React.createElement(YoutubeInlinePlayer, {
          key: 'first', active: firstActive, videoId: 'shared-video', title: 'First', presentation: 'preview',
        }),
        React.createElement(YoutubeInlinePlayer, {
          key: 'second', active: secondActive, videoId: 'shared-video', title: 'Second', presentation: 'preview',
        }),
      )));
    };
    await pair(true, true);
    const firstTarget = mockTargets[0];
    const secondTarget = mockTargets[1];
    await act(() => playback(firstTarget, true));
    await act(() => playback(secondTarget, true));
    expect(mockAwakeTags.size).toBe(2);

    await pair(false, true);
    expect(videoAudioArbiter.hasOwner()).toBe(true);
    expect(mockAwakeTags.size).toBe(1);
  });

  it('does not let an old ready continuation override a new explicit start session', async () => {
    let finishOldRead!: (value: number | null) => void;
    mockReadYoutubeResumeSec.mockImplementationOnce(() => new Promise((resolve) => {
      finishOldRead = resolve;
    }));
    await render(true);
    const oldTarget = mockTargets[0];
    await act(() => ready(oldTarget));
    expect(mockReadYoutubeResumeSec).toHaveBeenCalledTimes(1);

    await render(true, 'owner-a', 60);
    const explicitStartTarget = mockTargets[1];
    await act(() => ready(explicitStartTarget));
    await act(async () => finishOldRead(12));
    expect(explicitStartTarget.injectedScripts.join('\n')).not.toContain('__lingmanSeek(12)');
  });

  it('rejects a ready read from an errored target after retry but accepts the retry target read', async () => {
    jest.useFakeTimers();
    let finishOldRead!: (value: number | null) => void;
    let finishRetryRead!: (value: number | null) => void;
    mockReadYoutubeResumeSec
      .mockImplementationOnce(() => new Promise((resolve) => { finishOldRead = resolve; }))
      .mockImplementationOnce(() => new Promise((resolve) => { finishRetryRead = resolve; }));
    await render(true);
    const erroredTarget = mockTargets[0];
    await act(() => ready(erroredTarget));
    await act(() => erroredTarget.onError());
    await act(() => jest.advanceTimersByTime(20_000));
    const retryTarget = mockTargets[1];
    await act(() => ready(retryTarget));

    await act(async () => finishOldRead(12));
    expect(retryTarget.injectedScripts.join('\n')).not.toContain('__lingmanSeek(12)');
    await act(async () => finishRetryRead(24));
    expect(retryTarget.injectedScripts.join('\n')).toContain('__lingmanSeek(24)');
  });
});
