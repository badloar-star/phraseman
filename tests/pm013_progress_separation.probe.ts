import { readFileSync } from 'node:fs';

const home = readFileSync('app/(tabs)/home.tsx', 'utf8');
const courseProgress = readFileSync('modules/learning-v2/progress/course_local_progress_v1.ts', 'utf8');

const requiredHomeMarkers = [
  "useMyCoinRank",
  "weekDone",
  "weekPoints",
];
for (const marker of requiredHomeMarkers) {
  if (!home.includes(marker)) throw new Error(`PM-013 missing Home separation marker: ${marker}`);
}
if (!courseProgress.includes('LEARNING_V2_COURSE_LOCAL_PROGRESS_SCHEMA_V1')) {
  throw new Error('PM-013 missing Learning V2 local course-progress contract');
}
if (/\bXP\b|legacy level/i.test(home)) throw new Error('PM-013 Home still contains XP/legacy-level surface');

console.log('PM-013 PROGRESS SEPARATION: PASS');
