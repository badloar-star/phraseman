import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

// зачем (PM-202-A1, владелец: «сервер не должен решать локальную механику»): у удалённых механик
// (лиги, недельный XP, level-gift, бонусы недели) не должно оставаться крона или триггера,
// который продолжит писать/тратить деньги в облаке после ретайра клиента.
const root = path.resolve(__dirname, '..', 'functions', 'src');
const RETIRED = /league|weeklyxp|resetweeklyxp|levelgift|level_gift|levelspin|boon|computeleaderboardstats/i;
const BACKGROUND = /^export const ([A-Za-z0-9_]+)\s*=\s*(onSchedule|onDocument(?:Written|Created|Updated|Deleted)|onTaskDispatched|onMessagePublished)\(/gm;

function walk(dir: string): string[] {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) return walk(full);
    return entry.name.endsWith('.ts') && !entry.name.endsWith('.test.ts') ? [full] : [];
  });
}

const offenders: string[] = [];
let scanned = 0;
let backgroundExports = 0;
for (const file of walk(root)) {
  const source = fs.readFileSync(file, 'utf8');
  scanned += 1;
  for (const match of source.matchAll(BACKGROUND)) {
    backgroundExports += 1;
    if (RETIRED.test(match[1])) offenders.push(`${path.relative(root, file)}: ${match[1]}`);
  }
}
// Callable-поверхность и типы push: retired-слова допустимы только в проверенных исключениях.
const CALLABLE = /^export const ([A-Za-z0-9_]+)\s*=\s*onCall\(/gm;
// зачем: D80/D99 (владелец, 2026-09-30) — реферальная рулетка и её админские
// переключатели (веса, soft/emergency) ЖИВЫ, поэтому spinweights/referralroulette
// больше не «retired»-слова и их tombstone-исключения сняты.
const RETIRED_CALLABLE = /league|weeklyxp|levelgift|levelspin|boon|seasonpass|seasonclaim|xpboost/i;
const ALLOWED_CALLABLES: Record<string, string> = {
  // fail-closed tombstones: обязаны содержать явный код отказа
  arenaV2SeasonClaim: 'arena_season_pass_retired',
};
const PUSH_TYPE = /(?:type|kind|pushType|notificationType)['"]?\s*[:=]\s*['"]([a-z0-9_]+)['"]/g;
const RETIRED_PUSH = /(?:^|_)(?:league|xp|boon|level_gift|levelgift|season_pass|weekly_review)(?:_|$)/;
const callableOffenders: string[] = [];
const pushOffenders: string[] = [];
for (const file of walk(root)) {
  const source = fs.readFileSync(file, 'utf8');
  for (const match of source.matchAll(CALLABLE)) {
    if (!RETIRED_CALLABLE.test(match[1])) continue;
    const code = ALLOWED_CALLABLES[match[1]];
    if (!code || !source.includes(code)) callableOffenders.push(`${path.relative(root, file)}: ${match[1]}`);
  }
  for (const match of source.matchAll(PUSH_TYPE)) {
    if (RETIRED_PUSH.test(match[1])) pushOffenders.push(`${path.relative(root, file)}: ${match[1]}`);
  }
}
assert.deepEqual(callableOffenders, [], `retired callables not tombstoned: ${callableOffenders.join(', ')}`);
assert.deepEqual(pushOffenders, [], `retired push types still sent: ${pushOffenders.join(', ')}`);

assert.ok(scanned > 50, `scanned only ${scanned} source files — walk is broken`);
assert.ok(backgroundExports > 5, `found only ${backgroundExports} background exports — regex is broken`);
assert.deepEqual(offenders, [], `retired background jobs still exported: ${offenders.join(', ')}`);
console.log(`server_retired_scheduler_surface: PASS (${scanned} files, ${backgroundExports} background exports, 0 retired)`);
