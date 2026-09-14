import { execFileSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { existsSync, mkdirSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { resolve, sep } from 'node:path';

const repoRoot = resolve(new URL('..', import.meta.url).pathname.slice(1));
const releaseRoot = resolve(repoRoot, '.codex-tmp', 'shard-survey-functions-release');
const functionsRoot = resolve(releaseRoot, 'functions');
const allowedRoot = resolve(repoRoot, '.codex-tmp') + sep;
if (!releaseRoot.startsWith(allowedRoot)) throw new Error('unsafe_release_root');
if (existsSync(releaseRoot)) rmSync(releaseRoot, { recursive: true, force: true });
mkdirSync(functionsRoot, { recursive: true });

function gitText(path) {
  return execFileSync('git', ['show', `HEAD:${path}`], { cwd: repoRoot, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
}

const entry = `
import * as admin from 'firebase-admin';
import {
  getActiveShardSurvey,
  submitShardSurvey,
  adminWriteShardSurvey,
} from '../../../functions/src/shard_survey';

if (!admin.apps.length) admin.initializeApp();

export { getActiveShardSurvey, submitShardSurvey, adminWriteShardSurvey };
`;
writeFileSync(resolve(functionsRoot, 'entry.ts'), entry.trimStart());

const require = createRequire(import.meta.url);
const esbuild = require('esbuild');
const build = esbuild.buildSync({
  entryPoints: [resolve(functionsRoot, 'entry.ts')],
  outfile: resolve(functionsRoot, 'index.js'),
  bundle: true,
  platform: 'node',
  format: 'cjs',
  target: 'node22',
  packages: 'external',
  treeShaking: true,
  sourcemap: true,
  metafile: true,
  logLevel: 'warning',
});
writeFileSync(resolve(functionsRoot, 'build-meta.json'), JSON.stringify(build.metafile, null, 2));

const packageJson = JSON.parse(gitText('functions/package.json'));
packageJson.main = 'index.js';
packageJson.scripts = {};
writeFileSync(resolve(functionsRoot, 'package.json'), JSON.stringify(packageJson, null, 2) + '\n');
writeFileSync(resolve(functionsRoot, 'package-lock.json'), gitText('functions/package-lock.json'));
symlinkSync(resolve(repoRoot, 'functions', 'node_modules'), resolve(functionsRoot, 'node_modules'), 'junction');

writeFileSync(resolve(releaseRoot, 'firebase.json'), JSON.stringify({
  functions: {
    source: 'functions',
    codebase: 'default',
    runtime: 'nodejs22',
    ignore: ['node_modules', '.git', 'build-meta.json', 'entry.ts'],
  },
}, null, 2) + '\n');
writeFileSync(resolve(releaseRoot, '.firebaserc'), gitText('.firebaserc'));

console.log(`BUILT isolated survey functions artifact (${Object.keys(build.metafile.inputs).length} inputs)`);
