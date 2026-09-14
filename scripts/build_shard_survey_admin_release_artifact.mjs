import { execFileSync, spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, renameSync, rmSync, writeFileSync } from 'node:fs';
import { resolve, sep } from 'node:path';

const repoRoot = resolve(new URL('..', import.meta.url).pathname.slice(1));
const releaseRoot = resolve(repoRoot, '.codex-tmp', 'shard-survey-admin-release');
const allowedRoot = resolve(repoRoot, '.codex-tmp') + sep;
if (!releaseRoot.startsWith(allowedRoot)) throw new Error('unsafe_release_root');
if (existsSync(releaseRoot)) rmSync(releaseRoot, { recursive: true, force: true });
mkdirSync(releaseRoot, { recursive: true });

function gitText(path) {
  return execFileSync('git', ['show', `HEAD:${path}`], { cwd: repoRoot, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
}

function replaceSection(base, current, startMarker, endMarker) {
  const baseStart = base.indexOf(startMarker);
  const baseEnd = base.indexOf(endMarker, baseStart);
  const currentStart = current.indexOf(startMarker);
  const currentEnd = current.indexOf(endMarker, currentStart);
  if (baseStart < 0 || baseEnd <= baseStart || currentStart < 0 || currentEnd <= currentStart) {
    throw new Error(`release_section_marker_missing:${startMarker}`);
  }
  return base.slice(0, baseStart) + current.slice(currentStart, currentEnd) + base.slice(baseEnd);
}

const archive = spawnSync('git', ['archive', '--format=tar', 'HEAD', 'admin/v2'], {
  cwd: repoRoot,
  encoding: 'buffer',
  maxBuffer: 512 * 1024 * 1024,
});
if (archive.status !== 0) throw new Error(`git_archive_failed:${archive.stderr.toString('utf8')}`);
const extracted = spawnSync('tar', ['-xf', '-', '-C', releaseRoot], {
  cwd: repoRoot,
  input: archive.stdout,
  encoding: 'buffer',
  maxBuffer: 32 * 1024 * 1024,
});
if (extracted.status !== 0) throw new Error(`tar_extract_failed:${extracted.stderr.toString('utf8')}`);
renameSync(resolve(releaseRoot, 'admin', 'v2'), resolve(releaseRoot, 'public'));
rmSync(resolve(releaseRoot, 'admin'), { recursive: true, force: true });

const currentAdmin = readFileSync(resolve(repoRoot, 'admin', 'v2', 'legacy.html'), 'utf8');
let releaseAdmin = gitText('admin/v2/legacy.html');
releaseAdmin = replaceSection(releaseAdmin, currentAdmin, '<div id="tab-surveys"', '<!-- ══ Paywall A/B эксперимент');
releaseAdmin = replaceSection(releaseAdmin, currentAdmin, '// Опросы за осколки (shard-survey)', 'const REWARD_TYPES');
writeFileSync(resolve(releaseRoot, 'public', 'legacy.html'), releaseAdmin);

const firebaseConfig = JSON.parse(gitText('firebase.json'));
const adminHosting = firebaseConfig.hosting.find((entry) => entry.target === 'admin');
if (!adminHosting) throw new Error('admin_hosting_target_missing');
writeFileSync(resolve(releaseRoot, 'firebase.json'), JSON.stringify({
  hosting: { ...adminHosting, public: 'public' },
}, null, 2) + '\n');
writeFileSync(resolve(releaseRoot, '.firebaserc'), gitText('.firebaserc'));

console.log('BUILT isolated admin hosting artifact: .codex-tmp/shard-survey-admin-release');
