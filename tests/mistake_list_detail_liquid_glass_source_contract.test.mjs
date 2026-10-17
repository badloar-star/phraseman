import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const list = readFileSync(new URL('../app/mistakes_list.tsx', import.meta.url), 'utf8');
const detail = readFileSync(new URL('../app/mistake_detail.tsx', import.meta.url), 'utf8');

test('active mistake list and detail use Liquid Glass without text truncation', () => {
  for (const source of [list, detail]) {
    // 30.09 (2.0): стекло непрозрачное (память владельца «стекло 2.0 = непрозрачное»),
    // экраны ошибок переведены на useLv2Glass + g.opaque* (efe19ae9d); полупрозрачный glassFill снят.
    assert.match(source, /useLv2Glass\(\)/);
    // 05.10 (Сверка mistakes-panel-007, cards-glass.css .ph .rb): круглые кнопки без текста — стекло 7 % (glassButtonFill);
    // правило «непрозрачное стекло» — для поверхностей с текстом, оно по-прежнему проверяется (opaque*).
    // 18.10 (Сайт, red-tests): №35 (05198c295, «кнопки не сливаются») заменил в списке g.opaqueControl на g.buttonFill — это тоже
    // непрозрачный цвет #RRGGBB (constants/liquidGlassButtonTokens.ts secondaryFill: ≥ 1,6 : 1 к фону, текст на нём ≥ 4,6 : 1), правило прежнее.
    assert.match(source, /g\.opaque(Card|Control|Sheet)|g\.buttonFill\b|glassButtonFill\(g\)/);
    assert.doesNotMatch(source, /glassFill\b/);
    assert.doesNotMatch(source, /numberOfLines/);
  }
});

test('list and detail keep their live navigation and training entry points', () => {
  assert.match(list, /pathname: '\/mistake_detail'/);
  assert.match(detail, /pathname: '\/mistake_practice_session'/);
  assert.match(detail, /focusMistakeId: detail\.mistakeId/);
  // 04.10 (макет «Панель»): шапка карточки идёт цветом под строку состояния, поэтому верхний отступ считает сам экран (insets.top).
  assert.match(detail, /edges=\{\['left', 'right'\]\}/);
  assert.match(detail, /insets\.top/);
});
