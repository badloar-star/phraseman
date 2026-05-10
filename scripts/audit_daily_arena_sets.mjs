import fs from 'node:fs';

const s = fs.readFileSync('app/daily_tasks.ts', 'utf8');
const idType = {};
for (const line of s.split('\n')) {
  const mm = line.match(/\{ id:'([^']+)', type:'([^']+)'/);
  if (mm) idType[mm[1]] = mm[2];
}

const ARENA = new Set(['arena_play', 'arena_win', 'arena_plays_wins_combo', 'arena_rank_promoted']);
const isArena = (id) => ARENA.has(idType[id]);

const PREMIUM_FB = {};
for (const line of s.split('\n')) {
  const m = line.match(/^\s*es(\d):\s*'([^']+)'/);
  if (m) PREMIUM_FB[`es${m[1]}`] = m[2];
}

function resolvePremiumIds(ids) {
  return ids.map((id) => {
    const t = idType[id];
    if (t === 'energy_spend' && PREMIUM_FB[id]) return PREMIUM_FB[id];
    return id;
  });
}

function audit(block) {
  const re = new RegExp(`const ${block}: string\\[\\]\\[\\] = \\[([\\s\\S]*?)\\n\\];`);
  const body = s.match(re)[1];
  const rows = [];
  for (const line of body.split('\n')) {
    const m2 = line.match(/\['([^']+)'\s*,\s*'([^']+)'\s*,\s*'([^']+)'\]/);
    if (!m2) continue;
    const ids = [m2[1], m2[2], m2[3]];
    const nFree = ids.filter(isArena).length;
    const nPrem = resolvePremiumIds(ids).filter(isArena).length;
    rows.push({ nFree, nPrem, ids, line: line.trim() });
  }
  const badFree = [];
  const badPrem = [];
  rows.forEach((r, i) => {
    if (r.nFree !== 1) badFree.push({ day: i + 1, ...r });
    if (r.nPrem !== 1) badPrem.push({ day: i + 1, ...r });
  });
  return { rows: rows.length, badFree, badPrem };
}

for (const name of ['DAILY_SETS_TIER1', 'DAILY_SETS_TIER2', 'DAILY_SETS_TIER3']) {
  const { rows, badFree, badPrem } = audit(name);
  console.log(name, 'days', rows, 'violations free', badFree.length, 'premium', badPrem.length);
  for (const b of badFree) console.log(' ', 'free day', b.day, 'count', b.nFree, b.ids.join(','));
  for (const b of badPrem) console.log(' ', 'premium day', b.day, 'count', b.nPrem, b.ids.join(','));
}
