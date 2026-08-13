process.env.GOOGLE_CLOUD_PROJECT = process.env.GOOGLE_CLOUD_PROJECT || 'demo-smoke';
const X = require('./arena_xp.js');
let pass = 0, fail = 0;
const eq = (n, got, want) => { if (got === want) pass++; else { fail++; console.log('FAIL ' + n + ': получено ' + got + ', ожидалось ' + want); } };

// Рейтинг 10/10 + победа
eq('рейтинг идеально + победа', X.arenaMatchXp({ mode: 'ranked', correctAnswers: 10, taskCount: 10, outcome: 'win', dailyXpCredited: 0 }), 110);
eq('рейтинг идеально + ничья', X.arenaMatchXp({ mode: 'ranked', correctAnswers: 10, taskCount: 10, outcome: 'draw', dailyXpCredited: 0 }), 95);
eq('рейтинг идеально + поражение', X.arenaMatchXp({ mode: 'ranked', correctAnswers: 10, taskCount: 10, outcome: 'loss', dailyXpCredited: 0 }), 80);
eq('поражение всё равно платит', X.arenaMatchXp({ mode: 'ranked', correctAnswers: 3, taskCount: 10, outcome: 'loss', dailyXpCredited: 0 }), 38);

// Быстрый: звёзд нет, опыт есть
eq('быстрый 5/5', X.arenaMatchXp({ mode: 'quick', correctAnswers: 5, taskCount: 5, outcome: 'win', dailyXpCredited: 0 }), 30);
eq('быстрый: исход не влияет', X.arenaMatchXp({ mode: 'quick', correctAnswers: 5, taskCount: 5, outcome: 'loss', dailyXpCredited: 0 }), 30);

// Потолки
eq('потолок матча', X.arenaMatchXp({ mode: 'ranked', correctAnswers: 100, taskCount: 100, outcome: 'win', dailyXpCredited: 0 }), 120);
eq('дневной потолок обрезает', X.arenaMatchXp({ mode: 'ranked', correctAnswers: 10, taskCount: 10, outcome: 'win', dailyXpCredited: 560 }), 40);
eq('дневной потолок выбран', X.arenaMatchXp({ mode: 'ranked', correctAnswers: 10, taskCount: 10, outcome: 'win', dailyXpCredited: 600 }), 0);
eq('дневной потолок не уходит в минус', X.arenaMatchXp({ mode: 'ranked', correctAnswers: 10, taskCount: 10, outcome: 'win', dailyXpCredited: 9999 }), 0);

// Правильные ответы зажимаются числом заданий
eq('правильных больше заданий — зажимается', X.arenaMatchXp({ mode: 'quick', correctAnswers: 99, taskCount: 5, outcome: 'win', dailyXpCredited: 0 }), 30);
eq('мусорный ввод', X.arenaMatchXp({ mode: 'quick', correctAnswers: NaN, taskCount: 5, outcome: 'win', dailyXpCredited: 0 }), 10);

// Боты
eq('бот не годится', X.arenaXpEligible('bot_abc'), false);
eq('человек годится', X.arenaXpEligible('u_abc'), true);
eq('пустой не годится', X.arenaXpEligible(''), false);

// Патч документа игрока
{
  const now = new Date('2026-08-12T10:00:00Z');
  const out = X.arenaXpUserPatch({ userData: { progress: { user_total_xp: '5000' } }, xpDelta: 110, now });
  eq('патч: опыт после', out.totalXpAfter, 5110);
  eq('патч: строка опыта', out.patch.progress.user_total_xp, '5110');
  eq('патч: уровень пересчитан', typeof out.levelAfter === 'number' && out.levelAfter > 0, true);
  eq('патч: недельные очки не меньше недельного опыта',
     Number(JSON.parse(out.patch.progress.week_points_v2).points) >= out.weekXpAfter, true);
  const zero = X.arenaXpUserPatch({ userData: { progress: { user_total_xp: '5000' } }, xpDelta: 0, now });
  eq('патч: нулевая дельта не меняет опыт', zero.totalXpAfter, 5000);
  const fresh = X.arenaXpUserPatch({ userData: undefined, xpDelta: 30, now });
  eq('патч: новый игрок', fresh.totalXpAfter, 30);
}

// Ключ недели
eq('ключ недели', X.arenaWeekKeyForMs(Date.UTC(2026, 7, 12)), '2026-W33');

console.log('');
console.log('ПРОЙДЕНО: ' + pass + '   ПРОВАЛЕНО: ' + fail);
process.exit(fail ? 1 : 0);
