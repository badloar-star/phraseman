import fs from 'fs';
import path from 'path';

const root = path.join(__dirname, '..');
const read = (relativePath: string) => fs.readFileSync(path.join(root, relativePath), 'utf8');

describe('avatar aura soft edge contract', () => {
  it('renders a layered soft halo without a visible outline', () => {
    const source = read('components/AvatarAura.tsx');

    expect(source).not.toContain('borderWidth:');
    expect(source).not.toContain('borderColor:');
    expect(source).not.toContain('elevation:');
    expect(source).toContain('testID="avatar-aura-soft-edge-outer"');
    expect(source).toContain('testID="avatar-aura-soft-edge-inner"');
    expect(source).toContain("overflow: 'visible'");
  });

  it('does not use a realtime blur surface for the halo', () => {
    const source = read('components/AvatarAura.tsx');

    expect(source).not.toContain('BlurView');
    expect(source).not.toContain('expo-blur');
  });
});
