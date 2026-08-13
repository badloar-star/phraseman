const server = require('./stars_ledger.js');
const client = require('./stars_view.js');
let pass = 0, fail = 0;
const eq = (n, a, b) => { if (a === b) pass++; else { fail++; console.log('FAIL ' + n + ': клиент ' + a + ' против сервера ' + b); } };

const cases = [
  { weekKey: '2026-W33', weekEarned: 40, prevWeekKey: '2026-W32', prevWeekEarned: 12 },
  { weekKey: '', weekEarned: 0, prevWeekKey: '', prevWeekEarned: 0 },
  { weekKey: '2026-W01', weekEarned: 7, prevWeekKey: '2025-W52', prevWeekEarned: 99 },
];
const state = (over) => Object.assign({}, server.EMPTY_STARS_STATE, {
  seasonId: 'arena-2026-08-01', seasonEarned: 120, balance: 80, earnedTotal: 120, spentTotal: 40,
}, over);

for (const over of cases) {
  const raw = state(over);
  const cs = client.normalizeStarsView(raw);
  for (const probe of ['2026-W33', '2026-W32', '2026-W01', '2025-W52', '2020-W01']) {
    eq('неделя ' + probe + ' при ' + JSON.stringify(over), client.starsWeekEarned(cs, probe), server.starsWeekEarned(raw, probe));
  }
}
{
  const raw = state({});
  const cs = client.normalizeStarsView(raw);
  for (const probe of ['arena-2026-08-01', 'arena-2026-06-01', '']) {
    eq('сезон ' + probe, client.starsSeasonEarned(cs, probe), server.starsSeasonEarned(raw, probe));
  }
  eq('тратимое', client.starsSpendable(cs), server.starsSpendable(raw));
  eq('тратимое из пустоты', client.starsSpendable(undefined), server.starsSpendable(undefined));
  eq('версия схемы', client.STARS_SCHEMA_VERSION, server.STARS_SCHEMA_VERSION);
  eq('заработано за всё время', client.starsEarnedAllTime(cs), 120);
  eq('траты не тронули заработанное', client.starsSpendable(cs), 80);
}
console.log('');
console.log('ПРОЙДЕНО: ' + pass + '   ПРОВАЛЕНО: ' + fail);
process.exit(fail ? 1 : 0);
