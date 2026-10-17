// зачем (Сверка 18.10, карта V2 в светлой теме при шрифте 1,3: «Урок 1» → «Ур», плашка → «Классический», счётчик «0/8» → «0/»; слово владельца: лечить вёрсткой и переносом,
// не ужатием кегля): подпись урока и счётчик главы не сжимаются, строка с плашкой переносится, adjustsFontSizeToFit не используется.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const src = readFileSync('components/learning-v2/LearningV2ChaptersCourse.tsx', 'utf8').replace(/\r\n/g, '\n');
const style = (name) => {
  const match = src.match(new RegExp(`\\b${name}: \\{([^}]*)\\}`));
  assert.ok(match, `стиль ${name} найден`);
  return match[1];
};

test('«Урок N» не сжимается, строка с плашкой «Классический курс» переносится', () => {
  assert.match(style('lessonKicker'), /flexShrink: 0/);
  assert.match(style('kickerRow'), /flexWrap: "wrap"/);
  assert.match(style('classicChip'), /maxWidth: "100%"/);
  assert.match(style('classicChip'), /flexShrink: 1/);
  assert.match(style('classicChipText'), /flexShrink: 1/, 'текст плашки переносится, а не режется');
});

test('счётчик главы «0/8» не сжимается и держит минимальную ширину под крупный шрифт', () => {
  const frac = style('chapterFrac');
  assert.match(frac, /flexShrink: 0/);
  assert.match(frac, /minWidth: 56/);
});

test('на карте нет ужатия шрифта и обрезки подписей', () => {
  assert.ok(!src.includes('adjustsFontSizeToFit'));
  const kicker = src.slice(src.indexOf('<View style={styles.kickerRow}>'), src.indexOf('</PressableHybrid>', src.indexOf('<View style={styles.kickerRow}>')));
  assert.ok(!kicker.includes('numberOfLines'), 'подпись урока и плашка без numberOfLines');
});
