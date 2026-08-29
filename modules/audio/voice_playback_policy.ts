import { getSoundSettingsSnapshot, subscribeSoundSettings } from './sound_settings';

export class VoicePlaybackPolicy {
  private generation = 0;
  private readonly stopCallbacks = new Set<() => void>();

  constructor(private enabled: boolean) {}

  captureStart(): number | null {
    return this.enabled ? this.generation : null;
  }

  canStart(token: number | null): boolean {
    return token !== null && this.enabled && token === this.generation;
  }

  registerStop(stop: () => void): () => void {
    if (!this.enabled) {
      try { stop(); } catch (e) {
      console.warn('[silent-catch] voice_playback_policy:constructor', e instanceof Error ? e.message : String(e));
    }
      return () => undefined;
    }
    this.stopCallbacks.add(stop);
    return () => this.stopCallbacks.delete(stop);
  }

  setEnabled(enabled: boolean): void {
    if (enabled === this.enabled) return;
    this.enabled = enabled;
    this.generation += 1;
    if (enabled) return;
    for (const stop of Array.from(this.stopCallbacks)) {
      try { stop(); } catch (e) {
      console.warn('[silent-catch] voice_playback_policy:constructor', e instanceof Error ? e.message : String(e));
    }
    }
  }

  isEnabled(): boolean {
    return this.enabled;
  }
}

export const voicePlaybackPolicy = new VoicePlaybackPolicy(
  getSoundSettingsSnapshot().voiceEnabled,
);

subscribeSoundSettings(() => {
  voicePlaybackPolicy.setEnabled(getSoundSettingsSnapshot().voiceEnabled);
});

