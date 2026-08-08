// зачем: тайминги анимаций измерены из WAV-файлов. Если звук заменят, а таблицу
// не пересчитают, движение молча разъедется со звуком — визуально это заметить
// трудно. Тест держит таблицу честной: она обязана покрывать ровно те события,
// у которых есть файл, и содержать физически осмысленные числа.
import { SOUND_EVENTS, type SoundEventId } from '../modules/audio/sound_events';
import { SOUND_MOTION, motionDurationMs, motionIsBright } from '../modules/audio/sound_motion';

const ids = Object.keys(SOUND_EVENTS) as SoundEventId[];
const withSound = ids.filter((id) => SOUND_EVENTS[id].source !== null);
const withoutSound = ids.filter((id) => SOUND_EVENTS[id].source === null);

describe('sound motion timings', () => {
  it('covers every event that actually has audio', () => {
    const missing = withSound.filter((id) => !SOUND_MOTION[id]);
    expect(missing).toEqual([]);
  });

  it('has no timings for silent events', () => {
    // Арена и vip_finale ждут озвучки. Профиль без файла означал бы, что экран
    // дёргается впустую под несуществующий звук.
    const extra = withoutSound.filter((id) => SOUND_MOTION[id]);
    expect(extra).toEqual([]);
  });

  it('measures a positive audible length for every sound', () => {
    for (const id of withSound) {
      expect(SOUND_MOTION[id]!.audibleMs).toBeGreaterThan(0);
    }
  });

  // зачем: `durationMs` в каталоге проставлен на глаз и у шести событий короче
  // реального звучания — сильнее всего у social.friend_request (540 против
  // 1008 мс). Арбитр считает такой звук законченным, пока он ещё играет, и
  // может пустить следующий поверх. Тест фиксирует известное расхождение:
  // список может только сокращаться. Как только `durationMs` поправят —
  // событие уйдёт отсюда, и тест потребует убрать его из исключений.
  const KNOWN_SHORT_DURATIONS: readonly SoundEventId[] = [
    'pm.learn.needs_work',
    'pm.learn.timer_expired',
    'pm.complete.star_3',
    'pm.system.info',
    'pm.energy.empty',
    'pm.social.friend_request',
  ];

  it('does not grow the set of events whose catalog duration understates the sound', () => {
    const understated = withSound.filter(
      (id) => SOUND_MOTION[id]!.audibleMs > SOUND_EVENTS[id].durationMs,
    );
    expect(understated.sort()).toEqual([...KNOWN_SHORT_DURATIONS].sort());
  });

  it('places every hit inside the audible window', () => {
    for (const id of withSound) {
      const motion = SOUND_MOTION[id]!;
      for (const hit of motion.hits) {
        expect(hit).toBeGreaterThanOrEqual(0);
        expect(hit).toBeLessThanOrEqual(motion.audibleMs);
      }
    }
  });

  it('places the attack peak inside the audible window', () => {
    for (const id of withSound) {
      const motion = SOUND_MOTION[id]!;
      expect(motion.attackMs).toBeGreaterThanOrEqual(0);
      expect(motion.attackMs).toBeLessThanOrEqual(motion.audibleMs);
    }
  });

  it('keeps brightness normalised', () => {
    for (const id of withSound) {
      const motion = SOUND_MOTION[id]!;
      expect(motion.bright).toBeGreaterThanOrEqual(0);
      expect(motion.bright).toBeLessThanOrEqual(1);
    }
  });

  it('falls back safely for events without audio', () => {
    // Экран, дёрнувший немое событие, должен получить разумную длительность,
    // а не NaN/undefined — иначе анимация зависнет или не запустится вовсе.
    for (const id of withoutSound) {
      expect(motionDurationMs(id)).toBeGreaterThan(0);
      expect(motionIsBright(id)).toBe(false);
    }
  });

  it('reports the measured length for events with audio', () => {
    expect(motionDurationMs('pm.learn.correct')).toBe(SOUND_MOTION['pm.learn.correct']!.audibleMs);
  });
});
