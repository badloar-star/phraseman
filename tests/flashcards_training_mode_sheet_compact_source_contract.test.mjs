import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

// зачем (владелец 01.10, скрин «Тренироваться с карточками»): окно выбора тренировки —
// шторка снизу с ручкой, заголовок слева, подпись, круглая ×, крупные строки
// «значок в квадрате · название · описание · ›». Цвета — наши токены.
const source = fs.readFileSync(
  path.join(process.cwd(), 'app', 'flashcards', 'FlashcardsTrainingModeSheet.tsx'),
  'utf8',
);
const styles = source.slice(source.indexOf('const styles = StyleSheet.create'));
const styleBlock = (name, nextName) => {
  const start = styles.indexOf(`\n  ${name}:`);
  const end = styles.indexOf(`\n  ${nextName}:`, start + 1);
  return styles.slice(start, end);
};

assert.match(source, /animationType="slide"/, 'bottom sheet slides up');
assert.match(styleBlock('modalRoot', 'backdrop'), /justifyContent: 'flex-end'/, 'sheet is anchored to the bottom');
assert.match(styleBlock('sheet', 'rim'), /borderTopLeftRadius: 30/);
assert.match(source, /styles\.grabber/, 'sheet has a grabber');
assert.match(source, /backgroundColor: g\.opaqueSheet/, 'opaque base so underlying text cannot show through');
assert.doesNotMatch(source, /<BlurView/, 'no backdrop sampler');
assert.match(source, /Тренироваться с карточками/);
assert.match(source, /Выбери формат тренировки/);
assert.match(styleBlock('heading', 'headingSubtitle'), /fontSize: 26/);
assert.match(styleBlock('close', 'scroll'), /width: 44,[\s\S]*height: 44/, 'round close button');
assert.match(styleBlock('icon', 'copy'), /width: 48,[\s\S]*height: 48/, 'icon in a square tile');
assert.match(styleBlock('row', 'icon'), /minHeight: 76/);
assert.match(styleBlock('scroll', 'content'), /flexShrink: 1,[\s\S]*minHeight: 0/);
assert.doesNotMatch(source, /numberOfLines/);
assert.doesNotMatch(source, /styles\.cancelButton/, 'no separate Cancel button — closing is the round ×');
for (const mode of ['blitz', 'speaking', 'truefalse', 'recall']) {
  assert.match(source, new RegExp(`mode: '${mode}'`));
}
assert.match(source, /testID=\{`fc-training-mode-\$\{row\.mode\}`\}/);
assert.match(source, /onPress=\{\(\) => onSelect\(row\.mode\)\}/);
assert.match(source, /onPress=\{onClose\}/);

console.log('flashcards training mode sheet (owner screenshot 01.10) contract: PASS');
