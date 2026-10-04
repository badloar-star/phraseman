import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const finale = readFileSync(new URL('../components/mistake-practice/MistakeSessionFinale.tsx', import.meta.url), 'utf8');

test('mistake finale uses translucent Liquid Glass rows without changing rewards or actions', () => {
  // 30.09 (2.0): стекло непрозрачное (память владельца «стекло 2.0 = непрозрачное»),
  // экраны ошибок переведены на useLv2Glass + g.opaque* (efe19ae9d); полупрозрачный glassFill снят.
  assert.match(finale, /useLv2Glass\(\)/);
  // 04.10 (макет «Панель»): панель, строки и кнопки рисует общий набор components/mistakes-panel.
  assert.match(finale, /mistakes-panel\/PanelKit/);
  assert.match(finale, /onPress=\{onDone\}/);
  assert.match(finale, /onPress=\{onMore\}/);
});
