import {
  getManagedAudioModeSnapshot,
  subscribeManagedAudioMode,
} from '@/app/audio_session_coordinator';
import {
  acquireAudioActivity,
  whenAudioActivitySettled,
  type AudioActivityLease,
} from './audio_activity';
import { voicePlaybackPolicy } from './voice_playback_policy';

/**
 * Process-wide ownership for audible speech/media.
 *
 * expo-audio and expo-speech share one native audio session. Merely serialising
 * setAudioModeAsync calls is not enough: a delayed callback from screen A may
 * still call play() after screen B has opened the microphone. Every spoken path
 * therefore claims this arbiter immediately before it starts. A newer claim
 * synchronously revokes and stops the previous owner.
 *
 * Short UI effects remain in SoundDirector/SoundArbiter. Microphone capture has
 * its own exclusive claim; entering record mode revokes spoken and ambient
 * owners before the native mode transition begins.
 */
export type SpokenAudioClaim = Readonly<{
  isCurrent(): boolean;
  release(): void;
}>;
export type RecordingAudioClaim = SpokenAudioClaim;
export type AmbientAudioClaim = SpokenAudioClaim;

type ActiveOwner = {
  id: number;
  active: boolean;
  stop: () => void;
  lease: AudioActivityLease;
};

export class SpokenAudioArbiter {
  private nextId = 0;
  private activeOwner: ActiveOwner | null = null;

  constructor(
    private readonly acquireLease: () => AudioActivityLease,
    private readonly voiceEnabled: () => boolean,
    private readonly recordingActive: () => boolean,
  ) {}

  claim(stop: () => void): SpokenAudioClaim | null {
    if (!this.voiceEnabled() || this.recordingActive()) return null;

    // Acquire first. For spoken→spoken handoff this keeps the shared mode lease
    // continuously active; no transient UI-SFX mode can be queued between clips.
    const lease = this.acquireLease();
    const owner: ActiveOwner = {
      id: ++this.nextId,
      active: true,
      stop,
      lease,
    };
    const previous = this.activeOwner;
    this.activeOwner = owner;
    if (previous) this.revoke(previous, true);

    let released = false;
    return Object.freeze({
      isCurrent: () => !released && owner.active && this.activeOwner === owner,
      release: () => {
        if (released) return;
        released = true;
        this.revoke(owner, false);
      },
    });
  }

  stopCurrent(): void {
    const owner = this.activeOwner;
    if (owner) this.revoke(owner, true);
  }

  hasOwner(): boolean {
    return this.activeOwner !== null;
  }

  private revoke(owner: ActiveOwner, callStop: boolean): void {
    if (!owner.active) return;
    owner.active = false;
    if (this.activeOwner === owner) this.activeOwner = null;
    owner.lease.release();
    if (!callStop) return;
    try {
      owner.stop();
    } catch {
      // A broken screen-level cleanup must never strand process-wide ownership.
    }
  }
}

export const spokenAudioArbiter = new SpokenAudioArbiter(
  () => acquireAudioActivity('spoken'),
  () => voicePlaybackPolicy.isEnabled(),
  () => getManagedAudioModeSnapshot().recordingActive,
);

export const ambientAudioArbiter = new SpokenAudioArbiter(
  () => ({ release: () => undefined }),
  () => true,
  () => getManagedAudioModeSnapshot().recordingActive,
);

export class RecordingAudioArbiter {
  private nextId = 0;
  private activeOwner: ActiveOwner | null = null;

  constructor(
    private readonly acquireLease: () => AudioActivityLease,
    private readonly stopSpoken: () => void,
  ) {}

  claim(stop: () => void): RecordingAudioClaim {
    const lease = this.acquireLease();
    const owner: ActiveOwner = {
      id: ++this.nextId,
      active: true,
      stop,
      lease,
    };
    const previous = this.activeOwner;
    this.activeOwner = owner;
    this.stopSpoken();
    if (previous) this.revoke(previous, true);

    let released = false;
    return Object.freeze({
      isCurrent: () => !released && owner.active && this.activeOwner === owner,
      release: () => {
        if (released) return;
        released = true;
        this.revoke(owner, false);
      },
    });
  }

  stopCurrent(): void {
    const owner = this.activeOwner;
    if (owner) this.revoke(owner, true);
  }

  private revoke(owner: ActiveOwner, callStop: boolean): void {
    if (!owner.active) return;
    owner.active = false;
    if (this.activeOwner === owner) this.activeOwner = null;
    owner.lease.release();
    if (!callStop) return;
    try { owner.stop(); } catch { /* native capture may already be gone */ }
  }
}

export const recordingAudioArbiter = new RecordingAudioArbiter(
  () => acquireAudioActivity('recording'),
  () => spokenAudioArbiter.stopCurrent(),
);

// Voice setting OFF and microphone capture both have higher authority than
// playback. These subscriptions are process-wide, not tied to any mounted UI.
voicePlaybackPolicy.registerStop(() => spokenAudioArbiter.stopCurrent());
subscribeManagedAudioMode(() => {
  if (getManagedAudioModeSnapshot().recordingActive) {
    spokenAudioArbiter.stopCurrent();
    ambientAudioArbiter.stopCurrent();
  }
});

export function claimSpokenAudio(stop: () => void): SpokenAudioClaim | null {
  return spokenAudioArbiter.claim(stop);
}

export async function whenSpokenAudioReady(claim: SpokenAudioClaim): Promise<boolean> {
  await whenAudioActivitySettled();
  return claim.isCurrent()
    && voicePlaybackPolicy.isEnabled()
    && !getManagedAudioModeSnapshot().recordingActive;
}

export function claimRecordingAudio(stop: () => void): RecordingAudioClaim {
  return recordingAudioArbiter.claim(stop);
}

export function claimAmbientAudio(stop: () => void): AmbientAudioClaim | null {
  return ambientAudioArbiter.claim(stop);
}

export async function whenRecordingAudioReady(claim: RecordingAudioClaim): Promise<boolean> {
  await whenAudioActivitySettled();
  return claim.isCurrent() && getManagedAudioModeSnapshot().recordingActive;
}

export function stopCurrentSpokenAudio(): void {
  spokenAudioArbiter.stopCurrent();
}
