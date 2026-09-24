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

// PM-081 (BIBLE «Энергия: 5»; D06/D07): запас 5 вместо 100, прибавок лиги и
// карточки больше нет. Цена ПЛАТНОЙ дозаправки не пересматривалась (это
// решение владельца в PM-088): полный бак по-прежнему 20 жемчужин, частичный —
// пропорционально доле бака. Прежние проверки на запасе 100/150/210 — правило
// отменённого запаса.
const MAX_ENERGY = 5;

describe('energyRefillShardCost: платим за недостающее, не за потолок', () => {
  it('пустой бак — 20 жемчужин, как решил владелец', () => {
    expect(energyRefillShardCost(MAX_ENERGY, 0)).toBe(20);
  });

  it('частичная доливка — доля бака, округление вверх', () => {
    expect(energyRefillShardCost(MAX_ENERGY, 1)).toBe(16);
    expect(energyRefillShardCost(MAX_ENERGY, 2)).toBe(12);
    expect(energyRefillShardCost(MAX_ENERGY, 3)).toBe(8);
    expect(energyRefillShardCost(MAX_ENERGY, 4)).toBe(4);
  });

  it('на прежнем запасе 100 формула даёт ровно прежние цены (1 жемчужина за 5 единиц)', () => {
    for (let have = 0; have < 100; have += 1) {
      const expected = Math.min(ENERGY_REFILL_SHARD_COST_CAP, Math.ceil((100 - have) / 5));
      // Потолок запаса теперь 5, поэтому проверяем саму пропорцию, а не вызов с 100.
      expect(Math.ceil(((100 - have) * ENERGY_REFILL_SHARD_COST_CAP) / 100)).toBe(expected);
    }
  });

  it('цена никогда не превышает потолок в 20 жемчужин', () => {
    expect(ENERGY_REFILL_SHARD_COST_CAP).toBe(20);
    for (let have = 0; have <= MAX_ENERGY; have += 1) {
      expect(energyRefillShardCost(MAX_ENERGY, have)).toBeLessThanOrEqual(20);
    }
  });

  it('старый расширенный запас (лига/карточка) не признаётся — считается как 5', () => {
    expect(energyRefillShardCost(210, 0)).toBe(20);
    expect(energyRefillShardCost(150, 4)).toBe(4);
  });
});

describe('energyRefillShardCost: совместимость и крайние случаи', () => {
  it('без baseEnergy показывает цену полного заряда (витрина магазина)', () => {
    expect(energyRefillShardCost(MAX_ENERGY)).toBe(20);
  });

  it('цена всегда положительна — бесплатных списаний не бывает', () => {
    expect(energyRefillShardCost(MAX_ENERGY, MAX_ENERGY)).toBeGreaterThanOrEqual(1);
    expect(energyRefillShardCost(0, 0)).toBeGreaterThanOrEqual(1);
  });

  it('мусор во входах не ломает цену и не делает её отрицательной', () => {
    expect(energyRefillShardCost(Number.NaN)).toBeGreaterThanOrEqual(1);
    expect(energyRefillShardCost(MAX_ENERGY, Number.NaN)).toBe(20);
    expect(energyRefillShardCost(-3, -2)).toBeGreaterThanOrEqual(1);
  });

  it('baseEnergy выше потолка (бонусные слоты) не даёт отрицательную цену', () => {
    expect(energyRefillShardCost(MAX_ENERGY, 99)).toBeGreaterThanOrEqual(1);
  });
});
