import fs from 'fs';

/** Slice to ALL_TASKS array only — later in the file, `{ id:'` appears outside task defs. */
const lines = fs.readFileSync('app/daily_tasks.ts', 'utf8').split(/\n/).slice(67, 776);
const out = [];
let cur = null;

for (const ln of lines) {
  if (/^\s*\{\s*id:'/.test(ln)) {
    const idm = ln.match(/id:'([^']+)'/);
    cur = idm ? { id: idm[1] } : null;
    continue;
  }
  if (!cur) continue;

  const tm = ln.match(/titleRU:'([^']*)'/);
  if (tm) cur.tr = tm[1];
  const dm = ln.match(/descRU:'([^']*)'/);
  if (dm) cur.dr = dm[1];

  if (/descUK:/.test(ln) && /}\s*,?\s*$/.test(ln.trim())) {
    if (cur.id && cur.tr && cur.dr) {
      out.push({ id: cur.id, titleRU: cur.tr, descRU: cur.dr });
    }
    cur = null;
  }
}

console.log(out.length);
fs.writeFileSync('tmp_daily_tasks_ru.json', JSON.stringify(out, null, 2));
