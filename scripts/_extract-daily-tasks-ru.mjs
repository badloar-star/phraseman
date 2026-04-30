import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const s = fs.readFileSync(path.join(__dirname, '../app/daily_tasks.ts'), 'utf8');
const parts = s.split("{ id:'").slice(1);
const tasks = {};
for (const p of parts) {
  const idm = p.match(/^([^']+)/);
  if (!idm) continue;
  const id = idm[1];
  const tr = p.match(/titleRU:'((?:\\\\.|[^\\\\'])*)'/);
  const dr = p.match(/descRU:'((?:\\\\.|[^\\\\'])*)'/);
  if (!tr || !dr) continue;
  const unesc = (x) => x.replace(/\\'/g, "'").replace(/\\n/g, '\n');
  tasks[id] = { title: unesc(tr[1]), desc: unesc(dr[1]) };
}
const out = path.join(__dirname, '../.tmp-daily-tasks-ru.json');
fs.writeFileSync(out, JSON.stringify(tasks, null, 2), 'utf8');
console.log('wrote', out, 'keys', Object.keys(tasks).length);
