import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const source = fs.readFileSync(
  path.join(process.cwd(), 'app', 'flashcards', 'FlashcardsHubScreen.tsx'),
  'utf8',
);

const styleBlock = (name, nextName) => source.slice(source.indexOf(`${name}:`), source.indexOf(`${nextName}:`));

assert.doesNotMatch(styleBlock('backButton', 'headerTitle'), /borderWidth|borderColor/);
assert.doesNotMatch(styleBlock('segment', 'segmentText'), /borderWidth|borderColor/);
assert.doesNotMatch(styleBlock('libraryRow', 'rowSheen'), /borderWidth|borderColor/);
assert.doesNotMatch(styleBlock('trainDock', 'trainButton'), /borderTopWidth|borderTopColor/);
assert.doesNotMatch(source, /borderColor: g\.glassEdge/);
assert.doesNotMatch(source, /borderTopColor: g\.glassEdge/);
assert.match(styleBlock('rowSheen', 'libraryIcon'), /position: 'absolute',[\s\S]*top: 0,[\s\S]*height: 1/);
assert.match(source, /pathname: '\/flashcards_collection'/);
assert.match(source, /router\.push\('\/flashcards_my_packs' as never\)/);
assert.match(source, /router\.push\('\/flashcards_packs' as never\)/);
assert.match(source, /router\.push\('\/flashcards_video_packs' as never\)/);

console.log('flashcards hub no-outline contract: PASS');
