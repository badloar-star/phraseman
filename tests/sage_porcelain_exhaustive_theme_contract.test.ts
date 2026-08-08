import fs from 'fs';
import path from 'path';
import { SAGE_PORCELAIN } from '../constants/theme';

const readSource = (...segments: string[]) => fs.readFileSync(path.join(process.cwd(), ...segments), 'utf8');

function relativeLuminance(hex: string): number {
  const channels = hex.slice(1).match(/.{2}/g)?.map((channel) => parseInt(channel, 16) / 255);
  if (!channels || channels.length !== 3) throw new Error(`Expected a six-digit hex color, received ${hex}`);
  const [red, green, blue] = channels.map((channel) => (
    channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4
  ));
  return (0.2126 * red) + (0.7152 * green) + (0.0722 * blue);
}

function contrastRatio(foreground: string, background: string): number {
  const [lighter, darker] = [relativeLuminance(foreground), relativeLuminance(background)].sort((a, b) => b - a);
  return (lighter + 0.05) / (darker + 0.05);
}

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
    expect(source).toContain('const closeButtonBackground = isSagePorcelain ? t.bgSurface');
    expect(source).toContain('const closeButtonBorder = isSagePorcelain ? t.border');
    expect(source).toContain('const closeButtonText = t.textPrimary;');
    expect(source).toContain('backgroundColor: closeButtonBackground');
    expect(source).toContain('borderWidth: isSagePorcelain ? 1 : 0');
    expect(source).toContain('borderColor: closeButtonBorder');
    expect(source).toContain('color: closeButtonText');
    expect(source).toContain('color: modalTitleColor');
    expect(contrastRatio(SAGE_PORCELAIN.textPrimary, SAGE_PORCELAIN.bgSurface)).toBeGreaterThanOrEqual(4.5);
  });

  it('gives personal-plan screens explicit approved Sage visual roles', () => {
    const plan = readSource('app', 'personal_plan.tsx');
    const stats = readSource('app', 'personal_plan_stats_screen.tsx');

    for (const source of [plan, stats]) {
      expect(source).toContain("if (themeMode === 'sagePorcelain')");
      expect(source).toContain("bg: ['#DCE1D8', '#CDD5C7', '#BFC8B8']");
      expect(source).toContain("card: ['#FCFDF9', '#DCE1D8']");
      expect(source).toContain("accent: '#315F50'");
      expect(source).toContain("border: '#CFD6CE'");
      expect(source).toContain("text: '#17201D'");
      expect(source).toContain("muted: '#52605A'");
      expect(source).toContain("accentSoft: '#D9E9E1'");
    }

    expect(plan).toContain("hero: ['#E1E5DC', '#DCE1D8']");
    expect(plan).toContain("ghost: '#61706A'");
    expect(plan).toContain("buttonText: '#FFFFFF'");
  });
});
