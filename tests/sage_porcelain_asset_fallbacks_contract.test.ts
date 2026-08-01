import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(__dirname, '..');

type SourceContract = {
  file: string;
  businessLightBlocks: number;
  slots: number;
};

function source(file: string): string {
  return readFileSync(path.join(ROOT, file), 'utf8');
}

function themeBlocks(text: string, theme: 'businessLight' | 'sagePorcelain'): string[] {
  const marker = new RegExp(`\\b${theme}:\\s*`, 'g');
  const blocks: string[] = [];
  for (const match of text.matchAll(marker)) {
    const start = (match.index ?? 0) + match[0].length;
    if (text[start] !== '{') {
      const required = text.slice(start).match(/^require\('[^']+'\)/)?.[0];
      if (required) blocks.push(required);
      continue;
    }
    let depth = 0;
    for (let index = start; index < text.length; index += 1) {
      if (text[index] === '{') depth += 1;
      if (text[index] === '}') depth -= 1;
      if (depth === 0) {
        blocks.push(text.slice(start, index + 1));
        break;
      }
    }
  }
  return blocks;
}

function requires(block: string): string[] {
  return [...block.matchAll(/require\('([^']+)'\)/g)].map((match) => match[1]);
}

function assertCompleteSageCoverage(contract: SourceContract): void {
  const text = source(contract.file);
  const businessLight = themeBlocks(text, 'businessLight');
  const sage = themeBlocks(text, 'sagePorcelain');
  expect(businessLight).toHaveLength(contract.businessLightBlocks);
  expect(sage).toHaveLength(contract.businessLightBlocks);
  expect(requires(sage.flat().join('\n'))).toHaveLength(contract.slots);
}

describe('sage porcelain static asset coverage', () => {
  it('keeps every static asset slot wired while dedicated Celadon art replaces fallbacks', () => {
    [
      { file: 'app/coin_icons.ts', businessLightBlocks: 1, slots: 1 },
      { file: 'app/flashcards/FlashcardsCategoryHub.tsx', businessLightBlocks: 1, slots: 6 },
      { file: 'app/personal_plan_task_visuals.ts', businessLightBlocks: 2, slots: 16 },
      { file: 'components/EnergyIcon.tsx', businessLightBlocks: 1, slots: 1 },
      { file: 'constants/generatedThemeIconAssets.ts', businessLightBlocks: 1, slots: 1 },
      { file: 'constants/socialIconAssets.ts', businessLightBlocks: 2, slots: 2 },
      { file: 'constants/streakIconAssets.ts', businessLightBlocks: 5, slots: 11 },
      { file: 'constants/trainerThemeIcons.ts', businessLightBlocks: 3, slots: 3 },
      { file: 'constants/weeklyCompassIcons.ts', businessLightBlocks: 1, slots: 1 },
      { file: 'constants/boonIconAssets.ts', businessLightBlocks: 2, slots: 10 },
      { file: 'constants/leagueBonusGiftImages.ts', businessLightBlocks: 1, slots: 1 },
    ].forEach(assertCompleteSageCoverage);
  });

  it('keeps all Sage require paths literal and backed by existing assets', () => {
    const files = [
      'app/coin_icons.ts', 'app/flashcards/FlashcardsCategoryHub.tsx',
      'app/personal_plan_task_visuals.ts', 'components/EnergyIcon.tsx', 'constants/generatedThemeIconAssets.ts',
      'constants/socialIconAssets.ts', 'constants/streakIconAssets.ts', 'constants/trainerThemeIcons.ts',
      'constants/weeklyCompassIcons.ts', 'constants/boonIconAssets.ts', 'constants/leagueBonusGiftImages.ts',
    ];
    for (const file of files) {
      const sagePaths = requires(themeBlocks(source(file), 'sagePorcelain').join('\n'));
      expect(sagePaths.length).toBeGreaterThan(0);
      for (const relativePath of sagePaths) {
        expect(relativePath).toMatch(/businessLight|sagePorcelain/);
        expect(existsSync(path.resolve(path.join(ROOT, path.dirname(file)), relativePath))).toBe(true);
      }
    }
  });

  it('uses all ten home-menu slots and the generated Celadon artwork', () => {
    const text = source('app/home_menu_icons.ts');
    const branch = (theme: string) => text.match(new RegExp(`if \\(themeMode === '${theme}'\\) \\{([\\s\\S]*?)\\n  \\}`, 'm'))?.[1] ?? '';
    const sagePaths = requires(branch('sagePorcelain'));
    expect(sagePaths).toHaveLength(10);
    expect(sagePaths).toEqual([
      '../assets/images/home_menu/sagePorcelain/home-sagePorcelain-lessons.webp',
      '../assets/images/home_menu/sagePorcelain/home-sagePorcelain-cards.webp',
      '../assets/images/home_menu/sagePorcelain/home-sagePorcelain-daily-tasks.webp',
      '../assets/images/home_menu/sagePorcelain/home-sagePorcelain-league.webp',
      '../assets/images/home_menu/sagePorcelain/home-sagePorcelain-diagnostic-test.webp',
      '../assets/images/home_menu/sagePorcelain/home-sagePorcelain-practice.webp',
      '../assets/images/home_menu/sagePorcelain/home-sagePorcelain-dialogs.webp',
      '../assets/images/home_menu/sagePorcelain/home-sagePorcelain-exam.webp',
      '../assets/images/home_menu/sagePorcelain/home-sagePorcelain-shop.webp',
      '../assets/images/home_menu/sagePorcelain/home-sagePorcelain-hero-map.webp',
    ]);
    for (const relativePath of sagePaths) {
      expect(relativePath).toMatch(/businessLight|sagePorcelain/);
      expect(existsSync(path.resolve(ROOT, 'app', relativePath))).toBe(true);
    }
  });

  it('uses generated Celadon artwork for migrated flashcard modes', () => {
    const paths = requires(themeBlocks(source('app/flashcards/FlashcardsCategoryHub.tsx'), 'sagePorcelain')[0]);
    expect(paths).toHaveLength(6);
    expect(paths).toEqual([
      '../../assets/images/flashcards/mode_icons/sagePorcelain/saved.webp',
      '../../assets/images/flashcards/mode_icons/sagePorcelain/custom.webp',
      '../../assets/images/flashcards/mode_icons/sagePorcelain/training.webp',
      '../../assets/images/flashcards/mode_icons/sagePorcelain/audio.webp',
      '../../assets/images/flashcards/mode_icons/sagePorcelain/arena.webp',
      '../../assets/images/flashcards/mode_icons/sagePorcelain/collection.webp',
    ]);
    for (const relativePath of paths) {
      expect(existsSync(path.resolve(ROOT, 'app/flashcards', relativePath))).toBe(true);
    }
  });

  it('uses generated Celadon artwork for migrated personal-plan tasks and routes', () => {
    const blocks = themeBlocks(source('app/personal_plan_task_visuals.ts'), 'sagePorcelain');
    const taskPaths = requires(blocks[0]);
    const routePaths = requires(blocks[1]);
    expect(taskPaths.slice(0, 5)).toEqual([
      '../assets/images/personal_plan_tasks_fit/sagePorcelain/core_lesson.webp',
      '../assets/images/personal_plan_tasks_fit/sagePorcelain/route_gavan.webp',
      '../assets/images/personal_plan_tasks_fit/sagePorcelain/recall.webp',
      '../assets/images/personal_plan_tasks_fit/sagePorcelain/choice.webp',
      '../assets/images/personal_plan_tasks_fit/sagePorcelain/practice.webp',
    ]);
    expect(taskPaths[5]).toBe('../assets/images/personal_plan_tasks_fit/sagePorcelain/choice.webp');
    expect(taskPaths[6]).toBe('../assets/images/personal_plan_tasks_fit/sagePorcelain/listening.webp');
    expect(taskPaths[7]).toBe('../assets/images/personal_plan_tasks_fit/sagePorcelain/sentence_build.webp');
    expect(taskPaths[8]).toBe('../assets/images/personal_plan_tasks_fit/sagePorcelain/speaking.webp');
    expect(taskPaths[9]).toBe('../assets/images/personal_plan_tasks_fit/sagePorcelain/trainer.webp');
    expect(taskPaths[10]).toBe('../assets/images/personal_plan_tasks_fit/sagePorcelain/flashcards.webp');
    expect(routePaths[0]).toBe('../assets/images/personal_plan_tasks_fit/sagePorcelain/route_gavan.webp');
    expect(routePaths[1]).toBe('../assets/images/personal_plan_tasks_fit/sagePorcelain/route_voyazh.webp');
    expect(routePaths[2]).toBe('../assets/images/personal_plan_tasks_fit/sagePorcelain/route_mitap.webp');
    expect(routePaths[3]).toBe('../assets/images/personal_plan_tasks_fit/sagePorcelain/route_impuls.webp');
    expect(routePaths[4]).toBe('../assets/images/personal_plan_tasks_fit/sagePorcelain/route_echo.webp');
    for (const relativePath of [...taskPaths, ...routePaths]) {
      expect(existsSync(path.resolve(ROOT, 'app', relativePath))).toBe(true);
    }
  });

  it('uses Sage-specific trainer and streak chrome with the fixed porcelain palette', () => {
    const trainer = source('constants/trainerThemeIcons.ts');
    const streak = source('constants/streakIconAssets.ts');
    const streakFirePaths = themeBlocks(streak, 'sagePorcelain')
      .map(requires)
      .find((paths) => paths.length === 10) ?? [];
    expect(themeBlocks(trainer, 'sagePorcelain')[0]).toContain("primary: '#315F50'");
    expect(themeBlocks(trainer, 'sagePorcelain')[0]).toContain("secondary: '#8B6320'");
    expect(themeBlocks(trainer, 'sagePorcelain')[0]).toContain("stroke: '#17201D'");
    expect(themeBlocks(trainer, 'sagePorcelain')[0]).toContain("muted: '#FCFDF9'");
    expect(streakFirePaths).toEqual([
      '../assets/images/streak_icons/sagePorcelain/streak-fire-sagePorcelain-001.webp',
      '../assets/images/streak_icons/sagePorcelain/streak-fire-sagePorcelain-002.webp',
      '../assets/images/streak_icons/sagePorcelain/streak-fire-sagePorcelain-003.webp',
      '../assets/images/streak_icons/sagePorcelain/streak-fire-sagePorcelain-005.webp',
      '../assets/images/streak_icons/sagePorcelain/streak-fire-sagePorcelain-007.webp',
      '../assets/images/streak_icons/sagePorcelain/streak-fire-sagePorcelain-010.webp',
      '../assets/images/streak_icons/sagePorcelain/streak-fire-sagePorcelain-020.webp',
      '../assets/images/streak_icons/sagePorcelain/streak-fire-sagePorcelain-035.webp',
      '../assets/images/streak_icons/sagePorcelain/streak-fire-sagePorcelain-060.webp',
      '../assets/images/streak_icons/sagePorcelain/streak-fire-sagePorcelain-100.webp',
    ]);
    expect(streak).toContain("1: 'assets/images/streak_icons/sagePorcelain/streak-fire-sagePorcelain-001.webp'");
    expect(streak).toContain("2: 'assets/images/streak_icons/sagePorcelain/streak-fire-sagePorcelain-002.webp'");
    expect(streak).toContain("3: 'assets/images/streak_icons/sagePorcelain/streak-fire-sagePorcelain-003.webp'");
    expect(streak).toContain("5: 'assets/images/streak_icons/sagePorcelain/streak-fire-sagePorcelain-005.webp'");
    expect(streak).toContain("7: 'assets/images/streak_icons/sagePorcelain/streak-fire-sagePorcelain-007.webp'");
    expect(streak).toContain("10: 'assets/images/streak_icons/sagePorcelain/streak-fire-sagePorcelain-010.webp'");
    expect(streak).toContain("20: 'assets/images/streak_icons/sagePorcelain/streak-fire-sagePorcelain-020.webp'");
    expect(streak).toContain("35: 'assets/images/streak_icons/sagePorcelain/streak-fire-sagePorcelain-035.webp'");
    expect(streak).toContain("60: 'assets/images/streak_icons/sagePorcelain/streak-fire-sagePorcelain-060.webp'");
    expect(streak).toContain("100: 'assets/images/streak_icons/sagePorcelain/streak-fire-sagePorcelain-100.webp'");
    expect(streak).toContain("sagePorcelain: 'assets/images/streak_icons/sagePorcelain/streak-freeze-sagePorcelain.webp'");
    expect(streak).toContain("sagePorcelain: require('../assets/images/streak_icons/sagePorcelain/streak-freeze-sagePorcelain.webp')");
    expect(streak).toContain("sagePorcelain: { rgb: [139, 99, 32], accent: '#315F50' }");
    expect(streak).toContain("sagePorcelain: { rgb: [97, 112, 106], accent: '#52605A' }");
  });

  it('uses generated Celadon artwork for migrated weekly boons', () => {
    const boon = source('constants/boonIconAssets.ts');
    const boonPaths = themeBlocks(boon, 'sagePorcelain')
      .map(requires)
      .find((paths) => paths.length === 10) ?? [];
    expect(boonPaths.slice(0, 9)).toEqual([
      '../assets/images/weekly_boon_icons/png/sagePorcelain/streak_saver.webp',
      '../assets/images/weekly_boon_icons/png/sagePorcelain/mystery_monday.webp',
      '../assets/images/weekly_boon_icons/png/sagePorcelain/turbo_regen.webp',
      '../assets/images/weekly_boon_icons/png/sagePorcelain/energy_free_window.webp',
      '../assets/images/weekly_boon_icons/png/sagePorcelain/double_xp.webp',
      '../assets/images/weekly_boon_icons/png/sagePorcelain/flashcard_friday.webp',
      '../assets/images/weekly_boon_icons/png/sagePorcelain/speaking_saturday.webp',
      '../assets/images/weekly_boon_icons/png/sagePorcelain/early_bird.webp',
      '../assets/images/weekly_boon_icons/png/sagePorcelain/perfect_week.webp',
    ]);
    expect(boon).toContain("streak_saver: 'assets/images/weekly_boon_icons/png/sagePorcelain/streak_saver.webp'");
    expect(boon).toContain("mystery_monday: 'assets/images/weekly_boon_icons/png/sagePorcelain/mystery_monday.webp'");
    expect(boon).toContain("turbo_regen: 'assets/images/weekly_boon_icons/png/sagePorcelain/turbo_regen.webp'");
    expect(boon).toContain("energy_free_window: 'assets/images/weekly_boon_icons/png/sagePorcelain/energy_free_window.webp'");
    expect(boon).toContain("double_xp: 'assets/images/weekly_boon_icons/png/sagePorcelain/double_xp.webp'");
    expect(boon).toContain("flashcard_friday: 'assets/images/weekly_boon_icons/png/sagePorcelain/flashcard_friday.webp'");
    expect(boon).toContain("speaking_saturday: 'assets/images/weekly_boon_icons/png/sagePorcelain/speaking_saturday.webp'");
    expect(boon).toContain("early_bird: 'assets/images/weekly_boon_icons/png/sagePorcelain/early_bird.webp'");
    expect(boon).toContain("perfect_week: 'assets/images/weekly_boon_icons/png/sagePorcelain/perfect_week.webp'");
  });
});
