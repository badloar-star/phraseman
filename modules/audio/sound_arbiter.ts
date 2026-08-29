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
  | { kind: 'drop'; reason: SoundDropReason; retryAtMs?: number };

export type SoundRequestOptions = Readonly<{
  scope?: string;
  dedupeKey?: string;
  deferAfterVoice?: boolean;
  /**
   * Overrides the shared 2-per-second start budget for this specific scope.
   *
   * зачем 2026-08-04 (владелец: «звуки в турнире работают рандомно и через
   * раз»): MAX_STARTS_PER_WINDOW=2/1000ms был рассчитан на редкие события
   * одиночного урока. В турнире (особенно в pairs-режиме на скорость) один
   * тап по паре, вердикт и тик таймера легко случаются в одну секунду —
   * третий/четвёртый звук молча гасился тем же общим лимитом. Приподнять
   * лимит нужно ТОЛЬКО для турнирного scope, не для всего приложения:
   * остальные экраны продолжают жить с исходной защитой от звукового спама.
   */
  rateLimit?: { maxStarts: number; windowMs: number };
  /**
   * Retry this request once, right after the currently playing sound ends,
   * instead of dropping it silently on a 'priority' collision.
   *
   * зачем 2026-08-04 (владелец: «звуки в турнире работают рандомно и через
   * раз», после того как rateLimit уже поднят): тик таймера (приоритет 62)
   * и вердикт ответа (correct=70/needs_work=68) конкурируют не только за
   * бюджет запросов в секунду, но и за ЕДИНСТВЕННЫЙ активный слот
   * воспроизведения. Если тик выпал ровно в окно, пока доигрывает вердикт
   * (320-380мс), он проигрывал молча по причине 'priority' — совпадение по
   * времени выглядело как случайность. queueIfBusy не меняет саму приоритетную
   * модель (более важный звук по-прежнему может её прервать преемптом), а
   * лишь даёт менее приоритетному ОДИН шанс сыграть заново сразу после того,
   * как текущий слот освободится — вместо немого исчезновения.
   */
  queueIfBusy?: boolean;
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
  /**
   * Отдельные окна для scope с собственным rateLimit (см. SoundRequestOptions).
   * Не смешиваются с общим `starts` — иначе поднятие лимита для одного scope
   * (турнир) ослабило бы защиту от спама и для всех остальных экранов,
   * которые используют тот же общий SoundArbiter.
   */
  private startsByScope = new Map<string, number[]>();

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

  cancelDeferred(eventId: SoundEventId, scope?: string): boolean {
    if (!this.deferred
      || this.deferred.eventId !== eventId
      || this.deferred.options.scope !== scope) return false;
    this.deferred = null;
    return true;
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

  /** Delay in ms, in this arbiter's own clock, from now until an absolute retryAtMs. */
  delayUntil(retryAtMs: number): number {
    return Math.max(0, retryAtMs - this.clock.now());
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

    const voiceBlocked = !definition.mixWithVoice
      && (this.voiceActive || (!ignoreVoiceGap && now < this.voiceQuietUntil));
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

    const scopedStarts = options.rateLimit && options.scope
      ? this.pruneScopedStarts(options.scope, options.rateLimit.windowMs, now)
      : null;
    if (scopedStarts) {
      if (scopedStarts.length >= options.rateLimit!.maxStarts) {
        return { kind: 'drop', reason: 'rate-limit' };
      }
    } else {
      this.pruneStarts(now);
      if (this.starts.length >= MAX_STARTS_PER_WINDOW) {
        return { kind: 'drop', reason: 'rate-limit' };
      }
    }

    const preempt = !definition.allowConcurrent && this.active !== null;
    if (!definition.allowConcurrent && this.active && definition.priority <= this.active.priority) {
      return {
        kind: 'drop',
        reason: 'priority',
        ...(options.queueIfBusy ? { retryAtMs: this.active.endsAt } : {}),
      };
    }

    const requestId = ++this.requestSequence;
    if (!definition.allowConcurrent) {
      this.active = {
        requestId,
        eventId,
        priority: definition.priority,
        endsAt: now + definition.durationMs,
      };
    }
    if (scopedStarts) scopedStarts.push(now);
    else this.starts.push(now);
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

  private pruneScopedStarts(scope: string, windowMs: number, now: number): number[] {
    const pruned = (this.startsByScope.get(scope) ?? [])
      .filter((startedAt) => now - startedAt < windowMs);
    this.startsByScope.set(scope, pruned);
    return pruned;
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
