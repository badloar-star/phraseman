import { SOUND_EVENTS, type SoundEventId } from './sound_events';
import { systemSoundClock, type SoundClock } from './sound_clock';

export type SoundDropReason =
  | 'disabled'
  | 'missing'
  | 'recording'
  | 'voice'
  | 'dedupe'
  | 'cooldown'
  | 'rate-limit'
  | 'priority';

export type SoundDecision =
  | { kind: 'play'; eventId: SoundEventId; requestId: number; preempt: boolean }
  | { kind: 'defer'; eventId: SoundEventId; expiresAt: number }
  | { kind: 'drop'; reason: SoundDropReason };

export type SoundRequestOptions = Readonly<{
  scope?: string;
  dedupeKey?: string;
  deferAfterVoice?: boolean;
}>;

export type LearningVerdictRequest = Readonly<{
  correct: boolean;
  completesUnit?: boolean;
  completionEvent?: Extract<SoundEventId, `pm.complete.${string}`>;
  scope?: string;
  dedupeKey?: string;
}>;

type ActiveSound = {
  requestId: number;
  eventId: SoundEventId;
  priority: number;
  endsAt: number;
};

type DeferredSound = {
  eventId: SoundEventId;
  options: SoundRequestOptions;
  createdAt: number;
  expiresAt: number;
};

const START_WINDOW_MS = 1000;
const MAX_STARTS_PER_WINDOW = 2;
const POST_VOICE_GAP_MS = 250;
const DEFERRED_TTL_MS = 2000;

export class SoundArbiter {
  private effectsEnabled = true;
  private voiceActive = false;
  private recordingActive = false;
  private voiceQuietUntil = 0;
  private active: ActiveSound | null = null;
  private deferred: DeferredSound | null = null;
  private requestSequence = 0;
  private starts: number[] = [];
  private lastStartedByEvent = new Map<SoundEventId, number>();
  private lastStartedByDedupeKey = new Map<string, number>();

  constructor(private readonly clock: SoundClock = systemSoundClock) {}

  request(eventId: SoundEventId, options: SoundRequestOptions = {}): SoundDecision {
    return this.decide(eventId, options, false);
  }

  requestLearningVerdict(request: LearningVerdictRequest): SoundDecision {
    // зачем 2026-08-03 (владелец: «убрать эффект серии полностью»): раньше
    // серия 5/10 подменяла обычный correct-звук на отдельные combo_5/combo_10
    // (молния). Эффект убран целиком — вердикт всегда звучит как обычный
    // верный/неверный ответ, независимо от длины серии.
    const eventId: SoundEventId = request.completesUnit
      ? (request.completionEvent ?? 'pm.complete.micro')
      : (request.correct ? 'pm.learn.correct' : 'pm.learn.needs_work');
    return this.request(eventId, { scope: request.scope, dedupeKey: request.dedupeKey });
  }

  setEffectsEnabled(enabled: boolean): void {
    this.effectsEnabled = enabled;
    if (!enabled) this.clearTransientState();
  }

  setVoiceActive(active: boolean): void {
    const now = this.clock.now();
    if (active) {
      this.voiceActive = true;
      this.voiceQuietUntil = Number.POSITIVE_INFINITY;
      this.active = null;
      return;
    }
    if (this.voiceActive) this.voiceQuietUntil = now + POST_VOICE_GAP_MS;
    this.voiceActive = false;
  }

  setRecordingActive(active: boolean): void {
    this.recordingActive = active;
    if (active) this.clearTransientState();
  }

  flushDeferred(): SoundDecision | null {
    const now = this.clock.now();
    if (!this.deferred || !this.effectsEnabled || this.recordingActive || this.voiceActive) return null;
    if (now < this.voiceQuietUntil) return null;
    const deferred = this.deferred;
    this.deferred = null;
    if (now > deferred.expiresAt) return null;
    return this.decide(deferred.eventId, deferred.options, true);
  }

  finishActive(requestId?: number): void {
    if (requestId !== undefined && this.active?.requestId !== requestId) return;
    this.active = null;
  }

  hasActiveSound(): boolean {
    this.expireActive(this.clock.now());
    return this.active !== null;
  }

  getPostVoiceDelayMs(): number {
    return Math.max(0, this.voiceQuietUntil - this.clock.now());
  }

  private decide(
    eventId: SoundEventId,
    options: SoundRequestOptions,
    ignoreVoiceGap: boolean,
  ): SoundDecision {
    const now = this.clock.now();
    const definition = SOUND_EVENTS[eventId];
    this.expireActive(now);

    if (!this.effectsEnabled) return { kind: 'drop', reason: 'disabled' };
    if (!definition.source) return { kind: 'drop', reason: 'missing' };
    if (this.recordingActive) return { kind: 'drop', reason: 'recording' };

    const voiceBlocked = this.voiceActive || (!ignoreVoiceGap && now < this.voiceQuietUntil);
    if (voiceBlocked) {
      if (options.deferAfterVoice ?? definition.deferAfterVoice) {
        return this.defer(eventId, options, now);
      }
      return { kind: 'drop', reason: 'voice' };
    }

    const dedupeKey = options.dedupeKey
      ? `${options.scope ?? 'global'}:${options.dedupeKey}`
      : undefined;
    const lastDedupe = dedupeKey ? this.lastStartedByDedupeKey.get(dedupeKey) : undefined;
    if (lastDedupe !== undefined && now - lastDedupe < definition.cooldownMs) {
      return { kind: 'drop', reason: 'dedupe' };
    }

    const lastEvent = this.lastStartedByEvent.get(eventId);
    if (lastEvent !== undefined && now - lastEvent < definition.cooldownMs) {
      return { kind: 'drop', reason: 'cooldown' };
    }

    this.pruneStarts(now);
    if (this.starts.length >= MAX_STARTS_PER_WINDOW) {
      return { kind: 'drop', reason: 'rate-limit' };
    }

    const preempt = this.active !== null;
    if (this.active && definition.priority <= this.active.priority) {
      return { kind: 'drop', reason: 'priority' };
    }

    const requestId = ++this.requestSequence;
    this.active = {
      requestId,
      eventId,
      priority: definition.priority,
      endsAt: now + definition.durationMs,
    };
    this.starts.push(now);
    this.lastStartedByEvent.set(eventId, now);
    if (dedupeKey) this.lastStartedByDedupeKey.set(dedupeKey, now);
    return { kind: 'play', eventId, requestId, preempt };
  }

  private defer(eventId: SoundEventId, options: SoundRequestOptions, now: number): SoundDecision {
    const expiresAt = now + DEFERRED_TTL_MS;
    const current = this.deferred;
    if (!current || SOUND_EVENTS[eventId].priority > SOUND_EVENTS[current.eventId].priority) {
      this.deferred = { eventId, options, createdAt: now, expiresAt };
    }
    const selected = this.deferred ?? { eventId, options, createdAt: now, expiresAt };
    return { kind: 'defer', eventId: selected.eventId, expiresAt: selected.expiresAt };
  }

  private pruneStarts(now: number): void {
    this.starts = this.starts.filter((startedAt) => now - startedAt < START_WINDOW_MS);
  }

  private expireActive(now: number): void {
    if (this.active && now >= this.active.endsAt) this.active = null;
  }

  private clearTransientState(): void {
    this.active = null;
    this.deferred = null;
  }
}
