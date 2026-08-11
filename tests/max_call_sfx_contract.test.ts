/**
 * Контракт сигналов MAX-звонка (спека §1 max_call_sfx / тест №9):
 * звуковые cue — ТОЛЬКО вне окна владения аудиосессией InCallManager
 * (connect-чирп до .start(), end-нота после .stop()), mid-call события
 * (low-minutes, reconnect) — haptics, никогда звук, никакого ducking.
 */

import {
  createMaxCallSfx,
  type MaxCallCue,
  type MaxCallMidEvent,
} from '../app/max_call_sfx';

function makeSfx() {
  const played: MaxCallCue[] = [];
  const haptics: MaxCallMidEvent[] = [];
  const sfx = createMaxCallSfx({
    playCue: (cue) => played.push(cue),
    haptic: (event) => haptics.push(event),
  });
  return { sfx, played, haptics };
}

describe('cue только вне окна владения incall-manager', () => {
  it('connect-чирп играет до захвата аудиосессии и ровно один раз', () => {
    const { sfx, played } = makeSfx();
    expect(sfx.connectCue()).toBe(true);
    expect(played).toEqual(['connect']);
    // Дубль-вызов (гонка активации) не даёт второго чирпа.
    expect(sfx.connectCue()).toBe(false);
    expect(played).toEqual(['connect']);
  });

  it('внутри окна владения connect-cue запрещён', () => {
    const { sfx, played } = makeSfx();
    sfx.audioSessionAcquired();
    expect(sfx.connectCue()).toBe(false);
    expect(played).toEqual([]);
  });

  it('end-нота запрещена, пока сессия занята, и играет после release', () => {
    const { sfx, played } = makeSfx();
    sfx.connectCue();
    sfx.audioSessionAcquired();
    expect(sfx.endCue()).toBe(false); // InCallManager ещё владеет аудио
    expect(played).toEqual(['connect']);
    sfx.audioSessionReleased();
    expect(sfx.endCue()).toBe(true);
    expect(played).toEqual(['connect', 'end']);
    // Идемпотентность teardown'а: вторая end-нота невозможна.
    expect(sfx.endCue()).toBe(false);
    expect(played).toEqual(['connect', 'end']);
  });

  it('ownsAudioSession отражает границы владения', () => {
    const { sfx } = makeSfx();
    expect(sfx.ownsAudioSession()).toBe(false);
    sfx.audioSessionAcquired();
    expect(sfx.ownsAudioSession()).toBe(true);
    sfx.audioSessionReleased();
    expect(sfx.ownsAudioSession()).toBe(false);
  });
});

describe('mid-call события — haptics, не звук', () => {
  it.each(['low_minutes', 'reconnect_started', 'reconnected'] as const)(
    '%s даёт haptic и НИКОГДА звук — даже вне окна владения',
    (event) => {
      const { sfx, played, haptics } = makeSfx();
      sfx.midCall(event); // до захвата сессии
      sfx.audioSessionAcquired();
      sfx.midCall(event); // внутри звонка
      expect(haptics).toEqual([event, event]);
      expect(played).toEqual([]);
    },
  );

  it('сломанные плеер/вибрация не роняют звонок', () => {
    const sfx = createMaxCallSfx({
      playCue: () => {
        throw new Error('player died');
      },
      haptic: () => {
        throw new Error('no vibrator');
      },
    });
    expect(() => sfx.connectCue()).not.toThrow();
    expect(() => sfx.midCall('low_minutes')).not.toThrow();
    sfx.audioSessionReleased();
    expect(() => sfx.endCue()).not.toThrow();
  });
});
