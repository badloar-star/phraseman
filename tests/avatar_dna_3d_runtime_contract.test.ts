import fs from 'fs';
import path from 'path';

describe('Avatar DNA 3D runtime contract', () => {
  it('bundles only the native 3D runtime and accepts GLB assets', () => {
    const root = path.resolve(__dirname, '..');
    const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8')) as {
      dependencies?: Record<string, string>;
    };
    const metro = fs.readFileSync(path.join(root, 'metro.config.js'), 'utf8');

    expect(pkg.dependencies?.['expo-gl']).toBeDefined();
    expect(pkg.dependencies?.three).toBeDefined();
    expect(pkg.dependencies?.['@react-three/fiber']).toBeDefined();
    expect(metro).toMatch(/assetExts.*glb|glb.*assetExts/s);
  });
});
