#!/usr/bin/env node
// Integrates generated lesson cards (2-29) into app/lesson_cards_data.ts

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const TARGET = path.join(ROOT, 'app', 'lesson_cards_data.ts');
const GENERATED = path.join(__dirname, 'lesson_cards_generated.ts');

// Read generated file and extract the object content
const gen = fs.readFileSync(GENERATED, 'utf8');
// Extract content between first { and last }; of generatedLessonCards
const match = gen.match(/export const generatedLessonCards[^=]+=\s*\{([\s\S]+)\};\s*$/);
if (!match) { console.error('Could not parse generated file'); process.exit(1); }
const insertContent = match[1].trim(); // "  2: { ... },  3: { ... }, ..."

// Read target file
let target = fs.readFileSync(TARGET, 'utf8');

// Find the closing }; of lessonCards and insert before it
// The pattern: last line is "};" 
const closingPattern = /^};\s*$/m;
const closingMatch = target.match(closingPattern);
if (!closingMatch) { console.error('Could not find closing }; in target'); process.exit(1); }

const insertPos = target.lastIndexOf('};');
const before = target.substring(0, insertPos);
const after = target.substring(insertPos);

const newContent = before + insertContent + '\n' + after;

fs.writeFileSync(TARGET, newContent, 'utf8');
console.log('Done! Integration complete.');
console.log('Lines in target:', newContent.split('\n').length);
