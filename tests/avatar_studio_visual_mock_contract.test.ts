import fs from 'fs';
import path from 'path';

const mockPath = path.resolve(__dirname, '../prototypes/avatar-studio/index.html');

test('the visual mock contains the approved whole-character catalog and never uses face-part controls', () => {
  const source = fs.readFileSync(mockPath, 'utf8');

  expect(source).toContain('data-testid="avatar-studio-mock"');
  expect(source).toContain("id: 'boy'");
  expect(source).toContain("id: 'girl'");
  expect(source).toContain("'smirk'");
  expect(source).toContain("'archmage'");
  expect(source).toContain("'wizard-hat'");
  expect(source).toContain('Твоя студия');
  expect(source).toContain('Аксессуары');
  expect(source).toContain('Сохранить персонажа');
  expect(source).toContain('.thumb { position:relative;');
  expect(source).not.toContain('facePresetId');
  expect(source).not.toContain('sphereGeometry');
  expect(source).not.toContain('fetch(');
});
