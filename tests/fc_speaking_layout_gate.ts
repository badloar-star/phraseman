import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const source = fs.readFileSync(
  path.join(process.cwd(), 'app', 'flashcards_speaking_session.tsx'),
  'utf8',
);

assert.match(
  source,
  // 04.10 (practice.html `.qc.sp` margin-top 34): карточка стоит сверху, а не по центру экрана.
  /cardArea:\s*\{[^}]*justifyContent:\s*'flex-start'[^}]*paddingTop:\s*34[^}]*\}/,
  'speaking card area must keep the approved 34 px of top padding below the progress bar',
);

console.log('PASS fc speaking card stays below progress');
