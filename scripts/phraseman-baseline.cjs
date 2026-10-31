'use strict';
// Compare two committed trees, not the current checkout. No network or worktree changes.
const { spawnSync } = require('node:child_process');
const { resolve } = require('node:path');
const DEFAULTS = { release: 'da0a435e3', candidate: '7bf2258cdc5d2647bea7a6f9ed9115035ee2d581' };
function audit({ repo = '.', release = DEFAULTS.release, candidate = DEFAULTS.candidate, paths = false } = {}) {
  const cwd = resolve(repo);
  function git(args, optional = false) {
    const r = spawnSync('git', ['--no-optional-locks', '-c', 'core.fsmonitor=false', '-c', 'core.untrackedCache=false', ...args], {
      cwd, encoding: 'utf8', maxBuffer: 128 * 1024 * 1024, timeout: 90000,
      env: { ...process.env, GIT_TERMINAL_PROMPT: '0', GIT_NO_LAZY_FETCH: '1', GIT_ALLOW_PROTOCOL: '', GIT_NO_REPLACE_OBJECTS: '1' },
    });
    if (r.error || r.signal) throw Error('Git could not finish: ' + args[0]);
    if (r.status !== 0) { if (optional) return null; throw Error('Git command failed: ' + args[0]); }
    return r.stdout;
  }
  const commit = (ref) => {
    if (!/^[a-zA-Z0-9_][a-zA-Z0-9._/-]*$/.test(ref)) throw Error('Invalid ref');
    const id = git(['rev-parse', '--verify', '--quiet', '--end-of-options', ref + '^{commit}'], true)?.trim();
    if (!id || (/^[a-f0-9]{7,64}$/i.test(ref) && !id.startsWith(ref.toLowerCase()))) return null;
    return id;
  };
  if (git(['rev-parse', '--is-inside-work-tree'], true)?.trim() !== 'true') throw Error('Run from the PhraseMan Git working tree or pass --repo DIR.');
  const head = commit('HEAD'), r = commit(release), c = commit(candidate);
  const dirty = git(['status', '--porcelain=v1', '--no-renames', '--untracked-files=all', '--ignore-submodules=none', '-z']).split('\0').filter(Boolean);
  const report = { releaseRef: release, releaseCommit: r, candidateRef: candidate, candidateCommit: c, localHead: head,
    release147: commit('a82a3b220'), releaseBranchTip: commit('refs/heads/release/community-2026-10-26'),
    worktrees: git(['worktree', 'list', '--porcelain']).split('\n').filter(x => x.startsWith('worktree ')).length,
    shallow: git(['rev-parse', '--is-shallow-repository']).trim() === 'true',
    localTrackedChanges: dirty.filter(x => !x.startsWith('??')).length,
    localUntrackedFiles: dirty.filter(x => x.startsWith('??')).length,
    state: 'HOLD_MISSING_OBJECT', deployApproved: false };
  if (!r || !c) return report;
  const raw = git(['diff', '--no-ext-diff', '--no-textconv', '--no-renames', '--name-status', '-z', r, c, '--']).split('\0');
  raw.pop();
  if (raw.length % 2 !== 0) throw Error('Incomplete diff output');
  const counts = {}, entries = [];
  for (let i = 0; i < raw.length; i += 2) {
    const status = raw[i], file = raw[i + 1];
    counts[status] = (counts[status] || 0) + 1;
    if (paths) entries.push({ status, file });
  }
  report.changedPaths = raw.length / 2;
  report.byStatus = counts; // D: in release, absent from candidate; M: inspect direction manually.
  if (paths) report.paths = entries;
  report.state = raw.length ? 'HOLD_REVIEW_DIFF' : dirty.length ? 'HOLD_DIRTY_WORKTREE' : 'COMMITTED_TREES_MATCH';
  return report; // Even equal trees do not establish which binary is in store or what Firebase serves.
}
module.exports = { audit };
if (require.main === module) {
  try {
    const options = {}, args = process.argv.slice(2);
    for (let i = 0; i < args.length; i++) {
      const a = args[i];
      if (a === '--paths') options.paths = true;
      else if (['--repo', '--release', '--candidate'].includes(a) && args[i + 1] && !args[i + 1].startsWith('--')) options[a.slice(2)] = args[++i];
      else throw Error('Usage: node phraseman-baseline.cjs [--repo DIR] [--paths] [--release REF] [--candidate REF]');
    }
    const report = audit(options);
    console.log(JSON.stringify(report, null, 2));
    process.exitCode = report.state === 'COMMITTED_TREES_MATCH' ? 0 : 2;
  } catch (e) { console.error(e.message); process.exitCode = 1; }
}
