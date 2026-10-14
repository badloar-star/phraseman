import { ExpoSfxBackend } from './expo_sfx_backend';
import { tryPlayV2ForDirector } from '../sound_v2/legacy_bridge';
import {
  SoundArbiter,
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

/** Пауза между созданием прогреваемых плееров: поток успевает отдать кадр и тап (см. prewarmStep). */
export const PREWARM_STEP_GAP_MS = 300;
const PREWARM_SLOW_STEP_MS = 100;

export class SoundDirector {
  private deferredTimer: ReturnType<typeof setTimeout> | null = null;
  private deferredPlayback: { eventId: SoundEventId; options: SoundRequestOptions } | null = null;
  private activePlayback: { eventId: SoundEventId; requestId: number; scope?: string } | null = null;
  // зачем 2026-08-04: отдельный от deferredTimer таймер — priority-конфликт
  // между двумя обычными эффектами не имеет отношения к голосовым паузам
  // (setVoiceActive), и делить с ними один таймер значило бы, что голосовое
  // событие могло бы затереть уже запланированный ретрай тика таймера.
  private priorityRetryTimer: ReturnType<typeof setTimeout> | null = null;
  private prewarmQueue: Array<{ eventId: SoundEventId; source: number }> = [];
  private prewarmTimer: ReturnType<typeof setTimeout> | null = null;

  constructor(
    private readonly backend: SfxPlaybackBackend,
    // зачем: потолок тишины на время речи обязан продлеваться, пока голос
    // реально звучит (счётчик аренд аудиотракта). Иначе непрерывная озвучка
    // длиннее потолка теряла бы защиту и эффекты зазвучали бы поверх неё.
    private readonly arbiter = new SoundArbiter(
      undefined,
      () => getAudioActivitySnapshot().spokenActive,
    ),
  ) {}

  request(eventId: SoundEventId, options: SoundRequestOptions = {}): SoundDecision {
    const decision = this.arbiter.request(eventId, options);
    // зачем (баг 2026-09-22 «после второго спина звуки не работают»): отказ
    // арбитра НЕМОЙ по своей природе — звук просто не звучит, и отличить
    // rate-limit от cooldown, dedupe или занятого слота было нечем. Оставляем
    // насовсем, но только в разработке: класс «звук молча не сыграл» иначе
    // повторится и снова будет диагностироваться вслепую.
    if (__DEV__ && decision.kind === 'drop') {
      console.log(
        `[SFX-DROP] ${eventId} reason=${decision.reason}`
        + ` scope=${options.scope ?? 'global'} dedupeKey=${options.dedupeKey ?? 'none'}`
        + ` rateLimit=${options.rateLimit ? `${options.rateLimit.maxStarts}/${options.rateLimit.windowMs}ms` : 'shared'}`
        + ` cooldownMs=${SOUND_EVENTS[eventId].cooldownMs}`,
      );
    }
    this.rememberDeferredPlayback(decision, eventId, options);
    this.execute(decision, options);
    if (decision.kind === 'drop' && decision.reason === 'priority' && decision.retryAtMs !== undefined) {
      this.schedulePriorityRetry(eventId, options, decision.retryAtMs);
    }
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
    if (!this.backend.prewarm) {
      console.log('[SFX-PREWARM] skip reason=backend_without_prewarm');
      return;
    }
    let added = 0;
    for (const eventId of eventIds) {
      const source = SOUND_EVENTS[eventId].source;
      if (!source) {
        console.log(`[SFX-PREWARM] skip event=${eventId} reason=no_source`);
        continue;
      }
      if (this.prewarmQueue.some((entry) => entry.eventId === eventId)) continue;
      this.prewarmQueue.push({ eventId, source });
      added += 1;
    }
    console.log(`[SFX-PREWARM] enqueue added=${added} queued=${this.prewarmQueue.length} running=${this.prewarmTimer !== null}`);
    if (this.prewarmTimer === null && this.prewarmQueue.length > 0) this.prewarmStep();
  }

  /**
   * зачем (координатор 13.10, профиль Сверки ×3 a5d12a5e6): createAudioPlayer — синхронный нативный конструктор. Семь плееров
   * подряд держали JS-поток 3,2–3,6 с одним куском (+7,5…+11 с холодного старта, стэк prewarm → ensure → createAudioPlayer →
   * __native_constructor__) — человек уже видел Главную, а тапы и прокрутка стояли. Теперь один плеер за шаг, между шагами пауза:
   * поток отпускается на кадры и тапы, а звуки всё равно прогреты задолго до урока.
   */
  private prewarmStep(): void {
    this.prewarmTimer = null;
    const next = this.prewarmQueue.shift();
    if (!next || !this.backend.prewarm) return;
    const startedAt = Date.now();
    this.backend.prewarm([next]);
    const stepMs = Date.now() - startedAt;
    const line = `[SFX-PREWARM] step event=${next.eventId} ms=${stepMs} left=${this.prewarmQueue.length}`;
    // console.warn переживает release (console.log там вырезается) — медленный шаг виден и в релизной цифре.
    if (stepMs >= PREWARM_SLOW_STEP_MS) console.warn(`${line} slow`);
    else console.log(line);
    if (this.prewarmQueue.length > 0) {
      this.prewarmTimer = setTimeout(() => this.prewarmStep(), PREWARM_STEP_GAP_MS);
    }
  }

  private clearPrewarmQueue(): void {
    if (this.prewarmTimer !== null) clearTimeout(this.prewarmTimer);
    this.prewarmTimer = null;
    if (this.prewarmQueue.length > 0) console.log(`[SFX-PREWARM] cancel left=${this.prewarmQueue.length} reason=dispose`);
    this.prewarmQueue = [];
  }

  /**
   * зачем 2026-08-27 (владелец: «звук срабатывает через раз», уточнение: «они
   * МОГУТ звучать одновременно — звук „правильно“ и через пару миллисекунд
   * фраза»): здесь стоял безусловный `backend.stop()`, который обрывал уже
   * играющий эффект в момент старта озвучки.
   *
   * В уроке связка идёт вплотную — playCorrect() и следом speakCurrentPhrase()
   * (legacy exercise route removed). Эффект стартует АСИНХРОННО (ждёт seekTo +
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
    this.clearPrewarmQueue();
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
    // зачем (координатор 14.10, п.4): флаг sound_v2 включён и у события есть пара в V2 — играет V2, старый плеер не трогаем; выключен — прежний путь без изменений
    if (tryPlayV2ForDirector(decision.eventId)) {
      this.arbiter.finishActive(decision.requestId);
      return;
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
