import fs from 'node:fs';
import path from 'node:path';

test('keeps the P0 route open when the installed dev client lacks Expo GL', () => {
  const source = fs.readFileSync(
    path.resolve(__dirname, '../app/_admin_avatar_dna_3d_p0.tsx'),
    'utf8',
  );

  expect(source).not.toContain("import { Avatar3DStage }");
  expect(source).toContain("require('../components/avatar-dna-3d/Avatar3DStage')");
  expect(source).toContain('3D-просмотр требует новую dev-сборку');
});
