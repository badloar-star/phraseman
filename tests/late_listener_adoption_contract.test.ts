import fs from 'fs';
import path from 'path';

const root = path.resolve(__dirname, '..');
const read = (relative: string) => fs.readFileSync(path.join(root, relative), 'utf8');

test('late async listeners are adopted through a disposable owner', () => {
  // зачем (перепрогон 12.10): живой поток subscribeUserAppMessages удалён как мёртвый (b59868b5b, §CORE-0162) — в
  // app_messages.ts поздних слушателей больше нет, сторожим оставшиеся места.
  const notifications = read('app/notifications.ts');
  const layout = read('app/_layout.tsx');

  expect(notifications).toContain('const lifetime = createDisposableAdoption();');
  expect(notifications).toContain('lifetime.adopt(() => subscription.remove?.());');
  expect(layout).toContain('const lifetime = createDisposableAdoption();');
  expect(layout).toContain('lifetime.adopt(() => subscription.remove());');
});
