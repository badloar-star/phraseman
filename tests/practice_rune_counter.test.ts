import fs from 'fs';
import path from 'path';

const SOURCE = fs.readFileSync(path.join(__dirname, '..', 'components', 'PracticeRuneCounter.tsx'), 'utf8');

test('practice rune counter interpolates a Premium forfeiture countdown', () => {
  expect(SOURCE).toContain("import AnimatedCountUpText from './AnimatedCountUpText'");
  expect(SOURCE).toContain('<AnimatedCountUpText');
  expect(SOURCE).toContain('value={runes}');
  // зачем (10.10, координатор): count-up практики — 650 мс из KIT_MOTION (было 900).
  expect(SOURCE).toContain('durationMs={KIT_MOTION.counterMs}');
});

test('practice rune counter makes a Premium forfeiture visually distinct', () => {
  expect(SOURCE).toContain('const decreased = runes < previousRunes.current;');
  expect(SOURCE).toContain('const runeScale = useSharedValue(1);');
  expect(SOURCE).toContain('const runeLift = useSharedValue(0);');
  expect(SOURCE).toContain('withTiming(1.45');
  expect(SOURCE).toContain('withTiming(-8');
  // бамп при начислении — на числе (kit .num.up), не на всей пилюле
  expect(SOURCE).toContain('numBumpStyle');
});
