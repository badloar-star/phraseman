import { ExpoSfxBackend } from './expo_sfx_backend';
import {
  SoundArbiter,
  type LearningVerdictRequest,
  type SoundDecision,
  type SoundRequestOptions,
} from './sound_arbiter';
import { SOUND_EVENTS, type SoundEventId } from './sound_events';
import { getSoundSettingsSnapshot, subscribeSoundSettings } from './sound_settings';
import { getAudioActivitySnapshot, subscribeAudioActivity } from './audio_activity';
import {
  getManagedAudioModeSnapshot,
  subscribeManagedAudioMode,
} from '@/app/audio_session_coordinator';

export interface SfxPlaybackBackend {
  play(eventId: SoundEventId, source: number, volume: number, onEnded: () => void): boolean;
  stop(): void;
  dispose(): void;
}

export class SoundDirector {
  private deferredTimer: ReturnType<typeof setTimeout> | null = null;
  // зачем 2026-08-04: отдельный от deferredTimer таймер — priority-конфликт
  // между двумя обычными эффектами не имеет отношения к голосовым паузам
  // (setVoiceActive), и делить с ними один таймер значило бы, что голосовое
  // событие могло бы затереть уже запланированный ретрай тика таймера.
  private priorityRetryTimer: ReturnType<typeof setTimeout> | null = null;

  constructor(
    private readonly backend: SfxPlaybackBackend,
    private readonly arbiter = new SoundArbiter(),
  ) {}

  request(eventId: SoundEventId, options: SoundRequestOptions = {}): SoundDecision {
    const decision = this.arbiter.request(eventId, options);
    this.execute(decision);
    if (decision.kind === 'drop' && decision.reason === 'priority' && decision.retryAtMs !== undefined) {
      this.schedulePriorityRetry(eventId, options, decision.retryAtMs);
    }
    return decision;
  }

  requestLearningVerdict(request: LearningVerdictRequest): SoundDecision {
    const decision = this.arbiter.requestLearningVerdict(request);
    this.execute(decision);
    return decision;
  }

  setEffectsEnabled(enabled: boolean): void {
    this.arbiter.setEffectsEnabled(enabled);
    if (!enabled) {
      this.clearDeferredTimer();
      this.clearPriorityRetryTimer();
      this.backend.stop();
    }
  }

  setVoiceActive(active: boolean): void {
    this.arbiter.setVoiceActive(active);
    if (active) {
      this.clearDeferredTimer();
      this.clearPriorityRetryTimer();
      this.backend.stop();
    } else {
      this.scheduleDeferredFlush();
    }
  }

  setRecordingActive(active: boolean): void {
    this.arbiter.setRecordingActive(active);
    if (active) {
      this.clearDeferredTimer();
      this.clearPriorityRetryTimer();
      this.backend.stop();
    }
  }

  dispose(): void {
    this.clearDeferredTimer();
    this.clearPriorityRetryTimer();
    this.arbiter.setEffectsEnabled(false);
    this.backend.dispose();
  }

  private execute(decision: SoundDecision): void {
    if (decision.kind === 'defer') {
      this.scheduleDeferredFlush();
      return;
    }
    if (decision.kind !== 'play') return;
    const definition = SOUND_EVENTS[decision.eventId];
    if (!definition.source) {
      this.arbiter.finishActive(decision.requestId);
      return;
    }
    if (decision.preempt) this.backend.stop();
    const started = this.backend.play(
      decision.eventId,
      definition.source,
      definition.volume,
      () => this.arbiter.finishActive(decision.requestId),
    );
    if (!started) this.arbiter.finishActive(decision.requestId);
  }

  private scheduleDeferredFlush(): void {
    this.clearDeferredTimer();
    const delay = this.arbiter.getPostVoiceDelayMs();
    if (!Number.isFinite(delay)) return;
    this.deferredTimer = setTimeout(() => {
      this.deferredTimer = null;
      const decision = this.arbiter.flushDeferred();
      if (decision) this.execute(decision);
    }, Math.max(0, delay));
  }

  private clearDeferredTimer(): void {
    if (this.deferredTimer) clearTimeout(this.deferredTimer);
    this.deferredTimer = null;
  }

  /**
   * зачем 2026-08-04: один повторный шанс сразу после того, как занятый слот
   * освобождается. queueIfBusy отключён на ретрае намеренно — если слот опять
   * занят чем-то новым, тик просто пропускается вместо цепочки ретраев,
   * которая рисковала бы догнать следующий тик и звучать вперемешку.
   */
  private schedulePriorityRetry(
    eventId: SoundEventId,
    options: SoundRequestOptions,
    retryAtMs: number,
  ): void {
    this.clearPriorityRetryTimer();
    const delay = this.arbiter.delayUntil(retryAtMs);
    this.priorityRetryTimer = setTimeout(() => {
      this.priorityRetryTimer = null;
      const decision = this.arbiter.request(eventId, { ...options, queueIfBusy: false });
      this.execute(decision);
    }, delay);
  }

  private clearPriorityRetryTimer(): void {
    if (this.priorityRetryTimer) clearTimeout(this.priorityRetryTimer);
    this.priorityRetryTimer = null;
  }
}

export const soundDirector = new SoundDirector(new ExpoSfxBackend());

const initialSettings = getSoundSettingsSnapshot();
soundDirector.setEffectsEnabled(initialSettings.effectsEnabled);
const initialActivity = getAudioActivitySnapshot();
soundDirector.setVoiceActive(initialActivity.spokenActive);
soundDirector.setRecordingActive(
  initialActivity.recordingActive || getManagedAudioModeSnapshot().recordingActive,
);

subscribeSoundSettings(() => {
  soundDirector.setEffectsEnabled(getSoundSettingsSnapshot().effectsEnabled);
});

subscribeAudioActivity(() => {
  const activity = getAudioActivitySnapshot();
  soundDirector.setVoiceActive(activity.spokenActive);
  soundDirector.setRecordingActive(
    activity.recordingActive || getManagedAudioModeSnapshot().recordingActive,
  );
});

subscribeManagedAudioMode(() => {
  const activity = getAudioActivitySnapshot();
  soundDirector.setRecordingActive(
    activity.recordingActive || getManagedAudioModeSnapshot().recordingActive,
  );
});
