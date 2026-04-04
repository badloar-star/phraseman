const fs = require('fs');
let content = fs.readFileSync('app/lesson_data_all.ts', 'utf8');

// Read the generated block
const block = fs.readFileSync('C:/tmp/lesson26_ts_block.txt', 'utf8');

// Insert before ALL_LESSONS_RU
const marker = '\nexport const ALL_LESSONS_RU:';
const idx = content.indexOf(marker);
if (idx === -1) { console.error('Marker not found!'); process.exit(1); }

content = content.slice(0, idx) + '\n' + block + content.slice(idx);

// Add lesson 26 to ALL_LESSONS_RU
content = content.replace(
  "  25: LESSON_25_PHRASES.map(p => ({ english: p.english, russian: p.russian })),\n};",
  "  25: LESSON_25_PHRASES.map(p => ({ english: p.english, russian: p.russian })),\n  26: LESSON_26_PHRASES.map(p => ({ english: p.english, russian: p.russian })),\n};"
);

// Add lesson 26 to ALL_LESSONS_UK
content = content.replace(
  "  25: LESSON_25_PHRASES.map(p => ({ english: p.english, ukrainian: p.ukrainian })),\n};",
  "  25: LESSON_25_PHRASES.map(p => ({ english: p.english, ukrainian: p.ukrainian })),\n  26: LESSON_26_PHRASES.map(p => ({ english: p.english, ukrainian: p.ukrainian })),\n};"
);

// Add lesson 26 to LESSON_VOCABULARIES
content = content.replace(
  '  25: LESSON_25_VOCABULARY,\n};',
  '  25: LESSON_25_VOCABULARY,\n  26: LESSON_26_VOCABULARY,\n};'
);

// Add lesson 26 to LESSON_IRREGULAR_VERBS
content = content.replace(
  '  25: LESSON_25_IRREGULAR_VERBS,\n};',
  '  25: LESSON_25_IRREGULAR_VERBS,\n  26: LESSON_26_IRREGULAR_VERBS,\n};'
);

// Add to ALL_LESSONS.push
const allLessonsPush = "ALL_LESSONS.push({ id: 26, title: 'Урок 26', description: 'Zero and First Conditionals', phrases: LESSON_26_PHRASES });";
if (!content.includes(allLessonsPush)) {
  content = content.replace(
    "ALL_LESSONS.push({ id: 25,",
    allLessonsPush + "\nALL_LESSONS.push({ id: 25,"
  );
}

fs.writeFileSync('app/lesson_data_all.ts', content, 'utf8');
console.log('Done! File written.');
