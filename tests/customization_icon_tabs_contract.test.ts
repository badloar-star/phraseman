import fs from 'fs';
import path from 'path';

const ROOT = path.resolve(__dirname, '..');
const CONTROLS = fs.readFileSync(
  path.join(ROOT, 'components', 'customization', 'CustomizationControls.tsx'),
  'utf8',
);
const SCREEN = fs.readFileSync(path.join(ROOT, 'app', 'avatar_select.tsx'), 'utf8');

describe('customization icon tabs', () => {
  it('uses two compact circular icon-only controls aligned to the right', () => {
    expect(CONTROLS).toContain("icon: 'person'");
    expect(CONTROLS).toContain("icon: 'sparkles'");
    expect(CONTROLS).toContain("tabGroup: { alignSelf: 'flex-end', flexDirection: 'row'");
    expect(CONTROLS).toContain('width: 48');
    expect(CONTROLS).toContain('height: 48');
    expect(CONTROLS).toContain('borderRadius: 24');
    expect(SCREEN).toContain("controls: { paddingHorizontal: GRID_PAD, paddingTop: 12, paddingBottom: 10, alignItems: 'flex-end' }");
  });

  it('keeps labels for accessibility and gives the selected tab a filled icon', () => {
    expect(CONTROLS).toContain('accessibilityState={{ selected }}');
    expect(CONTROLS).toContain('accessibilityLabel={item.label}');
    expect(CONTROLS).toContain('accessibilityRole="tab"');
    expect(CONTROLS).toContain('name={selected ? item.icon : item.outlineIcon}');
    expect(CONTROLS).toContain('color={selected ? t.correctText : t.textMuted}');
    expect(CONTROLS).not.toContain('<Segmented');
  });
});
