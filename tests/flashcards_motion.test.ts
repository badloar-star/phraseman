/**
 * cards-2.0 (E1): токены движения раздела «Карточки» — валидность значений §2
 * мастер-плана. Токены — единственный источник правды для пружин/таймингов,
 * тест фиксирует контракт, чтобы «подкрутки на глаз» в экранах не разъезжались.
 */
import {
  FC_FLIP_PERSPECTIVE,
  FC_SFX_TTS_GAP_MS,
  FC_SPRING,
  FC_STAGGER,
  FC_SWIPE,
  FC_TIMING,
  fcStaggerDelay,
} from '../constants/flashcards_motion';

describe('FC_SPRING', () => {
  it('press вынесен из HubTileShell (damping 16 / stiffness 420)', () => {
    expect(FC_SPRING.press).toEqual({ damping: 16, stiffness: 420 });
  });

  it('flip/return/ring — duration-based пружины с валидным dampingRatio (0..1]', () => {
    for (const key of ['flip', 'return', 'ring'] as const) {
      const s = FC_SPRING[key];
      expect(s.duration).toBeGreaterThan(0);
      expect(s.dampingRatio).toBeGreaterThan(0);
      expect(s.dampingRatio).toBeLessThanOrEqual(1);
    }
    expect(FC_SPRING.flip.duration).toBe(450);
    expect(FC_SPRING.return.duration).toBe(350);
    expect(FC_SPRING.ring.duration).toBe(800);
  });
});

describe('FC_TIMING', () => {
  it('соответствует §2 и упорядочен fast ≤ base ≤ enter', () => {
    expect(FC_TIMING).toEqual({ fast: 150, base: 250, enter: 300, flyStar: 600 });
    expect(FC_TIMING.fast).toBeLessThanOrEqual(FC_TIMING.base);
    expect(FC_TIMING.base).toBeLessThanOrEqual(FC_TIMING.enter);
  });
});

describe('FC_STAGGER / fcStaggerDelay', () => {
  it('delay = min(i, cap) * step', () => {
    expect(FC_STAGGER).toEqual({ step: 60, cap: 8 });
    expect(fcStaggerDelay(0)).toBe(0);
    expect(fcStaggerDelay(3)).toBe(180);
    expect(fcStaggerDelay(8)).toBe(480);
  });

  it('кэп на 8 (≤8 живых анимаций одновременно) и защита от отрицательного индекса', () => {
    expect(fcStaggerDelay(50)).toBe(FC_STAGGER.cap * FC_STAGGER.step);
    expect(fcStaggerDelay(-2)).toBe(0);
  });
});

describe('FC_SWIPE (§3.3)', () => {
  it('порог 35% ширины ИЛИ velocity > 800; наклон ±12°; улёт 250мс', () => {
    expect(FC_SWIPE.thresholdRatio).toBe(0.35);
    expect(FC_SWIPE.velocityThreshold).toBe(800);
    expect(FC_SWIPE.rotateZDeg).toBe(12);
    expect(FC_SWIPE.flyOutMs).toBe(250);
    expect(FC_SWIPE.activationOffsetX).toBe(10);
  });
});

describe('аудио/3D константы', () => {
  it('пауза SFX→TTS = 120мс (§5), perspective = 1200 (§3.3)', () => {
    expect(FC_SFX_TTS_GAP_MS).toBe(120);
    expect(FC_FLIP_PERSPECTIVE).toBe(1200);
  });
});
