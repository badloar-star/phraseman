import fs from 'node:fs';
import path from 'node:path';

test('places the Avatar DNA customizer shortcut next to the existing Lab button', () => {
  const source = fs.readFileSync(path.resolve(__dirname, '../app/(tabs)/home.tsx'), 'utf8');
  const devRoutes = fs.readFileSync(path.resolve(__dirname, '../constants/devRoutes.ts'), 'utf8');
  const labIndex = source.indexOf('testID="home-dev-hub-button"');
  const customizerIndex = source.indexOf('testID="home-avatar-dna-3d-p0-button"');

  expect(labIndex).toBeGreaterThanOrEqual(0);
  expect(customizerIndex).toBeGreaterThan(labIndex);
  expect(source).toContain('accessibilityLabel="Открыть 3D-кастомизатор персонажа"');
  expect(source).toContain("router.push('/_admin_avatar_dna_3d_p0' as any)");
  expect(source).toContain('name="color-palette-outline"');
  expect(devRoutes).toContain("routeName('_admin', 'avatar', 'dna', '3d', 'p0')");
  expect(devRoutes).toContain('AVATAR_DNA_3D_P0_ROUTE_NAME');
  expect(devRoutes).toContain('AVATAR_DNA_3D_P0_ROUTE');
});
