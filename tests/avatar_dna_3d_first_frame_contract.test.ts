import fs from 'fs';
import path from 'path';

test('the native 3D stage explicitly renders its first static frame', () => {
  const source = fs.readFileSync(
    path.resolve(__dirname, '../components/avatar-dna-3d/Avatar3DStage.tsx'),
    'utf8',
  );

  expect(source).toContain('camera={{ position: [0, 0, 5] }}');
  expect(source).toContain('onCreated={(state) => state.invalidate()}');
  expect(source).toContain('frameloop="demand"');
});
