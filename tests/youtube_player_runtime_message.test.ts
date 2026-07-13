import { createYoutubePlaybackRuntime, type YoutubePlaybackRuntimeEvent } from '../app/youtube_playback_runtime';
import { handleYoutubePlayerRuntimeMessage } from '../app/youtube_player_runtime_message';

test('playing after pause resumes before a later polling tick', () => {
  let now = 0;
  const events: YoutubePlaybackRuntimeEvent[] = [];
  const runtime = createYoutubePlaybackRuntime({
    videoId: 'video_1', now: () => now, createId: () => 'play-1', emit: event => events.push(event),
  });
  runtime.setConsent(true);

  handleYoutubePlayerRuntimeMessage(runtime, { version: 1, type: 'state', state: 'playing', positionMs: 0, durationMs: 30_000 });
  now = 5_000;
  handleYoutubePlayerRuntimeMessage(runtime, { version: 1, type: 'state', state: 'paused', positionMs: 5_000, durationMs: 30_000 });
  now = 6_000;
  handleYoutubePlayerRuntimeMessage(runtime, { version: 1, type: 'state', state: 'playing', positionMs: 5_000, durationMs: 30_000 });
  now = 16_000;
  handleYoutubePlayerRuntimeMessage(runtime, { version: 1, type: 'state', state: 'playing', positionMs: 15_000, durationMs: 30_000 });

  expect(runtime.getSnapshot()).toMatchObject({ isPlaying: true, activeWatchMs: 15_000 });
  expect(events.map(event => event.kind)).toEqual(['start', 'checkpoint']);
});
