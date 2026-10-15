import fs from 'node:fs';
import path from 'node:path';
// зачем (15.10, красный HEAD): в CRLF строки длиннее на знак — replace выпадал за окно 2600 знаков; читаем с нормализованными концами строк
import { normalizeEol } from './helpers/read_source';

// зачем (Сверка 10.10 21:55): холодный `phraseman://video` распознавался как `/(tabs)/video`, но стартовый переход
// «корень → Главная» в app/_layout.tsx съедал ссылку. Сторож держит оба случая: холодная ссылка открывается вместо
// Главной; тёплая (initial: false) по-прежнему идёт своим путём и в хранилище не попадает.
import { consumeInitialDeepLinkTarget, rememberInitialDeepLinkTarget } from '../app/initial_deep_link_store';
import { redirectSystemPath } from '../app/+native-intent';

beforeEach(() => {
  consumeInitialDeepLinkTarget();
  jest.spyOn(console, 'log').mockImplementation(() => undefined);
});
afterEach(() => jest.restoreAllMocks());

test('холодная ссылка на вкладку запоминается и забирается ровно один раз', () => {
  expect(redirectSystemPath({ path: 'phraseman://video', initial: true })).toBe('/(tabs)/video');
  expect(consumeInitialDeepLinkTarget()).toBe('/(tabs)/video');
  expect(consumeInitialDeepLinkTarget()).toBeNull();
});

test('тёплая ссылка (initial: false) в хранилище не попадает — её открывает слушатель Linking', () => {
  redirectSystemPath({ path: 'phraseman://video', initial: false });
  expect(consumeInitialDeepLinkTarget()).toBeNull();
});

test('ссылка на Главную и пустой запуск не запоминаются', () => {
  redirectSystemPath({ path: 'phraseman:///', initial: true });
  expect(consumeInitialDeepLinkTarget()).toBeNull();
  redirectSystemPath({ path: 'phraseman://invite?ref=ABC123', initial: true });
  expect(consumeInitialDeepLinkTarget()).toBeNull();
});

test('протухшая (старше минуты) или не-вкладочная ссылка не уводит с Главной', () => {
  rememberInitialDeepLinkTarget('/(tabs)/video', 1_000);
  expect(consumeInitialDeepLinkTarget(1_000 + 61_000)).toBeNull();
  rememberInitialDeepLinkTarget('/premium_modal?context=x', 1_000);
  expect(consumeInitialDeepLinkTarget(2_000)).toBeNull();
});

test('стартовый переход с корня открывает ссылку холодного старта вместо Главной', () => {
  const layout = normalizeEol(fs.readFileSync(path.join(__dirname, '..', 'app', '_layout.tsx'), 'utf8'));
  const start = layout.indexOf("traceLessonExit('layout:rootIndex_replace_home'");
  const block = layout.slice(Math.max(0, start - 600), start + 2600); // зачем (R1): между трассировкой и replace встала ветка navigate без пересоздания каркаса
  expect(block).toContain('consumeInitialDeepLinkTarget()');
  expect(block).toContain("initialDeepLinkRef.current ?? '/(tabs)/home'");
  expect(block).toContain('router.replace(rootTarget as Href)');
  expect(block).not.toMatch(/router\.replace\('\/\(tabs\)\/home'\);\s*const retry/);
});
