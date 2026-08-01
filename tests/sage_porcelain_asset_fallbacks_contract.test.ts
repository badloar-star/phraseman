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

function assertBusinessLightFallback(contract: SourceContract): void {
  const text = source(contract.file);
  const businessLight = themeBlocks(text, 'businessLight');
  const sage = themeBlocks(text, 'sagePorcelain');
  expect(businessLight).toHaveLength(contract.businessLightBlocks);
  expect(sage).toHaveLength(contract.businessLightBlocks);
  expect(requires(sage.flat().join('\n'))).toHaveLength(contract.slots);
  expect(requires(sage.flat().join('\n'))).toEqual(requires(businessLight.flat().join('\n')));
}

describe('sage porcelain static asset fallbacks', () => {
  it('uses the complete businessLight static slot lists without adding assets', () => {
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
    ].forEach(assertBusinessLightFallback);
  });

  it('keeps all Sage fallback require paths literal and backed by existing businessLight assets', () => {
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
        expect(relativePath).toContain('businessLight');
        expect(existsSync(path.resolve(path.join(ROOT, path.dirname(file)), relativePath))).toBe(true);
      }
    }
  });

  it('uses all ten businessLight home-menu slots for Sage', () => {
    const text = source('app/home_menu_icons.ts');
    const branch = (theme: string) => text.match(new RegExp(`if \\(themeMode === '${theme}'\\) \\{([\\s\\S]*?)\\n  \\}`, 'm'))?.[1] ?? '';
    expect(requires(branch('sagePorcelain'))).toEqual(requires(branch('businessLight')));
    expect(requires(branch('sagePorcelain'))).toHaveLength(10);
  });

  it('uses Sage-specific trainer and streak chrome with the fixed porcelain palette', () => {
    const trainer = source('constants/trainerThemeIcons.ts');
    const streak = source('constants/streakIconAssets.ts');
    expect(themeBlocks(trainer, 'sagePorcelain')[0]).toContain("primary: '#315F50'");
    expect(themeBlocks(trainer, 'sagePorcelain')[0]).toContain("secondary: '#8B6320'");
    expect(themeBlocks(trainer, 'sagePorcelain')[0]).toContain("stroke: '#17201D'");
    expect(themeBlocks(trainer, 'sagePorcelain')[0]).toContain("muted: '#FCFDF9'");
    expect(streak).toContain("sagePorcelain: { rgb: [139, 99, 32], accent: '#315F50' }");
    expect(streak).toContain("sagePorcelain: { rgb: [97, 112, 106], accent: '#52605A' }");
  });
});
