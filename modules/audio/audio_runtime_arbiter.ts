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
    private readonly acquireLease: (owner: string) => AudioActivityLease,
    private readonly voiceEnabled: () => boolean,
    private readonly recordingActive: () => boolean,
  ) {}

  /**
   * `owner` — имя вызывающей поверхности для трассы `[AUDIO-LEASE]`. Нужно,
   * чтобы срабатывание предохранителя аренды называло виновника, а не «unknown»:
   * без имени пропущенный release() ищется по всему приложению вручную.
   */
  claim(stop: () => void, owner_ = 'spoken:unknown'): SpokenAudioClaim | null {
    if (!this.voiceEnabled() || this.recordingActive()) return null;

    // Acquire first. For spoken→spoken handoff this keeps the shared mode lease
    // continuously active; no transient UI-SFX mode can be queued between clips.
    const lease = this.acquireLease(owner_);
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
    } catch (e) {
      // A broken screen-level cleanup must never strand process-wide ownership.
      console.warn('[silent-catch] audio_runtime_arbiter:owner', e instanceof Error ? e.message : String(e));
    }
  }
}

export const spokenAudioArbiter = new SpokenAudioArbiter(
  (owner) => acquireAudioActivity('spoken', owner),
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
    private readonly acquireLease: (owner: string) => AudioActivityLease,
    private readonly stopSpoken: () => void,
  ) {}

  /** `owner` — см. SpokenAudioArbiter.claim: имя виновника в трассе аренды. */
  claim(stop: () => void, owner_ = 'recording:unknown'): RecordingAudioClaim {
    const lease = this.acquireLease(owner_);
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
    try { owner.stop(); } catch (e) {
      // native capture may already be gone
      console.warn('[silent-catch] audio_runtime_arbiter:owner', e instanceof Error ? e.message : String(e));
    }
  }
}

export const recordingAudioArbiter = new RecordingAudioArbiter(
  (owner) => acquireAudioActivity('recording', owner),
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

export function claimSpokenAudio(stop: () => void, owner = 'spoken:unknown'): SpokenAudioClaim | null {
  return spokenAudioArbiter.claim(stop, owner);
}

export async function whenSpokenAudioReady(claim: SpokenAudioClaim): Promise<boolean> {
  await whenAudioActivitySettled();
  return claim.isCurrent()
    && voicePlaybackPolicy.isEnabled()
    && !getManagedAudioModeSnapshot().recordingActive;
}

export function claimRecordingAudio(stop: () => void, owner = 'recording:unknown'): RecordingAudioClaim {
  return recordingAudioArbiter.claim(stop, owner);
}

export function claimAmbientAudio(stop: () => void, owner = 'ambient:unknown'): AmbientAudioClaim | null {
  return ambientAudioArbiter.claim(stop, owner);
}

export async function whenRecordingAudioReady(claim: RecordingAudioClaim): Promise<boolean> {
  await whenAudioActivitySettled();
  return claim.isCurrent() && getManagedAudioModeSnapshot().recordingActive;
}

export function stopCurrentSpokenAudio(): void {
  spokenAudioArbiter.stopCurrent();
}
