// зачем: PM-239 — инвентаризация веток и worktree ТОЛЬКО ЧТЕНИЕМ (никаких delete/prune/checkout/reset).
// Для каждой ветки: SHA, ahead (уникальные коммиты относительно HEAD), behind, дата, worktree-путь; плюс учёт
// локальных незакоммиченных изменений по каталогам (PM-239-A2). Удаление веток — отдельная задача PM-242 по
// согласованному владельцем списку; здесь только факты. Запуск: node scripts/pm239_branch_inventory.mjs
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';

const git = (...args) => execFileSync('git', args, { encoding: 'utf8', maxBuffer: 256 * 1024 * 1024 });

const head = git('rev-parse', '--abbrev-ref', 'HEAD').trim();
const headSha = git('rev-parse', '--short', 'HEAD').trim();

const refs = git(
  'for-each-ref',
  '--format=%(refname)|%(refname:short)|%(objectname:short)|%(ahead-behind:HEAD)|%(committerdate:short)',
  'refs/heads',
  'refs/remotes',
)
  .split('\n')
  .filter(Boolean)
  .map((line) => {
    const [full, name, sha, ab, date] = line.split('|');
    const [ahead, behind] = ab.split(' ').map(Number);
    return { full, name, sha, ahead, behind, date, remote: full.startsWith('refs/remotes/') };
  })
  .filter((ref) => !ref.name.endsWith('/HEAD'));

const worktrees = new Map();
let current = null;
for (const line of git('worktree', 'list', '--porcelain').split('\n')) {
  if (line.startsWith('worktree ')) current = { path: line.slice(9), branch: null };
  else if (line.startsWith('branch ') && current) {
    current.branch = line.slice(7).replace('refs/heads/', '');
    worktrees.set(current.branch, current.path);
  }
}

const porcelain = git('status', '--porcelain').split('\n').filter(Boolean);
const dirtyByTop = new Map();
for (const row of porcelain) {
  const file = row.slice(3).replace(/^"|"$/g, '');
  const top = file.includes('/') ? file.split('/')[0] : '(root)';
  dirtyByTop.set(top, (dirtyByTop.get(top) ?? 0) + 1);
}
const dirtyKinds = { modified: 0, deleted: 0, untracked: 0, other: 0 };
for (const row of porcelain) {
  const code = row.slice(0, 2);
  if (code === '??') dirtyKinds.untracked += 1;
  else if (code.includes('D')) dirtyKinds.deleted += 1;
  else if (code.includes('M') || code.includes('A') || code.includes('R')) dirtyKinds.modified += 1;
  else dirtyKinds.other += 1;
}

const locals = refs.filter((ref) => !ref.remote);
const remotes = refs.filter((ref) => ref.remote);
const withUnique = refs.filter((ref) => ref.ahead > 0 && ref.name !== head);
const merged = refs.filter((ref) => ref.ahead === 0 && ref.name !== head);

const rows = [...refs]
  .sort((a, b) => b.ahead - a.ahead || a.name.localeCompare(b.name))
  .map((ref) => {
    const wt = worktrees.get(ref.name);
    const state = ref.name === head ? 'HEAD (current)' : ref.ahead === 0 ? 'no unique commits (reachable from HEAD)' : `${ref.ahead} unique commit(s)`;
    return `| ${ref.remote ? 'remote' : 'local'} | \`${ref.name}\` | ${ref.sha} | ${ref.ahead} | ${ref.behind} | ${ref.date} | ${wt ? `\`${wt}\`` : '—'} | ${state} |`;
  });

const out = `# PM-239 — инвентаризация веток и worktree (только чтение)

Сгенерировано: \`node scripts/pm239_branch_inventory.mjs\` на HEAD \`${headSha}\` (ветка \`${head}\`). Ничего не удалялось и не менялось в git.
Каноническая ветка по решению D30/панели P7: \`feature/referral-roulette\` (не подтверждено владельцем письменно как единственная).

## Сводка
- локальных веток: ${locals.length}; remote-веток: ${remotes.length}; worktree: ${worktrees.size} (с веткой)
- веток с уникальными коммитами относительно HEAD (ahead > 0): ${withUnique.length}
- веток без уникальных коммитов (достижимы из HEAD): ${merged.length}
- незакоммиченных путей в общем дереве: ${porcelain.length} (modified ${dirtyKinds.modified}, deleted ${dirtyKinds.deleted}, untracked ${dirtyKinds.untracked}, other ${dirtyKinds.other})

## Незакоммиченные изменения по верхним каталогам (PM-239-A2)
${[...dirtyByTop.entries()].sort((a, b) => b[1] - a[1]).map(([dir, count]) => `- \`${dir}\`: ${count}`).join('\n')}

## Ветки (ahead = уникальные коммиты ветки относительно HEAD; behind = коммиты HEAD, которых нет в ветке)
| вид | ветка | SHA | ahead | behind | последний коммит | worktree | состояние |
|---|---|---|---:|---:|---|---|---|
${rows.join('\n')}

## Ограничения
- «Владелец worktree / PR» в git не хранится: указан путь worktree, PR не сопоставлялись (нужен доступ к GitHub API — не выполнялся).
- Ветки с ahead > 0 могут нести уникальную работу: перед любым удалением — архив по PM-241 и список от владельца (PM-242). Этот документ ничего не рекомендует удалять.
- Незакоммиченные изменения общего дерева принадлежат нескольким параллельным сессиям; групповой откат/очистка запрещены.
`;
fs.writeFileSync('docs/phraseman-2.0/evidence/PM-239_branch_inventory.md', out);
console.log(`PM-239 inventory: locals=${locals.length} remotes=${remotes.length} worktrees=${worktrees.size} withUnique=${withUnique.length} merged=${merged.length} dirty=${porcelain.length}`);
