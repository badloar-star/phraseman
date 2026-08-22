import fs from 'fs';
import path from 'path';

describe('Avatar3DStage contract', () => {
  it('uses native demand rendering with no avatar motion or network path', () => {
    const source = fs.readFileSync(
      path.resolve(__dirname, '../components/avatar-dna-3d/Avatar3DStage.tsx'),
      'utf8',
    );

    expect(source).toContain("from '@react-three/fiber/native'");
    expect(source).toMatch(/frameloop=["']demand["']/);
    expect(source).toContain('prewarm.ready');
    expect(source).not.toMatch(/useFrame\(|requestAnimationFrame|fetch\(|Animated|react-native-reanimated/);
  });
});
