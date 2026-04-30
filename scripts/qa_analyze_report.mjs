import { readFileSync } from 'node:fs';
const j = JSON.parse(readFileSync('./docs/reports/qa_lessons_full.json', 'utf8'));

function group(g) { return j.filter(x => x.group === g); }
function byLesson(arr) {
  const o = {};
  arr.forEach(e => { o[e.lessonId] = (o[e.lessonId] || 0) + 1; });
  return o;
}

console.log('=== C4 (дистрактор совпадает с другим словом фразы) ===');
const c4 = group('C4');
console.log('By lesson:', byLesson(c4));
console.log('First 10:');
c4.slice(0, 10).forEach(e => console.log('  L' + e.lessonId + ' p=' + e.phraseId + ': ' + e.message));

console.log('\n=== C5 (длина дистрактора отличается на >2) ===');
const c5 = group('C5');
console.log('By lesson:', byLesson(c5));
console.log('First 5:');
c5.slice(0, 5).forEach(e => console.log('  L' + e.lessonId + ' p=' + e.phraseId + ': ' + e.message));

console.log('\n=== C6 (капитализация дистрактора != correct) ===');
const c6 = group('C6');
console.log('By lesson:', byLesson(c6));
console.log('First 10:');
c6.slice(0, 10).forEach(e => console.log('  L' + e.lessonId + ' p=' + e.phraseId + ': ' + e.message));

console.log('\n=== C7 (пунктуация дистрактора != correct) ===');
const c7 = group('C7');
console.log('By lesson:', byLesson(c7));
console.log('First 10:');
c7.slice(0, 10).forEach(e => console.log('  L' + e.lessonId + ' p=' + e.phraseId + ': ' + e.message));

console.log('\n=== C1 (distractors.length != 5) — частоты по урокам уже видели ===');
const c1 = group('C1');
console.log('First 5:');
c1.slice(0, 5).forEach(e => console.log('  L' + e.lessonId + ' p=' + e.phraseId + ': ' + e.message));

console.log('\n=== Сводка ошибок (severity=error) ===');
const errors = j.filter(x => x.severity === 'error');
const errBy = {};
errors.forEach(e => { errBy[e.group] = (errBy[e.group] || 0) + 1; });
console.log(errBy);
