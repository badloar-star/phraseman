import { existsSync, readFileSync } from 'fs';
import { join } from 'path';

const ROOT = process.cwd();
const read = (...parts: string[]): string => readFileSync(join(ROOT, ...parts), 'utf8');

/**
 * Повышение уровня показывается ТОЛЬКО на Главной — сторож правила владельца
 * от 2026-09-01.
 *
 * Что было: полноэкранная модалка поздравления (LevelUpThresholdModal) висела
 * в app/_layout.tsx и всплывала на ЛЮБОМ экране — по старту, по foreground, по
 * уходу со спина. Уровень она брала из durable-очереди непоказанных показов,
 * которая чистилась только по кнопке «Готово». Один недожатый показ жил
 * месяцами: человек на 40-м уровне видел «Поздравляем, уровень 13».
 *
 * Как теперь: полоска опыта на Главной доливается до конца, аватарка
 * подпрыгивает, цифра уровня меняется. Спин остаётся отдельной золотой
 * плашкой. Очередь показов НЕ durable — пропущенная анимация ничего не стоит,
 * потому что спины и опыт начисляются отдельно и durable.
 *
 * Сработал сторож — возвращать правило, а не удалять проверку.
 */
describe('level-up is celebrated on Home, never as a global modal', () => {
  const layout = read('app', '_layout.tsx');
  const home = read('app', '(tabs)', 'home.tsx');
  const queue = read('app', 'home_level_up_celebration_queue.ts');
  const player = read('components', 'home', 'use_home_level_up_celebration.ts');
  const barFill = read('components', 'home', 'use_home_xp_bar_fill.ts');

  test('the root layout no longer mounts any level-up congratulation modal', () => {
    expect(layout).not.toContain('<LevelUpThresholdModal');
    expect(layout).not.toContain('LevelUpThresholdModalHybrid');
    // Очередь ПОКАЗОВ больше не читается из рута: именно она давала старый
    // уровень поверх текущего.
    expect(layout).not.toContain('loadPendingLevelSpinLevelUps');
    expect(layout).not.toContain('acknowledgePendingLevelSpinLevelUp');
    // Компонент остался только ради наград, рисовать ему нечего.
    expect(layout).toContain('function GlobalLevelUpRewards()');
    expect(layout).toContain('<GlobalLevelUpRewards />');
  });

  test('reward safety survived the modal removal', () => {
    // Награды за уровень нельзя терять вместе с показом.
    expect(layout).toContain('retryPendingLevelUpRewards');
    expect(layout).toContain('repairPendingLevelUpRewards');
    expect(layout).toContain('drainPendingLevelUpBonusIntents');
    // Разовое закрытие долга за старые непоказанные уровни.
    expect(layout).toContain('settleRetiredLevelUpModalDebt');
    // Апселл премиума на 5-м уровне переехал на «праздник проигран», а не исчез.
    expect(layout).toContain("onAppEvent('home_level_up_celebrated'");
    expect(layout).toContain('afterwin_levelup');
  });

  test('new level-up bonus intents are no longer created at runtime', () => {
    // Владелец: бонус +100 XP за уровень отменён на будущее; outbox остался
    // ТОЛЬКО чтобы выплатить долг за уже висевшие уровни через миграцию.
    expect(layout).not.toContain('persistLevelUpBonusIntent');
    const migration = read('app', 'level_up_modal_retirement_migration.ts');
    expect(migration).toContain('persistLevelUpBonusIntent');
  });

  test('the celebration queue is in-memory only, never durable', () => {
    // Durable-очередь показов и была корнем «уровень 13 при 40-м».
    // Ищем именно ИМПОРТ хранилища: слово AsyncStorage есть в комментарии,
    // который объясняет, почему очередь НЕ durable.
    expect(queue).not.toMatch(/^import .*async-storage/m);
    expect(queue).toContain('export function takeHomeLevelUpCelebration');
    // Цель праздника сверяется с ФАКТИЧЕСКИМ уровнем по опыту.
    expect(queue).toContain('getLevelFromXP');
  });

  test('Home plays the celebration and owns the level number during it', () => {
    expect(home).toContain('takeHomeLevelUpCelebration');
    expect(home).toContain('useHomeLevelUpCelebration');
    // Цифра уровня во время цепочки идёт от игрока, а не от пересчёта опыта.
    expect(home).toContain('homeLevelUpCelebration.displayLevel ?? accountLevel');
    // Аватарка подпрыгивает.
    expect(home).toContain('homeLevelUpCelebration.avatarHop');
    // Праздник играется только на реально показанном экране.
    expect(home).toContain('if (!homeRuntimeActive) return undefined;');
  });

  test('ordinary bar filling stays silent while the chain runs', () => {
    // Иначе обычное наливание дёрнет полосу к новому проценту посреди цепочки
    // и вместо «долилась до конца» человек увидит рывок назад.
    expect(barFill).toContain('suspended');
    expect(barFill).toContain('if (suspended) return;');
    expect(home).toContain('homeLevelUpPlaying');
  });

  test('the chain is bounded so a long catch-up cannot lock the screen', () => {
    expect(queue).toContain('MAX_CELEBRATION_CHAIN');
    expect(player).toContain('reduceMotion');
  });

  test('the congratulation modal is deleted from the codebase, not just unmounted', () => {
    // Владелец 2026-09-01: «модалку повышения уровня или экран тот удали весь».
    // Файлы удалены целиком, включая дев-витрину — чтобы модалка не вернулась
    // «на посмотреть» и не утянула за собой старое поведение.
    for (const relative of [
      ['components', 'LevelUpThresholdModal.tsx'],
      ['components', 'LevelUpThresholdModalHybrid.tsx'],
      ['components', 'levelUpThresholdTheme.ts'],
      ['components', 'dev', 'motion_showcase', 'hosts', 'LevelUpShowcaseHost.tsx'],
    ]) {
      expect(existsSync(join(ROOT, ...relative))).toBe(false);
    }
  });

  test('the spin plaque survived the modal removal and plays after the chain', () => {
    // Плашка «+1 СПИН» показывалась ВНУТРИ модалки — вместе с ней показ спина
    // за уровень исчез бы молча. Владелец: «спин появляется отдельно сразу же
    // за этим», поэтому она переехала на Главную, после цепочки.
    expect(home).toContain('SpinRewardPlaque');
    expect(home).toContain('levelUpSpinPlaqueDelayMs');
    expect(home).toContain('homeLevelUpSpinReceipt');
    // Задержка считается из тех же констант, что ведут цепочку — иначе плашка
    // начнёт перебивать прыжок аватарки.
    expect(player).toContain('export function levelUpSpinPlaqueDelayMs');
    expect(player).toContain('FILL_TO_EDGE_MS + LEVEL_BEAT_MS');
    // Компонент плашки — общий с результатами урока и арены, не копия.
    expect(existsSync(join(ROOT, 'components', 'SpinRewardPlaque.tsx'))).toBe(true);
  });
});
