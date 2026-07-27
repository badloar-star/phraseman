/**
 * Контракт распределения типов заданий по раундам.
 *
 * зачем эти тесты: связанные ползунки — место, где легко получить сумму 99
 * или 101 и не заметить. Кривая сумма тихо перекашивает состав турнира,
 * поэтому проверяем инвариант «ровно 100» во всех сценариях.
 */
import {
  MIX_TOTAL,
  adjustModeMix,
  defaultModeMix,
  defaultRoundMix,
  isCustomMix,
  mixToSlots,
  normalizeModeMix,
  normalizeRoundMix,
} from './tournament_mode_mix';
import { TOURNAMENT_MODES } from './tournament_pool_plan';

const sum = (mix: Record<string, number>) =>
  TOURNAMENT_MODES.reduce((total, mode) => total + (mix[mode] ?? 0), 0);

describe('распределение типов по раундам', () => {
  it('по умолчанию доли равные и дают ровно 100', () => {
    const mix = defaultModeMix();
    expect(sum(mix)).toBe(MIX_TOTAL);
    // Остаток от деления не потерян: 100/8 = 12.5 → кто-то получает больше.
    const values = TOURNAMENT_MODES.map((mode) => mix[mode]);
    expect(Math.max(...values) - Math.min(...values)).toBeLessThanOrEqual(1);
  });

  it('СВЯЗАННЫЕ ПОЛЗУНКИ: сумма остаётся 100 при любом движении', () => {
    let mix = defaultModeMix();
    for (const value of [0, 1, 37, 50, 99, 100]) {
      mix = adjustModeMix(mix, 'guess_phrase', value);
      expect(sum(mix)).toBe(MIX_TOTAL);
      expect(mix.guess_phrase).toBe(value);
    }
  });

  it('разница делится ПРОПОРЦИОНАЛЬНО, а не поровну', () => {
    // Иначе режим с долей 1% ушёл бы в минус первым, и настройка
    // «почти всё на один тип» стала бы невозможной.
    const start = { ...defaultModeMix(), guess_phrase: 30, fill_gap: 60 };
    const normalized = normalizeModeMix(start);
    const next = adjustModeMix(normalized, 'guess_phrase', 10);
    expect(sum(next)).toBe(MIX_TOTAL);
    // fill_gap был крупнее — он и получает больше освободившегося.
    expect(next.fill_gap).toBeGreaterThan(next.find_oddity ?? 0);
  });

  it('100% на один режим обнуляет остальные, сумма верна', () => {
    const mix = adjustModeMix(defaultModeMix(), 'listen_build', 100);
    expect(mix.listen_build).toBe(100);
    expect(sum(mix)).toBe(MIX_TOTAL);
    const others = TOURNAMENT_MODES.filter((m) => m !== 'listen_build');
    expect(others.every((m) => mix[m] === 0)).toBe(true);
  });

  it('ноль на всех остальных: разница раздаётся поровну', () => {
    const zeroed = adjustModeMix(defaultModeMix(), 'guess_phrase', 100);
    const back = adjustModeMix(zeroed, 'guess_phrase', 20);
    expect(sum(back)).toBe(MIX_TOTAL);
    expect(back.guess_phrase).toBe(20);
  });

  it('кривые данные из базы нормализуются к 100', () => {
    expect(sum(normalizeModeMix({ guess_phrase: 300, fill_gap: 200 }))).toBe(MIX_TOTAL);
    expect(sum(normalizeModeMix({ guess_phrase: 5 }))).toBe(MIX_TOTAL);
    expect(sum(normalizeModeMix(null))).toBe(MIX_TOTAL);
    expect(sum(normalizeModeMix({ unknown_mode: 100 }))).toBe(MIX_TOTAL);
    // Отрицательные и дробные значения не ломают сумму.
    expect(sum(normalizeModeMix({ guess_phrase: -50, fill_gap: 12.7 }))).toBe(MIX_TOTAL);
  });

  it('все четыре раунда получают валидный микс', () => {
    const config = normalizeRoundMix({ rounds: { 1: { guess_phrase: 100 } } });
    for (const roundNo of [1, 2, 3, 4]) {
      expect(sum(config.rounds[roundNo])).toBe(MIX_TOTAL);
    }
    expect(config.rounds[1].guess_phrase).toBe(100);
    // Ненастроенные раунды получают равные доли, а не нули.
    expect(config.rounds[2].guess_phrase).toBeGreaterThan(0);
  });

  it('ПРОЦЕНТЫ → СЛОТЫ: раунд получает ровно N заданий', () => {
    const mix = adjustModeMix(defaultModeMix(), 'guess_phrase', 50);
    const slots = mixToSlots(mix, 6);
    expect(slots).toHaveLength(6);
    // 50% при 6 заданиях = 3 слота.
    expect(slots.filter((mode) => mode === 'guess_phrase')).toHaveLength(3);
  });

  it('режим с большей долей не получает меньше слотов', () => {
    const mix = normalizeModeMix({ guess_phrase: 70, fill_gap: 20, find_oddity: 10 });
    const slots = mixToSlots(mix, 6);
    expect(slots).toHaveLength(6);
    const count = (mode: string) => slots.filter((s) => s === mode).length;
    expect(count('guess_phrase')).toBeGreaterThanOrEqual(count('fill_gap'));
    expect(count('fill_gap')).toBeGreaterThanOrEqual(count('find_oddity'));
  });

  it('режим с нулевой долей в раунд не попадает', () => {
    const mix = normalizeModeMix({ guess_phrase: 50, fill_gap: 50 });
    const slots = mixToSlots(mix, 6);
    expect(slots.includes('listen_build')).toBe(false);
    expect(slots).toHaveLength(6);
  });

  it('ручная настройка отличается от значения по умолчанию', () => {
    expect(isCustomMix(defaultModeMix())).toBe(false);
    expect(isCustomMix(adjustModeMix(defaultModeMix(), 'fill_gap', 40))).toBe(true);
  });

  it('пустой микс и нулевой раунд не роняют раскладку', () => {
    expect(mixToSlots({}, 6)).toEqual([]);
    expect(mixToSlots(defaultModeMix(), 0)).toEqual([]);
  });
});
