/**
 * Сторож розыгрыша рулетки: пул, который нельзя разыграть, не должен ронять спин.
 *
 * Повод (аудит 2026-08-24): сужение пула (pity + персональные джекпот-капы) могло
 * оставить набор индексов с нулевым суммарным весом, и referralSpinPickIndex бросал
 * NO_POSITIVE_WEIGHTS прямо внутри серверной транзакции — игрок вместо приза видел
 * ошибку. Валидатор такое поймать не мог: он не знает персональных капов игрока.
 *
 * Сработал этот файл — чинить spinDraw/validateSpinWeights, а не сторожа.
 */
import {
  BIG_PRIZE_INDEX,
  JACKPOT_INDEX,
  PITY_MIN_INDEX,
  PITY_PERIOD,
  REFERRAL_SPIN_PRIZE_DAYS,
  spinDraw,
  validateSpinWeights,
} from './referral_spin_logic';

/** Детерминированный «RNG»: всегда одно и то же значение — розыгрыш воспроизводим. */
const constantRng = (value: number) => () => value;

describe('validateSpinWeights: конфиг обязан быть разыгрываемым', () => {
  it('отклоняет веса, у которых весь вес лежит вне pity-пула', () => {
    // Сумма = 100, но на pity-спине пул сужается до индексов >= PITY_MIN_INDEX,
    // где веса нулевые. Такой конфиг нельзя было разыграть — и он сохранялся.
    const result = validateSpinWeights([100, 0, 0, 0, 0, 0]);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toContain('PITY_POOL_NEEDS_POSITIVE_WEIGHT');
  });

  it('принимает дефолтные веса и любой конфиг с весом в pity-пуле', () => {
    expect(validateSpinWeights([55, 30, 11.5, 2.9, 0.55, 0.05]).ok).toBe(true);
    expect(validateSpinWeights([99, 1, 0, 0, 0, 0]).ok).toBe(true);
  });

  it('прежние правила остаются в силе: длина, знак, сумма', () => {
    expect(validateSpinWeights([50, 50]).ok).toBe(false);
    expect(validateSpinWeights([-1, 101, 0, 0, 0, 0]).ok).toBe(false);
    expect(validateSpinWeights([10, 10, 10, 10, 10, 10]).ok).toBe(false);
  });
});

describe('spinDraw: розыгрыш не падает на пуле с нулевым весом', () => {
  const noneForbidden = new Set<number>();

  it('pity-спин с весом только на индексе 0 выдаёт приз, а не ошибку', () => {
    // Конфиг мог попасть в базу до появления проверки валидатора.
    // Сужение по pity снимается, приз выдаётся.
    const draw = spinDraw({
      weights: [100, 0, 0, 0, 0, 0],
      spinsUsedTotal: 0, // 0 % PITY_PERIOD === 0 → pity-спин
      forbidden: noneForbidden,
      rng: constantRng(0),
    });
    expect(draw.prizeIndex).toBeGreaterThanOrEqual(0);
    expect(draw.prizeDays).toBe(REFERRAL_SPIN_PRIZE_DAYS[draw.prizeIndex]);
    // Сужение снято честно: pity помечается false, раз минимум не соблюдён.
    expect(draw.pity).toBe(false);
  });

  it('капы срезали индексы, на которых лежал весь вес, — приз всё равно выдаётся', () => {
    // У игрока уже были джекпот и 180 дней, а конфиг отдал им весь вес.
    const draw = spinDraw({
      weights: [0, 0, 0, 0, 40, 60],
      spinsUsedTotal: 3, // обычный спин, без pity
      forbidden: new Set([JACKPOT_INDEX, BIG_PRIZE_INDEX]),
      rng: constantRng(0.5),
    });
    expect(draw.reroll).toBe(true);
    expect(draw.prizeIndex).not.toBe(JACKPOT_INDEX);
    expect(draw.prizeIndex).not.toBe(BIG_PRIZE_INDEX);
    expect(REFERRAL_SPIN_PRIZE_DAYS[draw.prizeIndex]).toBeGreaterThan(0);
  });

  it('здоровый конфиг: pity держит обещанный минимум', () => {
    const draw = spinDraw({
      weights: [55, 30, 11.5, 2.9, 0.55, 0.05],
      spinsUsedTotal: PITY_PERIOD, // кратно периоду → pity-спин
      forbidden: noneForbidden,
      rng: constantRng(0),
    });
    expect(draw.pity).toBe(true);
    expect(draw.prizeIndex).toBeGreaterThanOrEqual(PITY_MIN_INDEX);
  });

  it('здоровый конфиг без pity может выдать и самый мелкий приз', () => {
    const draw = spinDraw({
      weights: [55, 30, 11.5, 2.9, 0.55, 0.05],
      spinsUsedTotal: 1,
      forbidden: noneForbidden,
      rng: constantRng(0),
    });
    expect(draw.pity).toBe(false);
    expect(draw.prizeIndex).toBe(0);
  });
});
