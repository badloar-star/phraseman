import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(__dirname, '..');
const screens = [
  'app/lesson1.tsx',
  'app/lesson_words.tsx',
  'app/lesson_irregular_verbs.tsx',
  'app/mistake_practice_session.tsx',
  'app/flashcards_swipe.tsx',
  'app/flashcards_blitz_session.tsx',
  'app/flashcards_listening_session.tsx',
  'app/flashcards_speaking_session.tsx',
  'app/learning_v2_direct_session_player_v1.tsx',
  'app/learning-v2/session/[id].tsx',
] as const;

for (const relativeFile of screens) {
  const source = fs.readFileSync(path.join(root, relativeFile), 'utf8');
  assert.ok(source.includes('SessionAttemptsHud'), `${relativeFile} has no attempts HUD`);
  assert.ok(source.includes('SessionAttemptsRecoveryModal'), `${relativeFile} has no recovery modal`);
  assert.ok(source.includes('useSessionAttempts'), `${relativeFile} has no attempts controller`);
  assert.ok(!source.includes('Попытка потеряна'), `${relativeFile} contains the forbidden toast`);
}

for (const relativeFile of ['app/arena.tsx', 'app/arena/index.tsx']) {
  const absoluteFile = path.join(root, relativeFile);
  if (!fs.existsSync(absoluteFile)) continue;
  const source = fs.readFileSync(absoluteFile, 'utf8');
  assert.ok(!source.includes('useSessionAttempts'), `${relativeFile} must remain excluded`);
}

console.log(`PASS session attempts screen wiring gate (${screens.length} screens, Arena excluded)`);
