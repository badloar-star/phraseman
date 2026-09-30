// зачем (эмулятор 30.09): expo-router сам открывает тёплую ссылку через
// redirectSystemPath, а слушатель Linking в app/_layout.tsx открывал её второй
// раз. В стеке лежали две копии экрана: первое «назад» выглядело мёртвым, а у
// неизвестной ссылки нижняя заглушка +not-found оставалась пустым экраном.
// Сторож держит правило: свой push — только если навигация ссылку не открыла.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const layout = readFileSync(new URL('../app/_layout.tsx', import.meta.url), 'utf8');

test('тёплая ссылка открывается сами только после проверки текущего пути', () => {
  const start = layout.indexOf("Linking.addEventListener('url'");
  assert.ok(start > 0, 'слушатель тёплых ссылок пропал');
  const effectStart = layout.indexOf('const target = pendingWarmDeepLink;', start);
  assert.ok(effectStart > 0, 'эффект открытия тёплой ссылки пропал');
  const effect = layout.slice(effectStart, layout.indexOf('}, [isBanned, pendingWarmDeepLink', effectStart));

  const pushAt = effect.lastIndexOf('router.push(target as Href)');
  assert.ok(pushAt > 0, 'ручной push тёплой ссылки пропал — онбординг/неготовый корень её потеряют');
  const skipAt = effect.indexOf('deeplink:skip_already_open');
  assert.ok(skipAt > 0 && skipAt < pushAt, 'перед ручным push нет проверки «навигация уже открыла ссылку» — вернётся двойной экран');
  assert.match(effect, /targetPath === currentPath/u, 'сравнение пути цели с текущим путём пропало');
  assert.match(effect, /setTimeout\(\(\) => \{[\s\S]*pathnameRef\.current/u, 'текущий путь читается сразу, а не после ожидания — в этот момент он ещё старый');
});
