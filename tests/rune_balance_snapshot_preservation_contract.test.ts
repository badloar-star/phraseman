import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(__dirname, '..');

function read(...segments: string[]): string {
  return fs.readFileSync(path.join(ROOT, ...segments), 'utf8').replace(/\r\n/g, '\n');
}

/**
 * Сторож класса бага «на главной цифра рун постоянно прыгает» (владелец, 2026-08-24).
 *
 * Корень был не в счётчике и не в анимации, а в снапшоте. Баланс рун живёт в
 * `progress.stars`, писатель у него РОВНО ОДИН — `publishProjection` в
 * `level_spin_star_grants.ts`. Но два других места собирали секцию `progress`
 * ЗАНОВО (объектным литералом, а не спредом текущей секции) и молча роняли
 * `stars`/`starsEarnedTotal`:
 *
 *   1) `patchAppSnapshotFromPersonalProgress` — зовётся на каждое начисление XP
 *      и смену серии;
 *   2) гидратация Главной в `app/(tabs)/home.tsx`.
 *
 * После такой записи `peekRunes()` читал `undefined` -> normalize -> 0, экран
 * показывал ноль, а следующая публикация проекции возвращала настоящее число.
 * Отсюда и «прыжки».
 *
 * Тест НЕ проверяет значения в рантайме (снапшот-контракт даёт heap OOM на этой
 * машине) — он сторожит сам инвариант на уровне исходников: кто пересобирает
 * `progress`, обязан перенести руны.
 */
describe('Rune balance survives every snapshot progress rebuild', () => {
  it('patchAppSnapshotFromPersonalProgress carries stars over', () => {
    const store = read('app', 'app_snapshot_store.ts');
    const start = store.indexOf('export function patchAppSnapshotFromPersonalProgress');
    expect(start).toBeGreaterThan(-1);
    const body = store.slice(start, store.indexOf('\n}\n', start));

    // Секция собирается литералом — значит руны обязаны быть перенесены явно.
    expect(body).toContain('progress: {');
    expect(body).toContain('stars: current.progress?.stars ?? 0');
    expect(body).toContain('starsEarnedTotal: current.progress?.starsEarnedTotal ?? 0');
  });

  it('home hydration carries stars over', () => {
    const home = read('app', '(tabs)', 'home.tsx');

    // Функциональная форма: руны читаются в момент применения патча, иначе между
    // вычислением литерала и записью может проскочить начисление.
    expect(home).toContain('patchAppSnapshot((currentSnapshot) => ({');
    expect(home).toContain('stars: currentSnapshot.progress?.stars ?? 0');
    expect(home).toContain('starsEarnedTotal: currentSnapshot.progress?.starsEarnedTotal ?? 0');
  });

  it('publishProjection skips no-op publishes', () => {
    const grants = read('app', 'level_spin_star_grants.ts');

    // Публикация зовётся часто (recover / sync / каждое начисление). Раньше она
    // ВСЕГДА создавала новый объект progress с updatedAt: Date.now(), а
    // shallowPatchChanged сравнивает секции по ссылке — будились все подписчики
    // снапшота без единого изменения числа.
    expect(grants).toContain('current.progress.stars === visible.balance');
    expect(grants).toContain('current.progress.starsEarnedTotal === visible.earnedTotal');
  });

  it('no other module rebuilds the progress section without carrying stars', () => {
    // Разрешены ровно три места: единственный писатель рун и два пересборщика,
    // проверенные выше. Появился четвёртый — он обязан перенести stars.
    //
    // Кандидатов берём точечным git grep, а НЕ обходом дерева: рекурсивное чтение
    // app/ + components/ + modules/ упирается в heap этой машины
    // (см. project_jest_watchman_ram) и роняет прогон.
    const candidates = execFileSync(
      'git',
      ['grep', '-l', 'patchAppSnapshot', '--', 'app', 'components', 'hooks', 'modules'],
      { cwd: ROOT, encoding: 'utf8' },
    )
      .split('\n')
      .map((line) => line.trim())
      .filter((line) => /\.tsx?$/.test(line))
      .map((line) => line.split('/').join(path.sep));

    expect(candidates.length).toBeGreaterThan(0);

    const allowed = new Set([
      path.join('app', 'app_snapshot_store.ts'),
      path.join('app', 'level_spin_star_grants.ts'),
      path.join('app', '(tabs)', 'home.tsx'),
    ]);

    const offenders = candidates.filter((relative) => {
      if (allowed.has(relative)) return false;
      const source = read(relative);
      // Пересборка секции снапшота: литерал progress с полем source внутри.
      if (!/progress:\s*\{\s*\n\s*source:/.test(source)) return false;
      return !source.includes('stars:');
    });

    expect(offenders).toEqual([]);
  });
});
