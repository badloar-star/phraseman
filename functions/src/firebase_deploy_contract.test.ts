import fs from 'node:fs';
import path from 'node:path';

test('Firebase builds TypeScript before every Functions deployment', () => {
  const root = path.resolve(__dirname, '..', '..');
  const firebase = JSON.parse(fs.readFileSync(path.join(root, 'firebase.json'), 'utf8')) as {
    functions?: { predeploy?: string[] };
  };
  expect(firebase.functions?.predeploy).toContain('npm --prefix "$RESOURCE_DIR" run build');
});
