/**
 * Контракт: экраны открываются мгновенно, без скелетонов.
 *
 * зачем: 2026-07-27 владелец потребовал железно — «все экраны должны быть готовы
 * сразу, никаких скелетов, никаких лагов, при этом 0 нагрузки на устройство».
 * Скелетон — симптом схемы «пусто → жду сеть → заглушка». Лечится тем, что данные
 * лежат локально к моменту открытия: диск → память (один раз в бутстрапе) →
 * синхронный peek на первом кадре.
 *
 * Тест сторожит именно инварианты «мгновенности», а не наличие/отсутствие вёрстки:
 *   1) снапшот поднимается ОДНИМ чтением в бутстрапе (не по чтению на экран —
 *      иначе запуск удлиняется, а владелец запретил замедлять старт);
 *   2) снапшот стирается при выходе/смене аккаунта (иначе следующий вошедший
 *      увидит чужие цифры на первом кадре);
 *   3) кэш статистики гидратируется в бутстрапе, а не внутри экрана стрика —
 *      именно это давало скелетон на весь экран после холодного старта;
 *   4) сам стор не ходит в Firestore: мгновенность не должна стоить чтений.
 */
import { readFileSync } from 'fs';
import { join } from 'path';

const read = (...parts: string[]) => readFileSync(join(__dirname, '..', ...parts), 'utf8');

const store = read('app', 'screen_snapshot_store.ts');
const layout = read('app', '_layout.tsx');
const cloudSync = read('app', 'cloud_sync.ts');
const authProvider = read('app', 'auth_provider.ts');
const referralsCache = read('app', 'referrals_cache.ts');

describe('мгновенное открытие экранов (без скелетонов)', () => {
  it('снапшот экранов поднимается в бутстрапе приложения', () => {
    expect(layout).toContain('primeScreenSnapshotsFromStorage');
  });

  it('кэш статистики гидратируется в бутстрапе, а не внутри экрана стрика', () => {
    // Раньше hydrateStatsCacheFromStorage звался только из streak_stats.loadAll(),
    // то есть ПОСЛЕ первого кадра — экран успевал показать скелетон на весь экран.
    expect(layout).toContain('hydrateStatsCacheFromStorage');
  });

  it('снапшот стирается при wipe и при выходе из аккаунта', () => {
    expect(cloudSync).toContain('clearScreenSnapshots');
    expect(authProvider).toContain('clearScreenSnapshots');
  });

  it('стор не ходит в Firestore — мгновенность не стоит ни одного чтения', () => {
    // По КОДУ, без комментариев: в шапке модуля слово «Firestore» упоминается
    // именно в объяснении, что облако здесь не трогается.
    const codeOnly = store
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .replace(/^[ \t]*\/\/.*$/gm, '');
    expect(codeOnly).not.toMatch(/firestore|firebase|collection\(/i);
    // Единственный внешний ввод-вывод — локальный AsyncStorage.
    expect(codeOnly).toContain('AsyncStorage');
  });

  it('диск читается одним ключом на все экраны, а не ключом на экран', () => {
    // Один getItem в prime → запуск не удлиняется с ростом числа экранов.
    const getItemCalls = store.match(/AsyncStorage\.getItem\(/g) ?? [];
    expect(getItemCalls).toHaveLength(1);
  });

  it('запись на диск отложена — первый кадр не ждёт диск', () => {
    expect(store).toContain('schedulePersist');
  });

  it('снапшот привязан к аккаунту — чужие данные не попадут в UI', () => {
    expect(store).toContain('accountScopeKey');
    expect(store).toContain('isCurrentAccountGeneration');
  });

  it('экран рефералов читает снапшот и пополняет его', () => {
    expect(referralsCache).toContain('peekScreenSnapshotForToken');
    expect(referralsCache).toContain('rememberScreenSnapshot');
  });
});

describe('поведение стора снапшотов', () => {
  // Изолируем модуль: стор держит состояние в модульной Map.
  const loadStore = () => {
    let mod: typeof import('../app/screen_snapshot_store');
    jest.isolateModules(() => {
      mod = require('../app/screen_snapshot_store');
    });
    return mod!;
  };

  it('peek без ключа и без данных возвращает null (экран честно грузит)', () => {
    const s = loadStore();
    expect(s.peekScreenSnapshot(null)).toBeNull();
    expect(s.peekScreenSnapshot('missing-key')).toBeNull();
  });

  it('записанное читается синхронно — это и есть первый кадр без скелетона', () => {
    const s = loadStore();
    s.rememberScreenSnapshot('k', { rows: [1, 2, 3] }, 1_000);
    expect(s.peekScreenSnapshot('k', { nowMs: 1_500 })).toEqual({ rows: [1, 2, 3] });
  });

  it('просроченный снапшот не отдаётся — лучше грузить, чем показать вчерашнее', () => {
    const s = loadStore();
    s.rememberScreenSnapshot('k', { a: 1 }, 0);
    expect(s.peekScreenSnapshot('k', { nowMs: 27 * 60 * 60_000 })).toBeNull();
  });

  it('несериализуемое значение не роняет экран', () => {
    const s = loadStore();
    const cyclic: Record<string, unknown> = {};
    cyclic.self = cyclic;
    expect(() => s.rememberScreenSnapshot('k', cyclic)).not.toThrow();
    expect(s.peekScreenSnapshot('k')).toBeNull();
  });

  it('очистка убирает данные — после выхода чужого не видно', () => {
    const s = loadStore();
    s.rememberScreenSnapshot('k', { a: 1 });
    s.clearScreenSnapshots();
    expect(s.peekScreenSnapshot('k')).toBeNull();
  });
});
