import fs from 'node:fs';
import path from 'node:path';

const source = fs.readFileSync(
  path.join(process.cwd(), 'components', 'CoachToast.tsx'),
  'utf8',
);

function styleBlock(name: string): string {
  const match = source.match(new RegExp(`\\n\\s*${name}: \\{([\\s\\S]*?)\\n\\s*\\},`));
  if (!match) throw new Error(`Missing StyleSheet block: ${name}`);
  return match[1];
}

describe('CoachToast geometry contract', () => {
  test('keeps the interactive toast bottom-anchored while animation stays on the inner node', () => {
    expect(source).toContain(
      '<View style={[styles.containerAnchor, { bottom: safeBottom }]} pointerEvents="box-none">',
    );

    const anchor = styleBlock('containerAnchor');
    expect(anchor).toContain("position: 'absolute'");
    expect(anchor).toContain('left: 16');
    expect(anchor).toContain('right: 16');
    expect(anchor).not.toMatch(/\btop\s*:/);
    expect(anchor).not.toMatch(/\btransform\s*:/);
    expect(anchor).not.toMatch(/\bopacity\s*:/);

    const animatedLayer = styleBlock('container');
    expect(animatedLayer).not.toMatch(/\b(position|top|bottom|left|right)\s*:/);
    expect(source).toContain('transform: [{ translateY: slideAnim }]');
    expect(source).toContain('opacity: opacityAnim');
  });
});
