// зачем: тайминги анимаций измерены из WAV-файлов. Если звук заменят, а таблицу
// не пересчитают, движение молча разъедется со звуком — визуально это заметить
// трудно. Тест держит таблицу честной: она обязана покрывать ровно те события,
// у которых есть файл, и содержать физически осмысленные числа.
import { SOUND_EVENTS, type SoundEventId } from '../modules/audio/sound_events';
import { SOUND_MOTION, motionDurationMs, motionIsBright } from '../modules/audio/sound_motion';

const ids = Object.keys(SOUND_EVENTS) as SoundEventId[];
const withSound = ids.filter((id) => SOUND_EVENTS[id].source !== null);
const withoutSound = ids.filter((id) => SOUND_EVENTS[id].source === null);

// зачем (11.10, координатор 05:30): 2.0 добавил 19 звуков, а таблицу sound_motion.ts не пересчитали. Для релиза это
// не блокер — motionDurationMs отдаёт запасные 320 мс, анимация идёт, просто не по форме волны. Список «после
// релиза» (владелец — Звук): пересчитать scripts/measure_sfx_envelopes.mjs и дописать профили. Список может только
// сокращаться — новый звук без профиля уронит сторож.
const UNMEASURED_AFTER_RELEASE: readonly SoundEventId[] = [
  'pm.achievements.open',
  'pm.billing.issue',
  'pm.cards.editor_delete',
  'pm.cards.editor_save',
  'pm.cards.flip',
  'pm.cards.pack_created',
  'pm.cards.pack_open',
  'pm.celebration.background_bed',
  'pm.coin.flight_start',
  'pm.dialog.retry',
  'pm.dialog.victory',
  'pm.energy.spend',
  'pm.hearts.lost',
  'pm.hearts.restored',
  'pm.onboarding.step',
  'pm.reward.rune_count_done',
  'pm.ui.tap_blocked',
  'pm.ui.tap_primary',
  'pm.ui.tap_soft',
];
const measured = withSound.filter((id) => SOUND_MOTION[id]);

describe('sound motion timings', () => {
  it('covers every event that actually has audio, except the explicit post-release list', () => {
    const missing = withSound.filter((id) => !SOUND_MOTION[id]);
    expect([...missing].sort()).toEqual([...UNMEASURED_AFTER_RELEASE].sort());
  });

  it('gives unmeasured sounds a sane fallback duration until they are measured', () => {
    for (const id of UNMEASURED_AFTER_RELEASE) {
      expect(SOUND_EVENTS[id].source).not.toBeNull();
      expect(motionDurationMs(id)).toBeGreaterThan(0);
    }
  });

  it('has no timings for silent events', () => {
    // Арена ждёт озвучки. Профиль без файла означает, что экран
    // дёргается впустую под несуществующий звук.
    const extra = withoutSound.filter((id) => SOUND_MOTION[id]);
    expect(extra).toEqual([]);
  });

  it('measures a positive audible length for every sound', () => {
    for (const id of measured) {
      expect(SOUND_MOTION[id]!.audibleMs).toBeGreaterThan(0);
    }
  });

  // зачем: `durationMs` в каталоге проставлен на глаз и у шести событий короче
  // реального звучания — сильнее всего был social.friend_request (540 против
  // 1008 мс; событие удалено в PM-206-A2). Арбитр считает такой звук законченным, пока он ещё играет, и
  // может пустить следующий поверх. Тест фиксирует известное расхождение:
  // список может только сокращаться. Как только `durationMs` поправят —
  // событие уйдёт отсюда, и тест потребует убрать его из исключений.
  const KNOWN_SHORT_DURATIONS: readonly SoundEventId[] = [
    'pm.learn.timer_expired',
    'pm.complete.star_3',
    'pm.system.info',
    'pm.energy.empty',
  ];

  it('does not grow the set of events whose catalog duration understates the sound', () => {
    const understated = measured.filter(
      (id) => SOUND_MOTION[id]!.audibleMs > SOUND_EVENTS[id].durationMs,
    );
    expect(understated.sort()).toEqual([...KNOWN_SHORT_DURATIONS].sort());
  });

  it('places every hit inside the audible window', () => {
    for (const id of measured) {
      const motion = SOUND_MOTION[id]!;
      for (const hit of motion.hits) {
        expect(hit).toBeGreaterThanOrEqual(0);
        expect(hit).toBeLessThanOrEqual(motion.audibleMs);
      }
    }
  });

  it('places the attack peak inside the audible window', () => {
    for (const id of measured) {
      const motion = SOUND_MOTION[id]!;
      expect(motion.attackMs).toBeGreaterThanOrEqual(0);
      expect(motion.attackMs).toBeLessThanOrEqual(motion.audibleMs);
    }
  });

  it('keeps brightness normalised', () => {
    for (const id of measured) {
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
    expect(motionDurationMs('pm.learn.timer_expired')).toBe(SOUND_MOTION['pm.learn.timer_expired']!.audibleMs);
  });
});
