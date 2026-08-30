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
  play(eventId: SoundEventId, source: number, volume: number, exclusive: boolean, onEnded: () => void): boolean;
  /** Гасит только слотовые (не allowConcurrent) плейбеки — преемпт и точечные стопы. */
  stopExclusive(): void;
  /** Полная тишина: запись, выключение звуков, dispose. */
  stopAll(): void;
  /** Создать плееры заранее, не играя — латентность первого запуска. Опционален. */
  prewarm?(entries: ReadonlyArray<{ eventId: SoundEventId; source: number }>): void;
  dispose(): void;
}

export class SoundDirector {
  private deferredTimer: ReturnType<typeof setTimeout> | null = null;
  private deferredPlayback: { eventId: SoundEventId; options: SoundRequestOptions } | null = null;
  private activePlayback: { eventId: SoundEventId; requestId: number; scope?: string } | null = null;
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
    this.rememberDeferredPlayback(decision, eventId, options);
    this.execute(decision, options);
    if (decision.kind === 'drop' && decision.reason === 'priority' && decision.retryAtMs !== undefined) {
      this.schedulePriorityRetry(eventId, options, decision.retryAtMs);
    }
    return decision;
  }

  requestLearningVerdict(request: LearningVerdictRequest): SoundDecision {
    const decision = this.arbiter.requestLearningVerdict(request);
    this.execute(decision, { scope: request.scope, dedupeKey: request.dedupeKey });
    return decision;
  }

  setEffectsEnabled(enabled: boolean): void {
    this.arbiter.setEffectsEnabled(enabled);
    if (!enabled) {
      this.clearDeferredTimer();
      this.deferredPlayback = null;
      this.clearPriorityRetryTimer();
      this.backend.stopAll();
      this.activePlayback = null;
    }
  }

  /**
   * зачем (аудит §R8, 2026-08-30): expo-audio не буферизует до play(), и самый
   * первый запуск каждого звука платит латентность создания плеера. Экраны
   * с плотным звуком (урок) зовут это на старте с самыми частыми событиями —
   * первый верный ответ звучит мгновенно, а не после прогрева.
   */
  prewarm(eventIds: readonly SoundEventId[]): void {
    if (!this.backend.prewarm) return;
    const entries: Array<{ eventId: SoundEventId; source: number }> = [];
    for (const eventId of eventIds) {
      const source = SOUND_EVENTS[eventId].source;
      if (source) entries.push({ eventId, source });
    }
    if (entries.length) this.backend.prewarm(entries);
  }

  /**
   * зачем 2026-08-27 (владелец: «звук срабатывает через раз», уточнение: «они
   * МОГУТ звучать одновременно — звук „правильно“ и через пару миллисекунд
   * фраза»): здесь стоял безусловный `backend.stop()`, который обрывал уже
   * играющий эффект в момент старта озвучки.
   *
   * В уроке связка идёт вплотную — playCorrect() и следом speakCurrentPhrase()
   * (app/personal_plan_exercise.tsx). Эффект стартует АСИНХРОННО (ждёт seekTo +
   * isLoaded нативного плеера), а озвучка захватывает голосовую аренду
   * СИНХРОННО. Кто успел раньше — лотерея: холодный кэш фразы дал эффекту
   * доиграть 380мс и звук был слышен, прогретый кэш обрывал его на середине или
   * в самом начале. Ровно это и звучало как «работает через раз».
   *
   * Запись микрофона (setRecordingActive) глушить ОБЯЗАНА и продолжает глушить:
   * эффект из динамика попал бы в микрофон. У озвучки такой причины нет — это
   * обычное воспроизведение, и наложение здесь ЖЕЛАЕМОЕ поведение. Нативная
   * сессия сама сводит два потока: озвучка идёт в SPOKEN_AUDIO_MODE
   * ('duckOthers' — система лишь приглушит эффект на его недолгий хвост), а
   * эффекты живут в 'mixWithOthers'.
   *
   * Арбитр по-прежнему получает setVoiceActive(true) и НЕ пускает НОВЫЕ эффекты
   * поверх речи — меняется только судьба уже звучащего: «оборвать» → «дать
   * доиграть».
   */
  setVoiceActive(active: boolean): void {
    this.arbiter.setVoiceActive(active);
    if (active) {
      this.clearDeferredTimer();
      this.clearPriorityRetryTimer();
    } else {
      this.scheduleDeferredFlush();
    }
  }

  setRecordingActive(active: boolean): void {
    this.arbiter.setRecordingActive(active);
    if (active) {
      this.clearDeferredTimer();
      this.deferredPlayback = null;
      this.clearPriorityRetryTimer();
      // Полная тишина: любой эффект из динамика попадёт в микрофон.
      this.backend.stopAll();
      this.activePlayback = null;
    }
  }

  /** Stops the result-sequence cue only; learning, voice, and system SFX stay intact. */
  stopActiveCompletion(scope?: string): boolean {
    const active = this.activePlayback;
    if (!active
      || SOUND_EVENTS[active.eventId].family !== 'completion'
      || active.scope !== scope) return false;
    this.clearPriorityRetryTimer();
    // Точечный стоп: allowConcurrent-звуки (полёт руны и т.п.) не задеваем.
    this.backend.stopExclusive();
    this.arbiter.finishActive(active.requestId);
    this.activePlayback = null;
    return true;
  }

  stopActiveEvent(eventId: SoundEventId, scope?: string): boolean {
    const active = this.activePlayback;
    const cancelledDeferred = this.arbiter.cancelDeferred(eventId, scope);
    if (cancelledDeferred) this.deferredPlayback = null;
    if (!active || active.eventId !== eventId || active.scope !== scope) return cancelledDeferred;
    this.clearPriorityRetryTimer();
    this.backend.stopExclusive();
    this.arbiter.finishActive(active.requestId);
    this.activePlayback = null;
    return true;
  }

  dispose(): void {
    this.clearDeferredTimer();
    this.deferredPlayback = null;
    this.clearPriorityRetryTimer();
    this.arbiter.setEffectsEnabled(false);
    this.activePlayback = null;
    this.backend.dispose();
  }

  private execute(decision: SoundDecision, options: SoundRequestOptions = {}): void {
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
    if (decision.preempt) {
      // зачем stopExclusive (аудит §R5): преемпт вытесняет только слотовый
      // звук; параллельные allowConcurrent-плееры доигрывают свои хвосты.
      this.backend.stopExclusive();
      this.activePlayback = null;
    }
    const started = this.backend.play(
      decision.eventId,
      definition.source,
      definition.volume,
      !definition.allowConcurrent,
      () => {
        this.arbiter.finishActive(decision.requestId);
        if (this.activePlayback?.requestId === decision.requestId) {
          this.activePlayback = null;
        }
      },
    );
    if (!started) {
      this.arbiter.finishActive(decision.requestId);
      return;
    }
    if (!definition.allowConcurrent) {
      this.activePlayback = {
        eventId: decision.eventId,
        requestId: decision.requestId,
        scope: options.scope,
      };
    }
  }

  private scheduleDeferredFlush(): void {
    this.clearDeferredTimer();
    const delay = this.arbiter.getPostVoiceDelayMs();
    if (!Number.isFinite(delay)) return;
    this.deferredTimer = setTimeout(() => {
      this.deferredTimer = null;
      const decision = this.arbiter.flushDeferred();
      const deferred = this.deferredPlayback;
      this.deferredPlayback = null;
      if (decision) {
        const deferredOptions = decision.kind !== 'drop'
          && deferred !== null
          && deferred.eventId === decision.eventId
          ? deferred.options
          : undefined;
        this.execute(decision, deferredOptions);
      }
    }, Math.max(0, delay));
  }

  private clearDeferredTimer(): void {
    if (this.deferredTimer) clearTimeout(this.deferredTimer);
    this.deferredTimer = null;
  }

  private rememberDeferredPlayback(
    decision: SoundDecision,
    eventId: SoundEventId,
    options: SoundRequestOptions,
  ): void {
    if (decision.kind === 'defer' && decision.eventId === eventId) {
      this.deferredPlayback = { eventId, options };
    }
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
      this.execute(decision, options);
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
