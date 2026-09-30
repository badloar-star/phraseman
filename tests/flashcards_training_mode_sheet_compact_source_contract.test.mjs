import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

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

assert.match(source, /style=\{\[styles\.modalRoot, \{ paddingTop: insets\.top \+ 12, paddingBottom: insets\.bottom \+ 12 \}\]\}/);
assert.match(source, /maxHeight: screenHeight - insets\.top - insets\.bottom - 24/);
assert.match(source, /backgroundColor: g\.opaqueSheet/, 'dialog needs an opaque base so underlying cards and text cannot show through');
assert.doesNotMatch(styleBlock('dialog', 'rim'), /borderWidth|borderColor/);
assert.doesNotMatch(styleBlock('row', 'icon'), /borderWidth|borderColor/);
assert.doesNotMatch(styleBlock('cancelButton', 'cancelText'), /borderWidth|borderColor/);
assert.doesNotMatch(source, /borderColor: g\.glassEdge/);
assert.match(styleBlock('dialog', 'rim'), /flexShrink: 1/);
assert.match(styleBlock('scroll', 'content'), /flexShrink: 1,[\s\S]*minHeight: 0/);
assert.match(styleBlock('rim', 'scroll'), /height: 1/);
assert.match(source, /colors=\{\[g\.opaqueSheet, g\.opaqueSheet, g\.opaqueSheet\]\}/);
assert.match(styleBlock('dialogWash', 'rim'), /opacity: 1/);
assert.doesNotMatch(source, /<BlurView/, 'a backdrop sampler can reveal underlying text through the modal');
const opaqueWashIndex = source.indexOf('colors={[g.opaqueSheet, g.opaqueSheet, g.opaqueSheet]}');
const sheenIndex = source.indexOf("colors={[g.selected, 'transparent']}");
assert.ok(opaqueWashIndex >= 0 && opaqueWashIndex < sheenIndex, 'opaque theme wash must sit below the sheen');
assert.match(styleBlock('row', 'icon'), /minHeight: 56/);
assert.match(styleBlock('icon', 'copy'), /width: 34,[\s\S]*height: 34/);
assert.doesNotMatch(source, /numberOfLines/);
assert.ok(source.indexOf('testID="fc-training-mode-cancel"') > source.indexOf('<ScrollView'), 'Cancel must remain after the scrolling modes');
for (const mode of ['blitz', 'speaking', 'truefalse', 'recall']) {
  assert.match(source, new RegExp(`mode: '${mode}'`));
  assert.match(source, new RegExp(`testID=\{\\\`fc-training-mode-\\\$\{row\.mode\}\\\`\}`));
}
assert.match(source, /onPress=\{\(\) => onSelect\(row\.mode\)\}/);
assert.match(source, /onPress=\{onClose\}/);

console.log('flashcards training mode compact dialog contract: PASS');
