import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { normalizeEol } from './helpers/read_source_esm.mjs';

// зачем (владелец 01.10, скрин «Тренироваться с карточками»): окно выбора тренировки —
// шторка снизу с ручкой, заголовок слева, подпись, круглая ×, крупные строки
// «значок в квадрате · название · описание · ›». Цвета — наши токены.
const source = normalizeEol(fs.readFileSync(
  path.join(process.cwd(), 'app', 'flashcards', 'FlashcardsTrainingModeSheet.tsx'),
  'utf8',
));
const styles = source.slice(source.indexOf('const baseStyles = StyleSheet.create'));
const styleBlock = (name, nextName) => {
  const start = styles.indexOf(`\n  ${name}:`);
  const end = styles.indexOf(`\n  ${nextName}:`, start + 1);
  return styles.slice(start, end);
};

assert.match(source, /animationType="slide"/, 'bottom sheet slides up');
assert.match(styleBlock('modalRoot', 'backdrop'), /justifyContent: 'flex-end'/, 'sheet is anchored to the bottom');
// зачем (макет cards-section «Режим тренировки»): шторка r28, ручка 44×5, заголовок 22/700 и пилюля остатка, строки 90 с плиткой 57
assert.match(styleBlock('sheet', 'sheetFill'), /borderTopLeftRadius: 28/);
assert.match(source, /styles\.grabber/, 'sheet has a grabber');
assert.doesNotMatch(source, /<BlurView/, 'no backdrop sampler');
assert.match(source, /Режим тренировки/);
assert.match(styleBlock('heading', 'headingSubtitle'), /fontSize: 22/);
assert.match(styleBlock('icon', 'copy'), /width: 57,[\s\S]*height: 57/, 'icon in a square tile');
assert.match(styleBlock('row', 'rowLine'), /minHeight: 90/);
assert.match(styleBlock('scroll', 'content'), /flexShrink: 1,[\s\S]*minHeight: 0/);
assert.doesNotMatch(source, /numberOfLines/);
assert.doesNotMatch(source, /styles\.cancelButton/, 'no separate Cancel button — closing is the backdrop');
for (const mode of ['blitz', 'speaking', 'truefalse', 'recall']) {
  assert.match(source, new RegExp(`mode: '${mode}'`));
}
assert.match(source, /testID=\{`fc-training-mode-\$\{row\.mode\}`\}/);
assert.match(source, /onPress=\{\(\) => onSelect\(row\.mode\)\}/);
assert.match(source, /onPress=\{onClose\}/);

console.log('flashcards training mode sheet (owner screenshot 01.10) contract: PASS');
