import fs from 'fs';
import path from 'path';

const readSource = (...segments: string[]) => fs.readFileSync(path.join(process.cwd(), ...segments), 'utf8');

describe('Sage Porcelain exhaustive visual coverage', () => {
  it('gives level-gift gradients an explicit Sage Porcelain entry', () => {
    const source = readSource('constants', 'levelGiftImages.ts');

    expect(source).toContain("  'sagePorcelain',");
    expect(source).toContain("sagePorcelain: ['#E1E5DC', '#D1D9D1'],");
  });

  it('keeps level-gift modal chrome legible on the approved porcelain card', () => {
    const source = readSource('components', 'LevelGiftDualModal.tsx');

    expect(source).toContain("case 'sagePorcelain':");
    expect(source).toContain("return '#FCFDF9';");
    expect(source).toContain("const isSagePorcelain = themeMode === 'sagePorcelain';");
    expect(source).toContain("const modalTitleColor = isSagePorcelain ? t.textPrimary : '#FFFFFF';");
    expect(source).toContain("const closeButtonBackground = isSagePorcelain ? '#E1E5DC'");
    expect(source).toContain("const closeButtonBorder = isSagePorcelain ? '#CFD6CE'");
    expect(source).toContain('backgroundColor: closeButtonBackground');
    expect(source).toContain('borderWidth: isSagePorcelain ? 1 : 0');
    expect(source).toContain('borderColor: closeButtonBorder');
    expect(source).toContain('color: closeButtonText');
    expect(source).toContain('color: modalTitleColor');
  });

  it('gives personal-plan screens explicit approved Sage visual roles', () => {
    const plan = readSource('app', 'personal_plan.tsx');
    const stats = readSource('app', 'personal_plan_stats_screen.tsx');

    for (const source of [plan, stats]) {
      expect(source).toContain("if (themeMode === 'sagePorcelain')");
      expect(source).toContain("bg: ['#F0F1EC', '#E1E5DC', '#D1D9D1']");
      expect(source).toContain("card: ['#FCFDF9', '#F0F1EC']");
      expect(source).toContain("accent: '#315F50'");
      expect(source).toContain("border: '#CFD6CE'");
      expect(source).toContain("text: '#17201D'");
      expect(source).toContain("muted: '#52605A'");
      expect(source).toContain("accentSoft: '#D9E9E1'");
    }

    expect(plan).toContain("hero: ['#E1E5DC', '#F0F1EC']");
    expect(plan).toContain("ghost: '#61706A'");
    expect(plan).toContain("buttonText: '#FFFFFF'");
  });
});
