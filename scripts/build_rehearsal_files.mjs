// Список файлов HEAD, которые уйдут в архив EAS: git ls-tree HEAD минус .easignore из HEAD (тот же пакет ignore, что у гейта
// easignore_runtime_imports_gate). Используется scripts/build_rehearsal.sh. Пишет пути в stdout, итог — в stderr.
import { execFileSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import ignore from 'ignore';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const rules = execFileSync('git', ['show', 'HEAD:.easignore'], { cwd: ROOT, encoding: 'utf8', maxBuffer: 1 << 24 });
const ig = ignore().add(rules);
const all = execFileSync('git', ['ls-tree', '-r', '--name-only', '-z', 'HEAD'], { cwd: ROOT, encoding: 'utf8', maxBuffer: 1 << 28 })
  .split('\0').filter(Boolean);
const kept = all.filter((p) => !ig.ignores(p));
process.stderr.write(`[REHEARSAL] HEAD files=${all.length} kept=${kept.length} ignored=${all.length - kept.length}\n`);
process.stdout.write(kept.join('\n') + '\n');
