import fs from 'fs';
import path from 'path';

test('the 3D scene loads the bundled canonical GLB instead of drawing placeholder primitives', () => {
  const source = fs.readFileSync(
    path.resolve(__dirname, '../components/avatar-dna-3d/Avatar3DScene.tsx'),
    'utf8',
  );

  expect(source).toContain("from '@react-three/fiber/native'");
  expect(source).toContain('useLoader(GLTFLoader, HUMAN_V2_BASE_ASSET.localUri ?? HUMAN_V2_BASE_ASSET.uri)');
  expect(source).toContain('<primitive object={model} />');
  expect(source).not.toContain('<sphereGeometry');
});
