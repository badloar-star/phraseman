import fs from 'fs';
import path from 'path';

const root = path.resolve(__dirname, '..');
const read = (relative: string) => fs.readFileSync(path.join(root, relative), 'utf8');

test('late async listeners are adopted through a disposable owner', () => {
  const messages = read('app/app_messages.ts');
  const notifications = read('app/notifications.ts');
  const layout = read('app/_layout.tsx');

  expect(messages).toContain('const lifetime = createDisposableAdoption();');
  expect(messages.match(/lifetime\.adopt\(/g)).toHaveLength(3);
  expect(messages).toContain('if (lifetime.isDisposed()) return;');
  expect(notifications).toContain('const lifetime = createDisposableAdoption();');
  expect(notifications).toContain('lifetime.adopt(() => subscription.remove?.());');
  expect(layout).toContain('const lifetime = createDisposableAdoption();');
  expect(layout).toContain('lifetime.adopt(() => subscription.remove());');
});
