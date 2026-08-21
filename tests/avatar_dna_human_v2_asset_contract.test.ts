import fs from 'fs';
import path from 'path';

test('ships one local canonical human_v2 GLB through a static Metro require', () => {
  const asset = path.resolve(__dirname, '../assets/avatar-dna/human_v2/human_v2_base.glb');
  const sourcePath = path.resolve(__dirname, '../modules/avatar-dna-3d/local_assets.ts');

  expect(fs.existsSync(sourcePath)).toBe(true);
  expect(fs.existsSync(asset)).toBe(true);
  expect(fs.statSync(asset).size).toBeGreaterThan(1024);
  const source = fs.readFileSync(sourcePath, 'utf8');
  expect(source).toContain("require('../../assets/avatar-dna/human_v2/human_v2_base.glb')");
});
