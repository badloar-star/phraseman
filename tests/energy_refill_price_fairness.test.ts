/**
 * Цена дозаправки энергии обязана считаться по НЕДОСТАЮЩЕМУ количеству и
 * никогда не превышать потолок в 20 жемчужин.
 *
 * Повод (аудит экономики 2026-08-24): energyRefillShardCost возвращала
 * фиксированную цену полного заряда (= maxEnergy), сколько бы единиц ни не
 * хватало. Окно «мало энергии» (components/NoEnergyModal.tsx) открывается не
 * только при нуле: экзамен и другие активности требуют порога через
 * minRequired, поэтому частично пустая шкала не должна стоить как полностью
 * пустая.
 *
 * Цена (владелец, 2026-09-14): полный бак стоит 20 жемчужин, а не 5 — прежний
 * курс делал жемчужину почти бесплатной. Курс: 1 жемчужина за каждые начатые 5
 * недостающих единиц, но не дороже 20 за одну дозаправку.
 *
 * Потолок цены — отдельное правило, а не округление: постоянный запас энергии
 * растёт с лигой и карточкой профиля (до 210), и чистая пропорция брала бы на
 * Высшей лиге 42 жемчужины, то есть штрафовала бы за прогресс.
 *
 * Сработал — чинить формулу цены, а не сторожа.
 *
 * ЗАПУСК: на этой машине прогон может падать по heap OOM ещё на импорте (файл
 * тянет app/shards_system и его граф). Это среда, а не тест; см. память проекта
 * project_jest_heap_roots_fix_2026-08-29.
 */
import { ENERGY_REFILL_SHARD_COST_CAP, energyRefillShardCost } from '../app/energy_shard_refill';

const MAX_ENERGY = 100; // remote_flags: max_energy, зажат в [100, 100]
const UNITS_PER_SHARD = 5;

describe('energyRefillShardCost: платим за недостающее, не за потолок', () => {
  it('пустая энергия при базовом запасе — 20 жемчужин', () => {
    expect(energyRefillShardCost(MAX_ENERGY, 0)).toBe(20);
  });

  it('цена округляет недостающее вверх по блокам из 5', () => {
    expect(energyRefillShardCost(MAX_ENERGY, 1)).toBe(20);
    expect(energyRefillShardCost(MAX_ENERGY, 20)).toBe(16);
    expect(energyRefillShardCost(MAX_ENERGY, 50)).toBe(10);
    expect(energyRefillShardCost(MAX_ENERGY, 61)).toBe(8);
    expect(energyRefillShardCost(MAX_ENERGY, 96)).toBe(1);
  });

  it('курс соблюдён: одна жемчужина покрывает до 5 недостающих единиц', () => {
    for (let have = 0; have < MAX_ENERGY; have += 1) {
      const missing = MAX_ENERGY - have;
      const expected = Math.min(ENERGY_REFILL_SHARD_COST_CAP, Math.ceil(missing / UNITS_PER_SHARD));
      expect(energyRefillShardCost(MAX_ENERGY, have)).toBe(expected);
    }
  });

  it('цена никогда не превышает потолок в 20 жемчужин', () => {
    expect(ENERGY_REFILL_SHARD_COST_CAP).toBe(20);
    for (let have = 0; have <= MAX_ENERGY; have += 1) {
      expect(energyRefillShardCost(MAX_ENERGY, have)).toBeLessThanOrEqual(20);
    }
  });

  it('выросший постоянный запас НЕ делает дозаправку дороже 20', () => {
    // Карточка профиля (+50) и лига (+110) поднимают потолок до 210. Без
    // потолка цены пустой бак стоил бы 42 жемчужины — наказание за прогресс.
    expect(energyRefillShardCost(210, 0)).toBe(20);
    expect(energyRefillShardCost(150, 0)).toBe(20);
    expect(energyRefillShardCost(210, 110)).toBe(20);
  });

  it('частичная доливка на выросшем запасе дешевле полной', () => {
    expect(energyRefillShardCost(110, 100)).toBe(2);
    expect(energyRefillShardCost(150, 100)).toBe(10);
    expect(energyRefillShardCost(210, 200)).toBe(2);
  });
});

describe('energyRefillShardCost: совместимость и крайние случаи', () => {
  it('без baseEnergy показывает цену полного заряда (витрина магазина)', () => {
    expect(energyRefillShardCost(MAX_ENERGY)).toBe(20);
    expect(energyRefillShardCost(10)).toBe(2);
  });

  it('цена всегда положительна — бесплатных списаний не бывает', () => {
    expect(energyRefillShardCost(MAX_ENERGY, MAX_ENERGY)).toBeGreaterThanOrEqual(1);
    expect(energyRefillShardCost(0, 0)).toBeGreaterThanOrEqual(1);
  });

  it('мусор во входах не ломает цену и не делает её отрицательной', () => {
    expect(energyRefillShardCost(Number.NaN)).toBe(1);
    expect(energyRefillShardCost(MAX_ENERGY, Number.NaN)).toBe(20);
    expect(energyRefillShardCost(-3, -2)).toBe(1);
  });

  it('baseEnergy выше потолка (бонусные слоты) не даёт отрицательную цену', () => {
    expect(energyRefillShardCost(MAX_ENERGY, 99)).toBeGreaterThanOrEqual(1);
  });
});
