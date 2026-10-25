// зачем (Ревизор 25.10, 🔴 04ec8cd30): константа цвета кнопки сцены стоит на уровне модуля — читать её можно только из модульного baseStyles;
// `s` (useScaledTextStyles) существует лишь внутри компонента, обращение к нему при загрузке модуля роняло сцену Главной (ReferenceError).
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

const src = readFileSync(fileURLToPath(new URL('../components/home/v2/scene/HomeSceneStage.tsx', import.meta.url)), 'utf8').replace(/\r\n/g, '\n');

test('цвет кнопки сцены читается из модульного baseStyles, не из s', () => {
  const line = src.split('\n').find((l) => l.startsWith('const CTA_INK'));
  assert.ok(line, 'константа CTA_INK на уровне модуля есть');
  assert.match(line, /StyleSheet\.flatten\(baseStyles\.ctaText\)/);
  assert.doesNotMatch(line, /flatten\(s\./);
  assert.ok(src.indexOf('const baseStyles = StyleSheet.create') < src.indexOf('const CTA_INK'), 'baseStyles объявлен раньше константы');
});

test('на уровне модуля нет обращений к s.', () => {
  const afterComponent = src.slice(src.indexOf('const baseStyles = StyleSheet.create'));
  const moduleLevel = afterComponent.split('\n').filter((l) => /^(const|let|var) /.test(l) && /\bs\./.test(l));
  assert.deepEqual(moduleLevel, []);
});
