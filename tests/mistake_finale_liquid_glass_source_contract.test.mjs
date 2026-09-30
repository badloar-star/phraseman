import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const finale = readFileSync(new URL('../components/mistake-practice/MistakeSessionFinale.tsx', import.meta.url), 'utf8');
const verdict = readFileSync(new URL('../components/mistake-practice/MistakeVerdictPanel.tsx', import.meta.url), 'utf8');

test('mistake finale uses translucent Liquid Glass rows without changing rewards or actions', () => {
  // 30.09 (2.0): стекло непрозрачное (память владельца «стекло 2.0 = непрозрачное»),
  // экраны ошибок переведены на useLv2Glass + g.opaque* (efe19ae9d); полупрозрачный glassFill снят.
  assert.match(finale, /useLv2Glass\(\)/);
  assert.ok((finale.match(/g\.opaque(Card|Control|Sheet)/g) ?? []).length >= 2);
  assert.match(finale, /onPress=\{onDone\}/);
  assert.match(finale, /onPress=\{onMore\}/);
});

test('mistake verdict keeps its success and error semantics while its explanation uses glass', () => {
  assert.match(verdict, /useLv2Glass\(\)/);
  assert.match(verdict, /backgroundColor: g\.opaque(Card|Control|Sheet)/);
  // 2.0: семантика «верно/неверно» — токены LV2 (goodFill/badFill), не старые t.correctBg/t.wrongBg.
  assert.match(verdict, /correct \? g\.goodFill : g\.badFill/);
});
