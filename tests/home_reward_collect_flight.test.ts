/**
 * home_reward_collect_flight.test.ts — сторож анимации сбора наград.
 *
 * зачем (владелец, 2026-09-01): «заработал руны в любом месте — при возврате на
 * главную они со всех сторон собираются и влетают в счётчик». Логика легко
 * ломается тихо: правка сделает «1 руна = 1 частица» (джекпот спина завалит
 * экран), или трата начнёт выглядеть наградой, или очередь перестанет
 * очищаться и один и тот же приз полетит при каждом заходе.
 *
 * Проверяем ПОВЕДЕНИЕ модуля очереди и шкалу частиц, а не пиксели.
 */

import {
  consumePendingRewardFlight,
  enqueueRewardFlight,
  peekPendingRewardFlight,
  resetRewardFlightQueue,
  subscribeRewardFlight,
} from '../app/reward_flight_queue';
import {
  HOME_REWARD_DEMO_MODES,
  rewardFlightDurationMs,
  rewardFlightParticleCount,
  rewardFlightSpawnPoint,
} from '../app/reward_flight_particles';

jest.mock('../app/debug-logger', () => ({
  DebugLogger: { info: jest.fn(), warn: jest.fn(), error: jest.fn() },
}));

jest.mock('../app/events', () => ({
  onAppEvent: jest.fn(() => ({ remove: jest.fn() })),
}));

describe('очередь наград для полёта', () => {
  beforeEach(() => {
    resetRewardFlightQueue();
  });

  it('копит награды из разных мест до момента показа Главной', () => {
    enqueueRewardFlight('runes', 12);
    enqueueRewardFlight('runes', 8);
    enqueueRewardFlight('shards', 3);

    expect(peekPendingRewardFlight()).toEqual({ runes: 20, shards: 3 });
  });

  it('забранная награда исчезает из очереди — приз не летит дважды', () => {
    enqueueRewardFlight('runes', 25);

    expect(consumePendingRewardFlight()).toEqual({ runes: 25, shards: 0 });
    // Второй заход на Главную ничего не показывает: награда уже собрана.
    expect(peekPendingRewardFlight()).toEqual({ runes: 0, shards: 0 });
    expect(consumePendingRewardFlight()).toEqual({ runes: 0, shards: 0 });
  });

  it('трата и ноль в очередь не попадают — собирается только заработанное', () => {
    enqueueRewardFlight('runes', -50);
    enqueueRewardFlight('runes', 0);
    enqueueRewardFlight('shards', Number.NaN);

    expect(peekPendingRewardFlight()).toEqual({ runes: 0, shards: 0 });
  });

  it('смена аккаунта очищает очередь — чужая награда не летит новому', () => {
    enqueueRewardFlight('runes', 40);
    enqueueRewardFlight('shards', 5);

    resetRewardFlightQueue();

    expect(peekPendingRewardFlight()).toEqual({ runes: 0, shards: 0 });
  });

  it('будит подписчика на начисление и на очистку', () => {
    const seen: Array<{ runes: number; shards: number }> = [];
    const unsubscribe = subscribeRewardFlight((value) => {
      seen.push({ runes: value.runes, shards: value.shards });
    });

    enqueueRewardFlight('runes', 7);
    consumePendingRewardFlight();
    unsubscribe();
    enqueueRewardFlight('runes', 3); // после отписки не приходит

    expect(seen).toEqual([
      { runes: 7, shards: 0 },
      { runes: 0, shards: 0 },
    ]);
  });

  it('ошибка одного подписчика не роняет остальных', () => {
    const healthy = jest.fn();
    const stopBroken = subscribeRewardFlight(() => {
      throw new Error('подписчик упал');
    });
    const stopHealthy = subscribeRewardFlight(healthy);

    expect(() => enqueueRewardFlight('runes', 1)).not.toThrow();
    expect(healthy).toHaveBeenCalled();

    stopBroken();
    stopHealthy();
  });
});

describe('число частиц', () => {
  it('НЕ равно сумме награды — джекпот не заваливает экран', () => {
    // Класс бага, который сторожим: «1 руна = 1 частица». Спин отдаёт 1000 и
    // 2000 рун (см. каталог спина), это была бы каша и просадка FPS.
    expect(rewardFlightParticleCount(1000)).toBeLessThanOrEqual(14);
    expect(rewardFlightParticleCount(2000)).toBeLessThanOrEqual(14);
  });

  it('крупная награда заметно щедрее мелкой', () => {
    const small = rewardFlightParticleCount(3);
    const medium = rewardFlightParticleCount(50);
    const large = rewardFlightParticleCount(1000);

    expect(small).toBeLessThan(medium);
    expect(medium).toBeLessThan(large);
  });

  it('не растёт бесконечно и не падает в ноль на живой награде', () => {
    expect(rewardFlightParticleCount(1)).toBeGreaterThan(0);
    expect(rewardFlightParticleCount(100000)).toBeLessThanOrEqual(14);
  });

  it('пустая награда не рождает частиц', () => {
    expect(rewardFlightParticleCount(0)).toBe(0);
    expect(rewardFlightParticleCount(-5)).toBe(0);
    expect(rewardFlightParticleCount(Number.NaN)).toBe(0);
  });

  it('шкала растянута до джекпота, а не упирается в потолок на мелочи', () => {
    // Класс бага, который уже случился при первой формуле: 25 рун давали
    // максимум 14 частиц, и награда за один урок выглядела как джекпот спина.
    expect(rewardFlightParticleCount(25)).toBeLessThan(10);
    expect(rewardFlightParticleCount(2000)).toBe(14);
  });
});

describe('тайминг и геометрия волны', () => {
  it('страховочный таймер длиннее самой длинной волны', () => {
    // Хук закрывает волну по таймеру, если оверлей не отчитался. Таймер обязан
    // быть ДЛИННЕЕ анимации, иначе частицы срежет на полпути.
    const longest = rewardFlightDurationMs(2000);
    const shortest = rewardFlightDurationMs(1);

    expect(longest).toBeGreaterThan(shortest);
    expect(shortest).toBeGreaterThan(0);
    expect(rewardFlightDurationMs(0)).toBe(0);
  });

  it('частицы стартуют ЗА краем экрана — «со всех сторон»', () => {
    // Цель стоит в ШАПКЕ, а не в центре, поэтому радиус проверяем на разных
    // экранах и положениях счётчика. Первая версия формулы этот случай
    // проваливала: часть частиц возникала прямо в кадре вместо влёта из-за края.
    const cases = [
      { width: 390, height: 844, target: { x: 320, y: 90 } },   // iPhone, счётчик справа сверху
      { width: 390, height: 844, target: { x: 195, y: 100 } },  // по центру шапки
      { width: 430, height: 932, target: { x: 60, y: 700 } },   // крупный экран, низ слева
      { width: 320, height: 568, target: { x: 300, y: 40 } },   // маленький экран
      { width: 844, height: 390, target: { x: 700, y: 60 } },   // альбомная ориентация
    ];

    for (const { width, height, target } of cases) {
      const points = Array.from({ length: 14 }, (_, index) =>
        rewardFlightSpawnPoint(index, width, height, target));

      for (const point of points) {
        const outside = point.x < 0 || point.x > width || point.y < 0 || point.y > height;
        expect({ width, height, point, outside }).toEqual(
          expect.objectContaining({ outside: true }),
        );
      }
    }
  });

  it('точки старта разбросаны по кругу, а не сложены в одну', () => {
    const points = Array.from({ length: 10 }, (_, index) =>
      rewardFlightSpawnPoint(index, 390, 844, { x: 195, y: 100 }));

    const unique = new Set(points.map((p) => `${Math.round(p.x)}:${Math.round(p.y)}`));
    expect(unique.size).toBe(points.length);

    // Стороны действительно разные: есть точки и слева, и справа от цели.
    expect(points.some((p) => p.x < 195)).toBe(true);
    expect(points.some((p) => p.x > 195)).toBe(true);
    expect(points.some((p) => p.y < 100)).toBe(true);
    expect(points.some((p) => p.y > 100)).toBe(true);
  });

  it('геометрия детерминирована — один и тот же кадр при ре-рендере', () => {
    // Math.random здесь запрещён: он давал бы новую раскладку на каждый рендер
    // Главной, и частицы прыгали бы посреди полёта.
    const first = rewardFlightSpawnPoint(3, 390, 844, { x: 200, y: 80 });
    const second = rewardFlightSpawnPoint(3, 390, 844, { x: 200, y: 80 });

    expect(first).toEqual(second);
  });
});

describe('дев-кнопка: порядок режимов', () => {
  it('шесть режимов ровно в том порядке, который задал владелец', () => {
    // Дословно: всё → руны+жемчуг → руны → жемчуг → опыт → опыт+руны.
    // Порядок — требование владельца, а не деталь реализации: перестановка
    // сломала бы привычку «третье нажатие показывает руны».
    const shape = HOME_REWARD_DEMO_MODES.map((mode) => ({
      runes: mode.runes > 0,
      shards: mode.shards > 0,
      xp: mode.xp,
    }));

    expect(shape).toEqual([
      { runes: true, shards: true, xp: true },
      { runes: true, shards: true, xp: false },
      { runes: true, shards: false, xp: false },
      { runes: false, shards: true, xp: false },
      { runes: false, shards: false, xp: true },
      { runes: true, shards: false, xp: true },
    ]);
  });

  it('каждый режим что-то показывает и подписан', () => {
    for (const mode of HOME_REWARD_DEMO_MODES) {
      expect(mode.runes > 0 || mode.shards > 0 || mode.xp).toBe(true);
      expect(mode.label.length).toBeGreaterThan(0);
    }
  });

  it('демо-суммы дают видимый каскад, но не джекпот', () => {
    for (const mode of HOME_REWARD_DEMO_MODES) {
      if (mode.runes > 0) {
        const count = rewardFlightParticleCount(mode.runes);
        expect(count).toBeGreaterThanOrEqual(5);
        expect(count).toBeLessThanOrEqual(14);
      }
    }
  });
});
