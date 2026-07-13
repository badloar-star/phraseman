import type { YoutubePlayerMessage } from './youtube_analytics_contract';
import type { YoutubePlaybackRuntime } from './youtube_playback_runtime';

type RuntimePlayerMessage = Exclude<YoutubePlayerMessage, { type: 'ready' }>;

export function handleYoutubePlayerRuntimeMessage(
  runtime: YoutubePlaybackRuntime,
  message: RuntimePlayerMessage,
): void {
  if (message.type === 'error') {
    runtime.finish('error');
    return;
  }
  const progress = { positionMs: message.positionMs, durationMs: message.durationMs };
  if (message.state === 'ended') {
    runtime.finish('ended', progress);
    return;
  }
  if (message.state === 'playing' && runtime.getSnapshot().isPlaying) {
    runtime.tick(progress);
    return;
  }
  runtime.handleState(message.state, progress);
}

export default function __RouteShim() { return null; }
