import { readFileSync } from 'node:fs';

const home = readFileSync('app/(tabs)/home.tsx', 'utf8');

const requiredHomeMarkers = [
  "useMyCoinRank",
  "weekDone",
  "weekPoints",
];
for (const marker of requiredHomeMarkers) {
  if (!home.includes(marker)) throw new Error(`PM-013 missing Home separation marker: ${marker}`);
}
if (/\bXP\b|legacy level/i.test(home)) throw new Error('PM-013 Home still contains XP/legacy-level surface');

console.log('PM-013 PROGRESS SEPARATION: PASS');
