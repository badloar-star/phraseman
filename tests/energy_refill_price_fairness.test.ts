/**
 * Цена дозаправки энергии обязана равняться НЕДОСТАЮЩЕМУ количеству.
 *
 * Повод (аудит экономики 2026-08-24): energyRefillShardCost возвращала
 * фиксированную цену полного заряда (= maxEnergy), сколько бы единиц ни не
 * хватало. Окно «мало энергии» (components/NoEnergyModal.tsx) открывается не
 * только при нуле: экзамен и другие активности требуют порога через
 * minRequired, поэтому частично пустая шкала не должна стоить как полностью
 * пустая.
 *
 * После миграции один прежний слот равен 20 единицам, поэтому сохранён прежний
 * экономический курс: 1 жемчужина за каждые начатые 20 недостающих единиц.
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

const MAX_ENERGY = 100; // remote_flags: max_energy, зажат в [100, 100]

describe('energyRefillShardCost: платим за недостающее, не за потолок', () => {
  it('пустая энергия — цена равна полному заряду', () => {
    expect(energyRefillShardCost(MAX_ENERGY, 0)).toBe(5);
  });

  it('цена округляет недостающее вверх по блокам из 20', () => {
    expect(energyRefillShardCost(MAX_ENERGY, 1)).toBe(5);
    expect(energyRefillShardCost(MAX_ENERGY, 20)).toBe(4);
    expect(energyRefillShardCost(MAX_ENERGY, 61)).toBe(2);
    expect(energyRefillShardCost(MAX_ENERGY, 86)).toBe(1);
  });

  it('курс соблюдён: одна жемчужина покрывает до 20 недостающих единиц', () => {
    for (let have = 0; have < MAX_ENERGY; have += 1) {
      const missing = MAX_ENERGY - have;
      expect(energyRefillShardCost(MAX_ENERGY, have)).toBe(Math.ceil(missing / 20));
    }
  });

  it('цена никогда не превышает полный заряд', () => {
    for (let have = 0; have <= MAX_ENERGY; have += 1) {
      expect(energyRefillShardCost(MAX_ENERGY, have)).toBeLessThanOrEqual(5);
    }
  });

  it('учитывает постоянный запас от уровней карточки профиля', () => {
    expect(energyRefillShardCost(110, 100)).toBe(1);
    expect(energyRefillShardCost(150, 100)).toBe(3);
    expect(energyRefillShardCost(150, 0)).toBe(8);
  });
});

describe('energyRefillShardCost: совместимость и крайние случаи', () => {
  it('без baseEnergy показывает цену полного заряда (витрина магазина)', () => {
    expect(energyRefillShardCost(MAX_ENERGY)).toBe(5);
    expect(energyRefillShardCost(10)).toBe(1);
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
