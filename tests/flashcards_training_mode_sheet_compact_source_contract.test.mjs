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

// зачем (Motion п.8): шторка едет по числам kit.css из KIT_MOTION (440 мс, затемнение 260 мс), а не системным slide
assert.match(source, /animationType="none"/, 'own motion, no system slide');
assert.match(source, /KIT_MOTION\.sheetMs/, 'sheet uses kit.css motion');
assert.match(source, /KIT_MOTION\.dimMs/, 'backdrop uses kit.css motion');
assert.match(styleBlock('modalRoot', 'backdrop'), /justifyContent: 'flex-end'/, 'sheet is anchored to the bottom');
// зачем (макет cards-section «Режим тренировки»): шторка r28, ручка 44×5, заголовок 22/700 и пилюля остатка, строки 90 с плиткой 57
assert.match(styleBlock('sheet', 'sheetFill'), /borderTopLeftRadius: 28/);
assert.match(source, /styles\.grabber/, 'sheet has a grabber');
assert.doesNotMatch(source, /<BlurView/, 'no backdrop sampler');
assert.match(source, /Режим тренировки/);
assert.match(styleBlock('heading', 'headingSubtitle'), /fontSize: 22/);
// зачем (Карточки 2.0 12.10, cards-v2.html `.mgrid`/`.mt`): режимы — сетка плиток 2×2 (зазор 10), плитка r20, поля 16, высота от 112, значок 46.
assert.match(styleBlock('icon', 'copy'), /width: 46,[\s\S]*height: 46/, 'icon in a square tile');
assert.match(styleBlock('gridRow', 'tile'), /flexDirection: 'row', gap: 10/);
assert.match(styleBlock('tile', 'icon'), /minHeight: 112, borderRadius: 20, padding: 16/);
assert.match(styleBlock('headCopy', 'heading'), /alignItems: 'center'/, 'heading is centred');
assert.doesNotMatch(source, /limitPill|limitText/, 'no remaining-trainings pill in the mode sheet (cards-v2: «без пилюли»)');
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
