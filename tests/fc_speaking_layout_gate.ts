import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const source = fs.readFileSync(
  path.join(process.cwd(), 'app', 'flashcards_speaking_session.tsx'),
  'utf8',
);

assert.match(
  source,
  /cardArea:\s*\{[^}]*justifyContent:\s*'center'[^}]*paddingTop:\s*34[^}]*\}/,
  'speaking card area must keep the approved 34 px of top padding below the progress bar',
);

console.log('PASS fc speaking card stays below progress');
