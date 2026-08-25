import fs from 'fs';
import path from 'path';

const root = path.resolve(__dirname, '..');

function readProjectFile(...parts: string[]): string {
  return fs.readFileSync(path.join(root, ...parts), 'utf8');
}

/**
 * зачем (владелец, 2026-08-24): «счёт жемчужин, рун и энергии на Главной не
 * отображается корректно сразу при входе — ждёт подгрузки и показывает нули».
 *
 * Корень был общий у всех трёх: синхронного источника на ХОЛОДНОМ старте не было
 * ни у одного счётчика, а их peek-кэши живут в памяти процесса и перезапуск
 * приложения не переживают. Каждый счётчик закрыт своим способом, и каждый способ
 * легко потерять при следующем рефакторинге — поэтому сторож текстовый: он ловит
 * исчезновение связи, а не поведение под моками (полноценные тесты этой зоны
 * падают по памяти и на чистом HEAD, см. project_season_tests_heap_oom).
 */
describe('home counters: real numbers on the first frame', () => {
  it('reads runes from disk during startup hydration, not from empty process memory', () => {
    const grants = readProjectFile('app', 'level_spin_star_grants.ts');
    const bootstrap = readProjectFile('app', 'app_snapshot_bootstrap.ts');

    // Дешёвое чтение проекции: один getItem, без сканирования всех ключей.
    expect(grants).toContain('export async function peekStoredLevelSpinStarsForBoot');
    // Загрузчик обязан его звать — иначе stars снова придут из пустой памяти.
    expect(bootstrap).toContain('peekStoredLevelSpinStarsForBoot(accountGeneration)');
    // Модуль грантов тяжёлый: в стартовый бандл его тянуть нельзя.
    expect(bootstrap).not.toContain("from './level_spin_star_grants'");
    expect(bootstrap).toContain("import('./level_spin_star_grants')");
  });

  it('never lets a disk read lower a fresher runes balance already in the snapshot', () => {
    const bootstrap = readProjectFile('app', 'app_snapshot_bootstrap.ts');

    // Пока шло чтение, спин мог начислить руны и опубликовать их в снапшот.
    // Берём большее: занизить баланс на глазах у игрока хуже, чем на миг отстать.
    expect(bootstrap).toContain('stars: Math.max(bootRunes?.balance ?? 0, current.progress?.stars ?? 0)');
    expect(bootstrap).toContain(
      'starsEarnedTotal: Math.max(bootRunes?.earnedTotal ?? 0, current.progress?.starsEarnedTotal ?? 0)',
    );
  });

  it('hands the already-read shards balance to the shared peek cache', () => {
    const shards = readProjectFile('app', 'shards_system.ts');
    const bootstrap = readProjectFile('app', 'app_snapshot_bootstrap.ts');

    expect(shards).toContain('export const primeShardsBalanceMemoryFromBoot');
    // Свежая запись этой сессии авторитетнее стартового снимка.
    expect(shards).toContain('if (shardsBalanceMemory) return;');
    expect(bootstrap).toContain("primeShardsBalanceMemoryFromBoot(readInt(values.get('shards_balance'))");
  });

  it('keeps the energy peek cache outside the React provider and warms it on import', () => {
    const cache = readProjectFile('app', 'energy_peek_cache.ts');
    const context = readProjectFile('components', 'EnergyContext.tsx');

    // Кэш обязан остаться лёгким: загрузчик не должен тянуть React-провайдер.
    expect(cache).not.toContain("from 'react'");
    // Упоминание в комментарии допустимо — запрещён именно импорт провайдера.
    expect(cache).not.toMatch(/from '[^']*EnergyContext'/);
    expect(cache).not.toMatch(/import\('[^']*EnergyContext'\)/);
    // Провайдер монтируется ВЫШЕ AppContent, поэтому прогрев запускается сам при
    // импорте — иначе он опаздывает ровно к тому кадру, ради которого затевался.
    expect(cache).toContain('void primeEnergyPeekFromBoot();');
    // Провайдер обязан читать общий кэш, а не заводить свой.
    expect(context).toContain("import { peekEnergy, writePeekEnergy } from '../app/energy_peek_cache';");
    expect(context).not.toContain('let peekEnergyState');
  });

  it('computes the energy ceiling and recovery the same way EnergyContext does', () => {
    const cache = readProjectFile('app', 'energy_peek_cache.ts');

    // зачем (аудит 2026-08-25): прогрев считал потолок из голого ключа
    // `user_total_xp`, а readDynMax берёт XP из personal_progress_store — у
    // когорты phone_state это РАЗНЫЕ числа, и знаменатель шкалы «X/Y» прыгал
    // после load(). Интервал восстановления так же обязан учитывать ускорители
    // (сундук лиги, turbo_regen), иначе число подскакивает вверх.
    expect(cache).toContain("import('./personal_progress_store')");
    expect(cache).toContain('getPersonalProgressSnapshot().totalXp');
    expect(cache).not.toContain("getItem('user_total_xp')");
    expect(cache).toContain('readLeagueChestEnergyOverrideMs');
    expect(cache).toContain('readBoonEnergyOverrideMs');
  });

  it('forgets a cached energy charge when the account owner changes', () => {
    const cache = readProjectFile('app', 'energy_peek_cache.ts');

    // зачем (аудит 2026-08-25): `energy_state` — ключ БЕЗ имени аккаунта. На диске
    // его чистит cloud_sync, но кэш живёт в памяти JS и о смене не узнаёт — новый
    // аккаунт увидел бы чужой заряд. Безусловный сброс тоже баг: событие летит и на
    // обычном старте (beginInitialAccountGeneration), Главная уже обжигалась на этом.
    expect(cache).toContain('subscribeAccountGeneration((token) =>');
    expect(cache).toContain('peekOwnerStableId');
    expect(cache).toContain('resetEnergyPeek()');
  });

  it('never writes a guessed energy value into the peek cache', () => {
    const cache = readProjectFile('app', 'energy_peek_cache.ts');

    // Битое/пустое хранилище оставляет кэш пустым: провайдер отработает как
    // раньше, а не покажет выдуманное число.
    expect(cache).toContain('if (!raw || peekEnergyState) return;');
    expect(cache).toContain('if (!Number.isFinite(current) || current < 0) return;');
    // Прогрев только читает — чинит и дописывает хранилище обычная загрузка.
    expect(cache).not.toContain('setItem');
  });

  it('initialises every Home counter from a synchronous source', () => {
    const home = readProjectFile('app', '(tabs)', 'home.tsx');

    expect(home).toContain('useState(() => peekLastKnownShardsBalance() ?? hh?.shardsBalance ?? snapshotShards)');
    expect(home).toContain('useState(() => peekRunes())');
    // Снапшот догоняет первый кадр — без подписки правка загрузчика до экрана не дойдёт.
    expect(home).toContain('setRunesBalance(peekRunes());');
  });
});
