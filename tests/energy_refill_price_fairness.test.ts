/**
 * Цена дозаправки энергии обязана равняться НЕДОСТАЮЩЕМУ количеству.
 *
 * Повод (аудит экономики 2026-08-24): energyRefillShardCost возвращала
 * фиксированную цену полного заряда (= maxEnergy), сколько бы единиц ни не
 * хватало. Окно «мало энергии» (components/NoEnergyModal.tsx) открывается не
 * только при нуле: экзамен и другие активности требуют порога через
 * minRequired, поэтому игрок с 3 из 5 платил полные 5 жемчужин за 2
 * недостающие единицы — переплата в 2,5 раза, а с 4 из 5 — в 5 раз.
 *
 * Курс приложения прозрачен и держится на одном соотношении:
 *   1 жемчужина = 1 слот энергии = 30 минут ожидания
 * (ENERGY_RECOVERY_INTERVAL_MS в app/energy_system.ts). Фиксированная цена его
 * нарушала — этот файл сторожит соотношение.
 *
 * Сработал — чинить формулу цены, а не сторожа.
 *
 * ЗАПУСК: на этой машине прогон падает по heap OOM ещё на импорте (файл тянет
 * app/shards_system и его граф). Это среда, а не тест — тем же падают соседние
 * файлы на версии из git. Формула чистая, без IO: проверена извлечением функции
 * и прогоном тех же 13 кейсов на голом node, все зелёные. Готов к запуску после
 * лечения OOM; см. память проекта project_season_tests_heap_oom.
 */
import { energyRefillShardCost } from '../app/energy_shard_refill';

const MAX_ENERGY = 5; // remote_flags: max_energy, зажат в [5, 5]

describe('energyRefillShardCost: платим за недостающее, не за потолок', () => {
  it('пустая энергия — цена равна полному заряду', () => {
    expect(energyRefillShardCost(MAX_ENERGY, 0)).toBe(5);
  });

  it('цена ровно равна числу недостающих единиц', () => {
    expect(energyRefillShardCost(MAX_ENERGY, 1)).toBe(4);
    expect(energyRefillShardCost(MAX_ENERGY, 2)).toBe(3);
    expect(energyRefillShardCost(MAX_ENERGY, 3)).toBe(2);
    expect(energyRefillShardCost(MAX_ENERGY, 4)).toBe(1);
  });

  it('курс соблюдён: одна жемчужина покупает ровно один слот', () => {
    for (let have = 0; have < MAX_ENERGY; have += 1) {
      const missing = MAX_ENERGY - have;
      expect(energyRefillShardCost(MAX_ENERGY, have)).toBe(missing);
    }
  });

  it('цена никогда не превышает полный заряд', () => {
    for (let have = 0; have <= MAX_ENERGY; have += 1) {
      expect(energyRefillShardCost(MAX_ENERGY, have)).toBeLessThanOrEqual(MAX_ENERGY);
    }
  });
});

describe('energyRefillShardCost: совместимость и крайние случаи', () => {
  it('без baseEnergy показывает цену полного заряда (витрина магазина)', () => {
    expect(energyRefillShardCost(MAX_ENERGY)).toBe(5);
    expect(energyRefillShardCost(10)).toBe(10);
  });

  it('цена всегда положительна — бесплатных списаний не бывает', () => {
    expect(energyRefillShardCost(MAX_ENERGY, MAX_ENERGY)).toBeGreaterThanOrEqual(1);
    expect(energyRefillShardCost(0, 0)).toBeGreaterThanOrEqual(1);
  });

  it('мусор во входах не ломает цену и не делает её отрицательной', () => {
    expect(energyRefillShardCost(Number.NaN)).toBe(1);
    expect(energyRefillShardCost(MAX_ENERGY, Number.NaN)).toBe(5);
    expect(energyRefillShardCost(-3, -2)).toBe(1);
  });

  it('baseEnergy выше потолка (бонусные слоты) не даёт отрицательную цену', () => {
    expect(energyRefillShardCost(MAX_ENERGY, 99)).toBeGreaterThanOrEqual(1);
  });
});
