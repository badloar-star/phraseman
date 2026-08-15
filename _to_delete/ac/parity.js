const client = require('./answer_check.js');
const server = require('./tournament_core.js');
let pass = 0, fail = 0;
const eq = (n, a, b) => { if (a === b) pass++; else { fail++; console.log('FAIL ' + n + ': клиент ' + a + ' против сервера ' + b); } };

// Хеш совпадает на произвольных строках, включая юникод и пустую
const seeds = ['', 'a', 'match-1|task-9|3', 'Ёжик в тумане', '🔥🔥', 'x'.repeat(500), '0', '-1', '  пробелы  '];
for (const s of seeds) eq('хеш ' + JSON.stringify(s.slice(0, 24)), client.arenaHash32(s), server.tournamentHash32(s));

// Канонический вид совпадает
const values = [0, 1, 42, -1, '3', ' 3 ', null, undefined, true, [], [1,2,3], ['a ',' b'], ['раз','два'], [0], ''];
for (const v of values) eq('канон ' + JSON.stringify(v), client.arenaCanonicalAnswerValue(v), server.canonicalAnswerValue(v));

// Отпечаток совпадает
for (const salt of ['m1', 'match_abc-123', ''])
  for (const taskId of ['t1', 'task.9', ''])
    for (const answer of [0, 3, [1,2,3,4], ['раз','два'], '', null])
      eq('отпечаток ' + salt + '/' + taskId + '/' + JSON.stringify(answer),
         client.arenaAnswerFingerprint(salt, taskId, answer),
         server.answerFingerprint(salt, taskId, answer));

// Проверка ответа против серверной verifyTournamentAnswer на настоящих заданиях
const MATCH_ID = 'match_smoke_1';
function fp(taskId, value) { return server.answerFingerprint(MATCH_ID, taskId, value); }

const choiceTask = { taskId: 'c1', mode: 'guess_phrase', kind: 'choice', answerFingerprints: [fp('c1', 2)] };
for (const i of [0,1,2,3]) {
  eq('выбор ' + i, client.arenaAnswerIsCorrect(MATCH_ID, choiceTask, { selectedIndex: i }), i === 2);
}
eq('выбор: мусор', client.arenaAnswerIsCorrect(MATCH_ID, choiceTask, { selectedIndex: '2' }), false);
eq('выбор: пусто', client.arenaAnswerIsCorrect(MATCH_ID, choiceTask, null), false);

const translateTask = { taskId: 't1', mode: 'translate_build', kind: 'translate',
  answerFingerprints: [fp('t1', ['i','am','here'])] };
eq('перевод верный', client.arenaAnswerIsCorrect(MATCH_ID, translateTask, { tokens: ['i','am','here'] }), true);
eq('перевод с пробелами', client.arenaAnswerIsCorrect(MATCH_ID, translateTask, { tokens: [' i ','am',' here'] }), true);
eq('перевод неверный порядок', client.arenaAnswerIsCorrect(MATCH_ID, translateTask, { tokens: ['am','i','here'] }), false);
eq('перевод короче', client.arenaAnswerIsCorrect(MATCH_ID, translateTask, { tokens: ['i','am'] }), false);

const pairTask = { taskId: 'p1', mode: 'speed_match', kind: 'match',
  answerFingerprints: [fp('p1', 1), fp('p1', 0), fp('p1', 3), fp('p1', 2)] };
const solution = [1, 0, 3, 2];
for (let pair = 0; pair < 4; pair++)
  for (let sel = 0; sel < 4; sel++)
    eq('пара ' + pair + '→' + sel, client.arenaPairIsCorrect(MATCH_ID, pairTask, pair, sel), solution[pair] === sel);
eq('пара вне диапазона', client.arenaPairIsCorrect(MATCH_ID, pairTask, 9, 0), false);
eq('вся доска верно', client.arenaAnswerIsCorrect(MATCH_ID, pairTask, { selectedIndexes: solution }), true);
eq('доска с ошибкой', client.arenaAnswerIsCorrect(MATCH_ID, pairTask, { selectedIndexes: [1,0,3,3] }), false);

console.log('');
console.log('ПРОЙДЕНО: ' + pass + '   ПРОВАЛЕНО: ' + fail);
process.exit(fail ? 1 : 0);
