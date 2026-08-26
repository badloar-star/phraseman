// Сигналы MAX-звонка (спека §1 max_call_sfx).
//
// Ключевой контракт: звуковые cue играют ТОЛЬКО на границах владения
// аудиосессией — connect-чирп ДО InCallManager.start() и end-нота ПОСЛЕ
// InCallManager.stop(). Пока incall-manager владеет аудио-роутингом
// (voiceChat-сессия, echo cancellation, спикер/трубка), поверх него нельзя
// гарантировать ни маршрут, ни громкость cue — на части Android звук просто
// теряется, на iOS может дёрнуть категорию сессии и порвать WebRTC-аудио.
// Поэтому mid-call события (low-minutes, reconnect) — haptics, не звук.
// Никакого ducking'а.
//
// Модуль чистый: реальные плеер/вибрация инжектятся через deps, дефолтная
// обвязка (createDefaultMaxCallSfx) переиспользует существующую cue-инфру
// (sound_director из feedback-пайплайна) и haptics-обёртку — оба через lazy
// require, чтобы jest-контракт не тянул нативные бэкенды.

export type MaxCallCue = 'connect' | 'end';

/** Mid-call события: по контракту — ТОЛЬКО haptics, никогда звук. */
export type MaxCallMidEvent = 'low_minutes' | 'reconnect_started' | 'reconnected';

export interface MaxCallSfxDeps {
  playCue(cue: MaxCallCue): void;
  haptic(event: MaxCallMidEvent): void;
}

export interface MaxCallSfx {
  /**
   * Connect-чирп. Играет только ПОКА аудиосессией не владеет InCallManager
   * (клиент зовёт до .start()); повторные вызовы — no-op (один чирп на звонок).
   * Возвращает true, если cue реально ушёл в плеер.
   */
  connectCue(): boolean;
  /**
   * End-нота. Играет только ПОСЛЕ того, как владение отдано (audioSessionReleased);
   * один раз за жизнь звонка. Возвращает true, если cue реально ушёл.
   */
  endCue(): boolean;
  /** Транспорт сообщает: InCallManager.start() выполнен, аудиосессия занята. */
  audioSessionAcquired(): void;
  /** Транспорт сообщает: InCallManager.stop() выполнен, аудиосессия свободна. */
  audioSessionReleased(): void;
  /** Mid-call событие: всегда haptic, звука нет по контракту. */
  midCall(event: MaxCallMidEvent): void;
  /** Для контракт-тестов/отладки: владеет ли аудиосессией incall-manager. */
  ownsAudioSession(): boolean;
}

export function createMaxCallSfx(deps: MaxCallSfxDeps): MaxCallSfx {
  let owned = false;
  let connectPlayed = false;
  let endPlayed = false;

  return {
    connectCue(): boolean {
      // Внутри окна владения звук запрещён; дубль-вызов не даёт второго чирпа.
      if (owned || connectPlayed) return false;
      connectPlayed = true;
      try {
        deps.playCue('connect');
      } catch {
        // Сломанный плеер не имеет права ронять звонок.
      }
      return true;
    },

    endCue(): boolean {
      if (owned || endPlayed) return false;
      endPlayed = true;
      try {
        deps.playCue('end');
      } catch {}
      return true;
    },

    audioSessionAcquired(): void {
      owned = true;
    },

    audioSessionReleased(): void {
      owned = false;
    },

    midCall(event: MaxCallMidEvent): void {
      // Всегда haptics — независимо от владения аудиосессией: вибрация не
      // конфликтует с voiceChat-сессией и не будит спикер.
      try {
        deps.haptic(event);
      } catch {}
    },

    ownsAudioSession: () => owned,
  };
}

/**
 * Продовая обвязка: cue — через существующий sound_director (арбитраж,
 * настройка звука юзера, кулдауны), вибрация — через feedback/haptics
 * (уважает настройку тактильного отклика). Lazy require: jest-окружение и
 * OTA-бинарник без аудио-бэкенда не должны падать на импорте.
 */
export function createDefaultMaxCallSfx(): MaxCallSfx {
  return createMaxCallSfx({
    playCue(cue: MaxCallCue): void {
      try {
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const { soundDirector } = require('../modules/audio/sound_director') as {
          soundDirector: { request(id: string, opts?: Record<string, unknown>): unknown };
        };
        // зачем: дедикейтед-события pm.max.call_connect/call_end (2026-08-25) —
        // раньше здесь заимствовались pm.voice.turn_ready/pm.complete.micro,
        // теперь у MAX-звонка свой звук. Контракт границ владения аудиосессией
        // (connect ДО InCallManager.start(), end ПОСЛЕ .stop()) не меняется —
        // именно он не даёт звуку перебить речь учителя.
        soundDirector.request(cue === 'connect' ? 'pm.max.call_connect' : 'pm.max.call_end', {
          scope: 'max-call',
        });
      } catch {}
    },
    haptic(): void {
      try {
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const haptics = require('./feedback/haptics') as { light(): void };
        haptics.light();
      } catch {}
    },
  });
}

/* expo-router route shim: файлы в app/ считаются роутами и требуют default export. */
export default function __RouteShim() {
  return null;
}
