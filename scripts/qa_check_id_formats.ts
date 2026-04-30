import { LESSON_DATA } from '../app/lesson_data_all';

console.log('Lesson | id sample (first 3) | type');
for (let id = 1; id <= 32; id++) {
  const phrases = LESSON_DATA[id]?.phrases ?? [];
  const samples = phrases.slice(0, 3).map((p) => `${typeof p.id}:${p.id}`).join(' | ');
  const types = new Set(phrases.map((p) => typeof p.id));
  console.log(`L${String(id).padStart(2,'0')} | ${samples} | types=${[...types].join(',')}`);
}
