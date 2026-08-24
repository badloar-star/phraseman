import fs from 'fs';
import path from 'path';

test('the visible Studio preview is an offline canonical rig, not a stack of generated image parts', () => {
  const source = fs.readFileSync(
    path.resolve(__dirname, '../components/avatar-dna/AvatarStudioRig.tsx'),
    'utf8',
  );

  expect(source).toContain('testID="avatar-studio-rig"');
  expect(source).toContain('testID="avatar-rig-eye-left"');
  expect(source).toContain('testID="avatar-rig-eye-right"');
  expect(source).toContain("from 'react-native-svg'");
  expect(source).not.toMatch(/Image|fetch\(|https?:\/\//);
});
