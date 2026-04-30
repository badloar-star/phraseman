import fs from 'fs';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);

const src = fs.readFileSync('app/daily_tasks.ts', 'utf8');
const ids = [...src.matchAll(/\bid:\s*'([^']+)'/g)].map((m) => m[1]);
const unique = [...new Set(ids)];
// Load compiled would need ts - instead parse object keys from ES file
const localeSrc = fs.readFileSync('app/daily_tasks_es_locale.ts', 'utf8');
const esKeys = [...localeSrc.matchAll(/^\s*([a-z0-9]{2,4}\d+):\s*\{/gm)].map((m) => m[1]);
const localeSet = new Set(esKeys);

const missing = unique.filter((id) => !localeSet.has(id));
const extra = esKeys.filter((k) => !unique.includes(k));

console.log('tasks in daily_tasks:', unique.length);
console.log('keys in DAILY_TASK_STRINGS_ES:', esKeys.length);
console.log('missing:', missing);
console.log('extra:', [...new Set(extra)]);
