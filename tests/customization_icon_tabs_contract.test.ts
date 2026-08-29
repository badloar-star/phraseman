import fs from 'fs';
import path from 'path';

const ROOT = path.resolve(__dirname, '..');
const CONTROLS = fs.readFileSync(
  path.join(ROOT, 'components', 'customization', 'CustomizationControls.tsx'),
  'utf8',
);
const SCREEN = fs.readFileSync(path.join(ROOT, 'app', 'avatar_select.tsx'), 'utf8');

describe('customization segmented tabs', () => {
  it('uses one compact labeled Avatar and Aura segmented control', () => {
    expect(CONTROLS).toContain('{item.label}');
    expect(CONTROLS).toContain('segmentedGroup');
    expect(CONTROLS).toContain('minHeight: 44');
    expect(CONTROLS).not.toContain("icon: 'person'");
    expect(CONTROLS).not.toContain("icon: 'sparkles'");
    expect(SCREEN).toContain('<CustomizationTabs');
  });

  it('keeps labels and selected state accessible without relying on icons', () => {
    expect(CONTROLS).toContain('accessibilityState={{ selected }}');
    expect(CONTROLS).toContain('accessibilityLabel={item.label}');
    expect(CONTROLS).toContain('accessibilityRole="tab"');
    expect(CONTROLS).toContain('color: selected ? t.correctText : t.textMuted');
  });
});
