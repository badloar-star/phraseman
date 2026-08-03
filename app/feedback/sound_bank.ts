/**
 * Compatibility adapter for historical FeedbackKit imports.
 * Native player ownership lives exclusively in Sound Director.
 */
import { soundDirector } from '../../modules/audio/sound_director';
import type { SoundEventId } from '../../modules/audio/sound_events';

const LEGACY_SOUND_EVENTS = {
  correct: 'pm.learn.correct',
  star_1: 'pm.complete.star_1',
  star_2: 'pm.complete.star_2',
  star_3: 'pm.complete.star_3',
} as const satisfies Record<string, SoundEventId>;

export type SoundName = keyof typeof LEGACY_SOUND_EVENTS;

export interface PlayOptions {
  /** Retained for source compatibility; canonical volume comes from metadata. */
  volume?: number;
}

export function play(name: SoundName, _options: PlayOptions = {}): void {
  soundDirector.request(LEGACY_SOUND_EVENTS[name], { scope: 'legacy-sound-bank' });
}

export function preload(_names?: readonly SoundName[]): void {}

export function unloadAll(): void {}
