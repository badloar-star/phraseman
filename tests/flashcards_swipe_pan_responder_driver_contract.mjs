import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const source = fs.readFileSync(path.join(process.cwd(), 'app', 'flashcards_swipe.tsx'), 'utf8');
const moveHandler = source.match(/onPanResponderMove:\s*Animated\.event\([\s\S]*?\n\s*\),/);
const medalSource = fs.readFileSync(path.join(process.cwd(), 'components', 'MedalToast.tsx'), 'utf8');
const medalMoveStart = medalSource.indexOf('onPanResponderMove: Animated.event(');
const medalMoveEnd = medalSource.indexOf('onPanResponderRelease:', medalMoveStart);
const medalMoveHandler = medalSource.slice(medalMoveStart, medalMoveEnd);

assert.ok(moveHandler, 'flashcard swipe must retain its Animated.event PanResponder handler');
assert.match(moveHandler[0], /useNativeDriver:\s*false/, 'PanResponder requires a callable JS Animated.event handler');
assert.doesNotMatch(moveHandler[0], /useNativeDriver:\s*true/, 'native-driver Animated.event is not callable by PanResponder');
assert.ok(medalMoveStart >= 0 && medalMoveEnd > medalMoveStart, 'MedalToast must retain its Animated.event PanResponder handler');
assert.match(medalMoveHandler, /useNativeDriver:\s*false/, 'MedalToast PanResponder must use a callable JS Animated.event handler');
assert.doesNotMatch(medalMoveHandler, /useNativeDriver:\s*true/, 'MedalToast PanResponder cannot use native-driver Animated.event');

console.log('flashcard PanResponder driver contract passed');
